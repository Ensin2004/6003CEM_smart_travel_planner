const express = require('express');
const { body, query } = require('express-validator');
const exploreController = require('./explore.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');

const router = express.Router();
const destinationRule = query('destination').trim().isLength({ min: 2 }).withMessage('Destination is required');
const optionalDestinationRule = query('destination').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 120 });
const optionalFilterRule = (field) => query(field).optional({ checkFalsy: true }).trim().isLength({ max: 80 });
const optionalTravelDateRule = query('date')
  .optional({ checkFalsy: true })
  .isISO8601({ strict: true, strictSeparator: true })
  .withMessage('Travel date must use YYYY-MM-DD format')
  .bail()
  .custom((value) => {
    const today = new Date(new Date().toISOString().slice(0, 10));
    const requestedDate = new Date(value);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 214);

    if (requestedDate < today) {
      throw new Error('Travel date cannot be in the past.');
    }

    if (requestedDate > maxDate) {
      throw new Error('Travel date can be up to about 7 months ahead.');
    }

    return true;
  });
const optionalCoordinateRule = (field, min, max) =>
  query(field).optional({ checkFalsy: true }).isFloat({ min, max }).withMessage(`${field} must be a valid coordinate`);
const requireAnySearchValue = (fields, message) =>
  query().custom((_, { req }) => {
    const hasSearchValue = fields.some((field) => Boolean(req.query[field]?.trim()));

    if (!hasSearchValue) {
      throw new Error(message);
    }

    return true;
  });
const hotelSearchRule = requireAnySearchValue(
  ['destination', 'country', 'state', 'roomType'],
  'Enter a hotel name, country, location, or room type first.'
);
const hotelDetailRule = requireAnySearchValue(
  ['name', 'dataId', 'placeId'],
  'Hotel name or Google identifier is required.'
);
const restaurantSearchRule = requireAnySearchValue(
  ['destination', 'country', 'state', 'foodCategory'],
  'Enter a restaurant name, country, location, or food category first.'
);
const restaurantDetailRule = requireAnySearchValue(
  ['name', 'dataId', 'placeId'],
  'Restaurant name or Google identifier is required.'
);
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

router.get(
  '/weather',
  protect,
  thirdPartyApiRateLimit,
  destinationRule,
  optionalTravelDateRule,
  optionalCoordinateRule('latitude', -90, 90),
  optionalCoordinateRule('longitude', -180, 180),
  optionalFilterRule('locationLabel'),
  validate,
  exploreController.getWeather
);
router.get('/attractions', protect, thirdPartyApiRateLimit, destinationRule, validate, exploreController.getAttractions);
router.get(
  '/hotels/detail',
  protect,
  thirdPartyApiRateLimit,
  optionalFilterRule('name'),
  query('address').optional({ checkFalsy: true }).trim().isLength({ max: 220 }),
  query('dataId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  query('placeId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  hotelDetailRule,
  validate,
  exploreController.getHotelDetail
);
router.get(
  '/hotels',
  protect,
  thirdPartyApiRateLimit,
  optionalDestinationRule,
  optionalFilterRule('country'),
  optionalFilterRule('state'),
  optionalFilterRule('roomType'),
  query('start').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Start must be a positive number'),
  hotelSearchRule,
  validate,
  exploreController.getHotels
);
router.get(
  '/restaurants/detail',
  protect,
  thirdPartyApiRateLimit,
  optionalFilterRule('name'),
  query('address').optional({ checkFalsy: true }).trim().isLength({ max: 220 }),
  query('dataId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  query('placeId').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  restaurantDetailRule,
  validate,
  exploreController.getRestaurantDetail
);
router.get(
  '/restaurants',
  protect,
  thirdPartyApiRateLimit,
  optionalDestinationRule,
  optionalFilterRule('country'),
  optionalFilterRule('state'),
  optionalFilterRule('foodCategory'),
  query('start').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Start must be a positive number'),
  restaurantSearchRule,
  validate,
  exploreController.getRestaurants
);
router.post(
  '/ai-recommendations',
  protect,
  thirdPartyApiRateLimit,
  aiRecommendationRules,
  validate,
  exploreController.getAiRecommendations
);

module.exports = router;
