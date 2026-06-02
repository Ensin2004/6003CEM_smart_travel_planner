const { body, param } = require('express-validator');

const favoriteTypes = ['hotel', 'flight', 'attraction', 'restaurant', 'location', 'transport'];

const addFavoriteRules = [
  body('type').isIn(favoriteTypes).withMessage('Favorite type is invalid'),
  body('title').trim().isLength({ min: 1, max: 160 }).withMessage('Favorite title is required'),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 240 }),
  body('priceLevel').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('rating').optional({ checkFalsy: true }).isFloat({ min: 0, max: 5 }),
  body('externalId').optional({ checkFalsy: true }).trim().isLength({ max: 180 }),
  body('source').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('coordinates.latitude').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }),
  body('coordinates.longitude').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }),
];

const favoriteIdRule = [param('id').isMongoId().withMessage('Favorite id is invalid')];

module.exports = { addFavoriteRules, favoriteIdRule };
