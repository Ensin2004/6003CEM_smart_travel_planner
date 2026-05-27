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

module.exports = { flightLookupRules };
