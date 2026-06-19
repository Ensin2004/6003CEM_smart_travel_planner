/**
 * Map module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const mapController = require('./map.controller');
const validate = require('../../middleware/validate.middleware');
const { protect } = require('../../middleware/auth.middleware');
const { mapWeatherRateLimit, thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');
const {
  geocodeRules,
  mapPlaceDetailsRules,
  mapPlacesRules,
  mapRouteRules,
  mapWeatherRules,
  reverseGeocodeRules,
} = require('./map.validation');

const router = express.Router();

/**
 * GET /places - Searches for places on the map by category and location.
 * Requires authentication and applies rate limiting for API cost protection.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. thirdPartyApiRateLimit - Rate limiting for API cost protection
 * 3. mapPlacesRules - Query parameter validation
 * 4. validate - Validation result processing
 * 5. mapController.getMapPlaces - Route handler
 */
router.get('/places', protect, thirdPartyApiRateLimit, mapPlacesRules, validate, mapController.getMapPlaces);

/**
 * GET /place-details - Retrieves detailed information for a specific place.
 * Supports multiple identifier types (Foursquare, Google, data ID).
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. thirdPartyApiRateLimit - Rate limiting for API cost protection
 * 3. mapPlaceDetailsRules - Query parameter validation
 * 4. validate - Validation result processing
 * 5. mapController.getMapPlaceDetails - Route handler
 */
router.get('/place-details', protect, thirdPartyApiRateLimit, mapPlaceDetailsRules, validate, mapController.getMapPlaceDetails);

/**
 * GET /weather - Retrieves weather information for a map location.
 * Requires authentication and applies weather-specific rate limiting.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. mapWeatherRateLimit - Weather-specific rate limiting
 * 3. mapWeatherRules - Query parameter validation
 * 4. validate - Validation result processing
 * 5. mapController.getMapWeather - Route handler
 */
router.get('/weather', protect, mapWeatherRateLimit, mapWeatherRules, validate, mapController.getMapWeather);

/**
 * GET /geocode - Converts address or place name to coordinates.
 * Requires authentication and applies rate limiting.
 * 
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. thirdPartyApiRateLimit - Rate limiting for API cost protection
 * 3. geocodeRules - Query parameter validation
 * 4. validate - Validation result processing
 * 5. mapController.getGeocodeLocation - Route handler
 */
router.get('/geocode', protect, thirdPartyApiRateLimit, geocodeRules, validate, mapController.getGeocodeLocation);

/**
 * POST /routes - Calculates routes between multiple points.
 * Supports different travel modes (walking, driving, transit).
 * 
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. thirdPartyApiRateLimit - Rate limiting for API cost protection
 * 3. mapRouteRules - Request body validation
 * 4. validate - Validation result processing
 * 5. mapController.getMapRoutes - Route handler
 */
router.post('/routes', protect, thirdPartyApiRateLimit, mapRouteRules, validate, mapController.getMapRoutes);

/**
 * GET /reverse-geocode - Converts coordinates to address and place name.
 * Requires authentication and applies rate limiting.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. thirdPartyApiRateLimit - Rate limiting for API cost protection
 * 3. reverseGeocodeRules - Query parameter validation
 * 4. validate - Validation result processing
 * 5. mapController.getReverseGeocodeLocation - Route handler
 */
router.get('/reverse-geocode', protect, thirdPartyApiRateLimit, reverseGeocodeRules, validate, mapController.getReverseGeocodeLocation);

module.exports = router;