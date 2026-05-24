const env = require('../../config/env');
const {
  getGoogleMapsFailureMessage,
  getPriceDetail,
  getText,
  normalizePlaceItem,
  recordGoogleMapsFailure,
  searchGoogleMaps,
} = require('./googleMaps.service');

const restaurantsCache = new Map();

const fallbackRestaurants = (filters, message = 'Restaurants temporarily unavailable') => ({
  available: false,
  ...filters,
  message,
  items: [],
  hasMore: false,
});

const normalizeRestaurant = (item = {}, index) => ({
  ...normalizePlaceItem(item, index, {
    name: 'Untitled restaurant',
    category: 'Restaurant',
  }),
  price: getText(item.price || item.price_level),
  priceDetail: getPriceDetail(item.price || item.price_level),
});

const normalizeFilters = (filters = {}) => ({
  destination: (filters.destination || '').trim(),
  country: (filters.country || '').trim(),
  state: (filters.state || '').trim(),
  foodCategory: (filters.foodCategory || '').trim(),
  start: Math.max(Number(filters.start) || 0, 0),
});

const hasRestaurantSearchInput = ({ destination, country, state, foodCategory }) =>
  Boolean(destination || country || state || foodCategory);

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

const getRestaurantsByDestination = async (filters) => {
  const normalizedFilters = normalizeFilters(filters);

  if (!hasRestaurantSearchInput(normalizedFilters)) {
    return fallbackRestaurants(normalizedFilters, 'Enter a restaurant name, country, location, or food category first.');
  }

  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return fallbackRestaurants(normalizedFilters, 'SerpApi key is not configured');
  }

  try {
    return await searchGoogleMaps({
      cache: restaurantsCache,
      cacheKey: JSON.stringify(normalizedFilters).toLowerCase(),
      query: getRestaurantQuery(normalizedFilters),
      start: normalizedFilters.start,
      metadata: normalizedFilters,
      mapItem: normalizeRestaurant,
    });
  } catch (error) {
    const { message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('restaurants', message, statusCode, normalizedFilters);
    return fallbackRestaurants(normalizedFilters, message);
  }
};

module.exports = { getRestaurantsByDestination };
