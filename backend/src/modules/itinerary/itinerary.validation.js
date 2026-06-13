/**
 * Itinerary module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body, param } = require('express-validator');

const tripIdRule = param('tripId').isMongoId().withMessage('Invalid trip id');
const itemIdRule = param('itemId').isMongoId().withMessage('Invalid itinerary item id');
const dayNumberRule = param('dayNumber').isInt({ min: 1 }).withMessage('Invalid itinerary day');

const dayRules = [
  tripIdRule,
  dayNumberRule,
  body('date').optional().isISO8601(),
  body('title').optional().trim().isLength({ max: 120 }),
  body('location.name').optional().trim().isLength({ max: 160 }),
  body('location.country').optional().trim().isLength({ max: 80 }),
  body('location.address').optional().trim().isLength({ max: 240 }),
  body('location.coordinates.latitude').optional().isFloat({ min: -90, max: 90 }),
  body('location.coordinates.longitude').optional().isFloat({ min: -180, max: 180 }),
  body('notes').optional().trim().isLength({ max: 2000 }),
  body('budget.amount').optional().isFloat({ min: 0 }),
  body('budget.currency').optional().trim().isLength({ min: 3, max: 3 }),
];

const createItemRules = [
  tripIdRule,
  body('type').isIn(['attraction', 'restaurant', 'hotel', 'transport', 'flight', 'custom']),
  body('title').trim().isLength({ min: 1, max: 160 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('scheduledDate').optional().isISO8601(),
  body('startTime').optional().trim().isLength({ max: 20 }),
  body('endTime').optional().trim().isLength({ max: 20 }),
  body('priceEstimate.amount').optional().isFloat({ min: 0 }),
  body('priceEstimate.currency').optional().trim().isLength({ min: 3, max: 3 }),
];

const updateItemRules = [
  itemIdRule,
  body('type').optional().isIn(['attraction', 'restaurant', 'hotel', 'transport', 'flight', 'custom']),
  body('title').optional().trim().isLength({ min: 1, max: 160 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('scheduledDate').optional().isISO8601(),
  body('startTime').optional().trim().isLength({ max: 20 }),
  body('endTime').optional().trim().isLength({ max: 20 }),
  body('priceEstimate.amount').optional().isFloat({ min: 0 }),
  body('priceEstimate.currency').optional().trim().isLength({ min: 3, max: 3 }),
];
module.exports = {
  createItemRules,
  dayRules,
  itemIdRule,
  tripIdRule,
  updateItemRules,
};
