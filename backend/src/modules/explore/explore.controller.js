/**
 * Explore module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const ensureApiResult = require('../../utils/ensureApiResult');
const exploreService = require('./explore.service');

/**
 * Retrieves weather information for a destination.
 * @param {Object} req - Express request object with destination and optional coordinates
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with weather data
 */
const getWeather = catchAsync(async (req, res) => {
  const weather = await exploreService.getWeatherByDestination(req.query.destination, req.query.date, {
    latitude: req.query.latitude,
    longitude: req.query.longitude,
    locationLabel: req.query.locationLabel,
  });
  sendSuccess(res, 200, { weather: ensureApiResult(weather, {
    itemPaths: ['available'],
    noResultsMessage: 'No weather results found for this destination.',
  }) });
});

/**
 * Retrieves attractions for a destination.
 * @param {Object} req - Express request object with destination, country, and filters
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with attractions array
 */
const getAttractions = catchAsync(async (req, res) => {
  const attractions = await exploreService.getAttractionsByDestination({
    destination: req.query.destination,
    country: req.query.country,
    state: req.query.state,
    attractionCategory: req.query.attractionCategory,
    latitude: req.query.latitude,
    longitude: req.query.longitude,
    locationLabel: req.query.locationLabel,
    start: req.query.start,
  });
  sendSuccess(res, 200, { attractions: ensureApiResult(attractions, {
    noResultsMessage: 'No attractions found for this search.',
  }) });
});

/**
 * Retrieves detailed information for a specific attraction.
 * @param {Object} req - Express request object with attraction identifiers
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with attraction detail
 */
const getAttractionDetail = catchAsync(async (req, res) => {
  const attraction = await exploreService.getAttractionDetail({
    name: req.query.name,
    address: req.query.address,
    dataId: req.query.dataId,
    placeId: req.query.placeId,
  });
  sendSuccess(res, 200, { attraction });
});

/**
 * Retrieves hotels for a destination.
 * @param {Object} req - Express request object with destination, country, and filters
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with hotels array
 */
const getHotels = catchAsync(async (req, res) => {
  const hotels = await exploreService.getHotelsByDestination({
    destination: req.query.destination,
    country: req.query.country,
    state: req.query.state,
    roomType: req.query.roomType,
    latitude: req.query.latitude,
    longitude: req.query.longitude,
    locationLabel: req.query.locationLabel,
    start: req.query.start,
  });
  sendSuccess(res, 200, { hotels: ensureApiResult(hotels, {
    noResultsMessage: 'No hotels found for this search.',
  }) });
});

/**
 * Retrieves detailed information for a specific hotel.
 * @param {Object} req - Express request object with hotel identifiers
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with hotel detail
 */
const getHotelDetail = catchAsync(async (req, res) => {
  const hotel = await exploreService.getHotelDetail({
    name: req.query.name,
    address: req.query.address,
    dataId: req.query.dataId,
    placeId: req.query.placeId,
  });
  sendSuccess(res, 200, { hotel });
});

/**
 * Retrieves restaurants for a destination.
 * @param {Object} req - Express request object with destination, country, and filters
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with restaurants array
 */
const getRestaurants = catchAsync(async (req, res) => {
  const restaurants = await exploreService.getRestaurantsByDestination({
    destination: req.query.destination,
    country: req.query.country,
    state: req.query.state,
    foodCategory: req.query.foodCategory,
    latitude: req.query.latitude,
    longitude: req.query.longitude,
    locationLabel: req.query.locationLabel,
    start: req.query.start,
  });
  sendSuccess(res, 200, { restaurants: ensureApiResult(restaurants, {
    noResultsMessage: 'No restaurants found for this search.',
  }) });
});

/**
 * Retrieves detailed information for a specific restaurant.
 * @param {Object} req - Express request object with restaurant identifiers
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with restaurant detail
 */
const getRestaurantDetail = catchAsync(async (req, res) => {
  const restaurant = await exploreService.getRestaurantDetail({
    name: req.query.name,
    address: req.query.address,
    dataId: req.query.dataId,
    placeId: req.query.placeId,
  });
  sendSuccess(res, 200, { restaurant });
});

/**
 * Retrieves reviews for a specific place.
 * @param {Object} req - Express request object with place identifiers
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with reviews
 */
const getPlaceReviews = catchAsync(async (req, res) => {
  const reviews = await exploreService.getPlaceReviews({
    dataId: req.query.dataId,
    placeId: req.query.placeId,
    allPages: req.query.allPages !== 'false', // Default to true unless explicitly 'false'
  });

  sendSuccess(res, 200, { reviews });
});

/**
 * Retrieves AI-generated recommendations based on user context.
 * @param {Object} req - Express request object with view, destination, and context
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with recommendations
 */
const getAiRecommendations = catchAsync(async (req, res) => {
  const recommendations = await exploreService.getAiRecommendations({
    view: req.body.view,
    destination: req.body.destination,
    date: req.body.date,
    weather: req.body.weather,
    items: req.body.items,
  });
  sendSuccess(res, 200, { recommendations });
});

/**
 * Fetches and proxies a Google Place image.
 * Streams the image with appropriate headers for cross-origin access.
 * @param {Object} req - Express request object with image URL query parameter
 * @param {Object} res - Express response object
 * @returns {void} - Streams image to response
 */
const getPlaceImage = catchAsync(async (req, res) => {
  const image = await exploreService.fetchGooglePlaceImage(req.query.url);

  res.setHeader('Content-Type', image.contentType);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', image.cacheControl);
  if (image.contentLength) {
    res.setHeader('Content-Length', image.contentLength);
  }
  image.stream.pipe(res);
});

module.exports = {
  getWeather,
  getAttractionDetail,
  getAttractions,
  getAttractionDetail,
  getHotels,
  getHotelDetail,
  getRestaurants,
  getRestaurantDetail,
  getPlaceReviews,
  getPlaceImage,
  getAiRecommendations,
};
