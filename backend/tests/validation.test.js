/**
 * Validation module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
const request = require('supertest');
const app = require('../src/app');
// Test group covers  behavior.
describe('API basics', () => {
  // Scenario verifies one expected outcome or error path.
  test('returns health check response', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('success');
  });
  // Scenario verifies one expected outcome or error path.
  test('returns API v1 index response', async () => {
    const response = await request(app).get('/api/v1');

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Smart Travel Planner API v1');
  });
});
