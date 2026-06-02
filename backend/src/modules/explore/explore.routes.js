const express = require('express');
const exploreController = require('./explore.controller');
const {
  aiRecommendationRules,
  attractionRules,
  hotelRules,
  restaurantRules,
  weatherRules,
} = require('./explore.validation');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');

const router = express.Router();

router.get(
  '/weather',
  protect,
  thirdPartyApiRateLimit,
  weatherRules,
  validate,
  exploreController.getWeather
);
router.get('/attractions', protect, thirdPartyApiRateLimit, attractionRules, validate, exploreController.getAttractions);
router.get(
  '/hotels',
  protect,
  thirdPartyApiRateLimit,
  hotelRules,
  validate,
  exploreController.getHotels
);
router.get(
  '/restaurants',
  protect,
  thirdPartyApiRateLimit,
  restaurantRules,
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
