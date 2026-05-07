const axios = require('axios');
const env = require('../../config/env');

const weatherCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;

const fallbackWeather = (message = 'Weather temporarily unavailable') => ({
  available: false,
  message,
});

const getWeatherByDestination = async (destination) => {
  if (!env.openWeatherApiKey) {
    return fallbackWeather('Weather API key is not configured');
  }

  const cacheKey = destination.toLowerCase();
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: destination,
        appid: env.openWeatherApiKey,
        units: 'metric',
      },
      timeout: 5000,
    });

    const weather = {
      available: true,
      destination,
      temperature: response.data.main.temp,
      humidity: response.data.main.humidity,
      condition: response.data.weather[0].main,
      description: response.data.weather[0].description,
      icon: response.data.weather[0].icon,
      lastUpdated: new Date().toISOString(),
    };

    weatherCache.set(cacheKey, { data: weather, createdAt: Date.now() });
    return weather;
  } catch (error) {
    if (error.response?.status === 401) return fallbackWeather('External service configuration error');
    if (error.response?.status === 429) return fallbackWeather('Weather API rate limit reached');
    return fallbackWeather();
  }
};

module.exports = { getWeatherByDestination };
