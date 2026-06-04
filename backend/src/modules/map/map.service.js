/**
 * Map module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const env = require('../../config/env');
const weatherService = require('../explore/weather.service');
const placesService = require('../explore/places.service');
const hotelsService = require('../explore/hotels.service');
const restaurantService = require('../explore/restaurant.service');
const mapRepository = require('./map.repository');
const {
  getFoursquareFailureMessage,
  getFoursquarePlace,
  recordFoursquareFailure,
  searchFoursquarePlaces,
} = require('./foursquare.service');
const {
  getGoogleMapsFailureMessage,
  getPriceDetail,
  getText,
  normalizePlaceItem,
  recordGoogleMapsFailure,
  searchGoogleMaps,
  searchGoogleMapsReviews,
} = require('../explore/googleMaps.service');

const CACHE_TTL_MS = 30 * 60 * 1000;
const inMemoryCache = new Map();

const mapCategoryQueries = {
  hotels: 'hotels',
  airports: 'airports',
  train: 'train stations',
  food: 'restaurants',
  attractions: 'tourist attractions',
  shopping: 'shopping malls',
};
const fallbackPlaces = (category, message = 'Map place details temporarily unavailable') => ({
  available: false,
  category,
  message,
  items: [],
});
const getPhotoUrl = (photo = {}) =>
  photo.prefix && photo.suffix ? `${photo.prefix}800x600${photo.suffix}` : '';
const getHoursSummary = (hours = {}) => {
  if (hours.display) return hours.display;
  if (typeof hours.open_now === 'boolean') return hours.open_now ? 'Open now' : 'Closed now';
  return '';
};
const getAddress = (location = {}) =>
  location.formatted_address ||
  [location.address, location.locality, location.region, location.country].filter(Boolean).join(', ');
const getCoordinate = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);
const normalizeMatchText = (value = '') => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// Foursquare results are normalized to the existing Leaflet marker and detail-card contract.
const normalizeMapPlace = (item = {}, index, category = 'attractions') => {
  const coordinates = item.geocodes?.main || item.geocodes?.roof || {};
  const categoryName = item.categories?.[0]?.name || category;
  const hours = getHoursSummary(item.hours);
  const price = Number(item.price) ? '$'.repeat(Math.min(Number(item.price), 4)) : '';
  const rating = Number(item.rating) ? Number(item.rating) / 2 : null;
  const reviewCount = Number(item.stats?.total_ratings || item.stats?.total_tips || 0);

  return {
    id: String(item.fsq_id || item.fsq_place_id || index),
    foursquarePlaceId: String(item.fsq_id || item.fsq_place_id || ''),
    name: item.name || 'Untitled place',
    category: categoryName,
    categoryId: category,
    address: getAddress(item.location),
    displayName: getAddress(item.location),
    description: item.description || '',
    imageUrl: getPhotoUrl(item.photos?.[0]),
    images: (item.photos || []).map(getPhotoUrl).filter(Boolean),
    rating,
    reviewCount,
    reviews: reviewCount,
    price,
    priceDetail: null,
    hours,
    hoursSummary: hours,
    openState: typeof item.hours?.open_now === 'boolean' ? (item.hours.open_now ? 'Open now' : 'Closed now') : '',
    phone: item.tel || '',
    website: item.website || '',
    summary: [
      categoryName,
      item.description,
      hours,
      price ? `Price: ${price}` : '',
    ]
      .filter(Boolean)
      .join(' | '),
    lat: getCoordinate(item.latitude ?? coordinates.latitude),
    lng: getCoordinate(item.longitude ?? coordinates.longitude),
  };
};
const normalizeGoogleMapPlace = (item = {}, index, category = 'attractions') => {
  const normalized = normalizePlaceItem(item, index, { name: 'Untitled place', category });
  const price = getText(item.price || item.price_level);

  return {
    ...normalized,
    id: String(item.place_id || item.data_id || item.data_cid || normalized.id || index),
    categoryId: category,
    price,
    priceDetail: getPriceDetail(item.price || item.price_level),
    hours: normalized.hoursSummary || normalized.openState || '',
    reviews: normalized.reviewCount,
    summary: [normalized.category, normalized.openState, price ? `Price: ${price}` : ''].filter(Boolean).join(' | '),
    lat: getCoordinate(normalized.coordinates?.latitude),
    lng: getCoordinate(normalized.coordinates?.longitude),
  };
};
const mergePlaceDetails = (basePlace, richPlace) => {
  if (!richPlace) return basePlace;

  return {
    ...basePlace,
    ...richPlace,
    id: basePlace?.id || richPlace.id,
    lat: basePlace?.lat ?? richPlace.lat,
    lng: basePlace?.lng ?? richPlace.lng,
    categoryId: basePlace?.categoryId || richPlace.categoryId,
    address: richPlace.address || basePlace?.address,
  };
};
const mergeProviderPlaces = (foursquarePlaces, googlePlaces) => {
  const unusedGooglePlaces = [...googlePlaces];
  const mergedFoursquarePlaces = foursquarePlaces.map((place) => {
    const matchKey = normalizeMatchText(place.name);
    const matchIndex = unusedGooglePlaces.findIndex((candidate) => {
      const candidateKey = normalizeMatchText(candidate.name);
      return candidateKey === matchKey || candidateKey.includes(matchKey) || matchKey.includes(candidateKey);
    });

    if (matchIndex < 0) return place;
    return mergePlaceDetails(place, unusedGooglePlaces.splice(matchIndex, 1)[0]);
  });

  return [...mergedFoursquarePlaces, ...unusedGooglePlaces];
};
const getExploreCategoryPlaces = async (category, destination) => {
  if (category === 'attractions') {
    return placesService.getAttractionsByDestination(destination);
  }
  if (category === 'hotels') {
    return hotelsService.getHotelsByDestination({ destination });
  }
  if (category === 'food') {
    return restaurantService.getRestaurantsByDestination({ destination });
  }

  return searchGoogleMaps({
    cache: new Map(),
    cacheKey: `${category}|${destination}`,
    query: `${mapCategoryQueries[category] || mapCategoryQueries.attractions} near ${destination}`,
    metadata: { category, destination },
    mapItem: (item, index) => normalizeGoogleMapPlace(item, index, category),
  });
};
const getExplorePlaceDetails = async ({ category, name, address, dataId, placeId }) => {
  if (category === 'attractions') {
    return placesService.getAttractionDetail({ name, address, dataId, placeId });
  }
  if (category === 'hotels') {
    return hotelsService.getHotelDetail({ name, address, dataId, placeId });
  }
  if (category === 'food') {
    return restaurantService.getRestaurantDetail({ name, address, dataId, placeId });
  }

  const result = await searchGoogleMaps({
    cache: new Map(),
    cacheKey: ['map-detail', category, name, address, dataId, placeId].join('|').toLowerCase(),
    query: [name, address].filter(Boolean).join(' '),
    metadata: { category },
    mapItem: (item, index) => normalizeGoogleMapPlace(item, index, category),
  });
  const item = result.items?.[0] || null;
  const reviews = item?.dataId || item?.placeId
    ? await searchGoogleMapsReviews({ dataId: item.dataId, placeId: item.placeId })
    : { items: [] };

  return { available: Boolean(item), item, reviews, message: item ? '' : 'Place details were not found.' };
};
const getCache = async (cacheKey) => {
  const cached = inMemoryCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  if (env.nodeEnv === 'test') {
    return null;
  }
  try {
    const databaseCache = await mapRepository.findValidCache(cacheKey);
    return databaseCache ? { ...databaseCache.data, cached: true } : null;
  } catch {
    return null;
  }
};
const setCache = async (cacheKey, data) => {
  inMemoryCache.set(cacheKey, { data, createdAt: Date.now() });

  if (env.nodeEnv === 'test') {
    return;
  }
  try {
    await mapRepository.upsertCache(cacheKey, data, CACHE_TTL_MS);
  } catch {
    // In-memory cache still prevents repeated calls during this process.
  }
};
const searchMapPlaces = async ({ category, destination, latitude, longitude, limit = 30 }) => {
  const parsedLimit = Math.min(Math.max(Number(limit) || 30, 1), 50);
  const cacheKey = [
    'combined-map-places',
    category,
    destination || '',
    Number(latitude).toFixed(4),
    Number(longitude).toFixed(4),
    parsedLimit,
  ].join('|');
  const cached = await getCache(cacheKey);

  if (cached) {
    return cached;
  }
  if ((!env.foursquareApiKey && !env.serpApiKey) || env.nodeEnv === 'test') {
    return fallbackPlaces(category, 'Foursquare and SerpApi keys are not configured');
  }
  try {
    const query = mapCategoryQueries[category] || mapCategoryQueries.attractions;
    const locationText = destination || `${Number(latitude).toFixed(5)},${Number(longitude).toFixed(5)}`;
    const [foursquareResult, googleResult] = await Promise.allSettled([
      env.foursquareApiKey
        ? searchFoursquarePlaces({ query, latitude, longitude, limit: parsedLimit })
        : Promise.resolve([]),
      env.serpApiKey
        ? getExploreCategoryPlaces(category, locationText)
        : Promise.resolve({ items: [] }),
    ]);
    const foursquarePlaces = foursquareResult.status === 'fulfilled'
      ? foursquareResult.value.map((item, index) => normalizeMapPlace(item, index, category))
      : [];
    const googlePlaces = googleResult.status === 'fulfilled'
      ? (googleResult.value.items || []).map((place, index) => ({
          ...place,
          categoryId: category,
          hours: place.hours || place.hoursSummary || place.openState || '',
          reviews: place.reviews || place.reviewCount || 0,
          lat: getCoordinate(place.lat ?? place.coordinates?.latitude),
          lng: getCoordinate(place.lng ?? place.coordinates?.longitude),
          id: String(place.id || place.placeId || place.dataId || index),
        }))
      : [];
    const places = mergeProviderPlaces(foursquarePlaces, googlePlaces);

    if (foursquareResult.status === 'rejected') {
      const { message, statusCode } = getFoursquareFailureMessage(foursquareResult.reason);
      recordFoursquareFailure('map-places', message, statusCode, { category, destination, latitude, longitude });
    }
    if (googleResult.status === 'rejected') {
      const { message, statusCode } = getGoogleMapsFailureMessage(googleResult.reason);
      recordGoogleMapsFailure('map-places', message, statusCode, { category, destination, latitude, longitude });
    }

    const googleWarning = googleResult.status === 'rejected'
      ? getGoogleMapsFailureMessage(googleResult.reason).message
      : googleResult.value?.available === false
        ? googleResult.value.message || ''
        : '';
    const visiblePlaces = places
      .filter((place) => Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng)))
      .slice(0, parsedLimit);
    const publicPlaces = {
      available: visiblePlaces.length > 0,
      category,
      destination,
      items: visiblePlaces,
      message: googleWarning,
      lastUpdated: new Date().toISOString(),
    };

    if (!googleWarning) {
      await setCache(cacheKey, publicPlaces);
    }
    return publicPlaces;
  } catch (error) {
    return fallbackPlaces(category, error.message || 'Map places are temporarily unavailable');
  }
};
const getMapPlaceDetails = async ({
  category,
  placeId,
  foursquarePlaceId,
  googlePlaceId,
  dataId,
  name,
  address,
  latitude,
  longitude,
}) => {
  const fallbackName = name || 'Selected place';
  const cacheKey = [
    'combined-map-detail',
    category,
    placeId || '',
    foursquarePlaceId || '',
    googlePlaceId || '',
    dataId || '',
    fallbackName,
    address || '',
    latitude || '',
    longitude || '',
  ]
    .join('|')
    .toLowerCase();
  const cached = await getCache(cacheKey);

  if (cached) {
    return cached;
  }
  if ((!env.serpApiKey && !env.foursquareApiKey) || env.nodeEnv === 'test') {
    return {
      available: false,
      message: 'SerpApi and Foursquare API keys are not configured',
      item: null,
    };
  }
  try {
    let foursquarePlace = null;
    let googlePlace = null;
    let googleWarning = '';

    if (env.serpApiKey) {
      try {
        const googleDetails = await getExplorePlaceDetails({
          category,
          name: fallbackName,
          address,
          dataId,
          placeId: googlePlaceId,
        });
        googlePlace = googleDetails.item
          ? {
              ...googleDetails.item,
              categoryId: category,
              hours: googleDetails.item.hours || googleDetails.item.hoursSummary || googleDetails.item.openState || '',
              reviews: googleDetails.item.reviews || googleDetails.item.reviewCount || 0,
              lat: getCoordinate(googleDetails.item.lat ?? googleDetails.item.coordinates?.latitude),
              lng: getCoordinate(googleDetails.item.lng ?? googleDetails.item.coordinates?.longitude),
              reviewItems: googleDetails.reviews?.items || [],
            }
          : null;

        if (!googleDetails.available && googleDetails.message) {
          googleWarning = googleDetails.message;
        }
      } catch (error) {
        const { message, statusCode } = getGoogleMapsFailureMessage(error);
        googleWarning = message;
        recordGoogleMapsFailure('map-place-details', message, statusCode, { category, name, address });
      }
    }

    if (env.foursquareApiKey) {
      try {
        if (foursquarePlaceId) {
          foursquarePlace = await getFoursquarePlace(foursquarePlaceId);
        } else {
          const matches = await searchFoursquarePlaces({
            query: fallbackName,
            latitude,
            longitude,
            limit: 1,
          });
          const matchedPlaceId = matches[0]?.fsq_id || matches[0]?.fsq_place_id;
          foursquarePlace = matchedPlaceId ? await getFoursquarePlace(matchedPlaceId) : null;
        }
      } catch (error) {
        const { message, statusCode } = getFoursquareFailureMessage(error);
        recordFoursquareFailure('map-place-details', message, statusCode, {
          category,
          placeId,
          foursquarePlaceId,
          name,
          address,
        });
      }
    }

    const foursquareItem = foursquarePlace ? normalizeMapPlace(foursquarePlace, 0, category) : null;
    const item = mergePlaceDetails(foursquareItem, googlePlace);
    if (item) {
      item.detailSource = googlePlace ? 'serpapi' : 'foursquare';
      item.enrichmentMessage = googleWarning;
    }
    const details = {
      available: Boolean(item),
      message: googleWarning || (item ? '' : 'Place details were not found.'),
      item,
      lastUpdated: new Date().toISOString(),
    };

    if (!googleWarning) {
      await setCache(cacheKey, details);
    }
    return details;
  } catch (error) {
    return {
      available: false,
      message: error.message || 'Place details are temporarily unavailable.',
      item: null,
    };
  }
};
const getMapWeather = ({ destination, date, latitude, longitude, locationLabel }) =>
  weatherService.getWeatherByDestination(destination, date, {
    latitude,
    longitude,
    locationLabel,
  });
module.exports = { getMapPlaces: searchMapPlaces, getMapPlaceDetails, getMapWeather };
