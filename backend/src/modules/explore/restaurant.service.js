const axios = require('axios');
const env = require('../../config/env');
const {
  getGoogleMapsFailureMessage,
  getPriceDetail,
  getText,
  normalizePlaceItem,
  recordGoogleMapsFailure,
  searchGoogleMaps,
  searchGoogleMapsReviews,
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
      // Fall through to the friendly unavailable message below.
    }
  }

  return {
    available: false,
    title: name,
    extract:
      'Wikipedia does not have a matching article for this restaurant yet. Try the Google listing for official details, menus, hours, and booking information.',
    url: '',
  };
};

const getRestaurantDetail = async ({ name, address, dataId, placeId }) => {
  const fallbackName = name || 'Selected restaurant';
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

  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return {
      ...baseRestaurant,
      message: 'SerpApi key is not configured',
    };
  }

  try {
    const query = [fallbackName, address].filter(Boolean).join(' ');
    const details = await searchGoogleMaps({
      cache: new Map(),
      cacheKey: `restaurant-detail:${query}:${dataId || ''}:${placeId || ''}`.toLowerCase(),
      query,
      metadata: { category: 'Restaurant' },
      mapItem: normalizeRestaurant,
    });
    const item = details.items?.[0] || baseRestaurant.item;
    const reviews = await searchGoogleMapsReviews({
      dataId: dataId || item.dataId,
      placeId: placeId || item.placeId,
    });

    return {
      available: true,
      item: {
        ...baseRestaurant.item,
        ...item,
      },
      description: baseRestaurant.description,
      reviews,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    const { message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('restaurant-detail', message, statusCode, { name, address, dataId, placeId });
    return {
      ...baseRestaurant,
      message,
    };
  }
};

module.exports = { getRestaurantDetail, getRestaurantsByDestination };
