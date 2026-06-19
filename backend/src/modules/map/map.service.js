/**
 * Map aggregation service for routes, places, geocoding, and weather.
 * Combines Geoapify, OpenRouteService, Foursquare, Google Maps, and local cache data.
 */
const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');
const { classifyExternalApiError } = require('../../utils/externalApiError');
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

// Cache TTL: 30 minutes
const CACHE_TTL_MS = 30 * 60 * 1000;

// In-memory cache for quick lookup
const inMemoryCache = new Map();

// Geoapify client for geocoding
const geoapifyClient = axios.create({
  baseURL: 'https://api.geoapify.com',
  timeout: 8000,
});

// OpenRouteService client for routing
const openRouteServiceClient = axios.create({
  baseURL: 'https://api.openrouteservice.org',
  timeout: 12000,
});

// Map travel modes to OpenRouteService profiles
const openRouteServiceProfiles = {
  car: 'driving-car',
  walking: 'foot-walking',
  bike: 'cycling-regular',
};

// Estimated speeds (km/h) for fallback route calculations
const estimatedModeSpeedsKph = {
  walking: 5,
  car: 45,
  bike: 16,
  train: 80,
  plane: 700,
};

// Map category names to search queries
const mapCategoryQueries = {
  hotels: 'hotels',
  airports: 'airports',
  train: 'train stations',
  food: 'restaurants',
  attractions: 'tourist attractions',
  shopping: 'shopping malls',
};

/**
 * Creates a fallback places response when search fails.
 * @param {string} category - Place category
 * @param {string} message - Error message
 * @returns {Object} Fallback response object
 */
const fallbackPlaces = (category, message = 'Map place details temporarily unavailable') => ({
  available: false,
  category,
  message,
  items: [],
});

/**
 * Extracts photo URL from Foursquare photo object.
 * @param {Object} photo - Photo object with prefix and suffix
 * @returns {string} Full photo URL
 */
const getPhotoUrl = (photo = {}) =>
  photo.prefix && photo.suffix ? `${photo.prefix}800x600${photo.suffix}` : '';

/**
 * Extracts hours summary from Foursquare hours object.
 * @param {Object} hours - Hours object
 * @returns {string} Human-readable hours string
 */
const getHoursSummary = (hours = {}) => {
  if (hours.display) return hours.display;
  if (typeof hours.open_now === 'boolean') return hours.open_now ? 'Open now' : 'Closed now';
  return '';
};

/**
 * Formats address from Foursquare location object.
 * @param {Object} location - Location object
 * @returns {string} Formatted address string
 */
const getAddress = (location = {}) =>
  location.formatted_address ||
  [location.address, location.locality, location.region, location.country].filter(Boolean).join(', ');

/**
 * Safely extracts coordinate as number.
 * @param {*} value - Coordinate value
 * @returns {number|null} Valid coordinate or null
 */
const getCoordinate = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

/**
 * Normalizes text for matching/string comparison.
 * @param {string} value - Text to normalize
 * @returns {string} Lowercase alphanumeric only
 */
const normalizeMatchText = (value = '') => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Converts degrees to radians.
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRadians = (degrees) => degrees * (Math.PI / 180);

/**
 * Calculates distance between two points using Haversine formula.
 * @param {Object} firstPoint - First point with lat and lng
 * @param {Object} secondPoint - Second point with lat and lng
 * @returns {number} Distance in meters
 */
const getDistanceMeters = (firstPoint, secondPoint) => {
  const earthRadiusMeters = 6371000;
  const firstLat = toRadians(Number(firstPoint.lat));
  const secondLat = toRadians(Number(secondPoint.lat));
  const latDifference = toRadians(Number(secondPoint.lat) - Number(firstPoint.lat));
  const lngDifference = toRadians(Number(secondPoint.lng) - Number(firstPoint.lng));
  const haversineValue = Math.sin(latDifference / 2) ** 2
    + Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(lngDifference / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));
};

/**
 * Calculates total path distance for a series of points.
 * @param {Array} points - Array of points with lat and lng
 * @returns {number} Total distance in meters
 */
