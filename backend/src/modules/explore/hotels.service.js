/**
 * Hotel discovery service backed by SerpApi Google Maps and Wikipedia summaries.
 */
const axios = require('axios');
const env = require('../../config/env');
const {
  getGoogleMapsFailureMessage,
  getPriceDetail,
  getText,
  mergePlaceImages,
  normalizePlaceItem,
  recordGoogleMapsFailure,
  searchGoogleMaps,
  searchGoogleMapsPhotos,
  searchGoogleMapsReviews,
} = require('./googleMaps.service');

// In-memory cache for hotel search results
const hotelsCache = new Map();

/**
 * Creates a fallback response when hotels cannot be retrieved.
 * @param {Object} filters - Search filters
 * @param {string} message - Error message
 * @returns {Object} Fallback response object
 */
const fallbackHotels = (filters, message = 'Hotels temporarily unavailable') => ({
  available: false,
  ...filters,
  message,
  items: [],
  hasMore: false,
});

/**
 * Normalize Hotel prepares incoming data for consistent storage.
 * Maps raw hotel data to standardized format with price details.
 * 
 * @param {Object} item - Raw hotel item from API
 * @param {number} index - Index for fallback ID
 * @param {Object} filters - Search filters for context
 * @returns {Object} Normalized hotel item
 */
const normalizeHotel = (item = {}, index, filters = {}) => ({
  ...normalizePlaceItem(item, index, {
    name: 'Untitled hotel',
    category: 'Hotel',
  }),
  price: getText(item.price || item.rate_per_night?.lowest || item.extracted_price),
  priceDetail: getPriceDetail(item.price || item.rate_per_night?.lowest || item.extracted_price, {
    ...filters,
    address: item.address,
  }),
  roomType: getText(item.roomType || item.room_type),
});

/**
 * Normalize Filters prepares incoming data for consistent storage.
 * Sanitizes and normalizes search filter values.
 * 
 * @param {Object} filters - Raw filters from request
 * @returns {Object} Normalized filters
 */
const normalizeFilters = (filters = {}) => ({
  destination: (filters.destination || '').trim(),
  country: (filters.country || '').trim(),
  state: (filters.state || '').trim(),
  roomType: (filters.roomType || '').trim(),
  start: Math.max(Number(filters.start) || 0, 0),
});

/**
 * Checks if any hotel search input is provided.
 * @param {Object} filters - Normalized filters
 * @returns {boolean} True if at least one search criterion exists
 */
const hasHotelSearchInput = ({ destination, country, state, roomType }) =>
  Boolean(destination || country || state || roomType);

/**
 * Builds a search query string for hotels.
 * Combines room type, destination, and location context.
 * 
 * @param {Object} filters - Normalized filters
 * @returns {string} Search query for SerpApi
 */
const getHotelQuery = ({ destination, country, state, roomType }) => {
  const roomPrefix = roomType ? `${roomType} ` : '';
  const location = [state, country].filter(Boolean).join(', ');

  if (destination && location) {
    return `${roomPrefix}${destination} hotels in ${location}`;
  }

  if (destination) {
    return `${roomPrefix}${destination} hotels`;
  }

  if (location) {
    return `${roomPrefix}hotels in ${location}`;
  }

  return `${roomPrefix}hotels`;
};

/**
 * Searches for hotels matching destination and room filters.
 * @param {object} filters Destination, country, state, room type, and pagination input.
 * @returns {Promise<object>} Normalized hotel results or an availability fallback.
 */
const getHotelsByDestination = async (filters) => {
  const normalizedFilters = normalizeFilters(filters);

  // Validate that search criteria exist
  if (!hasHotelSearchInput(normalizedFilters)) {
    return fallbackHotels(normalizedFilters, 'Enter a hotel name, country, location, or room type first.');
  }
  
  // Check if SerpApi key is configured
  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return {
      ...fallbackHotels(normalizedFilters, 'SerpApi key is not configured'),
      errorCode: 'INVALID_API_KEY',
    };
  }
  
  try {
    return await searchGoogleMaps({
      cache: hotelsCache,
      cacheKey: JSON.stringify(normalizedFilters).toLowerCase(),
      query: getHotelQuery(normalizedFilters),
      start: normalizedFilters.start,
      metadata: normalizedFilters,
      mapItem: (item, index) => normalizeHotel(item, index, normalizedFilters),
    });
  } catch (error) {
    // Handle and log API failures
    const { errorCode, message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('hotels', message, statusCode, normalizedFilters, errorCode);
    return { ...fallbackHotels(normalizedFilters, message), errorCode };
  }
};

/**
 * Fetches Wikipedia page summary for a given title.
 * @param {string} title - Wikipedia page title
 * @returns {Promise<Object>} Page summary with extract and URL
 * @throws {Error} If API request fails
 */
