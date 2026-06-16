/**
 * Standard error codes shared by external API integrations.
 */
const externalApiErrorCodes = {
  INVALID_API_KEY: 'INVALID_API_KEY',
  NETWORK_FAILURE: 'NETWORK_FAILURE',
  NO_RESULTS_FOUND: 'NO_RESULTS_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
};

/**
 * Checks if an error is related to a timeout during request execution
 * @param {Error} error - The error object to check
 * @returns {boolean} - True if the error indicates a timeout
 */
const isTimeoutError = (error) =>
  ['ECONNABORTED', 'ETIMEDOUT', 'ESOCKETTIMEDOUT'].includes(error?.code);

// Classifies external API errors into standardized error codes and messages.
const classifyExternalApiError = (
  error,
  {
    invalidApiKeyMessage = 'External service credentials are invalid.',
    networkMessage = 'External service could not be reached.',
    rateLimitMessage = 'External service rate limit exceeded.',
    timeoutMessage = 'External service request timed out.',
    unavailableMessage = 'External service is temporarily unavailable.',
  } = {}
) => {
  // Check for daily quota limit or HTTP 429 (Too Many Requests)
  if (error?.isDailyLimit || error?.response?.status === 429) {
    return {
      errorCode: externalApiErrorCodes.RATE_LIMIT_EXCEEDED,
      message: rateLimitMessage,
      statusCode: 429,
    };
  }

  // Check for missing API key, 401 (Unauthorized), or 403 (Forbidden)
  if (error?.isMissingKey || [401, 403].includes(error?.response?.status)) {
    return {
      errorCode: externalApiErrorCodes.INVALID_API_KEY,
      message: invalidApiKeyMessage,
      statusCode: 502,
    };
  }

  // Check for request timeout conditions
  if (isTimeoutError(error)) {
    return {
      errorCode: externalApiErrorCodes.REQUEST_TIMEOUT,
      message: timeoutMessage,
      statusCode: 503, // Service Unavailable - timeout implies service issue
    };
  }

  // No response object indicates a network-level failure (DNS, connection refused, etc.)
  if (!error?.response) {
    return {
      errorCode: externalApiErrorCodes.NETWORK_FAILURE,
      message: networkMessage,
      statusCode: 503, // Service Unavailable - network layer failure
    };
  }

  return {
    errorCode: 'EXTERNAL_SERVICE_ERROR',
    message: unavailableMessage,
    // Map 5xx (server errors) to 503, other status codes (4xx) to 502
    statusCode: error.response.status >= 500 ? 503 : 502,
  };
};

// Export utilities for use across the application
module.exports = {
  classifyExternalApiError,
  externalApiErrorCodes,
  isTimeoutError,
};