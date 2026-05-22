describe('Hotels service fallback', () => {
  test('returns friendly fallback when SerpApi key is not configured', async () => {
    const hotelsService = require('../src/modules/explore/hotels.service');
    const hotels = await hotelsService.getHotelsByDestination({ country: 'Malaysia', state: 'Penang' });

    expect(hotels.available).toBe(false);
    expect(hotels.message).toContain('SerpApi key');
    expect(hotels.items).toEqual([]);
  });
});

describe('Hotels service search', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('supports filter-only searches and does not trim results to 12', async () => {
    jest.resetModules();

    const rawHotels = Array.from({ length: 15 }, (_, index) => ({
      place_id: `hotel-${index}`,
      title: `Hotel ${index}`,
      type: 'Hotel',
      rating: 4,
      reviews: 100 + index,
      address: `Address ${index}`,
    }));
    const get = jest.fn().mockResolvedValue({
      data: {
        local_results: rawHotels,
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

    const service = require('../src/modules/explore/hotels.service');
    const hotels = await service.getHotelsByDestination({
      country: 'Malaysia',
      state: 'Penang',
      roomType: 'suite',
      start: 20,
    });

    expect(get).toHaveBeenCalledWith('/search', {
      params: expect.objectContaining({
        q: 'suite hotels in Penang, Malaysia',
        start: 20,
      }),
    });
    expect(hotels.available).toBe(true);
    expect(hotels.items).toHaveLength(15);
    expect(hotels.nextStart).toBe(35);
  });
});
