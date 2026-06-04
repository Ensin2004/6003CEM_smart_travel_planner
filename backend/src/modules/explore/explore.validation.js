/**
 * Explore module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body, query } = require('express-validator');

const optionalDestinationRule = query('destination').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 120 });
const optionalFilterRule = (field) => query(field).optional({ checkFalsy: true }).trim().isLength({ max: 80 });
const optionalCoordinateRule = (field, min, max) =>
  query(field).optional({ checkFalsy: true }).isFloat({ min, max }).withMessage(`${field} must be a valid coordinate`);
const optionalStartRule = query('start')
  .optional({ checkFalsy: true })
  .isInt({ min: 0 })
  .withMessage('Start must be a positive number');

const optionalTravelDateRule = query('date')
  .optional({ checkFalsy: true })
  .isISO8601({ strict: true, strictSeparator: true })
  .withMessage('Travel date must use YYYY-MM-DD format')
  .bail()
  .custom((value) => {
    const requestedDate = new Date(value);
    const today = new Date(new Date().toISOString().slice(0, 10));
    const maxDate = new Date(today);
    const minDate = new Date('2015-01-01');
    maxDate.setDate(maxDate.getDate() + 214);

    if (requestedDate < minDate) {
      throw new Error('Historical weather is available from 2015-01-01 onward.');
    }

    if (requestedDate > maxDate) {
      throw new Error('Travel date can be up to about 7 months ahead.');
    }

    return true;
  });
const requireAnySearchValue = (fields, message) =>
  query().custom((_, { req }) => {
    const hasSearchValue = fields.some((field) => Boolean(req.query[field]?.trim()));
    if (!hasSearchValue) {
      throw new Error(message);
    }

    return true;
  });
const requireDestinationOrCoordinates = query().custom((_, { req }) => {
  const hasDestination = Boolean(req.query.destination?.trim());
  const hasLatitude = req.query.latitude !== undefined && req.query.latitude !== '';
  const hasLongitude = req.query.longitude !== undefined && req.query.longitude !== '';

  if (hasDestination || (hasLatitude && hasLongitude)) {
    return true;
  }

  throw new Error('Destination or current location coordinates are required.');
});

const weatherRules = [
  optionalDestinationRule,
  optionalTravelDateRule,
  optionalCoordinateRule('latitude', -90, 90),
  optionalCoordinateRule('longitude', -180, 180),
  optionalFilterRule('locationLabel'),
  requireDestinationOrCoordinates,
];

const attractionRules = [
  optionalDestinationRule,
  optionalFilterRule('country'),
  optionalFilterRule('state'),
  optionalFilterRule('attractionCategory'),
  optionalStartRule,
  requireAnySearchValue(
    ['destination', 'country', 'state', 'attractionCategory'],
    'Enter an attraction name, country, location, or category first.'
  ),
];

const attractionDetailRules = [
  optionalFilterRule('name'),
  query('address').optional({ checkFalsy: true }).trim().isLength({ max: 220 }),
  query('dataId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  query('placeId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  requireAnySearchValue(['name', 'dataId', 'placeId'], 'Attraction name or Google identifier is required.'),
];

const hotelRules = [
  optionalDestinationRule,
  optionalFilterRule('country'),
  optionalFilterRule('state'),
  optionalFilterRule('roomType'),
  optionalStartRule,
  requireAnySearchValue(
    ['destination', 'country', 'state', 'roomType'],
    'Enter a hotel name, country, location, or room type first.'
  ),
];

const hotelDetailRules = [
  optionalFilterRule('name'),
  query('address').optional({ checkFalsy: true }).trim().isLength({ max: 220 }),
  query('dataId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  query('placeId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  requireAnySearchValue(['name', 'dataId', 'placeId'], 'Hotel name or Google identifier is required.'),
];

const restaurantRules = [
  optionalDestinationRule,
  optionalFilterRule('country'),
  optionalFilterRule('state'),
  optionalFilterRule('foodCategory'),
  optionalStartRule,
  requireAnySearchValue(
    ['destination', 'country', 'state', 'foodCategory'],
    'Enter a restaurant name, country, location, or food category first.'
  ),
];

const restaurantDetailRules = [
  optionalFilterRule('name'),
  query('address').optional({ checkFalsy: true }).trim().isLength({ max: 220 }),
  query('dataId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  query('placeId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  requireAnySearchValue(['name', 'dataId', 'placeId'], 'Restaurant name or Google identifier is required.'),
];

const placeReviewRules = [
  query('dataId').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
  query('placeId').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
  query('allPages').optional({ checkFalsy: true }).isBoolean().withMessage('allPages must be true or false'),
];
const placeImageRules = [
  query('url')
    .trim()
    .isURL({ protocols: ['https'], require_protocol: true })
    .withMessage('A valid HTTPS image URL is required'),
];

const aiRecommendationRules = [
  body('view').isIn(['attractions', 'food', 'hotels']).withMessage('Explore view is required'),
  body('destination').trim().isLength({ min: 2, max: 120 }).withMessage('Destination is required'),
  body('date').optional({ checkFalsy: true }).isISO8601({ strict: true, strictSeparator: true }),
  body('items').isArray({ min: 1, max: 40 }).withMessage('Search results are required'),
  body('items.*.name').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body('items.*.category').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('items.*.rating').optional({ nullable: true }).isFloat({ min: 0, max: 5 }),
  body('items.*.reviewCount').optional({ nullable: true }).isInt({ min: 0 }),
  body('items.*.price').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('items.*.openState').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('items.*.address').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
];
module.exports = {
  aiRecommendationRules,
  attractionDetailRules,
  attractionRules,
  hotelDetailRules,
  hotelRules,
  placeImageRules,
  placeReviewRules,
  restaurantDetailRules,
  restaurantRules,
  weatherRules,
};