const getWikipediaPageSummary = async (title) => {
  const normalizedTitle = encodeURIComponent(title.trim().replace(/\s+/g, '_'));
  const response = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${normalizedTitle}`, {
    timeout: 7000,
    headers: {
      accept: 'application/json',
      'User-Agent': 'SmartTravelPlanner/1.0',
    },
  });

  return {
    available: Boolean(response.data?.extract),
    title: response.data?.title || title,
    extract: response.data?.extract || '',
    url: response.data?.content_urls?.desktop?.page || '',
  };
};

/**
 * Searches Wikipedia for a matching page title.
 * @param {string} query - Search query string
 * @returns {Promise<string>} First matching page title or empty string
 */
const searchWikipediaTitle = async (query) => {
  const response = await axios.get('https://en.wikipedia.org/w/api.php', {
    timeout: 7000,
    params: {
      action: 'query',
      list: 'search',
      srsearch: query,
      srlimit: 1,
      format: 'json',
      origin: '*', // CORS-friendly
    },
    headers: {
      accept: 'application/json',
      'User-Agent': 'SmartTravelPlanner/1.0',
    },
  });

  return response.data?.query?.search?.[0]?.title || '';
};

/**
 * Extracts location hint from address for better Wikipedia search.
 * Uses last 3 address parts for location context.
 * 
 * @param {string} address - Full address string
 * @returns {string} Location hint
 */
const getAddressSearchHint = (address = '') =>
  address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(-3) // Get last 3 parts (city, state, country)
    .join(' ');

/**
 * Retrieves Wikipedia summary for a place with fallback search.
 * Tries direct title match first, then falls back to title search with address hint.
 * 
 * @param {string} name - Place name
 * @param {string} address - Place address for context
 * @returns {Promise<Object>} Wikipedia summary or fallback
 */
const getWikipediaSummary = async (name, address = '') => {
  if (!name) {
    return { available: false, extract: '', url: '', title: '' };
  }
  
  try {
    // Try direct title match first
    return await getWikipediaPageSummary(name);
  } catch {
    // Fall back to search with address context
    try {
      const searchHint = getAddressSearchHint(address);
      const title = await searchWikipediaTitle([name, searchHint].filter(Boolean).join(' '));

      if (title) {
        return await getWikipediaPageSummary(title);
      }
    } catch {
      // Fall through to the friendly unavailable message.
    }
  }

  // Return fallback when Wikipedia article is not found
  return {
    available: false,
    title: name,
    extract:
      'Wikipedia does not have a matching article for this hotel yet. Try the Google listing for official details, amenities, and booking information.',
    url: '',
  };
};

/**
 * Enriches a hotel with listing data, photos, reviews, and a Wikipedia description.
 * @param {object} input Hotel identity and provider identifiers.
 * @returns {Promise<object>} Detailed hotel data with partial fallbacks when needed.
 */
const getHotelDetail = async ({ name, address, dataId, placeId }) => {
  const fallbackName = name || 'Selected hotel';
  
  // Base hotel object with fallback values
  const baseHotel = {
    available: Boolean(name),
    item: {
      id: String(placeId || dataId || fallbackName),
      placeId: placeId || '',
      dataId: dataId || '',
      name: fallbackName,
      category: 'Hotel',
      address: address || '',
    },
    description: await getWikipediaSummary(fallbackName, address),
    reviews: {
      available: false,
      message: dataId || placeId ? 'Google reviews are temporarily unavailable.' : 'Google review identifier is unavailable.',
      items: [],
    },
  };
  
  // Check if SerpApi key is configured
  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return {
      ...baseHotel,
      message: 'SerpApi key is not configured',
    };
  }
  
  try {
    // Search for hotel details
    const query = [fallbackName, address].filter(Boolean).join(' ');
    const details = await searchGoogleMaps({
      cache: new Map(), // Don't cache detail lookups
      cacheKey: `hotel-detail:${query}:${dataId || ''}:${placeId || ''}`.toLowerCase(),
      query,
      metadata: { category: 'Hotel' },
      mapItem: normalizeHotel,
    });
    
    const item = details.items?.[0] || baseHotel.item;
    let imageEnrichedItem = item;

    // Fetch additional photos if dataId is available
    try {
      const photos = await searchGoogleMapsPhotos({
        dataId: dataId || item.dataId,
      });
      imageEnrichedItem = mergePlaceImages(item, photos.imageUrls);
    } catch (photoError) {
      // Log photo fetch failure but continue with available data
      const photoFailure = getGoogleMapsFailureMessage(photoError);
      recordGoogleMapsFailure('hotel-detail-photos', photoFailure.message, photoFailure.statusCode, { name, address, dataId: dataId || item.dataId }, photoFailure.errorCode);
    }

    // Fetch reviews
    const reviews = await searchGoogleMapsReviews({
      dataId: dataId || item.dataId,
      placeId: placeId || item.placeId,
    });

    return {
      available: true,
      item: {
        ...baseHotel.item,
        ...imageEnrichedItem,
      },
      description: baseHotel.description,
      reviews,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    // Handle and log API failures
    const { errorCode, message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('hotel-detail', message, statusCode, { name, address, dataId, placeId }, errorCode);
    return {
      ...baseHotel,
      errorCode,
      message,
    };
  }
};

module.exports = { getHotelDetail, getHotelsByDestination };