/**
 * App Error module.
 * Exports and local helpers keep related behavior in a single module.
 */

// Custom error class for operational errors with status codes and additional metadata.
class AppError extends Error {
  constructor(message, statusCode = 500, codeOrOptions, details) {
    super(message);

    // HTTP status code for the error response.
    this.statusCode = statusCode;

    // Status string based on status code range (4xx = fail, 5xx = error).
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    // Marks this error as operational (expected, not a programming bug).
    this.isOperational = true;

    // Handles flexible second parameter: string code or options object.
    const options =
      typeof codeOrOptions === 'string'
        ? { code: codeOrOptions, details }
        : codeOrOptions || {};

    // Attaches error code when provided.
    if (options.code) this.code = options.code;

    // Attaches validation errors when provided.
    if (options.errors) this.errors = options.errors;

    // Attaches additional details when provided.
    if (options.details) this.details = options.details;

    // Captures stack trace for debugging, excluding the constructor call.
    Error.captureStackTrace(this, this.constructor);
  }
}

// Exports the custom error class for use across the application.
module.exports = AppError;