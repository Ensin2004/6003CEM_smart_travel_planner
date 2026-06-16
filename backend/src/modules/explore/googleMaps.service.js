/**
 * Shared SerpApi Google Maps adapter used by Explore place services.
 * Centralizes response normalization, caching, quota checks, reviews, and photos.
 */
const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');
const { classifyExternalApiError } = require('../../utils/externalApiError');

const CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PHOTO_PAGE_LIMIT = 2;
const dailyUsage = {
  date: '',
  count: 0,
};

const serpApiClient = axios.create({
  baseURL: 'https://serpapi.com',
  timeout: 8000,
});
const allowedImageHosts = new Set([
  'lh3.googleusercontent.com',
  'streetviewpixels-pa.googleapis.com',
  'serpapi.com',
]);
const getText = (value) => {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value.text || value.string || value.localizedString || value.name || value.title || '';
};
const pickImage = (item = {}) => {
  const image =
    item.thumbnail ||
    item.heroImage ||
    item.primaryPhoto ||
    item.photo ||
    item.image ||
    item.cardPhoto ||
    item.serpapi_thumbnail;

  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.url || image.photoUrl || image.thumbnailUrl || image.sizes?.medium?.url || image.sizes?.small?.url || '';
};
const getImageUrl = (image) => {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return (
    image.url ||
    image.photoUrl ||
    image.photo_url ||
    image.thumbnailUrl ||
    image.thumbnail ||
    image.image ||
    image.image_url ||
    image.original ||
    image.link ||
    image.source ||
    image.serpapi_thumbnail ||
    ''
  );
};
const getImageDedupeKey = (imageUrl) => {
  try {
    const parsedUrl = new URL(imageUrl);
    return `${parsedUrl.origin}${parsedUrl.pathname.replace(/=[^/]+$/i, '')}`;
  } catch {
    return imageUrl.split('?')[0].replace(/=[^/]+$/i, '');
  }
};
const flattenImageCandidates = (value) => {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(flattenImageCandidates);
  if (typeof value === 'object') {
    const directUrl = getImageUrl(value);
    const nestedImages = [
      value.images,
      value.photos,
      value.items,
      value.results,
      value.thumbnails,
      value.sizes,
    ].flatMap(flattenImageCandidates);

    return [directUrl, ...nestedImages].filter(Boolean);
  }

  return [];
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
    !item.thumbnail && item.serpapi_thumbnail ? [item.serpapi_thumbnail] : [],
  ]
    .flatMap(flattenImageCandidates)
    .filter(Boolean);

  const seenImageKeys = new Set();
  return candidates.filter((imageUrl) => {
    const key = getImageDedupeKey(imageUrl);
    if (seenImageKeys.has(key)) return false;
    seenImageKeys.add(key);
    return true;
  });
};
const mergePlaceImages = (place = {}, imageUrls = []) => {
  const mergedImageUrls = pickImages({
    ...place,
    images: [
      place.imageUrl,
      place.imageUrls,
      imageUrls,
    ],
  });

  return {
    ...place,
    imageUrl: mergedImageUrls[0] || place.imageUrl || '',
    imageUrls: mergedImageUrls,
  };
};
const getOpeningHours = (item = {}) => {
  if (Array.isArray(item.hours)) return item.hours.filter(Boolean).join(' | ');
  if (Array.isArray(item.operating_hours)) return item.operating_hours.filter(Boolean).join(' | ');
  if (typeof item.hours === 'string') return item.hours;
  if (typeof item.operating_hours === 'string') return item.operating_hours;
  return '';
};
const countryCurrencyHints = [
  [/argentina/i, 'ARS'],
  [/brazil/i, 'BRL'],
  [/chile/i, 'CLP'],
  [/colombia/i, 'COP'],
  [/mexico/i, 'MXN'],
  [/malaysia/i, 'MYR'],
  [/singapore/i, 'SGD'],
  [/thailand/i, 'THB'],
  [/indonesia/i, 'IDR'],
  [/vietnam/i, 'VND'],
  [/philippines/i, 'PHP'],
  [/india/i, 'INR'],
  [/japan/i, 'JPY'],
  [/south korea|korea/i, 'KRW'],
  [/china/i, 'CNY'],
  [/australia/i, 'AUD'],
  [/canada/i, 'CAD'],
  [/switzerland/i, 'CHF'],
  [/united kingdom|england|scotland|wales/i, 'GBP'],
];
const inferCurrencyFromContext = (context = {}) => {
  const locationText = [context.country, context.state, context.destination, context.address]
    .filter(Boolean)
    .join(' ');
  const matchedHint = countryCurrencyHints.find(([pattern]) => pattern.test(locationText));
  return matchedHint?.[1] || '';
};
const getCurrencyDisplayPrefix = (currency) => {
  if (currency === 'MYR') return 'RM';
  if (currency === 'SGD') return 'S$';
  return currency;
};
const parsePriceNumber = (value = '') => {
  const normalizedValue = String(value).replace(/\s/g, '');

  if (normalizedValue.includes(',') && normalizedValue.includes('.')) {
    const lastComma = normalizedValue.lastIndexOf(',');
    const lastDot = normalizedValue.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    return Number(normalizedValue.replaceAll(thousandsSeparator, '').replace(decimalSeparator, '.'));
  }

  if (/^\d{1,3}(?:\.\d{3})+$/.test(normalizedValue)) {
    return Number(normalizedValue.replaceAll('.', ''));
  }

  if (/^\d{1,3}(?:,\d{3})+$/.test(normalizedValue)) {
    return Number(normalizedValue.replaceAll(',', ''));
  }

  if (/^\d+,\d{1,2}$/.test(normalizedValue)) {
    return Number(normalizedValue.replace(',', '.'));
  }

  return Number(normalizedValue.replace(/,/g, ''));
};
const getPriceDetail = (price, context = {}) => {
  const text = getText(price);
  if (!text) {
    return null;
  }

  const contextCurrency = inferCurrencyFromContext(context);
  const currencyMatchers = [
    [/RM\s*/i, 'MYR'],
    [/MYR\s*/i, 'MYR'],
    [/US\$\s*/i, 'USD'],
    [/USD\s*/i, 'USD'],
    [/S\$\s*/i, 'SGD'],
    [/SGD\s*/i, 'SGD'],
    [/ARS\s*/i, 'ARS'],
    [/ARG\$\s*/i, 'ARS'],
    [/R\$\s*/i, 'BRL'],
    [/BRL\s*/i, 'BRL'],
    [/CLP\s*/i, 'CLP'],
    [/COP\s*/i, 'COP'],
    [/MXN\s*/i, 'MXN'],
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
    [/\$\s*/, contextCurrency || 'USD'],
  ];
  const match = currencyMatchers.find(([pattern]) => pattern.test(text));
  const amounts = [...text.matchAll(/\d+(?:[.,]\d+)*/g)]
    .map((result) => parsePriceNumber(result[0]))
    .filter((amount) => Number.isFinite(amount));
  const hasAmbiguousDollarAmount = /^\$\s*\d/.test(text.trim());
  const display =
    hasAmbiguousDollarAmount && contextCurrency && contextCurrency !== 'USD'
      ? text.replace(/^\$\s*/, `${getCurrencyDisplayPrefix(contextCurrency)} `)
      : text;

  return {
    display,
    currency: match?.[1] || '',
    amount: Number.isFinite(amounts[0]) ? amounts[0] : null,
    maxAmount: Number.isFinite(amounts[1]) ? amounts[1] : null,
    isRange: amounts.length > 1,
    isTier: /^\$+$/.test(text.trim()),
  };
};
// Build Public Place Url transforms source data into the shape required nearby.
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
// Normalize Place Item prepares incoming data for consistent storage.
const normalizePlaceItem = (item = {}, index, defaults = {}) => ({
  id: String(item.place_id || item.data_id || item.data_cid || item.position || index),
  placeId: getText(item.place_id),
  dataId: getText(item.data_id || item.data_cid),
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
const recordGoogleMapsFailure = (endpoint, message, statusCode, metadata, errorCode) =>
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
          errorCode,
          message,
          metadata,
        })
        .catch((error) => logger.error(`Failed to record ${endpoint} API event: ${error.message}`));
