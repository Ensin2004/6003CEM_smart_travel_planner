const request = require('supertest');
const app = require('../src/app');

describe('Trip route protection', () => {
  test('rejects trip list request without JWT', async () => {
    const response = await request(app).get('/api/v1/trips');

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Authentication token is required');
  });
});
