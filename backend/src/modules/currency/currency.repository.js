const { supportedCurrencies, currencyLabels } = require('./currency.model');

const findSupportedCurrencies = () =>
  supportedCurrencies.map((code) => ({
    code,
    label: currencyLabels[code],
  }));

module.exports = { findSupportedCurrencies };
