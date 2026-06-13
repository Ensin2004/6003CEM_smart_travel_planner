/**
 * Explore module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const exploreController = require('./explore.controller');
const {
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
} = require('./explore.validation');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');

const router = express.Router();

router.get('/image', placeImageRules, validate, exploreController.getPlaceImage);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.get(
  '/weather',
  protect,
  thirdPartyApiRateLimit,
  weatherRules,
  validate,
  exploreController.getWeather
);
//  route wires  to validation, access checks, and controller logic.
router.get('/attractions', protect, thirdPartyApiRateLimit, attractionRules, validate, exploreController.getAttractions);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.get(
  '/attractions/detail',
  protect,
  thirdPartyApiRateLimit,
  attractionDetailRules,
  validate,
  exploreController.getAttractionDetail
);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.get(
  '/hotels/detail',
  protect,
  thirdPartyApiRateLimit,
  hotelDetailRules,
  validate,
  exploreController.getHotelDetail
);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.get(
  '/hotels',
  protect,
  thirdPartyApiRateLimit,
  hotelRules,
  validate,
  exploreController.getHotels
);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.get(
  '/restaurants/detail',
  protect,
  thirdPartyApiRateLimit,
  restaurantDetailRules,
  validate,
  exploreController.getRestaurantDetail
);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.get(
  '/restaurants',
  protect,
  thirdPartyApiRateLimit,
  restaurantRules,
  validate,
  exploreController.getRestaurants
);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.get(
  '/reviews',
  protect,
  thirdPartyApiRateLimit,
  placeReviewRules,
  validate,
  exploreController.getPlaceReviews
);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.post(
  '/ai-recommendations',
  protect,
  thirdPartyApiRateLimit,
  aiRecommendationRules,
  validate,
  exploreController.getAiRecommendations
);
module.exports = router;
