/**
 * Map module.
 * Assertions cover expected behavior, error handling, and response shape.
 */
// Test group covers  behavior.
describe('Map service fallback', () => {
  // Cleanup resets shared state after assertions.
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });
  // Scenario verifies one expected outcome or error path.
  test('returns friendly fallback when Foursquare API key is not configured', async () => {
    const mapService = require('../src/modules/map/map.service');
    const places = await mapService.getMapPlaces({
      category: 'attractions',
      latitude: 5.4141,
      longitude: 100.3288,
    });

    expect(places.available).toBe(false);
    expect(places.message).toContain('Foursquare and SerpApi');
    expect(places.items).toEqual([]);
  });
});
// Test group covers  behavior.
describe('Map service normalization', () => {
  // Cleanup resets shared state after assertions.
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });
  // Scenario verifies one expected outcome or error path.
  test('normalizes Foursquare search results for map markers', async () => {
    jest.resetModules();

    const get = jest.fn().mockResolvedValue({
      data: {
        results: [
          {
            fsq_place_id: '4b05880af964a5202d8b22e3',
            name: 'Kek Lok Si Temple',
            categories: [{ name: 'Buddhist Temple' }],
            location: { formatted_address: 'Air Itam, Penang' },
            latitude: 5.4001,
            longitude: 100.2731,
          },
        ],
      },
    });

    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get })),
    }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      foursquareApiKey: 'test-foursquare-key',
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
        id: '4b05880af964a5202d8b22e3',
        name: 'Kek Lok Si Temple',
        lat: 5.4001,
        lng: 100.2731,
      })
    );
    expect(get).toHaveBeenCalledWith(
      '/search',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-foursquare-key' }),
      })
    );
  });

  test('normalizes Foursquare details for the selected marker', async () => {
    const get = jest.fn().mockResolvedValue({
      data: {
        fsq_place_id: '4b05880af964a5202d8b22e3',
        name: 'Kek Lok Si Temple',
        categories: [{ name: 'Buddhist Temple' }],
        location: { formatted_address: 'Air Itam, Penang' },
        latitude: 5.4001,
        longitude: 100.2731,
        hours: { open_now: true, display: 'Mon-Sun 8:30 AM-5:30 PM' },
        photos: [{ prefix: 'https://example.com/', suffix: '/temple.jpg' }],
        price: 1,
        rating: 8.8,
        stats: { total_ratings: 10482 },
        tel: '+6048283317',
        website: 'https://example.com',
      },
    });

    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get })),
    }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      foursquareApiKey: 'test-foursquare-key',
    }));
    jest.doMock('../src/modules/map/map.repository', () => ({
      findValidCache: jest.fn().mockResolvedValue(null),
      upsertCache: jest.fn().mockResolvedValue({}),
    }));
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    const mapService = require('../src/modules/map/map.service');
    const details = await mapService.getMapPlaceDetails({
      category: 'attractions',
      placeId: '4b05880af964a5202d8b22e3',
      foursquarePlaceId: '4b05880af964a5202d8b22e3',
      name: 'Kek Lok Si Temple',
      latitude: 5.4001,
      longitude: 100.2731,
    });

    expect(details.item).toEqual(
      expect.objectContaining({
        rating: 4.4,
        reviews: 10482,
        price: '$',
        hours: 'Mon-Sun 8:30 AM-5:30 PM',
        openState: 'Open now',
        imageUrl: 'https://example.com/800x600/temple.jpg',
      })
    );
    expect(get).toHaveBeenCalledWith(
      '/4b05880af964a5202d8b22e3',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-foursquare-key' }),
      })
    );
  });

  test('uses SerpApi Google Maps data and reviews to enrich selected marker details', async () => {
    const foursquareGet = jest.fn().mockResolvedValue({
      data: {
        fsq_place_id: '4b05880af964a5202d8b22e3',
        name: 'Kek Lok Si Temple',
        location: { formatted_address: 'Air Itam, Penang' },
        latitude: 5.4001,
        longitude: 100.2731,
      },
    });
    const serpGet = jest.fn().mockImplementation((path, options) => {
      if (options.params.engine === 'google_maps_reviews') {
        return Promise.resolve({
          data: {
            reviews: [{ review_id: 'review-1', user: { name: 'Jamie' }, rating: 5, snippet: 'Beautiful temple.' }],
          },
        });
      }

      return Promise.resolve({
        data: {
          local_results: [{
            place_id: 'google-place-1',
            data_id: 'google-data-1',
            title: 'Kek Lok Si Temple',
            rating: 4.7,
            reviews: 12000,
            open_state: 'Open now',
            hours: 'Mon-Sun 8:30 AM-5:30 PM',
            thumbnail: 'https://example.com/google-temple.jpg',
            gps_coordinates: { latitude: 5.4001, longitude: 100.2731 },
          }],
        },
      });
    });

    jest.doMock('axios', () => ({
      create: jest.fn(({ baseURL }) => ({ get: baseURL.includes('serpapi') ? serpGet : foursquareGet })),
    }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      foursquareApiKey: 'test-foursquare-key',
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
    const details = await mapService.getMapPlaceDetails({
      category: 'attractions',
      placeId: '4b05880af964a5202d8b22e3',
      foursquarePlaceId: '4b05880af964a5202d8b22e3',
      name: 'Kek Lok Si Temple',
      address: 'Air Itam, Penang',
      latitude: 5.4001,
      longitude: 100.2731,
    });

    expect(details.item).toEqual(
      expect.objectContaining({
        id: '4b05880af964a5202d8b22e3',
        rating: 4.7,
        reviews: 12000,
        hours: 'Mon-Sun 8:30 AM-5:30 PM',
        imageUrl: 'https://example.com/google-temple.jpg',
        reviewItems: [expect.objectContaining({ author: 'Jamie', text: 'Beautiful temple.' })],
      })
    );
    expect(serpGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({ engine: 'google_maps' }),
      })
    );
    expect(serpGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({ engine: 'google_maps_reviews' }),
      })
    );
  });

});

