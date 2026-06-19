/**
 * Sends express-validator failures as a consistent 400 response.
 * Controllers can assume validated fields are present when this middleware
 * appears before route handlers.
 */
const { validationResult } = require('express-validator');

/**
 * Express middleware that validates request data using express-validator.
 * Processes validation results from previous validation middleware.
 * Returns a 400 response with structured error details if validation fails.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} - Proceeds to next middleware on success or sends error response
 */
const validate = (req, res, next) => {
  // Extract validation results from the request (populated by express-validator)
  const errors = validationResult(req);

  // Empty validation results pass through without changing the request.
  // All validation rules passed - continue to the route handler
  if (errors.isEmpty()) {
    return next();
  }

  // Error objects are reduced to field and message so frontend forms can display them directly.
  // Format validation errors into a client-friendly structure with field names and messages
  return res.status(400).json({
    status: 'fail',
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    requestId: req.requestId,
    errors: errors.array().map((error) => ({
      field: error.path, // The field name that failed validation
      message: error.msg, // The validation error message
    })),
  });
};

module.exports = validate;