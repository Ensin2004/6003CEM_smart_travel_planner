const { body } = require('express-validator');

const updateMeRules = [
  body('name').optional().isLength({ min: 2, max: 80 }).withMessage('Name must be 2 to 80 characters'),
  body('preferences.travelStyle').optional().trim().isLength({ max: 60 }),
  body('preferences.budgetLevel').optional().isIn(['low', 'medium', 'high']),
  body('preferences.preferredActivities').optional().isArray(),
];

module.exports = { updateMeRules };
