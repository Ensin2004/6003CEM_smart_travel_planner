/**
 * Map module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Test group covers fallback behavior when API keys are not configured.
describe('Map service fallback', () => {
  // Cleanup resets shared state after assertions - clears module cache and mocks.
  afterEach(() => {
    jest.resetModules();  // Remove cached modules to ensure fresh imports
    jest.clearAllMocks(); // Clear mock call history
  });

  // Scenario verifies that friendly fallback message is returned when Foursquare API key is missing.
  test('returns friendly fallback when Foursquare API key is not configured', async () => {
    // Import map service with no API key configured in environment
    const mapService = require('../src/modules/map/map.service');
    // Attempt to get map places without valid API configuration
    const places = await mapService.getMapPlaces({
      category: 'attractions',
      latitude: 5.4141,
      longitude: 100.3288,
    });

    // Verify service indicates API is unavailable
    expect(places.available).toBe(false);
    // Verify error message mentions both required providers
    expect(places.message).toContain('Foursquare and SerpApi');
    // Verify empty items array is returned as fallback
    expect(places.items).toEqual([]);
  });
});

// Test group covers normalization of Foursquare API responses for map markers and details.
describe('Map service normalization', () => {
  // Cleanup resets shared state after assertions - clears module cache and mocks.
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  // Scenario verifies that Foursquare search results are normalized to standard map marker format.
  test('normalizes Foursquare search results for map markers', async () => {
    // Reset module cache to ensure fresh mocks for this test
    jest.resetModules();

    // Create mock GET function that returns Foursquare search results
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

    // Mock axios to return configured GET function
    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get })),
    }));
    // Mock environment with valid Foursquare API key
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      foursquareApiKey: 'test-foursquare-key',
    }));
    // Mock repository to bypass cache checks
    jest.doMock('../src/modules/map/map.repository', () => ({
      findValidCache: jest.fn().mockResolvedValue(null),
      upsertCache: jest.fn().mockResolvedValue({}),
    }));
    // Mock API log service to prevent logging during tests
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks are in place
    const mapService = require('../src/modules/map/map.service');
    const places = await mapService.getMapPlaces({
      category: 'attractions',
      latitude: 5.4141,
      longitude: 100.3288,
      limit: 10,
    });

    // Verify service indicates successful response
    expect(places.available).toBe(true);
    // Verify first result is normalized to standard format
    expect(places.items[0]).toEqual(
      expect.objectContaining({
        id: '4b05880af964a5202d8b22e3',
        name: 'Kek Lok Si Temple',
        lat: 5.4001,
        lng: 100.2731,
      })
    );
    // Verify API was called with correct authentication headers
    expect(get).toHaveBeenCalledWith(
      '/search',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-foursquare-key' }),
      })
    );
  });

  // Scenario verifies that Foursquare place details are normalized to standard format.
  test('normalizes Foursquare details for the selected marker', async () => {
    // Create mock GET function that returns detailed place information
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
        price: 1,                      // Price level (1 = inexpensive)
        rating: 8.8,                   // Rating out of 10 (Foursquare scale)
        stats: { total_ratings: 10482 },
        tel: '+6048283317',
        website: 'https://example.com',
      },
    });

    // Mock axios with the GET function
    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get })),
    }));
    // Mock environment with valid API key
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      foursquareApiKey: 'test-foursquare-key',
    }));
    // Mock repository to bypass cache
    jest.doMock('../src/modules/map/map.repository', () => ({
      findValidCache: jest.fn().mockResolvedValue(null),
      upsertCache: jest.fn().mockResolvedValue({}),
    }));
    // Mock API log service
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks
    const mapService = require('../src/modules/map/map.service');
    const details = await mapService.getMapPlaceDetails({
      category: 'attractions',
      placeId: '4b05880af964a5202d8b22e3',
      foursquarePlaceId: '4b05880af964a5202d8b22e3',
      name: 'Kek Lok Si Temple',
      latitude: 5.4001,
      longitude: 100.2731,
    });

    // Verify details are normalized (rating converted from 8.8/10 to 4.4/5)
    expect(details.item).toEqual(
      expect.objectContaining({
        rating: 4.4,                   // Converted from 8.8 out of 10
        reviews: 10482,
        price: '$',                    // Price level 1 converted to one dollar sign
        hours: 'Mon-Sun 8:30 AM-5:30 PM',
        openState: 'Open now',         // Derived from hours.open_now flag
        imageUrl: 'https://example.com/800x600/temple.jpg',  // Constructed from prefix/suffix
      })
    );
    // Verify API was called with correct place ID and authentication
    expect(get).toHaveBeenCalledWith(
      '/4b05880af964a5202d8b22e3',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-foursquare-key' }),
      })
    );
  });

  // Scenario verifies that SerpApi (Google Maps) data is used to enrich place details.
  test('uses SerpApi Google Maps data and reviews to enrich selected marker details', async () => {
    // Mock Foursquare API to return basic place data
    const foursquareGet = jest.fn().mockResolvedValue({
      data: {
        fsq_place_id: '4b05880af964a5202d8b22e3',
        name: 'Kek Lok Si Temple',
        location: { formatted_address: 'Air Itam, Penang' },
        latitude: 5.4001,
        longitude: 100.2731,
      },
    });
    
    // Mock SerpApi to return Google Maps data and reviews based on request type
    const serpGet = jest.fn().mockImplementation((path, options) => {
      // Handle Google Maps reviews request
      if (options.params.engine === 'google_maps_reviews') {
        return Promise.resolve({
          data: {
            reviews: [{ review_id: 'review-1', user: { name: 'Jamie' }, rating: 5, snippet: 'Beautiful temple.' }],
          },
        });
      }
      // Handle Google Maps place search request
      return Promise.resolve({
        data: {
          local_results: [{
            place_id: 'google-place-1',
            data_id: 'google-data-1',
            title: 'Kek Lok Si Temple',
            rating: 4.7,               // Rating out of 5
            reviews: 12000,
            open_state: 'Open now',
            hours: 'Mon-Sun 8:30 AM-5:30 PM',
            thumbnail: 'https://example.com/google-temple.jpg',
            gps_coordinates: { latitude: 5.4001, longitude: 100.2731 },
          }],
        },
      });
    });

    // Mock axios to return different clients based on baseURL
    jest.doMock('axios', () => ({
      create: jest.fn(({ baseURL }) => ({ 
        get: baseURL.includes('serpapi') ? serpGet : foursquareGet 
      })),
    }));
    // Mock environment with both Foursquare and SerpApi keys
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      foursquareApiKey: 'test-foursquare-key',
      serpApiKey: 'test-serpapi-key',
      serpApiDailyLimit: 100,
    }));
    // Mock repository to bypass cache
    jest.doMock('../src/modules/map/map.repository', () => ({
      findValidCache: jest.fn().mockResolvedValue(null),
      upsertCache: jest.fn().mockResolvedValue({}),
    }));
    // Mock API log service
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks
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

    // Verify enriched details include Google Maps data and reviews
    expect(details.item).toEqual(
      expect.objectContaining({
        id: '4b05880af964a5202d8b22e3',
        rating: 4.7,                   // Rating from Google Maps
        reviews: 12000,                // Review count from Google Maps
        hours: 'Mon-Sun 8:30 AM-5:30 PM',
        imageUrl: 'https://example.com/google-temple.jpg',  // Image from Google
        reviewItems: [expect.objectContaining({ author: 'Jamie', text: 'Beautiful temple.' })],
      })
    );
    // Verify Google Maps search was called
    expect(serpGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({ engine: 'google_maps' }),
      })
    );
    // Verify Google Maps reviews were called
    expect(serpGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({ engine: 'google_maps_reviews' }),
      })
    );
  });
});

// Test group covers route planning and optimization using OpenRouteService.
describe('Map route planning', () => {
  // Cleanup resets shared state after each test
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  // Scenario verifies that OpenRouteService alternatives are normalized and ranked.
  test('normalizes and ranks OpenRouteService alternatives', async () => {
    // Mock POST function that returns multiple route alternatives
    const post = jest.fn().mockResolvedValue({
      data: {
        features: [
          {
            properties: { summary: { distance: 12000, duration: 900 } },   // Fastest (900s)
            geometry: { coordinates: [[100.3, 5.4], [100.4, 5.5]] },
          },
          {
            properties: { summary: { distance: 10000, duration: 1100 } },   // Shortest (10km)
            geometry: { coordinates: [[100.3, 5.4], [100.35, 5.45], [100.4, 5.5]] },
          },
          {
            properties: { summary: { distance: 11000, duration: 950 } },    // Balanced (best overall)
            geometry: { coordinates: [[100.3, 5.4], [100.38, 5.48], [100.4, 5.5]] },
          },
        ],
      },
    });

    // Mock axios with POST function
    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ post })),
    }));
    // Mock environment with OpenRouteService API key
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      openRouteServiceApiKey: 'test-ors-key',
    }));

    // Import service after mocks
    const mapService = require('../src/modules/map/map.service');
    const result = await mapService.getMapRoutes({
      mode: 'car',
      points: [{ lat: 5.4, lng: 100.3 }, { lat: 5.5, lng: 100.4 }],
    });

    // Verify provider identification
    expect(result.provider).toBe('openrouteservice');
    // Verify all three routes are returned
    expect(result.routes).toHaveLength(3);
    // Verify best route is correctly identified (balanced option with 11000m, 950s)
    expect(result.routes[0]).toEqual(expect.objectContaining({
      id: 'ors-route-3',
      isBest: true,
      distanceMeters: 11000,
      durationSeconds: 950,
    }));
    // Verify shortest route is correctly flagged
    expect(result.routes.find((route) => route.isShortest).distanceMeters).toBe(10000);
    // Verify fastest route is correctly flagged
    expect(result.routes.find((route) => route.isFastest).durationSeconds).toBe(900);
    // Verify API was called with alternative routes requested
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

  // Scenario verifies that Dijkstra algorithm optimizes intermediate waypoint order.
  test('uses Dijkstra to optimize intermediate waypoint order', async () => {
    // Mock POST function that returns route through optimized waypoints
    const post = jest.fn().mockResolvedValue({
      data: {
        features: [{
          properties: { summary: { distance: 300000, duration: 14000 } },
          geometry: {
            coordinates: [
              [100, 0],  // Start point
              [101, 0],  // Waypoint 2 (originally index 2)
              [102, 0],  // Waypoint 1 (originally index 1)
              [103, 0],  // End point
            ],
          },
        }],
      },
    });

    // Mock axios with POST function
    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ post })),
    }));
    // Mock environment with API key
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      openRouteServiceApiKey: 'test-ors-key',
    }));

    // Import service after mocks
    const mapService = require('../src/modules/map/map.service');
    const result = await mapService.getMapRoutes({
      mode: 'car',
      points: [
        { lat: 0, lng: 100 },  // Start point (index 0)
        { lat: 0, lng: 102 },  // Waypoint A (index 1)
        { lat: 0, lng: 101 },  // Waypoint B (index 2)
        { lat: 0, lng: 103 },  // End point (index 3)
      ],
    });

    // Verify optimization metadata
    expect(result.optimization).toEqual(expect.objectContaining({
      algorithm: 'dijkstra',                    // Algorithm used for optimization
      pointOrder: [0, 2, 1, 3],                 // Reordered indices: start, waypoint B, waypoint A, end
    }));
    // Verify distance savings were calculated (positive number)
    expect(result.optimization.savedDistanceMeters).toBeGreaterThan(0);
    // Verify API was called with optimized coordinate order
    expect(post).toHaveBeenCalledWith(
      '/v2/directions/driving-car/geojson',
      expect.objectContaining({
        coordinates: [[100, 0], [101, 0], [102, 0], [103, 0]],  // Optimized order
      }),
      expect.any(Object)
    );
  });
});