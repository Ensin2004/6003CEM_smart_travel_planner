const axios = require('axios');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');
const currencyRepository = require('./currency.repository');

const FRANKFURTER_BASE_URL = 'https://api.frankfurter.app';
const CACHE_TTL_MS = 60 * 60 * 1000;
const rateCache = new Map();

const recordCurrencyFailure = (message, statusCode, metadata = {}) =>
  apiLogService
    .recordEvent({
      service: 'frankfurter',
      category: 'api',
      severity: statusCode === 429 ? 'warning' : 'error',
      endpoint: 'currency/convert',
      status: 'fail',
      statusCode,
      message,
      metadata,
    })
    .catch((error) => logger.error(`Failed to record currency API event: ${error.message}`));

const getSupportedCurrencies = () => currencyRepository.findSupportedCurrencies();

const getCachedRate = (from, to) => {
  const cacheKey = `${from}:${to}`;
  const cached = rateCache.get(cacheKey);

  if (!cached || Date.now() - cached.createdAt > CACHE_TTL_MS) {
    return null;
  }

  return { ...cached.data, cached: true };
};

const cacheRate = (from, to, data) => {
  rateCache.set(`${from}:${to}`, { data, createdAt: Date.now() });
};

const getExchangeRate = async (from, to) => {
  if (from === to) {
    return {
      available: true,
      base: from,
      target: to,
      rate: 1,
      date: new Date().toISOString().slice(0, 10),
      cached: false,
    };
  }

  const cachedRate = getCachedRate(from, to);

  if (cachedRate) {
    return cachedRate;
  }

  try {
    const response = await axios.get(`${FRANKFURTER_BASE_URL}/latest`, {
      params: { from, to },
      timeout: 5000,
    });

    const rate = response.data?.rates?.[to];

    if (!rate) {
      throw new AppError('Currency rate is temporarily unavailable', 502);
    }

    const exchangeRate = {
      available: true,
      base: response.data.base || from,
      target: to,
      rate,
      date: response.data.date,
      cached: false,
    };

    cacheRate(from, to, exchangeRate);
    return exchangeRate;
  } catch (error) {
    if (error instanceof AppError) {
      recordCurrencyFailure(error.message, error.statusCode, { from, to });
      throw error;
    }

    if (error.response?.status === 429) {
      recordCurrencyFailure('Currency API rate limit reached', 429, { from, to });
      throw new AppError('Currency conversion is busy. Please try again later.', 429);
    }

    const statusCode = error.response?.status >= 500 ? 503 : 502;
    recordCurrencyFailure('Currency service temporarily unavailable', statusCode, { from, to });
    throw new AppError('Currency conversion temporarily unavailable', statusCode);
  }
};

const convertCurrency = async ({ from, to, amount }) => {
  const exchangeRate = await getExchangeRate(from, to);
  const convertedAmount = Number((amount * exchangeRate.rate).toFixed(2));

  return {
    ...exchangeRate,
    amount,
    convertedAmount,
  };
};

module.exports = { getSupportedCurrencies, convertCurrency };
