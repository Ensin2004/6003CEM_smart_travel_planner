const env = require('../../config/env');
const {
  getGoogleMapsFailureMessage,
  getPriceDetail,
  getText,
  normalizePlaceItem,
  recordGoogleMapsFailure,
  searchGoogleMaps,
} = require('./googleMaps.service');

const hotelsCache = new Map();

const fallbackHotels = (filters, message = 'Hotels temporarily unavailable') => ({
  available: false,
  ...filters,
  message,
  items: [],
  hasMore: false,
});

const normalizeHotel = (item = {}, index) => ({
  ...normalizePlaceItem(item, index, {
    name: 'Untitled hotel',
    category: 'Hotel',
  }),
  price: getText(item.price || item.rate_per_night?.lowest || item.extracted_price),
  priceDetail: getPriceDetail(item.price || item.rate_per_night?.lowest || item.extracted_price),
  roomType: getText(item.roomType || item.room_type),
});

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

const getHotelsByDestination = async (filters) => {
  const normalizedFilters = normalizeFilters(filters);

  if (!hasHotelSearchInput(normalizedFilters)) {
    return fallbackHotels(normalizedFilters, 'Enter a hotel name, country, location, or room type first.');
  }

  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return fallbackHotels(normalizedFilters, 'SerpApi key is not configured');
  }

  try {
    return await searchGoogleMaps({
      cache: hotelsCache,
      cacheKey: JSON.stringify(normalizedFilters).toLowerCase(),
      query: getHotelQuery(normalizedFilters),
      start: normalizedFilters.start,
      metadata: normalizedFilters,
      mapItem: normalizeHotel,
    });
  } catch (error) {
    const { message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('hotels', message, statusCode, normalizedFilters);
    return fallbackHotels(normalizedFilters, message);
  }
};

module.exports = { getHotelsByDestination };
