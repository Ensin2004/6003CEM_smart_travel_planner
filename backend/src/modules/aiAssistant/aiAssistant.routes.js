/**
 * AI Assistant module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const aiAssistantController = require('./aiAssistant.controller');
const { chatRules, tripRecommendationRules } = require('./aiAssistant.validation');
const { protect } = require('../../middleware/auth.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

router.post('/chat', protect, thirdPartyApiRateLimit, chatRules, validate, aiAssistantController.chat);
router.post(
  '/trip-recommendations',
  protect,
  thirdPartyApiRateLimit,
  tripRecommendationRules,
  validate,
  aiAssistantController.getTripRecommendations
);

module.exports = router;
