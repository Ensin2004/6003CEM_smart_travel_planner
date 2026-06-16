/**
 * Open-Meteo weather service for current, forecast, seasonal, and historical conditions.
 * Geocoded responses are normalized into one travel-oriented weather contract.
 */
const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');
const { classifyExternalApiError } = require('../../utils/externalApiError');

// Creates an in-memory cache for weather data to reduce redundant API calls
const weatherCache = new Map();
// Sets cache expiration to 30 minutes
const CACHE_TTL_MS = 30 * 60 * 1000;
// Defines the maximum number of forecast days available from standard forecast endpoint
const FORECAST_DAYS = 16;
// Defines the maximum number of days for seasonal outlook (approximately 7 months)
const SEASONAL_DAYS = 214;
// Defines the earliest date for which historical weather data is available
const HISTORICAL_START_DATE = '2015-01-01';

// Tracks daily API usage count to enforce rate limits
const dailyUsage = {
  date: '',
  count: 0,
};

// Maps Open-Meteo weather codes to human-readable conditions and icon names
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

// Returns today's date in ISO YYYY-MM-DD format for quota tracking and comparisons
const getTodayKey = () => new Date().toISOString().slice(0, 10);

// Calculates the number of days between a given date and today
const getDaysFromToday = (date) => {
  const today = new Date(`${getTodayKey()}T00:00:00.000Z`);
  const target = new Date(`${date}T00:00:00.000Z`);
  return Math.round((target - today) / (24 * 60 * 60 * 1000));
};

// Returns a fallback weather object indicating unavailability with a custom message
const fallbackWeather = (message = 'Weather temporarily unavailable') => ({
  available: false,
  message,
});

// Checks and consumes one unit from the daily API quota; returns false if limit exceeded
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

// Records failed weather API calls to the logging service, skipping during test environment
const recordWeatherFailure = (message, statusCode, metadata, errorCode) =>
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
          errorCode,
          message,
          metadata,
        })
        .catch((error) => logger.error(`Failed to record weather API event: ${error.message}`));

// Classifies weather API errors into user-friendly messages based on error type
const classifyWeatherError = (error) => {
  return classifyExternalApiError(error, {
    invalidApiKeyMessage: 'Weather API key is invalid or unauthorized.',
    networkMessage: 'Weather service could not be reached. Search results are still available.',
    rateLimitMessage: error.isDailyLimit
      ? 'Daily weather API limit reached. Please try again tomorrow.'
      : 'Weather API rate limit reached.',
    timeoutMessage: 'Weather request timed out. Search results are still available.',
    unavailableMessage: 'Weather is temporarily unavailable.',
  });
};

// Converts a numeric weather code into a condition description and icon identifier
const getWeatherCondition = (code) => {
  const [condition, icon] = weatherCodeMap[Number(code)] || ['Weather outlook', 'cloud'];
  return { condition, icon };
};

// Builds a human-readable location label from available location fields
const getLocationLabel = (location) =>
  location.label || [location.name, location.admin1, location.country].filter(Boolean).join(', ');

// Generates a travel recommendation based on weather conditions and forecast type
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

// Converts a destination name into geographic coordinates using Open-Meteo geocoding API
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

// Creates a location object from provided coordinates without performing geocoding
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

// Fetches current weather conditions from the Open-Meteo forecast API
const fetchCurrentWeather = async (location) =>
  axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: location.latitude,
      longitude: location.longitude,
      current_weather: true,
    },
    timeout: 30000,
  });

// Fetches daily forecast for a specific date from the Open-Meteo forecast API
const fetchDailyForecast = async (location, date) =>
  axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: location.latitude,
      longitude: location.longitude,
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'precipitation_probability_max',
        'wind_speed_10m_max',
      ].join(','),
      start_date: date,
      end_date: date,
      timezone: location.timezone || 'auto',
    },
    timeout: 30000,
  });

// Fetches seasonal outlook data from the Open-Meteo seasonal API
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

// Fetches historical weather data from the Open-Meteo archive API
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

// Extracts and formats location information for inclusion in weather responses
const getWeatherLocation = (location) => ({
  name: location.name,
  label: getLocationLabel(location),
  country: location.country,
  admin1: location.admin1,
  latitude: location.latitude,
  longitude: location.longitude,
  timezone: location.timezone,
});

// Normalizes daily forecast, seasonal, and archive data into a consistent weather object structure
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

// Normalizes current weather data into the standard weather object structure
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

/**
 * Resolves a destination and returns the best weather dataset for the requested date.
 * @param {string} destination Human-readable destination used for geocoding.
 * @param {string} date ISO date requested by the traveler.
 * @param {object} locationInput Optional known coordinates and location label.
 * @returns {Promise<object>} Normalized weather data or an availability fallback.
 */
const getWeatherByDestination = async (destination, date = getTodayKey(), locationInput = {}) => {
  const normalizedDestination = (destination || '').trim();
  const requestedDate = date || getTodayKey();
  const daysFromToday = getDaysFromToday(requestedDate);
  const coordinateLocation = getCoordinateLocation(locationInput);
  let resolvedLocation = coordinateLocation;

  // Rejects requests for dates before historical data availability
  if (requestedDate < HISTORICAL_START_DATE) {
    return fallbackWeather('Historical weather is available from 1940-01-01 onward.');
  }

  // Rejects requests for dates beyond seasonal forecast range
  if (daysFromToday > SEASONAL_DAYS) {
    return fallbackWeather('Weather outlook is available up to about 7 months ahead.');
  }

  // Builds a cache key based on coordinates or destination name combined with date
  const cacheKey = coordinateLocation
    ? `${coordinateLocation.latitude}:${coordinateLocation.longitude}|${requestedDate}`
    : `${normalizedDestination.toLowerCase()}|${requestedDate}`;
  const cached = weatherCache.get(cacheKey);

  // Returns cached data if still within TTL
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  // Enforces daily quota before making API calls
  if (!consumeDailyQuota()) {
    const error = new Error('Daily weather API limit reached. Please try again tomorrow.');
    error.isDailyLimit = true;
    const { errorCode, message, statusCode } = classifyWeatherError(error);
    recordWeatherFailure(message, statusCode, { destination: normalizedDestination, date: requestedDate }, errorCode);
    return { ...fallbackWeather(message), errorCode };
  }
  try {
    const location = resolvedLocation || (await geocodeDestination(normalizedDestination));
    resolvedLocation = location;
    if (!location) {
      return {
        ...fallbackWeather('Destination weather location could not be found. Try a city, state, or country name.'),
        errorCode: 'NO_RESULTS_FOUND',
      };
    }

    // Determines which forecast type to use based on the requested date relative to today
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
    const { errorCode, message, statusCode } = classifyWeatherError(error);
    recordWeatherFailure(message, statusCode, { destination: normalizedDestination, date: requestedDate }, errorCode);
    return { ...fallbackWeather(message), errorCode };
  }
};

module.exports = { getWeatherByDestination };
