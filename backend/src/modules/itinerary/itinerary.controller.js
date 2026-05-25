const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const itineraryService = require('./itinerary.service');

const getItinerary = catchAsync(async (req, res) => {
  const itinerary = await itineraryService.getItinerary(req.params.tripId, req.user.id);
  sendSuccess(res, 200, itinerary);
});

const updateDay = catchAsync(async (req, res) => {
  const day = await itineraryService.updateDay(
    req.params.tripId,
    req.params.dayNumber,
    req.user.id,
    req.body
  );
  sendSuccess(res, 200, { day }, 'Itinerary day updated');
});

const createItem = catchAsync(async (req, res) => {
  const item = await itineraryService.createItem(req.params.tripId, req.user.id, req.body);
  sendSuccess(res, 201, { item }, 'Itinerary item created');
});

const updateItem = catchAsync(async (req, res) => {
  const item = await itineraryService.updateItem(req.params.itemId, req.user.id, req.body);
  sendSuccess(res, 200, { item }, 'Itinerary item updated');
});

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
