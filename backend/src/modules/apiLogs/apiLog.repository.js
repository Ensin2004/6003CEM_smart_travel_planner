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

module.exports = {
  create,
  findRecent,
  findMany,
  countMany,
  countFailures,
  countByStatus,
  countSince,
  aggregateCategoryCounts,
};
