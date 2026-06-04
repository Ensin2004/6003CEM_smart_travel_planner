/**
 * Places module.
 * Assertions cover expected behavior, error handling, and response shape.
 */
// Test group covers  behavior.
describe('Places service fallback', () => {
  // Scenario verifies one expected outcome or error path.
  test('returns friendly fallback when SerpApi key is not configured', async () => {
    const placesService = require('../src/modules/explore/places.service');
    const attractions = await placesService.getAttractionsByDestination('Tokyo');

    expect(attractions.available).toBe(false);
    expect(attractions.message).toContain('SerpApi key');
    expect(attractions.items).toEqual([]);
  });
});
// Test group covers  behavior.
describe('Places service normalization', () => {
  // Cleanup resets shared state after assertions.
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });
  // Scenario verifies one expected outcome or error path.
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

  test('enriches attraction details with Google Maps photo results', async () => {
    jest.resetModules();

    const serpGet = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          local_results: [
            {
              place_id: 'place-1',
              data_id: 'data-1',
              title: 'Tokyo Tower',
              type: 'Observation deck',
              thumbnail: 'https://lh3.googleusercontent.com/photo-a=w408-h306-k-no',
              address: '4 Chome-2-8 Shibakoen, Minato City, Tokyo',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          photos: [
            { image: 'https://lh3.googleusercontent.com/photo-a=s1600-w800' },
            { image: 'https://lh3.googleusercontent.com/photo-b=s1600-w800' },
            { thumbnail: 'https://lh3.googleusercontent.com/photo-c=s240' },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          reviews: [],
        },
      });
    const wikiGet = jest.fn().mockRejectedValue(new Error('No wiki match'));

    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get: serpGet })),
      get: wikiGet,
    }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      serpApiKey: 'test-serpapi-key',
    }));
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    const service = require('../src/modules/explore/places.service');
    const detail = await service.getAttractionDetail({
      name: 'Tokyo Tower',
      address: '4 Chome-2-8 Shibakoen, Minato City, Tokyo',
      dataId: 'data-1',
    });

    expect(serpGet).toHaveBeenCalledWith('/search', {
      params: expect.objectContaining({
        engine: 'google_maps_photos',
        data_id: 'data-1',
      }),
    });
    expect(detail.item.imageUrls).toEqual([
      'https://lh3.googleusercontent.com/photo-a=w408-h306-k-no',
      'https://lh3.googleusercontent.com/photo-b=s1600-w800',
      'https://lh3.googleusercontent.com/photo-c=s240',
    ]);
  });
});
