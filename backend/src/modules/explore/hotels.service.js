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

const hotelsCache = new Map();
const fallbackHotels = (filters, message = 'Hotels temporarily unavailable') => ({
  available: false,
  ...filters,
  message,
  items: [],
  hasMore: false,
});
// Normalize Hotel prepares incoming data for consistent storage.
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
// Normalize Filters prepares incoming data for consistent storage.
const normalizeFilters = (filters = {}) => ({
  destination: (filters.destination || '').trim(),
  country: (filters.country || '').trim(),
  state: (filters.state || '').trim(),
  roomType: (filters.roomType || '').trim(),
  start: Math.max(Number(filters.start) || 0, 0),
});
const hasHotelSearchInput = ({ destination, country, state, roomType }) =>
  Boolean(destination || country || state || roomType);
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

  if (!hasHotelSearchInput(normalizedFilters)) {
    return fallbackHotels(normalizedFilters, 'Enter a hotel name, country, location, or room type first.');
  }
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
    const { errorCode, message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('hotels', message, statusCode, normalizedFilters, errorCode);
    return { ...fallbackHotels(normalizedFilters, message), errorCode };
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
  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return {
      ...baseHotel,
      message: 'SerpApi key is not configured',
    };
  }
  try {
    const query = [fallbackName, address].filter(Boolean).join(' ');
    const details = await searchGoogleMaps({
      cache: new Map(),
      cacheKey: `hotel-detail:${query}:${dataId || ''}:${placeId || ''}`.toLowerCase(),
      query,
      metadata: { category: 'Hotel' },
      mapItem: normalizeHotel,
    });
    const item = details.items?.[0] || baseHotel.item;
    let imageEnrichedItem = item;

    try {
      const photos = await searchGoogleMapsPhotos({
        dataId: dataId || item.dataId,
      });
      imageEnrichedItem = mergePlaceImages(item, photos.imageUrls);
    } catch (photoError) {
      const photoFailure = getGoogleMapsFailureMessage(photoError);
      recordGoogleMapsFailure('hotel-detail-photos', photoFailure.message, photoFailure.statusCode, { name, address, dataId: dataId || item.dataId }, photoFailure.errorCode);
    }

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
