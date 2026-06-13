/**
 * Validation module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const request = require('supertest');
const express = require('express');
const app = require('../src/app');
const validate = require('../src/middleware/validate.middleware');
const {
  attractionRules,
  hotelRules,
  restaurantRules,
} = require('../src/modules/explore/explore.validation');
// Test group covers  behavior.
describe('API basics', () => {
  // Scenario verifies one expected outcome or error path.
  test('returns health check response', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('success');
  });
  // Scenario verifies one expected outcome or error path.
  test('returns API v1 index response', async () => {
    const response = await request(app).get('/api/v1');

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Smart Travel Planner API v1');
  });

  test('returns a stable error code and correlation ID for missing routes', async () => {
    const response = await request(app)
      .get('/api/v1/missing-route')
      .set('X-Request-ID', 'test-request-123');

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'fail',
        code: 'NOT_FOUND',
        requestId: 'test-request-123',
      })
    );
    expect(response.headers['x-request-id']).toBe('test-request-123');
  });

  test('replaces unsafe client correlation IDs', async () => {
    const response = await request(app)
      .get('/api/v1/missing-route')
      .set('X-Request-ID', '<unsafe request id>');

    expect(response.statusCode).toBe(404);
    expect(response.body.requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
  });

  test('returns structured invalid user input errors', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'invalid', password: '' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        requestId: expect.any(String),
        errors: expect.any(Array),
      })
    );
  });
});

describe('Explore search validation', () => {
  const createValidationApp = (rules) => {
    const validationApp = express();
    validationApp.get('/search', rules, validate, (req, res) => res.status(204).end());
    return validationApp;
  };

  test.each([
    ['attractions', attractionRules],
    ['hotels', hotelRules],
    ['restaurants', restaurantRules],
  ])('requires a country before searching for %s', async (_, rules) => {
    const response = await request(createValidationApp(rules))
      .get('/search')
      .query({ destination: 'Central' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'country',
            message: 'Select a country before searching.',
          }),
        ]),
      })
    );
  });

  test.each([
    ['attractions', attractionRules],
    ['hotels', hotelRules],
    ['restaurants', restaurantRules],
  ])('accepts a country-only %s search', async (_, rules) => {
    const response = await request(createValidationApp(rules))
      .get('/search')
      .query({ country: 'Malaysia' });

    expect(response.statusCode).toBe(204);
  });
});
