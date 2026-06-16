// Import JWT for generating authentication tokens in tests
const jwt = require('jsonwebtoken');
// Import HTTP testing utilities
const request = require('supertest');

// Mock the user repository to control user authentication data during route tests
jest.mock('../src/modules/users/user.repository', () => ({
  findById: jest.fn(),
}));

// Mock the explore service to isolate controller tests from external API calls
jest.mock('../src/modules/explore/explore.service', () => ({
  getAiRecommendations: jest.fn(),
  getAttractionDetail: jest.fn(),
  getAttractionsByDestination: jest.fn(),
  getHotelDetail: jest.fn(),
  getHotelsByDestination: jest.fn(),
  getPlaceReviews: jest.fn(),
  getRestaurantDetail: jest.fn(),
  getRestaurantsByDestination: jest.fn(),
  getWeatherByDestination: jest.fn(),
}));

// Mock the map service to isolate controller tests from mapping API calls
jest.mock('../src/modules/map/map.service', () => ({
  getGeocodeLocation: jest.fn(),
  getMapPlaceDetails: jest.fn(),
  getMapPlaces: jest.fn(),
  getMapRoutes: jest.fn(),
  getMapWeather: jest.fn(),
  getReverseGeocodeLocation: jest.fn(),
}));

// Mock the currency service to isolate controller tests from exchange rate API calls
jest.mock('../src/modules/currency/currency.service', () => ({
  convertCurrency: jest.fn(),
  getSupportedCurrencies: jest.fn(),
}));

// Mock the language service to isolate controller tests from translation API calls
jest.mock('../src/modules/language/language.service', () => ({
  deleteHistory: jest.fn(),
  getHistory: jest.fn(),
  getSupportedLanguages: jest.fn(),
  translateText: jest.fn(),
}));

// Import dependencies after mocks are set up
const env = require('../src/config/env');
const AppError = require('../src/utils/AppError');
const userRepository = require('../src/modules/users/user.repository');
const exploreService = require('../src/modules/explore/explore.service');
const mapService = require('../src/modules/map/map.service');
const currencyService = require('../src/modules/currency/currency.service');
const languageService = require('../src/modules/language/language.service');
const app = require('../src/app');

// Define a valid user ID for authenticated test requests
const userId = '507f1f77bcf86cd799439011';
// Generate a valid JWT token for authenticated test requests
const createToken = () => jwt.sign({ userId }, env.jwtSecret);
// Helper function that adds authorization header to any request builder
const authorized = (requestBuilder) =>
  requestBuilder.set('Authorization', `Bearer ${createToken()}`);

