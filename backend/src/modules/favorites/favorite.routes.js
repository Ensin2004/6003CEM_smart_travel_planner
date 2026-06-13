/**
 * Favorites module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const favoriteController = require('./favorite.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { addFavoriteRules, favoriteIdRule } = require('./favorite.validation');

const router = express.Router();
//  route wires  to validation, access checks, and controller logic.
router.get('/', protect, favoriteController.listFavorites);
//  route wires  to validation, access checks, and controller logic.
router.post('/', protect, addFavoriteRules, validate, favoriteController.addFavorite);
//  route wires  to validation, access checks, and controller logic.
router.delete('/:id', protect, favoriteIdRule, validate, favoriteController.removeFavorite);
module.exports = router;
