/**
 * Handles map search, place details, and weather requests from the map screen.
 * Query parameters are passed through as named service inputs so provider logic
 * stays out of controller code.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const mapService = require('./map.service');

const getMapPlaces = catchAsync(async (req, res) => {
  const places = await mapService.getMapPlaces({
    category: req.query.category,
    destination: req.query.destination,
    latitude: req.query.latitude,
    longitude: req.query.longitude,
    limit: req.query.limit,
  });

  sendSuccess(res, 200, { places });
});
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
const getReverseGeocodeLocation = catchAsync(async (req, res) => {
  const location = await mapService.getReverseGeocodeLocation({
    latitude: req.query.latitude,
    longitude: req.query.longitude,
  });

  sendSuccess(res, 200, { location });
});

module.exports = { getMapPlaces, getMapPlaceDetails, getMapWeather, getReverseGeocodeLocation };
