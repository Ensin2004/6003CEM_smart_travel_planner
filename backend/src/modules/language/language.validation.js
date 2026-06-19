/**
 * Language module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body, param, query } = require('express-validator');

/**
 * Creates a validation rule for language code fields.
 * Supports standard language codes (e.g., 'en', 'es', 'zh', 'zh-CN').
 * 
 * @param {string} field - Field name to validate
 * @returns {Object} Express-validator validation chain
 */
const languageCodeRule = (field) =>
  body(field)
    .trim()
    .matches(/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i) // Matches 'en', 'es', 'zh-CN', 'pt-BR', etc.
    .withMessage(`${field} must be a valid language code`);

/**
 * Validation rules for the translation endpoint.
 * Validates text content and both source and target language codes.
 */
const translateRules = [
  // Text validation - required, between 1 and 1000 characters
  body('text')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Text is required and must be 1000 characters or fewer'),
  
  // Source language code validation
  languageCodeRule('sourceLanguage'),
  
  // Target language code validation
  languageCodeRule('targetLanguage'),
];

/**
 * Validation rules for the translation history query endpoint.
 * Supports pagination and search filtering.
 */
const historyQueryRules = [
  // Page number - optional, must be at least 1
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1').toInt(),
  
  // Items per page - optional, between 1 and 50
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50').toInt(),
  
  // Search term - optional, max 120 characters
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search must be 120 characters or fewer'),
];

/**
 * Validation rules for the history ID parameter in URL.
 * Ensures the ID is a valid MongoDB ObjectId format.
 */
const historyIdRules = [
  param('id').isMongoId().withMessage('Invalid translation history id'),
];

module.exports = { historyIdRules, historyQueryRules, translateRules };