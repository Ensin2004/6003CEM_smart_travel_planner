/**
 * Favorites module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { body, param } = require('express-validator');

// Supported favorite types - must match the enum in the schema
const favoriteTypes = ['hotel', 'flight', 'attraction', 'restaurant', 'location', 'transport'];

/**
 * Validation rules for adding a favorite.
 * Validates all fields that can be provided when creating a favorite.
 */
const addFavoriteRules = [
  // Type validation - must be one of the supported types
  body('type').isIn(favoriteTypes).withMessage('Favorite type is invalid'),
  
  // Title validation - required, trimmed, between 1 and 160 characters
  body('title').trim().isLength({ min: 1, max: 160 }).withMessage('Favorite title is required'),
  
  // Description validation - optional, trimmed, max 2000 characters
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
  
  // Address validation - optional, trimmed, max 240 characters
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 240 }),
  
  // Price level validation - optional, trimmed, max 80 characters
  body('priceLevel').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  
  // Rating validation - optional, must be between 0 and 5
  body('rating').optional({ checkFalsy: true }).isFloat({ min: 0, max: 5 }),
  
  // External ID validation - optional, trimmed, max 180 characters
  body('externalId').optional({ checkFalsy: true }).trim().isLength({ max: 180 }),
  
  // Source validation - optional, trimmed, max 80 characters
  body('source').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  
  // Coordinate validation - both latitude and longitude must be valid if provided
  body('coordinates.latitude').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }),
  body('coordinates.longitude').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }),
];

/**
 * Validation rule for favorite ID parameter in URL.
 * Ensures the ID is a valid MongoDB ObjectId format.
 */
const favoriteIdRule = [param('id').isMongoId().withMessage('Favorite id is invalid')];

module.exports = { addFavoriteRules, favoriteIdRule };