// Test group covers API contract validation for third-party integrations including
// authentication requirements, input validation, error handling, and rate limit responses.
describe('Third-party API endpoint contracts', () => {
  // Reset all mock state and configure default authenticated user before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock user repository to return an active authenticated user by default
    userRepository.findById.mockResolvedValue({
      id: userId,
      email: 'traveller@example.com',
      role: 'user',
      status: 'active',
    });
  });

  // Verify that weather requests are rejected without authentication
  test('rejects weather requests without authentication', async () => {
    // Send GET request to weather endpoint without authentication header
    const response = await request(app)
      .get('/api/v1/explore/weather')
      .query({ destination: 'Tokyo' });

    // Verify unauthorized status code
    expect(response.statusCode).toBe(401);
    // Verify specific authentication error code
    expect(response.body.code).toBe('AUTHENTICATION_REQUIRED');
    // Verify service was not called (authentication rejected before service invocation)
    expect(exploreService.getWeatherByDestination).not.toHaveBeenCalled();
  });

  // Verify that unsupported currency conversion inputs are rejected before calling provider
  test('rejects unsupported currency conversion input before calling provider service', async () => {
    // Send GET request with unsupported cryptocurrency (BTC not in supported list)
    const response = await authorized(
      request(app)
        .get('/api/v1/currency/convert')
        .query({ from: 'BTC', to: 'MYR', amount: 100 })
    );

    // Verify bad request status code for validation failure
    expect(response.statusCode).toBe(400);
    // Verify validation error code
    expect(response.body.code).toBe('VALIDATION_ERROR');
    // Verify currency service was not called (validation prevented external API call)
    expect(currencyService.convertCurrency).not.toHaveBeenCalled();
  });

  // Verify that map routes with invalid coordinates are rejected before calling provider
  test('rejects map routes containing invalid coordinates', async () => {
    // Send POST request with latitude 95 (invalid - latitude must be between -90 and 90)
    const response = await authorized(
      request(app)
        .post('/api/v1/map/routes')
        .send({
          mode: 'car',
          points: [
            { lat: 95, lng: 101.6 },   // Invalid latitude (> 90)
            { lat: 3.1, lng: 101.7 },   // Valid coordinate
          ],
        })
    );

    // Verify bad request status code for validation failure
    expect(response.statusCode).toBe(400);
    // Verify specific field validation error is returned
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'points[0].lat',
          message: 'Route latitude must be a valid coordinate',
        }),
      ])
    );
    // Verify map service was not called (validation prevented external API call)
    expect(mapService.getMapRoutes).not.toHaveBeenCalled();
  });

  // Verify that country parameter is required before calling explore provider integrations
  test.each([
    ['/api/v1/explore/hotels', 'getHotelsByDestination'],
    ['/api/v1/explore/restaurants', 'getRestaurantsByDestination'],
  ])('requires a country before calling %s provider integration', async (path, serviceMethod) => {
    // Send GET request with destination but missing country parameter
    const response = await authorized(
      request(app).get(path).query({ destination: 'Central' })
    );

    // Verify bad request status code for missing required field
    expect(response.statusCode).toBe(400);
    // Verify validation error indicates country field is required
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'country',
          message: 'Select a country before searching.',
        }),
      ])
    );
    // Verify explore service was not called (validation prevented external API call)
    expect(exploreService[serviceMethod]).not.toHaveBeenCalled();
  });

  // Verify that provider rate limits are translated to standardized HTTP status codes
  test('returns standardized HTTP status and code for provider rate limits', async () => {
    // Mock currency service to reject with rate limit error
    currencyService.convertCurrency.mockRejectedValue(
      new AppError(
        'Currency conversion is busy. Please try again later.',
        429,                        // Too Many Requests status code
        'RATE_LIMIT_EXCEEDED'       // Specific error code for rate limiting
      )
    );

    // Send valid currency conversion request
    const response = await authorized(
      request(app)
        .get('/api/v1/currency/convert')
        .query({ from: 'USD', to: 'MYR', amount: 100 })
    );

    // Verify rate limit status code
    expect(response.statusCode).toBe(429);
    // Verify response contains standardized error format
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        code: 'RATE_LIMIT_EXCEEDED',
        requestId: expect.any(String),  // Request ID for tracking
      })
    );
  });

  // Verify that translation timeout errors return friendly response without exposing provider details
  test('returns a friendly translation timeout fallback without exposing provider errors', async () => {
    // Mock language service to return timeout error without throwing
    languageService.translateText.mockResolvedValue({
      available: false,
      translatedText: '',
      message: 'Translation service request timed out.',
      cached: false,
      errorCode: 'REQUEST_TIMEOUT',    // Friendly error code
    });

    // Send valid translation request
    const response = await authorized(
      request(app)
        .post('/api/v1/language/translate')
        .send({
          text: 'Where is the station?',
          sourceLanguage: 'en',
          targetLanguage: 'ja',
        })
    );

    // Verify successful response (200 even though translation failed)
    expect(response.statusCode).toBe(200);
    // Verify response contains timeout error information
    expect(response.body.data.translation).toEqual(
      expect.objectContaining({
        available: false,
        translatedText: '',
        errorCode: 'REQUEST_TIMEOUT',
      })
    );
    // Verify that technical/internal error details are not exposed to client
    expect(JSON.stringify(response.body)).not.toContain('ECONNABORTED');
    // Verify that stack traces are not exposed to client
    expect(JSON.stringify(response.body)).not.toContain('stack');
  });
});