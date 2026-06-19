/**
 * Feedback module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body } = require('express-validator');

/**
 * Validation rules for submitting feedback.
 * Ensures rating is valid and feedback text is within length limits.
 */
const submitFeedbackRules = [
  // Rating validation - must be an integer between 1 and 5
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  
  // Feedback text validation - optional, trimmed, max 1500 characters
  body('feedback').optional({ checkFalsy: true }).trim().isLength({ max: 1500 }),
];

module.exports = { submitFeedbackRules };