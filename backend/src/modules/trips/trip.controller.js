/**
 * Handles trip HTTP requests and delegates business rules to the trip service.
 * Ownership comes from req.user, so route middleware must authenticate requests
 * before these handlers run.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const tripService = require('./trip.service');

const createTrip = catchAsync(async (req, res) => {
  const trip = await tripService.createTrip(req.user.id, req.body);
  sendSuccess(res, 201, { trip }, 'Trip created');
});
const getMyTrips = catchAsync(async (req, res) => {
  const trips = await tripService.getMyTrips(req.user.id);
  sendSuccess(res, 200, { trips });
});
const getTrip = catchAsync(async (req, res) => {
  const trip = await tripService.getTripById(req.params.id, req.user.id);
  sendSuccess(res, 200, { trip });
});
const updateTrip = catchAsync(async (req, res) => {
  const trip = await tripService.updateTrip(req.params.id, req.user.id, req.body);
  sendSuccess(res, 200, { trip }, 'Trip updated');
});
const deleteTrip = catchAsync(async (req, res) => {
  await tripService.deleteTrip(req.params.id, req.user.id);

  // A successful delete has no response body, so 204 keeps the API response lightweight.
  res.status(204).send();
});
const getTripSummary = catchAsync(async (req, res) => {
  const summary = await tripService.getTripSummary(req.params.id, req.user.id);
  sendSuccess(res, 200, summary);
});

module.exports = {
  createTrip,
  getMyTrips,
  getTrip,
  updateTrip,
  deleteTrip,
  getTripSummary,
};
