/**
 * AI Assistant module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const aiAssistantController = require('./aiAssistant.controller');
const { chatRules, tripRecommendationRules, weatherPlaceRankingRules } = require('./aiAssistant.validation');
const { protect } = require('../../middleware/auth.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

/**
 * POST /chat - AI-powered travel chat assistant endpoint.
 * Processes user messages and returns AI-generated responses.
 * Requires authentication and applies rate limiting for third-party API protection.
 * 
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. thirdPartyApiRateLimit - Rate limiting for API cost protection
 * 3. chatRules - Request body validation
 * 4. validate - Validation result processing
 * 5. aiAssistantController.chat - Route handler
 */
router.post('/chat', protect, thirdPartyApiRateLimit, chatRules, validate, aiAssistantController.chat);

/**
 * POST /trip-recommendations - AI-powered trip planning recommendation endpoint.
 * Generates personalized trip recommendations based on user input and context.
 * Requires authentication and applies rate limiting for API cost protection.
 * 
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. thirdPartyApiRateLimit - Rate limiting for API cost protection
 * 3. tripRecommendationRules - Request body validation
 * 4. validate - Validation result processing
 * 5. aiAssistantController.getTripRecommendations - Route handler
 */
router.post(
  '/trip-recommendations',
  protect,
  thirdPartyApiRateLimit,
  tripRecommendationRules,
  validate,
  aiAssistantController.getTripRecommendations
);

router.post(
  '/weather-place-ranking',
  protect,
  thirdPartyApiRateLimit,
  weatherPlaceRankingRules,
  validate,
  aiAssistantController.rankWeatherPlaces
);

module.exports = router;
