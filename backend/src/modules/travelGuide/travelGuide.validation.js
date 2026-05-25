const { query } = require('express-validator');

const countryRule = query('country').trim().isLength({ min: 2, max: 120 }).withMessage('Country is required');
const optionalCurrentCountryRule = query('currentCountry').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 120 });
const optionalCountryCodeRule = query('countryCode').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 2 });
const optionalCurrentCountryCodeRule = query('currentCountryCode').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 2 });
const modeRule = query('mode').optional({ checkFalsy: true }).isIn(['domestic', 'overseas']);
const optionalRegionRule = query('region').optional({ checkFalsy: true }).trim().isLength({ max: 120 });
const optionalSearchRule = query('search').optional({ checkFalsy: true }).trim().isLength({ max: 120 });
const optionalLimitRule = query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 30 });
const optionalPageRule = query('page').optional({ checkFalsy: true }).isInt({ min: 1, max: 100 });
const destinationRule = query('destination').trim().isLength({ min: 2, max: 120 }).withMessage('Destination is required');
const optionalCoordinateRule = (field, min, max) =>
  query(field).optional({ checkFalsy: true }).isFloat({ min, max }).withMessage(`${field} must be a valid coordinate`);
const optionalStartRule = (field) =>
  query(field).optional({ checkFalsy: true }).isInt({ min: 0, max: 200 }).withMessage(`${field} must be a positive number`);
const optionalTravelDateRule = query('date')
  .optional({ checkFalsy: true })
  .isISO8601({ strict: true, strictSeparator: true })
  .withMessage('Travel date must use YYYY-MM-DD format');

const destinationListRules = [
  countryRule,
  optionalCountryCodeRule,
  modeRule,
  optionalRegionRule,
  optionalSearchRule,
  optionalLimitRule,
  optionalPageRule,
];

const countryListRules = [
  optionalCurrentCountryRule,
  optionalCurrentCountryCodeRule,
  optionalRegionRule,
  optionalSearchRule,
  optionalLimitRule,
  optionalPageRule,
];

const destinationDetailRules = [
  destinationRule,
  query('country').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  optionalCoordinateRule('latitude', -90, 90),
  optionalCoordinateRule('longitude', -180, 180),
  optionalTravelDateRule,
  optionalStartRule('attractionStart'),
  optionalStartRule('restaurantStart'),
  optionalStartRule('hotelStart'),
];

module.exports = {
  countryListRules,
  destinationListRules,
  destinationDetailRules,
};
