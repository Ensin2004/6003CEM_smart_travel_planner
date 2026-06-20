/**
 * Shared SerpApi Google Maps adapter used by Explore place services.
 * Centralizes response normalization, caching, quota checks, reviews, and photos.
 */
const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');
const { classifyExternalApiError } = require('../../utils/externalApiError');

// Cache lifetime: 30 minutes for search results
const CACHE_TTL_MS = 30 * 60 * 1000;
// Default number of results per page
const DEFAULT_PAGE_SIZE = 20;
// Maximum photo pages to fetch
const DEFAULT_PHOTO_PAGE_LIMIT = 2;

// Daily usage tracking object for SerpApi quota management
const dailyUsage = {
  date: '', // Current tracking date (YYYY-MM-DD)
  count: 0, // Number of requests made today
};

// Pre-configured axios client for SerpApi
const serpApiClient = axios.create({
  baseURL: 'https://serpapi.com',
  timeout: 8000, // 8-second timeout for API calls
});

// Allowed image hosts for security - only these domains can be proxied
const allowedImageHosts = new Set([
  'lh3.googleusercontent.com', // Google static images
  'streetviewpixels-pa.googleapis.com', // Google Street View
  'serpapi.com', // SerpApi hosted images
]);

/**
 * Extracts text content from various data structures.
 * Handles strings, numbers, and objects with text/string properties.
 * 
 * @param {*} value - Value to extract text from
 * @returns {string} Extracted text as string
 */
const getText = (value) => {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value.text || value.string || value.localizedString || value.name || value.title || '';
};

/**
 * Picks a single primary image URL from a place item.
 * Tries multiple possible image field names in order of preference.
 * 
 * @param {Object} item - Place item with image fields
 * @returns {string} First available image URL or empty string
 */
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

/**
 * Extracts image URL from various image object formats.
 * @param {*} image - Image object or string
 * @returns {string} Image URL as string
 */
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

/**
 * Creates a deduplication key for an image URL.
 * Strips query parameters and trailing path segments for accurate comparison.
 * 
 * @param {string} imageUrl - Image URL to deduplicate
 * @returns {string} Deduplication key
 */
const getImageDedupeKey = (imageUrl) => {
  try {
    const parsedUrl = new URL(imageUrl);
    // Remove query parameters and trailing path segments like =w200-h200
    return `${parsedUrl.origin}${parsedUrl.pathname.replace(/=[^/]+$/i, '')}`;
  } catch {
    return imageUrl.split('?')[0].replace(/=[^/]+$/i, '');
  }
};

/**
 * Flattens nested image candidates into an array of URLs.
 * Recursively handles arrays and objects for deep extraction.
 * 
 * @param {*} value - Value to flatten
 * @returns {Array<string>} Flattened array of image URLs
 */
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

/**
 * Picks and deduplicates all image URLs from a place item.
 * Combines multiple image sources and removes duplicates.
 * 
 * @param {Object} item - Place item with image fields
 * @returns {Array<string>} Deduplicated array of image URLs
 */
const pickImages = (item = {}) => {
  // Collect all potential image sources
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

  // Deduplicate using normalized keys
  const seenImageKeys = new Set();
  return candidates.filter((imageUrl) => {
    const key = getImageDedupeKey(imageUrl);
    if (seenImageKeys.has(key)) return false;
    seenImageKeys.add(key);
    return true;
  });
};

/**
 * Merges place data with image URLs, ensuring image fields are populated.
 * @param {Object} place - Place object to enhance
 * @param {Array} imageUrls - Additional image URLs to merge
 * @returns {Object} Enhanced place with imageUrl and imageUrls
 */
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

/**
 * Extracts opening hours from various response formats.
 * @param {Object} item - Place item with hours fields
 * @returns {string} Formatted hours string
 */
const getOpeningHours = (item = {}) => {
  if (Array.isArray(item.hours)) return item.hours.filter(Boolean).join(' | ');
  if (Array.isArray(item.operating_hours)) return item.operating_hours.filter(Boolean).join(' | ');
  if (typeof item.hours === 'string') return item.hours;
  if (typeof item.operating_hours === 'string') return item.operating_hours;
  return '';
};

