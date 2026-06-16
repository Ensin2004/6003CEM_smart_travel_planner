/**
 * Role module.
 * Middleware shapes request flow before controller logic runs.
 */
const AppError = require('../utils/AppError');

/**
 * Creates authorization middleware that restricts access to specific user roles.
 * Returns a middleware function that checks if the authenticated user's role
 * is included in the allowed roles list.
 * 
 * @param {...string} roles - List of role names that are permitted to access the route
 * @returns {Function} Express middleware function
 */
const restrictTo = (...roles) => (req, res, next) => {
  // Check if user is authenticated and has a role that matches any of the allowed roles
  if (!req.user || !roles.includes(req.user.role)) {
    // Return 403 Forbidden error if user lacks permission
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  // User has required role - proceed to the next middleware or route handler
  return next();
};

module.exports = { restrictTo };