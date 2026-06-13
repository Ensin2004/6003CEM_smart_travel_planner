/**
 * Categories module.
 * Validation rejects incomplete category writes before service execution.
 */
const { body, param } = require('express-validator');

const categoryRules = [
  body('type')
    .isIn(['hotel', 'attraction', 'food'])
    .withMessage('Category type must be hotel, attraction, or food'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Category name must be between 2 and 80 characters'),
];

const categoryIdRule = param('id').isMongoId().withMessage('Invalid category id');

module.exports = { categoryRules, categoryIdRule };
