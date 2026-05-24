const axios = require('axios');
const env = require('../../config/env');
const weatherService = require('../explore/weather.service');
const placesService = require('../explore/places.service');
const restaurantService = require('../explore/restaurant.service');
const hotelsService = require('../explore/hotels.service');
const aiService = require('../explore/exploreAi.service');
const travelGuideRepository = require('./travelGuide.repository');

const geoapifyClient = axios.create({
  baseURL: 'https://api.geoapify.com',
  timeout: 10000,
});

const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

const getCacheKey = (key, params) => `${key}:${JSON.stringify(params)}`.toLowerCase();

const withCache = async (key, params, fetcher) => {
  const cacheKey = getCacheKey(key, params);
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.value;
  }

  if (env.nodeEnv !== 'test') {
    const storedCache = await travelGuideRepository.findValidCache(cacheKey).catch(() => null);

    if (storedCache) {
      cache.set(cacheKey, { createdAt: Date.now(), value: storedCache.payload });
      return storedCache.payload;
    }
  }

  const value = await fetcher();
  cache.set(cacheKey, { createdAt: Date.now(), value });

  if (env.nodeEnv !== 'test') {
    travelGuideRepository
      .upsertCache(cacheKey, key, value, new Date(Date.now() + CACHE_TTL_MS))
      .catch(() => {});
  }

  return value;
};

const unavailable = (message = 'Geoapify API key is not configured') => ({
  available: false,
  message,
});

const requireGeoapifyKey = () => {
  if (!env.geoapifyApiKey || env.nodeEnv === 'test') {
    return unavailable();
  }

  return null;
};

const requestGeoapify = async (path, params) => {
  const response = await geoapifyClient.get(path, {
    params: {
      ...params,
      apiKey: env.geoapifyApiKey,
    },
  });

  return response.data;
};

const getFeatureName = (properties = {}) =>
  properties.name ||
  properties.address_line1 ||
  properties.city ||
  properties.state ||
  properties.country ||
  properties.formatted ||
  'Unnamed place';

const getFeatureImage = (name, type) =>
  `https://source.unsplash.com/900x640/?${encodeURIComponent(`${name} ${type} travel`)}`;

const normalizeFeature = (feature = {}, index = 0, fallbackType = 'Destination') => {
  const properties = feature.properties || {};
  const name = getFeatureName(properties);
  const categories = properties.categories || [];

  return {
    id: properties.place_id || `${name}-${index}`,
    name,
    type: properties.result_type || fallbackType,
    region: properties.state || properties.city || properties.country || '',
    country: properties.country || '',
    countryCode: properties.country_code?.toUpperCase() || '',
    address: properties.formatted || [properties.address_line1, properties.address_line2].filter(Boolean).join(', '),
    categories,
    imageUrl: getFeatureImage(name, fallbackType),
    coordinates: {
      latitude: properties.lat,
      longitude: properties.lon,
    },
  };
};

const getBoundingBox = (properties = {}) => {
  const bbox = properties.bbox;

  if (bbox?.lon1 && bbox?.lat1 && bbox?.lon2 && bbox?.lat2) {
    return `rect:${bbox.lon1},${bbox.lat1},${bbox.lon2},${bbox.lat2}`;
  }

  if (properties.lon && properties.lat) {
    return `circle:${properties.lon},${properties.lat},35000`;
  }

  return '';
};

const geocode = async (text) =>
  withCache('geocode', { text }, async () => {
    const data = await requestGeoapify('/v1/geocode/search', {
      text,
      limit: 1,
      format: 'geojson',
    });

    return data.features?.[0] || null;
  });

const getPlaces = async ({ filter, categories, limit = 20, offset = 0, bias, name }) =>
  withCache('places', { filter, categories, limit, offset, bias, name }, async () => {
    const data = await requestGeoapify('/v2/places', {
      categories,
      filter,
      bias,
      name,
      limit,
      offset,
      lang: 'en',
    });

    return data.features || [];
  });

const fetchSummary = async (destination) => {
  try {
    const title = encodeURIComponent(destination.replace(/\s+/g, '_'));
    const response = await axios.get(`https://en.wikivoyage.org/api/rest_v1/page/summary/${title}`, {
      timeout: 8000,
      headers: {
        'User-Agent': 'SmartTravelPlanner/1.0',
      },
    });

    return {
      available: true,
      title: response.data.title,
      extract: response.data.extract,
      url: response.data.content_urls?.desktop?.page,
      imageUrl: response.data.thumbnail?.source,
      source: 'Wikivoyage',
    };
  } catch {
    return {
      available: false,
      title: destination,
      extract: '',
      source: 'Wikivoyage',
    };
  }
};

const normalizeGuideItem = (item = {}, index = 0, fallbackType = 'Destination') => ({
  id: item.id || `${item.name}-${index}`,
  name: item.name,
  type: item.category || fallbackType,
  region: item.address || '',
  country: '',
  countryCode: '',
  address: item.address || '',
  rating: item.rating,
  reviewCount: item.reviewCount,
  price: item.price,
  openState: item.openState,
  imageUrl: item.imageUrl || item.imageUrls?.[0] || getFeatureImage(item.name, fallbackType),
  imageUrls: item.imageUrls || (item.imageUrl ? [item.imageUrl] : []),
  coordinates: item.coordinates,
});

