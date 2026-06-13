/**
 * Language module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body, param, query } = require('express-validator');
const languageCodeRule = (field) =>
  body(field)
    .trim()
    .matches(/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i)
    .withMessage(`${field} must be a valid language code`);

const translateRules = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Text is required and must be 1000 characters or fewer'),
  languageCodeRule('sourceLanguage'),
  languageCodeRule('targetLanguage'),
];

const historyQueryRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50').toInt(),
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search must be 120 characters or fewer'),
];

const historyIdRules = [
  param('id').isMongoId().withMessage('Invalid translation history id'),
];
module.exports = { historyIdRules, historyQueryRules, translateRules };
