/**
 * Validation module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */

// Import HTTP testing utilities and the application instance
const request = require('supertest');
const express = require('express');
const app = require('../src/app');
// Import validation middleware
const validate = require('../src/middleware/validate.middleware');
// Import validation rules for explore endpoints
const {
  attractionRules,
  hotelRules,
  restaurantRules,
} = require('../src/modules/explore/explore.validation');

// Test group covers basic API functionality including health checks,
// route handling, error responses, and request ID management.
describe('API basics', () => {
  // Scenario verifies that health check endpoint returns success status.
  test('returns health check response', async () => {
    // Send GET request to health endpoint
    const response = await request(app).get('/health');

    // Verify successful response
    expect(response.statusCode).toBe(200);
    // Verify health status is success
    expect(response.body.status).toBe('success');
  });

  // Scenario verifies that API v1 index endpoint returns correct message.
  test('returns API v1 index response', async () => {
    // Send GET request to API root endpoint
    const response = await request(app).get('/api/v1');

    // Verify successful response
    expect(response.statusCode).toBe(200);
    // Verify API version message
    expect(response.body.message).toBe('Smart Travel Planner API v1');
  });

  // Verify that missing routes return consistent error format with correlation ID
  test('returns a stable error code and correlation ID for missing routes', async () => {
    // Send GET request to non-existent route with custom request ID header
    const response = await request(app)
      .get('/api/v1/missing-route')
      .set('X-Request-ID', 'test-request-123');

    // Verify not found status code
    expect(response.statusCode).toBe(404);
    // Verify error response structure
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        code: 'NOT_FOUND',
        requestId: 'test-request-123',  // Correlation ID returned unchanged
      })
    );
    // Verify request ID header is echoed back to client
    expect(response.headers['x-request-id']).toBe('test-request-123');
  });

  // Verify that unsafe client-provided correlation IDs are sanitized
  test('replaces unsafe client correlation IDs', async () => {
    // Send request with potentially unsafe request ID containing spaces and special characters
    const response = await request(app)
      .get('/api/v1/missing-route')
      .set('X-Request-ID', '<unsafe request id>');

    // Verify not found status code
    expect(response.statusCode).toBe(404);
    // Verify unsafe ID is replaced with safe UUID format
    expect(response.body.requestId).toMatch(/^[a-f0-9-]{36}$/);
    // Verify header contains the same sanitized ID
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
  });

  // Verify that invalid user input returns structured validation errors
  test('returns structured invalid user input errors', async () => {
    // Send POST request with invalid email and empty password
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'invalid', password: '' });

    // Verify bad request status code
    expect(response.statusCode).toBe(400);
    // Verify structured error response format
    expect(response.body).toEqual(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        requestId: expect.any(String),  // Request ID for tracking
        errors: expect.any(Array),       // Array of field-specific errors
      })
    );
  });
});

// Test group covers validation rules for explore search endpoints
describe('Explore search validation', () => {
  // Helper function that creates an Express app with specific validation rules
  const createValidationApp = (rules) => {
    const validationApp = express();
    // Set up route with validation middleware that returns 204 on success
    validationApp.get('/search', rules, validate, (req, res) => res.status(204).end());
    return validationApp;
  };

  // Verify that destination-only searches are accepted (country is optional)
  test.each([
    ['attractions', attractionRules],
    ['hotels', hotelRules],
    ['restaurants', restaurantRules],
  ])('accepts a destination-only %s search', async (_, rules) => {
    // Send request with destination but no country parameter
    const response = await request(createValidationApp(rules))
      .get('/search')
      .query({ destination: 'Central' });

    // Verify successful response (validation passed)
    expect(response.statusCode).toBe(204);
  });

  // Verify that country-only searches are accepted (destination optional)
  test.each([
    ['attractions', attractionRules],
    ['hotels', hotelRules],
    ['restaurants', restaurantRules],
  ])('accepts a country-only %s search', async (_, rules) => {
    // Send request with only country parameter (no destination)
    const response = await request(createValidationApp(rules))
      .get('/search')
      .query({ country: 'Malaysia' });

    // Verify successful response (validation passed)
    expect(response.statusCode).toBe(204);
  });
});