/**
 * Currency inference rules for price parsing.
 * Maps country/location patterns to currency codes.
 */
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

/**
 * Infers currency code from context text.
 * @param {Object} context - Context with country, state, destination, address
 * @returns {string} Inferred currency code or empty string
 */
const inferCurrencyFromContext = (context = {}) => {
  const locationText = [context.country, context.state, context.destination, context.address]
    .filter(Boolean)
    .join(' ');
  const matchedHint = countryCurrencyHints.find(([pattern]) => pattern.test(locationText));
  return matchedHint?.[1] || '';
};

/**
 * Gets currency display prefix for UI formatting.
 * @param {string} currency - Currency code
 * @returns {string} Display prefix symbol
 */
const getCurrencyDisplayPrefix = (currency) => {
  if (currency === 'MYR') return 'RM';
  if (currency === 'SGD') return 'S$';
  return currency;
};

/**
 * Parses price string to extract numeric value.
 * Handles various number formats including:
 * - Decimal and thousands separators (1,234.56 or 1.234,56)
 * - Dot-separated thousands (1.234.567)
 * - Comma-separated thousands (1,234,567)
 * - Comma as decimal separator (123,45)
 * 
 * @param {string} value - Price string to parse
 * @returns {number} Parsed number or NaN
 */
const parsePriceNumber = (value = '') => {
  const normalizedValue = String(value).replace(/\s/g, '');

  // Handle mixed decimal and thousands separators
  if (normalizedValue.includes(',') && normalizedValue.includes('.')) {
    const lastComma = normalizedValue.lastIndexOf(',');
    const lastDot = normalizedValue.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    return Number(normalizedValue.replaceAll(thousandsSeparator, '').replace(decimalSeparator, '.'));
  }

  // Handle dot-separated thousands (1.234.567)
  if (/^\d{1,3}(?:\.\d{3})+$/.test(normalizedValue)) {
    return Number(normalizedValue.replaceAll('.', ''));
  }

  // Handle comma-separated thousands (1,234,567)
  if (/^\d{1,3}(?:,\d{3})+$/.test(normalizedValue)) {
    return Number(normalizedValue.replaceAll(',', ''));
  }

  // Handle comma as decimal separator (123,45)
  if (/^\d+,\d{1,2}$/.test(normalizedValue)) {
    return Number(normalizedValue.replace(',', '.'));
  }

  return Number(normalizedValue.replace(/,/g, ''));
};

/**
 * Extracts and parses price information from a place item.
 * Returns structured price data with currency, amount, and display format.
 * 
 * @param {*} price - Price value from API response
 * @param {Object} context - Context for currency inference
 * @returns {Object|null} Price detail object or null
 */
const getPriceDetail = (price, context = {}) => {
  const text = getText(price);
  if (!text) {
    return null;
  }

  const contextCurrency = inferCurrencyFromContext(context);
  
  // Currency matchers in order of precedence
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
    [/\u20ac\s*/, 'EUR'], // Euro symbol
    [/EUR\s*/i, 'EUR'],
    [/\u00a3\s*/, 'GBP'], // Pound symbol
    [/GBP\s*/i, 'GBP'],
    [/\u00a5\s*/, 'JPY'], // Yen symbol
    [/JPY\s*/i, 'JPY'],
    [/\u20a9\s*/, 'KRW'], // Won symbol
    [/KRW\s*/i, 'KRW'],
    [/\u0e3f\s*/, 'THB'], // Baht symbol
    [/THB\s*/i, 'THB'],
    [/\u20b9\s*/, 'INR'], // Rupee symbol
    [/INR\s*/i, 'INR'],
    [/\u20ab\s*/, 'VND'], // Dong symbol
    [/VND\s*/i, 'VND'],
    [/\u20b1\s*/, 'PHP'], // Peso symbol
    [/PHP\s*/i, 'PHP'],
    [/CNY\s*/i, 'CNY'],
    [/AUD\s*/i, 'AUD'],
    [/CAD\s*/i, 'CAD'],
    [/CHF\s*/i, 'CHF'],
    [/IDR\s*/i, 'IDR'],
    [/\$\s*/, contextCurrency || 'USD'], // Default dollar sign
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
    display, // Formatted display string
    currency: match?.[1] || '', // Currency code
    amount: Number.isFinite(amounts[0]) ? amounts[0] : null, // First amount (minimum for range)
    maxAmount: Number.isFinite(amounts[1]) ? amounts[1] : null, // Second amount (maximum for range)
    isRange: amounts.length > 1, // Whether price is a range
    isTier: /^\$+$/.test(text.trim()), // Whether price is tiered ($, $$, $$$)
  };
};

