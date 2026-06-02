/**
 * Explore module.
 * Business rules, repository access, and external integrations live in this layer.
 */
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
// Normalize Attraction prepares incoming data for consistent storage.
const normalizeAttraction = (item = {}, index) => ({
  ...normalizePlaceItem(item, index, {
    name: 'Untitled attraction',
    category: 'Attraction',
  }),
  price: getText(item.price || item.price_level),
  priceDetail: getPriceDetail(item.price || item.price_level),
});
const getAttractionsByDestination = async (destination, start = 0) => {
  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return fallbackAttractions(destination, 'SerpApi key is not configured');
  }
  try {
    const pageStart = Math.max(Number(start) || 0, 0);
    const attractions = await searchGoogleMaps({
      cache: attractionsCache,
      cacheKey: `${destination.toLowerCase()}:${pageStart}`,
      query: `attractions in ${destination}`,
      start: pageStart,
      metadata: { destination },
      mapItem: normalizeAttraction,
    });

    const { query, ...publicAttractions } = attractions;
    return publicAttractions;
  } catch (error) {
    const { message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('attractions', message, statusCode, { destination });
    return fallbackAttractions(destination, message);
  }
};
module.exports = { getAttractionsByDestination };
