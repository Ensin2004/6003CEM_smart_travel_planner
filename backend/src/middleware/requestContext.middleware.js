/**
 * Adds a correlation ID to each request and response.
 * Clients can include the ID in support reports and administrators can match it
 * to server-side error log metadata.
 */
const crypto = require('crypto');

/**
 * Normalizes or generates a request ID.
 * Validates the provided request ID against allowed characters and length constraints.
 * 
 * @param {string} value - The request ID value from the X-Request-ID header
 * @returns {string} - Validated request ID or newly generated UUID
 */
const normalizeRequestId = (value) => {
  // Convert to string and trim whitespace
  const requestId = String(value || '').trim();
  
  // Validate against allowed characters (alphanumeric, dot, underscore, hyphen)
  // and length limit (1-100 characters) to prevent injection issues
  return /^[a-zA-Z0-9._-]{1,100}$/.test(requestId) ? requestId : crypto.randomUUID();
};

/**
 * Express middleware that assigns a correlation ID to each request.
 * Extracts the X-Request-ID header from the client or generates a new ID.
 * Sets the ID on the request object and response header for end-to-end tracking.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
const requestContext = (req, res, next) => {
  // Assign validated request ID to request object for downstream use
  req.requestId = normalizeRequestId(req.get('X-Request-ID'));
  
  // Echo the request ID back in response headers for client correlation
  res.set('X-Request-ID', req.requestId);
  
  // Proceed to the next middleware
  next();
};

module.exports = requestContext;