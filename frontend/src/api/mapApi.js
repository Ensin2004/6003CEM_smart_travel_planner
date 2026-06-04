/**
 * Frontend map API helpers.
 * This file combines backend map endpoints with direct OpenStreetMap and OSRM
 * calls used for client-side search and route previews.
 */
import axiosClient from './axiosClient';

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1';
const routeModeProfiles = {
  car: 'driving',
  bike: 'cycling',
  walking: 'foot',
};
const estimatedModeSpeedsKph = {
  walking: 5,
  car: 45,
  bike: 16,
  train: 80,
  plane: 700,
};

const categorySearchTerms = {
  hotels: ['hotel', 'resort', 'guest house'],
  airports: ['airport'],
  train: ['train station', 'railway station'],
  food: ['restaurant', 'cafe', 'food court'],
  attractions: ['tourist attraction', 'museum', 'viewpoint', 'monument', 'art gallery'],
  shopping: ['shopping mall', 'hypermarket', 'supermarket', 'department store', 'marketplace'],
};

// Search constants above separate provider URLs, route modes, fallback speeds, and category keywords.

// OpenStreetMap errors are converted into short messages suitable for search feedback.
const getOpenStreetMapErrorMessage = (status) => {
  if (status === 429) {
    return 'Map search is busy right now. Please try again in a moment.';
  }
  if (status >= 500) {
    return 'Map search is temporarily unavailable.';
  }

  return 'Unable to search this location.';
};

const isAbortError = (error) => error.name === 'AbortError' || error.name === 'CanceledError';

const getOpenStreetMapImage = (place = {}) => {
  const image = place.extratags?.image || place.extratags?.wikimedia_commons;
  return /^https?:\/\//i.test(image || '') ? image : '';
};

// Nominatim results are normalized to the same marker shape used by backend place searches.
// Number conversion happens here so map components can rely on numeric coordinates.
const normalizeOpenStreetMapPlace = (place, fallbackName = 'Selected place') => ({
  id: `${place.osm_type}-${place.osm_id}`,
  name: place.name || place.display_name?.split(',')[0] || fallbackName,
  displayName: place.display_name || 'Location',
  lat: Number(place.lat),
  lng: Number(place.lon),
  category: place.category || 'place',
  type: place.type || 'location',
  importance: Number(place.importance || 0),
  imageUrl: getOpenStreetMapImage(place),
  openState: place.extratags?.opening_hours || '',
});

// Text search queries Nominatim directly for fast client-side lookup from the map search box.
export const searchOpenStreetMapPlaces = async (query, options = {}) => {
  const trimmedQuery = String(query || '').trim();

  // Very short queries are skipped to avoid noisy provider results and unnecessary requests.
  if (trimmedQuery.length < 2) {
    return [];
  }

  const params = new URLSearchParams({
    q: trimmedQuery,
    format: 'jsonv2',
    addressdetails: '1',
    extratags: '1',
    limit: String(options.limit || 6),
  });
  const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(getOpenStreetMapErrorMessage(response.status));
  }

  const places = await response.json();

  return places
    .map((place) => normalizeOpenStreetMapPlace(place))
    .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
};

// Category search runs several keyword searches around the visible map area.
export const searchOpenStreetMapCategoryPlaces = async (categoryId, center, options = {}) => {
  const searchTerms = categorySearchTerms[categoryId] || [];
  const lat = Number(center?.[0]);
  const lng = Number(center?.[1]);

  if (!searchTerms.length || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return [];
  }

  const radius = Number(options.radius || 0.18);
  const bounds = options.bounds;

  // A bounded viewbox keeps category results near the current map viewport.
  const viewbox = bounds
    ? [
      Number(bounds.west).toFixed(5),
      Number(bounds.north).toFixed(5),
      Number(bounds.east).toFixed(5),
      Number(bounds.south).toFixed(5),
    ].join(',')
    : [
      (lng - radius).toFixed(5),
      (lat + radius).toFixed(5),
      (lng + radius).toFixed(5),
      (lat - radius).toFixed(5),
    ].join(',');
  const limitPerTerm = Math.max(8, Math.ceil((options.limit || 40) / searchTerms.length));

  // Category searches fan out across several search terms, then merge duplicates by OSM id.
  const responses = await Promise.allSettled(searchTerms.map(async (searchTerm) => {
    const params = new URLSearchParams({
      q: searchTerm,
      format: 'jsonv2',
      addressdetails: '1',
      extratags: '1',
      limit: String(limitPerTerm),
      bounded: '1',
      viewbox,
    });
    const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
      },
      signal: options.signal,
    });
    if (!response.ok) {
      throw new Error(getOpenStreetMapErrorMessage(response.status));
    }

    return response.json();
  }));

  const failedRequest = responses.find((result) => result.status === 'rejected');

  if (failedRequest && isAbortError(failedRequest.reason)) {
    throw failedRequest.reason;
  }

  const uniquePlaces = new Map();

  // Fulfilled results are merged by normalized place id so repeated keywords do not duplicate markers.
  responses
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value)
    .forEach((place) => {
      const normalizedPlace = normalizeOpenStreetMapPlace(place, categoryId);

      if (Number.isFinite(normalizedPlace.lat) && Number.isFinite(normalizedPlace.lng)) {
        uniquePlaces.set(normalizedPlace.id, normalizedPlace);
      }
    });

  return [...uniquePlaces.values()]
    .sort((firstPlace, secondPlace) => secondPlace.importance - firstPlace.importance)
    .slice(0, options.limit || 40);
};

