const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const adminService = require('./admin.service');

const getDashboard = catchAsync(async (req, res) => {
  const dashboard = await adminService.getDashboard();
  sendSuccess(res, 200, { dashboard });
});

module.exports = { getDashboard };
