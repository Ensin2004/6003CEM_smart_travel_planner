/**
 * Feedback module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const feedbackController = require('./feedback.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { submitFeedbackRules } = require('./feedback.validation');

const router = express.Router();

/**
 * POST / - Submits user feedback.
 * Requires authentication to identify the submitting user.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. submitFeedbackRules - Request body validation
 * 3. validate - Validation result processing
 * 4. feedbackController.submitFeedback - Route handler
 */
router.post('/', protect, submitFeedbackRules, validate, feedbackController.submitFeedback);

/**
 * GET / - Retrieves feedback for the user.
 * Admins see all feedback entries; regular users see only their own.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. feedbackController.getFeedback - Route handler
 */
router.get('/', protect, feedbackController.getFeedback);

module.exports = router;