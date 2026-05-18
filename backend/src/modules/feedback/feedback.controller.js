const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const feedbackService = require('./feedback.service');

const submitFeedback = catchAsync(async (req, res) => {
  const feedback = await feedbackService.submitFeedback(req.user.id, req.body);
  sendSuccess(res, 201, { feedback }, 'Feedback submitted');
});

const getFeedback = catchAsync(async (req, res) => {
  const feedback = await feedbackService.getFeedback(req.user.role);
  sendSuccess(res, 200, { feedback });
});

module.exports = { submitFeedback, getFeedback };
