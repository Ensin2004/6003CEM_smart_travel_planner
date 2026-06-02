/**
 * Comparison validation rules.
 * Input validation keeps comparison scoring bounded and prevents oversized payloads.
 */
const { body } = require('express-validator');

const optionalText = (field, max = 180) =>
  body(field).optional({ checkFalsy: true }).trim().isLength({ max }).withMessage(`${field} is too long`);

const recommendationRules = [
  body('items').isArray({ min: 2, max: 4 }).withMessage('Select between 2 and 4 places to compare.'),
  body('items.*.id').optional({ checkFalsy: true }).trim().isLength({ max: 160 }).withMessage('Place id is too long.'),
  body('items.*.name').trim().isLength({ min: 1, max: 140 }).withMessage('Place name is required.'),
  body('items.*.category').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('items.*.source').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('items.*.rating').optional({ nullable: true }).isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5.'),
  body('items.*.reviewCount').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Review count must be a positive number.'),
  body('items.*.price').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body('items.*.priceValue').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Price value must be a positive number.'),
  body('items.*.hours').optional({ checkFalsy: true }).trim().isLength({ max: 180 }),
  body('items.*.openState').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body('items.*.address').optional({ checkFalsy: true }).trim().isLength({ max: 220 }),
  optionalText('context.page', 80),
  optionalText('context.destination', 120),
];

module.exports = {
  recommendationRules,
};
