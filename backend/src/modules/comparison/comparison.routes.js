/**
 * Comparison routes.
 * Route definitions connect endpoint paths with auth, validation, and controller logic.
 */
const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const comparisonController = require('./comparison.controller');
const { recommendationRules } = require('./comparison.validation');

const router = express.Router();

/**
 * POST /recommendation - Generates a recommendation for the best place among compared options.
 * Requires authentication to access the comparison feature.
 * 
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. recommendationRules - Request body validation
 * 3. validate - Validation result processing
 * 4. comparisonController.recommendBestPlace - Route handler
 */
router.post('/recommendation', protect, recommendationRules, validate, comparisonController.recommendBestPlace);

module.exports = router;