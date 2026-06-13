/**
 * Api Logs module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const ApiLog = require('./apiLog.model');
const create = (data) => ApiLog.create(data);
const findRecent = (limit = 50) => ApiLog.find().sort({ createdAt: -1 }).limit(limit).lean();
const findMany = ({ filter, limit, page }) =>
  ApiLog.find(filter)
    .populate('userId', 'name email role')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
const countMany = (filter) => ApiLog.countDocuments(filter);
const countFailures = () => ApiLog.countDocuments({ status: { $in: ['fail', 'error'] } });
const countByStatus = (status) => ApiLog.countDocuments({ status });
const countSince = (filter, since) => ApiLog.countDocuments({ ...filter, createdAt: { $gte: since } });
const aggregateCategoryCounts = (filter) =>
  ApiLog.aggregate([
    { $match: filter },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
const aggregateStatusCounts = (filter) =>
  ApiLog.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
const aggregateSeverityCounts = (filter) =>
  ApiLog.aggregate([
    { $match: filter },
    { $group: { _id: '$severity', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
const aggregateDailyCounts = (filter, days = 7) => {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

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
    { $sort: { '_id.date': 1 } },
  ]);
};
const aggregateUserIssueSummary = () =>
  ApiLog.aggregate([
    {
      $match: {
        userId: { $ne: null },
        status: { $in: ['fail', 'error'] },
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$userId',
        totalIssues: { $sum: 1 },
        loginIssues: { $sum: { $cond: [{ $eq: ['$category', 'auth'] }, 1, 0] } },
        apiIssues: { $sum: { $cond: [{ $eq: ['$category', 'api'] }, 1, 0] } },
        systemIssues: { $sum: { $cond: [{ $eq: ['$category', 'system'] }, 1, 0] } },
        rateLimitIssues: { $sum: { $cond: [{ $eq: ['$category', 'rate-limit'] }, 1, 0] } },
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
