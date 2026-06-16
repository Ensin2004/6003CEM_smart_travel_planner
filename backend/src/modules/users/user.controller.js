/**
 * Users module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const userService = require('./user.service');

/**
 * GET /users/me
 * Retrieves the authenticated user's profile information.
 */
const getMe = catchAsync(async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  sendSuccess(res, 200, { user });
});

// Update Me applies allowed changes to an existing record.
const updateMe = catchAsync(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  sendSuccess(res, 200, { user }, 'Profile updated');
});

/**
 * POST /users/change-password
 * Changes the authenticated user's password after validation.
 */
const changePassword = catchAsync(async (req, res) => {
  await userService.changePassword(req.user.id, req.body);
  sendSuccess(res, 200, null, 'Password changed');
});

// Export all controller functions
module.exports = { getMe, updateMe, changePassword };