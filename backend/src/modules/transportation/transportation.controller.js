/**
 * Transportation module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const ensureApiResult = require('../../utils/ensureApiResult');
const transportationService = require('./transportation.service');

/**
 * Searches for flights based on airline and route criteria.
 * Supports searching by airline name, country codes, country names, and departure date.
 * 
 * @param {Object} req - Express request object with flight search parameters
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with flights array
 */
const getFlight = catchAsync(async (req, res) => {
  const flights = await transportationService.getFlightsBySearch({
    airlineName: req.query.airlineName,
    fromCountryCode: req.query.fromCountryCode,
    fromCountryName: req.query.fromCountryName,
    toCountryCode: req.query.toCountryCode,
    toCountryName: req.query.toCountryName,
    departureDate: req.query.departureDate,
  });

  sendSuccess(res, 200, { flights: ensureApiResult(flights, {
    noResultsMessage: 'No matching flights found.',
  }) });
});

/**
 * Retrieves train timetable for a specific station.
 * Can search by station code or query string with optional date range.
 * 
 * @param {Object} req - Express request object with station search parameters
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with trains array
 */
const getTrainStationTimetable = catchAsync(async (req, res) => {
  const trains = await transportationService.getTrainStationTimetable({
    stationCode: req.query.stationCode,
    stationQuery: req.query.stationQuery,
    departureDate: req.query.departureDate,
    arrivalDate: req.query.arrivalDate,
  });

  sendSuccess(res, 200, { trains: ensureApiResult(trains, {
    noResultsMessage: 'No trains found for this station.',
  }) });
});

/**
 * Retrieves detailed timetable for a specific train service.
 * Includes calling points and stop details.
 * 
 * @param {Object} req - Express request object with service identifier parameters
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with timetable and stops
 */
const getTrainServiceTimetable = catchAsync(async (req, res) => {
  const timetable = await transportationService.getTrainServiceTimetable({
    serviceIdentifier: req.query.serviceIdentifier,
    trainUid: req.query.trainUid,
    serviceDate: req.query.serviceDate,
    actualRid: req.query.actualRid,
  });

  sendSuccess(res, 200, { timetable: ensureApiResult(timetable, {
    itemPaths: ['stops'],
    noResultsMessage: 'No calling points found for this train.',
  }) });
});

module.exports = { getFlight, getTrainStationTimetable, getTrainServiceTimetable };