// Backend category search is used when provider-specific enrichment is handled by the server.
export const searchMapCategoryPlaces = async (categoryId, center, options = {}) => {
  const response = await axiosClient.get('/map/places', {
    params: {
      category: categoryId,
      destination: options.destination,
      latitude: center?.[0],
      longitude: center?.[1],
      limit: options.limit,
    },
    signal: options.signal,
  });

  const places = response.data.data.places;
  return Array.isArray(places) ? places : places?.items || [];
};

// Place details are requested with the identifying fields available from the selected marker.
export const getMapPlaceDetails = async (place, options = {}) => {
  const response = await axiosClient.get('/map/place-details', {
    params: {
      category: place.categoryId,
      name: place.name,
      address: place.address || place.displayName,
      latitude: place.lat,
      longitude: place.lng,
    },
    signal: options.signal,
  });

  return response.data.data.details;
};

// Weather lookup accepts either destination text or coordinates, depending on map selection context.
export const getMapWeather = async ({ destination, date, latitude, longitude, locationLabel }, options = {}) => {
  const response = await axiosClient.get('/map/weather', {
    params: {
      destination,
      date,
      latitude,
      longitude,
      locationLabel,
    },
    signal: options.signal,
  });

  return response.data.data.weather;
};

// Reverse geocode keeps provider keys on the backend while the browser supplies coordinates.
export const getReverseGeocodeLocation = async ({ latitude, longitude }, options = {}) => {
  const response = await axiosClient.get('/map/reverse-geocode', {
    params: {
      latitude,
      longitude,
    },
    signal: options.signal,
  });

  return response.data.data.location;
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

// The haversine calculation is used when OSRM cannot provide a route for the selected travel mode.
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

// Estimated routes keep the UI useful for train and plane modes that OSRM does not support.
const getEstimatedRoute = (points, mode) => {
  const distanceMeters = points.slice(1).reduce((totalDistance, point, index) => (
    totalDistance + getDistanceMeters(points[index], point)
  ), 0);
  const speedKph = estimatedModeSpeedsKph[mode] || estimatedModeSpeedsKph.car;

  return {
    distanceMeters,
    durationSeconds: distanceMeters / ((speedKph * 1000) / 3600),
    coordinates: points.map((point) => [Number(point.lat), Number(point.lng)]),
    estimated: true,
    mode,
  };
};

// Route lookup accepts either an array of points or the older origin/destination pair signature.
export const getRouteBetweenPlaces = async (pointsOrOrigin, destination, options = {}) => {
  const points = Array.isArray(pointsOrOrigin)
    ? pointsOrOrigin
    : [pointsOrOrigin, destination];
  const mode = options.mode || 'car';
  const validPoints = points
    .map((point) => ({
      ...point,
      lat: Number(point?.lat),
      lng: Number(point?.lng),
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

  if (validPoints.length < 2) {
    throw new Error('Route needs at least two points.');
  }

  if (!routeModeProfiles[mode]) {
    return getEstimatedRoute(validPoints, mode);
  }

  // OSRM supports driving, cycling, and walking; unsupported modes use estimated speed instead.
  const coordinates = validPoints.map((point) => `${point.lng},${point.lat}`).join(';');
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'false',
  });
  try {
    const response = await fetch(`${OSRM_ROUTE_URL}/${routeModeProfiles[mode]}/${coordinates}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
      },
      signal: options.signal,
    });

    if (!response.ok) {
      return getEstimatedRoute(validPoints, mode);
    }

    const routeData = await response.json();
    const route = routeData.routes?.[0];

    if (!route) {
      return getEstimatedRoute(validPoints, mode);
    }

    return {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      estimated: false,
      mode,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    // Network or provider failures fall back to distance-based estimates instead of blanking the route.
    return getEstimatedRoute(validPoints, mode);
  }
};
