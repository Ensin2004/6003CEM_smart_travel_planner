const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const transportationService = require('./transportation.service');

const getFlight = catchAsync(async (req, res) => {
  const flights = await transportationService.getFlightsBySearch({
    airlineName: req.query.airlineName,
    fromCountryCode: req.query.fromCountryCode,
    fromCountryName: req.query.fromCountryName,
    toCountryCode: req.query.toCountryCode,
    toCountryName: req.query.toCountryName,
    departureDate: req.query.departureDate,
  });

  sendSuccess(res, 200, { flights });
});

module.exports = { getFlight };
