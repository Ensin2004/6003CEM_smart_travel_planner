/**
 * Catch Async module.
 * Exports and local helpers keep related behavior in a single module.
 */

// Wraps async route handlers to catch errors and pass them to Express error middleware.
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Exports the wrapper function for use in route controllers.
module.exports = catchAsync;