const express = require('express');
const feedbackController = require('./feedback.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { submitFeedbackRules } = require('./feedback.validation');

const router = express.Router();

router.post('/', protect, submitFeedbackRules, validate, feedbackController.submitFeedback);
router.get('/', protect, feedbackController.getFeedback);

module.exports = router;
