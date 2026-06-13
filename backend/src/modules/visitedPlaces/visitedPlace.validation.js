/**
 * Visited places module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body, param, query } = require('express-validator');

const visitedPlaceTypes = ['hotel', 'flight', 'attraction', 'restaurant', 'location', 'transport', 'food', 'custom'];

const markVisitedPlaceRules = [
  body('type').optional({ checkFalsy: true }).isIn(visitedPlaceTypes).withMessage('Visited place type is invalid'),
  body('title').trim().isLength({ min: 1, max: 160 }).withMessage('Place title is required'),
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 240 }),
  body('source').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('externalId').optional({ checkFalsy: true }).trim().isLength({ max: 180 }),
  body('placeKey').optional({ checkFalsy: true }).trim().isLength({ max: 420 }),
  body('visitedDate').optional({ checkFalsy: true }).isISO8601().withMessage('Visited date must be a valid date'),
  body('visitCount').optional({ checkFalsy: true }).isInt({ min: 1, max: 999 }).withMessage('Visit count must be between 1 and 999'),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body('tripId').optional({ checkFalsy: true }).isMongoId().withMessage('Trip id is invalid'),
  body('itineraryItemId').optional({ checkFalsy: true }).isMongoId().withMessage('Itinerary item id is invalid'),
];

const visitedPlaceIdRule = [param('id').isMongoId().withMessage('Visited place id is invalid')];

const calendarRules = [
  query('startDate').optional({ checkFalsy: true }).isISO8601().withMessage('Start date must be valid'),
  query('endDate').optional({ checkFalsy: true }).isISO8601().withMessage('End date must be valid'),
];

module.exports = { calendarRules, markVisitedPlaceRules, visitedPlaceIdRule };
