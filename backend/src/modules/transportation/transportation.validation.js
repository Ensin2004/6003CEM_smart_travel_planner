/**
 * Transportation module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { query } = require('express-validator');

const requireAnyFlightFilter = query().custom((_, { req }) => {
  const hasSearchValue = ['airlineName', 'fromCountryCode', 'toCountryCode'].some((field) => Boolean(req.query[field]?.trim()));
  if (!hasSearchValue) {
    throw new Error('Enter an airline name or select at least one country.');
  }

  return true;
});

const flightLookupRules = [
  query('airlineName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Airline name must be between 2 and 120 characters'),
  query('fromCountryCode')
    .optional({ checkFalsy: true })
    .trim()
    .isISO31661Alpha2()
    .withMessage('From country must use a valid country code'),
  query('fromCountryName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('From country name must be between 2 and 80 characters'),
  query('toCountryCode')
    .optional({ checkFalsy: true })
    .trim()
    .isISO31661Alpha2()
    .withMessage('To country must use a valid country code'),
  query('toCountryName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('To country name must be between 2 and 80 characters'),
  query('departureDate')
    .optional({ checkFalsy: true })
    .trim()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Departure date must use YYYY-MM-DD format')
    .bail()
    .custom((value) => {
      const today = new Date(new Date().toISOString().slice(0, 10));
      const requestedDate = new Date(value);

      if (requestedDate < today) {
        throw new Error('Departure date cannot be in the past.');
      }

      return true;
    }),
  requireAnyFlightFilter,
];

const trainStationTimetableRules = [
  query('stationCode')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 12 })
    .withMessage('Station code must be between 3 and 12 characters')
    .bail()
    .matches(/^[a-z0-9:_-]+$/i)
    .withMessage('Station code can only contain letters, numbers, colon, underscore, or hyphen'),
  query('stationQuery')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Station search must be between 2 and 120 characters'),
  query('departureDate')
    .optional({ checkFalsy: true })
    .trim()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Departure date must use YYYY-MM-DD format'),
  query('arrivalDate')
    .optional({ checkFalsy: true })
    .trim()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Arrival date must use YYYY-MM-DD format'),
];

const trainServiceTimetableRules = [
  query('serviceIdentifier')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 80 })
    .withMessage('Service identifier must be between 3 and 80 characters')
    .bail()
    .matches(/^[a-z0-9:_-]+$/i)
    .withMessage('Service identifier can only contain letters, numbers, colon, underscore, or hyphen'),
  query('trainUid')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Train UID must be between 3 and 20 characters')
    .bail()
    .matches(/^[a-z0-9_-]+$/i)
    .withMessage('Train UID can only contain letters, numbers, underscore, or hyphen'),
  query('serviceDate')
    .trim()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Service date must use YYYY-MM-DD format'),
  query('actualRid')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 4, max: 40 })
    .withMessage('Actual journey RID must be between 4 and 40 characters')
    .bail()
    .matches(/^[a-z0-9_-]+$/i)
    .withMessage('Actual journey RID can only contain letters, numbers, underscore, or hyphen'),
  query().custom((_, { req }) => {
    if (!req.query.serviceIdentifier?.trim() && !req.query.trainUid?.trim()) {
      throw new Error('Select a train from the station timetable first.');
    }

    return true;
  }),
];
module.exports = { flightLookupRules, trainStationTimetableRules, trainServiceTimetableRules };
