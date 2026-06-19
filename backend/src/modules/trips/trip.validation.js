/**
 * Trips module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body, param } = require('express-validator');

// MongoDB ObjectId validation for trip ID parameter
const objectIdRule = param('id').isMongoId().withMessage('Invalid trip id');

// Factory function for budget validation rules
const optionalBudgetRule = () =>
  body('budget')
    .optional()
    .custom((budget) => {
      // Handle numeric budget (number or string)
      if (typeof budget === 'number' || typeof budget === 'string') {
        return Number(budget) >= 0;
      }

      // Handle object budget with totalAmount
      if (budget && typeof budget === 'object') {
        return budget.totalAmount === undefined || Number(budget.totalAmount) >= 0;
      }

      return false;
    })
    .withMessage('Budget must be zero or more');

// Validation rules for creating a trip
const tripBodyRules = [
  // Destination is required
  body('destination').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Destination is required'),
  
  // Optional country field
  body('country').optional().trim().isLength({ max: 80 }),
  
  // Required date fields
  body('startDate').isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').isISO8601().withMessage('End date must be a valid date'),
  
  // Budget validation
  optionalBudgetRule(),
  body('budget.totalAmount').optional().isFloat({ min: 0 }).withMessage('Budget amount must be zero or more'),
  body('budget.currency').optional().trim().isLength({ min: 3, max: 3 }).withMessage('Currency must be a valid 3-letter code'),
  
  // Destination segments validation
  body('destinationSegments').optional().isArray(),
  body('destinationSegments.*.city').optional().trim().isLength({ min: 2, max: 120 }),
  body('destinationSegments.*.country').optional().trim().isLength({ max: 80 }),
  body('destinationSegments.*.imageUrl').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 2000 }),
  body('destinationSegments.*.imageUrls').optional().isArray({ max: 10 }),
  body('destinationSegments.*.imageUrls.*').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 2000 }),
  body('destinationSegments.*.startDate').optional().isISO8601(),
  body('destinationSegments.*.endDate').optional().isISO8601(),
  body('destinationSegments.*.order').optional().isInt({ min: 1 }),
  
  // Travel preferences validation
  body('travelPreferences.companions').optional().isArray(),
  body('travelPreferences.styles').optional().isArray(),
  body('travelPreferences.pace').optional().isIn(['relaxed', 'moderate', 'packed']),
  body('travelPreferences.accommodation').optional().isIn(['economy', 'comfort', 'premium', 'luxury']),
  body('travelPreferences.transportModes').optional().isArray(),
  
  // Document checklist validation
  body('documentChecklist.enabled').optional().isBoolean(),
  body('documentChecklist.documentTypes').optional().isArray(),
  
  // Date flexibility validation
  body('dateFlexibility.mode').optional().isIn(['exact', 'flexible']),
  body('dateFlexibility.windowDays').optional().isInt({ min: 0, max: 30 }),
  body('dateFlexibility.preferredMonth').optional().trim().isLength({ max: 20 }),
  
  // Notes validation
  body('notes').optional().isArray(),
  body('notes.*.content').optional().trim().isLength({ min: 1, max: 1000 }),
];

// Validation rules for updating a trip
const updateTripRules = [
  // Trip ID is required
  objectIdRule,
  
  // Optional update fields
  body('title').optional().trim().isLength({ min: 1, max: 120 }),
  body('destination').optional().trim().isLength({ min: 2, max: 120 }),
  body('country').optional().trim().isLength({ max: 80 }),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  
  // Budget validation
  optionalBudgetRule(),
  body('budget.totalAmount').optional().isFloat({ min: 0 }),
  body('budget.currency').optional().trim().isLength({ min: 3, max: 3 }),
  
  // Destination segments validation
  body('destinationSegments').optional().isArray(),
  body('destinationSegments.*.city').optional().trim().isLength({ min: 2, max: 120 }),
  body('destinationSegments.*.country').optional().trim().isLength({ max: 80 }),
  body('destinationSegments.*.imageUrl').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 2000 }),
  body('destinationSegments.*.imageUrls').optional().isArray({ max: 10 }),
  body('destinationSegments.*.imageUrls.*').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 2000 }),
  body('destinationSegments.*.startDate').optional().isISO8601(),
  body('destinationSegments.*.endDate').optional().isISO8601(),
  body('destinationSegments.*.order').optional().isInt({ min: 1 }),
  
  // Travel preferences validation
  body('travelPreferences.companions').optional().isArray(),
  body('travelPreferences.styles').optional().isArray(),
  body('travelPreferences.pace').optional().isIn(['relaxed', 'moderate', 'packed']),
  body('travelPreferences.accommodation').optional().isIn(['economy', 'comfort', 'premium', 'luxury']),
  body('travelPreferences.transportModes').optional().isArray(),
  
  // Document checklist validation
  body('documentChecklist.enabled').optional().isBoolean(),
  body('documentChecklist.documentTypes').optional().isArray(),
  
  // Date flexibility validation
  body('dateFlexibility.mode').optional().isIn(['exact', 'flexible']),
  body('dateFlexibility.windowDays').optional().isInt({ min: 0, max: 30 }),
  body('dateFlexibility.preferredMonth').optional().trim().isLength({ max: 20 }),
  
  // Notes validation
  body('notes').optional().isArray(),
];

// Export validation rule sets
module.exports = { objectIdRule, tripBodyRules, updateTripRules };