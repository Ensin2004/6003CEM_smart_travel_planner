/**
 * Handles map search, place details, and weather requests from the map screen.
 * Query parameters are passed through as named service inputs so provider logic
 * stays out of controller code.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const ensureApiResult = require('../../utils/ensureApiResult');
const mapService = require('./map.service');

/**
 * Searches for places on the map based on category and location.
 * Supports search by destination name or coordinates.
 * 
 * @param {Object} req - Express request object with query parameters
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with places array
 */
const getMapPlaces = catchAsync(async (req, res) => {
  const places = await mapService.getMapPlaces({
    category: req.query.category,
    destination: req.query.destination,
    latitude: req.query.latitude,
    longitude: req.query.longitude,
    limit: req.query.limit,
  });

  sendSuccess(res, 200, { places: ensureApiResult(places, {
    noResultsMessage: 'No map places found for this search.',
  }) });
});

/**
 * Retrieves detailed information for a specific place.
 * Supports multiple identifier types (Foursquare, Google, data ID).
 * 
 * @param {Object} req - Express request object with place identifiers in query
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with place details
 */
const getMapPlaceDetails = catchAsync(async (req, res) => {
  const details = await mapService.getMapPlaceDetails({
    category: req.query.category,
    placeId: req.query.placeId,
    foursquarePlaceId: req.query.foursquarePlaceId,
    googlePlaceId: req.query.googlePlaceId,
    dataId: req.query.dataId,
    name: req.query.name,
    address: req.query.address,
    latitude: req.query.latitude,
    longitude: req.query.longitude,
  });

  sendSuccess(res, 200, { details });
});

/**
 * Retrieves weather information for a map location.
 * Supports destination name or coordinates with optional date.
 * 
 * @param {Object} req - Express request object with location and date in query
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with weather data
 */
const getMapWeather = catchAsync(async (req, res) => {
  const weather = await mapService.getMapWeather({
    destination: req.query.destination,
    date: req.query.date,
    latitude: req.query.latitude,
    longitude: req.query.longitude,
    locationLabel: req.query.locationLabel,
  });

  sendSuccess(res, 200, { weather });
});

/**
 * Performs reverse geocoding to get location details from coordinates.
 * Converts latitude/longitude to address and place name.
 * 
 * @param {Object} req - Express request object with coordinates in query
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with location details
 */
const getReverseGeocodeLocation = catchAsync(async (req, res) => {
  const location = await mapService.getReverseGeocodeLocation({
    latitude: req.query.latitude,
    longitude: req.query.longitude,
  });

  sendSuccess(res, 200, { location: ensureApiResult(location, {
    itemPaths: ['available'],
    noResultsMessage: 'No location found for these coordinates.',
  }) });
});

/**
 * Performs geocoding to get coordinates from a location query.
 * Converts address or place name to latitude/longitude.
 * 
 * @param {Object} req - Express request object with query string
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with location details
 */
const getGeocodeLocation = catchAsync(async (req, res) => {
  const location = await mapService.getGeocodeLocation(req.query.query);

  sendSuccess(res, 200, { location: ensureApiResult(location, {
    itemPaths: ['available'],
    noResultsMessage: 'No location found for this search.',
  }) });
});

/**
 * Calculates routes between multiple points.
 * Supports different travel modes (walking, driving, transit).
 * 
 * @param {Object} req - Express request object with mode and points in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with routes data
 */
const getMapRoutes = catchAsync(async (req, res) => {
  const routes = await mapService.getMapRoutes({
    mode: req.body.mode,
    optimize: req.body.optimize,
    points: req.body.points,
  });

  sendSuccess(res, 200, { routes });
});

module.exports = {
  getGeocodeLocation,
  getMapPlaces,
  getMapPlaceDetails,
  getMapRoutes,
  getMapWeather,
  getReverseGeocodeLocation,
};
