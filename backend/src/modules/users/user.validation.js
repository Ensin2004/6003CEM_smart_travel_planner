/**
 * Users module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body } = require('express-validator');

// Maximum avatar file size in megabytes.
const maxAvatarSizeMegabytes = 1000;

// Calculated maximum Base64 string length for avatar images.
const maxAvatarBase64Length = Math.ceil((maxAvatarSizeMegabytes * 1024 * 1024 * 4) / 3) + 64;

// Validation rules for updating user profile information.
const updateMeRules = [
  // Name must be between 2 and 80 characters when provided.
  body('name').optional().isLength({ min: 2, max: 80 }).withMessage('Name must be 2 to 80 characters'),

  // Email must be valid and normalized when provided.
  body('email').optional().isEmail().normalizeEmail().withMessage('A valid email is required'),

  // Avatar must be a valid Base64 image string within size limits.
  body('avatarUrl')
    .optional({ checkFalsy: true })
    .isLength({ max: maxAvatarBase64Length })
    .withMessage(`Avatar image is too large. Maximum size is ${maxAvatarSizeMegabytes}MB.`)
    .matches(/^data:image\/(png|jpe?g);base64,/)
    .withMessage('Avatar must be a PNG, JPG, or JPEG image'),

  // Country must be between 2 and 80 characters when provided.
  body('country').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Country is required'),

  // Gender must be one of the predefined options when provided.
  body('gender')
    .optional()
    .isIn(['female', 'male', 'non-binary', 'prefer-not-to-say'])
    .withMessage('Gender is required'),

  // Age group must be one of the predefined ranges when provided.
  body('ageGroup')
    .optional()
    .isIn(['under-18', '18-24', '25-34', '35-44', '45-54', '55+'])
    .withMessage('Age group is required'),

  // Notification preference flags must be boolean values when provided.
  body('notificationPreferences.notificationsOff').optional().isBoolean(),
  body('notificationPreferences.tripAlerts').optional().isBoolean(),
  body('notificationPreferences.packingReminder').optional().isBoolean(),
  body('notificationPreferences.errorLogs').optional().isBoolean(),
  body('notificationPreferences.systemAlerts').optional().isBoolean(),
  body('notificationPreferences.ratingFeedback').optional().isBoolean(),

  // Travel style must not exceed 60 characters when provided.
  body('preferences.travelStyle').optional().trim().isLength({ max: 60 }),

  // Spending preference must be one of the predefined levels when provided.
  body('preferences.spendingPreference')
    .optional()
    .isIn(['budget', 'standard', 'luxury'])
    .withMessage('Spending preference must be budget, standard, or luxury'),

  // Budget level must be one of the predefined options when provided.
  body('preferences.budgetLevel').optional().isIn(['low', 'medium', 'high']),

  // Preferred activities must be an array when provided.
  body('preferences.preferredActivities').optional().isArray(),
];

// Validation rules for changing user password.
const changePasswordRules = [
  // Current password must be provided and non-empty.
  body('currentPassword').notEmpty().withMessage('Current password is required'),

  // New password must differ from current password and meet strength requirements.
  body('password')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password cannot be the same as current password')
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage('Password must include uppercase, lowercase, number, and symbol'),

  // Confirmation password must exactly match the new password.
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords must match'),
];

// Export validation rule sets for external use.
module.exports = { updateMeRules, changePasswordRules };
