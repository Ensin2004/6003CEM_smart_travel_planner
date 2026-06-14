/**
 * Visited places module.
 * Assertions cover place identity and calendar grouping behavior.
 */

// Test group covers place key generation for deduplication and calendar-based grouping of visited places.
describe('Visited places service', () => {
  // Clean up module cache and mock state after each test to prevent test pollution
  afterEach(() => {
    jest.resetModules();  // Clear require cache to allow fresh module imports
    jest.clearAllMocks(); // Clear mock call history
  });

  // Verify that the same place key is generated regardless of data source
  test('builds the same place key across different feature sources', () => {
    // Import the service dynamically after any mocks are set up
    const visitedPlaceService = require('../src/modules/visitedPlaces/visitedPlace.service');
    
    // Generate a place key from explore-attractions source data
    const exploreKey = visitedPlaceService.buildPlaceKey({
      type: 'attraction',
      source: 'explore-attractions',  // First possible source
      externalId: 'osm-123',          // OpenStreetMap identifier
      title: 'Heritage Museum',
      address: 'Main Street',
    });
    
    // Generate a place key from travel-guide source data for the same place
    const guideKey = visitedPlaceService.buildPlaceKey({
      type: 'attraction',
      source: 'travel-guide',         // Second possible source
      externalId: 'osm-123',          // Same external ID
      title: 'Heritage Museum',       // Same title
      address: 'Main Street',         // Same address
    });

    // Verify both sources produce identical normalized place key
    expect(exploreKey).toBe(guideKey);
  });

  // Verify that visited places are correctly grouped by calendar date
  test('groups visited places by calendar date', async () => {
    // Mock the visited place repository with controlled test data
    jest.doMock('../src/modules/visitedPlaces/visitedPlace.repository', () => ({
      findBetweenDates: jest.fn().mockResolvedValue([
        {
          _id: 'place-1',
          title: 'Museum',
          type: 'attraction',
          visits: [
            { _id: 'visit-1', visitedDate: new Date('2026-06-03T10:00:00.000Z'), visitCount: 1 },
            { _id: 'visit-2', visitCount: 2 },  // No visitedDate - counts as undated
          ],
        },
        {
          _id: 'place-2',
          title: 'Cafe',
          type: 'restaurant',
          visits: [{ _id: 'visit-3', visitedDate: new Date('2026-06-03T13:00:00.000Z'), visitCount: 3 }],
        },
        {
          _id: 'place-3',
          title: 'Hotel',
          type: 'hotel',
          visits: [{ _id: 'visit-4', visitedDate: new Date('2026-06-04T09:00:00.000Z'), visitCount: 1 }],
        },
      ]),
    }));

    // Import the service after the mock is in place
    const visitedPlaceService = require('../src/modules/visitedPlaces/visitedPlace.service');
    
    // Execute calendar retrieval for a date range
    const days = await visitedPlaceService.getVisitedCalendar('6655f6f2b1f1f1f1f1f1f111', {
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    });

    // Verify only dates with visits are returned (2 distinct dates)
    expect(days).toHaveLength(2);
    
    // Verify first date grouping (June 3rd)
    expect(days[0].date).toBe('2026-06-03');
    expect(days[0].places).toHaveLength(2);  // Museum and Cafe
    expect(days[0].places[1].visitCount).toBe(3);  // Cafe visit count
    
    // Verify second date grouping (June 4th)
    expect(days[1].date).toBe('2026-06-04');
  });

  // Verify that a place can be marked as visited without providing a specific date
  test('adds an undated visit count without requiring a visited date', async () => {
    // Create a mock function to track repository calls
    const addVisitByUserAndPlaceKey = jest.fn().mockResolvedValue({ 
      title: 'Museum', 
      visits: [{ visitCount: 4 }] 
    });
    
    // Mock the repository with the tracked function
    jest.doMock('../src/modules/visitedPlaces/visitedPlace.repository', () => ({
      addVisitByUserAndPlaceKey,
    }));

    // Import the service after the mock is in place
    const visitedPlaceService = require('../src/modules/visitedPlaces/visitedPlace.service');
    
    // Mark a place as visited with only a visit count (no visitedDate)
    await visitedPlaceService.markVisitedPlace('6655f6f2b1f1f1f1f1f1f111', {
      type: 'attraction',
      title: 'Museum',
      visitCount: 4,  // No visitedDate provided
    });

    // Verify repository received the visit data without a visitedDate field
    expect(addVisitByUserAndPlaceKey.mock.calls[0][3]).toEqual({
      visitCount: 4,
      notes: undefined,
      tripId: undefined,
      itineraryItemId: undefined,
    });
  });
});