const getPathDistanceMeters = (points) => points.slice(1).reduce(
  (totalDistance, point, index) => totalDistance + getDistanceMeters(points[index], point),
  0
);

/**
 * Optimizes point order using Dijkstra's algorithm to minimize travel distance.
 * @param {Array} points - Array of points with lat and lng
 * @returns {Array} Optimal order indices
 */
const getDijkstraOptimizedOrder = (points) => {
  // For 3 or fewer points, no optimization needed
  if (points.length <= 3) {
    return points.map((_, index) => index);
  }

  const destinationIndex = points.length - 1;
  const intermediateIndexes = points.slice(1, destinationIndex).map((_, index) => index + 1);
  const allVisitedMask = (1 << intermediateIndexes.length) - 1;
  const distances = new Map();
  const previousStates = new Map();
  const queue = [{ mask: 0, currentIndex: 0, distance: 0 }];
  const getStateKey = (mask, currentIndex) => `${mask}:${currentIndex}`;

  distances.set(getStateKey(0, 0), 0);

  // Dijkstra's algorithm for TSP path optimization
  while (queue.length) {
    queue.sort((firstState, secondState) => firstState.distance - secondState.distance);
    const currentState = queue.shift();
    const currentKey = getStateKey(currentState.mask, currentState.currentIndex);

    if (currentState.distance !== distances.get(currentKey)) {
      continue; // Skip outdated queue entries
    }
    if (currentState.mask === allVisitedMask) {
      break; // All intermediate points visited
    }

    intermediateIndexes.forEach((pointIndex, bitIndex) => {
      const bit = 1 << bitIndex;

      if (currentState.mask & bit) {
        return; // Already visited this point
      }

      const nextMask = currentState.mask | bit;
      const nextDistance = currentState.distance + getDistanceMeters(
        points[currentState.currentIndex],
        points[pointIndex]
      );
      const nextKey = getStateKey(nextMask, pointIndex);

      // Update if better path found
      if (nextDistance < (distances.get(nextKey) ?? Number.POSITIVE_INFINITY)) {
        distances.set(nextKey, nextDistance);
        previousStates.set(nextKey, currentKey);
        queue.push({ mask: nextMask, currentIndex: pointIndex, distance: nextDistance });
      }
    });
  }

  // Find best final state (all intermediate visited, then go to destination)
  let bestFinalState = null;
  intermediateIndexes.forEach((pointIndex) => {
    const stateKey = getStateKey(allVisitedMask, pointIndex);
    const routeDistance = distances.get(stateKey);

    if (routeDistance === undefined) {
      return;
    }

    const totalDistance = routeDistance + getDistanceMeters(points[pointIndex], points[destinationIndex]);
    if (!bestFinalState || totalDistance < bestFinalState.distance) {
      bestFinalState = { stateKey, distance: totalDistance };
    }
  });

  if (!bestFinalState) {
    return points.map((_, index) => index); // Fallback to original order
  }

  // Reconstruct path from state history
  const reversedIntermediateOrder = [];
  let stateKey = bestFinalState.stateKey;

  while (stateKey !== getStateKey(0, 0)) {
    const [, currentIndex] = stateKey.split(':').map(Number);
    reversedIntermediateOrder.push(currentIndex);
    stateKey = previousStates.get(stateKey);
  }

  return [0, ...reversedIntermediateOrder.reverse(), destinationIndex];
};

/**
 * Optimizes route by reordering points for shortest path.
 * @param {Array} points - Array of points with lat and lng
 * @returns {Object} Optimized points and optimization metadata
 */
const optimizeMapPoints = (points) => {
  const pointOrder = getDijkstraOptimizedOrder(points);
  const optimizedPoints = pointOrder.map((pointIndex) => points[pointIndex]);
  const originalDistanceMeters = getPathDistanceMeters(points);
  const optimizedDistanceMeters = getPathDistanceMeters(optimizedPoints);

  return {
    points: optimizedPoints,
    optimization: {
      algorithm: 'dijkstra',
      pointOrder,
      originalDistanceMeters,
      optimizedDistanceMeters,
      savedDistanceMeters: Math.max(0, originalDistanceMeters - optimizedDistanceMeters),
    },
  };
};

