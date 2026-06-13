/**
 * App Error module.
 * Exports and local helpers keep related behavior in a single module.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, codeOrOptions, details) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    const options =
      typeof codeOrOptions === 'string'
        ? { code: codeOrOptions, details }
        : codeOrOptions || {};

    if (options.code) this.code = options.code;
    if (options.errors) this.errors = options.errors;
    if (options.details) this.details = options.details;

    Error.captureStackTrace(this, this.constructor);
  }
}
module.exports = AppError;
