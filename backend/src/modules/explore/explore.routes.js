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

/**
 * GET /image - Proxies Google Place images.
 * Public endpoint - no authentication required for images.
 * 
 * Middleware chain:
 * 1. placeImageRules - Query parameter validation
 * 2. validate - Validation result processing
 * 3. exploreController.getPlaceImage - Route handler (streams image)
 */
router.get('/image', placeImageRules, validate, exploreController.getPlaceImage);

// Route section connects URL patterns with validation, authentication, and controller actions.

/**
 * GET /weather - Retrieves weather for a destination.
 * Requires authentication and applies third-party API rate limiting.
 * 
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. thirdPartyApiRateLimit - Rate limiting for API cost protection
 * 3. weatherRules - Query parameter validation
 * 4. validate - Validation result processing
 * 5. exploreController.getWeather - Route handler
 */
router.get(
  '/weather',
  protect,
  thirdPartyApiRateLimit,
  weatherRules,
  validate,
  exploreController.getWeather
);

/**
 * GET /attractions - Retrieves attractions for a destination.
 * route wires endpoint to validation, access checks, and controller logic.
 */
router.get('/attractions', protect, thirdPartyApiRateLimit, attractionRules, validate, exploreController.getAttractions);

// Route section connects URL patterns with validation, authentication, and controller actions.

/**
 * GET /attractions/detail - Retrieves detailed information for a specific attraction.
 * route wires endpoint to validation, access checks, and controller logic.
 */
router.get(
  '/attractions/detail',
  protect,
  thirdPartyApiRateLimit,
  attractionDetailRules,
  validate,
  exploreController.getAttractionDetail
);

// Route section connects URL patterns with validation, authentication, and controller actions.

/**
 * GET /hotels/detail - Retrieves detailed information for a specific hotel.
 * route wires endpoint to validation, access checks, and controller logic.
 */
router.get(
  '/hotels/detail',
  protect,
  thirdPartyApiRateLimit,
  hotelDetailRules,
  validate,
  exploreController.getHotelDetail
);

// Route section connects URL patterns with validation, authentication, and controller actions.

/**
 * GET /hotels - Retrieves hotels for a destination.
 * route wires endpoint to validation, access checks, and controller logic.
 */
router.get(
  '/hotels',
  protect,
  thirdPartyApiRateLimit,
  hotelRules,
  validate,
  exploreController.getHotels
);

// Route section connects URL patterns with validation, authentication, and controller actions.

/**
 * GET /restaurants/detail - Retrieves detailed information for a specific restaurant.
 * route wires endpoint to validation, access checks, and controller logic.
 */
router.get(
  '/restaurants/detail',
  protect,
  thirdPartyApiRateLimit,
  restaurantDetailRules,
  validate,
  exploreController.getRestaurantDetail
);

// Route section connects URL patterns with validation, authentication, and controller actions.

/**
 * GET /restaurants - Retrieves restaurants for a destination.
 * route wires endpoint to validation, access checks, and controller logic.
 */
router.get(
  '/restaurants',
  protect,
  thirdPartyApiRateLimit,
  restaurantRules,
  validate,
  exploreController.getRestaurants
);

// Route section connects URL patterns with validation, authentication, and controller actions.

/**
 * GET /reviews - Retrieves reviews for a specific place.
 * route wires endpoint to validation, access checks, and controller logic.
 */
router.get(
  '/reviews',
  protect,
  thirdPartyApiRateLimit,
  placeReviewRules,
  validate,
  exploreController.getPlaceReviews
);

// Route section connects URL patterns with validation, authentication, and controller actions.

/**
 * POST /ai-recommendations - Generates AI-powered recommendations.
 * route wires endpoint to validation, access checks, and controller logic.
 */
router.post(
  '/ai-recommendations',
  protect,
  thirdPartyApiRateLimit,
  aiRecommendationRules,
  validate,
  exploreController.getAiRecommendations
);

module.exports = router;