/**
 * Ranks routes by distance and duration scores.
 * @param {Array} routes - Array of route objects
 * @returns {Array} Ranked routes with rank and best flags
 */
const rankRoutes = (routes) => {
  const distances = routes.map((route) => route.distanceMeters);
  const durations = routes.map((route) => route.durationSeconds);
  const shortestDistance = Math.min(...distances);
  const shortestDuration = Math.min(...durations);
  const distanceRange = Math.max(...distances) - shortestDistance || 1;
  const durationRange = Math.max(...durations) - shortestDuration || 1;

  return routes
    .map((route) => ({
      ...route,
      isShortest: route.distanceMeters === shortestDistance,
      isFastest: route.durationSeconds === shortestDuration,
      // Lower score is better (composite of distance and duration)
      score:
        ((route.distanceMeters - shortestDistance) / distanceRange)
        + ((route.durationSeconds - shortestDuration) / durationRange),
    }))
    .sort((firstRoute, secondRoute) => firstRoute.score - secondRoute.score)
    .map((route, index) => ({
      ...route,
      rank: index + 1,
      isBest: index === 0,
    }));
};

/**
 * Generates estimated routes when external API is unavailable.
 * @param {Array} points - Route points
 * @param {string} mode - Travel mode
 * @param {string} message - Status message
 * @param {Object} optimization - Optimization metadata
 * @returns {Object} Estimated route response
 */
const getEstimatedMapRoutes = (points, mode, message, optimization) => {
  const distanceMeters = getPathDistanceMeters(points);
  const speedKph = estimatedModeSpeedsKph[mode] || estimatedModeSpeedsKph.car;
  const routes = rankRoutes([{
    id: `${mode}-estimate-1`,
    distanceMeters,
    durationSeconds: distanceMeters / ((speedKph * 1000) / 3600),
    coordinates: points.map((point) => [Number(point.lat), Number(point.lng)]),
  }]);

  return {
    mode,
    provider: 'estimate',
    estimated: true,
    message,
    bestRouteId: routes[0].id,
    routes,
    optimization,
  };
};

/**
 * Normalizes OpenRouteService response to standard route format.
 * @param {Object} feature - GeoJSON feature from OpenRouteService
 * @param {number} index - Route index
 * @returns {Object} Normalized route object
 */
const normalizeOpenRouteServiceRoute = (feature, index) => ({
  id: `ors-route-${index + 1}`,
  distanceMeters: Number(feature.properties?.summary?.distance || 0),
  durationSeconds: Number(feature.properties?.summary?.duration || 0),
  coordinates: (feature.geometry?.coordinates || []).map(([longitude, latitude]) => [latitude, longitude]),
});

/**
 * Calculates and ranks routes for map points, with local estimates as fallback.
 * @param {object} input Ordered map points and travel mode.
 * @returns {Promise<object>} Route alternatives and optimization metadata.
 */
