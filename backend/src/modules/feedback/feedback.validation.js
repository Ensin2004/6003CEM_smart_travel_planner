/**
 * Feedback module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body } = require('express-validator');

const submitFeedbackRules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional({ checkFalsy: true }).trim().isLength({ max: 1500 }),
];
module.exports = { submitFeedbackRules };
