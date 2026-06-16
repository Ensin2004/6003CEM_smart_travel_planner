/**
 * Comparison validation rules.
 * Input validation keeps comparison scoring bounded and prevents oversized payloads.
 */
const { body } = require('express-validator');

/**
 * Helper function to create optional text validation rules.
 * Applies trim and maximum length validation to optional fields.
 * 
 * @param {string} field - Field name to validate
 * @param {number} max - Maximum allowed length (default: 180)
 * @returns {Object} Express-validator validation chain
 */
const optionalText = (field, max = 180) =>
  body(field)
    .optional({ checkFalsy: true }) // Skip validation if value is empty, null, or undefined
    .trim()
    .isLength({ max })
    .withMessage(`${field} is too long`);

/**
 * Validation rules for the comparison recommendation endpoint.
 * Ensures items array is properly bounded and each item has required fields.
 */
const recommendationRules = [
  // Items array validation - must contain between 2 and 4 items for meaningful comparison
  body('items').isArray({ min: 2, max: 4 }).withMessage('Select between 2 and 4 places to compare.'),
  
  // Individual item validation
  body('items.*.id').optional({ checkFalsy: true }).trim().isLength({ max: 160 }).withMessage('Place id is too long.'),
  body('items.*.name').trim().isLength({ min: 1, max: 140 }).withMessage('Place name is required.'),
  body('items.*.category').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('items.*.source').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  
  // Rating validation - must be between 0 and 5 stars
  body('items.*.rating').optional({ nullable: true }).isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5.'),
  
  // Review count validation - must be a non-negative integer
  body('items.*.reviewCount').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Review count must be a positive number.'),
  
  // Price fields - optional with length or numeric validation
  body('items.*.price').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body('items.*.priceValue').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Price value must be a positive number.'),
  
  // Hours and availability fields
  body('items.*.hours').optional({ checkFalsy: true }).trim().isLength({ max: 180 }),
  body('items.*.openState').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body('items.*.address').optional({ checkFalsy: true }).trim().isLength({ max: 220 }),
  
  // Context validation - optional text fields with specific length limits
  optionalText('context.page', 80),
  optionalText('context.destination', 120),
];

module.exports = {
  recommendationRules,
};