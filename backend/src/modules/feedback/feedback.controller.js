/**
 * Feedback module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const logger = require('../../utils/logger');
const { emitFeedbackSubmitted } = require('../notifications/notification.socket');
const notificationService = require('../notifications/notification.service');
const feedbackService = require('./feedback.service');

/**
 * Submit Feedback sends form data after client-side checks pass.
 * Processes user feedback, emits socket event, and notifies admins.
 * 
 * @param {Object} req - Express request object with user info and feedback data in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with submitted feedback
 */
const submitFeedback = catchAsync(async (req, res) => {
  const feedback = await feedbackService.submitFeedback(req.user.id, req.body);
  
  // Notify connected clients via socket about new feedback
  emitFeedbackSubmitted(feedback);
  
  // Send admin notifications about the new feedback
  notificationService
    .notifyAdminsOfNewFeedback(feedback)
    .catch((error) => logger.error(`Failed to notify admins about new feedback: ${error.message}`));
  
  sendSuccess(res, 201, { feedback }, 'Feedback submitted');
});

/**
 * Retrieves feedback entries for admin review.
 * Admins see all feedback; regular users see only their own.
 * 
 * @param {Object} req - Express request object with user info
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with feedback array
 */
const getFeedback = catchAsync(async (req, res) => {
  const feedback = await feedbackService.getFeedback(req.user.role);
  sendSuccess(res, 200, { feedback });
});

module.exports = { submitFeedback, getFeedback };