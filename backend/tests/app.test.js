const request = require('supertest');
const app = require('../src/app');

describe('application routes', () => {
  it('describes the API at the root deployment URL', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.apiBaseUrl).toBe('/api/v1');
  });

  it('reports API and database health information', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.database).toEqual({
      configured: expect.any(Boolean),
      state: expect.any(String),
    });
  });
});
