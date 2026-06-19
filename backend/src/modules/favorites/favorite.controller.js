/**
 * Favorites module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const favoriteService = require('./favorite.service');

/**
 * Retrieves all favorites for the authenticated user.
 * Returns the list of saved places, attractions, hotels, or restaurants.
 * 
 * @param {Object} req - Express request object with user info
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with favorites array
 */
const listFavorites = catchAsync(async (req, res) => {
  const favorites = await favoriteService.listFavorites(req.user.id);
  sendSuccess(res, 200, { favorites });
});

/**
 * Add Favorite builds a new record from validated input.
 * Saves a place, attraction, hotel, or restaurant to the user's favorites.
 * 
 * @param {Object} req - Express request object with user info and favorite data in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with created favorite
 */
const addFavorite = catchAsync(async (req, res) => {
  const favorite = await favoriteService.addFavorite(req.user.id, req.body);
  sendSuccess(res, 201, { favorite }, 'Favorite saved');
});

/**
 * Remove Favorite removes a record after ownership checks.
 * Deletes a favorite by ID after verifying the user owns it.
 * 
 * @param {Object} req - Express request object with user info and favorite ID in params
 * @param {Object} res - Express response object
 * @returns {void} - Sends 204 No Content response on successful deletion
 */
const removeFavorite = catchAsync(async (req, res) => {
  await favoriteService.removeFavorite(req.user.id, req.params.id);
  res.status(204).send(); // No content response for successful deletion
});

module.exports = { addFavorite, listFavorites, removeFavorite };