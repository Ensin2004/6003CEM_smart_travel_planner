/**
 * Auth module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
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
const refresh = catchAsync(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  sendSuccess(res, 200, result, 'Token refreshed');
});
const logout = catchAsync(async (req, res) => {
  const result = await authService.logout(req.body.refreshToken);
  sendSuccess(res, 200, result, 'Logout successful');
});
const verifyEmail = catchAsync(async (req, res) => {
  const result = await authService.verifyEmail(req.body.token);
  sendSuccess(res, 200, result, 'Email verified. You can now log in.');
});
const resendVerificationEmail = catchAsync(async (req, res) => {
  const result = await authService.resendVerificationEmail(req.body.email);
  const message = result.alreadyVerified
    ? 'This email is already verified. You can log in now.'
    : 'Verification email sent';
  sendSuccess(res, 200, result, message);
});
const checkPasswordResetEmail = catchAsync(async (req, res) => {
  const result = await authService.checkPasswordResetEmail(req.body.email);
  sendSuccess(res, 200, result, 'Email verified');
});
const resetPassword = catchAsync(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  sendSuccess(res, 200, result, 'Password reset successful');
});
module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  resendVerificationEmail,
  checkPasswordResetEmail,
  resetPassword,
};
