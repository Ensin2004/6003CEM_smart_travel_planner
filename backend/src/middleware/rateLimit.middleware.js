/**
 * Defines request throttles for authentication and travel-data endpoints.
 * Each limiter records a log entry when a limit is reached so suspicious usage
 * and overloaded third-party calls can be reviewed from admin tooling.
 */
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const apiLogService = require('../modules/apiLogs/apiLog.service');

// A shared handler keeps rate-limit responses and audit records consistent across limiters.
// Creates a standardized response and logging function for rate limit violations
const rateLimitHandler = (message) => (req, res) => {
  // Log the rate limit violation at warning level for monitoring
  logger.warn(`Rate limit reached for ${req.method} ${req.originalUrl}`);
  
  // Record the rate limit event to API logs for admin review and suspicious activity detection
  apiLogService
    .recordEvent({
      service: 'rate-limit',
      category: 'rate-limit',
      severity: 'warning',
      method: req.method,
      endpoint: req.originalUrl,
      status: 'fail',
      statusCode: 429,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      requestId: req.requestId,
      message,
      userId: req.user?.id,
      attemptedEmail: req.originalUrl.includes('/auth/login') ? req.body?.email : undefined, // Capture login attempts for security auditing
    })
    .catch((error) => logger.error(`Failed to record rate-limit event: ${error.message}`));

  // Send standardized 429 Too Many Requests response to the client
  res.status(429).json({
    status: 'fail',
    code: 'RATE_LIMIT_EXCEEDED',
    message,
    requestId: req.requestId,
  });
};

// Authentication routes get a dedicated limit because repeated login attempts are more sensitive.
// Limits authentication endpoints (login, register, password reset) to prevent brute force attacks
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute time window
  max: 100, // Maximum 100 requests per window per IP
  standardHeaders: true, // Send RateLimit headers compliant with RFC 6585
  legacyHeaders: false, // Disable deprecated X-RateLimit headers
  handler: rateLimitHandler('Too many authentication requests. Please try again later.'),
});

// Search and guide endpoints use a broader limit to protect paid or quota-based travel APIs.
// Limits API endpoints that consume external services with usage costs or quotas
const thirdPartyApiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many travel data requests. Please try again later.'),
});

// Travel guide browsing can make several guide, country, and destination requests in quick succession.
// More generous limit for read-only guide content that doesn't consume external APIs
const travelGuideRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many travel guide requests. Please wait a moment and try again.'),
});

// Weather and map calls have a separate ceiling because those screens can trigger repeated lookups.
// Moderate limit for weather and mapping services that have their own usage constraints
const mapWeatherRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many weather requests. Please try again later.'),
});

module.exports = { authRateLimit, mapWeatherRateLimit, thirdPartyApiRateLimit, travelGuideRateLimit };