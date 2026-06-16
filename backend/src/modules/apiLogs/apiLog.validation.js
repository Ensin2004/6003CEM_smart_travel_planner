/**
 * Api Logs module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { query } = require('express-validator');

/**
 * Validation rules for listing API logs with query parameters.
 * Validates all optional filter, pagination, and date range parameters.
 * Ensures only valid values are passed to the service layer.
 */
const listLogRules = [
  // Status filter - must be one of the allowed log status values
  query('status').optional().isIn(['success', 'fail', 'error']).withMessage('Invalid log status'),
  
  // Category filter - must be one of the defined log categories
  query('category')
    .optional()
    .isIn(['api', 'system', 'auth', 'rate-limit'])
    .withMessage('Invalid log category'),
  
  // Severity filter - must be one of the severity levels
  query('severity')
    .optional()
    .isIn(['info', 'warning', 'error', 'critical'])
    .withMessage('Invalid severity'),
  
  // Service filter - case-insensitive partial match, limited length
  query('service').optional().trim().isLength({ max: 80 }).withMessage('Service filter is too long'),
  
  // Error code filter - alphanumeric and underscores only, limited length
  query('errorCode')
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9_]+$/) // Only allow letters, numbers, and underscores
    .isLength({ max: 80 })
    .withMessage('Invalid error code'),
  
  // Request ID filter - allows alphanumeric, dot, underscore, and hyphen
  query('requestId')
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9._-]+$/) // Match valid request ID format
    .isLength({ max: 100 })
    .withMessage('Invalid request ID'),
  
  // User ID filter - must be a valid MongoDB ObjectId
  query('userId').optional().isMongoId().withMessage('Invalid user ID'),
  
  // Date range filters - must be valid ISO 8601 dates
  query('from').optional().isISO8601().withMessage('From date must be valid'),
  query('to').optional().isISO8601().withMessage('To date must be valid'),
  
  // Pagination - page must be at least 1
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be one or more'),
  
  // Pagination - limit between 1 and 100 to prevent excessive queries
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

module.exports = { listLogRules };