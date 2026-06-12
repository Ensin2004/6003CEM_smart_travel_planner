/**
 * Security headers should protect both API and interactive documentation responses.
 */
const request = require('supertest');

const app = require('../src/app');

describe('Security headers', () => {
  test('applies a restrictive policy to API responses', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['permissions-policy']).toContain('geolocation=()');
    expect(response.headers['strict-transport-security']).toBeUndefined();
  });

  test('allows the inline assets required by Swagger UI', async () => {
    const response = await request(app).get('/api-docs/');

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-security-policy']).toContain(
      "script-src 'self' 'unsafe-inline'"
    );
    expect(response.headers['content-security-policy']).toContain(
      "style-src 'self' 'unsafe-inline'"
    );
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['permissions-policy']).toContain('camera=()');
  });
});
