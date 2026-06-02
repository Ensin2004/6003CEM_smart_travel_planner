/**
 * Travel Guide module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const travelGuideController = require('./travelGuide.controller');
const travelGuideValidation = require('./travelGuide.validation');
const { protect } = require('../../middleware/auth.middleware');
const { travelGuideRateLimit } = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

// Route section connects URL patterns with validation, authentication, and controller actions.
router.get(
  '/countries',
  protect,
  travelGuideRateLimit,
  travelGuideValidation.countryListRules,
  validate,
  travelGuideController.getCountries
);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.get(
  '/destinations',
  protect,
  travelGuideRateLimit,
  travelGuideValidation.destinationListRules,
  validate,
  travelGuideController.getDestinations
);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.get(
  '/destination',
  protect,
  travelGuideRateLimit,
  travelGuideValidation.destinationDetailRules,
  validate,
  travelGuideController.getDestinationDetails
);
module.exports = router;
