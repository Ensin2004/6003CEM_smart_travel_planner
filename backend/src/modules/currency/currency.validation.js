/**
 * Currency module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const { query } = require('express-validator');
const { supportedCurrencies } = require('./currency.model');

/**
 * Creates a validation rule for a currency code query parameter.
 * Ensures the currency code is trimmed, uppercase, and in the supported list.
 * 
 * @param {string} field - The query parameter name (e.g., 'from', 'to')
 * @returns {Object} Express-validator validation chain
 */
const currencyCodeRule = (field) =>
  query(field)
    .trim() // Remove leading/trailing whitespace
    .toUpperCase() // Convert to uppercase for consistent matching
    .isIn(supportedCurrencies) // Verify currency is in the supported list
    .withMessage(`${field} must be a supported currency`);

/**
 * Validation rules for the currency conversion endpoint.
 * Validates source currency, target currency, and conversion amount.
 */
const convertCurrencyRules = [
  currencyCodeRule('from'), // Source currency must be supported
  currencyCodeRule('to'), // Target currency must be supported
  query('amount')
    .isFloat({ min: 0 }) // Amount must be zero or positive
    .withMessage('Amount must be zero or more')
    .toFloat(), // Convert to number type
];

module.exports = { convertCurrencyRules };