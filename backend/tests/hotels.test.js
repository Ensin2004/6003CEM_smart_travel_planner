/**
 * Hotels module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Test group covers fallback behavior when SerpApi API key is not configured.
describe('Hotels service fallback', () => {
  // Scenario verifies that friendly fallback message is returned when SerpApi key is missing.
  test('returns friendly fallback when SerpApi key is not configured', async () => {
    // Import hotels service with no API key configured in environment
    const hotelsService = require('../src/modules/explore/hotels.service');
    // Attempt to search hotels without valid API configuration
    const hotels = await hotelsService.getHotelsByDestination({ 
      country: 'Malaysia', 
      state: 'Penang' 
    });

    // Verify service indicates API is unavailable
    expect(hotels.available).toBe(false);
    // Verify error message mentions SerpApi as required provider
    expect(hotels.message).toContain('SerpApi key');
    // Verify empty items array is returned as fallback
    expect(hotels.items).toEqual([]);
  });
});

// Test group covers hotel search functionality including filtering and pagination.
describe('Hotels service search', () => {
  // Cleanup resets shared state after assertions - clears module cache and mocks.
  afterEach(() => {
    jest.resetModules();  // Remove cached modules to ensure fresh imports
    jest.clearAllMocks(); // Clear mock call history
  });

  // Scenario verifies that filter-only searches are supported and result count is not artificially limited.
  test('supports filter-only searches and does not trim results to 12', async () => {
    // Reset module cache to ensure fresh mocks for this test
    jest.resetModules();

    // Generate 15 mock hotel results (testing that service returns all, not limited to 12)
    const rawHotels = Array.from({ length: 15 }, (_, index) => ({
      place_id: `hotel-${index}`,
      title: `Hotel ${index}`,
      type: 'Hotel',
      rating: 4,
      reviews: 100 + index,
      address: `Address ${index}`,
    }));
    
    // Create mock GET function that returns the generated hotel list
    const get = jest.fn().mockResolvedValue({
      data: {
        local_results: rawHotels,  // 15 results returned from API
      },
    });

    // Mock axios to return configured GET function
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
    const service = require('../src/modules/explore/hotels.service');
    // Execute hotel search with room type filter and pagination start parameter
    const hotels = await service.getHotelsByDestination({
      country: 'Malaysia',
      state: 'Penang',
      roomType: 'suite',      // Filter-only search term
      start: 20,              // Pagination offset (skip first 20 results)
    });

    // Verify API was called with correctly constructed query including room type
    expect(get).toHaveBeenCalledWith('/search', {
      params: expect.objectContaining({
        q: 'suite hotels in Penang, Malaysia',  // Search query with room type filter
        start: 20,                              // Pagination parameter preserved
      }),
    });
    // Verify service indicates successful response
    expect(hotels.available).toBe(true);
    // Verify all 15 results are returned (not trimmed to arbitrary limit)
    expect(hotels.items).toHaveLength(15);
    // Verify nextStart pagination token correctly calculated (20 + 15 = 35)
    expect(hotels.nextStart).toBe(35);
  });
});