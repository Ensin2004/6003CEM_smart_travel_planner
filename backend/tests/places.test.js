const placesService = require('../src/modules/explore/places.service');

describe('Places service fallback', () => {
  test('returns friendly fallback when SerpApi key is not configured', async () => {
    const attractions = await placesService.getAttractionsByDestination('Tokyo');

    expect(attractions.available).toBe(false);
    expect(attractions.message).toContain('SerpApi key');
    expect(attractions.items).toEqual([]);
  });
});
