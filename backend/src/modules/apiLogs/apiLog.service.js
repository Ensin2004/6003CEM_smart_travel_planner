/**
 * Api Logs module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const apiLogRepository = require('./apiLog.repository');
const crypto = require('crypto');
const logger = require('../../utils/logger');
const notificationService = require('../notifications/notification.service');

// Default pagination constants
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const REPEATED_LOG_COOLDOWNS_MS = {
  RATE_LIMIT_EXCEEDED: 60 * 60 * 1000,
  NETWORK_FAILURE: 30 * 60 * 1000,
  REQUEST_TIMEOUT: 30 * 60 * 1000,
  INTERNAL_SERVER_ERROR: 30 * 60 * 1000,
  EXTERNAL_SERVICE_ERROR: 30 * 60 * 1000,
};

/**
 * Cleans and truncates metadata values for safe storage.
 * Removes undefined/null values and limits string length.
 * 
 * @param {Object} metadata - Raw metadata object
 * @returns {Object} Cleaned metadata with safe values
 */
const cleanMetadata = (metadata = {}) =>
  Object.entries(metadata).reduce((safeMetadata, [key, value]) => {
    // Skip undefined or null values
    if (value === undefined || value === null) {
      return safeMetadata;
    }

    // Convert to string and truncate to 200 characters
    safeMetadata[key] = String(value).slice(0, 200);
    return safeMetadata;
  }, {});

/**
 * Normalizes values used in repeated-log grouping keys.
 * @param {string} value - Raw value
 * @returns {string} Normalized value
 */
const normalizeLogKeyPart = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .split('?')[0]
    .replace(/[0-9a-f]{24}/g, ':id')
    .replace(/\b\d+\b/g, ':num')
    .slice(0, 140);

/**
 * Decides whether a log event should be grouped in the database.
 * @param {Object} params - Log event context
 * @returns {boolean} True if repeated rows should be collapsed
 */
const isRepeatableOperationalLog = ({ category, errorCode, severity, status }) => {
  if (status === 'success') return false;
  if (category === 'rate-limit' || errorCode === 'RATE_LIMIT_EXCEEDED') return true;
  return ['error', 'critical'].includes(severity) || [
    'NETWORK_FAILURE',
    'REQUEST_TIMEOUT',
    'INTERNAL_SERVER_ERROR',
    'EXTERNAL_SERVICE_ERROR',
  ].includes(errorCode);
};

/**
 * Builds a stable key for grouping repeated operational logs.
 * @param {Object} params - Log event context
 * @returns {string} Grouping key
 */
const buildRepeatedLogKey = ({ category, endpoint, errorCode, message, method, metadata, service, statusCode, userId }) => {
  const actorKey = category === 'auth'
    ? metadata?.attemptedEmailMasked || userId || 'unknown-actor'
    : 'all-actors';

  return [
    normalizeLogKeyPart(errorCode || 'unknown-code'),
    normalizeLogKeyPart(service || 'system'),
    normalizeLogKeyPart(category || 'api'),
    normalizeLogKeyPart(method || 'GET'),
    normalizeLogKeyPart(endpoint || 'unknown-endpoint'),
    normalizeLogKeyPart(statusCode || 'no-status'),
    normalizeLogKeyPart(message || 'no-message'),
    normalizeLogKeyPart(actorKey),
  ].join('|');
};

/**
 * Escapes special characters in a string for use in regex.
 * @param {string} value - String to escape
 * @returns {string} Escaped string safe for regex
 */
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Parses date values and handles date-only strings (YYYY-MM-DD).
 * Optionally sets time to end of day for range queries.
 * 
 * @param {string} value - Date string or ISO date
 * @param {boolean} endOfDay - Whether to set time to 23:59:59.999
 * @returns {Date} Parsed date object
 */
const getDateBoundary = (value, endOfDay = false) => {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly ? `${value}T00:00:00.000` : value);

  if (isDateOnly) {
    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
  }

  return date;
};

/**
 * Determines a default error code based on log properties.
 * Maps status codes and categories to standardized error codes.
 * 
 * @param {Object} params - Log properties
 * @returns {string} Standardized error code
 */
const getDefaultErrorCode = ({ category, service, status, statusCode }) => {
  if (status === 'success') return 'SUCCESS_EVENT';
  if (statusCode === 429 || category === 'rate-limit') return 'RATE_LIMIT_EXCEEDED';
  if (statusCode === 401) return 'AUTHENTICATION_REQUIRED';
  if (statusCode === 403) return 'FORBIDDEN';
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode === 409) return 'CONFLICT';
  if (statusCode >= 500) {
    return category === 'system' || service === 'server'
      ? 'INTERNAL_SERVER_ERROR'
      : 'EXTERNAL_SERVICE_ERROR';
  }
  return 'REQUEST_FAILED';
};

