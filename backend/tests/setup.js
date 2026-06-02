/**
 * Setup module.
 * Assertions cover expected behavior, error handling, and response shape.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-access-secret';
process.env.REFRESH_JWT_SECRET = 'test-refresh-secret';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
