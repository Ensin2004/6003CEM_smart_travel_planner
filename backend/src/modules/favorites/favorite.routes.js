const express = require('express');
const favoriteController = require('./favorite.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { addFavoriteRules, favoriteIdRule } = require('./favorite.validation');

const router = express.Router();

router.get('/', protect, favoriteController.listFavorites);
router.post('/', protect, addFavoriteRules, validate, favoriteController.addFavorite);
router.delete('/:id', protect, favoriteIdRule, validate, favoriteController.removeFavorite);

module.exports = router;
