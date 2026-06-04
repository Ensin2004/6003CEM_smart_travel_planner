/**
 * Foursquare Places API adapter for map search and place details.
 */
const axios = require('axios');
const env = require('../../config/env');
const apiLogService = require('../apiLogs/apiLog.service');

const foursquareClient = axios.create({
  baseURL: 'https://places-api.foursquare.com/places',
  timeout: 8000,
});

const SEARCH_FIELDS = [
  'fsq_place_id',
  'name',
  'latitude',
  'longitude',
  'location',
  'categories',
  'distance',
  'link',
].join(',');

const DETAIL_FIELDS = [
  SEARCH_FIELDS,
  'description',
  'hours',
  'photos',
  'price',
  'rating',
  'stats',
  'tel',
  'website',
].join(',');

const getHeaders = () => ({
  Accept: 'application/json',
  Authorization: `Bearer ${env.foursquareApiKey}`,
  'X-places-api-version': '2025-02-05',
});

const getFoursquareFailureMessage = (error) => {
  const statusCode = error.response?.status || 503;

  if (statusCode === 401 || statusCode === 403) {
    return { message: 'Foursquare API credentials are invalid or unauthorized.', statusCode };
  }
  if (statusCode === 429) {
    return { message: 'Foursquare API rate limit reached. Please try again later.', statusCode };
  }

  return {
    message: error.response?.data?.message || error.message || 'Foursquare places are temporarily unavailable.',
    statusCode,
  };
};

const recordFoursquareFailure = (endpoint, message, statusCode, metadata) =>
  env.nodeEnv === 'test'
    ? Promise.resolve()
    : apiLogService
        .recordEvent({
          service: 'foursquare',
          category: 'api',
          severity: statusCode === 429 ? 'warning' : 'error',
          endpoint,
          status: 'fail',
          statusCode,
          message,
          metadata,
        })
        .catch(() => {});

const searchFoursquarePlaces = async ({ query, latitude, longitude, limit = 30 }) => {
  const response = await foursquareClient.get('/search', {
    headers: getHeaders(),
    params: {
      query,
      ll: `${latitude},${longitude}`,
      limit: Math.min(Math.max(Number(limit) || 30, 1), 50),
      fields: SEARCH_FIELDS,
    },
  });

  return Array.isArray(response.data?.results) ? response.data.results : [];
};

const getFoursquarePlace = async (placeId) => {
  const response = await foursquareClient.get(`/${encodeURIComponent(placeId)}`, {
    headers: getHeaders(),
    params: { fields: DETAIL_FIELDS },
  });

  return response.data || null;
};

module.exports = {
  getFoursquareFailureMessage,
  getFoursquarePlace,
  recordFoursquareFailure,
  searchFoursquarePlaces,
};
