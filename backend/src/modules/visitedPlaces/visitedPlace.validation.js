/**
 * Visited places module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body, param, query } = require('express-validator');

// Allowed place type values for validation.
const visitedPlaceTypes = ['hotel', 'flight', 'attraction', 'restaurant', 'location', 'transport', 'food', 'custom'];

// Validation rules for creating or updating a visited place.
const markVisitedPlaceRules = [
  // Place type must be one of the predefined values when provided.
  body('type').optional({ checkFalsy: true }).isIn(visitedPlaceTypes).withMessage('Visited place type is invalid'),

  // Title is required and must not exceed 160 characters.
  body('title').trim().isLength({ min: 1, max: 160 }).withMessage('Place title is required'),

  // Address is optional with maximum length validation.
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 240 }),

  // Source identifier with length restriction.
  body('source').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),

  // External provider ID with length restriction.
  body('externalId').optional({ checkFalsy: true }).trim().isLength({ max: 180 }),

  // Single image URL must use HTTPS protocol.
  body('imageUrl').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 2000 }),

  // Array of image URLs with maximum of 10 items.
  body('imageUrls').optional().isArray({ max: 10 }),

  // Each image URL in the array must use HTTPS protocol.
  body('imageUrls.*').optional({ checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 2000 }),

  // Custom place key with length restriction.
  body('placeKey').optional({ checkFalsy: true }).trim().isLength({ max: 420 }),

  // Visit date must be in valid ISO8601 format.
  body('visitedDate').optional({ checkFalsy: true }).isISO8601().withMessage('Visited date must be a valid date'),

  // Visit count must be between 1 and 999.
  body('visitCount').optional({ checkFalsy: true }).isInt({ min: 1, max: 999 }).withMessage('Visit count must be between 1 and 999'),

  // Personal notes with maximum length.
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),

  // Trip ID must be a valid MongoDB ObjectId when provided.
  body('tripId').optional({ checkFalsy: true }).isMongoId().withMessage('Trip id is invalid'),

  // Itinerary item ID must be a valid MongoDB ObjectId when provided.
  body('itineraryItemId').optional({ checkFalsy: true }).isMongoId().withMessage('Itinerary item id is invalid'),
];

// Route parameter validation for visited place ID.
const visitedPlaceIdRule = [param('id').isMongoId().withMessage('Visited place id is invalid')];

// Query parameter validation for calendar date range.
const calendarRules = [
  // Start date must be in valid ISO8601 format when provided.
  query('startDate').optional({ checkFalsy: true }).isISO8601().withMessage('Start date must be valid'),

  // End date must be in valid ISO8601 format when provided.
  query('endDate').optional({ checkFalsy: true }).isISO8601().withMessage('End date must be valid'),
];

// Exports all validation rule sets for use in route definitions.
module.exports = { calendarRules, markVisitedPlaceRules, visitedPlaceIdRule };