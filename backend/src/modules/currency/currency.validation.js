const { query } = require('express-validator');
const { supportedCurrencies } = require('./currency.model');

const currencyCodeRule = (field) =>
  query(field)
    .trim()
    .toUpperCase()
    .isIn(supportedCurrencies)
    .withMessage(`${field} must be a supported currency`);

const convertCurrencyRules = [
  currencyCodeRule('from'),
  currencyCodeRule('to'),
  query('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be zero or more')
    .toFloat(),
];

module.exports = { convertCurrencyRules };
