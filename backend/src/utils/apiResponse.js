/**
 * Api Response module.
 * Exports and local helpers keep related behavior in a single module.
 */

// Sends a standardized success response with status, message, and data payload.
const sendSuccess = (res, statusCode, data, message = 'Success') => {
  res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
};

// Exports the success response helper for use across the application.
module.exports = { sendSuccess };