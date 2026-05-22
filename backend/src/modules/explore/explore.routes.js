const express = require('express');
const { query } = require('express-validator');
const exploreController = require('./explore.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');

const router = express.Router();
const destinationRule = query('destination').trim().isLength({ min: 2 }).withMessage('Destination is required');
const optionalDestinationRule = query('destination').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 120 });
const optionalFilterRule = (field) => query(field).optional({ checkFalsy: true }).trim().isLength({ max: 80 });
const hotelSearchRule = query().custom((_, { req }) => {
  const hasSearchValue = ['destination', 'country', 'state', 'roomType'].some((field) => Boolean(req.query[field]?.trim()));

  if (!hasSearchValue) {
    throw new Error('Enter a hotel name, country, location, or room type first.');
  }

  return true;
});
const restaurantSearchRule = query().custom((_, { req }) => {
  const hasSearchValue = ['destination', 'country', 'state', 'foodCategory'].some((field) => Boolean(req.query[field]?.trim()));

  if (!hasSearchValue) {
    throw new Error('Enter a restaurant name, country, location, or food category first.');
  }

  return true;
});

router.get('/weather', protect, thirdPartyApiRateLimit, destinationRule, validate, exploreController.getWeather);
router.get('/attractions', protect, thirdPartyApiRateLimit, destinationRule, validate, exploreController.getAttractions);
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

module.exports = router;
