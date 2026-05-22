describe('Restaurant service fallback', () => {
  test('returns friendly fallback when SerpApi key is not configured', async () => {
    const restaurantService = require('../src/modules/explore/restaurant.service');
    const restaurants = await restaurantService.getRestaurantsByDestination({ country: 'Malaysia', state: 'Penang' });

    expect(restaurants.available).toBe(false);
    expect(restaurants.message).toContain('SerpApi key');
    expect(restaurants.items).toEqual([]);
  });
});

describe('Restaurant service search', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('supports food category searches and does not trim results', async () => {
    jest.resetModules();

    const rawRestaurants = Array.from({ length: 15 }, (_, index) => ({
      place_id: `restaurant-${index}`,
      title: `Restaurant ${index}`,
      type: 'Restaurant',
      rating: 4,
      reviews: 100 + index,
      address: `Address ${index}`,
    }));
    const get = jest.fn().mockResolvedValue({
      data: {
        local_results: rawRestaurants,
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

    const service = require('../src/modules/explore/restaurant.service');
    const restaurants = await service.getRestaurantsByDestination({
      country: 'Malaysia',
      state: 'Penang',
      foodCategory: 'seafood',
      start: 20,
    });

    expect(get).toHaveBeenCalledWith('/search', {
      params: expect.objectContaining({
        q: 'seafood restaurants in Penang, Malaysia',
        start: 20,
      }),
    });
    expect(restaurants.available).toBe(true);
    expect(restaurants.items).toHaveLength(15);
    expect(restaurants.nextStart).toBe(35);
  });
});
