/**
 * Explore module.
 * Small utilities keep repeated formatting and transformation logic reusable.
 */
import { getApiErrorMessage } from '../../utils/apiError';

/**
 * Retrieves a user-friendly error message from an API error object.
 * Uses a default fallback message when the error cannot be parsed.
 * 
 * @param {Error} error - The error object from an API call
 * @returns {string} A human-readable error message
 */
export const getErrorMessage = (error) =>
  getApiErrorMessage(error, 'Unable to search right now.');

/**
 * Generates a date key string in YYYY-MM-DD format.
 * 
 * @param {Date} date - The date to format (defaults to current date)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

/**
 * Returns the minimum allowed date for weather queries.
 * Fixed at January 1, 2015 as the earliest available historical data.
 * 
 * @returns {string} Minimum date in YYYY-MM-DD format
 */
export const getMinWeatherDate = () => '2015-01-01';

/**
 * Returns the maximum allowed date for weather queries.
 * Calculated as 214 days from the current date.
 * 
 * @returns {string} Maximum date in YYYY-MM-DD format
 */
export const getMaxWeatherDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 214);
  return getDateKey(date);
};

/**
 * Format Weather Date converts raw values into readable display text.
 * Transforms a date string into a formatted display with weekday, day, month, and year.
 * 
 * @param {string} date - Date string in any parseable format
 * @returns {string} Formatted date string (e.g., "Mon, 15 Jan 2024")
 */
export const formatWeatherDate = (date) =>
  new Intl.DateTimeFormat('en', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));

/**
 * Format Temperature converts raw values into readable display text.
 * Formats a numeric temperature value with Celsius unit.
 * 
 * @param {number|string} value - The temperature value to format
 * @returns {string} Formatted temperature string (e.g., "22 C") or "--" if invalid
 */
export const formatTemperature = (value) => (Number.isFinite(Number(value)) ? `${Math.round(Number(value))} C` : '--');

/**
 * Formats a numeric value as a percentage.
 * 
 * @param {number|string} value - The value to format as percentage
 * @returns {string} Formatted percentage string (e.g., "75%") or "--" if invalid
 */
export const formatPercent = (value) => (Number.isFinite(Number(value)) ? `${Math.round(Number(value))}%` : '--');

/**
 * Formats a speed value with the specified unit.
 * 
 * @param {number|string} value - The speed value to format
 * @param {string} unit - The unit of measurement (defaults to 'km/h')
 * @returns {string} Formatted speed string (e.g., "45.5 km/h") or "--" if invalid
 */
export const formatSpeed = (value, unit = 'km/h') => (Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)} ${unit}` : '--');

/**
 * Format Money converts raw values into readable display text.
 * Formats a monetary amount using the specified currency code.
 * 
 * @param {number} amount - The monetary amount to format
 * @param {string} currencyCode - The ISO currency code (e.g., 'USD', 'EUR')
 * @returns {string} Formatted currency string (e.g., "$42.50")
 */
export const formatMoney = (amount, currencyCode) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);

/**
 * Generates a unique cache key for price conversion lookups.
 * Combines item identifier, price display value, and target currency.
 * 
 * @param {Object} item - The item containing price information
 * @param {string} item.id - Unique identifier for the item
 * @param {Object} item.priceDetail - Optional price detail object
 * @param {string} item.price - Fallback price value
 * @param {string} targetCurrency - The target currency code for conversion
 * @returns {string} A unique key string for caching converted prices
 */
export const getPriceConversionKey = (item, targetCurrency) =>
  `${item.id}:${item.priceDetail?.display || item.price || 'price'}:${targetCurrency}`;