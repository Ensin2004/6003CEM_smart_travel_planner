/**
 * Trips module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body, param } = require('express-validator');

const objectIdRule = param('id').isMongoId().withMessage('Invalid trip id');
const optionalBudgetRule = () =>
  body('budget')
    .optional()
    .custom((budget) => {
      if (typeof budget === 'number' || typeof budget === 'string') {
        return Number(budget) >= 0;
      }

      if (budget && typeof budget === 'object') {
        const amounts = [budget.totalAmount, budget.dailyLimit].filter((value) => value !== undefined);
        return amounts.every((value) => Number(value) >= 0);
      }

      return false;
    })
    .withMessage('Budget must be zero or more');

const tripBodyRules = [
  body('destination').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Destination is required'),
  body('country').optional().trim().isLength({ max: 80 }),
  body('startDate').isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').isISO8601().withMessage('End date must be a valid date'),
  optionalBudgetRule(),
  body('budget.totalAmount').optional().isFloat({ min: 0 }).withMessage('Budget amount must be zero or more'),
  body('budget.dailyLimit').optional().isFloat({ min: 0 }).withMessage('Daily budget must be zero or more'),
  body('budget.currency').optional().trim().isLength({ min: 3, max: 3 }).withMessage('Currency must be a valid 3-letter code'),
  body('planningMode').optional().isIn(['self', 'ai']),
  body('destinationSegments').optional().isArray(),
  body('destinationSegments.*.city').optional().trim().isLength({ min: 2, max: 120 }),
  body('destinationSegments.*.country').optional().trim().isLength({ max: 80 }),
  body('destinationSegments.*.imageUrl').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 2000 }),
  body('destinationSegments.*.imageUrls').optional().isArray({ max: 10 }),
  body('destinationSegments.*.imageUrls.*').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 2000 }),
  body('destinationSegments.*.startDate').optional().isISO8601(),
  body('destinationSegments.*.endDate').optional().isISO8601(),
  body('destinationSegments.*.order').optional().isInt({ min: 1 }),
  body('travelPreferences.companions').optional().isArray(),
  body('travelPreferences.styles').optional().isArray(),
  body('travelPreferences.pace').optional().isIn(['relaxed', 'moderate', 'packed']),
  body('travelPreferences.accommodation').optional().isIn(['economy', 'comfort', 'premium', 'luxury']),
  body('travelPreferences.transportModes').optional().isArray(),
  body('documentChecklist.enabled').optional().isBoolean(),
  body('documentChecklist.documentTypes').optional().isArray(),
  body('dateFlexibility.mode').optional().isIn(['exact', 'flexible']),
  body('dateFlexibility.windowDays').optional().isInt({ min: 0, max: 30 }),
  body('dateFlexibility.preferredMonth').optional().trim().isLength({ max: 20 }),
  body('notes').optional().isArray(),
  body('notes.*.content').optional().trim().isLength({ min: 1, max: 1000 }),
];

const updateTripRules = [
  objectIdRule,
  body('destination').optional().trim().isLength({ min: 2, max: 120 }),
  body('country').optional().trim().isLength({ max: 80 }),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  optionalBudgetRule(),
  body('budget.totalAmount').optional().isFloat({ min: 0 }),
  body('budget.dailyLimit').optional().isFloat({ min: 0 }),
  body('budget.currency').optional().trim().isLength({ min: 3, max: 3 }),
  body('planningMode').optional().isIn(['self', 'ai']),
  body('destinationSegments').optional().isArray(),
  body('destinationSegments.*.city').optional().trim().isLength({ min: 2, max: 120 }),
  body('destinationSegments.*.country').optional().trim().isLength({ max: 80 }),
  body('destinationSegments.*.imageUrl').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 2000 }),
  body('destinationSegments.*.imageUrls').optional().isArray({ max: 10 }),
  body('destinationSegments.*.imageUrls.*').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 2000 }),
  body('destinationSegments.*.startDate').optional().isISO8601(),
  body('destinationSegments.*.endDate').optional().isISO8601(),
  body('destinationSegments.*.order').optional().isInt({ min: 1 }),
  body('travelPreferences.companions').optional().isArray(),
  body('travelPreferences.styles').optional().isArray(),
  body('travelPreferences.pace').optional().isIn(['relaxed', 'moderate', 'packed']),
  body('travelPreferences.accommodation').optional().isIn(['economy', 'comfort', 'premium', 'luxury']),
  body('travelPreferences.transportModes').optional().isArray(),
  body('documentChecklist.enabled').optional().isBoolean(),
  body('documentChecklist.documentTypes').optional().isArray(),
  body('dateFlexibility.mode').optional().isIn(['exact', 'flexible']),
  body('dateFlexibility.windowDays').optional().isInt({ min: 0, max: 30 }),
  body('dateFlexibility.preferredMonth').optional().trim().isLength({ max: 20 }),
  body('notes').optional().isArray(),
];
module.exports = { objectIdRule, tripBodyRules, updateTripRules };
