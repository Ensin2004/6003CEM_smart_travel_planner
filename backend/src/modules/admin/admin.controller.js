/**
 * Admin module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const adminService = require('./admin.service');
const getDashboard = catchAsync(async (req, res) => {
  const dashboard = await adminService.getDashboard();
  sendSuccess(res, 200, { dashboard });
});
const getUsers = catchAsync(async (req, res) => {
  const users = await adminService.getUsers();
  sendSuccess(res, 200, users);
});
// Remove User removes a record after ownership checks.
const removeUser = catchAsync(async (req, res) => {
  const result = await adminService.removeUser(req.params.id, req.user.id);
  sendSuccess(res, 200, result, 'User account removed');
});
module.exports = { getDashboard, getUsers, removeUser };