/**
 * Build Public Place Url transforms source data into the shape required nearby.
 * Constructs a Google Maps search URL for a place.
 * 
 * @param {Object} item - Place item
 * @returns {string} Google Maps URL
 */
const buildPublicPlaceUrl = (item = {}) => {
  if (item.website) return item.website;

  const query = [getText(item.title || item.name), getText(item.address)].filter(Boolean).join(' ');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '';
};

/**
 * Extracts GPS coordinates from a place item.
 * @param {Object} item - Place item with coordinates
 * @returns {Object|undefined} Coordinates object or undefined
 */
const getCoordinates = (item = {}) =>
  item.gps_coordinates?.latitude || item.gps_coordinates?.longitude
    ? {
        latitude: item.gps_coordinates.latitude,
        longitude: item.gps_coordinates.longitude,
      }
    : undefined;

/**
 * Checks and consumes daily quota for SerpApi calls.
 * Resets counter if the date has changed since last check.
 * 
 * @returns {boolean} True if quota is available and consumed, false if limit reached
 */
const consumeDailyQuota = () => {
  const today = new Date().toISOString().slice(0, 10);
  const dailyLimit = Math.max(Number(env.serpApiDailyLimit) || 100, 0);
  
  // Reset counter when date changes
  if (dailyUsage.date !== today) {
    dailyUsage.date = today;
    dailyUsage.count = 0;
  }

  // Check if daily limit has been reached
  if (dailyUsage.count >= dailyLimit) {
    return false;
  }

  // Increment counter and allow the request
  dailyUsage.count += 1;
  return true;
};

/**
 * Normalize Place Item prepares incoming data for consistent storage.
 * Maps raw SerpApi response fields to standardized application fields.
 * 
 * @param {Object} item - Raw place item from API
 * @param {number} index - Index for fallback ID
 * @param {Object} defaults - Default values for missing fields
 * @returns {Object} Normalized place item
 */
const normalizePlaceItem = (item = {}, index, defaults = {}) => ({
  id: String(item.place_id || item.data_id || item.data_cid || item.position || index),
  placeId: getText(item.place_id), // Google Maps place identifier
  dataId: getText(item.data_id || item.data_cid), // Google Maps data identifier
  name: getText(item.title || item.name) || defaults.name,
  rating: Number(item.rating || 0) || null, // Star rating out of 5
  reviewCount: Number(item.reviews || 0) || 0, // Number of reviews
  category: getText(item.type || item.types?.[0]) || defaults.category,
  openState: getText(item.open_state || item.status), // Current open/closed status
  hoursSummary: getOpeningHours(item), // Formatted opening hours
  phone: getText(item.phone || item.phone_number || item.telephone),
  imageUrl: pickImage(item), // Primary image
  imageUrls: pickImages(item), // All images
  address: getText(item.address),
  coordinates: getCoordinates(item), // Latitude/longitude
  url: buildPublicPlaceUrl(item), // Google Maps URL
});

/**
 * Records Google Maps API failures to the API log system.
 * @param {string} endpoint - API endpoint that failed
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} metadata - Additional context
 * @param {string} errorCode - Standardized error code
 * @returns {Promise<void>}
 */
const recordGoogleMapsFailure = (endpoint, message, statusCode, metadata, errorCode) =>
  env.nodeEnv === 'test'
    ? Promise.resolve() // Skip logging in test environment
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

/**
 * Classifies Google Maps API errors into standardized error responses.
 * @param {Error} error - Error from axios or application
 * @returns {Object} Classified error with errorCode, message, and statusCode
 */
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