const getMapRoutes = async ({ points = [], mode = 'car' }) => {
  const normalizedPoints = points.map((point) => ({
    lat: Number(point.lat),
    lng: Number(point.lng),
  }));
  
  // Optimize point order for efficient routing
  const optimizedRoute = optimizeMapPoints(normalizedPoints);
  const optimizedPoints = optimizedRoute.points;
  const profile = openRouteServiceProfiles[mode];

  // Return estimated route if mode is not supported by OpenRouteService
  if (!profile) {
    return getEstimatedMapRoutes(
      optimizedPoints,
      mode,
      `${mode === 'train' ? 'Train' : 'Plane'} times are estimates and do not include live schedules.`,
      optimizedRoute.optimization
    );
  }
  
  // Return estimated route if API key is not configured
  if (!env.openRouteServiceApiKey) {
    return getEstimatedMapRoutes(
      optimizedPoints,
      mode,
      'OpenRouteService API key is not configured, so this route is estimated.',
      optimizedRoute.optimization
    );
  }

  try {
    const requestBody = {
      coordinates: optimizedPoints.map((point) => [point.lng, point.lat]),
      instructions: false,
    };

    // Request alternative routes for point-to-point navigation
    if (optimizedPoints.length === 2) {
      requestBody.alternative_routes = {
        target_count: 2,
        share_factor: 0.6,
        weight_factor: 1.4,
      };
    }

    const response = await openRouteServiceClient.post(
      `/v2/directions/${profile}/geojson`,
      requestBody,
      {
        headers: {
          Accept: 'application/geo+json, application/json',
          Authorization: env.openRouteServiceApiKey,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const routes = rankRoutes(
      (response.data?.features || [])
        .map(normalizeOpenRouteServiceRoute)
        .filter((route) => route.coordinates.length && route.distanceMeters > 0 && route.durationSeconds > 0)
    );

    // Fallback to estimated route if no valid routes returned
    if (!routes.length) {
      return getEstimatedMapRoutes(
        optimizedPoints,
        mode,
        'No mapped route was returned, so this route is estimated.',
        optimizedRoute.optimization
      );
    }

    return {
      mode,
      provider: 'openrouteservice',
      estimated: false,
      message: '',
      bestRouteId: routes[0].id,
      routes,
      optimization: optimizedRoute.optimization,
    };
  } catch (error) {
    // Log failure and return estimated route
    logger.warn(`OpenRouteService route lookup failed: ${error.message}`);
    return getEstimatedMapRoutes(
      optimizedPoints,
      mode,
      'OpenRouteService is temporarily unavailable, so this route is estimated.',
      optimizedRoute.optimization
    );
  }
};

/**
 * Creates a fallback location response for reverse geocoding.
 * @param {Object} coordinates - Latitude and longitude
 * @param {string} message - Error message
 * @returns {Object} Fallback location object
 */
const fallbackLocation = ({ latitude, longitude }, message = 'Current location name unavailable') => ({
  available: false,
  message,
  label: 'current area',
  state: '',
  country: '',
  coordinates: {
    latitude: Number(latitude),
    longitude: Number(longitude),
  },
});

/**
 * Records geocoding failures to the logging service.
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} metadata - Additional context
 * @param {string} errorCode - Standardized error code
 */
const recordMapGeocodeFailure = (message, statusCode, metadata = {}, errorCode) => {
  logger.warn(`Geoapify reverse geocode failed: ${message}`);
  if (env.nodeEnv === 'test') {
    return;
  }

  apiLogService
    .recordEvent({
      service: 'geoapify',
      category: 'map',
      severity: statusCode >= 500 ? 'error' : 'warning',
      method: 'GET',
      endpoint: '/v1/geocode/reverse',
      status: 'fail',
      statusCode,
      errorCode,
      message,
      metadata,
    })
    .catch((error) => logger.error(`Failed to record map geocode event: ${error.message}`));
};

/**
 * Normalizes Foursquare place to map display format.
 * @param {Object} item - Foursquare place object
 * @param {number} index - Index for fallback ID
 * @param {string} category - Place category
 * @returns {Object} Normalized place for map display
 */
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

/**
 * Normalizes Google Maps place to map display format.
 * @param {Object} item - Google Maps place object
 * @param {number} index - Index for fallback ID
 * @param {string} category - Place category
 * @returns {Object} Normalized place for map display
 */
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

/**
 * Merges place details from multiple providers.
 * @param {Object} basePlace - Primary place object
 * @param {Object} richPlace - Secondary place with additional details
 * @returns {Object} Merged place object
 */
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

/**
 * Merges places from Foursquare and Google Maps, deduplicating by name.
 * @param {Array} foursquarePlaces - Places from Foursquare
 * @param {Array} googlePlaces - Places from Google Maps
 * @returns {Array} Merged and deduplicated place list
 */
const mergeProviderPlaces = (foursquarePlaces, googlePlaces) => {
  const unusedGooglePlaces = [...googlePlaces];
  
  // Match Foursquare places with Google places by name similarity
  const mergedFoursquarePlaces = foursquarePlaces.map((place) => {
    const matchKey = normalizeMatchText(place.name);
    const matchIndex = unusedGooglePlaces.findIndex((candidate) => {
      const candidateKey = normalizeMatchText(candidate.name);
      return candidateKey === matchKey || candidateKey.includes(matchKey) || matchKey.includes(candidateKey);
    });

    // Merge if match found, otherwise keep Foursquare place
    if (matchIndex < 0) return place;
    return mergePlaceDetails(place, unusedGooglePlaces.splice(matchIndex, 1)[0]);
  });

  return [...mergedFoursquarePlaces, ...unusedGooglePlaces];
};

/**
 * Retrieves category-specific places from explore services.
 * @param {string} category - Place category
 * @param {string} destination - Destination name
 * @returns {Promise<Object>} Place search results
 */
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

  // Default to Google Maps search for other categories
  return searchGoogleMaps({
    cache: new Map(),
    cacheKey: `${category}|${destination}`,
    query: `${mapCategoryQueries[category] || mapCategoryQueries.attractions} near ${destination}`,
    metadata: { category, destination },
    mapItem: (item, index) => normalizeGoogleMapPlace(item, index, category),
  });
};

/**
 * Retrieves detailed place information from explore services.
 * @param {Object} params - Place identification parameters
 * @returns {Promise<Object>} Place details with reviews
 */
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

  // Default to Google Maps search for other categories
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

/**
 * Retrieves cached data from in-memory or database cache.
 * @param {string} cacheKey - Cache key
 * @returns {Promise<Object|null>} Cached data or null
 */
const getCache = async (cacheKey) => {
  // Check in-memory cache first
  const cached = inMemoryCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  // Skip database cache in test environment
  if (env.nodeEnv === 'test') {
    return null;
  }
  
  // Check database cache
  try {
    const databaseCache = await mapRepository.findValidCache(cacheKey);
    return databaseCache ? { ...databaseCache.data, cached: true } : null;
  } catch {
    return null;
  }
};

/**
 * Stores data in both in-memory and database caches.
 * @param {string} cacheKey - Cache key
 * @param {Object} data - Data to cache
 * @returns {Promise<void>}
 */
const setCache = async (cacheKey, data) => {
  // Store in-memory cache
  inMemoryCache.set(cacheKey, { data, createdAt: Date.now() });

  // Skip database cache in test environment
  if (env.nodeEnv === 'test') {
    return;
  }
  
  // Store database cache (fire and forget)
  try {
    await mapRepository.upsertCache(cacheKey, data, CACHE_TTL_MS);
  } catch {
    // In-memory cache still prevents repeated calls during this process.
  }
};

/**
 * Searches nearby places and merges available provider results.
 * @param {object} input Category, destination, coordinates, and result limit.
 * @returns {Promise<object>} Normalized map places with source metadata.
 */
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
  
  // Check cache
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Validate API keys
  if ((!env.foursquareApiKey && !env.serpApiKey) || env.nodeEnv === 'test') {
    return {
      ...fallbackPlaces(category, 'Foursquare and SerpApi keys are not configured'),
      errorCode: 'INVALID_API_KEY',
    };
  }
  
  try {
    const query = mapCategoryQueries[category] || mapCategoryQueries.attractions;
    const locationText = destination || `${Number(latitude).toFixed(5)},${Number(longitude).toFixed(5)}`;
    
    // Query both providers in parallel
    const [foursquareResult, googleResult] = await Promise.allSettled([
      env.foursquareApiKey
        ? searchFoursquarePlaces({ query, latitude, longitude, limit: parsedLimit })
        : Promise.resolve([]),
      env.serpApiKey
        ? getExploreCategoryPlaces(category, locationText)
        : Promise.resolve({ items: [] }),
    ]);
    
    // Normalize results from both providers
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
      
    // Merge and deduplicate places
    const places = mergeProviderPlaces(foursquarePlaces, googlePlaces);

    // Record failures for rejected promises
    if (foursquareResult.status === 'rejected') {
      const { errorCode, message, statusCode } = getFoursquareFailureMessage(foursquareResult.reason);
      recordFoursquareFailure('map-places', message, statusCode, { category, destination, latitude, longitude }, errorCode);
    }
    if (googleResult.status === 'rejected') {
      const { errorCode, message, statusCode } = getGoogleMapsFailureMessage(googleResult.reason);
      recordGoogleMapsFailure('map-places', message, statusCode, { category, destination, latitude, longitude }, errorCode);
    }

    const googleWarning = googleResult.status === 'rejected'
      ? getGoogleMapsFailureMessage(googleResult.reason).message
      : googleResult.value?.available === false
        ? googleResult.value.message || ''
        : '';
        
    // Filter places with valid coordinates
    const visiblePlaces = places
      .filter((place) => Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng)))
      .slice(0, parsedLimit);
      
    const publicPlaces = {
      available: visiblePlaces.length > 0,
      category,
      destination,
      items: visiblePlaces,
      message: googleWarning || (visiblePlaces.length ? '' : 'No map places found for this search.'),
      ...(visiblePlaces.length ? {} : { errorCode: 'NO_RESULTS_FOUND' }),
      lastUpdated: new Date().toISOString(),
    };

    // Cache successful responses
    if (!googleWarning) {
      await setCache(cacheKey, publicPlaces);
    }
    return publicPlaces;
  } catch (error) {
    return fallbackPlaces(category, error.message || 'Map places are temporarily unavailable');
  }
};

