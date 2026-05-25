describe('Weather service fallback', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('returns friendly fallback when Open-Meteo cannot find the destination', async () => {
    jest.resetModules();

    jest.doMock('axios', () => ({
      get: jest.fn().mockResolvedValue({ data: { results: [] } }),
    }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      openMeteoDailyLimit: 500,
    }));
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    const weatherService = require('../src/modules/explore/weather.service');
    const weather = await weatherService.getWeatherByDestination('Unknown place', '2026-06-01');

    expect(weather.available).toBe(false);
    expect(weather.message).toContain('could not be found');
  });
});

describe('Weather service Open-Meteo normalization', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('parses useful forecast fields without returning the raw provider response', async () => {
    jest.resetModules();

    const get = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              name: 'Tokyo',
              country: 'Japan',
              country_code: 'JP',
              admin1: 'Tokyo',
              latitude: 35.6895,
              longitude: 139.6917,
              timezone: 'Asia/Tokyo',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          latitude: 35.69,
          longitude: 139.69,
          generationtime_ms: 1.2,
          daily: {
            time: ['2026-06-01'],
            weather_code: [61],
            temperature_2m_max: [27.2],
            temperature_2m_min: [21.4],
            temperature_2m_mean: [24.1],
            apparent_temperature_mean: [25.3],
            precipitation_sum: [4.5],
            precipitation_probability_max: [65],
            wind_speed_10m_max: [18],
          },
        },
      });

    jest.doMock('axios', () => ({ get }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      openMeteoDailyLimit: 500,
    }));
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    const weatherService = require('../src/modules/explore/weather.service');
    const weather = await weatherService.getWeatherByDestination('Tokyo', '2026-06-01');

    expect(weather.available).toBe(true);
    expect(weather.source).toBe('Open-Meteo Forecast');
    expect(weather.condition).toBe('Light rain');
    expect(weather.temperature).toEqual({
      min: 21.4,
      max: 27.2,
      mean: 24.1,
      unit: 'C',
    });
    expect(weather.precipitation).toEqual({
      amountMm: 4.5,
      probability: 65,
    });
    expect(weather).not.toHaveProperty('daily');
    expect(weather).not.toHaveProperty('generationtime_ms');
  });

  test('uses supplied coordinates when a place name is not geocodable', async () => {
    jest.resetModules();

    const get = jest.fn().mockResolvedValue({
      data: {
        daily: {
          time: ['2026-06-01'],
          weather_code: [0],
          temperature_2m_max: [30],
          temperature_2m_min: [22],
          temperature_2m_mean: [26],
          precipitation_sum: [0],
          precipitation_probability_max: [5],
          wind_speed_10m_max: [12],
        },
      },
    });

    jest.doMock('axios', () => ({ get }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      openMeteoDailyLimit: 500,
    }));
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    const weatherService = require('../src/modules/explore/weather.service');
    const weather = await weatherService.getWeatherByDestination('KLCC Aquaria', '2026-06-01', {
      latitude: 3.1537,
      longitude: 101.7133,
      locationLabel: 'KLCC Aquaria',
    });

    expect(get).toHaveBeenCalledTimes(1);
    expect(weather.available).toBe(true);
    expect(weather.location.label).toBe('KLCC Aquaria');
    expect(weather.condition).toBe('Clear');
  });
});
