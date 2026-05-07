const request = require('supertest');
const app = require('../src/app');

describe('API basics', () => {
  test('returns health check response', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('success');
  });

  test('returns API v1 index response', async () => {
    const response = await request(app).get('/api/v1');

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Smart Travel Planner API v1');
  });
});
