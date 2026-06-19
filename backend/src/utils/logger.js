/**
 * Logger module.
 * Exports and local helpers keep related behavior in a single module.
 */

// Simple logger implementation wrapping console methods for consistent logging.
const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

// Exports the logger for use across the application.
module.exports = logger;