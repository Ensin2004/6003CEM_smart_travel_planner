const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const exploreService = require('./explore.service');

const getWeather = catchAsync(async (req, res) => {
  const weather = await exploreService.getWeatherByDestination(req.query.destination);
  sendSuccess(res, 200, { weather });
});

const getAttractions = catchAsync(async (req, res) => {
  const attractions = await exploreService.getAttractionsByDestination(req.query.destination);
  sendSuccess(res, 200, { attractions });
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

module.exports = { getWeather, getAttractions, getHotels };
