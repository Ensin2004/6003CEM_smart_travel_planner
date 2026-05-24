const env = require('../../config/env');
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

module.exports = { getMapPlaces: searchMapPlaces, getMapPlaceDetails, getMapWeather };
