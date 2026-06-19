/**
 * Handles trip HTTP requests and delegates business rules to the trip service.
 * Ownership comes from req.user, so route middleware must authenticate requests
 * before these handlers run.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const tripService = require('./trip.service');

/**
 * POST /trips
 * Creates a new trip for the authenticated user.
 */
const createTrip = catchAsync(async (req, res) => {
  const trip = await tripService.createTrip(req.user.id, req.body);
  sendSuccess(res, 201, { trip }, 'Trip created');
});

/**
 * GET /trips
 * Retrieves all trips for the authenticated user.
 */
const getMyTrips = catchAsync(async (req, res) => {
  const trips = await tripService.getMyTrips(req.user.id);
  sendSuccess(res, 200, { trips });
});

/**
 * GET /trips/:id
 * Retrieves a specific trip by ID with ownership verification.
 */
const getTrip = catchAsync(async (req, res) => {
  const trip = await tripService.getTripById(req.params.id, req.user.id);
  sendSuccess(res, 200, { trip });
});

/**
 * PUT /trips/:id
 * Updates an existing trip with ownership verification.
 */
const updateTrip = catchAsync(async (req, res) => {
  const trip = await tripService.updateTrip(req.params.id, req.user.id, req.body);
  sendSuccess(res, 200, { trip }, 'Trip updated');
});

/**
 * DELETE /trips/:id
 * Removes a trip after ownership verification.
 * A successful delete has no response body, so 204 keeps the API response lightweight.
 */
const deleteTrip = catchAsync(async (req, res) => {
  await tripService.deleteTrip(req.params.id, req.user.id);
  res.status(204).send();
});

/**
 * GET /trips/:id/summary
 * Retrieves a summary of trip details including related data.
 */
const getTripSummary = catchAsync(async (req, res) => {
  const summary = await tripService.getTripSummary(req.params.id, req.user.id);
  sendSuccess(res, 200, summary);
});

// Export all controller functions
module.exports = {
  createTrip,
  getMyTrips,
  getTrip,
  updateTrip,
  deleteTrip,
  getTripSummary,
};