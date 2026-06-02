/**
 * Trips module.
 * Assertions cover expected behavior, error handling, and response shape.
 */
const request = require('supertest');
const app = require('../src/app');
// Test group covers  behavior.
describe('Trip route protection', () => {
  // Scenario verifies one expected outcome or error path.
  test('rejects trip list request without JWT', async () => {
    const response = await request(app).get('/api/v1/trips');

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Authentication token is required');
  });
});

describe('Trip weather guidance', () => {
  const { getWeatherGuidance } = require('../src/modules/trips/trip.service');

  test('recommends umbrella and indoor places for rainy weather', () => {
    const guidance = getWeatherGuidance({
      available: true,
      condition: 'Rain',
      precipitation: { amountMm: 5, probability: 70 },
      temperature: { max: 24, mean: 23 },
    });

    expect(guidance.mode).toBe('rainy');
    expect(guidance.packingTips.join(' ')).toContain('umbrella');
    expect(guidance.placeTips.join(' ')).toContain('indoor');
    expect(guidance.recommendedCategories).toContain('shopping');
  });

  test('recommends sun protection and cool indoor places for hot sunny weather', () => {
    const guidance = getWeatherGuidance({
      available: true,
      condition: 'Clear',
      precipitation: { amountMm: 0, probability: 5 },
      temperature: { max: 34, mean: 31 },
    });

    expect(guidance.mode).toBe('sunny');
    expect(guidance.packingTips.join(' ')).toContain('sunscreen');
    expect(guidance.placeTips.join(' ')).toContain('air-conditioned');
    expect(guidance.recommendedCategories).toContain('food');
  });

  test('uses default place ideas when weather is unavailable', () => {
    const guidance = getWeatherGuidance({
      available: false,
      message: 'Weather temporarily unavailable',
    });

    expect(guidance.available).toBe(false);
    expect(guidance.mode).toBe('default');
    expect(guidance.recommendedCategories).toContain('attractions');
  });
});
