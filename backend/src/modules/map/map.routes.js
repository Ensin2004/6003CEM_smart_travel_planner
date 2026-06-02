/**
 * Map module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const mapController = require('./map.controller');
const validate = require('../../middleware/validate.middleware');
const { protect } = require('../../middleware/auth.middleware');
const { mapWeatherRateLimit, thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');
const { mapPlaceDetailsRules, mapPlacesRules, mapWeatherRules } = require('./map.validation');

const router = express.Router();
//  route wires  to validation, access checks, and controller logic.
router.get('/places', protect, thirdPartyApiRateLimit, mapPlacesRules, validate, mapController.getMapPlaces);
//  route wires  to validation, access checks, and controller logic.
router.get('/place-details', protect, thirdPartyApiRateLimit, mapPlaceDetailsRules, validate, mapController.getMapPlaceDetails);
//  route wires  to validation, access checks, and controller logic.
router.get('/weather', protect, mapWeatherRateLimit, mapWeatherRules, validate, mapController.getMapWeather);
module.exports = router;
