/**
 * Visited places module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const visitedPlaceService = require('./visitedPlace.service');

// Retrieves all visited places for the authenticated user.
const listVisitedPlaces = catchAsync(async (req, res) => {
  const visitedPlaces = await visitedPlaceService.listVisitedPlaces(req.user.id);
  sendSuccess(res, 200, { visitedPlaces });
});

// Creates a new visited place record for the authenticated user.
const markVisitedPlace = catchAsync(async (req, res) => {
  const visitedPlace = await visitedPlaceService.markVisitedPlace(req.user.id, req.body);
  sendSuccess(res, 201, { visitedPlace }, 'Visited place saved');
});

// Triggers image enrichment for all visited places of the authenticated user.
const enrichVisitedPlaceImages = catchAsync(async (req, res) => {
  const result = await visitedPlaceService.enrichVisitedPlaceImages(req.user.id);
  sendSuccess(res, 200, result, 'Visited place images updated');
});

// Fetches visited calendar data for the authenticated user based on query parameters.
const getVisitedCalendar = catchAsync(async (req, res) => {
  const days = await visitedPlaceService.getVisitedCalendar(req.user.id, req.query);
  sendSuccess(res, 200, { days });
});

// Deletes a specific visited place record for the authenticated user.
const removeVisitedPlace = catchAsync(async (req, res) => {
  await visitedPlaceService.removeVisitedPlace(req.user.id, req.params.id);
  res.status(204).send();
});

// Exports all handler functions for routing configuration.
module.exports = {
  enrichVisitedPlaceImages,
  getVisitedCalendar,
  listVisitedPlaces,
  markVisitedPlace,
  removeVisitedPlace,
};