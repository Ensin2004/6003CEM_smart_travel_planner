/**
 * Travel Guide module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const ensureApiResult = require('../../utils/ensureApiResult');
const travelGuideService = require('./travelGuide.service');

/**
 * Retrieves a list of travel destinations based on query filters.
 * Supports search, pagination, and geographic filtering.
 */
const getDestinations = catchAsync(async (req, res) => {
  // Call service to fetch destination list
  const guide = await travelGuideService.getDestinationList({
    country: req.query.country,
    countryCode: req.query.countryCode,
    mode: req.query.mode,
    region: req.query.region,
    limit: req.query.limit,
    page: req.query.page,
    search: req.query.search,
  });

  // Send success response with guide data
  sendSuccess(res, 200, { guide: ensureApiResult(guide, {
    noResultsMessage: 'No travel guide destinations found.',
  }) });
});

/**
 * Retrieves a list of countries with optional filtering.
 * Supports region, search, and pagination parameters.
 */
const getCountries = catchAsync(async (req, res) => {
  // Call service to fetch country list
  const countries = await travelGuideService.getCountryList({
    currentCountry: req.query.currentCountry,
    currentCountryCode: req.query.currentCountryCode,
    region: req.query.region,
    limit: req.query.limit,
    page: req.query.page,
    search: req.query.search,
  });

  // Send success response with countries data
  sendSuccess(res, 200, { countries: ensureApiResult(countries, {
    noResultsMessage: 'No countries found.',
  }) });
});

/**
 * Retrieves detailed information about a specific destination.
 * Includes attractions, restaurants, hotels, and location-based data.
 */
const getDestinationDetails = catchAsync(async (req, res) => {
  // Call service to fetch destination details
  const guide = await travelGuideService.getDestinationDetails({
    destination: req.query.destination,
    country: req.query.country,
    latitude: req.query.latitude,
    longitude: req.query.longitude,
    date: req.query.date,
    attractionStart: req.query.attractionStart,
    restaurantStart: req.query.restaurantStart,
    hotelStart: req.query.hotelStart,
  });

  // Send success response with guide details
  sendSuccess(res, 200, { guide });
});

// Export controller functions
module.exports = {
  getCountries,
  getDestinations,
  getDestinationDetails,
};
