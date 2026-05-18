const { body, param } = require('express-validator');

const objectIdRule = param('id').isMongoId().withMessage('Invalid trip id');

const tripBodyRules = [
  body('destination').trim().isLength({ min: 2, max: 120 }).withMessage('Destination is required'),
  body('country').optional().trim().isLength({ max: 80 }),
  body('startDate').isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').isISO8601().withMessage('End date must be a valid date'),
  body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be zero or more'),
  body('notes').optional().isArray(),
  body('notes.*.content').optional().trim().isLength({ min: 1, max: 1000 }),
];

const updateTripRules = [
  objectIdRule,
  body('destination').optional().trim().isLength({ min: 2, max: 120 }),
  body('country').optional().trim().isLength({ max: 80 }),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('budget').optional().isFloat({ min: 0 }),
  body('notes').optional().isArray(),
];

module.exports = { objectIdRule, tripBodyRules, updateTripRules };
