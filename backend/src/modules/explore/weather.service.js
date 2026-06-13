/**
 * Explore module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');

const weatherCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;
const FORECAST_DAYS = 16;
const SEASONAL_DAYS = 214;
const HISTORICAL_START_DATE = '2015-01-01';

const dailyUsage = {
  date: '',
  count: 0,
};

const weatherCodeMap = {
  0: ['Clear', 'sun'],
  1: ['Mostly clear', 'sun'],
  2: ['Partly cloudy', 'cloud-sun'],
  3: ['Overcast', 'cloud'],
  45: ['Fog', 'cloud-fog'],
  48: ['Depositing rime fog', 'cloud-fog'],
  51: ['Light drizzle', 'cloud-drizzle'],
  53: ['Drizzle', 'cloud-drizzle'],
  55: ['Dense drizzle', 'cloud-drizzle'],
  61: ['Light rain', 'cloud-rain'],
  63: ['Rain', 'cloud-rain'],
  65: ['Heavy rain', 'cloud-rain'],
  71: ['Light snow', 'cloud-snow'],
  73: ['Snow', 'cloud-snow'],
  75: ['Heavy snow', 'cloud-snow'],
  80: ['Rain showers', 'cloud-rain'],
  81: ['Rain showers', 'cloud-rain'],
  82: ['Heavy rain showers', 'cloud-rain'],
  95: ['Thunderstorm', 'cloud-lightning'],
  96: ['Thunderstorm with hail', 'cloud-lightning'],
  99: ['Thunderstorm with hail', 'cloud-lightning'],
};
const getTodayKey = () => new Date().toISOString().slice(0, 10);
const getDaysFromToday = (date) => {
  const today = new Date(`${getTodayKey()}T00:00:00.000Z`);
  const target = new Date(`${date}T00:00:00.000Z`);
  return Math.round((target - today) / (24 * 60 * 60 * 1000));
};
const fallbackWeather = (message = 'Weather temporarily unavailable') => ({
  available: false,
  message,
});
const consumeDailyQuota = () => {
  const today = getTodayKey();
  const dailyLimit = Math.max(Number(env.openMeteoDailyLimit) || 500, 0);
  if (dailyUsage.date !== today) {
    dailyUsage.date = today;
    dailyUsage.count = 0;
  }

  if (dailyUsage.count >= dailyLimit) {
    return false;
  }

  dailyUsage.count += 1;
  return true;
};
const recordWeatherFailure = (message, statusCode, metadata) =>
  env.nodeEnv === 'test'
    ? Promise.resolve()
    : apiLogService
        .recordEvent({
          service: 'open-meteo',
          category: 'api',
          severity: statusCode === 429 ? 'warning' : 'error',
          endpoint: 'weather',
          status: 'fail',
          statusCode,
          message,
          metadata,
        })
        .catch((error) => logger.error(`Failed to record weather API event: ${error.message}`));
const classifyWeatherError = (error) => {
  if (error.isDailyLimit) {
    return { message: 'Daily weather API limit reached. Please try again tomorrow.', statusCode: 429 };
  }
  if (error.response?.status === 429) {
    return { message: 'Weather API rate limit reached', statusCode: 429 };
  }
  if (error.code === 'ECONNABORTED') {
    return { message: 'Weather temporarily unavailable. Search results are still available.', statusCode: 503 };
  }
  if (!error.response) {
    return { message: 'Weather temporarily unavailable. Search results are still available.', statusCode: 503 };
  }

  return { message: 'Weather temporarily unavailable', statusCode: error.response.status || 503 };
};
const getWeatherCondition = (code) => {
  const [condition, icon] = weatherCodeMap[Number(code)] || ['Weather outlook', 'cloud'];
  return { condition, icon };
};
const getLocationLabel = (location) =>
  location.label || [location.name, location.admin1, location.country].filter(Boolean).join(', ');
const getTravelTip = ({ condition, precipitationAmount, precipitationProbability, temperatureMax, forecastType }) => {
  const lowerCondition = condition.toLowerCase();

  if (forecastType === 'seasonal') {
    return 'Use this as a planning signal, then recheck closer to the travel date.';
  }

  if (lowerCondition.includes('thunder') || precipitationAmount >= 15 || precipitationProbability >= 70) {
    return 'Plan indoor stops, nearby dining, and shorter walking transfers.';
  }

  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
    return 'Keep outdoor plans flexible and save a few indoor options.';
  }

  if (temperatureMax >= 32) {
    return 'Prioritize shaded attractions, water breaks, and air-conditioned food stops.';
  }

  if (temperatureMax <= 8) {
    return 'Choose warm indoor stops and check transit walking time.';
  }

  return 'Good conditions for flexible sightseeing and dining plans.';
};
const geocodeDestination = async (destination) => {
  const response = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
    params: {
      name: destination,
      count: 1,
      language: 'en',
      format: 'json',
    },
    timeout: 5000,
  });

  const location = response.data?.results?.[0];
  if (!location) {
    return null;
  }

  return {
    name: location.name,
    country: location.country,
    countryCode: location.country_code,
    admin1: location.admin1,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timezone || 'auto',
  };
};
const getCoordinateLocation = ({ latitude, longitude, locationLabel }) => {
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return null;
  }

  return {
    name: locationLabel || 'Selected area',
    country: '',
    countryCode: '',
    admin1: '',
    latitude: parsedLatitude,
    longitude: parsedLongitude,
    timezone: 'auto',
    label: locationLabel || `${parsedLatitude.toFixed(4)}, ${parsedLongitude.toFixed(4)}`,
  };
};
const fetchCurrentWeather = async (location) =>
  axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: location.latitude,
      longitude: location.longitude,
      current_weather: true,
    },
    timeout: 30000,
  });
const fetchDailyForecast = async (location, date) =>
  axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: location.latitude,
      longitude: location.longitude,
      daily: ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum'].join(','),
      start_date: date,
      end_date: date,
      timezone: location.timezone || 'auto',
    },
    timeout: 30000,
  });
const fetchSeasonalForecast = async (location, date) =>
  axios.get('https://seasonal-api.open-meteo.com/v1/seasonal', {
    params: {
      latitude: location.latitude,
      longitude: location.longitude,
      daily: ['temperature_2m_mean', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum'].join(','),
      start_date: date,
      end_date: date,
      timezone: location.timezone || 'auto',
    },
    timeout: 30000,
  });
const fetchHistoricalForecast = async (location, date) =>
  axios.get('https://archive-api.open-meteo.com/v1/archive', {
    params: {
      latitude: location.latitude,
      longitude: location.longitude,
      daily: ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean'].join(','),
      start_date: date,
      end_date: date,
      timezone: location.timezone || 'auto',
    },
    timeout: 30000,
  });
const getWeatherLocation = (location) => ({
  name: location.name,
  label: getLocationLabel(location),
  country: location.country,
  admin1: location.admin1,
  latitude: location.latitude,
  longitude: location.longitude,
  timezone: location.timezone,
});
// Daily Forecast prepares forecast, seasonal, and archive daily data for consistent storage.
const normalizeDailyForecast = ({ destination, date, location, response, forecastType }) => {
  const daily = response.data?.daily || {};
  const index = daily.time?.findIndex((time) => time === date) ?? -1;

  if (index < 0) {
    return fallbackWeather('Weather forecast is unavailable for this date.');
  }

  const weatherCode = daily.weather_code?.[index];
  const { condition, icon } = getWeatherCondition(weatherCode);
  const temperatureMax = Number(daily.temperature_2m_max?.[index]);
  const temperatureMin = Number(daily.temperature_2m_min?.[index]);
  const rawTemperatureMean = Number(daily.temperature_2m_mean?.[index]);
  const calculatedTemperatureMean =
    Number.isFinite(temperatureMax) && Number.isFinite(temperatureMin) ? (temperatureMax + temperatureMin) / 2 : null;
  const temperatureMean = Number.isFinite(rawTemperatureMean) ? rawTemperatureMean : calculatedTemperatureMean;
  const precipitationAmount = Number(daily.precipitation_sum?.[index] || 0);
  const precipitationProbability = Number(daily.precipitation_probability_max?.[index]);
  const windSpeedMax = Number(daily.wind_speed_10m_max?.[index]);

  return {
    available: true,
    destination,
    requestedDate: date,
    forecastType,
    source:
      forecastType === 'historical'
        ? 'Open-Meteo Historical Weather'
        : forecastType === 'seasonal'
          ? 'Open-Meteo Seasonal Forecast'
          : 'Open-Meteo Forecast',
    location: getWeatherLocation(location),
    temperature: {
      min: Number.isFinite(temperatureMin) ? temperatureMin : null,
      max: Number.isFinite(temperatureMax) ? temperatureMax : null,
      mean: Number.isFinite(temperatureMean) ? temperatureMean : null,
      unit: 'C',
    },
    condition,
    icon,
    precipitation: {
      amountMm: Number.isFinite(precipitationAmount) ? precipitationAmount : null,
      probability: Number.isFinite(precipitationProbability) ? precipitationProbability : null,
    },
    windSpeed: {
      max: Number.isFinite(windSpeedMax) ? windSpeedMax : null,
      unit: 'km/h',
    },
    travelTip: getTravelTip({
      condition,
      precipitationAmount,
      precipitationProbability,
      temperatureMax,
      forecastType,
    }),
    accuracyNote:
      forecastType === 'historical'
        ? 'Historical weather is based on Open-Meteo Archive API daily data for the searched destination.'
        : forecastType === 'seasonal'
          ? 'Long-range seasonal guidance is approximate and should be rechecked closer to the trip.'
          : 'Forecast is based on Open-Meteo Forecast API daily data for the searched destination.',
    lastUpdated: new Date().toISOString(),
  };
};
const normalizeCurrentWeather = ({ destination, date, location, response }) => {
  const current = response.data?.current_weather || {};
  const temperature = Number(current.temperature);
  const windSpeedMax = Number(current.windspeed);
  const { condition, icon } = getWeatherCondition(current.weathercode);
  return {
    available: true,
    destination,
    requestedDate: date,
    forecastType: 'current',
    source: 'Open-Meteo Forecast',
    location: getWeatherLocation(location),
    temperature: {
      min: Number.isFinite(temperature) ? temperature : null,
      max: Number.isFinite(temperature) ? temperature : null,
      mean: Number.isFinite(temperature) ? temperature : null,
      unit: 'C',
    },
    condition,
    icon,
    precipitation: {
      amountMm: null,
      probability: null,
    },
    windSpeed: {
      max: Number.isFinite(windSpeedMax) ? windSpeedMax : null,
      unit: 'km/h',
    },
    travelTip: getTravelTip({
      condition,
      precipitationAmount: 0,
      precipitationProbability: 0,
      temperatureMax: temperature,
      forecastType: 'current',
    }),
    accuracyNote: 'Current weather uses Open-Meteo Forecast API current_weather data.',
    lastUpdated: new Date().toISOString(),
  };
};
const getWeatherByDestination = async (destination, date = getTodayKey(), locationInput = {}) => {
  const normalizedDestination = (destination || '').trim();
  const requestedDate = date || getTodayKey();
  const daysFromToday = getDaysFromToday(requestedDate);
  const coordinateLocation = getCoordinateLocation(locationInput);
  let resolvedLocation = coordinateLocation;

  if (requestedDate < HISTORICAL_START_DATE) {
    return fallbackWeather('Historical weather is available from 1940-01-01 onward.');
  }

  if (daysFromToday > SEASONAL_DAYS) {
    return fallbackWeather('Weather outlook is available up to about 7 months ahead.');
  }

  const cacheKey = coordinateLocation
    ? `${coordinateLocation.latitude}:${coordinateLocation.longitude}|${requestedDate}`
    : `${normalizedDestination.toLowerCase()}|${requestedDate}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  if (!consumeDailyQuota()) {
    const error = new Error('Daily weather API limit reached. Please try again tomorrow.');
    error.isDailyLimit = true;
    const { message, statusCode } = classifyWeatherError(error);
    recordWeatherFailure(message, statusCode, { destination: normalizedDestination, date: requestedDate });
    return fallbackWeather(message);
  }
  try {
    const location = resolvedLocation || (await geocodeDestination(normalizedDestination));
    resolvedLocation = location;
    if (!location) {
      return fallbackWeather('Destination weather location could not be found. Try a city, state, or country name.');
    }

    const forecastType = daysFromToday < 0 ? 'historical' : daysFromToday === 0 ? 'current' : daysFromToday <= FORECAST_DAYS ? 'forecast' : 'seasonal';
    const response =
      forecastType === 'historical'
        ? await fetchHistoricalForecast(location, requestedDate)
        : forecastType === 'current'
          ? await fetchCurrentWeather(location)
        : forecastType === 'forecast'
          ? await fetchDailyForecast(location, requestedDate)
        : forecastType === 'seasonal'
          ? await fetchSeasonalForecast(location, requestedDate)
          : await fetchDailyForecast(location, requestedDate);
    const weather =
      forecastType === 'current'
        ? normalizeCurrentWeather({
          destination: normalizedDestination,
          date: requestedDate,
          location,
          response,
        })
        : normalizeDailyForecast({
          destination: normalizedDestination,
          date: requestedDate,
          location,
          response,
          forecastType,
        });

    weatherCache.set(cacheKey, { data: weather, createdAt: Date.now() });
    return weather;
  } catch (error) {
    const { message, statusCode } = classifyWeatherError(error);
    recordWeatherFailure(message, statusCode, { destination: normalizedDestination, date: requestedDate });
    return fallbackWeather(message);
  }
};

module.exports = { getWeatherByDestination };
