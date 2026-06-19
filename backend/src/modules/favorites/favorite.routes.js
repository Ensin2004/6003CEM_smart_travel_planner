/**
 * Favorites module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const favoriteController = require('./favorite.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { addFavoriteRules, favoriteIdRule } = require('./favorite.validation');

const router = express.Router();

/**
 * GET / - Retrieves all favorites for the authenticated user.
 * No validation required - only authentication is needed.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. favoriteController.listFavorites - Route handler
 */
router.get('/', protect, favoriteController.listFavorites);

/**
 * POST / - Adds a new favorite for the authenticated user.
 * Validates request body before creating the favorite.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. addFavoriteRules - Request body validation
 * 3. validate - Validation result processing
 * 4. favoriteController.addFavorite - Route handler
 */
router.post('/', protect, addFavoriteRules, validate, favoriteController.addFavorite);

/**
 * DELETE /:id - Removes a favorite by ID.
 * Validates the ID parameter and verifies ownership.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. favoriteIdRule - URL parameter validation (MongoDB ObjectId)
 * 3. validate - Validation result processing
 * 4. favoriteController.removeFavorite - Route handler
 */
router.delete('/:id', protect, favoriteIdRule, validate, favoriteController.removeFavorite);

module.exports = router;