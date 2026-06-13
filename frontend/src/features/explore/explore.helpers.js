/**
 * Explore module.
 * Small utilities keep repeated formatting and transformation logic reusable.
 */
import { getApiErrorMessage } from '../../utils/apiError';

export const getErrorMessage = (error) =>
  getApiErrorMessage(error, 'Unable to search right now.');
export const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);
export const getMinWeatherDate = () => '2015-01-01';
export const getMaxWeatherDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 214);
  return getDateKey(date);
};
// Format Weather Date converts raw values into readable display text.
export const formatWeatherDate = (date) =>
  new Intl.DateTimeFormat('en', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
// Format Temperature converts raw values into readable display text.
export const formatTemperature = (value) => (Number.isFinite(Number(value)) ? `${Math.round(Number(value))} C` : '--');
export const formatPercent = (value) => (Number.isFinite(Number(value)) ? `${Math.round(Number(value))}%` : '--');
export const formatSpeed = (value, unit = 'km/h') => (Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)} ${unit}` : '--');
// Format Money converts raw values into readable display text.
export const formatMoney = (amount, currencyCode) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);
export const getPriceConversionKey = (item, targetCurrency) =>
  `${item.id}:${item.priceDetail?.display || item.price || 'price'}:${targetCurrency}`;
