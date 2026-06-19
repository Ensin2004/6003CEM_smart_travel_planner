/**
 * Auth module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const authController = require('./auth.controller');
const validate = require('../../middleware/validate.middleware');
const {
  registerRules,
  loginRules,
  refreshTokenRules,
  logoutRules,
  verifyEmailRules,
  resendVerificationEmailRules,
  passwordResetEmailRules,
  resetPasswordRules,
} = require('./auth.validation');

const router = express.Router();

/**
 * POST /register - Creates a new user account.
 * Validates registration data, creates user record, and sends verification email.
 * No authentication required - public endpoint.
 * 
 * Middleware chain:
 * 1. registerRules - Request body validation
 * 2. validate - Validation result processing
 * 3. authController.register - Route handler
 */
router.post('/register', registerRules, validate, authController.register);

/**
 * POST /login - Authenticates a user with email and password.
 * Returns access and refresh tokens upon successful authentication.
 * No authentication required - public endpoint.
 * 
 * Middleware chain:
 * 1. loginRules - Request body validation
 * 2. validate - Validation result processing
 * 3. authController.login - Route handler
 */
router.post('/login', loginRules, validate, authController.login);

/**
 * POST /refresh - Generates new access token using a valid refresh token.
 * No authentication required - uses refresh token for authorization.
 * 
 * Middleware chain:
 * 1. refreshTokenRules - Request body validation
 * 2. validate - Validation result processing
 * 3. authController.refresh - Route handler
 */
router.post('/refresh', refreshTokenRules, validate, authController.refresh);

/**
 * POST /logout - Invalidates the refresh token to terminate the session.
 * No authentication required - uses refresh token for identification.
 * 
 * Middleware chain:
 * 1. logoutRules - Request body validation
 * 2. validate - Validation result processing
 * 3. authController.logout - Route handler
 */
router.post('/logout', logoutRules, validate, authController.logout);

/**
 * POST /verify-email - Confirms email address using verification token.
 * Activates user account after successful email verification.
 * No authentication required - uses token for verification.
 * 
 * Middleware chain:
 * 1. verifyEmailRules - Request body validation
 * 2. validate - Validation result processing
 * 3. authController.verifyEmail - Route handler
 */
router.post('/verify-email', verifyEmailRules, validate, authController.verifyEmail);

/**
 * POST /verify-email/resend - Sends a new verification email.
 * Handles cases where the original verification link expired or was lost.
 * No authentication required - uses email address to identify user.
 * 
 * Middleware chain:
 * 1. resendVerificationEmailRules - Request body validation
 * 2. validate - Validation result processing
 * 3. authController.resendVerificationEmail - Route handler
 */
router.post('/verify-email/resend', resendVerificationEmailRules, validate, authController.resendVerificationEmail);

/**
 * POST /forgot-password/check-email - Validates email for password reset.
 * Checks if the email exists and is verified before allowing password reset.
 * No authentication required - public endpoint.
 * 
 * Middleware chain:
 * 1. passwordResetEmailRules - Request body validation
 * 2. validate - Validation result processing
 * 3. authController.checkPasswordResetEmail - Route handler
 */
router.post('/forgot-password/check-email', passwordResetEmailRules, validate, authController.checkPasswordResetEmail);

/**
 * POST /forgot-password/reset - Resets password using reset token.
 * Updates user password after token validation.
 * No authentication required - uses reset token for authorization.
 * 
 * Middleware chain:
 * 1. resetPasswordRules - Request body validation
 * 2. validate - Validation result processing
 * 3. authController.resetPassword - Route handler
 */
router.post('/forgot-password/reset', resetPasswordRules, validate, authController.resetPassword);

module.exports = router;