/**
 * Masks email addresses for privacy in logs.
 * Shows first character and domain only.
 * 
 * @param {string} email - Email address to mask
 * @returns {string} Masked email or empty string
 */
const maskEmail = (email = '') => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const [name, domain] = normalizedEmail.split('@');
  if (!name || !domain) {
    return '';
  }

  return `${name[0]}***@${domain}`;
};

/**
 * Format Log converts raw values into readable display text.
 * Enriches log with populated user information and masked email.
 * 
 * @param {Object} log - Raw log document from repository
 * @returns {Object} Formatted log with enhanced user data
 */
const formatLog = (log) => {
  const populatedUser = log.userId && typeof log.userId === 'object' ? log.userId : null;

  return {
    ...log,
    userId: populatedUser?._id || log.userId,
    actor: populatedUser
      ? {
          id: populatedUser._id,
          name: populatedUser.name,
          email: populatedUser.email,
          role: populatedUser.role,
        }
      : undefined,
    attemptedEmail: log.metadata?.attemptedEmailMasked,
  };
};

/**
 * Build Filter transforms source data into the shape required nearby.
 * Constructs MongoDB filter object from query parameters.
 * 
 * @param {Object} params - Query parameters for filtering
 * @returns {Object} MongoDB filter object
 */
const buildFilter = ({ status, category, severity, service, errorCode, requestId, userId, from, to } = {}) => {
  const filter = {
    errorCode: { $exists: true, $nin: [null, ''] }, // Ensure errorCode exists and is not null/empty
    requestId: { $exists: true, $nin: [null, ''] }, // Ensure requestId exists and is not null/empty
  };

  // Apply exact match filters
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (severity) filter.severity = severity;
  
  // Apply case-insensitive partial match filters
  if (service) filter.service = new RegExp(escapeRegex(service.trim()), 'i');
  if (errorCode) filter.errorCode = errorCode.trim().toUpperCase();
  if (requestId) filter.requestId = new RegExp(escapeRegex(requestId.trim()), 'i');
  if (userId) filter.userId = userId;

  // Apply date range filter
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = getDateBoundary(from);
    if (to) filter.createdAt.$lte = getDateBoundary(to, true);
  }

  return filter;
};

/**
 * Normalize Pagination prepares incoming data for consistent storage.
 * Validates and applies default limits for pagination parameters.
 * 
 * @param {Object} params - Pagination parameters
 * @returns {Object} Normalized pagination object
 */
const normalizePagination = ({ limit, page } = {}) => ({
  limit: Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT),
  page: Math.max(Number(page) || 1, 1),
});

/**
 * Fills missing daily count entries for charts and trends.
 * Ensures all days in the range have data points.
 * 
 * @param {Array} dailyCounts - Raw daily aggregated counts
 * @param {number} days - Number of days to include
 * @returns {Array} Complete daily data with zero-filled missing dates
 */
const fillDailyCounts = (dailyCounts, days = 7) => {
  const today = new Date();

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);
    const matchingItems = dailyCounts.filter((item) => item._id.date === key);

    return {
      date: key,
      success: matchingItems.find((item) => item._id.status === 'success')?.count || 0,
      fail: matchingItems.find((item) => item._id.status === 'fail')?.count || 0,
      error: matchingItems.find((item) => item._id.status === 'error')?.count || 0,
    };
  });
};

/**
 * Records a single API event log entry.
 * Handles error code assignment, metadata cleaning, and notification.
 * 
 * @param {Object} data - Log event data
 * @returns {Promise<Object>} Created log document
 */
