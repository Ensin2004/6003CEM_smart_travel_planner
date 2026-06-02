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

router.post('/recommendation', protect, recommendationRules, validate, comparisonController.recommendBestPlace);

module.exports = router;