const getGoogleMapsFailureMessage = (error) => {
  return classifyExternalApiError(error, {
    // Message shown when API key is missing, expired, or invalid
    invalidApiKeyMessage: 'SerpApi key is invalid or unauthorized.',

    // Message shown for network connectivity issues (DNS failures, connection refused, etc.)
    networkMessage: 'SerpApi could not be reached.',

    // Rate limit message with conditional logic:
    // - If error.isDailyLimit flag is true → custom daily limit message
    // - Otherwise → generic SerpApi rate limit message
    rateLimitMessage: error.isDailyLimit
      ? 'Daily travel data API limit reached. Please try again tomorrow.'
      : 'SerpApi rate limit reached.',

    // Message shown when request exceeds the 8-second timeout threshold
    timeoutMessage: 'SerpApi request timed out.',

    // Message shown when SerpApi returns 5xx server errors or is under maintenance
    unavailableMessage: 'SerpApi is temporarily unavailable.',
  });
};
const getLocalResults = (data = {}) => {
  const candidates = [
    data.local_results,
    data.local_results?.places,
    data.places_results,
    data.place_results ? [data.place_results] : [],
  ];

  return candidates.find((candidate) => Array.isArray(candidate)) || [];
};
/**
 * Searches Google Maps through SerpApi and maps provider rows to application records.
 * @param {object} options Cache, query, pagination, metadata, and item mapper options.
 * @returns {Promise<object>} Normalized search results with pagination metadata.
 */
