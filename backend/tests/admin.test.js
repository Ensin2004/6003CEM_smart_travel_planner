const request = require('supertest');
const app = require('../src/app');

describe('Admin route protection', () => {
  test('rejects admin dashboard request without JWT', async () => {
    const response = await request(app).get('/api/v1/admin/dashboard');

    expect(response.statusCode).toBe(401);
  });
});
