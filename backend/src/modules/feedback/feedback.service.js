/**
 * Feedback module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const AppError = require('../../utils/AppError');
const feedbackRepository = require('./feedback.repository');
const userRepository = require('../users/user.repository');

/**
 * Submit Feedback sends form data after client-side checks pass.
 * Creates a new feedback entry with user details denormalized from the user record.
 * 
 * @param {string} userId - ID of the user submitting feedback
 * @param {Object} data - Feedback data containing rating and optional message
 * @returns {Promise<Object>} Created feedback document
 * @throws {AppError} If user is not found
 */
const submitFeedback = async (userId, data) => {
  // Verify user exists before creating feedback
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  // Create feedback entry with denormalized user details
  return feedbackRepository.create({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    rating: data.rating,
    feedback: data.feedback,
  });
};

/**
 * Retrieves all feedback entries.
 * Restricted to admin users only.
 * 
 * @param {string} role - User's role from authentication
 * @returns {Promise<Array>} Array of feedback documents
 * @throws {AppError} If user is not an admin
 */
const getFeedback = (role) => {
  // Verify admin role
  if (role !== 'admin') {
    throw new AppError('Administrator access is required', 403);
  }

  // Return all feedback entries (newest first)
  return feedbackRepository.findAll();
};

module.exports = { submitFeedback, getFeedback };