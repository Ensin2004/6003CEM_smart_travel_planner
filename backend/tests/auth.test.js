/**
 * Auth module.
 * Assertions cover expected behavior, error handling, and response shape.
 */
const request = require('supertest');
const app = require('../src/app');
// Test group covers  behavior.
describe('Auth validation', () => {
  // Scenario verifies one expected outcome or error path.
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
  // Scenario verifies one expected outcome or error path.
  test('rejects logout without refresh token', async () => {
    const response = await request(app).post('/api/v1/auth/logout').send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('fail');
  });
});
