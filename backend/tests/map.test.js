describe('Map service fallback', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('returns friendly fallback when SerpApi key is not configured', async () => {
    const mapService = require('../src/modules/map/map.service');
    const places = await mapService.getMapPlaces({
      category: 'attractions',
      latitude: 5.4141,
      longitude: 100.3288,
    });

    expect(places.available).toBe(false);
    expect(places.message).toContain('SerpApi key');
    expect(places.items).toEqual([]);
  });
});

describe('Map service normalization', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('normalizes images, reviews, price, hours, and coordinates for map cards', async () => {
    jest.resetModules();

    const get = jest.fn().mockResolvedValue({
      data: {
        local_results: [
          {
            place_id: 'place-1',
            title: 'Kek Lok Si Temple',
            type: 'Tourist attraction',
            rating: 4.4,
            reviews: 10482,
            price: 'RM 2',
            open_state: 'Open now',
            address: 'Air Itam, Penang',
            thumbnail: 'https://example.com/kek-lok-si.jpg',
            gps_coordinates: {
              latitude: 5.4001,
              longitude: 100.2731,
            },
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
      serpApiDailyLimit: 100,
    }));
    jest.doMock('../src/modules/map/map.repository', () => ({
      findValidCache: jest.fn().mockResolvedValue(null),
      upsertCache: jest.fn().mockResolvedValue({}),
    }));
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    const mapService = require('../src/modules/map/map.service');
    const places = await mapService.getMapPlaces({
      category: 'attractions',
      latitude: 5.4141,
      longitude: 100.3288,
      limit: 10,
    });

    expect(places.available).toBe(true);
    expect(places.items[0]).toEqual(
      expect.objectContaining({
        id: 'place-1',
        name: 'Kek Lok Si Temple',
        imageUrl: 'https://example.com/kek-lok-si.jpg',
        reviews: 10482,
        price: 'RM 2',
        hours: 'Open now',
        lat: 5.4001,
        lng: 100.2731,
      })
    );
    expect(places.items[0].priceDetail).toEqual(
      expect.objectContaining({
        currency: 'MYR',
        amount: 2,
      })
    );
  });
});
