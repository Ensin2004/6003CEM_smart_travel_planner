export const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data?.error || error.message || 'Unable to search right now.';

export const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

export const getMaxWeatherDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 214);
  return getDateKey(date);
};

export const formatWeatherDate = (date) =>
  new Intl.DateTimeFormat('en', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));

export const formatTemperature = (value) => (Number.isFinite(Number(value)) ? `${Math.round(Number(value))} C` : '--');

export const formatMoney = (amount, currencyCode) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);

export const getPriceConversionKey = (item, targetCurrency) =>
  `${item.id}:${item.priceDetail?.display || item.price || 'price'}:${targetCurrency}`;
