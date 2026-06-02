/**
 * Logger module.
 * Exports and local helpers keep related behavior in a single module.
 */
const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};
module.exports = logger;
