// Import utility functions for API result handling and error classification
const ensureApiResult = require('../src/utils/ensureApiResult');
const {
  classifyExternalApiError,
} = require('../src/utils/externalApiError');

// Test group covers error classification for external API failures and result validation
describe('External API error contract', () => {
  // Test various provider error scenarios to ensure consistent error code mapping
  test.each([
    // Authentication failure (invalid API key)
    [{ response: { status: 401 } }, 'INVALID_API_KEY', 502],
    // Rate limit exceeded (too many requests)
    [{ response: { status: 429 } }, 'RATE_LIMIT_EXCEEDED', 429],
    // Request timeout (aborted connection)
    [{ code: 'ECONNABORTED' }, 'REQUEST_TIMEOUT', 503],
    // Network unreachable (DNS or connection failure)
    [{ code: 'ENETUNREACH' }, 'NETWORK_FAILURE', 503],
  ])('classifies provider failures', (error, errorCode, statusCode) => {
    // Verify that provider errors are correctly classified with appropriate codes and statuses
    expect(classifyExternalApiError(error)).toEqual(
      expect.objectContaining({ errorCode, statusCode })
    );
  });

  // Verify that empty search results are transformed into NO_RESULTS_FOUND error
  test('turns an empty search result into NO_RESULTS_FOUND', () => {
    // Attempt to validate an API result with success flag but empty items array
    expect(() => ensureApiResult({ available: true, items: [] })).toThrow(
      expect.objectContaining({
        code: 'NO_RESULTS_FOUND',
        statusCode: 404,  // Not Found - appropriate for empty result sets
      })
    );
  });

  // Verify that error codes returned by graceful services are preserved
  test('preserves a provider error code returned by a graceful service', () => {
    // Validate that a service's explicit error code is passed through unchanged
    expect(() =>
      ensureApiResult({
        available: false,
        errorCode: 'REQUEST_TIMEOUT',  // Provider-specific error code
        message: 'Provider timed out',
        items: [],
      })
    ).toThrow(
      expect.objectContaining({
        code: 'REQUEST_TIMEOUT',  // Preserved exactly as provided
        statusCode: 503,          // Service Unavailable - appropriate for timeout
      })
    );
  });
});