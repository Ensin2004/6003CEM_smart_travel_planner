/**
 * Central security-header policy for API and documentation responses.
 * Applies different Content Security Policy (CSP) rules for API endpoints
 * versus Swagger documentation pages to balance security and functionality.
 */
const helmet = require('helmet');

const env = require('./env');

// Determine if running in production environment for HSTS enforcement
const isProduction = env.nodeEnv === 'production';

// Strict security policy for API endpoints - minimal permissions
const apiHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"], // Block all resources by default
      baseUri: ["'none'"], // Prevent base URI manipulation
      formAction: ["'none'"], // Disallow form submissions
      frameAnchors: ["'none'"], // Prevent framing of the API
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' }, // Restrict cross-origin resource sharing
  referrerPolicy: { policy: 'no-referrer' }, // Omit referrer information
  strictTransportSecurity: isProduction
    ? {
        maxAge: 31536000, // Enforce HTTPS for one year (in seconds)
        includeSubDomains: true, // Apply HSTS to all subdomains
      }
    : false, // Disable HSTS in development for local testing
});

// Relaxed security policy for Swagger documentation - permits UI resources
const swaggerHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], // Allow same-origin resources
      baseUri: ["'self'"], // Allow same-origin base URI
      connectSrc: ["'self'"], // Allow API requests to same origin
      fontSrc: ["'self'", 'data:'], // Allow fonts from same origin and inline data
      formAction: ["'self'"], // Allow same-origin form submissions
      frameAnchors: ["'none'"], // Prevent framing for security
      imgSrc: ["'self'", 'data:'], // Allow images from same origin and inline data
      objectSrc: ["'none'"], // Block plugins and embedded objects
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow scripts and inline JS for Swagger UI
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow styles and inline CSS for Swagger UI
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

/**
 * Security headers middleware that applies appropriate helmet configuration
 * based on whether the request targets the Swagger documentation endpoint.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next middleware function
 * @returns {Function} - Appropriate helmet middleware for the request type
 */
const securityHeaders = (req, res, next) => {
  // Set Permissions-Policy header to disable potentially intrusive browser features
  res.setHeader(
    'Permissions-Policy',
    'camera=(), geolocation=(), microphone=(), payment=(), usb=()'
  );

  // Determine if the request is for Swagger documentation pages
  const isSwaggerRequest = req.path === '/api-docs' || req.path.startsWith('/api-docs/');
  const middleware = isSwaggerRequest ? swaggerHelmet : apiHelmet;

  // Apply the selected helmet middleware with all configured security headers
  return middleware(req, res, next);
};

module.exports = securityHeaders;