describe('Map route planning', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('normalizes and ranks OpenRouteService alternatives', async () => {
    const post = jest.fn().mockResolvedValue({
      data: {
        features: [
          {
            properties: { summary: { distance: 12000, duration: 900 } },
            geometry: { coordinates: [[100.3, 5.4], [100.4, 5.5]] },
          },
          {
            properties: { summary: { distance: 10000, duration: 1100 } },
            geometry: { coordinates: [[100.3, 5.4], [100.35, 5.45], [100.4, 5.5]] },
          },
          {
            properties: { summary: { distance: 11000, duration: 950 } },
            geometry: { coordinates: [[100.3, 5.4], [100.38, 5.48], [100.4, 5.5]] },
          },
        ],
      },
    });

    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ post })),
    }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      openRouteServiceApiKey: 'test-ors-key',
    }));

    const mapService = require('../src/modules/map/map.service');
    const result = await mapService.getMapRoutes({
      mode: 'car',
      points: [{ lat: 5.4, lng: 100.3 }, { lat: 5.5, lng: 100.4 }],
    });

    expect(result.provider).toBe('openrouteservice');
    expect(result.routes).toHaveLength(3);
    expect(result.routes[0]).toEqual(expect.objectContaining({
      id: 'ors-route-3',
      isBest: true,
      distanceMeters: 11000,
      durationSeconds: 950,
    }));
    expect(result.routes.find((route) => route.isShortest).distanceMeters).toBe(10000);
    expect(result.routes.find((route) => route.isFastest).durationSeconds).toBe(900);
    expect(post).toHaveBeenCalledWith(
      '/v2/directions/driving-car/geojson',
      expect.objectContaining({
        alternative_routes: expect.objectContaining({ target_count: 2 }),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'test-ors-key' }),
      })
    );
  });

  test('uses Dijkstra to optimize intermediate waypoint order', async () => {
    const post = jest.fn().mockResolvedValue({
      data: {
        features: [{
          properties: { summary: { distance: 300000, duration: 14000 } },
          geometry: {
            coordinates: [
              [100, 0],
              [101, 0],
              [102, 0],
              [103, 0],
            ],
          },
        }],
      },
    });

    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ post })),
    }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      openRouteServiceApiKey: 'test-ors-key',
    }));

    const mapService = require('../src/modules/map/map.service');
    const result = await mapService.getMapRoutes({
      mode: 'car',
      points: [
        { lat: 0, lng: 100 },
        { lat: 0, lng: 102 },
        { lat: 0, lng: 101 },
        { lat: 0, lng: 103 },
      ],
    });

    expect(result.optimization).toEqual(expect.objectContaining({
      algorithm: 'dijkstra',
      pointOrder: [0, 2, 1, 3],
    }));
    expect(result.optimization.savedDistanceMeters).toBeGreaterThan(0);
    expect(post).toHaveBeenCalledWith(
      '/v2/directions/driving-car/geojson',
      expect.objectContaining({
        coordinates: [[100, 0], [101, 0], [102, 0], [103, 0]],
      }),
      expect.any(Object)
    );
  });
});
