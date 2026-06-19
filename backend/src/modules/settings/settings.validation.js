/**
 * Settings module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body } = require('express-validator');

/**
 * Validation rules for updating settings content.
 * All fields are optional since updates can be partial.
 * Validates privacy policy, terms, and FAQ entries.
 */
const updateContentRules = [
  // Privacy policy - optional, trimmed
  body('privacyPolicy').optional().trim(),
  
  // Terms and conditions - optional, trimmed
  body('termsAndConditions').optional().trim(),
  
  // FAQs - optional, must be an array if provided
  body('faqs').optional().isArray().withMessage('FAQ must be a list'),
  
  // Each FAQ entry must have a question (1-180 characters)
  body('faqs.*.question').trim().isLength({ min: 1, max: 180 }).withMessage('FAQ question is required'),
  
  // Each FAQ entry must have an answer (1-2000 characters)
  body('faqs.*.answer').trim().isLength({ min: 1, max: 2000 }).withMessage('FAQ answer is required'),
];

module.exports = { updateContentRules };