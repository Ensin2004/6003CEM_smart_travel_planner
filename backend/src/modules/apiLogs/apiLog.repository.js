const ApiLog = require('./apiLog.model');

const create = (data) => ApiLog.create(data);
const findRecent = (limit = 50) => ApiLog.find().sort({ createdAt: -1 }).limit(limit);
const countFailures = () => ApiLog.countDocuments({ status: { $in: ['fail', 'error'] } });

module.exports = { create, findRecent, countFailures };
