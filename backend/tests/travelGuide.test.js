/**
 * Travel Guide module.
 * Assertions cover expected behavior, error handling, and response shape.
 */
const request = require('supertest');
const app = require('../src/app');
// Test group covers  behavior.
describe('Travel guide routes', () => {
  // Scenario verifies one expected outcome or error path.
  test('requires authentication for destination lists', async () => {
    const response = await request(app)
      .get('/api/v1/travel-guide/destinations')
      .query({ country: 'Malaysia', mode: 'domestic' });

    expect(response.statusCode).toBe(401);
    expect(response.body.status).toBe('fail');
  });
  // Scenario verifies one expected outcome or error path.
  test('requires authentication for country lists', async () => {
    const response = await request(app)
      .get('/api/v1/travel-guide/countries')
      .query({ currentCountry: 'Malaysia', region: 'Asia' });

    expect(response.statusCode).toBe(401);
    expect(response.body.status).toBe('fail');
  });
  // Scenario verifies one expected outcome or error path.
  test('requires authentication for destination details', async () => {
    const response = await request(app)
      .get('/api/v1/travel-guide/destination')
      .query({ destination: 'Singapore', country: 'Singapore' });

    expect(response.statusCode).toBe(401);
    expect(response.body.status).toBe('fail');
  });
});
