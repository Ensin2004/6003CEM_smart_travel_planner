/**
 * Currency module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const { supportedCurrencies, currencyLabels } = require('./currency.model');
const findSupportedCurrencies = () =>
  supportedCurrencies.map((code) => ({
    code,
    label: currencyLabels[code],
  }));
module.exports = { findSupportedCurrencies };
