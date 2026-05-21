const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');

const attractionsCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;

const serpApiClient = axios.create({
  baseURL: 'https://serpapi.com',
  timeout: 8000,
});

const fallbackAttractions = (destination, message = 'Attractions temporarily unavailable') => ({
  available: false,
  destination,
  message,
  items: [],
});

const recordAttractionsFailure = (message, statusCode, destination) =>
  env.nodeEnv === 'test'
    ? Promise.resolve()
    : apiLogService
        .recordEvent({
          service: 'serpapi',
          category: 'api',
          severity: statusCode === 429 ? 'warning' : 'error',
          endpoint: 'attractions',
          status: 'fail',
          statusCode,
          message,
          metadata: {
            destination,
          },
        })
        .catch((error) => logger.error(`Failed to record attractions API event: ${error.message}`));

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

const normalizeAttraction = (item = {}, index) => {
  const coordinates = item.gps_coordinates?.latitude || item.gps_coordinates?.longitude
    ? {
        latitude: item.gps_coordinates.latitude,
        longitude: item.gps_coordinates.longitude,
      }
    : undefined;

  return {
    id: String(item.place_id || item.data_id || item.data_cid || item.position || index),
    name: getText(item.title || item.name) || 'Untitled attraction',
    rating: Number(item.rating || 0) || null,
    reviewCount: Number(item.reviews || 0) || 0,
    category: getText(item.type || item.types?.[0]) || 'Attraction',
    imageUrl: pickImage(item),
    address: getText(item.address),
    coordinates,
    url: buildPublicPlaceUrl(item),
  };
};

const getAttractionsByDestination = async (destination) => {
  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return fallbackAttractions(destination, 'SerpApi key is not configured');
  }

  const cacheKey = destination.toLowerCase();
  const cached = attractionsCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  try {
    const response = await serpApiClient.get('/search', {
      params: {
        engine: 'google_maps',
        type: 'search',
        q: `attractions in ${destination}`,
        google_domain: 'google.com',
        hl: 'en',
        api_key: env.serpApiKey,
      },
    });

    if (response.data?.error) {
      throw new Error(response.data.error);
    }

    const rawItems = response.data?.local_results || [];
    const attractions = {
      available: true,
      destination,
      items: rawItems.slice(0, 12).map(normalizeAttraction),
      lastUpdated: new Date().toISOString(),
    };

    attractionsCache.set(cacheKey, { data: attractions, createdAt: Date.now() });
    return attractions;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      recordAttractionsFailure('External service configuration error', 502, destination);
      return fallbackAttractions(destination, 'External service configuration error');
    }

    if (error.response?.status === 429) {
      recordAttractionsFailure('SerpApi rate limit reached', 429, destination);
      return fallbackAttractions(destination, 'SerpApi rate limit reached');
    }

    const message = error.message || 'Attractions temporarily unavailable';
    recordAttractionsFailure(message, error.response?.status || 503, destination);
    return fallbackAttractions(destination, message);
  }
};

module.exports = { getAttractionsByDestination };
