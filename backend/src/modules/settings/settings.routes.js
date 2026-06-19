/**
 * Settings module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const settingsController = require('./settings.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { updateContentRules } = require('./settings.validation');

const router = express.Router();

/**
 * GET /content - Retrieves the current settings content.
 * Requires authentication to access settings.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. settingsController.getContent - Route handler
 */
router.get('/content', protect, settingsController.getContent);

/**
 * PUT /content - Updates the settings content.
 * Requires authentication and admin role validation.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. updateContentRules - Request body validation
 * 3. validate - Validation result processing
 * 4. settingsController.updateContent - Route handler
 */
router.put('/content', protect, updateContentRules, validate, settingsController.updateContent);

module.exports = router;