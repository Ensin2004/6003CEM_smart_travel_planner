const express = require('express');
const currencyController = require('./currency.controller');
const { protect } = require('../../middleware/auth.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');
const { convertCurrencyRules } = require('./currency.validation');

const router = express.Router();

router.get('/', currencyController.getCurrencies);
router.get('/convert', protect, thirdPartyApiRateLimit, convertCurrencyRules, validate, currencyController.convertCurrency);

module.exports = router;
