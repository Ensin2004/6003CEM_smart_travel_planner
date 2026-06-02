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
//  route wires  to validation, access checks, and controller logic.
router.post('/register', registerRules, validate, authController.register);
//  route wires  to validation, access checks, and controller logic.
router.post('/login', loginRules, validate, authController.login);
//  route wires  to validation, access checks, and controller logic.
router.post('/refresh', refreshTokenRules, validate, authController.refresh);
//  route wires  to validation, access checks, and controller logic.
router.post('/logout', logoutRules, validate, authController.logout);
//  route wires  to validation, access checks, and controller logic.
router.post('/verify-email', verifyEmailRules, validate, authController.verifyEmail);
//  route wires  to validation, access checks, and controller logic.
router.post('/verify-email/resend', resendVerificationEmailRules, validate, authController.resendVerificationEmail);
//  route wires  to validation, access checks, and controller logic.
router.post('/forgot-password/check-email', passwordResetEmailRules, validate, authController.checkPasswordResetEmail);
//  route wires  to validation, access checks, and controller logic.
router.post('/forgot-password/reset', resetPasswordRules, validate, authController.resetPassword);
module.exports = router;
