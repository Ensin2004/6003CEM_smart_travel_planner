/**
 * Map module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body, query } = require('express-validator');

// Supported map categories for place search
const mapCategories = ['hotels', 'airports', 'train', 'food', 'attractions', 'shopping'];

/**
 * Validates that the category parameter is one of the supported map categories.
 * @returns {Object} Express-validator validation chain
 */
const categoryRule = query('category')
  .isIn(mapCategories)
  .withMessage('Map category is invalid');

/**
 * Validates an optional destination parameter with length constraints.
 * @returns {Object} Express-validator validation chain
 */
const destinationRule = query('destination')
  .optional({ checkFalsy: true })
  .trim()
  .isLength({ min: 2, max: 120 })
  .withMessage('Destination must be between 2 and 120 characters');

/**
 * Creates a required coordinate validation rule with range constraints.
 * @param {string} field - Field name (latitude or longitude)
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {Object} Express-validator validation chain
 */
const coordinateRule = (field, min, max) =>
  query(field)
    .isFloat({ min, max })
    .withMessage(`${field} must be a valid coordinate`);

/**
 * Creates an optional coordinate validation rule with range constraints.
 * @param {string} field - Field name (latitude or longitude)
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {Object} Express-validator validation chain
 */
const optionalCoordinateRule = (field, min, max) =>
  query(field)
    .optional({ checkFalsy: true })
    .isFloat({ min, max })
    .withMessage(`${field} must be a valid coordinate`);

/**
 * Validates that a place name is provided with proper length.
 * @returns {Object} Express-validator validation chain
 */
const placeNameRule = query('name')
  .trim()
  .isLength({ min: 2, max: 160 })
  .withMessage('Place name is required');

/**
 * Creates an optional text field validation rule with max length.
 * @param {string} field - Field name
 * @param {number} max - Maximum allowed length (default: 180)
 * @returns {Object} Express-validator validation chain
 */
const optionalTextRule = (field, max = 180) =>
  query(field)
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max })
    .withMessage(`${field} is too long`);

/**
 * Validates an optional date parameter in ISO 8601 format (YYYY-MM-DD).
 * @returns {Object} Express-validator validation chain
 */
const dateRule = query('date')
  .optional({ checkFalsy: true })
  .isISO8601({ strict: true, strictSeparator: true })
  .withMessage('Travel date must use YYYY-MM-DD format');

/**
 * Requires either a destination or both latitude and longitude.
 * Used for location-based queries where coordinates or place name must be provided.
 * 
 * @returns {Object} Express-validator custom validation chain
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
 * Validation rules for map places search endpoint.
 * Validates category, destination, coordinates, and pagination limit.
 */
const mapPlacesRules = [
  categoryRule,
  destinationRule,
  coordinateRule('latitude', -90, 90),
  coordinateRule('longitude', -180, 180),
  query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 60 }).withMessage('Limit must be between 1 and 60'),
];

/**
 * Validation rules for map place details endpoint.
 * Validates category, place identifiers, name, address, and optional coordinates.
 */
const mapPlaceDetailsRules = [
  categoryRule,
  optionalTextRule('placeId', 120),
  optionalTextRule('foursquarePlaceId', 120),
  optionalTextRule('googlePlaceId', 240),
  optionalTextRule('dataId', 240),
  placeNameRule,
  optionalTextRule('address'),
  optionalCoordinateRule('latitude', -90, 90),
  optionalCoordinateRule('longitude', -180, 180),
];

/**
 * Validation rules for map weather endpoint.
 * Validates destination, date, coordinates, and location label.
 * Requires destination or coordinates.
 */
const mapWeatherRules = [
  destinationRule,
  dateRule,
  optionalCoordinateRule('latitude', -90, 90),
  optionalCoordinateRule('longitude', -180, 180),
  optionalTextRule('locationLabel', 160),
  requireDestinationOrCoordinates,
];

/**
 * Validation rules for reverse geocoding endpoint.
 * Validates latitude and longitude are provided and within ranges.
 */
const reverseGeocodeRules = [
  coordinateRule('latitude', -90, 90),
  coordinateRule('longitude', -180, 180),
];

/**
 * Validation rules for geocoding endpoint.
 * Validates the location query string is provided with proper length.
 */
const geocodeRules = [
  query('query')
    .trim()
    .isLength({ min: 2, max: 160 })
    .withMessage('Location must be between 2 and 160 characters'),
];

/**
 * Validation rules for map routes endpoint.
 * Validates travel mode and points array with coordinate validation.
 */
const mapRouteRules = [
  // Travel mode must be one of the supported modes
  body('mode')
    .isIn(['car', 'walking', 'bike', 'train', 'plane'])
    .withMessage('Travel mode is invalid'),
  
  // Points array must contain between 2 and 10 points
  body('points')
    .isArray({ min: 2, max: 10 })
    .withMessage('Route must contain between 2 and 10 points'),
  
  // Each point must have valid latitude and longitude
  body('points.*.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Route latitude must be a valid coordinate'),
  body('points.*.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Route longitude must be a valid coordinate'),

  body('optimize')
    .optional()
    .isBoolean()
    .withMessage('Route optimize flag must be true or false'),
];

module.exports = {
  geocodeRules,
  mapPlacesRules,
  mapPlaceDetailsRules,
  mapRouteRules,
  mapWeatherRules,
  reverseGeocodeRules,
};
