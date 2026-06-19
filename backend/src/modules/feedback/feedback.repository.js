/**
 * Feedback module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const Feedback = require('./feedback.model');

/**
 * Creates a new feedback document.
 * @param {Object} data - Feedback data (userId, userName, userEmail, rating, feedback)
 * @returns {Promise<Object>} Created feedback document
 */
const create = (data) => Feedback.create(data);

/**
 * Retrieves all feedback entries sorted by creation date (newest first).
 * Used by admin users to review all submitted feedback.
 * 
 * @returns {Promise<Array>} Array of feedback documents
 */
const findAll = () => Feedback.find().sort({ createdAt: -1 });

module.exports = { create, findAll };