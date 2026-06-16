/**
 * Auth module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const authService = require('./auth.service');

/**
 * Registers a new user account.
 * Creates user record and sends verification email.
 * 
 * @param {Object} req - Express request object with user registration data in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with registration result
 */
const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  sendSuccess(res, 201, result, 'Registration successful');
});

/**
 * Authenticates a user with email and password.
 * Returns access and refresh tokens upon successful authentication.
 * 
 * @param {Object} req - Express request object with login credentials in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with tokens and user data
 */
const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body, { requestId: req.requestId });
  sendSuccess(res, 200, result, 'Login successful');
});

/**
 * Refreshes an expired access token using a valid refresh token.
 * Generates new access token pair for continued authenticated sessions.
 * 
 * @param {Object} req - Express request object with refreshToken in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with new tokens
 */
const refresh = catchAsync(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  sendSuccess(res, 200, result, 'Token refreshed');
});

/**
 * Logs out a user by invalidating the refresh token.
 * Terminates the authenticated session.
 * 
 * @param {Object} req - Express request object with refreshToken in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response confirming logout
 */
const logout = catchAsync(async (req, res) => {
  const result = await authService.logout(req.body.refreshToken);
  sendSuccess(res, 200, result, 'Logout successful');
});

/**
 * Verifies user email using the verification token.
 * Activates account after successful email confirmation.
 * 
 * @param {Object} req - Express request object with verification token in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response confirming email verification
 */
const verifyEmail = catchAsync(async (req, res) => {
  const result = await authService.verifyEmail(req.body.token);
  sendSuccess(res, 200, result, 'Email verified. You can now log in.');
});

/**
 * Resends the email verification link.
 * Handles cases where the original verification email was lost or expired.
 * 
 * @param {Object} req - Express request object with email in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with appropriate message
 */
const resendVerificationEmail = catchAsync(async (req, res) => {
  const result = await authService.resendVerificationEmail(req.body.email);
  const message = result.alreadyVerified
    ? 'This email is already verified. You can log in now.'
    : 'Verification email sent';
  sendSuccess(res, 200, result, message);
});

/**
 * Validates email for password reset requests.
 * Checks if the email exists and is verified before allowing reset.
 * 
 * @param {Object} req - Express request object with email in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response confirming email validity
 */
const checkPasswordResetEmail = catchAsync(async (req, res) => {
  const result = await authService.checkPasswordResetEmail(req.body.email);
  sendSuccess(res, 200, result, 'Email verified');
});

/**
 * Resets the user's password using a reset token.
 * Updates password after verifying the reset token is valid.
 * 
 * @param {Object} req - Express request object with token and new password in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response confirming password reset
 */
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