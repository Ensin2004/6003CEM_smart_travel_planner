describe('Places service fallback', () => {
  test('returns friendly fallback when SerpApi key is not configured', async () => {
    const placesService = require('../src/modules/explore/places.service');
    const attractions = await placesService.getAttractionsByDestination('Tokyo');

    expect(attractions.available).toBe(false);
    expect(attractions.message).toContain('SerpApi key');
    expect(attractions.items).toEqual([]);
  });
});

describe('Places service normalization', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('does not expose SerpApi follow-up URLs to the frontend', async () => {
    jest.resetModules();

    const get = jest.fn().mockResolvedValue({
      data: {
        local_results: [
          {
            place_id: 'place-1',
            place_id_search: 'https://serpapi.com/search.json?engine=google_maps&api_key=YOUR_API_KEY',
            title: 'Tokyo Tower',
            type: 'Observation deck',
            rating: 4.5,
            reviews: 12000,
            address: '4 Chome-2-8 Shibakoen, Minato City, Tokyo',
          },
          {
            place_id: 'place-2',
            title: 'Official Museum',
            website: 'https://example.com/museum',
          },
        ],
      },
    });

    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get })),
    }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      serpApiKey: 'test-serpapi-key',
    }));
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    const service = require('../src/modules/explore/places.service');
    const attractions = await service.getAttractionsByDestination('Tokyo');

    expect(attractions.available).toBe(true);
    expect(attractions.items[0].url).toContain('https://www.google.com/maps/search/?api=1&query=');
    expect(attractions.items[0].url).not.toContain('serpapi.com');
    expect(attractions.items[0].url).not.toContain('api_key');
    expect(attractions.items[1].url).toBe('https://example.com/museum');
  });
});
