/**
 * Travel Guide country-directory service behavior.
 */
describe('Travel guide country directory', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('normalizes countries returned by REST Countries', async () => {
    const get = jest.fn().mockResolvedValue({
      data: {
        data: {
          objects: [{
            codes: { alpha_2: 'JP' },
            names: { common: 'Japan' },
            flag: { url_png: 'https://example.com/japan.png' },
            continents: ['Asia'],
            subregion: 'Eastern Asia',
            coordinates: { lat: 36, lng: 138 },
            currencies: [{ code: 'JPY', name: 'Japanese yen' }],
          }],
          meta: { more: false },
        },
      },
    });
    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get })),
      get: jest.fn(),
    }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'test',
      restCountriesApiKey: 'test-rest-countries-key',
    }));

    const service = require('../src/modules/travelGuide/travelGuide.service');
    const result = await service.getCountryList({ search: 'japan' });

    expect(result.available).toBe(true);
    expect(result.source).toBe('REST Countries');
    expect(get).toHaveBeenCalledWith('/countries/v5', expect.objectContaining({
      headers: { Authorization: 'Bearer test-rest-countries-key' },
    }));
    expect(result.items).toEqual([
      expect.objectContaining({
        name: 'Japan',
        countryCode: 'JP',
        continent: 'Asia',
        currency: 'JPY',
      }),
    ]);
  });

  test('uses the local country catalogue when REST Countries cannot be reached', async () => {
    const get = jest.fn().mockRejectedValue(Object.assign(new Error('network unavailable'), { code: 'EACCES' }));
    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get })),
      get: jest.fn(),
    }));

    const service = require('../src/modules/travelGuide/travelGuide.service');
    const result = await service.getCountryList({
      currentCountryCode: 'MY',
      region: 'Asia',
      search: 'japan',
    });

    expect(result.available).toBe(true);
    expect(result.source).toBe('Local country catalogue');
    expect(result.items).toEqual([
      expect.objectContaining({
        name: 'Japan',
        countryCode: 'JP',
        continent: 'Asia',
        currency: 'JPY',
      }),
    ]);
  });
});

describe('Travel guide destination pagination', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('passes the requested page offset to the attractions provider', async () => {
    const getAttractionsByDestination = jest.fn().mockResolvedValue({
      available: true,
      items: [{ id: 'page-two-place', name: 'Page two place' }],
      hasMore: true,
      message: '',
    });
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      serpApiKey: 'test-serp-api-key',
    }));
    jest.doMock('../src/modules/explore/places.service', () => ({
      getAttractionsByDestination,
    }));

    const service = require('../src/modules/travelGuide/travelGuide.service');
    const result = await service.getDestinationList({
      country: 'Malaysia',
      countryCode: 'MY',
      limit: 20,
      page: 3,
    });

    expect(getAttractionsByDestination).toHaveBeenCalledWith({
      destination: 'popular tourist destinations in Malaysia',
      start: 40,
    });
    expect(result.pagination).toEqual(expect.objectContaining({
      page: 3,
      limit: 20,
      hasMore: true,
    }));
    expect(result.items[0]).toEqual(expect.objectContaining({
      id: 'page-two-place',
      name: 'Page two place',
    }));
  });
});
