const request = require('supertest');
const app = require('../src/app');

describe('Auth validation', () => {
  test('rejects invalid registration body', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'A',
      email: 'not-email',
      password: 'short',
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('fail');
    expect(response.body.errors.length).toBeGreaterThan(0);
  });
});
