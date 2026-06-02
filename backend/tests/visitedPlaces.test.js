/**
 * Visited places module.
 * Assertions cover place identity and calendar grouping behavior.
 */
describe('Visited places service', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('builds the same place key across different feature sources', () => {
    const visitedPlaceService = require('../src/modules/visitedPlaces/visitedPlace.service');
    const exploreKey = visitedPlaceService.buildPlaceKey({
      type: 'attraction',
      source: 'explore-attractions',
      externalId: 'osm-123',
      title: 'Heritage Museum',
      address: 'Main Street',
    });
    const guideKey = visitedPlaceService.buildPlaceKey({
      type: 'attraction',
      source: 'travel-guide',
      externalId: 'osm-123',
      title: 'Heritage Museum',
      address: 'Main Street',
    });

    expect(exploreKey).toBe(guideKey);
  });

  test('groups visited places by calendar date', async () => {
    jest.doMock('../src/modules/visitedPlaces/visitedPlace.repository', () => ({
      findBetweenDates: jest.fn().mockResolvedValue([
        {
          _id: 'place-1',
          title: 'Museum',
          type: 'attraction',
          visits: [
            { _id: 'visit-1', visitedDate: new Date('2026-06-03T10:00:00.000Z'), visitCount: 1 },
            { _id: 'visit-2', visitCount: 2 },
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

    const visitedPlaceService = require('../src/modules/visitedPlaces/visitedPlace.service');
    const days = await visitedPlaceService.getVisitedCalendar('6655f6f2b1f1f1f1f1f1f111', {
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    });

    expect(days).toHaveLength(2);
    expect(days[0].date).toBe('2026-06-03');
    expect(days[0].places).toHaveLength(2);
    expect(days[0].places[1].visitCount).toBe(3);
    expect(days[1].date).toBe('2026-06-04');
  });

  test('adds an undated visit count without requiring a visited date', async () => {
    const addVisitByUserAndPlaceKey = jest.fn().mockResolvedValue({ title: 'Museum', visits: [{ visitCount: 4 }] });
    jest.doMock('../src/modules/visitedPlaces/visitedPlace.repository', () => ({
      addVisitByUserAndPlaceKey,
    }));

    const visitedPlaceService = require('../src/modules/visitedPlaces/visitedPlace.service');
    await visitedPlaceService.markVisitedPlace('6655f6f2b1f1f1f1f1f1f111', {
      type: 'attraction',
      title: 'Museum',
      visitCount: 4,
    });

    expect(addVisitByUserAndPlaceKey.mock.calls[0][3]).toEqual({
      visitCount: 4,
      notes: undefined,
      tripId: undefined,
      itineraryItemId: undefined,
    });
  });
});
