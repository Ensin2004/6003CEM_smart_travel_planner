/**
 * Transportation module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const transportationController = require('./transportation.controller');
const transportationValidation = require('./transportation.validation');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');

const router = express.Router();

// Route section connects URL patterns with validation, authentication, and controller actions.
router.get(
  '/flights',
  protect,
  thirdPartyApiRateLimit,
  transportationValidation.flightLookupRules,
  validate,
  transportationController.getFlight
);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.get(
  ['/trains/station-timetable', '/trains/station_timetable'],
  protect,
  thirdPartyApiRateLimit,
  transportationValidation.trainStationTimetableRules,
  validate,
  transportationController.getTrainStationTimetable
);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.get(
  ['/trains/service-timetable', '/trains/service_timetable'],
  protect,
  thirdPartyApiRateLimit,
  transportationValidation.trainServiceTimetableRules,
  validate,
  transportationController.getTrainServiceTimetable
);
module.exports = router;
