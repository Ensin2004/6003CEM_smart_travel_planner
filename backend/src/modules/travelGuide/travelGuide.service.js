/**
 * Travel guide aggregation service using Geoapify, REST Countries, Wikivoyage,
 * weather, Explore listings, and AI recommendations.
 */
const axios = require('axios');
const { Country } = require('country-state-city');
const env = require('../../config/env');
const weatherService = require('../explore/weather.service');
const placesService = require('../explore/places.service');
const restaurantService = require('../explore/restaurant.service');
const hotelsService = require('../explore/hotels.service');
const aiService = require('../explore/exploreAi.service');
const travelGuideRepository = require('./travelGuide.repository');
const { classifyExternalApiError } = require('../../utils/externalApiError');

// Create Geoapify HTTP client
const geoapifyClient = axios.create({
  baseURL: 'https://api.geoapify.com',
  timeout: 10000,
});

// Create REST Countries HTTP client
const restCountriesClient = axios.create({
  baseURL: 'https://api.restcountries.com',
  timeout: 10000,
});

// In-memory cache storage
const cache = new Map();

// Cache time-to-live in milliseconds
const CACHE_TTL_MS = 15 * 60 * 1000;

// Generate cache key from parameters
const getCacheKey = (key, params) => `${key}:${JSON.stringify(params)}`.toLowerCase();

// Wrapper for caching with fallback to database
const withCache = async (key, params, fetcher) => {
  const cacheKey = getCacheKey(key, params);
  const cached = cache.get(cacheKey);

  // Return from memory cache if valid
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.value;
  }
  
  // Check database cache in non-test environment
  if (env.nodeEnv !== 'test') {
    const storedCache = await travelGuideRepository.findValidCache(cacheKey).catch(() => null);

    if (storedCache) {
      cache.set(cacheKey, { createdAt: Date.now(), value: storedCache.payload });
      return storedCache.payload;
    }
  }

  // Fetch fresh data
  const value = await fetcher();
  cache.set(cacheKey, { createdAt: Date.now(), value });
  
  // Store in database cache in non-test environment
  if (env.nodeEnv !== 'test') {
    travelGuideRepository
      .upsertCache(cacheKey, key, value, new Date(Date.now() + CACHE_TTL_MS))
      .catch(() => {});
  }

  return value;
};

// Generate unavailable response
const unavailable = (message = 'Geoapify API key is not configured') => ({
  available: false,
  errorCode: 'INVALID_API_KEY',
  message,
});

// Validate Geoapify API key
const requireGeoapifyKey = () => {
  if (!env.geoapifyApiKey || env.nodeEnv === 'test') {
    return unavailable();
  }

  return null;
};

// Make request to Geoapify API
const requestGeoapify = async (path, params) => {
  const response = await geoapifyClient.get(path, {
    params: {
      ...params,
      apiKey: env.geoapifyApiKey,
    },
  });

  return response.data;
};

// Extract feature name from properties
const getFeatureName = (properties = {}) =>
  properties.name ||
  properties.address_line1 ||
  properties.city ||
  properties.state ||
  properties.country ||
  properties.formatted ||
  'Unnamed place';

// Fallback travel images for destinations
const fallbackTravelImages = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=900&q=80',
];

// Get deterministic image based on name
const getFeatureImage = (name = '', type = '') => {
  const imageIndex = [...`${name}${type}`].reduce((total, character) => total + character.charCodeAt(0), 0)
    % fallbackTravelImages.length;

  return fallbackTravelImages[imageIndex];
};

// Normalize Feature prepares incoming data for consistent storage.
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

// Generate bounding box filter string
const getBoundingBox = (properties = {}) => {
  const bbox = properties.bbox;

  // Use rectangle if bbox available
  if (bbox?.lon1 && bbox?.lat1 && bbox?.lon2 && bbox?.lat2) {
    return `rect:${bbox.lon1},${bbox.lat1},${bbox.lon2},${bbox.lat2}`;
  }

  // Use circle if coordinates available
  if (properties.lon && properties.lat) {
    return `circle:${properties.lon},${properties.lat},35000`;
  }

  return '';
};

// Geocode location text
const geocode = async (text) =>
  withCache('geocode', { text }, async () => {
    const data = await requestGeoapify('/v1/geocode/search', {
      text,
      limit: 1,
      format: 'geojson',
    });

    return data.features?.[0] || null;
  });

// Get places from Geoapify
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

// Fetch summary from Wikivoyage
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

// Normalize Guide Item prepares incoming data for consistent storage.
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

// Get country code filter string
const getCountryCodeFilter = (countryCode) => (countryCode ? `countrycode:${countryCode.toLowerCase()}` : '');

// Set of valid region names
const regionFilters = new Set(['Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Africa', 'Antarctica', 'Other']);

