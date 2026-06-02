/**
 * Favorites module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const favoriteService = require('./favorite.service');
const listFavorites = catchAsync(async (req, res) => {
  const favorites = await favoriteService.listFavorites(req.user.id);
  sendSuccess(res, 200, { favorites });
});
// Add Favorite builds a new record from validated input.
const addFavorite = catchAsync(async (req, res) => {
  const favorite = await favoriteService.addFavorite(req.user.id, req.body);
  sendSuccess(res, 201, { favorite }, 'Favorite saved');
});
// Remove Favorite removes a record after ownership checks.
const removeFavorite = catchAsync(async (req, res) => {
  await favoriteService.removeFavorite(req.user.id, req.params.id);
  res.status(204).send();
});
module.exports = { addFavorite, listFavorites, removeFavorite };
