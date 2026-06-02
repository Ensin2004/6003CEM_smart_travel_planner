const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const apiLogService = require('../modules/apiLogs/apiLog.service');

const rateLimitHandler = (message) => (req, res) => {
  logger.warn(`Rate limit reached for ${req.method} ${req.originalUrl}`);
  apiLogService
    .recordEvent({
      service: 'rate-limit',
      category: 'rate-limit',
      severity: 'warning',
      method: req.method,
      endpoint: req.originalUrl,
      status: 'fail',
      statusCode: 429,
      message,
      userId: req.user?.id,
      attemptedEmail: req.originalUrl.includes('/auth/login') ? req.body?.email : undefined,
    })
    .catch((error) => logger.error(`Failed to record rate-limit event: ${error.message}`));

  res.status(429).json({
    status: 'fail',
    message,
  });
};

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many authentication requests. Please try again later.'),
});

const thirdPartyApiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many travel data requests. Please try again later.'),
});

const mapWeatherRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many weather requests. Please try again later.'),
});

module.exports = { authRateLimit, mapWeatherRateLimit, thirdPartyApiRateLimit };
