/**
 * Comparison module.
 * Assertions cover recommendation scoring, validation errors, and response shape.
 */
const request = require('supertest');

// Test group covers protected comparison endpoint behavior.
describe('Comparison recommendation endpoint', () => {
  let app;

  // Setup loads the app with authenticated test requests.
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../src/middleware/auth.middleware', () => ({
      protect: (req, res, next) => {
        req.user = { id: 'test-user-id', email: 'traveller@example.com', role: 'user' };
        next();
      },
    }));
    app = require('../src/app');
  });

  // Cleanup resets mocked modules after assertions.
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  // Scenario verifies a successful recommendation with the expected best pick.
  test('chooses the strongest place from selected comparison items', async () => {
    const response = await request(app)
      .post('/api/v1/comparison/recommendation')
      .send({
        items: [
          {
            id: 'museum',
            name: 'City Museum',
            category: 'Attraction',
            rating: 4.7,
            reviewCount: 2500,
            price: 'RM 20',
            hours: 'Open now',
            address: 'Downtown',
          },
          {
            id: 'market',
            name: 'Night Market',
            category: 'Food',
            rating: 4.1,
            reviewCount: 320,
            price: 'Free entry',
            hours: 'Closed',
            address: 'Central',
          },
        ],
        context: { page: '/explore' },
      })
      .expect(200);

    expect(response.body.status).toBe('success');
    expect(response.body.data.recommendation.bestPick.name).toBe('City Museum');
    expect(response.body.data.recommendation.items).toHaveLength(2);
  });

  // Scenario verifies field-level validation for incomplete comparison requests.
  test('returns validation error when fewer than two places are selected', async () => {
    const response = await request(app)
      .post('/api/v1/comparison/recommendation')
      .send({
        items: [{ id: 'museum', name: 'City Museum' }],
      })
      .expect(400);

    expect(response.body.status).toBe('fail');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'items',
          message: 'Select between 2 and 4 places to compare.',
        }),
      ])
    );
  });
});
