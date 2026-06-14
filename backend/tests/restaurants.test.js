/**
 * Restaurants module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Test group covers fallback behavior when SerpApi API key is not configured.
describe('Restaurant service fallback', () => {
  // Scenario verifies that friendly fallback message is returned when SerpApi key is missing.
  test('returns friendly fallback when SerpApi key is not configured', async () => {
    // Import restaurant service with no API key configured in environment
    const restaurantService = require('../src/modules/explore/restaurant.service');
    // Attempt to search restaurants without valid API configuration
    const restaurants = await restaurantService.getRestaurantsByDestination({ 
      country: 'Malaysia', 
      state: 'Penang' 
    });

    // Verify service indicates API is unavailable
    expect(restaurants.available).toBe(false);
    // Verify error message mentions SerpApi as required provider
    expect(restaurants.message).toContain('SerpApi key');
    // Verify empty items array is returned as fallback
    expect(restaurants.items).toEqual([]);
  });
});

// Test group covers restaurant search functionality including food category filtering and pagination.
describe('Restaurant service search', () => {
  // Cleanup resets shared state after assertions - clears module cache and mocks.
  afterEach(() => {
    jest.resetModules();  // Remove cached modules to ensure fresh imports
    jest.clearAllMocks(); // Clear mock call history
  });

  // Scenario verifies that food category searches are supported and result count is not artificially limited.
  test('supports food category searches and does not trim results', async () => {
    // Reset module cache to ensure fresh mocks for this test
    jest.resetModules();

    // Generate 15 mock restaurant results (testing that service returns all, no arbitrary limit)
    const rawRestaurants = Array.from({ length: 15 }, (_, index) => ({
      place_id: `restaurant-${index}`,
      title: `Restaurant ${index}`,
      type: 'Restaurant',
      rating: 4,
      reviews: 100 + index,
      address: `Address ${index}`,
    }));
    
    // Create mock GET function that returns the generated restaurant list
    const get = jest.fn().mockResolvedValue({
      data: {
        local_results: rawRestaurants,  // 15 results returned from API
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
    const service = require('../src/modules/explore/restaurant.service');
    // Execute restaurant search with food category filter and pagination start parameter
    const restaurants = await service.getRestaurantsByDestination({
      country: 'Malaysia',
      state: 'Penang',
      foodCategory: 'seafood',   // Category filter for specific cuisine type
      start: 20,                 // Pagination offset (skip first 20 results)
    });

    // Verify API was called with correctly constructed query including food category
    expect(get).toHaveBeenCalledWith('/search', {
      params: expect.objectContaining({
        q: 'seafood restaurants in Penang, Malaysia',  // Search query with food category
        start: 20,                                     // Pagination parameter preserved
      }),
    });
    // Verify service indicates successful response
    expect(restaurants.available).toBe(true);
    // Verify all 15 results are returned (not trimmed to arbitrary limit)
    expect(restaurants.items).toHaveLength(15);
    // Verify nextStart pagination token correctly calculated (20 + 15 = 35)
    expect(restaurants.nextStart).toBe(35);
  });
});