/**
 * Feedback module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const { emitFeedbackSubmitted } = require('../notifications/notification.socket');
const feedbackService = require('./feedback.service');
// Submit Feedback sends form data after client-side checks pass.
const submitFeedback = catchAsync(async (req, res) => {
  const feedback = await feedbackService.submitFeedback(req.user.id, req.body);
  emitFeedbackSubmitted(feedback);
  sendSuccess(res, 201, { feedback }, 'Feedback submitted');
});
const getFeedback = catchAsync(async (req, res) => {
  const feedback = await feedbackService.getFeedback(req.user.role);
  sendSuccess(res, 200, { feedback });
});
module.exports = { submitFeedback, getFeedback };
