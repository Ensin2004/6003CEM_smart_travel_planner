/**
 * Api Logs module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { query } = require('express-validator');

const listLogRules = [
  query('status').optional().isIn(['success', 'fail', 'error']).withMessage('Invalid log status'),
  query('category')
    .optional()
    .isIn(['api', 'system', 'auth', 'rate-limit'])
    .withMessage('Invalid log category'),
  query('severity')
    .optional()
    .isIn(['info', 'warning', 'error', 'critical'])
    .withMessage('Invalid severity'),
  query('service').optional().trim().isLength({ max: 80 }).withMessage('Service filter is too long'),
  query('errorCode')
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9_]+$/)
    .isLength({ max: 80 })
    .withMessage('Invalid error code'),
  query('requestId')
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9._-]+$/)
    .isLength({ max: 100 })
    .withMessage('Invalid request ID'),
  query('from').optional().isISO8601().withMessage('From date must be valid'),
  query('to').optional().isISO8601().withMessage('To date must be valid'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be one or more'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];
module.exports = { listLogRules };
