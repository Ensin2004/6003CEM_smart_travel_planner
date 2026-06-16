/**
 * Cors module.
 * Exports and local helpers keep related behavior in a single module.
 */

// Load environment variables to access client origin configuration
const env = require('./env');

// Parse the CLIENT_ORIGIN environment variable into an array of allowed origins
// 1. Split comma-separated string into individual origin entries
// 2. Trim whitespace from each origin
// 3. Remove trailing slashes to normalize origin URLs for consistent comparison
// 4. Filter out any empty or falsy values
const allowedOrigins = env.clientOrigin
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

module.exports = {
  /**
   * CORS origin validation function.
   * Determines whether an incoming request origin is permitted.
   * 
   * @param {string} origin - The request origin header value (or null/undefined for same-origin requests)
   * @param {Function} callback - Express-style callback (error, allowFlag)
   * @returns {void} - Calls callback with validation result
   */
  origin(origin, callback) {
    // Allow requests with no origin (same-origin or non-browser clients) 
    // or if the origin matches an entry in the allowed origins list
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject requests from origins not present in the allowed list
    return callback(new Error('Not allowed by CORS'));
  },
  
  // Allow credentials (cookies, authorization headers) to be included with cross-origin requests
  credentials: true,
};