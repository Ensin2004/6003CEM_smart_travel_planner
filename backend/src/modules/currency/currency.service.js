/**
 * Handles currency conversion and supported-currency lookup.
 * Exchange rates are cached briefly in memory to reduce repeated calls to the
 * Frankfurter API while keeping travel budget conversions reasonably fresh.
 */
const axios = require('axios');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');
const currencyRepository = require('./currency.repository');
const { classifyExternalApiError } = require('../../utils/externalApiError');

const FRANKFURTER_BASE_URL = 'https://api.frankfurter.app';
const CACHE_TTL_MS = 60 * 60 * 1000;
const rateCache = new Map();
const fallbackUsdRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  MYR: 4.7,
  SGD: 1.35,
  JPY: 157,
  CNY: 7.25,
  KRW: 1380,
  THB: 36,
  AUD: 1.5,
  CAD: 1.37,
  CHF: 0.9,
  INR: 83,
  IDR: 16200,
  PHP: 58,
  VND: 25400,
  ARS: 900,
  BRL: 5.2,
  CLP: 930,
  COP: 3900,
  MXN: 18,
};

// Failed provider calls are logged for the admin API log view, but logging remains best-effort.
const recordCurrencyFailure = (message, statusCode, metadata = {}, errorCode) =>
  apiLogService
    .recordEvent({
      service: 'frankfurter',
      category: 'api',
      severity: statusCode === 429 ? 'warning' : 'error',
      endpoint: 'currency/convert',
      status: 'fail',
      statusCode,
      errorCode,
      message,
      metadata,
    })
    .catch((error) => logger.error(`Failed to record currency API event: ${error.message}`));

/**
 * Returns currencies enabled for conversion in the application repository.
 * @returns {Promise<Array<object>>} Supported currency records.
 */
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
  // Same-currency conversion never needs a provider request.
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

  // Cached values keep repeated dashboard and trip-card conversions fast for one hour.
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
      throw new AppError('No currency rate was found for this conversion.', 404, 'NO_RESULTS_FOUND');
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
      recordCurrencyFailure(error.message, error.statusCode, { from, to }, error.code);
      throw error;
    }
    if (error.response?.status === 429) {
      recordCurrencyFailure('Currency API rate limit reached', 429, { from, to }, 'RATE_LIMIT_EXCEEDED');
      throw new AppError('Currency conversion is busy. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    }

    const fromUsdRate = fallbackUsdRates[from];
    const toUsdRate = fallbackUsdRates[to];

    if (fromUsdRate && toUsdRate) {
      const fallbackRate = Number((toUsdRate / fromUsdRate).toFixed(8));
      const failure = classifyExternalApiError(error);
      recordCurrencyFailure('Currency provider unavailable; approximate fallback rate used', failure.statusCode, { from, to }, failure.errorCode);
      return {
        available: true,
        base: from,
        target: to,
        rate: fallbackRate,
        date: new Date().toISOString().slice(0, 10),
        cached: false,
        estimated: true,
      };
    }

    const failure = classifyExternalApiError(error, {
      invalidApiKeyMessage: 'Currency API credentials are invalid.',
      networkMessage: 'Currency service could not be reached.',
      rateLimitMessage: 'Currency API rate limit reached.',
      timeoutMessage: 'Currency request timed out.',
      unavailableMessage: 'Currency service temporarily unavailable.',
    });
    recordCurrencyFailure(failure.message, failure.statusCode, { from, to }, failure.errorCode);
    throw new AppError(failure.message, failure.statusCode, failure.errorCode);
  }
};

/**
 * Converts an amount using a live, cached, or approximate exchange rate.
 * @param {{from: string, to: string, amount: number}} input Conversion request.
 * @returns {Promise<object>} Rate metadata and the converted amount.
 */
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
