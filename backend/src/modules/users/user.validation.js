const { body } = require('express-validator');

const maxAvatarSizeMegabytes = 1000;
const maxAvatarBase64Length = Math.ceil((maxAvatarSizeMegabytes * 1024 * 1024 * 4) / 3) + 64;

const updateMeRules = [
  body('name').optional().isLength({ min: 2, max: 80 }).withMessage('Name must be 2 to 80 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('avatarUrl')
    .optional({ checkFalsy: true })
    .isLength({ max: maxAvatarBase64Length })
    .withMessage(`Avatar image is too large. Maximum size is ${maxAvatarSizeMegabytes}MB.`)
    .matches(/^data:image\/(png|jpe?g);base64,/)
    .withMessage('Avatar must be a PNG, JPG, or JPEG image'),
  body('country').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Country is required'),
  body('gender')
    .optional()
    .isIn(['female', 'male', 'non-binary', 'prefer-not-to-say'])
    .withMessage('Gender is required'),
  body('ageGroup')
    .optional()
    .isIn(['under-18', '18-24', '25-34', '35-44', '45-54', '55+'])
    .withMessage('Age group is required'),
  body('notificationPreferences.notificationsOff').optional().isBoolean(),
  body('notificationPreferences.tripAlerts').optional().isBoolean(),
  body('notificationPreferences.weatherAlerts').optional().isBoolean(),
  body('notificationPreferences.packingReminder').optional().isBoolean(),
  body('notificationPreferences.errorLogs').optional().isBoolean(),
  body('notificationPreferences.systemAlerts').optional().isBoolean(),
  body('notificationPreferences.ratingFeedback').optional().isBoolean(),
  body('preferences.travelStyle').optional().trim().isLength({ max: 60 }),
  body('preferences.budgetLevel').optional().isIn(['low', 'medium', 'high']),
  body('preferences.preferredActivities').optional().isArray(),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
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
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords must match'),
];

module.exports = { updateMeRules, changePasswordRules };
