/**
 * Restaurant discovery service backed by SerpApi Google Maps and Wikipedia summaries.
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

// In-memory cache for restaurant search results
const restaurantsCache = new Map();

/**
 * Creates a fallback response when restaurants cannot be retrieved.
 * @param {Object} filters - Search filters
 * @param {string} message - Error message
 * @returns {Object} Fallback response object
 */
const fallbackRestaurants = (filters, message = 'Restaurants temporarily unavailable') => ({
  available: false,
  ...filters,
  message,
  items: [],
  hasMore: false,
});

/**
 * Normalize Restaurant prepares incoming data for consistent storage.
 * Maps raw restaurant data to standardized format with price details.
 * 
 * @param {Object} item - Raw restaurant item from API
 * @param {number} index - Index for fallback ID
 * @param {Object} filters - Search filters for context
 * @returns {Object} Normalized restaurant item
 */
const normalizeRestaurant = (item = {}, index, filters = {}) => ({
  ...normalizePlaceItem(item, index, {
    name: 'Untitled restaurant',
    category: 'Restaurant',
  }),
  price: getText(item.price || item.price_level),
  priceDetail: getPriceDetail(item.price || item.price_level, {
    ...filters,
    address: item.address,
  }),
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
  foodCategory: (filters.foodCategory || '').trim(),
  start: Math.max(Number(filters.start) || 0, 0),
});

/**
 * Checks if any restaurant search input is provided.
 * @param {Object} filters - Normalized filters
 * @returns {boolean} True if at least one search criterion exists
 */
const hasRestaurantSearchInput = ({ destination, country, state, foodCategory }) =>
  Boolean(destination || country || state || foodCategory);

/**
 * Builds a search query string for restaurants.
 * Combines food category, destination, and location context.
 * 
 * @param {Object} filters - Normalized filters
 * @returns {string} Search query for SerpApi
 */
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

/**
 * Searches for restaurants matching destination and food-category filters.
 * @param {object} filters Destination, country, state, category, and pagination input.
 * @returns {Promise<object>} Normalized restaurant results or an availability fallback.
 */
const getRestaurantsByDestination = async (filters) => {
  const normalizedFilters = normalizeFilters(filters);

  // Validate that search criteria exist
  if (!hasRestaurantSearchInput(normalizedFilters)) {
    return fallbackRestaurants(normalizedFilters, 'Enter a restaurant name, country, location, or food category first.');
  }
  
  // Check if SerpApi key is configured
  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return {
      ...fallbackRestaurants(normalizedFilters, 'SerpApi key is not configured'),
      errorCode: 'INVALID_API_KEY',
    };
  }
  
  try {
    return await searchGoogleMaps({
      cache: restaurantsCache,
      cacheKey: JSON.stringify(normalizedFilters).toLowerCase(),
      query: getRestaurantQuery(normalizedFilters),
      start: normalizedFilters.start,
      metadata: normalizedFilters,
      mapItem: (item, index) => normalizeRestaurant(item, index, normalizedFilters),
    });
  } catch (error) {
    // Handle and log API failures
    const { errorCode, message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('restaurants', message, statusCode, normalizedFilters, errorCode);
    return { ...fallbackRestaurants(normalizedFilters, message), errorCode };
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
      origin: '*',
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
    .slice(-3)
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
      'Wikipedia does not have a matching article for this restaurant yet. Try the Google listing for official details, menus, hours, and booking information.',
    url: '',
  };
};

/**
 * Enriches a restaurant with listing data, photos, reviews, and a Wikipedia description.
 * @param {object} input Restaurant identity and provider identifiers.
 * @returns {Promise<object>} Detailed restaurant data with partial fallbacks when needed.
 */
const getRestaurantDetail = async ({ name, address, dataId, placeId }) => {
  const fallbackName = name || 'Selected restaurant';
  
  // Base restaurant object with fallback values
  const baseRestaurant = {
    available: Boolean(name),
    item: {
      id: String(placeId || dataId || fallbackName),
      placeId: placeId || '',
      dataId: dataId || '',
      name: fallbackName,
      category: 'Restaurant',
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
      ...baseRestaurant,
      message: 'SerpApi key is not configured',
    };
  }
  
  try {
    // Search for restaurant details
    const query = [fallbackName, address].filter(Boolean).join(' ');
    const details = await searchGoogleMaps({
      cache: new Map(), // Don't cache detail lookups
      cacheKey: `restaurant-detail:${query}:${dataId || ''}:${placeId || ''}`.toLowerCase(),
      query,
      metadata: { category: 'Restaurant' },
      mapItem: normalizeRestaurant,
    });
    
    const item = details.items?.[0] || baseRestaurant.item;
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
      recordGoogleMapsFailure('restaurant-detail-photos', photoFailure.message, photoFailure.statusCode, { name, address, dataId: dataId || item.dataId }, photoFailure.errorCode);
    }

    // Fetch reviews
    const reviews = await searchGoogleMapsReviews({
      dataId: dataId || item.dataId,
      placeId: placeId || item.placeId,
    });

    return {
      available: true,
      item: {
        ...baseRestaurant.item,
        ...imageEnrichedItem,
      },
      description: baseRestaurant.description,
      reviews,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    // Handle and log API failures
    const { errorCode, message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('restaurant-detail', message, statusCode, { name, address, dataId, placeId }, errorCode);
    return {
      ...baseRestaurant,
      errorCode,
      message,
    };
  }
};

module.exports = { getRestaurantDetail, getRestaurantsByDestination };