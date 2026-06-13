/**
 * Transportation module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
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
const getTrainStationTimetable = catchAsync(async (req, res) => {
  const trains = await transportationService.getTrainStationTimetable({
    stationCode: req.query.stationCode,
    stationQuery: req.query.stationQuery,
    departureDate: req.query.departureDate,
    arrivalDate: req.query.arrivalDate,
  });

  sendSuccess(res, 200, { trains });
});
const getTrainServiceTimetable = catchAsync(async (req, res) => {
  const timetable = await transportationService.getTrainServiceTimetable({
    serviceIdentifier: req.query.serviceIdentifier,
    trainUid: req.query.trainUid,
    serviceDate: req.query.serviceDate,
    actualRid: req.query.actualRid,
  });

  sendSuccess(res, 200, { timetable });
});
module.exports = { getFlight, getTrainStationTimetable, getTrainServiceTimetable };
