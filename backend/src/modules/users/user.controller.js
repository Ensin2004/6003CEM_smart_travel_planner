const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const userService = require('./user.service');

const getMe = catchAsync(async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  sendSuccess(res, 200, { user });
});

const updateMe = catchAsync(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  sendSuccess(res, 200, { user }, 'Profile updated');
});

module.exports = { getMe, updateMe };