const searchGoogleMaps = async ({ cache, cacheKey, query, start = 0, metadata = {}, mapItem }) => {
  // Check cache for existing results before making API call
  const cached = cache.get(cacheKey);

  // Return cached data if it exists and hasn't expired (30-minute TTL)
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  // Enforce daily API quota - throws error if limit exceeded
  if (!consumeDailyQuota()) {
    const error = new Error('Daily travel data API limit reached. Please try again tomorrow.');
    error.isDailyLimit = true;
    throw error;
  }

  // Execute SerpApi Google Maps search request
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

  // Check for API-level errors (e.g., invalid API key, malformed request)
  if (response.data?.error) {
    throw new Error(response.data.error);
  }

  // Extract local results array from the nested response structure
  const rawItems = getLocalResults(response.data);
  
  // Construct normalized response object
  const data = {
    available: rawItems.length > 0,
    ...metadata,
    query,
    nextStart: start + rawItems.length,
    hasMore: rawItems.length >= DEFAULT_PAGE_SIZE || Boolean(response.data?.serpapi_pagination?.next),
    items: rawItems.map(mapItem),
    message: rawItems.length ? '' : `No Google Maps results found for "${query}".`,
    lastUpdated: new Date().toISOString(),
  };

  // Cache successful responses only when results are found
  // Empty results are not cached to allow retrying later
  if (rawItems.length) {
    cache.set(cacheKey, { data, createdAt: Date.now() });
  }
  return data;
};
// Normalize Review prepares incoming data for consistent storage.
const normalizeReview = (review = {}, index = 0) => ({
  id: String(review.review_id || review.link || review.user?.link || index),
  author: getText(review.user?.name || review.user || review.author || review.name) || 'Google user',
  authorLink: getText(review.user?.link || review.user?.profile || review.link),
  avatarUrl: getText(review.user?.thumbnail || review.user?.image || review.user?.avatar || review.profile_photo_url || review.thumbnail),
  rating: Number(review.rating || 0) || null,
  date: getText(review.date || review.iso_date || review.relative_time_description),
  text: getText(review.snippet || review.text || review.review),
  likes: Number(review.likes || 0) || 0,
  ownerReply: {
    author: getText(review.response?.author || review.owner_answer?.author || review.reply?.author) || 'Owner response',
    date: getText(review.response?.date || review.owner_answer?.date || review.reply?.date),
    text: getText(review.response?.snippet || review.response?.text || review.owner_answer?.snippet || review.owner_answer?.text || review.reply?.text),
  },
});
/**
 * Retrieves a page of normalized Google Maps reviews for a place.
 * @param {object} options Place identifiers, sort order, locale, and page token.
 * @returns {Promise<object>} Review items and the next-page token.
 */
