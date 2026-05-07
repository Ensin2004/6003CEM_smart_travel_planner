const apiLogRepository = require('./apiLog.repository');

const getRecentLogs = () => apiLogRepository.findRecent();

module.exports = { getRecentLogs };
