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

module.exports = { chatRules };
