const request = require('supertest');
const app = require('../src/app');

describe('application routes', () => {
  it('describes the API at the root deployment URL', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      message: 'Smart Travel Planner API',
      health: '/health',
      documentation: '/api-docs',
      apiBaseUrl: '/api/v1',
    });
  });

  it('reports a healthy API', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
  });
});
