/**
 * Itinerary module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const itineraryService = require('./itinerary.service');
const getItinerary = catchAsync(async (req, res) => {
  const itinerary = await itineraryService.getItinerary(req.params.tripId, req.user.id);
  sendSuccess(res, 200, itinerary);
});
// Update Day applies allowed changes to an existing record.
const updateDay = catchAsync(async (req, res) => {
  const day = await itineraryService.updateDay(
    req.params.tripId,
    req.params.dayNumber,
    req.user.id,
    req.body
  );
  sendSuccess(res, 200, { day }, 'Itinerary day updated');
});
// Create Item builds a new record from validated input.
const createItem = catchAsync(async (req, res) => {
  const item = await itineraryService.createItem(req.params.tripId, req.user.id, req.body);
  sendSuccess(res, 201, { item }, 'Itinerary item created');
});
// Update Item applies allowed changes to an existing record.
const updateItem = catchAsync(async (req, res) => {
  const item = await itineraryService.updateItem(req.params.itemId, req.user.id, req.body);
  sendSuccess(res, 200, { item }, 'Itinerary item updated');
});
// Delete Item removes a record after ownership checks.
const deleteItem = catchAsync(async (req, res) => {
  await itineraryService.deleteItem(req.params.itemId, req.user.id);
  res.status(204).send();
});
module.exports = {
  createItem,
  deleteItem,
  getItinerary,
  updateDay,
  updateItem,
};
