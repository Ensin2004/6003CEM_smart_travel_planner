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
//  route wires  to validation, access checks, and controller logic.
router.post('/', protect, submitFeedbackRules, validate, feedbackController.submitFeedback);
//  route wires  to validation, access checks, and controller logic.
router.get('/', protect, feedbackController.getFeedback);
module.exports = router;
