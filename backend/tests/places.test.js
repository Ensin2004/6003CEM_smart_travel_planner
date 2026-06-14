/**
 * Places module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Test group covers fallback behavior when SerpApi API key is not configured.
describe('Places service fallback', () => {
  // Scenario verifies that friendly fallback message is returned when SerpApi key is missing.
  test('returns friendly fallback when SerpApi key is not configured', async () => {
    // Import places service with no API key configured in environment
    const placesService = require('../src/modules/explore/places.service');
    // Attempt to search attractions without valid API configuration
    const attractions = await placesService.getAttractionsByDestination('Tokyo');

    // Verify service indicates API is unavailable
    expect(attractions.available).toBe(false);
    // Verify error message mentions SerpApi as required provider
    expect(attractions.message).toContain('SerpApi key');
    // Verify empty items array is returned as fallback
    expect(attractions.items).toEqual([]);
  });
});

// Test group covers normalization and enrichment of places data from external APIs.
describe('Places service normalization', () => {
  // Cleanup resets shared state after assertions - clears module cache and mocks.
  afterEach(() => {
    jest.resetModules();  // Remove cached modules to ensure fresh imports
    jest.clearAllMocks(); // Clear mock call history
  });

  // Scenario verifies that SerpApi internal follow-up URLs are not exposed to frontend clients.
  test('does not expose SerpApi follow-up URLs to the frontend', async () => {
    // Reset module cache to ensure fresh mocks for this test
    jest.resetModules();

    // Create mock GET function that returns raw API data containing sensitive URLs
    const get = jest.fn().mockResolvedValue({
      data: {
        local_results: [
          {
            place_id: 'place-1',
            // Sensitive: Contains API key and SerpApi internal URL
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
            website: 'https://example.com/museum',  // Legitimate external URL
          },
        ],
      },
    });

    // Mock axios with the GET function
    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get })),
    }));
    // Mock environment with valid SerpApi key
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      serpApiKey: 'test-serpapi-key',
    }));
    // Mock API log service to prevent logging during tests
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks are in place
    const service = require('../src/modules/explore/places.service');
    const attractions = await service.getAttractionsByDestination('Tokyo');

    // Verify service indicates successful response
    expect(attractions.available).toBe(true);
    // Verify URL is converted to safe Google Maps search link
    expect(attractions.items[0].url).toContain('https://www.google.com/maps/search/?api=1&query=');
    // Verify SerpApi internal URL is completely removed
    expect(attractions.items[0].url).not.toContain('serpapi.com');
    // Verify API key is not exposed in any URL
    expect(attractions.items[0].url).not.toContain('api_key');
    // Verify legitimate external URL is preserved unchanged
    expect(attractions.items[1].url).toBe('https://example.com/museum');
  });

  // Scenario verifies that attraction details are enriched with Google Maps photo results.
  test('enriches attraction details with Google Maps photo results', async () => {
    // Reset module cache to ensure fresh mocks for this test
    jest.resetModules();

    // Create mock SerpApi GET function that returns three different responses sequentially
    const serpGet = jest
      .fn()
      // First call: Search for attraction details
      .mockResolvedValueOnce({
        data: {
          local_results: [
            {
              place_id: 'place-1',
              data_id: 'data-1',  // Google Maps data identifier for photo lookup
              title: 'Tokyo Tower',
              type: 'Observation deck',
              thumbnail: 'https://lh3.googleusercontent.com/photo-a=w408-h306-k-no',
              address: '4 Chome-2-8 Shibakoen, Minato City, Tokyo',
            },
          ],
        },
      })
      // Second call: Get photos for the attraction
      .mockResolvedValueOnce({
        data: {
          photos: [
            { image: 'https://lh3.googleusercontent.com/photo-a=s1600-w800' },
            { image: 'https://lh3.googleusercontent.com/photo-b=s1600-w800' },
            { thumbnail: 'https://lh3.googleusercontent.com/photo-c=s240' },
          ],
        },
      })
      // Third call: Get reviews (empty array in this test)
      .mockResolvedValueOnce({
        data: {
          reviews: [],
        },
      });
    
    // Mock Wikipedia API call to fail 
    const wikiGet = jest.fn().mockRejectedValue(new Error('No wiki match'));

    // Mock axios with different handlers for different base URLs
    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get: serpGet })),  // SerpApi client
      get: wikiGet,                                 // Wikipedia client
    }));
    // Mock environment with valid SerpApi key
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      serpApiKey: 'test-serpapi-key',
    }));
    // Mock API log service
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks are in place
    const service = require('../src/modules/explore/places.service');
    // Execute attraction detail retrieval
    const detail = await service.getAttractionDetail({
      name: 'Tokyo Tower',
      address: '4 Chome-2-8 Shibakoen, Minato City, Tokyo',
      dataId: 'data-1',  // Google Maps data ID for photo lookup
    });

    // Verify Google Maps photos API was called with correct parameters
    expect(serpGet).toHaveBeenCalledWith('/search', {
      params: expect.objectContaining({
        engine: 'google_maps_photos',
        data_id: 'data-1',  // Data ID passed through to photo endpoint
      }),
    });
    // Verify image URLs are collected from multiple sources (thumbnail + photo responses)
    expect(detail.item.imageUrls).toEqual([
      'https://lh3.googleusercontent.com/photo-a=w408-h306-k-no',  // Original thumbnail
      'https://lh3.googleusercontent.com/photo-b=s1600-w800',       // From photos array
      'https://lh3.googleusercontent.com/photo-c=s240',             // From photos thumbnail
    ]);
  });
});