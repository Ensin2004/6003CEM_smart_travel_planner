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

// Frankfurter API endpoint for exchange rates
const FRANKFURTER_BASE_URL = 'https://api.frankfurter.app';

// Cache configuration - rates are valid for 1 hour
const CACHE_TTL_MS = 60 * 60 * 1000;

// In-memory rate cache to reduce API calls
const rateCache = new Map();

// Fallback exchange rates based on USD for when the API is unavailable
// These rates should be updated periodically or replaced with a more reliable source
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

/**
 * Retrieves a cached exchange rate if available and not expired.
 * @param {string} from - Source currency code
 * @param {string} to - Target currency code
 * @returns {Object|null} Cached rate data or null if not found or expired
 */
const getCachedRate = (from, to) => {
  const cacheKey = `${from}:${to}`;
  const cached = rateCache.get(cacheKey);

  // Check if cache entry exists and is still within TTL
  if (!cached || Date.now() - cached.createdAt > CACHE_TTL_MS) {
    return null;
  }

  // Return cached data with cached flag set to true
  return { ...cached.data, cached: true };
};

/**
 * Stores an exchange rate in the cache with current timestamp.
 * @param {string} from - Source currency code
 * @param {string} to - Target currency code
 * @param {Object} data - Rate data to cache
 */
const cacheRate = (from, to, data) => {
  rateCache.set(`${from}:${to}`, { data, createdAt: Date.now() });
};

/**
 * Retrieves exchange rate from cache or external API.
 * Uses fallback rates when API is unavailable.
 * 
 * @param {string} from - Source currency code
 * @param {string} to - Target currency code
 * @returns {Promise<Object>} Exchange rate information
 * @throws {AppError} If rate cannot be obtained
 */
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
    // Make API call to Frankfurter for latest exchange rates
    const response = await axios.get(`${FRANKFURTER_BASE_URL}/latest`, {
      params: { from, to },
      timeout: 5000, // 5-second timeout
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
    // Handle AppError instances (already formatted)
    if (error instanceof AppError) {
      recordCurrencyFailure(error.message, error.statusCode, { from, to }, error.code);
      throw error;
    }
    
    // Handle API rate limiting specifically
    if (error.response?.status === 429) {
      recordCurrencyFailure('Currency API rate limit reached', 429, { from, to }, 'RATE_LIMIT_EXCEEDED');
      throw new AppError('Currency conversion is busy. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    }

    // Fallback to approximate rates when API is unavailable
    const fromUsdRate = fallbackUsdRates[from];
    const toUsdRate = fallbackUsdRates[to];

    if (fromUsdRate && toUsdRate) {
      const fallbackRate = Number((toUsdRate / fromUsdRate).toFixed(8));
      const failure = classifyExternalApiError(error);
      recordCurrencyFailure(
        'Currency provider unavailable; approximate fallback rate used',
        failure.statusCode,
        { from, to },
        failure.errorCode
      );
      return {
        available: true,
        base: from,
        target: to,
        rate: fallbackRate,
        date: new Date().toISOString().slice(0, 10),
        cached: false,
        estimated: true, // Flag to indicate this is an estimated rate
      };
    }

    // No fallback available - throw standardized error
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