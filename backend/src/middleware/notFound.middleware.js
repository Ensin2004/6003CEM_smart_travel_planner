/**
 * Not Found module.
 * Middleware shapes request flow before controller logic runs.
 */
const AppError = require('../utils/AppError');

/**
 * Express middleware that handles unmatched routes.
 * Creates and passes a 404 Not Found error to Express error handling middleware.
 * This should be mounted after all valid route definitions.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function (error handler)
 * @returns {void} - Passes error to next middleware
 */
const notFound = (req, res, next) => {
  // Create a new AppError with the requested URL in the message
  // and 404 status code for resources that don't exist
  next(new AppError(`Route ${req.originalUrl} was not found`, 404));
};

module.exports = notFound;