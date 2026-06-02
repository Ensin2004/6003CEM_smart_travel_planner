/**
 * Map module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { query } = require('express-validator');

const mapCategories = ['hotels', 'airports', 'train', 'food', 'attractions', 'shopping'];

const categoryRule = query('category')
  .isIn(mapCategories)
  .withMessage('Map category is invalid');

const destinationRule = query('destination')
  .optional({ checkFalsy: true })
  .trim()
  .isLength({ min: 2, max: 120 })
  .withMessage('Destination must be between 2 and 120 characters');
const coordinateRule = (field, min, max) =>
  query(field)
    .isFloat({ min, max })
    .withMessage(`${field} must be a valid coordinate`);
const optionalCoordinateRule = (field, min, max) =>
  query(field)
    .optional({ checkFalsy: true })
    .isFloat({ min, max })
    .withMessage(`${field} must be a valid coordinate`);

const placeNameRule = query('name')
  .trim()
  .isLength({ min: 2, max: 160 })
  .withMessage('Place name is required');
const optionalTextRule = (field, max = 180) =>
  query(field)
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max })
    .withMessage(`${field} is too long`);

const dateRule = query('date')
  .optional({ checkFalsy: true })
  .isISO8601({ strict: true, strictSeparator: true })
  .withMessage('Travel date must use YYYY-MM-DD format');

const mapPlacesRules = [
  categoryRule,
  destinationRule,
  coordinateRule('latitude', -90, 90),
  coordinateRule('longitude', -180, 180),
  query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 60 }).withMessage('Limit must be between 1 and 60'),
];

const mapPlaceDetailsRules = [
  categoryRule,
  placeNameRule,
  optionalTextRule('address'),
  optionalCoordinateRule('latitude', -90, 90),
  optionalCoordinateRule('longitude', -180, 180),
];

const mapWeatherRules = [
  query('destination').trim().isLength({ min: 2, max: 120 }).withMessage('Destination is required'),
  dateRule,
  optionalCoordinateRule('latitude', -90, 90),
  optionalCoordinateRule('longitude', -180, 180),
  optionalTextRule('locationLabel', 160),
];
module.exports = { mapPlacesRules, mapPlaceDetailsRules, mapWeatherRules };
