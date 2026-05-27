const express = require('express');
const transportationController = require('./transportation.controller');
const transportationValidation = require('./transportation.validation');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');

const router = express.Router();

router.get(
  '/flights',
  protect,
  thirdPartyApiRateLimit,
  transportationValidation.flightLookupRules,
  validate,
  transportationController.getFlight
);

module.exports = router;
