/**
 * Api Logs module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const ApiLog = require('./apiLog.model');

/**
 * Creates a new API log entry in the database.
 * @param {Object} data - Log data to be stored
 * @returns {Promise<Object>} Created log document
 */
const create = (data) => ApiLog.create(data);

/**
 * Retrieves the most recent logs with a configurable limit.
 * @param {number} limit - Maximum number of logs to return (default: 50)
 * @returns {Promise<Array>} Array of log documents (plain JavaScript objects)
 */
const findRecent = (limit = 50) => ApiLog.find().sort({ createdAt: -1 }).limit(limit).lean();

/**
 * Retrieves paginated logs with filtering capabilities.
 * Populates user information for better context.
 * 
 * @param {Object} params - Query parameters
 * @param {Object} params.filter - MongoDB filter conditions
 * @param {number} params.limit - Number of logs per page
 * @param {number} params.page - Page number (1-indexed)
 * @returns {Promise<Array>} Array of log documents with populated user data
 */
const findMany = ({ filter, limit, page }) =>
  ApiLog.find(filter)
    .populate('userId', 'name email role') // Populate user reference with selected fields
    .sort({ createdAt: -1 }) // Newest logs first
    .skip((page - 1) * limit) // Offset for pagination
    .limit(limit)
    .lean();

/**
 * Counts total documents matching a filter.
 * @param {Object} filter - MongoDB filter conditions
 * @returns {Promise<number>} Document count
 */
const countMany = (filter) => ApiLog.countDocuments(filter);

/**
 * Counts failed API events (status 'fail' or 'error').
 * @returns {Promise<number>} Count of failed events
 */
const countFailures = () => ApiLog.countDocuments({ status: { $in: ['fail', 'error'] } });

/**
 * Counts logs by specific status.
 * @param {string} status - Status to count ('success', 'fail', or 'error')
 * @returns {Promise<number>} Count of logs with the specified status
 */
const countByStatus = (status) => ApiLog.countDocuments({ status });

/**
 * Counts logs matching a filter with a creation date constraint.
 * @param {Object} filter - MongoDB filter conditions
 * @param {Date} since - Earliest creation date to include
 * @returns {Promise<number>} Count of matching logs
 */
const countSince = (filter, since) => ApiLog.countDocuments({ ...filter, createdAt: { $gte: since } });

/**
 * Aggregates log counts grouped by category.
 * @param {Object} filter - MongoDB filter conditions
 * @returns {Promise<Array>} Array of { _id: category, count: number } sorted by count descending
 */
const aggregateCategoryCounts = (filter) =>
  ApiLog.aggregate([
    { $match: filter },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

/**
 * Aggregates log counts grouped by status.
 * @param {Object} filter - MongoDB filter conditions
 * @returns {Promise<Array>} Array of { _id: status, count: number } sorted by count descending
 */
const aggregateStatusCounts = (filter) =>
  ApiLog.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

/**
 * Aggregates log counts grouped by severity.
 * @param {Object} filter - MongoDB filter conditions
 * @returns {Promise<Array>} Array of { _id: severity, count: number } sorted by count descending
 */
const aggregateSeverityCounts = (filter) =>
  ApiLog.aggregate([
    { $match: filter },
    { $group: { _id: '$severity', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

/**
 * Aggregates daily log counts grouped by date and status for the specified number of days.
 * 
 * @param {Object} filter - MongoDB filter conditions
 * @param {number} days - Number of days to include (default: 7)
 * @returns {Promise<Array>} Array of { _id: { date, status }, count: number } sorted by date
 */
const aggregateDailyCounts = (filter, days = 7) => {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0); // Set to start of day for consistent grouping

  return ApiLog.aggregate([
    { $match: { ...filter, createdAt: { ...(filter.createdAt || {}), $gte: since } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          status: '$status',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1 } }, // Sort chronologically
  ]);
};

/**
 * Aggregates issue summaries grouped by user.
 * Focuses on failed/error logs to identify problematic users.
 * 
 * @returns {Promise<Array>} Array of user issue summaries with counts by category
 */
const aggregateUserIssueSummary = () =>
  ApiLog.aggregate([
    // Filter for failed/error logs with an associated user
    {
      $match: {
        userId: { $ne: null },
        status: { $in: ['fail', 'error'] },
      },
    },
    { $sort: { createdAt: -1 } }, // Sort by most recent for latest issue fields
    {
      $group: {
        _id: '$userId',
        totalIssues: { $sum: 1 },
        // Count issues by category using conditional aggregation
        loginIssues: { $sum: { $cond: [{ $eq: ['$category', 'auth'] }, 1, 0] } },
        apiIssues: { $sum: { $cond: [{ $eq: ['$category', 'api'] }, 1, 0] } },
        systemIssues: { $sum: { $cond: [{ $eq: ['$category', 'system'] }, 1, 0] } },
        rateLimitIssues: { $sum: { $cond: [{ $eq: ['$category', 'rate-limit'] }, 1, 0] } },
        // Capture the most recent issue details
        latestIssueAt: { $first: '$createdAt' },
        latestIssueMessage: { $first: '$message' },
        latestIssueCategory: { $first: '$category' },
        latestIssueSeverity: { $first: '$severity' },
      },
    },
  ]);

module.exports = {
  create,
  findRecent,
  findMany,
  countMany,
  countFailures,
  countByStatus,
  countSince,
  aggregateCategoryCounts,
  aggregateStatusCounts,
  aggregateSeverityCounts,
  aggregateDailyCounts,
  aggregateUserIssueSummary,
};