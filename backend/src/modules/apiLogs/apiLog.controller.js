const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const apiLogService = require('./apiLog.service');

const getLogs = catchAsync(async (req, res) => {
  const logs = await apiLogService.getRecentLogs();
  sendSuccess(res, 200, { logs });
});

module.exports = { getLogs };