// Normalize country from REST Countries v5 API
const normalizeV5Country = (country = {}) => {
  const name = country.names?.common || '';
  const countryCode = country.codes?.alpha_2 || '';
  const region = country.continents?.find((continent) => regionFilters.has(continent)) || 'Other';
  const flagUrl = country.flag?.url_png || country.flag?.url_svg || '';

  return {
    id: countryCode,
    name,
    type: 'Country',
    region: [region, country.subregion].filter(Boolean).join(' - '),
    continent: region,
    country: name,
    countryCode,
    imageUrl: flagUrl,
    flagUrl,
    currency: (country.currencies || []).map((currency) => currency.code).filter(Boolean).join(', '),
    coordinates: {
      latitude: Number(country.coordinates?.lat),
      longitude: Number(country.coordinates?.lng),
    },
  };
};

// Determine region from country timezone data
const getLocalCountryRegion = (country = {}) => {
  const zones = country.timezones || [];
  const zoneNames = zones.map((timezone) => timezone.zoneName || '');
  const timezoneNames = zones.map((timezone) => timezone.tzName || '');
  const latitude = Number(country.latitude);

  // Determine region based on timezone patterns
  if (zoneNames.some((zoneName) => zoneName.startsWith('Antarctica/')) || country.isoCode === 'AQ') return 'Antarctica';
  if (zoneNames.some((zoneName) => zoneName.startsWith('Europe/'))) return 'Europe';
  if (zoneNames.some((zoneName) => zoneName.startsWith('Africa/'))) return 'Africa';
  if (zoneNames.some((zoneName) => zoneName.startsWith('Asia/'))) return 'Asia';
  if (zoneNames.some((zoneName) => zoneName.startsWith('America/'))) {
    return timezoneNames.some((timezoneName) => timezoneName.includes('North America')) || latitude >= 12
      ? 'North America'
      : 'South America';
  }
  if (zoneNames.some((zoneName) => zoneName.startsWith('Australia/') || zoneName.startsWith('Pacific/'))) return 'Oceania';

  return 'Other';
};

// Normalize country from local country-state-city library
const normalizeLocalCountry = (country = {}) => {
  const region = getLocalCountryRegion(country);
  const flagUrl = country.isoCode ? `https://flagcdn.com/w320/${country.isoCode.toLowerCase()}.png` : '';

  return {
    id: country.isoCode,
    name: country.name,
    type: 'Country',
    region,
    continent: region,
    country: country.name,
    countryCode: country.isoCode,
    imageUrl: flagUrl,
    flagUrl,
    currency: country.currency || '',
    coordinates: {
      latitude: Number(country.latitude),
      longitude: Number(country.longitude),
    },
  };
};

// Get country list from local library
const getLocalCountryList = () => Country.getAllCountries().map(normalizeLocalCountry);

// Fetch countries from REST Countries API with pagination
const fetchRestCountries = async () => {
  // Validate API key
  if (!env.restCountriesApiKey) {
    throw Object.assign(new Error('REST Countries API key is not configured'), { isMissingKey: true });
  }

  const countries = [];
  let offset = 0;
  let hasMore = true;

  // Paginate through all countries
  while (hasMore) {
    const response = await restCountriesClient.get('/countries/v5', {
      headers: {
        Authorization: `Bearer ${env.restCountriesApiKey}`,
      },
      params: {
        limit: 100,
        offset,
      },
    });
    const objects = response.data?.data?.objects;
    const metadata = response.data?.data?.meta;

    // Validate response
    if (!Array.isArray(objects) || response.data?.data?._demo) {
      throw new Error('REST Countries returned an incomplete country catalogue');
    }

    countries.push(...objects);
    hasMore = Boolean(metadata?.more);
    offset += objects.length;
    if (!objects.length) hasMore = false;
  }

  return countries;
};

/**
 * Returns a filtered and paginated country catalogue from REST Countries.
 * @param {object} input Region, search, current-country, and pagination options.
 * @returns {Promise<object>} Normalized countries and pagination metadata.
 */
const getCountryList = async ({ region = '', search = '', currentCountry = '', currentCountryCode = '', limit = 24, page = 1 }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Number(limit) || 24, 48);
  const normalizedRegion = region === 'All' ? '' : region;
  const normalizedSearch = search.trim().toLowerCase();
  const excludedCountry = currentCountry.trim().toLowerCase();
  const excludedCountryCode = currentCountryCode.trim().toUpperCase();
  let countries;
  let source = 'REST Countries';
  
  // Try REST Countries API first
  try {
    countries = await withCache('countries', { source: 'restcountries-v5' }, fetchRestCountries);
    countries = countries
      .map(normalizeV5Country)
      .filter((country) => country.countryCode && country.name);
  } catch {
    // Fallback to local library
    countries = getLocalCountryList();
    source = 'Local country catalogue';
  }

  try {
    // Apply filters and pagination
    const filteredCountries = countries
      .filter((country) => country.countryCode !== excludedCountryCode && country.name.toLowerCase() !== excludedCountry)
      .filter((country) => !normalizedRegion || country.continent === normalizedRegion)
      .filter((country) => !normalizedSearch || country.name.toLowerCase().includes(normalizedSearch))
      .sort((first, second) => first.name.localeCompare(second.name));
    const start = (currentPage - 1) * pageSize;
    const items = filteredCountries.slice(start, start + pageSize);

    return {
      available: true,
      source,
      items,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: filteredCountries.length,
        totalPages: Math.max(Math.ceil(filteredCountries.length / pageSize), 1),
        hasMore: start + pageSize < filteredCountries.length,
      },
    };
  } catch (error) {
    // Classify and return error
    const failure = classifyExternalApiError(error, {
      networkMessage: 'Country directory could not be reached.',
      rateLimitMessage: 'Country directory rate limit exceeded.',
      timeoutMessage: 'Country directory request timed out.',
      unavailableMessage: 'Country directory temporarily unavailable.',
    });
    return {
      available: false,
      errorCode: failure.errorCode,
      message: failure.message,
      items: [],
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: 0,
        totalPages: 1,
        hasMore: false,
      },
    };
  }
};

