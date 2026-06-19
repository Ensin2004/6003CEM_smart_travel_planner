/**
 * Converts application errors into consistent API responses.
 * Server-side failures are also written to API logs so the admin error screens
 * can show production problems without exposing stack traces to clients.
 */
const env = require('../config/env');
const logger = require('../utils/logger');
const apiLogService = require('../modules/apiLogs/apiLog.service');

// Mongoose cast errors are rewritten into a client-friendly validation message.
// Transforms database casting errors (e.g., invalid ObjectId) into a standardized format
const handleCastError = (error) => ({
  statusCode: 400,
  code: 'INVALID_PARAMETER',
  message: `Invalid ${error.path}: ${error.value}`,
});

// Mapping of HTTP status codes to standardized error codes for client-side handling
const statusCodes = {
  400: 'BAD_REQUEST',
  401: 'AUTHENTICATION_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMIT_EXCEEDED',
};

/**
 * Express error handling middleware.
 * Converts all error types into consistent JSON responses with appropriate HTTP status codes.
 * 
 * @param {Error} error - The error object from Express or thrown in application code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function (unused but required for Express)
 */
const errorHandler = (error, req, res, next) => {
  // Initialize error response properties with defaults or error-provided values
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Something went wrong';
  let code =
    error.code ||
    statusCodes[statusCode] ||
    (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED');

  // Handle MongoDB cast errors (invalid data types in database queries)
  if (error.name === 'CastError') {
    const castError = handleCastError(error);
    statusCode = castError.statusCode;
    code = castError.code;
    message = castError.message;
  }
  
  // Set Retry-After header for rate limiting or temporary failures
  if (error.retryAfterSeconds) {
    res.set('Retry-After', String(error.retryAfterSeconds));
  }

  // Only server errors are logged here because ordinary 4xx responses are expected user/API behavior.
  // Records system errors to API logs for monitoring and debugging
  if (statusCode >= 500) {
    apiLogService
      .recordEvent({
        service: 'server',
        category: 'system',
        severity: statusCode >= 503 ? 'critical' : 'error', // Critical for service unavailable (503) or higher
        method: req.method,
        endpoint: req.originalUrl,
        status: 'error',
        statusCode,
        errorCode: code,
        requestId: req.requestId,
        message: env.nodeEnv === 'production' ? 'Internal server error' : message, // Hide details in production
        userId: req.user?.id,
      })
      .catch((logError) => logger.error(`Failed to record system error: ${logError.message}`));
  }

  // Production hides internal error details, while development keeps stack traces for debugging.
  // Construct the error response object with environment-appropriate detail levels
  res.status(statusCode).json({
    status: `${statusCode}`.startsWith('4') ? 'fail' : 'error',
    // In production, replace detailed messages with generic ones for 500 errors
    message: env.nodeEnv === 'production' && statusCode === 500 ? 'Internal server error' : message,
    code: env.nodeEnv === 'production' && statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : code,
    requestId: req.requestId, // Include request ID for tracking and debugging
    // Include validation errors only for client errors or in development
    ...(error.errors && (statusCode < 500 || env.nodeEnv === 'development') && { errors: error.errors }),
    ...(error.details && (statusCode < 500 || env.nodeEnv === 'development') && { details: error.details }),
    // Additional error context fields that may be present
    ...(error.email && { email: error.email }),
    ...(error.verificationExpiresAt && { verificationExpiresAt: error.verificationExpiresAt }),
    ...(error.retryAfterSeconds && { retryAfterSeconds: error.retryAfterSeconds }),
    // Stack trace only in development environment
    ...(env.nodeEnv === 'development' && { stack: error.stack }),
  });
};

module.exports = errorHandler;