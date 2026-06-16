/**
 * Auth module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Import HTTP testing utilities and the application instance
const request = require('supertest');
const app = require('../src/app');

// Test group covers validation rules for authentication endpoints including registration and logout.
describe('Auth validation', () => {
  // Scenario verifies one expected outcome or error path when registration data fails validation rules.
  test('rejects invalid registration body', async () => {
    // Send POST request to registration endpoint with malformed data
    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'A',               // Name too short - fails length validation
      email: 'not-email',      // Invalid email format - missing @ and domain
      password: 'short',       // Password too short - fails complexity requirements
    });

    // Verify HTTP status code indicates bad request due to validation failure
    expect(response.statusCode).toBe(400);
    // Verify response status field indicates operation failure
    expect(response.body.status).toBe('fail');
    // Verify at least one validation error is returned for the invalid fields
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  // Scenario verifies one expected outcome or error path when logout is attempted without required refresh token.
  test('rejects logout without refresh token', async () => {
    // Send POST request to logout endpoint with empty request body
    const response = await request(app).post('/api/v1/auth/logout').send({});

    // Verify HTTP status code indicates bad request due to missing token
    expect(response.statusCode).toBe(400);
    // Verify response status field indicates operation failure
    expect(response.body.status).toBe('fail');
  });
});