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

/**
 * GET / - Retrieves the list of supported currencies.
 * Public endpoint - no authentication required.
 * Returns currency codes and labels for UI selection.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 */
router.get('/', currencyController.getCurrencies);

/**
 * GET /convert - Converts an amount from one currency to another.
 * Requires authentication to track usage and apply rate limits.
 * Applies third-party API rate limiting to protect external service costs.
 * 
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. thirdPartyApiRateLimit - Rate limiting for external API cost protection
 * 3. convertCurrencyRules - Query parameter validation
 * 4. validate - Validation result processing
 * 5. currencyController.convertCurrency - Route handler
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 */
router.get(
  '/convert',
  protect,
  thirdPartyApiRateLimit,
  convertCurrencyRules,
  validate,
  currencyController.convertCurrency
);

module.exports = router;