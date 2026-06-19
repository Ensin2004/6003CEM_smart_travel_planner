/**
 * Itinerary module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const itineraryService = require('./itinerary.service');

/**
 * Retrieves the full itinerary for a specific trip.
 * Returns all days and items organized by day for the trip.
 * 
 * @param {Object} req - Express request object with tripId in params and user info
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with itinerary data
 */
const getItinerary = catchAsync(async (req, res) => {
  const itinerary = await itineraryService.getItinerary(req.params.tripId, req.user.id);
  sendSuccess(res, 200, itinerary);
});

/**
 * Update Day applies allowed changes to an existing record.
 * Updates a specific day's metadata (notes, title, date).
 * 
 * @param {Object} req - Express request object with tripId, dayNumber, user info, and body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with updated day
 */
const updateDay = catchAsync(async (req, res) => {
  const day = await itineraryService.updateDay(
    req.params.tripId,
    req.params.dayNumber,
    req.user.id,
    req.body
  );
  sendSuccess(res, 200, { day }, 'Itinerary day updated');
});

/**
 * Create Item builds a new record from validated input.
 * Adds a new item (place, activity, restaurant, etc.) to a specific day.
 * 
 * @param {Object} req - Express request object with tripId, user info, and body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with created item
 */
const createItem = catchAsync(async (req, res) => {
  const item = await itineraryService.createItem(req.params.tripId, req.user.id, req.body);
  sendSuccess(res, 201, { item }, 'Itinerary item created');
});

/**
 * Update Item applies allowed changes to an existing record.
 * Updates a specific itinerary item's details (name, time, notes, etc.).
 * 
 * @param {Object} req - Express request object with itemId, user info, and body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with updated item
 */
const updateItem = catchAsync(async (req, res) => {
  const item = await itineraryService.updateItem(req.params.itemId, req.user.id, req.body);
  sendSuccess(res, 200, { item }, 'Itinerary item updated');
});

/**
 * Delete Item removes a record after ownership checks.
 * Deletes an itinerary item by ID after verifying the user owns the trip.
 * 
 * @param {Object} req - Express request object with itemId and user info
 * @param {Object} res - Express response object
 * @returns {void} - Sends 204 No Content response on successful deletion
 */
const deleteItem = catchAsync(async (req, res) => {
  await itineraryService.deleteItem(req.params.itemId, req.user.id);
  res.status(204).send(); // No content response for successful deletion
});

module.exports = {
  createItem,
  deleteItem,
  getItinerary,
  updateDay,
  updateItem,
};