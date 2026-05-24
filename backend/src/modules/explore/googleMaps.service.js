const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');

const CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 20;
const dailyUsage = {
  date: '',
  count: 0,
};

const serpApiClient = axios.create({
  baseURL: 'https://serpapi.com',
  timeout: 8000,
});

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

const getImageUrl = (image) => {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.url || image.photoUrl || image.thumbnailUrl || image.serpapi_thumbnail || image.image || '';
};

const pickImages = (item = {}) => {
  const candidates = [
    item.images,
    item.photos,
    item.photo_images,
    item.heroImage ? [item.heroImage] : [],
    item.primaryPhoto ? [item.primaryPhoto] : [],
    item.photo ? [item.photo] : [],
    item.image ? [item.image] : [],
    item.cardPhoto ? [item.cardPhoto] : [],
    item.thumbnail ? [item.thumbnail] : [],
    item.serpapi_thumbnail ? [item.serpapi_thumbnail] : [],
  ]
    .flat()
    .map(getImageUrl)
    .filter(Boolean);

  return [...new Set(candidates)];
};

const getOpeningHours = (item = {}) => {
  if (Array.isArray(item.hours)) return item.hours.filter(Boolean).join(' | ');
  if (Array.isArray(item.operating_hours)) return item.operating_hours.filter(Boolean).join(' | ');
  if (typeof item.hours === 'string') return item.hours;
  if (typeof item.operating_hours === 'string') return item.operating_hours;
  return '';
};

const getPriceDetail = (price) => {
  const text = getText(price);

  if (!text) {
    return null;
  }

  const currencyMatchers = [
    [/RM\s*/i, 'MYR'],
    [/MYR\s*/i, 'MYR'],
    [/S\$\s*/i, 'SGD'],
    [/SGD\s*/i, 'SGD'],
    [/US\$\s*/i, 'USD'],
    [/USD\s*/i, 'USD'],
    [/\$\s*/, 'USD'],
    [/\u20ac\s*/, 'EUR'],
    [/EUR\s*/i, 'EUR'],
    [/\u00a3\s*/, 'GBP'],
    [/GBP\s*/i, 'GBP'],
    [/\u00a5\s*/, 'JPY'],
    [/JPY\s*/i, 'JPY'],
    [/\u20a9\s*/, 'KRW'],
    [/KRW\s*/i, 'KRW'],
    [/\u0e3f\s*/, 'THB'],
    [/THB\s*/i, 'THB'],
    [/\u20b9\s*/, 'INR'],
    [/INR\s*/i, 'INR'],
    [/\u20ab\s*/, 'VND'],
    [/VND\s*/i, 'VND'],
    [/\u20b1\s*/, 'PHP'],
    [/PHP\s*/i, 'PHP'],
    [/CNY\s*/i, 'CNY'],
    [/AUD\s*/i, 'AUD'],
    [/CAD\s*/i, 'CAD'],
    [/CHF\s*/i, 'CHF'],
    [/IDR\s*/i, 'IDR'],
  ];
  const match = currencyMatchers.find(([pattern]) => pattern.test(text));
  const amounts = [...text.matchAll(/\d+(?:,\d{3})*(?:\.\d+)?/g)].map((result) =>
    Number(result[0].replace(/,/g, ''))
  );

  return {
    display: text,
    currency: match?.[1] || '',
    amount: Number.isFinite(amounts[0]) ? amounts[0] : null,
    maxAmount: Number.isFinite(amounts[1]) ? amounts[1] : null,
    isRange: amounts.length > 1,
    isTier: /^\$+$/.test(text.trim()),
  };
};

const buildPublicPlaceUrl = (item = {}) => {
  if (item.website) return item.website;

  const query = [getText(item.title || item.name), getText(item.address)].filter(Boolean).join(' ');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '';
};

const getCoordinates = (item = {}) =>
  item.gps_coordinates?.latitude || item.gps_coordinates?.longitude
    ? {
        latitude: item.gps_coordinates.latitude,
        longitude: item.gps_coordinates.longitude,
      }
    : undefined;

const consumeDailyQuota = () => {
  const today = new Date().toISOString().slice(0, 10);
  const dailyLimit = Math.max(Number(env.serpApiDailyLimit) || 100, 0);

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

const normalizePlaceItem = (item = {}, index, defaults = {}) => ({
  id: String(item.place_id || item.data_id || item.data_cid || item.position || index),
  name: getText(item.title || item.name) || defaults.name,
  rating: Number(item.rating || 0) || null,
  reviewCount: Number(item.reviews || 0) || 0,
  category: getText(item.type || item.types?.[0]) || defaults.category,
  openState: getText(item.open_state || item.status),
  hoursSummary: getOpeningHours(item),
  phone: getText(item.phone || item.phone_number || item.telephone),
  imageUrl: pickImage(item),
  imageUrls: pickImages(item),
  address: getText(item.address),
  coordinates: getCoordinates(item),
  url: buildPublicPlaceUrl(item),
});

const recordGoogleMapsFailure = (endpoint, message, statusCode, metadata) =>
  env.nodeEnv === 'test'
    ? Promise.resolve()
    : apiLogService
        .recordEvent({
          service: 'serpapi',
          category: 'api',
          severity: statusCode === 429 ? 'warning' : 'error',
          endpoint,
          status: 'fail',
          statusCode,
          message,
          metadata,
        })
        .catch((error) => logger.error(`Failed to record ${endpoint} API event: ${error.message}`));

const getGoogleMapsFailureMessage = (error) => {
  if (error.isDailyLimit) {
    return { message: 'Daily travel data API limit reached. Please try again tomorrow.', statusCode: 429 };
  }

  if (error.response?.status === 401 || error.response?.status === 403) {
    return { message: 'External service configuration error', statusCode: 502 };
  }

  if (error.response?.status === 429) {
    return { message: 'SerpApi rate limit reached', statusCode: 429 };
  }

  if (error.code === 'ECONNABORTED') {
    return { message: 'External service timeout', statusCode: 503 };
  }

  if (!error.response) {
    return { message: error.message || 'External service network error', statusCode: 503 };
  }

  return { message: error.message || 'External service unavailable', statusCode: error.response.status || 503 };
};

const searchGoogleMaps = async ({ cache, cacheKey, query, start = 0, metadata = {}, mapItem }) => {
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  if (!consumeDailyQuota()) {
    const error = new Error('Daily travel data API limit reached. Please try again tomorrow.');
    error.isDailyLimit = true;
    throw error;
  }

  const response = await serpApiClient.get('/search', {
    params: {
      engine: 'google_maps',
      type: 'search',
      q: query,
      start,
      google_domain: 'google.com',
      hl: 'en',
      api_key: env.serpApiKey,
    },
  });

  if (response.data?.error) {
    throw new Error(response.data.error);
  }

  const rawItems = response.data?.local_results || [];
  const data = {
    available: true,
    ...metadata,
    query,
    nextStart: start + rawItems.length,
    hasMore: rawItems.length >= DEFAULT_PAGE_SIZE || Boolean(response.data?.serpapi_pagination?.next),
    items: rawItems.map(mapItem),
    lastUpdated: new Date().toISOString(),
  };

  cache.set(cacheKey, { data, createdAt: Date.now() });
  return data;
};

module.exports = {
  getGoogleMapsFailureMessage,
  getPriceDetail,
  getText,
  normalizePlaceItem,
  recordGoogleMapsFailure,
  searchGoogleMaps,
};
