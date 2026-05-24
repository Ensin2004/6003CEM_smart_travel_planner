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

router.post('/register', registerRules, validate, authController.register);
router.post('/login', loginRules, validate, authController.login);
router.post('/refresh', refreshTokenRules, validate, authController.refresh);
router.post('/logout', logoutRules, validate, authController.logout);
router.post('/verify-email', verifyEmailRules, validate, authController.verifyEmail);
router.post('/verify-email/resend', resendVerificationEmailRules, validate, authController.resendVerificationEmail);
router.post('/forgot-password/check-email', passwordResetEmailRules, validate, authController.checkPasswordResetEmail);
router.post('/forgot-password/reset', resetPasswordRules, validate, authController.resetPassword);

module.exports = router;
