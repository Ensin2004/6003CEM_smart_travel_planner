/**
 * Travel Guide module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { query } = require('express-validator');

// Required country field validation
const countryRule = query('country').trim().isLength({ min: 2, max: 120 }).withMessage('Country is required');

// Optional current country field validation
const optionalCurrentCountryRule = query('currentCountry').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 120 });

// Optional country code validation (2 characters)
const optionalCountryCodeRule = query('countryCode').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 2 });

// Optional current country code validation (2 characters)
const optionalCurrentCountryCodeRule = query('currentCountryCode').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 2 });

// Travel mode validation (domestic or overseas)
const modeRule = query('mode').optional({ checkFalsy: true }).isIn(['domestic', 'overseas']);

// Optional region filter validation
const optionalRegionRule = query('region').optional({ checkFalsy: true }).trim().isLength({ max: 120 });

// Optional search term validation
const optionalSearchRule = query('search').optional({ checkFalsy: true }).trim().isLength({ max: 120 });

// Optional limit parameter validation (1-30)
const optionalLimitRule = query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 30 });

// Optional page parameter validation (1-100)
const optionalPageRule = query('page').optional({ checkFalsy: true }).isInt({ min: 1, max: 100 });

// Required destination field validation
const destinationRule = query('destination').trim().isLength({ min: 2, max: 120 }).withMessage('Destination is required');

// Factory for optional coordinate validation
const optionalCoordinateRule = (field, min, max) =>
  query(field).optional({ checkFalsy: true }).isFloat({ min, max }).withMessage(`${field} must be a valid coordinate`);

// Factory for optional start offset validation
const optionalStartRule = (field) =>
  query(field).optional({ checkFalsy: true }).isInt({ min: 0, max: 200 }).withMessage(`${field} must be a positive number`);

// Optional travel date validation (ISO8601 format)
const optionalTravelDateRule = query('date')
  .optional({ checkFalsy: true })
  .isISO8601({ strict: true, strictSeparator: true })
  .withMessage('Travel date must use YYYY-MM-DD format');

// Validation rules for destination list endpoint
const destinationListRules = [
  countryRule, // Required country
  optionalCountryCodeRule, // Optional country code
  modeRule, // Optional travel mode
  optionalRegionRule, // Optional region filter
  optionalSearchRule, // Optional search term
  optionalLimitRule, // Optional pagination limit
  optionalPageRule, // Optional pagination page
];

// Validation rules for country list endpoint
const countryListRules = [
  optionalCurrentCountryRule, // Optional current country filter
  optionalCurrentCountryCodeRule, // Optional current country code
  optionalRegionRule, // Optional region filter
  optionalSearchRule, // Optional search term
  optionalLimitRule, // Optional pagination limit
  optionalPageRule, // Optional pagination page
];

// Validation rules for destination details endpoint
const destinationDetailRules = [
  destinationRule, // Required destination
  query('country').optional({ checkFalsy: true }).trim().isLength({ max: 120 }), // Optional country
  optionalCoordinateRule('latitude', -90, 90), // Optional latitude (-90 to 90)
  optionalCoordinateRule('longitude', -180, 180), // Optional longitude (-180 to 180)
  optionalTravelDateRule, // Optional travel date
  optionalStartRule('attractionStart'), // Optional attractions offset
  optionalStartRule('restaurantStart'), // Optional restaurants offset
  optionalStartRule('hotelStart'), // Optional hotels offset
];

// Export validation rule sets
module.exports = {
  countryListRules,
  destinationListRules,
  destinationDetailRules,
};