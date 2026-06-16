/**
 * Api Logs module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const apiLogRepository = require('./apiLog.repository');
const crypto = require('crypto');
const logger = require('../../utils/logger');
const notificationService = require('../notifications/notification.service');

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const cleanMetadata = (metadata = {}) =>
  Object.entries(metadata).reduce((safeMetadata, [key, value]) => {
    if (value === undefined || value === null) {
      return safeMetadata;
    }

    safeMetadata[key] = String(value).slice(0, 200);
    return safeMetadata;
  }, {});
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
const maskEmail = (email = '') => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const [name, domain] = normalizedEmail.split('@');
  if (!name || !domain) {
    return '';
  }

  return `${name[0]}***@${domain}`;
};
// Format Log converts raw values into readable display text.
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
// Build Filter transforms source data into the shape required nearby.
const buildFilter = ({ status, category, severity, service, errorCode, requestId, userId, from, to } = {}) => {
  const filter = {
    errorCode: { $exists: true, $nin: [null, ''] },
    requestId: { $exists: true, $nin: [null, ''] },
  };

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (severity) filter.severity = severity;
  if (service) filter.service = new RegExp(escapeRegex(service.trim()), 'i');
  if (errorCode) filter.errorCode = errorCode.trim().toUpperCase();
  if (requestId) filter.requestId = new RegExp(escapeRegex(requestId.trim()), 'i');
  if (userId) filter.userId = userId;

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = getDateBoundary(from);
    if (to) filter.createdAt.$lte = getDateBoundary(to, true);
  }

  return filter;
};
// Normalize Pagination prepares incoming data for consistent storage.
const normalizePagination = ({ limit, page } = {}) => ({
  limit: Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT),
  page: Math.max(Number(page) || 1, 1),
});
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
const recordEvent = async (data) => {
  const errorCode = data.errorCode || getDefaultErrorCode(data);
  const requestId = data.requestId || crypto.randomUUID();
  const metadata = cleanMetadata({
    ...data.metadata,
    ...(data.attemptedEmail && { attemptedEmailMasked: maskEmail(data.attemptedEmail) }),
  });

  const log = await apiLogRepository.create({
    service: data.service,
    category: data.category || 'api',
    severity: data.severity || 'info',
    method: data.method,
    endpoint: data.endpoint,
    status: data.status,
    statusCode: data.statusCode,
    errorCode,
    requestId,
    message: data.message,
    userId: data.userId,
    ...(Object.keys(metadata).length && { metadata }),
  });

  notificationService
    .notifyAdminsOfApiLog(log)
    .catch((error) => logger.error(`Failed to notify admins about API log: ${error.message}`));

  return log;
};
const getRecentLogs = async (query = {}) => {
  const filter = buildFilter(query);
  const pagination = normalizePagination(query);

  const logs = await apiLogRepository.findMany({ filter, ...pagination });
  return logs.map(formatLog);
};
const getMonitoring = async (query = {}) => {
  const filter = buildFilter(query);
  const pagination = normalizePagination(query);
  const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    logs,
    totalLogs,
    failures,
    errors,
    recentFailures,
    categoryCounts,
    statusCounts,
    severityCounts,
    dailyCounts,
  ] = await Promise.all([
    apiLogRepository.findMany({ filter, ...pagination }),
    apiLogRepository.countMany(filter),
    apiLogRepository.countMany({ ...filter, status: { $in: ['fail', 'error'] } }),
    apiLogRepository.countMany({ ...filter, status: 'error' }),
    apiLogRepository.countSince({ status: { $in: ['fail', 'error'] } }, lastDay),
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
      total: totalLogs,
      totalPages: Math.ceil(totalLogs / pagination.limit),
    },
  };
};
module.exports = { getRecentLogs, getMonitoring, maskEmail, recordEvent };
