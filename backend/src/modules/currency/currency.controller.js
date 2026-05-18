const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const currencyService = require('./currency.service');

const getCurrencies = catchAsync(async (req, res) => {
  const currencies = currencyService.getSupportedCurrencies();
  sendSuccess(res, 200, { currencies });
});

const convertCurrency = catchAsync(async (req, res) => {
  const conversion = await currencyService.convertCurrency({
    from: req.query.from,
    to: req.query.to,
    amount: req.query.amount,
  });

  sendSuccess(res, 200, { conversion });
});

module.exports = { getCurrencies, convertCurrency };
