const express = require('express');
const { query } = require('express-validator');
const exploreController = require('./explore.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();
const destinationRule = query('destination').trim().isLength({ min: 2 }).withMessage('Destination is required');

router.get('/weather', protect, destinationRule, validate, exploreController.getWeather);
router.get('/attractions', protect, destinationRule, validate, exploreController.getAttractions);

module.exports = router;
