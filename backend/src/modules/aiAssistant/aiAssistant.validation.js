/**
 * AI Assistant module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body } = require('express-validator');

const chatRules = [
  body('prompt')
    .trim()
    .isLength({ min: 2, max: 2000 })
    .withMessage('Prompt must be between 2 and 2000 characters.'),
  body('page').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
];

const tripRecommendationRules = [
  body('prompt')
    .trim()
    .isLength({ min: 2, max: 1000 })
    .withMessage('Prompt must be between 2 and 1000 characters.'),
  body('trip.title').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body('trip.destination').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body('trip.country').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('trip.startDate').optional({ checkFalsy: true }).isISO8601(),
  body('trip.endDate').optional({ checkFalsy: true }).isISO8601(),
  body('trip.budget.currency').optional({ checkFalsy: true }).trim().isLength({ min: 3, max: 3 }),
  body('trip.budget.totalAmount').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('plannedPlaces').optional().isArray({ max: 30 }),
  body('plannedPlaces.*').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
  body('history').optional().isArray({ max: 20 }),
  body('history.*.role').optional().isIn(['user', 'assistant']),
  body('history.*.text').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
];

module.exports = { chatRules, tripRecommendationRules };
