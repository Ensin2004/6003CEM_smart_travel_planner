const request = require('supertest');
const app = require('../src/app');

describe('Travel guide routes', () => {
  test('requires authentication for destination lists', async () => {
    const response = await request(app)
      .get('/api/v1/travel-guide/destinations')
      .query({ country: 'Malaysia', mode: 'domestic' });

    expect(response.statusCode).toBe(401);
    expect(response.body.status).toBe('fail');
  });

  test('requires authentication for country lists', async () => {
    const response = await request(app)
      .get('/api/v1/travel-guide/countries')
      .query({ currentCountry: 'Malaysia', region: 'Asia' });

    expect(response.statusCode).toBe(401);
    expect(response.body.status).toBe('fail');
  });

  test('requires authentication for destination details', async () => {
    const response = await request(app)
      .get('/api/v1/travel-guide/destination')
      .query({ destination: 'Singapore', country: 'Singapore' });

    expect(response.statusCode).toBe(401);
    expect(response.body.status).toBe('fail');
  });
});
