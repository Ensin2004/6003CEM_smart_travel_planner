/**
 * Foursquare Places API adapter for map search and place details.
 */
const axios = require('axios');
const env = require('../../config/env');
const apiLogService = require('../apiLogs/apiLog.service');
const { classifyExternalApiError } = require('../../utils/externalApiError');

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
  return classifyExternalApiError(error, {
    invalidApiKeyMessage: 'Foursquare API key is invalid or unauthorized.',
    networkMessage: 'Foursquare could not be reached.',
    rateLimitMessage: 'Foursquare API rate limit reached. Please try again later.',
    timeoutMessage: 'Foursquare request timed out.',
    unavailableMessage: 'Foursquare places are temporarily unavailable.',
  });
};

const recordFoursquareFailure = (endpoint, message, statusCode, metadata, errorCode) =>
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
          errorCode,
          message,
          metadata,
        })
        .catch(() => {});

/**
 * Searches Foursquare places near a coordinate.
 * @param {object} input Search text, coordinates, and result limit.
 * @returns {Promise<Array<object>>} Raw provider place rows for map normalization.
 */
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

/**
 * Retrieves expanded Foursquare details for one place.
 * @param {string} placeId Foursquare place identifier.
 * @returns {Promise<object|null>} Provider detail record when found.
 */
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
