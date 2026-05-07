const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const authService = require('./auth.service');

const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  sendSuccess(res, 201, result, 'Registration successful');
});

const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  sendSuccess(res, 200, result, 'Login successful');
});

module.exports = { register, login };
