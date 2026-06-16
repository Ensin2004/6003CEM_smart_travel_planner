/**
 * Currency module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const currencyService = require('./currency.service');

/**
 * Retrieves the list of supported currencies for the application.
 * Returns currency codes and display names for selection in UI components.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with currencies array
 */
const getCurrencies = catchAsync(async (req, res) => {
  const currencies = currencyService.getSupportedCurrencies();
  sendSuccess(res, 200, { currencies });
});

/**
 * Converts an amount from one currency to another.
 * Uses exchange rates to perform real-time or cached conversion.
 * 
 * @param {Object} req - Express request object with query parameters (from, to, amount)
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with conversion result
 */
const convertCurrency = catchAsync(async (req, res) => {
  const conversion = await currencyService.convertCurrency({
    from: req.query.from, // Source currency code (e.g., USD)
    to: req.query.to, // Target currency code (e.g., EUR)
    amount: req.query.amount, // Amount to convert
  });

  sendSuccess(res, 200, { conversion });
});

module.exports = { getCurrencies, convertCurrency };