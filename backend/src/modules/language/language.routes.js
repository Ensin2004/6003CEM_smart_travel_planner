/**
 * Language module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const languageController = require('./language.controller');
const { protect } = require('../../middleware/auth.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');
const { historyIdRules, historyQueryRules, translateRules } = require('./language.validation');

const router = express.Router();

/**
 * GET /languages - Retrieves all supported languages.
 * Returns language codes and display names for UI selection.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. languageController.getLanguages - Route handler
 */
router.get('/languages', protect, languageController.getLanguages);

/**
 * GET /history - Retrieves translation history for the authenticated user.
 * Supports pagination and search via query parameters.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. historyQueryRules - Query parameter validation
 * 3. validate - Validation result processing
 * 4. languageController.getHistory - Route handler
 */
router.get('/history', protect, historyQueryRules, validate, languageController.getHistory);

/**
 * POST /translate - Translates text between languages.
 * Requires authentication and applies rate limiting for API cost protection.
 * Records translation in user history.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. thirdPartyApiRateLimit - Rate limiting for API cost protection
 * 3. translateRules - Request body validation
 * 4. validate - Validation result processing
 * 5. languageController.translateText - Route handler
 */
router.post('/translate', protect, thirdPartyApiRateLimit, translateRules, validate, languageController.translateText);

/**
 * DELETE /history/:id - Deletes a translation history entry.
 * Verifies ownership before deletion.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. historyIdRules - URL parameter validation (MongoDB ObjectId)
 * 3. validate - Validation result processing
 * 4. languageController.deleteHistory - Route handler
 */
router.delete('/history/:id', protect, historyIdRules, validate, languageController.deleteHistory);

module.exports = router;