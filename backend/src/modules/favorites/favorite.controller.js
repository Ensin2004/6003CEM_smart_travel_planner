const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const favoriteService = require('./favorite.service');

const listFavorites = catchAsync(async (req, res) => {
  const favorites = await favoriteService.listFavorites(req.user.id);
  sendSuccess(res, 200, { favorites });
});

const addFavorite = catchAsync(async (req, res) => {
  const favorite = await favoriteService.addFavorite(req.user.id, req.body);
  sendSuccess(res, 201, { favorite }, 'Favorite saved');
});

const removeFavorite = catchAsync(async (req, res) => {
  await favoriteService.removeFavorite(req.user.id, req.params.id);
  res.status(204).send();
});

module.exports = { addFavorite, listFavorites, removeFavorite };