const getCountryCodeFilter = (countryCode) => (countryCode ? `countrycode:${countryCode.toLowerCase()}` : '');

const getDestinationList = async ({ country, countryCode, mode = 'domestic', region = '', limit = 24, page = 1, search = '' }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Number(limit) || 24, 48);
  const start = (currentPage - 1) * pageSize;

  if (env.serpApiKey && env.nodeEnv !== 'test') {
    const attractions = await placesService.getAttractionsByDestination(`popular tourist destinations in ${country}`, start);
    const items = (attractions.items || []).slice(0, pageSize).map((item, index) => normalizeGuideItem(item, start + index));

    return {
      available: attractions.available,
      mode,
      country,
      countryCode,
      region,
      items,
      message: attractions.message,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: attractions.hasMore ? start + items.length + pageSize : start + items.length,
        totalPages: attractions.hasMore ? currentPage + 1 : currentPage,
        hasMore: Boolean(attractions.hasMore),
      },
    };
  }

  const keyError = requireGeoapifyKey();
  if (keyError) return { ...keyError, items: [] };

  const locationQuery = mode === 'domestic' ? country : region || country || 'world';
  const locationFeature = await geocode(locationQuery);
  const fallbackFilter = countryCode ? getCountryCodeFilter(countryCode) : '';
  const filter = getBoundingBox(locationFeature?.properties) || fallbackFilter;

  if (!filter) {
    return { available: false, message: 'Unable to find this guide location.', items: [] };
  }

  const categories =
    mode === 'domestic'
      ? 'tourism.sights,tourism.attraction,entertainment.museum,natural'
      : 'tourism.sights,tourism.attraction,entertainment.museum';
  const features = await getPlaces({
    filter,
    categories,
    limit: pageSize,
    offset: start,
  });

  const items = features
    .map((feature, index) => normalizeFeature(feature, index, 'Destination'))
    .filter((item) => item.name && item.name !== 'Unnamed place');

  return {
    available: true,
    mode,
    country,
    countryCode,
    region,
    query: locationQuery,
    items,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total: items.length < pageSize ? start + items.length : start + items.length + pageSize,
      totalPages: items.length < pageSize ? currentPage : currentPage + 1,
      hasMore: items.length >= pageSize,
    },
  };
};

const getDestinationDetails = async ({ destination, country, latitude, longitude, date, attractionStart = 0, restaurantStart = 0, hotelStart = 0 }) => {
  const locationText = [destination, country].filter(Boolean).join(', ');
  const locationFeature = latitude && longitude ? null : env.geoapifyApiKey ? await geocode(locationText) : null;
  const lon = Number(longitude || locationFeature?.properties?.lon);
  const lat = Number(latitude || locationFeature?.properties?.lat);
  const weatherLocation = Number.isFinite(lat) && Number.isFinite(lon)
    ? { latitude: lat, longitude: lon, locationLabel: locationText }
    : {};
  const [summary, weather, attractions, restaurants, hotels] = await Promise.all([
    fetchSummary(destination),
    weatherService.getWeatherByDestination(locationText || destination, date, weatherLocation),
    placesService.getAttractionsByDestination(locationText || destination),
    restaurantService.getRestaurantsByDestination({ destination, country, start: restaurantStart }),
    hotelsService.getHotelsByDestination({ destination, country, start: hotelStart }),
  ]);
  const allRecommendationItems = [
    ...(attractions.items || []).slice(0, 4),
    ...(restaurants.items || []).slice(0, 4),
    ...(hotels.items || []).slice(0, 4),
  ];
  const recommendations = await aiService.getAiRecommendations({
    view: 'attractions',
    destination: locationText || destination,
    date,
    weather,
    items: allRecommendationItems,
  });
  const gallery = [
    ...(attractions.items || []),
    ...(restaurants.items || []),
    ...(hotels.items || []),
  ]
    .flatMap((item) => item.imageUrls?.length ? item.imageUrls : item.imageUrl ? [item.imageUrl] : [])
    .filter(Boolean)
    .slice(0, 8);

  return {
    available: true,
    destination,
    country,
    coordinates: {
      latitude: Number.isFinite(lat) ? lat : undefined,
      longitude: Number.isFinite(lon) ? lon : undefined,
    },
    summary,
    weather,
    recommendations,
    heroImageUrl: summary.imageUrl || getFeatureImage(destination, country || 'travel'),
    gallery,
    attractions: {
      ...attractions,
      items: (attractions.items || []).slice(Number(attractionStart) || 0, (Number(attractionStart) || 0) + 8),
    },
    restaurants: {
      ...restaurants,
      items: restaurants.items || [],
    },
    hotels: {
      ...hotels,
      items: hotels.items || [],
    },
  };
};

module.exports = {
  getDestinationList,
  getDestinationDetails,
};
