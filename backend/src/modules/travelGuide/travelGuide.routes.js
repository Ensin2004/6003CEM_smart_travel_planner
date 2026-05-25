const express = require('express');
const travelGuideController = require('./travelGuide.controller');
const travelGuideValidation = require('./travelGuide.validation');
const { protect } = require('../../middleware/auth.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

router.get(
  '/countries',
  protect,
  thirdPartyApiRateLimit,
  travelGuideValidation.countryListRules,
  validate,
  travelGuideController.getCountries
);

router.get(
  '/destinations',
  protect,
  thirdPartyApiRateLimit,
  travelGuideValidation.destinationListRules,
  validate,
  travelGuideController.getDestinations
);

router.get(
  '/destination',
  protect,
  thirdPartyApiRateLimit,
  travelGuideValidation.destinationDetailRules,
  validate,
  travelGuideController.getDestinationDetails
);

module.exports = router;
