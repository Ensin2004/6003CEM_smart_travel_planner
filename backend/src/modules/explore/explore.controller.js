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

module.exports = { getWeather, getAttractions };
