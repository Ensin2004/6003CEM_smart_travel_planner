/**
 * Explore module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const exploreService = require('./explore.service');
const getWeather = catchAsync(async (req, res) => {
  const weather = await exploreService.getWeatherByDestination(req.query.destination, req.query.date, {
    latitude: req.query.latitude,
    longitude: req.query.longitude,
    locationLabel: req.query.locationLabel,
  });
  sendSuccess(res, 200, { weather });
});
const getAttractions = catchAsync(async (req, res) => {
  const attractions = await exploreService.getAttractionsByDestination(req.query.destination);
  sendSuccess(res, 200, { attractions });
});
const getAttractionDetail = catchAsync(async (req, res) => {
  const attraction = await exploreService.getAttractionDetail({
    name: req.query.name,
    address: req.query.address,
    dataId: req.query.dataId,
    placeId: req.query.placeId,
  });
  sendSuccess(res, 200, { attraction });
});
const getHotels = catchAsync(async (req, res) => {
  const hotels = await exploreService.getHotelsByDestination({
    destination: req.query.destination,
    country: req.query.country,
    state: req.query.state,
    roomType: req.query.roomType,
    start: req.query.start,
  });
  sendSuccess(res, 200, { hotels });
});
const getHotelDetail = catchAsync(async (req, res) => {
  const hotel = await exploreService.getHotelDetail({
    name: req.query.name,
    address: req.query.address,
    dataId: req.query.dataId,
    placeId: req.query.placeId,
  });
  sendSuccess(res, 200, { hotel });
});
const getRestaurants = catchAsync(async (req, res) => {
  const restaurants = await exploreService.getRestaurantsByDestination({
    destination: req.query.destination,
    country: req.query.country,
    state: req.query.state,
    foodCategory: req.query.foodCategory,
    start: req.query.start,
  });
  sendSuccess(res, 200, { restaurants });
});
const getRestaurantDetail = catchAsync(async (req, res) => {
  const restaurant = await exploreService.getRestaurantDetail({
    name: req.query.name,
    address: req.query.address,
    dataId: req.query.dataId,
    placeId: req.query.placeId,
  });
  sendSuccess(res, 200, { restaurant });
});
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
module.exports = {
  getWeather,
  getAttractionDetail,
  getAttractions,
  getAttractionDetail,
  getHotels,
  getHotelDetail,
  getRestaurants,
  getRestaurantDetail,
  getAiRecommendations,
};
