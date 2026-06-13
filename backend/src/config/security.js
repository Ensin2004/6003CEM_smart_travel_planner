/**
 * Central security-header policy for API and documentation responses.
 */
const helmet = require('helmet');

const env = require('./env');

const isProduction = env.nodeEnv === 'production';

const apiHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'no-referrer' },
  strictTransportSecurity: isProduction
    ? {
        maxAge: 31536000,
        includeSubDomains: true,
      }
    : false,
});

const swaggerHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'no-referrer' },
  strictTransportSecurity: isProduction
    ? {
        maxAge: 31536000,
        includeSubDomains: true,
      }
    : false,
});

const securityHeaders = (req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), geolocation=(), microphone=(), payment=(), usb=()'
  );

  const isSwaggerRequest = req.path === '/api-docs' || req.path.startsWith('/api-docs/');
  const middleware = isSwaggerRequest ? swaggerHelmet : apiHelmet;

  return middleware(req, res, next);
};

module.exports = securityHeaders;
