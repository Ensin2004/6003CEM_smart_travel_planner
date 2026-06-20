/**
 * Transportation module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { query } = require('express-validator');

// Validate that flight search includes country context.
const requireFlightCountryFilter = query().custom((_, { req }) => {
  const hasCountry = ['fromCountryCode', 'toCountryCode'].some((field) => Boolean(req.query[field]?.trim()));
  
  if (!hasCountry) {
    throw new Error('Select at least one country before searching flights.');
  }

  return true;
});

// Validation rules for flight lookup endpoint
const flightLookupRules = [
  // Validate airline name if provided
  query('airlineName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Airline name must be between 2 and 120 characters'),
  
  // Validate from country code if provided
  query('fromCountryCode')
    .optional({ checkFalsy: true })
    .trim()
    .isISO31661Alpha2()
    .withMessage('From country must use a valid country code'),
  
  // Validate from country name if provided
  query('fromCountryName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('From country name must be between 2 and 80 characters'),
  
  // Validate to country code if provided
  query('toCountryCode')
    .optional({ checkFalsy: true })
    .trim()
    .isISO31661Alpha2()
    .withMessage('To country must use a valid country code'),
  
  // Validate to country name if provided
  query('toCountryName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('To country name must be between 2 and 80 characters'),
  
  // Validate departure date if provided
  query('departureDate')
    .optional({ checkFalsy: true })
    .trim()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Departure date must use YYYY-MM-DD format')
    .bail()
    .custom((value) => {
      // Check if date is in the past
      const today = new Date(new Date().toISOString().slice(0, 10));
      const requestedDate = new Date(value);

      if (requestedDate < today) {
        throw new Error('Departure date cannot be in the past.');
      }

      return true;
    }),
  
  // Apply the country-context requirement
  requireFlightCountryFilter,
];

// Validation rules for train station timetable endpoint
const trainStationTimetableRules = [
  // Validate station code if provided
  query('stationCode')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 12 })
    .withMessage('Station code must be between 3 and 12 characters')
    .bail()
    .matches(/^[a-z0-9:_-]+$/i)
    .withMessage('Station code can only contain letters, numbers, colon, underscore, or hyphen'),
  
  // Validate station search query if provided
  query('stationQuery')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Station search must be between 2 and 120 characters'),
  
  // Validate departure date if provided
  query('departureDate')
    .optional({ checkFalsy: true })
    .trim()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Departure date must use YYYY-MM-DD format'),
  
  // Validate arrival date if provided
  query('arrivalDate')
    .optional({ checkFalsy: true })
    .trim()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Arrival date must use YYYY-MM-DD format'),
];

// Validation rules for train service timetable endpoint
const trainServiceTimetableRules = [
  // Validate service identifier if provided
  query('serviceIdentifier')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 80 })
    .withMessage('Service identifier must be between 3 and 80 characters')
    .bail()
    .matches(/^[a-z0-9:_-]+$/i)
    .withMessage('Service identifier can only contain letters, numbers, colon, underscore, or hyphen'),
  
  // Validate train UID if provided
  query('trainUid')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Train UID must be between 3 and 20 characters')
    .bail()
    .matches(/^[a-z0-9_-]+$/i)
    .withMessage('Train UID can only contain letters, numbers, underscore, or hyphen'),
  
  // Validate service date (required)
  query('serviceDate')
    .trim()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Service date must use YYYY-MM-DD format'),
  
  // Validate actual journey RID if provided
  query('actualRid')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 4, max: 40 })
    .withMessage('Actual journey RID must be between 4 and 40 characters')
    .bail()
    .matches(/^[a-z0-9_-]+$/i)
    .withMessage('Actual journey RID can only contain letters, numbers, underscore, or hyphen'),
  
  // Ensure at least one service identifier is provided
  query().custom((_, { req }) => {
    if (!req.query.serviceIdentifier?.trim() && !req.query.trainUid?.trim()) {
      throw new Error('Select a train from the station timetable first.');
    }

    return true;
  }),
];

// Export validation rule sets
module.exports = { flightLookupRules, trainStationTimetableRules, trainServiceTimetableRules };
