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

/**
 * GET /flights - Searches for flights by airline and route.
 * Requires authentication and applies rate limiting for API cost protection.
 * 
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. thirdPartyApiRateLimit - Rate limiting for API cost protection
 * 3. flightLookupRules - Query parameter validation
 * 4. validate - Validation result processing
 * 5. transportationController.getFlight - Route handler
 */
router.get(
  '/flights',
  protect,
  thirdPartyApiRateLimit,
  transportationValidation.flightLookupRules,
  validate,
  transportationController.getFlight
);

// Route section connects URL patterns with validation, authentication, and controller actions.

/**
 * GET /trains/station-timetable or /trains/station_timetable - Retrieves train timetable for a station.
 * Supports both hyphen and underscore naming for API compatibility.
 * Requires authentication and applies rate limiting.
 * 
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. thirdPartyApiRateLimit - Rate limiting for API cost protection
 * 3. trainStationTimetableRules - Query parameter validation
 * 4. validate - Validation result processing
 * 5. transportationController.getTrainStationTimetable - Route handler
 */
router.get(
  ['/trains/station-timetable', '/trains/station_timetable'],
  protect,
  thirdPartyApiRateLimit,
  transportationValidation.trainStationTimetableRules,
  validate,
  transportationController.getTrainStationTimetable
);

// Route section connects URL patterns with validation, authentication, and controller actions.

/**
 * GET /trains/service-timetable or /trains/service_timetable - Retrieves detailed timetable for a specific train service.
 * Includes calling points and stop details.
 * Supports both hyphen and underscore naming for API compatibility.
 * Requires authentication and applies rate limiting.
 * 
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. thirdPartyApiRateLimit - Rate limiting for API cost protection
 * 3. trainServiceTimetableRules - Query parameter validation
 * 4. validate - Validation result processing
 * 5. transportationController.getTrainServiceTimetable - Route handler
 */
router.get(
  ['/trains/service-timetable', '/trains/service_timetable'],
  protect,
  thirdPartyApiRateLimit,
  transportationValidation.trainServiceTimetableRules,
  validate,
  transportationController.getTrainServiceTimetable
);

module.exports = router;