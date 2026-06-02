/**
 * Sends express-validator failures as a consistent 400 response.
 * Controllers can assume validated fields are present when this middleware
 * appears before route handlers.
 */
const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);

  // Empty validation results pass through without changing the request.
  if (errors.isEmpty()) {
    return next();
  }

  // Error objects are reduced to field and message so frontend forms can display them directly.
  return res.status(400).json({
    status: 'fail',
    message: 'Validation failed',
    errors: errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    })),
  });
};

module.exports = validate;
