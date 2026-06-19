/**
 * AI Assistant module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body } = require('express-validator');

/**
 * Validation rules for the general chat endpoint.
 * Ensures user prompts are properly formatted and within length limits.
 * Optional page field provides context for better AI responses.
 */
const chatRules = [
  body('prompt')
    .trim() // Remove leading/trailing whitespace
    .isLength({ min: 2, max: 2000 }) // Enforce reasonable prompt length limits
    .withMessage('Prompt must be between 2 and 2000 characters.'),
  body('page')
    .optional({ checkFalsy: true }) // Skip validation if empty, null, or undefined
    .trim()
    .isLength({ max: 160 }), // Limit page description length
];

/**
 * Validation rules for trip recommendation endpoint.
 * Validates comprehensive trip data including destination, dates, budget,
 * planned places, and conversation history for contextual recommendations.
 */
const tripRecommendationRules = [
  // User prompt - required field for generating recommendations
  body('prompt')
    .trim()
    .isLength({ min: 2, max: 1000 })
    .withMessage('Prompt must be between 2 and 1000 characters.'),
  
  // Trip metadata - all optional fields for trip context
  body('trip.title').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body('trip.destination').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body('trip.country').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  
  // Date validation using ISO 8601 format (e.g., 2024-12-31)
  body('trip.startDate').optional({ checkFalsy: true }).isISO8601(),
  body('trip.endDate').optional({ checkFalsy: true }).isISO8601(),
  
  // Budget validation - currency code (3 letters) and positive amount
  body('trip.budget.currency').optional({ checkFalsy: true }).trim().isLength({ min: 3, max: 3 }),
  body('trip.budget.totalAmount').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  
  // Planned places - array of place names already added to the trip
  body('plannedPlaces').optional().isArray({ max: 30 }), // Limit array size
  body('plannedPlaces.*').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
  
  // Conversation history - maintains context for follow-up questions
  body('history').optional().isArray({ max: 20 }), // Limit history size
  body('history.*.role').optional().isIn(['user', 'assistant']), // Only allow valid message roles
  body('history.*.text').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
];

module.exports = { chatRules, tripRecommendationRules };