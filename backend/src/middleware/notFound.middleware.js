/**
 * Not Found module.
 * Middleware shapes request flow before controller logic runs.
 */
const AppError = require('../utils/AppError');
const notFound = (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} was not found`, 404));
};
module.exports = notFound;
