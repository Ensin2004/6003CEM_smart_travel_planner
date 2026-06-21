/**
 * Admin module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const adminService = require('./admin.service');

/**
 * Retrieves administrative dashboard statistics.
 * Aggregates system metrics, user counts, and operational data for admin overview.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with dashboard data
 */
const getDashboard = catchAsync(async (req, res) => {
  const dashboard = await adminService.getDashboard({
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });
  sendSuccess(res, 200, { dashboard });
});

/**
 * Retrieves all users from the system.
 * Returns comprehensive list of user accounts for administrative management.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with users array
 */
const getUsers = catchAsync(async (req, res) => {
  const users = await adminService.getUsers();
  sendSuccess(res, 200, users);
});

/**
 * Remove User removes a record after ownership checks.
 * Deletes a user account by ID with authorization verification.
 * 
 * @param {Object} req - Express request object with params.id (user ID to remove)
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with removal confirmation
 */
const removeUser = catchAsync(async (req, res) => {
  const result = await adminService.removeUser(req.params.id, req.user.id);
  sendSuccess(res, 200, result, 'User account removed');
});

module.exports = { getDashboard, getUsers, removeUser };
