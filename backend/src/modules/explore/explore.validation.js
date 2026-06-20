/**
 * Explore module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body, query } = require('express-validator');

/**
 * Helper: Optional destination field with length validation.
 * @param {string} field - Field name
 * @returns {Object} Validation chain
 */
const optionalDestinationRule = query('destination').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 120 });

/**
 * Helper: Optional filter field with max length validation.
 * @param {string} field - Field name
 * @returns {Object} Validation chain
 */
const optionalFilterRule = (field) => query(field).optional({ checkFalsy: true }).trim().isLength({ max: 80 });

/**
 * Helper: Optional coordinate field with range validation.
 * @param {string} field - Field name
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {Object} Validation chain
 */
const optionalCoordinateRule = (field, min, max) =>
  query(field).optional({ checkFalsy: true }).isFloat({ min, max }).withMessage(`${field} must be a valid coordinate`);

/**
 * Helper: Optional start index for pagination.
 * @returns {Object} Validation chain
 */
const optionalStartRule = query('start')
  .optional({ checkFalsy: true })
  .isInt({ min: 0 })
  .withMessage('Start must be a positive number');

/**
 * Helper: Optional travel date with format and range validation.
 * Validates ISO 8601 date format and ensures date is within valid range.
 * @returns {Object} Validation chain
 */
const optionalTravelDateRule = query('date')
  .optional({ checkFalsy: true })
  .isISO8601({ strict: true, strictSeparator: true })
  .withMessage('Travel date must use YYYY-MM-DD format')
  .bail() // Stop validation chain if previous check fails
  .custom((value) => {
    const requestedDate = new Date(value);
    const today = new Date(new Date().toISOString().slice(0, 10)); // Normalize to date-only
    const maxDate = new Date(today);
    const minDate = new Date('2015-01-01');
    maxDate.setDate(maxDate.getDate() + 214); // Approximately 7 months ahead

    // Validate against historical weather data availability
    if (requestedDate < minDate) {
      throw new Error('Historical weather is available from 2015-01-01 onward.');
    }

    // Validate against forecast range
    if (requestedDate > maxDate) {
      throw new Error('Travel date can be up to about 7 months ahead.');
    }

    return true;
  });

/**
 * Helper: Requires at least one search value from specified fields.
 * @param {Array<string>} fields - Field names to check
 * @param {string} message - Error message if no value provided
 * @returns {Object} Validation chain
 */
const requireAnySearchValue = (fields, message) =>
  query().custom((_, { req }) => {
    const hasSearchValue = fields.some((field) => Boolean(req.query[field]?.trim()));
    if (!hasSearchValue) {
      throw new Error(message);
    }

    return true;
  });

/**
 * Helper: Requires destination or coordinates for weather lookup.
 * @returns {Object} Validation chain
 */
const requireDestinationOrCoordinates = query().custom((_, { req }) => {
  const hasDestination = Boolean(req.query.destination?.trim());
  const hasLatitude = req.query.latitude !== undefined && req.query.latitude !== '';
  const hasLongitude = req.query.longitude !== undefined && req.query.longitude !== '';

  if (hasDestination || (hasLatitude && hasLongitude)) {
    return true;
  }

  throw new Error('Destination or current location coordinates are required.');
});

/**
 * Weather endpoint validation rules.
 * Requires destination or coordinates, optional date.
 */
const weatherRules = [
  optionalDestinationRule,
  optionalTravelDateRule,
  optionalCoordinateRule('latitude', -90, 90),
  optionalCoordinateRule('longitude', -180, 180),
  optionalFilterRule('locationLabel'),
  requireDestinationOrCoordinates,
];

/**
 * Attractions list endpoint validation rules.
 * Allows optional country, destination, state, category, and pagination.
 */
const attractionRules = [
  optionalDestinationRule,
  optionalFilterRule('country'),
  optionalFilterRule('state'),
  optionalFilterRule('attractionCategory'),
  optionalFilterRule('locationLabel'),
  optionalCoordinateRule('latitude', -90, 90),
  optionalCoordinateRule('longitude', -180, 180),
  optionalStartRule,
];

/**
 * Attraction detail endpoint validation rules.
 * Requires at least one identifier (name, dataId, or placeId).
 */
const attractionDetailRules = [
  optionalFilterRule('name'),
  query('address').optional({ checkFalsy: true }).trim().isLength({ max: 220 }),
  query('dataId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  query('placeId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  requireAnySearchValue(['name', 'dataId', 'placeId'], 'Attraction name or Google identifier is required.'),
];

/**
 * Hotels list endpoint validation rules.
 * Allows optional country, destination, state, room type, and pagination.
 */
const hotelRules = [
  optionalDestinationRule,
  optionalFilterRule('country'),
  optionalFilterRule('state'),
  optionalFilterRule('roomType'),
  optionalFilterRule('locationLabel'),
  optionalCoordinateRule('latitude', -90, 90),
  optionalCoordinateRule('longitude', -180, 180),
  optionalStartRule,
];

/**
 * Hotel detail endpoint validation rules.
 * Requires at least one identifier (name, dataId, or placeId).
 */
const hotelDetailRules = [
  optionalFilterRule('name'),
  query('address').optional({ checkFalsy: true }).trim().isLength({ max: 220 }),
  query('dataId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  query('placeId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  requireAnySearchValue(['name', 'dataId', 'placeId'], 'Hotel name or Google identifier is required.'),
];

/**
 * Restaurants list endpoint validation rules.
 * Allows optional country, destination, state, food category, and pagination.
 */
const restaurantRules = [
  optionalDestinationRule,
  optionalFilterRule('country'),
  optionalFilterRule('state'),
  optionalFilterRule('foodCategory'),
  optionalFilterRule('locationLabel'),
  optionalCoordinateRule('latitude', -90, 90),
  optionalCoordinateRule('longitude', -180, 180),
  optionalStartRule,
];

/**
 * Restaurant detail endpoint validation rules.
 * Requires at least one identifier (name, dataId, or placeId).
 */
const restaurantDetailRules = [
  optionalFilterRule('name'),
  query('address').optional({ checkFalsy: true }).trim().isLength({ max: 220 }),
  query('dataId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  query('placeId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  requireAnySearchValue(['name', 'dataId', 'placeId'], 'Restaurant name or Google identifier is required.'),
];

/**
 * Place reviews endpoint validation rules.
 * Validates optional identifiers and allPages flag.
 */
const placeReviewRules = [
  query('dataId').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
  query('placeId').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
  query('allPages').optional({ checkFalsy: true }).isBoolean().withMessage('allPages must be true or false'),
];

/**
 * Place image endpoint validation rules.
 * Requires a valid HTTPS image URL.
 */
const placeImageRules = [
  query('url')
    .trim()
    .isURL({ protocols: ['https'], require_protocol: true }) // Must be HTTPS
    .withMessage('A valid HTTPS image URL is required'),
];

/**
 * AI recommendations endpoint validation rules.
 * Validates view, destination, date, and items array for AI processing.
 */
const aiRecommendationRules = [
  body('view').isIn(['attractions', 'food', 'hotels']).withMessage('Explore view is required'),
  body('destination').trim().isLength({ min: 2, max: 120 }).withMessage('Destination is required'),
  body('date').optional({ checkFalsy: true }).isISO8601({ strict: true, strictSeparator: true }),
  body('items').isArray({ min: 1, max: 40 }).withMessage('Search results are required'),
  // Individual item validations for AI context
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
