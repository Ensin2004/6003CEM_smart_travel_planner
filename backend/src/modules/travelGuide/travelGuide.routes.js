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

/**
 * GET /countries
 * Retrieves a list of countries with optional filters.
 * Protected route - requires authentication.
 * Rate limited to prevent abuse.
 */
router.get(
  '/countries',
  protect, // Authentication middleware
  travelGuideRateLimit, // Rate limiting middleware
  travelGuideValidation.countryListRules, // Validation rules for request
  validate, // Execute validation
  travelGuideController.getCountries // Controller handler
);

/**
 * GET /destinations
 * Retrieves a list of travel destinations with optional filters.
 * Protected route - requires authentication.
 * Rate limited to prevent abuse.
 */
router.get(
  '/destinations',
  protect, // Authentication middleware
  travelGuideRateLimit, // Rate limiting middleware
  travelGuideValidation.destinationListRules, // Validation rules for request
  validate, // Execute validation
  travelGuideController.getDestinations // Controller handler
);

/**
 * GET /destination
 * Retrieves detailed information about a specific destination.
 * Protected route - requires authentication.
 * Rate limited to prevent abuse.
 */
router.get(
  '/destination',
  protect, // Authentication middleware
  travelGuideRateLimit, // Rate limiting middleware
  travelGuideValidation.destinationDetailRules, // Validation rules for request
  validate, // Execute validation
  travelGuideController.getDestinationDetails // Controller handler
);

// Export the router for use in main application
module.exports = router;