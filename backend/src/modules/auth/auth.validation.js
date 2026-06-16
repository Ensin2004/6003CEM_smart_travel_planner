/**
 * Auth module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body } = require('express-validator');

/**
 * Validation rules for user registration.
 * Ensures all required fields are provided and meet security requirements.
 */
const registerRules = [
  // Name validation - must be between 2 and 80 characters
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Full name must be 2 to 80 characters'),
  
  // Email validation - must be valid and normalized
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  
  // Country validation - must be between 2 and 80 characters
  body('country')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Country is required'),
  
  // Gender validation - must be one of the allowed options
  body('gender')
    .isIn(['female', 'male', 'non-binary', 'prefer-not-to-say'])
    .withMessage('Gender is required'),
  
  // Age group validation - must be one of the predefined ranges
  body('ageGroup')
    .isIn(['under-18', '18-24', '25-34', '35-44', '45-54', '55+'])
    .withMessage('Age group is required'),
  
  // Password validation - enforces strong password requirements
  // Requires: minimum 8 chars, at least 1 lowercase, 1 uppercase, 1 number, 1 symbol
  body('password')
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage('Password must include uppercase, lowercase, number, and symbol'),
  
  // Confirm password validation - must match the password field
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords must match'),
];

/**
 * Validation rules for user login.
 * Validates email format and password presence.
 */
const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Validation rules for token refresh.
 * Ensures refresh token is provided.
 */
const refreshTokenRules = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

// Logout uses the same validation as refresh token
const logoutRules = refreshTokenRules;

/**
 * Validation rules for email verification.
 * Ensures verification token is provided.
 */
const verifyEmailRules = [
  body('token').notEmpty().withMessage('Verification token is required'),
];

/**
 * Validation rules for resending verification email.
 * Validates email format.
 */
const resendVerificationEmailRules = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
];

/**
 * Validation rules for password reset email check.
 * Validates email format.
 */
const passwordResetEmailRules = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
];

/**
 * Validation rules for password reset.
 * Validates email and enforces strong password requirements.
 */
const resetPasswordRules = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  
  // Password validation - same strong requirements as registration
  body('password')
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage('Password must include uppercase, lowercase, number, and symbol'),
  
  // Confirm password validation - must match the password field
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords must match'),
];

module.exports = {
  registerRules,
  loginRules,
  refreshTokenRules,
  logoutRules,
  verifyEmailRules,
  resendVerificationEmailRules,
  passwordResetEmailRules,
  resetPasswordRules,
};