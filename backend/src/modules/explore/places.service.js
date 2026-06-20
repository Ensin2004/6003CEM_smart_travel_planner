/**
 * Attraction discovery service backed by SerpApi Google Maps and Wikipedia summaries.
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

// In-memory cache for attraction search results
const attractionsCache = new Map();

/**
 * Creates a fallback response when attractions cannot be retrieved.
 * @param {Object} filters - Search filters
 * @param {string} message - Error message
 * @returns {Object} Fallback response object
 */
const fallbackAttractions = (filters, message = 'Attractions temporarily unavailable') => ({
  available: false,
  ...filters,
  message,
  items: [],
  hasMore: false,
});

/**
 * Normalize Attraction prepares incoming data for consistent storage.
 * Maps raw attraction data to standardized format with price details.
 * 
 * @param {Object} item - Raw attraction item from API
 * @param {number} index - Index for fallback ID
 * @param {Object} filters - Search filters for context
 * @returns {Object} Normalized attraction item
 */
const normalizeAttraction = (item = {}, index, filters = {}) => ({
  ...normalizePlaceItem(item, index, {
    name: 'Untitled attraction',
    category: 'Attraction',
  }),
  price: getText(item.price || item.price_level),
  priceDetail: getPriceDetail(item.price || item.price_level, {
    ...filters,
    address: item.address,
  }),
});

/**
 * Normalize Filters prepares incoming data for consistent storage.
 * Handles both string and object filter formats.
 * 
 * @param {Object|string} filters - Raw filters from request
 * @returns {Object} Normalized filters
 */
const normalizeFilters = (filters = {}) => {
  // Handle string input (legacy support)
  if (typeof filters === 'string') {
    return {
      destination: filters.trim(),
      country: '',
      state: '',
      attractionCategory: '',
      latitude: undefined,
      longitude: undefined,
      locationLabel: '',
      start: 0,
    };
  }

  return {
    destination: (filters.destination || '').trim(),
    country: (filters.country || '').trim(),
    state: (filters.state || '').trim(),
    attractionCategory: (filters.attractionCategory || '').trim(),
    latitude: filters.latitude,
    longitude: filters.longitude,
    locationLabel: (filters.locationLabel || '').trim(),
    start: Math.max(Number(filters.start) || 0, 0),
  };
};

/**
 * Builds a search query string for attractions.
 * Combines category, destination, and location context.
 * 
 * @param {Object} filters - Normalized filters
 * @returns {string} Search query for SerpApi
 */
const getAttractionQuery = ({ destination, country, state, attractionCategory, locationLabel }) => {
  const category = attractionCategory || 'tourist attractions';
  const location = [state, country].filter(Boolean).join(', ');

  if (destination && location) {
    return `${category} in ${destination}, ${location}`;
  }

  if (destination) {
    return `${category} in ${destination}`;
  }

  if (location) {
    return `${category} in ${location}`;
  }

  if (locationLabel) {
    return `${category} near ${locationLabel}`;
  }

  return category;
};

/**
 * Searches for attractions matching destination and category filters.
 * @param {object} filters Destination, country, state, category, and pagination input.
 * @returns {Promise<object>} Normalized attraction results or an availability fallback.
 */
const getAttractionsByDestination = async (filters) => {
  const normalizedFilters = normalizeFilters(filters);
  
  // Check if SerpApi key is configured
  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return {
      ...fallbackAttractions(normalizedFilters, 'SerpApi key is not configured'),
      errorCode: 'INVALID_API_KEY',
    };
  }
  
  try {
    const attractions = await searchGoogleMaps({
      cache: attractionsCache,
      cacheKey: JSON.stringify(normalizedFilters).toLowerCase(),
      query: getAttractionQuery(normalizedFilters),
      start: normalizedFilters.start,
      metadata: normalizedFilters,
      mapItem: (item, index) => normalizeAttraction(item, index, normalizedFilters),
    });

    // Remove query field from response
    const { query, ...publicAttractions } = attractions;
    return publicAttractions;
  } catch (error) {
    // Handle and log API failures
    const { errorCode, message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('attractions', message, statusCode, normalizedFilters, errorCode);
    return { ...fallbackAttractions(normalizedFilters, message), errorCode };
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
      'Wikipedia does not have a matching article for this attraction yet. Try the Google listing for official details, tickets, hours, and visitor information.',
    url: '',
  };
};

/**
 * Enriches an attraction with listing data, photos, reviews, and a Wikipedia description.
 * @param {object} input Attraction identity and provider identifiers.
 * @returns {Promise<object>} Detailed attraction data with partial fallbacks when needed.
 */
const getAttractionDetail = async ({ name, address, dataId, placeId }) => {
  const fallbackName = name || 'Selected attraction';
  
  // Base attraction object with fallback values
  const baseAttraction = {
    available: Boolean(name),
    item: {
      id: String(placeId || dataId || fallbackName),
      placeId: placeId || '',
      dataId: dataId || '',
      name: fallbackName,
      category: 'Attraction',
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
      ...baseAttraction,
      message: 'SerpApi key is not configured',
    };
  }
  
  try {
    // Search for attraction details
    const query = [fallbackName, address].filter(Boolean).join(' ');
    const details = await searchGoogleMaps({
      cache: new Map(), // Don't cache detail lookups
      cacheKey: `attraction-detail:${query}:${dataId || ''}:${placeId || ''}`.toLowerCase(),
      query,
      metadata: { category: 'Attraction' },
      mapItem: normalizeAttraction,
    });
    
    const item = details.items?.[0] || baseAttraction.item;
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
      recordGoogleMapsFailure('attraction-detail-photos', photoFailure.message, photoFailure.statusCode, { name, address, dataId: dataId || item.dataId }, photoFailure.errorCode);
    }

    // Fetch reviews
    const reviews = await searchGoogleMapsReviews({
      dataId: dataId || item.dataId,
      placeId: placeId || item.placeId,
    });

    return {
      available: true,
      item: {
        ...baseAttraction.item,
        ...imageEnrichedItem,
      },
      description: baseAttraction.description,
      reviews,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    // Handle and log API failures
    const { errorCode, message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('attraction-detail', message, statusCode, { name, address, dataId, placeId }, errorCode);
    return {
      ...baseAttraction,
      errorCode,
      message,
    };
  }
};

module.exports = { getAttractionDetail, getAttractionsByDestination };
