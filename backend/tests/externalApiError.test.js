const ensureApiResult = require('../src/utils/ensureApiResult');
const {
  classifyExternalApiError,
} = require('../src/utils/externalApiError');

describe('External API error contract', () => {
  test.each([
    [{ response: { status: 401 } }, 'INVALID_API_KEY', 502],
    [{ response: { status: 429 } }, 'RATE_LIMIT_EXCEEDED', 429],
    [{ code: 'ECONNABORTED' }, 'REQUEST_TIMEOUT', 503],
    [{ code: 'ENETUNREACH' }, 'NETWORK_FAILURE', 503],
  ])('classifies provider failures', (error, errorCode, statusCode) => {
    expect(classifyExternalApiError(error)).toEqual(
      expect.objectContaining({ errorCode, statusCode })
    );
  });

  test('turns an empty search result into NO_RESULTS_FOUND', () => {
    expect(() => ensureApiResult({ available: true, items: [] })).toThrow(
      expect.objectContaining({
        code: 'NO_RESULTS_FOUND',
        statusCode: 404,
      })
    );
  });

  test('preserves a provider error code returned by a graceful service', () => {
    expect(() =>
      ensureApiResult({
        available: false,
        errorCode: 'REQUEST_TIMEOUT',
        message: 'Provider timed out',
        items: [],
      })
    ).toThrow(
      expect.objectContaining({
        code: 'REQUEST_TIMEOUT',
        statusCode: 503,
      })
    );
  });
});
