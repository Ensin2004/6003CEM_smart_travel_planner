const express = require('express');
const { query } = require('express-validator');
const exploreController = require('./explore.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');

const router = express.Router();
const destinationRule = query('destination').trim().isLength({ min: 2 }).withMessage('Destination is required');

router.get('/weather', protect, thirdPartyApiRateLimit, destinationRule, validate, exploreController.getWeather);
router.get('/attractions', protect, thirdPartyApiRateLimit, destinationRule, validate, exploreController.getAttractions);

module.exports = router;
