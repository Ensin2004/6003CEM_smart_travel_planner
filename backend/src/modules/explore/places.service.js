const env = require('../../config/env');
const {
  getGoogleMapsFailureMessage,
  getPriceDetail,
  getText,
  normalizePlaceItem,
  recordGoogleMapsFailure,
  searchGoogleMaps,
} = require('./googleMaps.service');

const attractionsCache = new Map();

const fallbackAttractions = (destination, message = 'Attractions temporarily unavailable') => ({
  available: false,
  destination,
  message,
  items: [],
});

const normalizeAttraction = (item = {}, index) => ({
  ...normalizePlaceItem(item, index, {
    name: 'Untitled attraction',
    category: 'Attraction',
  }),
  price: getText(item.price || item.price_level),
  priceDetail: getPriceDetail(item.price || item.price_level),
});

const getAttractionsByDestination = async (destination) => {
  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return fallbackAttractions(destination, 'SerpApi key is not configured');
  }

  try {
    const attractions = await searchGoogleMaps({
      cache: attractionsCache,
      cacheKey: destination.toLowerCase(),
      query: `attractions in ${destination}`,
      metadata: { destination },
      mapItem: normalizeAttraction,
    });

    const { query, nextStart, hasMore, ...publicAttractions } = attractions;
    return publicAttractions;
  } catch (error) {
    const { message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('attractions', message, statusCode, { destination });
    return fallbackAttractions(destination, message);
  }
};

module.exports = { getAttractionsByDestination };