/**
 * Finds domestic or international destinations through Geoapify.
 * @param {object} input Country context, travel mode, region, search, and pagination.
 * @returns {Promise<object>} Normalized destination cards and pagination metadata.
 */
const getDestinationList = async ({ country, countryCode, mode = 'domestic', region = '', limit = 24, page = 1, search = '' }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Number(limit) || 24, 48);
  const start = (currentPage - 1) * pageSize;
  
  // Try SERP API if available
  if (env.serpApiKey && env.nodeEnv !== 'test') {
    const attractions = await placesService.getAttractionsByDestination({
      destination: `popular tourist destinations in ${country}`,
      start,
    });
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

  // Validate Geoapify key
  const keyError = requireGeoapifyKey();
  if (keyError) return { ...keyError, items: [] };

  // Geocode location
  const locationQuery = mode === 'domestic' ? country : region || country || 'world';
  const locationFeature = await geocode(locationQuery);
  const fallbackFilter = countryCode ? getCountryCodeFilter(countryCode) : '';
  const filter = getBoundingBox(locationFeature?.properties) || fallbackFilter;
  
  // Validate filter
  if (!filter) {
    return { available: false, message: 'Unable to find this guide location.', items: [] };
  }

  // Determine categories based on mode
  const categories =
    mode === 'domestic'
      ? 'tourism.sights,tourism.attraction,entertainment.museum,natural'
      : 'tourism.sights,tourism.attraction,entertainment.museum';
  
  // Fetch places from Geoapify
  const features = await getPlaces({
    filter,
    categories,
    limit: pageSize,
    offset: start,
  });

  // Normalize results
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

/**
 * Aggregates a destination summary, weather, listings, gallery, and recommendations.
 * @param {object} input Destination identity, date, coordinates, and listing offsets.
 * @returns {Promise<object>} Complete travel-guide detail payload.
 */
const getDestinationDetails = async ({ destination, country, latitude, longitude, date, attractionStart = 0, restaurantStart = 0, hotelStart = 0 }) => {
  const locationText = [destination, country].filter(Boolean).join(', ');
  const locationFeature = latitude && longitude ? null : env.geoapifyApiKey ? await geocode(locationText) : null;
  const lon = Number(longitude || locationFeature?.properties?.lon);
  const lat = Number(latitude || locationFeature?.properties?.lat);
  
  // Prepare weather location
  const weatherLocation = Number.isFinite(lat) && Number.isFinite(lon)
    ? { latitude: lat, longitude: lon, locationLabel: locationText }
    : {};
  
  // Fetch all data in parallel
  const [summary, weather, attractions, restaurants, hotels] = await Promise.all([
    fetchSummary(destination),
    weatherService.getWeatherByDestination(locationText || destination, date, weatherLocation),
    placesService.getAttractionsByDestination(locationText || destination),
    restaurantService.getRestaurantsByDestination({ destination, country, start: restaurantStart }),
    hotelsService.getHotelsByDestination({ destination, country, start: hotelStart }),
  ]);
  
  // Combine items for AI recommendations
  const allRecommendationItems = [
    ...(attractions.items || []).slice(0, 4),
    ...(restaurants.items || []).slice(0, 4),
    ...(hotels.items || []).slice(0, 4),
  ];
  
  // Get AI recommendations
  const recommendations = await aiService.getAiRecommendations({
    view: 'attractions',
    destination: locationText || destination,
    date,
    weather,
    items: allRecommendationItems,
  });
  
  // Build gallery from all sources
  const gallery = [
    ...(attractions.items || []),
    ...(restaurants.items || []),
    ...(hotels.items || []),
  ]
    .flatMap((item) => item.imageUrls?.length ? item.imageUrls : item.imageUrl ? [item.imageUrl] : [])
    .filter(Boolean)
    .slice(0, 8);

  // Return complete destination details
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

// Export service functions
module.exports = {
  getCountryList,
  getDestinationList,
  getDestinationDetails,
};