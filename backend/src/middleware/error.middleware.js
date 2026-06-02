/**
 * Converts application errors into consistent API responses.
 * Server-side failures are also written to API logs so the admin error screens
 * can show production problems without exposing stack traces to clients.
 */
const env = require('../config/env');
const logger = require('../utils/logger');
const apiLogService = require('../modules/apiLogs/apiLog.service');

// Mongoose cast errors are rewritten into a client-friendly validation message.
const handleCastError = (error) => ({
  statusCode: 400,
  message: `Invalid ${error.path}: ${error.value}`,
});

const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Something went wrong';
  if (error.name === 'CastError') {
    const castError = handleCastError(error);
    statusCode = castError.statusCode;
    message = castError.message;
  }
  if (error.retryAfterSeconds) {
    res.set('Retry-After', String(error.retryAfterSeconds));
  }

  // Only server errors are logged here because ordinary 4xx responses are expected user/API behavior.
  if (statusCode >= 500) {
    apiLogService
      .recordEvent({
        service: 'server',
        category: 'system',
        severity: statusCode >= 503 ? 'critical' : 'error',
        method: req.method,
        endpoint: req.originalUrl,
        status: 'error',
        statusCode,
        message: env.nodeEnv === 'production' ? 'Internal server error' : message,
        userId: req.user?.id,
      })
      .catch((logError) => logger.error(`Failed to record system error: ${logError.message}`));
  }

  // Production hides internal error details, while development keeps stack traces for debugging.
  res.status(statusCode).json({
    status: `${statusCode}`.startsWith('4') ? 'fail' : 'error',
    message: env.nodeEnv === 'production' && statusCode === 500 ? 'Internal server error' : message,
    ...(error.code && { code: error.code }),
    ...(error.email && { email: error.email }),
    ...(error.verificationExpiresAt && { verificationExpiresAt: error.verificationExpiresAt }),
    ...(error.retryAfterSeconds && { retryAfterSeconds: error.retryAfterSeconds }),
    ...(env.nodeEnv === 'development' && { stack: error.stack }),
  });
};

module.exports = errorHandler;
