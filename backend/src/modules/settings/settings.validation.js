const { body } = require('express-validator');

const updateContentRules = [
  body('privacyPolicy').optional().trim(),
  body('termsAndConditions').optional().trim(),
  body('faqs').optional().isArray().withMessage('FAQ must be a list'),
  body('faqs.*.question').trim().isLength({ min: 1, max: 180 }).withMessage('FAQ question is required'),
  body('faqs.*.answer').trim().isLength({ min: 1, max: 2000 }).withMessage('FAQ answer is required'),
];

module.exports = { updateContentRules };
