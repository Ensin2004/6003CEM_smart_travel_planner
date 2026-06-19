/**
 * Currency module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const { supportedCurrencies, currencyLabels } = require('./currency.model');

/**
 * Retrieves the list of supported currencies with their display labels.
 * Maps currency codes to human-readable names for UI presentation.
 * 
 * @returns {Array<Object>} Array of currency objects with code and label
 */
const findSupportedCurrencies = () =>
  supportedCurrencies.map((code) => ({
    code, // Currency code (e.g., USD, EUR, MYR)
    label: currencyLabels[code], // Human-readable currency name
  }));

module.exports = { findSupportedCurrencies };