/**
 * Extracts local results from SerpApi response data.
 * Handles various response structures from different endpoint types.
 * 
 * @param {Object} data - SerpApi response data
 * @returns {Array} Array of result items
 */
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
  const latitude = Number(metadata.latitude);
  const longitude = Number(metadata.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

  const response = await serpApiClient.get('/search', {
    params: {
      engine: 'google_maps',
      type: 'search',
      q: query, // Search query string
      start, // Pagination offset
      ...(hasCoordinates ? { ll: `@${latitude},${longitude},14z` } : {}),
      google_domain: 'google.com',
      hl: 'en', // Language
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
    nextStart: start + rawItems.length, // Next page starting index
    hasMore: rawItems.length >= DEFAULT_PAGE_SIZE || Boolean(response.data?.serpapi_pagination?.next),
    items: rawItems.map(mapItem), // Apply mapping function
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

/**
 * Normalize Review prepares incoming data for consistent storage.
 * Maps raw review fields to standardized application format.
 * 
 * @param {Object} review - Raw review from API
 * @param {number} index - Index for fallback ID
 * @returns {Object} Normalized review object
 */
const normalizeReview = (review = {}, index = 0) => ({
  id: String(review.review_id || review.link || review.user?.link || index),
  author: getText(review.user?.name || review.user || review.author || review.name) || 'Google user',
  authorLink: getText(review.user?.link || review.user?.profile || review.link),
  avatarUrl: getText(review.user?.thumbnail || review.user?.image || review.user?.avatar || review.profile_photo_url || review.thumbnail),
  rating: Number(review.rating || 0) || null, // Star rating out of 5
  date: getText(review.date || review.iso_date || review.relative_time_description),
  text: getText(review.snippet || review.text || review.review), // Review content
  likes: Number(review.likes || 0) || 0, // Number of likes
  ownerReply: { // Owner response to review
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
  // Validate that at least one identifier is provided
  if (!dataId && !placeId) {
    return { available: false, message: 'Google review identifier is unavailable', items: [] };
  }

  // Enforce daily API quota
  if (!consumeDailyQuota()) {
    const error = new Error('Daily travel data API limit reached. Please try again tomorrow.');
    error.isDailyLimit = true;
    throw error;
  }
  
  // Build request parameters
  const params = {
    engine: 'google_maps_reviews',
    sort_by: sortBy, // qualityScore, relevance, newest, highestRating, lowestRating
    hl,
    api_key: env.serpApiKey,
  };
  
  // Use data_id if available, otherwise fall back to place_id
  if (dataId) {
    params.data_id = dataId;
  } else {
    params.place_id = placeId;
  }

  // Add pagination token if provided
  if (nextPageToken) {
    params.next_page_token = nextPageToken;
  }

  // Execute request
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
  // Validate dataId is provided
  if (!dataId) {
    return { available: false, message: 'Google photo identifier is unavailable', imageUrls: [] };
  }

  const allPhotos = [];
  let nextPageToken = '';
  let pageCount = 0;

  // Loop through photo pages until no more pages or max pages reached
  do {
    // Enforce daily API quota for each page
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
    imageUrls: pickImages({ photos: allPhotos }), // Extract and deduplicate image URLs
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

  // Parse and validate URL format
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    const error = new Error('Invalid image URL');
    error.statusCode = 400;
    throw error;
  }

  // Validate protocol and host for security
  if (parsedUrl.protocol !== 'https:' || !allowedImageHosts.has(parsedUrl.hostname)) {
    const error = new Error('Image host is not allowed');
    error.statusCode = 400;
    throw error;
  }

  // Fetch image as stream with appropriate headers
  const response = await axios.get(parsedUrl.toString(), {
    responseType: 'stream',
    timeout: 15000, // 15-second timeout for images
    maxRedirects: 3, // Follow up to 3 redirects
    headers: {
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'user-agent': 'Mozilla/5.0 SmartTravelPlanner/1.0',
    },
  });
  
  const contentType = response.headers['content-type'] || '';

  // Verify the response is actually an image
  if (!contentType.startsWith('image/')) {
    const error = new Error('Remote URL did not return an image');
    error.statusCode = 502;
    throw error;
  }

  return {
    stream: response.data, // Readable stream of image data
    contentType,
    contentLength: response.headers['content-length'] || '',
    cacheControl: response.headers['cache-control'] || 'public, max-age=86400', // Default 24-hour cache
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
