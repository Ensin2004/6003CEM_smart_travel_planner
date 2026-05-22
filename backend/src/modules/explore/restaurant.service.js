const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');

const restaurantsCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 20;

const serpApiClient = axios.create({
  baseURL: 'https://serpapi.com',
  timeout: 8000,
});

const fallbackRestaurants = (filters, message = 'Restaurants temporarily unavailable') => ({
  available: false,
  ...filters,
  message,
  items: [],
  hasMore: false,
});

const recordRestaurantsFailure = (message, statusCode, filters) =>
  env.nodeEnv === 'test'
    ? Promise.resolve()
    : apiLogService
        .recordEvent({
          service: 'serpapi',
          category: 'api',
          severity: statusCode === 429 ? 'warning' : 'error',
          endpoint: 'restaurants',
          status: 'fail',
          statusCode,
          message,
          metadata: filters,
        })
        .catch((error) => logger.error(`Failed to record restaurants API event: ${error.message}`));

const getText = (value) => {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value.text || value.string || value.localizedString || value.name || value.title || '';
};

const pickImage = (item = {}) => {
  const image =
    item.serpapi_thumbnail ||
    item.thumbnail ||
    item.heroImage ||
    item.primaryPhoto ||
    item.photo ||
    item.image ||
    item.cardPhoto;

  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.url || image.photoUrl || image.thumbnailUrl || image.sizes?.medium?.url || image.sizes?.small?.url || '';
};

const buildPublicPlaceUrl = (item = {}) => {
  if (item.website) return item.website;

  const query = [getText(item.title || item.name), getText(item.address)].filter(Boolean).join(' ');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '';
};

const normalizeRestaurant = (item = {}, index) => {
  const coordinates = item.gps_coordinates?.latitude || item.gps_coordinates?.longitude
    ? {
        latitude: item.gps_coordinates.latitude,
        longitude: item.gps_coordinates.longitude,
      }
    : undefined;

  return {
    id: String(item.place_id || item.data_id || item.data_cid || item.position || index),
    name: getText(item.title || item.name) || 'Untitled restaurant',
    rating: Number(item.rating || 0) || null,
    reviewCount: Number(item.reviews || 0) || 0,
    category: getText(item.type || item.types?.[0]) || 'Restaurant',
    price: getText(item.price || item.price_level),
    imageUrl: pickImage(item),
    address: getText(item.address),
    coordinates,
    url: buildPublicPlaceUrl(item),
  };
};

const normalizeFilters = (filters = {}) => ({
  destination: (filters.destination || '').trim(),
  country: (filters.country || '').trim(),
  state: (filters.state || '').trim(),
  foodCategory: (filters.foodCategory || '').trim(),
  start: Math.max(Number(filters.start) || 0, 0),
});

const hasRestaurantSearchInput = ({ destination, country, state, foodCategory }) =>
  Boolean(destination || country || state || foodCategory);

const getRestaurantQuery = ({ destination, country, state, foodCategory }) => {
  const categoryPrefix = foodCategory ? `${foodCategory} ` : '';
  const location = [state, country].filter(Boolean).join(', ');

  if (destination && location) {
    return `${categoryPrefix}${destination} restaurants in ${location}`;
  }

  if (destination) {
    return `${categoryPrefix}${destination} restaurants`;
  }

  if (location) {
    return `${categoryPrefix}restaurants in ${location}`;
  }

  return `${categoryPrefix}restaurants`;
};

const getRestaurantsByDestination = async (filters) => {
  const normalizedFilters = normalizeFilters(filters);

  if (!hasRestaurantSearchInput(normalizedFilters)) {
    return fallbackRestaurants(normalizedFilters, 'Enter a restaurant name, country, location, or food category first.');
  }

  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return fallbackRestaurants(normalizedFilters, 'SerpApi key is not configured');
  }

  const cacheKey = JSON.stringify(normalizedFilters).toLowerCase();
  const cached = restaurantsCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  try {
    const response = await serpApiClient.get('/search', {
      params: {
        engine: 'google_maps',
        type: 'search',
        q: getRestaurantQuery(normalizedFilters),
        start: normalizedFilters.start,
        google_domain: 'google.com',
        hl: 'en',
        api_key: env.serpApiKey,
      },
    });

    if (response.data?.error) {
      throw new Error(response.data.error);
    }

    const rawItems = response.data?.local_results || [];
    const restaurants = {
      available: true,
      ...normalizedFilters,
      query: getRestaurantQuery(normalizedFilters),
      nextStart: normalizedFilters.start + rawItems.length,
      hasMore: rawItems.length >= DEFAULT_PAGE_SIZE || Boolean(response.data?.serpapi_pagination?.next),
      items: rawItems.map(normalizeRestaurant),
      lastUpdated: new Date().toISOString(),
    };

    restaurantsCache.set(cacheKey, { data: restaurants, createdAt: Date.now() });
    return restaurants;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      recordRestaurantsFailure('External service configuration error', 502, normalizedFilters);
      return fallbackRestaurants(normalizedFilters, 'External service configuration error');
    }

    if (error.response?.status === 429) {
      recordRestaurantsFailure('SerpApi rate limit reached', 429, normalizedFilters);
      return fallbackRestaurants(normalizedFilters, 'SerpApi rate limit reached');
    }

    const message = error.message || 'Restaurants temporarily unavailable';
    recordRestaurantsFailure(message, error.response?.status || 503, normalizedFilters);
    return fallbackRestaurants(normalizedFilters, message);
  }
};

module.exports = { getRestaurantsByDestination };