const recordEvent = async (data) => {
  const errorCode = data.errorCode || getDefaultErrorCode(data);
  const requestId = data.requestId || crypto.randomUUID();
  const now = new Date();
  const category = data.category || 'api';
  const severity = data.severity || 'info';
  
  // Clean and mask sensitive metadata
  const metadata = cleanMetadata({
    ...data.metadata,
    ...(data.attemptedEmail && { attemptedEmailMasked: maskEmail(data.attemptedEmail) }),
  });
  const shouldGroupLog = isRepeatableOperationalLog({
    category,
    errorCode,
    severity,
    status: data.status,
  });
  const logKey = shouldGroupLog
    ? buildRepeatedLogKey({
        category,
        endpoint: data.endpoint,
        errorCode,
        message: data.message,
        method: data.method,
        metadata,
        service: data.service,
        statusCode: data.statusCode,
        userId: data.userId,
      })
    : '';
  const cooldownMs = REPEATED_LOG_COOLDOWNS_MS[errorCode] || (shouldGroupLog ? 30 * 60 * 1000 : 0);

  if (logKey && cooldownMs > 0) {
    const existingLog = await apiLogRepository.findRecentRepeatedEvent({
      logKey,
      since: new Date(Date.now() - cooldownMs),
    });

    if (existingLog) {
      const repeatedLog = await apiLogRepository.recordRepeatedEvent(existingLog._id, {
        lastOccurredAt: now,
        requestId,
        message: data.message,
        severity,
        status: data.status,
        statusCode: data.statusCode,
        userId: data.userId,
        metadata: {
          ...existingLog.metadata,
          ...metadata,
          latestRequestId: requestId,
          latestMessage: data.message,
        },
      });

      notificationService
        .notifyAdminsOfApiLog(repeatedLog)
        .catch((error) => logger.error(`Failed to notify admins about API log: ${error.message}`));

      return repeatedLog;
    }
  }

  // Create log entry in repository
  const log = await apiLogRepository.create({
    service: data.service,
    category,
    severity,
    method: data.method,
    endpoint: data.endpoint,
    status: data.status,
    statusCode: data.statusCode,
    errorCode,
    requestId,
    ...(logKey && { logKey }),
    occurrenceCount: 1,
    firstOccurredAt: now,
    lastOccurredAt: now,
    message: data.message,
    userId: data.userId,
    ...(Object.keys(metadata).length && { metadata }),
  });

  // Asynchronously notify admins of important log events
  notificationService
    .notifyAdminsOfApiLog(log)
    .catch((error) => logger.error(`Failed to notify admins about API log: ${error.message}`));

  return log;
};

/**
 * Retrieves recent logs with filtering and pagination.
 * @param {Object} query - Filter and pagination parameters
 * @returns {Promise<Array>} Formatted log entries
 */
const getRecentLogs = async (query = {}) => {
  const filter = buildFilter(query);
  const pagination = normalizePagination(query);

  const logs = await apiLogRepository.findMany({ filter, ...pagination });
  return logs.map(formatLog);
};

/**
 * Retrieves monitoring dashboard data with summary statistics.
 * Aggregates metrics for system health monitoring.
 * 
 * @param {Object} query - Filter and pagination parameters
 * @returns {Promise<Object>} Monitoring data with logs, summary, and pagination
 */
const getMonitoring = async (query = {}) => {
  const filter = buildFilter(query);
  const pagination = normalizePagination(query);
  const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Execute all aggregation queries in parallel for performance
  const [
    logs,
    totalLogs,
    failures,
    errors,
    recentFailures,
    groupedLogCount,
    categoryCounts,
    statusCounts,
    severityCounts,
    dailyCounts,
  ] = await Promise.all([
    apiLogRepository.findMany({ filter, ...pagination }),
    apiLogRepository.sumOccurrences(filter),
    apiLogRepository.sumOccurrences({ ...filter, status: { $in: ['fail', 'error'] } }),
    apiLogRepository.sumOccurrences({ ...filter, status: 'error' }),
    apiLogRepository.sumOccurrencesSince({ status: { $in: ['fail', 'error'] } }, lastDay),
    apiLogRepository.countMany(filter),
    apiLogRepository.aggregateCategoryCounts(filter),
    apiLogRepository.aggregateStatusCounts(filter),
    apiLogRepository.aggregateSeverityCounts(filter),
    apiLogRepository.aggregateDailyCounts(filter),
  ]);

  return {
    logs: logs.map(formatLog),
    summary: {
      totalLogs,
      failures,
      errors,
      recentFailures,
      health: recentFailures > 0 || errors > 0 ? 'warning' : 'healthy',
      categoryCounts: categoryCounts.map((item) => ({
        category: item._id || 'api',
        count: item.count,
      })),
      statusCounts: statusCounts.map((item) => ({
        status: item._id || 'success',
        count: item.count,
      })),
      severityCounts: severityCounts.map((item) => ({
        severity: item._id || 'info',
        count: item.count,
      })),
      dailyCounts: fillDailyCounts(dailyCounts),
    },
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: groupedLogCount,
      totalOccurrences: totalLogs,
      totalPages: Math.ceil(groupedLogCount / pagination.limit),
    },
  };
};

module.exports = { getRecentLogs, getMonitoring, maskEmail, recordEvent };
