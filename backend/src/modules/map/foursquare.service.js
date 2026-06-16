/**
 * Foursquare Places API adapter for map search and place details.
 */
const axios = require('axios');
const env = require('../../config/env');
const apiLogService = require('../apiLogs/apiLog.service');
const { classifyExternalApiError } = require('../../utils/externalApiError');

// Creates an axios client configured with Foursquare Places API base URL and timeout
const foursquareClient = axios.create({
  baseURL: 'https://places-api.foursquare.com/places',
  timeout: 8000, // 8-second timeout for API calls
});

// Defines the search field set required for basic place listing
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

// Extends search fields with additional detail fields for full place information
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

/**
 * Constructs the required HTTP headers for Foursquare API authentication and versioning.
 * @returns {Object} Headers object with Authorization and API version
 */
const getHeaders = () => ({
  Accept: 'application/json',
  Authorization: `Bearer ${env.foursquareApiKey}`,
  'X-places-api-version': '2025-02-05', // Foursquare API version specification
});

/**
 * Transforms API errors into user-friendly failure messages based on error classification.
 * @param {Error} error - Error from axios or application
 * @returns {Object} Classified error with errorCode, message, and statusCode
 */
const getFoursquareFailureMessage = (error) => {
  return classifyExternalApiError(error, {
    invalidApiKeyMessage: 'Foursquare API key is invalid or unauthorized.',
    networkMessage: 'Foursquare could not be reached.',
    rateLimitMessage: 'Foursquare API rate limit reached. Please try again later.',
    timeoutMessage: 'Foursquare request timed out.',
    unavailableMessage: 'Foursquare places are temporarily unavailable.',
  });
};

/**
 * Records failed Foursquare API calls to the logging service, skipping during test environment.
 * @param {string} endpoint - API endpoint that failed
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} metadata - Additional context
 * @param {string} errorCode - Standardized error code
 * @returns {Promise<void>}
 */
const recordFoursquareFailure = (endpoint, message, statusCode, metadata, errorCode) =>
  env.nodeEnv === 'test'
    ? Promise.resolve() // Skip logging in test environment
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
        .catch(() => {}); // Silently fail on logging errors

/**
 * Searches Foursquare places near a coordinate.
 * @param {object} input Search text, coordinates, and result limit.
 * @returns {Promise<Array<object>>} Raw provider place rows for map normalization.
 */
const searchFoursquarePlaces = async ({ query, latitude, longitude, limit = 30 }) => {
  const response = await foursquareClient.get('/search', {
    headers: getHeaders(),
    params: {
      query, // Search query string
      ll: `${latitude},${longitude}`, // Latitude and longitude as comma-separated string
      limit: Math.min(Math.max(Number(limit) || 30, 1), 50), // Limit between 1 and 50
      fields: SEARCH_FIELDS, // Request only needed fields for performance
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
    params: { fields: DETAIL_FIELDS }, // Request all detail fields
  });

  return response.data || null;
};

module.exports = {
  getFoursquareFailureMessage,
  getFoursquarePlace,
  recordFoursquareFailure,
  searchFoursquarePlaces,
};