const weatherService = require('../src/modules/explore/weather.service');

describe('Weather service fallback', () => {
  test('returns friendly fallback when API key is not configured', async () => {
    const weather = await weatherService.getWeatherByDestination('Tokyo');

    expect(weather.available).toBe(false);
    expect(weather.message).toContain('API key');
  });
});