const searchGoogleMapsReviews = async ({ dataId, placeId, sortBy = 'qualityScore', hl = 'en', nextPageToken = '' }) => {
  if (!dataId && !placeId) {
    return { available: false, message: 'Google review identifier is unavailable', items: [] };
  }

  if (!consumeDailyQuota()) {
    const error = new Error('Daily travel data API limit reached. Please try again tomorrow.');
    error.isDailyLimit = true;
    throw error;
  }
  const params = {
    engine: 'google_maps_reviews',
    sort_by: sortBy,
    hl,
    api_key: env.serpApiKey,
  };
  if (dataId) {
    params.data_id = dataId;
  } else {
    params.place_id = placeId;
  }

  if (nextPageToken) {
    params.next_page_token = nextPageToken;
  }

  const response = await serpApiClient.get('/search', { params });
  if (response.data?.error) {
    throw new Error(response.data.error);
  }

  const rawReviews = response.data?.reviews || [];
  return {
    available: true,
    items: rawReviews.map(normalizeReview),
    nextPageToken: response.data?.serpapi_pagination?.next_page_token || '',
    lastUpdated: new Date().toISOString(),
  };
};
/**
 * Retrieves and deduplicates Google Maps photo URLs across limited result pages.
 * @param {object} options Place identifier, locale, and maximum page count.
 * @returns {Promise<object>} Photo URLs and remaining pagination metadata.
 */
const searchGoogleMapsPhotos = async ({ dataId, hl = 'en', maxPages = DEFAULT_PHOTO_PAGE_LIMIT }) => {
  if (!dataId) {
    return { available: false, message: 'Google photo identifier is unavailable', imageUrls: [] };
  }

  const allPhotos = [];
  let nextPageToken = '';
  let pageCount = 0;

  do {
    if (!consumeDailyQuota()) {
      const error = new Error('Daily travel data API limit reached. Please try again tomorrow.');
      error.isDailyLimit = true;
      throw error;
    }

    const params = {
      engine: 'google_maps_photos',
      data_id: dataId,
      hl,
      api_key: env.serpApiKey,
    };

    if (nextPageToken) {
      params.next_page_token = nextPageToken;
    }

    const response = await serpApiClient.get('/search', { params });
    if (response.data?.error) {
      throw new Error(response.data.error);
    }

    allPhotos.push(...(response.data?.photos || []));
    nextPageToken = response.data?.serpapi_pagination?.next_page_token || '';
    pageCount += 1;
  } while (nextPageToken && pageCount < maxPages);

  return {
    available: allPhotos.length > 0,
    imageUrls: pickImages({ photos: allPhotos }),
    nextPageToken,
    lastUpdated: new Date().toISOString(),
  };
};
/**
 * Proxies an image from an approved Google or SerpApi host.
 * @param {string} imageUrl Remote HTTPS image URL.
 * @returns {Promise<object>} Image stream and response headers for the controller.
 * @throws {Error} When the URL is invalid, disallowed, or not an image response.
 */
const fetchGooglePlaceImage = async (imageUrl = '') => {
  let parsedUrl;

  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    const error = new Error('Invalid image URL');
    error.statusCode = 400;
    throw error;
  }

  if (parsedUrl.protocol !== 'https:' || !allowedImageHosts.has(parsedUrl.hostname)) {
    const error = new Error('Image host is not allowed');
    error.statusCode = 400;
    throw error;
  }

  const response = await axios.get(parsedUrl.toString(), {
    responseType: 'stream',
    timeout: 15000,
    maxRedirects: 3,
    headers: {
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'user-agent': 'Mozilla/5.0 SmartTravelPlanner/1.0',
    },
  });
  const contentType = response.headers['content-type'] || '';

  if (!contentType.startsWith('image/')) {
    const error = new Error('Remote URL did not return an image');
    error.statusCode = 502;
    throw error;
  }

  return {
    stream: response.data,
    contentType,
    contentLength: response.headers['content-length'] || '',
    cacheControl: response.headers['cache-control'] || 'public, max-age=86400',
  };
};
module.exports = {
  fetchGooglePlaceImage,
  getGoogleMapsFailureMessage,
  getPriceDetail,
  getText,
  mergePlaceImages,
  normalizePlaceItem,
  recordGoogleMapsFailure,
  searchGoogleMaps,
  searchGoogleMapsPhotos,
  searchGoogleMapsReviews,
};
