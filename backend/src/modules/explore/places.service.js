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

const attractionsCache = new Map();
const fallbackAttractions = (filters, message = 'Attractions temporarily unavailable') => ({
  available: false,
  ...filters,
  message,
  items: [],
  hasMore: false,
});
// Normalize Attraction prepares incoming data for consistent storage.
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
const normalizeFilters = (filters = {}) => {
  if (typeof filters === 'string') {
    return {
      destination: filters.trim(),
      country: '',
      state: '',
      attractionCategory: '',
      start: 0,
    };
  }

  return {
    destination: (filters.destination || '').trim(),
    country: (filters.country || '').trim(),
    state: (filters.state || '').trim(),
    attractionCategory: (filters.attractionCategory || '').trim(),
    start: Math.max(Number(filters.start) || 0, 0),
  };
};
const hasAttractionSearchInput = ({ destination, country, state, attractionCategory }) =>
  Boolean(destination || country || state || attractionCategory);
const getAttractionQuery = ({ destination, country, state, attractionCategory }) => {
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

  return category;
};
/**
 * Searches for attractions matching destination and category filters.
 * @param {object} filters Destination, country, state, category, and pagination input.
 * @returns {Promise<object>} Normalized attraction results or an availability fallback.
 */
const getAttractionsByDestination = async (filters) => {
  const normalizedFilters = normalizeFilters(filters);

  if (!hasAttractionSearchInput(normalizedFilters)) {
    return fallbackAttractions(normalizedFilters, 'Enter an attraction name, country, location, or category first.');
  }
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

    const { query, ...publicAttractions } = attractions;
    return publicAttractions;
  } catch (error) {
    const { errorCode, message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('attractions', message, statusCode, normalizedFilters, errorCode);
    return { ...fallbackAttractions(normalizedFilters, message), errorCode };
  }
};
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
const getAddressSearchHint = (address = '') =>
  address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(-3)
    .join(' ');
const getWikipediaSummary = async (name, address = '') => {
  if (!name) {
    return { available: false, extract: '', url: '', title: '' };
  }
  try {
    return await getWikipediaPageSummary(name);
  } catch {
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
  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return {
      ...baseAttraction,
      message: 'SerpApi key is not configured',
    };
  }
  try {
    const query = [fallbackName, address].filter(Boolean).join(' ');
    const details = await searchGoogleMaps({
      cache: new Map(),
      cacheKey: `attraction-detail:${query}:${dataId || ''}:${placeId || ''}`.toLowerCase(),
      query,
      metadata: { category: 'Attraction' },
      mapItem: normalizeAttraction,
    });
    const item = details.items?.[0] || baseAttraction.item;
    let imageEnrichedItem = item;

    try {
      const photos = await searchGoogleMapsPhotos({
        dataId: dataId || item.dataId,
      });
      imageEnrichedItem = mergePlaceImages(item, photos.imageUrls);
    } catch (photoError) {
      const photoFailure = getGoogleMapsFailureMessage(photoError);
      recordGoogleMapsFailure('attraction-detail-photos', photoFailure.message, photoFailure.statusCode, { name, address, dataId: dataId || item.dataId }, photoFailure.errorCode);
    }

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
