/**
 * Travel Guide module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Import HTTP testing utilities and the application instance
const request = require('supertest');
const app = require('../src/app');

// Test group covers authentication requirements for travel guide endpoints including
// destination lists, country lists, and destination details.
describe('Travel guide routes', () => {
  // Scenario verifies that unauthenticated requests to destination list endpoint are rejected.
  test('requires authentication for destination lists', async () => {
    // Send GET request to destinations endpoint without authentication header
    const response = await request(app)
      .get('/api/v1/travel-guide/destinations')
      .query({ country: 'Malaysia', mode: 'domestic' });  // Query parameters for filtering

    // Verify unauthorized status code is returned
    expect(response.statusCode).toBe(401);
    // Verify response status indicates operation failure
    expect(response.body.status).toBe('fail');
  });

  // Scenario verifies that unauthenticated requests to country list endpoint are rejected.
  test('requires authentication for country lists', async () => {
    // Send GET request to countries endpoint without authentication header
    const response = await request(app)
      .get('/api/v1/travel-guide/countries')
      .query({ currentCountry: 'Malaysia', region: 'Asia' });  // Query parameters for filtering

    // Verify unauthorized status code is returned
    expect(response.statusCode).toBe(401);
    // Verify response status indicates operation failure
    expect(response.body.status).toBe('fail');
  });

  // Scenario verifies that unauthenticated requests to destination details endpoint are rejected.
  test('requires authentication for destination details', async () => {
    // Send GET request to single destination endpoint without authentication header
    const response = await request(app)
      .get('/api/v1/travel-guide/destination')
      .query({ destination: 'Singapore', country: 'Singapore' });  // Parameters to identify specific destination

    // Verify unauthorized status code is returned
    expect(response.statusCode).toBe(401);
    // Verify response status indicates operation failure
    expect(response.body.status).toBe('fail');
  });
});