const { body } = require('express-validator');

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Full name must be 2 to 80 characters'),
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('phoneNumber')
    .trim()
    .matches(/^\+?[0-9\s()-]{7,30}$/)
    .withMessage('A valid phone number is required'),
  body('gender')
    .isIn(['female', 'male', 'non-binary', 'prefer-not-to-say'])
    .withMessage('Gender is required'),
  body('ageGroup')
    .isIn(['under-18', '18-24', '25-34', '35-44', '45-54', '55+'])
    .withMessage('Age group is required'),
  body('password')
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage('Password must include uppercase, lowercase, number, and symbol'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords must match'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const passwordResetEmailRules = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
];

const resetPasswordRules = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('password')
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage('Password must include uppercase, lowercase, number, and symbol'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords must match'),
];

module.exports = { registerRules, loginRules, passwordResetEmailRules, resetPasswordRules };
