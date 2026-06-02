/**
 * Currency module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const currencyController = require('./currency.controller');
const { protect } = require('../../middleware/auth.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');
const { convertCurrencyRules } = require('./currency.validation');

const router = express.Router();
//  route wires  to validation, access checks, and controller logic.
router.get('/', currencyController.getCurrencies);
//  route wires  to validation, access checks, and controller logic.
router.get('/convert', protect, thirdPartyApiRateLimit, convertCurrencyRules, validate, currencyController.convertCurrency);
module.exports = router;
