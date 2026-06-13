/**
 * Adds a correlation ID to each request and response.
 * Clients can include the ID in support reports and administrators can match it
 * to server-side error log metadata.
 */
const crypto = require('crypto');

const normalizeRequestId = (value) => {
  const requestId = String(value || '').trim();
  return /^[a-zA-Z0-9._-]{1,100}$/.test(requestId) ? requestId : crypto.randomUUID();
};

const requestContext = (req, res, next) => {
  req.requestId = normalizeRequestId(req.get('X-Request-ID'));
  res.set('X-Request-ID', req.requestId);
  next();
};

module.exports = requestContext;
