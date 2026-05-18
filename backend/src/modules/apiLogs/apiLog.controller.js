const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const apiLogService = require('./apiLog.service');

const getLogs = catchAsync(async (req, res) => {
  const logs = await apiLogService.getRecentLogs(req.query);
  sendSuccess(res, 200, { logs });
});

const getMonitoring = catchAsync(async (req, res) => {
  const monitoring = await apiLogService.getMonitoring(req.query);
  sendSuccess(res, 200, monitoring);
});

module.exports = { getLogs, getMonitoring };
