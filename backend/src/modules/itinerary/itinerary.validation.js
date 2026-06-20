/**
 * Itinerary module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body, param } = require('express-validator');

// URL parameter validation rules
const tripIdRule = param('tripId').isMongoId().withMessage('Invalid trip id');
const itemIdRule = param('itemId').isMongoId().withMessage('Invalid itinerary item id');
const dayNumberRule = param('dayNumber').isInt({ min: 1 }).withMessage('Invalid itinerary day');

/**
 * Validation rules for updating a day in the itinerary.
 * Validates tripId, dayNumber, and optional day metadata fields.
 */
const dayRules = [
  tripIdRule, // Validate trip ID in URL
  dayNumberRule, // Validate day number in URL
  
  // Optional day metadata validation
  body('date').optional().isISO8601(), // Must be valid ISO date
  body('title').optional().trim().isLength({ max: 120 }),
  
  // Location fields
  body('location.name').optional().trim().isLength({ max: 160 }),
  body('location.country').optional().trim().isLength({ max: 80 }),
  body('location.address').optional().trim().isLength({ max: 240 }),
  
  // Coordinates validation - must be within valid ranges
  body('location.coordinates.latitude').optional().isFloat({ min: -90, max: 90 }),
  body('location.coordinates.longitude').optional().isFloat({ min: -180, max: 180 }),
  
  // Notes and budget fields
  body('notes').optional().trim().isLength({ max: 2000 }),
  body('budget.amount').optional().isFloat({ min: 0 }),
  body('budget.currency').optional().trim().isLength({ min: 3, max: 3 }), // 3-letter currency code
];

/**
 * Validation rules for creating a new itinerary item.
 * Validates tripId and all item fields.
 */
const createItemRules = [
  tripIdRule, // Validate trip ID in URL
  
  // Item type validation - must be one of the allowed types
  body('type').isIn(['attraction', 'restaurant', 'hotel', 'transport', 'flight', 'custom']),
  
  // Title is required
  body('title').trim().isLength({ min: 1, max: 160 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('imageUrl').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 2000 }),
  body('imageUrls').optional().isArray({ max: 10 }),
  body('imageUrls.*').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 2000 }),
  
  // Date and time fields
  body('scheduledDate').optional().isISO8601(),
  body('startTime').optional().trim().isLength({ max: 20 }),
  body('endTime').optional().trim().isLength({ max: 20 }),
  
  // Price estimate - amount must be non-negative, currency must be 3 letters
  body('priceEstimate.amount').optional().isFloat({ min: 0 }),
  body('priceEstimate.currency').optional().trim().isLength({ min: 3, max: 3 }),
  body('priceEstimate.source').optional().isIn(['manual', 'api', 'ai']),
  body('priceEstimate.suggestionText').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
];

/**
 * Validation rules for updating an existing itinerary item.
 * All fields are optional since this is a PATCH operation.
 */
const updateItemRules = [
  itemIdRule, // Validate item ID in URL
  
  // All fields are optional for update
  body('type').optional().isIn(['attraction', 'restaurant', 'hotel', 'transport', 'flight', 'custom']),
  body('title').optional().trim().isLength({ min: 1, max: 160 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('imageUrl').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 2000 }),
  body('imageUrls').optional().isArray({ max: 10 }),
  body('imageUrls.*').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 2000 }),
  body('scheduledDate').optional().isISO8601(),
  body('startTime').optional().trim().isLength({ max: 20 }),
  body('endTime').optional().trim().isLength({ max: 20 }),
  body('priceEstimate.amount').optional().isFloat({ min: 0 }),
  body('priceEstimate.currency').optional().trim().isLength({ min: 3, max: 3 }),
  body('priceEstimate.source').optional().isIn(['manual', 'api', 'ai']),
  body('priceEstimate.suggestionText').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
];

module.exports = {
  createItemRules,
  dayRules,
  itemIdRule,
  tripIdRule,
  updateItemRules,
};
