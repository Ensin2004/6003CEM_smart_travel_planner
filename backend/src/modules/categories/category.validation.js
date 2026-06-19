/**
 * Categories module.
 * Validation rejects incomplete category writes before service execution.
 */
const { body, param } = require('express-validator');

/**
 * Validation rules for category creation and update operations.
 * Ensures category data is properly formatted before reaching the service layer.
 */
const categoryRules = [
  // Type validation - must be one of the three supported category types
  body('type')
    .isIn(['hotel', 'attraction', 'food'])
    .withMessage('Category type must be hotel, attraction, or food'),
  
  // Name validation - must be between 2 and 80 characters after trimming
  body('name')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Category name must be between 2 and 80 characters'),
];

/**
 * Validation rule for category ID parameter in URL.
 * Ensures the ID is a valid MongoDB ObjectId format.
 */
const categoryIdRule = param('id').isMongoId().withMessage('Invalid category id');

module.exports = { categoryRules, categoryIdRule };