/**
 * Retrieves and enriches details for a selected map place.
 * @param {object} input Category, place identity, address, and provider identifiers.
 * @returns {Promise<object>} Detailed place data, reviews, photos, and description.
 */
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
    
  // Check cache
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Validate API keys
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

    // Fetch Google Maps details if API key is available
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
        const { errorCode, message, statusCode } = getGoogleMapsFailureMessage(error);
        googleWarning = message;
        recordGoogleMapsFailure('map-place-details', message, statusCode, { category, name, address }, errorCode);
      }
    }

    // Fetch Foursquare details if API key is available
    if (env.foursquareApiKey) {
      try {
        if (foursquarePlaceId) {
          foursquarePlace = await getFoursquarePlace(foursquarePlaceId);
        } else {
          // Search for place by name and coordinates
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
        const { errorCode, message, statusCode } = getFoursquareFailureMessage(error);
        recordFoursquareFailure('map-place-details', message, statusCode, {
          category,
          placeId,
          foursquarePlaceId,
          name,
          address,
        }, errorCode);
      }
    }

    // Merge details from both providers
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

    // Cache successful responses
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

/**
 * Delegates map weather lookup using destination text or known coordinates.
 * @param {object} input Destination, date, coordinates, and display label.
 * @returns {Promise<object>} Normalized weather result.
 */
const getMapWeather = ({ destination, date, latitude, longitude, locationLabel }) =>
  weatherService.getWeatherByDestination(destination, date, {
    latitude,
    longitude,
    locationLabel,
  });

/**
 * Normalizes reverse geocoding response to consistent format.
 * @param {Object} feature - Geoapify feature
 * @param {Object} coordinates - Latitude and longitude
 * @returns {Object} Normalized location object
 */
const normalizeReverseGeocodeLocation = (feature = {}, coordinates = {}) => {
  const properties = feature.properties || {};
  const state = properties.state || properties.county || properties.city || '';
  const country = properties.country || '';
  const city = properties.city || properties.town || properties.village || properties.suburb || '';
  const labelParts = [city && city !== state ? city : '', state, country].filter(Boolean);

  return {
    available: Boolean(labelParts.length),
    message: labelParts.length ? '' : 'Current location name unavailable',
    label: labelParts.join(', ') || 'current area',
    city,
    state,
    country,
    countryCode: properties.country_code?.toUpperCase() || '',
    formatted: properties.formatted || labelParts.join(', '),
    coordinates: {
      latitude: Number(coordinates.latitude),
      longitude: Number(coordinates.longitude),
    },
  };
};

/**
 * Resolves coordinates into a human-readable Geoapify location.
 * @param {{latitude: number, longitude: number}} coordinates Map coordinates.
 * @returns {Promise<object>} Normalized location or an availability fallback.
 */
const getReverseGeocodeLocation = async ({ latitude, longitude }) => {
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  const cacheKey = ['reverse-geocode', parsedLatitude.toFixed(4), parsedLongitude.toFixed(4)].join('|');
  
  // Check cache
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Validate API key
  if (!env.geoapifyApiKey || env.nodeEnv === 'test') {
    return fallbackLocation({ latitude: parsedLatitude, longitude: parsedLongitude }, 'Geoapify API key is not configured');
  }

  try {
    const response = await geoapifyClient.get('/v1/geocode/reverse', {
      params: {
        lat: parsedLatitude,
        lon: parsedLongitude,
        apiKey: env.geoapifyApiKey,
      },
    });
    const feature = response.data?.features?.[0];
    const location = feature
      ? normalizeReverseGeocodeLocation(feature, { latitude: parsedLatitude, longitude: parsedLongitude })
      : fallbackLocation({ latitude: parsedLatitude, longitude: parsedLongitude });

    await setCache(cacheKey, location);
    return location;
  } catch (error) {
    const statusCode = error.response?.status || 503;
    const message =
      statusCode === 429
        ? 'Location lookup rate limit reached'
        : statusCode >= 500
          ? 'Location lookup is temporarily unavailable'
          : 'Unable to identify current location';
    recordMapGeocodeFailure(message, statusCode, { latitude: parsedLatitude, longitude: parsedLongitude });
    return fallbackLocation({ latitude: parsedLatitude, longitude: parsedLongitude }, message);
  }
};

/**
 * Resolves a location query into coordinates through Geoapify.
 * @param {string} query Location name or address.
 * @returns {Promise<object>} Normalized coordinates and address information.
 */
const getGeocodeLocation = async (query) => {
  const normalizedQuery = String(query || '').trim();
  const cacheKey = ['geocode', normalizedQuery.toLowerCase()].join('|');
  
  // Check cache
  const cached = await getCache(cacheKey);
  if (cached) return cached;
  
  // Validate API key
  if (!env.geoapifyApiKey || env.nodeEnv === 'test') {
    return {
      available: false,
      errorCode: 'INVALID_API_KEY',
      message: 'Location search is not configured',
    };
  }

  try {
    const response = await geoapifyClient.get('/v1/geocode/search', {
      params: {
        text: normalizedQuery,
        format: 'geojson',
        limit: 1,
        apiKey: env.geoapifyApiKey,
      },
    });
    const feature = response.data?.features?.[0];
    const properties = feature?.properties || {};
    const [longitude, latitude] = feature?.geometry?.coordinates || [];
    const location = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
      ? {
        available: true,
        name: properties.name || properties.city || properties.state || normalizedQuery,
        country: properties.country || '',
        address: properties.formatted || normalizedQuery,
        latitude: Number(latitude),
        longitude: Number(longitude),
      }
      : {
          available: false,
          errorCode: 'NO_RESULTS_FOUND',
          message: 'Location not found',
        };

    await setCache(cacheKey, location);
    return location;
  } catch (error) {
    const failure = classifyExternalApiError(error, {
      invalidApiKeyMessage: 'Geoapify API key is invalid or unauthorized.',
      networkMessage: 'Location search service could not be reached.',
      rateLimitMessage: 'Location search is busy. Please try again shortly.',
      timeoutMessage: 'Location search request timed out.',
      unavailableMessage: 'Location search is temporarily unavailable.',
    });
    recordMapGeocodeFailure(failure.message, failure.statusCode, { query: normalizedQuery }, failure.errorCode);
    return { available: false, errorCode: failure.errorCode, message: failure.message };
  }
};

module.exports = {
  getGeocodeLocation,
  getMapPlaces: searchMapPlaces,
  getMapPlaceDetails,
  getMapRoutes,
  getMapWeather,
  getReverseGeocodeLocation,
};