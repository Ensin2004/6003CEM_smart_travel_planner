/**
 * Map module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');
const weatherService = require('../explore/weather.service');
const mapRepository = require('./map.repository');
const {
  getGoogleMapsFailureMessage,
  getPriceDetail,
  getText,
  normalizePlaceItem,
  recordGoogleMapsFailure,
  searchGoogleMaps,
} = require('../explore/googleMaps.service');

const CACHE_TTL_MS = 30 * 60 * 1000;
const inMemoryCache = new Map();
const geoapifyClient = axios.create({
  baseURL: 'https://api.geoapify.com',
  timeout: 8000,
});

const mapCategoryQueries = {
  hotels: 'hotels',
  airports: 'airports',
  train: 'train stations',
  food: 'restaurants',
  attractions: 'tourist attractions',
  shopping: 'shopping malls',
};
const fallbackPlaces = (category, message = 'Map place details temporarily unavailable') => ({
  available: false,
  category,
  message,
  items: [],
});
const fallbackLocation = ({ latitude, longitude }, message = 'Current location name unavailable') => ({
  available: false,
  message,
  label: 'current area',
  state: '',
  country: '',
  coordinates: {
    latitude: Number(latitude),
    longitude: Number(longitude),
  },
});
const recordMapGeocodeFailure = (message, statusCode, metadata = {}) => {
  logger.warn(`Geoapify reverse geocode failed: ${message}`);
  if (env.nodeEnv === 'test') {
    return;
  }

  apiLogService
    .recordEvent({
      service: 'geoapify',
      category: 'map',
      severity: statusCode >= 500 ? 'error' : 'warning',
      method: 'GET',
      endpoint: '/v1/geocode/reverse',
      status: 'fail',
      statusCode,
      message,
      metadata,
    })
    .catch((error) => logger.error(`Failed to record map geocode event: ${error.message}`));
};
// Normalize Map Place prepares incoming data for consistent storage.
const normalizeMapPlace = (item = {}, index, category = 'attractions') => {
  const normalized = normalizePlaceItem(item, index, {
    name: 'Untitled place',
    category,
  });
  const price = getText(item.price || item.price_level);

  return {
    ...normalized,
    id: String(item.place_id || item.data_id || item.data_cid || item.position || normalized.id || index),
    categoryId: category,
    price,
    priceDetail: getPriceDetail(item.price || item.price_level),
    hours: normalized.hoursSummary || normalized.openState || '',
    reviews: normalized.reviewCount,
    summary: [
      normalized.category,
      normalized.openState,
      price ? `Price: ${price}` : '',
    ]
      .filter(Boolean)
      .join(' | '),
    lat: normalized.coordinates?.latitude || null,
    lng: normalized.coordinates?.longitude || null,
  };
};
const getCache = async (cacheKey) => {
  const cached = inMemoryCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  if (env.nodeEnv === 'test') {
    return null;
  }
  try {
    const databaseCache = await mapRepository.findValidCache(cacheKey);
    return databaseCache ? { ...databaseCache.data, cached: true } : null;
  } catch {
    return null;
  }
};
const setCache = async (cacheKey, data) => {
  inMemoryCache.set(cacheKey, { data, createdAt: Date.now() });

  if (env.nodeEnv === 'test') {
    return;
  }
  try {
    await mapRepository.upsertCache(cacheKey, data, CACHE_TTL_MS);
  } catch {
    // In-memory cache still prevents repeated calls during this process.
  }
};
// Build Near Query transforms source data into the shape required nearby.
const buildNearQuery = ({ category, destination, latitude, longitude }) => {
  const baseQuery = mapCategoryQueries[category] || mapCategoryQueries.attractions;
  const locationText = destination || `${Number(latitude).toFixed(5)},${Number(longitude).toFixed(5)}`;

  return `${baseQuery} near ${locationText}`;
};
const searchMapPlaces = async ({ category, destination, latitude, longitude, limit = 30 }) => {
  const parsedLimit = Math.min(Math.max(Number(limit) || 30, 1), 60);
  const cacheKey = [
    'places',
    category,
    destination || '',
    Number(latitude).toFixed(4),
    Number(longitude).toFixed(4),
    parsedLimit,
  ].join('|');
  const cached = await getCache(cacheKey);

  if (cached) {
    return cached;
  }
  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return fallbackPlaces(category, 'SerpApi key is not configured');
  }
  try {
    const places = await searchGoogleMaps({
      cache: new Map(),
      cacheKey,
      query: buildNearQuery({ category, destination, latitude, longitude }),
      metadata: { category, destination },
      mapItem: (item, index) => normalizeMapPlace(item, index, category),
    });
    const publicPlaces = {
      available: true,
      category,
      destination,
      items: places.items
        .filter((place) => Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng)))
        .slice(0, parsedLimit),
      lastUpdated: places.lastUpdated,
    };

    await setCache(cacheKey, publicPlaces);
    return publicPlaces;
  } catch (error) {
    const { message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('map-places', message, statusCode, { category, destination, latitude, longitude });
    return fallbackPlaces(category, message);
  }
};
const getMapPlaceDetails = async ({ category, name, address, latitude, longitude }) => {
  const fallbackName = name || 'Selected place';
  const cacheKey = ['detail', category, fallbackName, address || '', latitude || '', longitude || ''].join('|').toLowerCase();
  const cached = await getCache(cacheKey);

  if (cached) {
    return cached;
  }
  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return {
      available: false,
      message: 'SerpApi key is not configured',
      item: null,
    };
  }
  try {
    const detailResults = await searchGoogleMaps({
      cache: new Map(),
      cacheKey,
      query: [fallbackName, address].filter(Boolean).join(' '),
      metadata: { category },
      mapItem: (item, index) => normalizeMapPlace(item, index, category),
    });
    const item = detailResults.items?.[0] || null;
    const details = {
      available: Boolean(item),
      message: item ? '' : 'Place details were not found.',
      item,
      lastUpdated: detailResults.lastUpdated,
    };

    await setCache(cacheKey, details);
    return details;
  } catch (error) {
    const { message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('map-place-details', message, statusCode, { category, name, address });
    return {
      available: false,
      message,
      item: null,
    };
  }
};
const getMapWeather = ({ destination, date, latitude, longitude, locationLabel }) =>
  weatherService.getWeatherByDestination(destination, date, {
    latitude,
    longitude,
    locationLabel,
  });
const normalizeReverseGeocodeLocation = (feature = {}, coordinates = {}) => {
  const properties = feature.properties || {};
  const state = properties.state || properties.county || properties.city || '';
  const country = properties.country || '';
  const city = properties.city || properties.town || properties.village || properties.suburb || '';
  const labelParts = [city && city !== state ? city : '', state, country].filter(Boolean);

  return {
    available: Boolean(labelParts.length),
    message: labelParts.length ? '' : 'Current location name unavailable',
    label: labelParts.join(', ') || 'current area',
    city,
    state,
    country,
    countryCode: properties.country_code?.toUpperCase() || '',
    formatted: properties.formatted || labelParts.join(', '),
    coordinates: {
      latitude: Number(coordinates.latitude),
      longitude: Number(coordinates.longitude),
    },
  };
};
const getReverseGeocodeLocation = async ({ latitude, longitude }) => {
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  const cacheKey = ['reverse-geocode', parsedLatitude.toFixed(4), parsedLongitude.toFixed(4)].join('|');
  const cached = await getCache(cacheKey);

  if (cached) {
    return cached;
  }
  if (!env.geoapifyApiKey || env.nodeEnv === 'test') {
    return fallbackLocation({ latitude: parsedLatitude, longitude: parsedLongitude }, 'Geoapify API key is not configured');
  }

  try {
    const response = await geoapifyClient.get('/v1/geocode/reverse', {
      params: {
        lat: parsedLatitude,
        lon: parsedLongitude,
        apiKey: env.geoapifyApiKey,
      },
    });
    const feature = response.data?.features?.[0];
    const location = feature
      ? normalizeReverseGeocodeLocation(feature, { latitude: parsedLatitude, longitude: parsedLongitude })
      : fallbackLocation({ latitude: parsedLatitude, longitude: parsedLongitude });

    await setCache(cacheKey, location);
    return location;
  } catch (error) {
    const statusCode = error.response?.status || 503;
    const message =
      statusCode === 429
        ? 'Location lookup rate limit reached'
        : statusCode >= 500
          ? 'Location lookup is temporarily unavailable'
          : 'Unable to identify current location';
    recordMapGeocodeFailure(message, statusCode, { latitude: parsedLatitude, longitude: parsedLongitude });
    return fallbackLocation({ latitude: parsedLatitude, longitude: parsedLongitude }, message);
  }
};
module.exports = { getMapPlaces: searchMapPlaces, getMapPlaceDetails, getMapWeather, getReverseGeocodeLocation };
