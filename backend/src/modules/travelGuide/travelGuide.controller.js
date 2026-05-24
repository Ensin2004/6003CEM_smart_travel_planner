const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const travelGuideService = require('./travelGuide.service');

const getDestinations = catchAsync(async (req, res) => {
  const guide = await travelGuideService.getDestinationList({
    country: req.query.country,
    countryCode: req.query.countryCode,
    mode: req.query.mode,
    region: req.query.region,
    limit: req.query.limit,
    page: req.query.page,
    search: req.query.search,
  });

  sendSuccess(res, 200, { guide });
});

const getDestinationDetails = catchAsync(async (req, res) => {
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

  sendSuccess(res, 200, { guide });
});

module.exports = {
  getDestinations,
  getDestinationDetails,
};
