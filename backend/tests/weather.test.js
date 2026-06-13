/**
 * Weather module.
 * Assertions cover expected behavior, error handling, and response shape.
 */
// Test group covers  behavior.
describe('Weather service fallback', () => {
  // Cleanup resets shared state after assertions.
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });
  // Scenario verifies one expected outcome or error path.
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
// Test group covers  behavior.
describe('Weather service Open-Meteo normalization', () => {
  // Cleanup resets shared state after assertions.
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });
  // Scenario verifies one expected outcome or error path.
  test('parses useful current forecast fields without returning the raw provider response', async () => {
    jest.resetModules();
    const forecastDate = new Date().toISOString().slice(0, 10);

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
          current_weather: {
            time: `${forecastDate}T13:00`,
            temperature: 24.1,
            weathercode: 61,
            windspeed: 18,
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
    const weather = await weatherService.getWeatherByDestination('Tokyo', forecastDate);

    expect(weather.available).toBe(true);
    expect(weather.source).toBe('Open-Meteo Forecast');
    expect(weather.condition).toBe('Light rain');
    expect(weather.temperature).toEqual({
      min: 24.1,
      max: 24.1,
      mean: 24.1,
      unit: 'C',
    });
    expect(weather.precipitation).toEqual({
      amountMm: null,
      probability: null,
    });
    expect(weather).not.toHaveProperty('daily');
    expect(weather).not.toHaveProperty('generationtime_ms');
  });
  // Scenario verifies one expected outcome or error path.
  test('uses supplied coordinates when a place name is not geocodable', async () => {
    jest.resetModules();
    const forecastDate = new Date().toISOString().slice(0, 10);

    const get = jest.fn().mockResolvedValue({
      data: {
        current_weather: {
          time: `${forecastDate}T12:00`,
          temperature: 26,
          weathercode: 0,
          windspeed: 12,
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
    const weather = await weatherService.getWeatherByDestination('KLCC Aquaria', forecastDate, {
      latitude: 3.1537,
      longitude: 101.7133,
      locationLabel: 'KLCC Aquaria',
    });

    expect(get).toHaveBeenCalledTimes(1);
    expect(weather.available).toBe(true);
    expect(weather.location.label).toBe('KLCC Aquaria');
    expect(weather.condition).toBe('Clear');
  });
  // Scenario verifies near future dates use the Open-Meteo Forecast API daily endpoint.
  test('uses Open-Meteo forecast daily data for future dates within 16 days', async () => {
    jest.resetModules();
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const get = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              name: 'Singapore',
              country: 'Singapore',
              country_code: 'SG',
              admin1: '',
              latitude: 1.3521,
              longitude: 103.8198,
              timezone: 'Asia/Singapore',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          daily: {
            time: [futureDate],
            weather_code: [80],
            temperature_2m_max: [31],
            temperature_2m_min: [25],
            precipitation_sum: [6],
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
    const weather = await weatherService.getWeatherByDestination('Singapore', futureDate);

    expect(get.mock.calls[1][0]).toBe('https://api.open-meteo.com/v1/forecast');
    expect(get.mock.calls[1][1].params.daily).toBe('weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum');
    expect(weather.available).toBe(true);
    expect(weather.forecastType).toBe('forecast');
    expect(weather.precipitation.amountMm).toBe(6);
  });
  // Scenario verifies future dates use the Open-Meteo Seasonal API.
  test('uses Open-Meteo seasonal data for future trip dates', async () => {
    jest.resetModules();
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const get = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              name: 'Singapore',
              country: 'Singapore',
              country_code: 'SG',
              admin1: '',
              latitude: 1.3521,
              longitude: 103.8198,
              timezone: 'Asia/Singapore',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          daily: {
            time: [futureDate],
            weather_code: [3],
            temperature_2m_max: [31],
            temperature_2m_min: [25],
            temperature_2m_mean: [28],
            precipitation_sum: [2],
            wind_speed_10m_max: [14],
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
    const weather = await weatherService.getWeatherByDestination('Singapore', futureDate);

    expect(get.mock.calls[1][0]).toBe('https://seasonal-api.open-meteo.com/v1/seasonal');
    expect(weather.available).toBe(true);
    expect(weather.source).toBe('Open-Meteo Seasonal Forecast');
    expect(weather.forecastType).toBe('seasonal');
  });
  // Scenario verifies one expected outcome or error path.
  test('uses Open-Meteo archive data for past trip dates', async () => {
    jest.resetModules();

    const get = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              name: 'George Town',
              country: 'Malaysia',
              country_code: 'MY',
              admin1: 'Penang',
              latitude: 5.4141,
              longitude: 100.3288,
              timezone: 'Asia/Kuala_Lumpur',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          daily: {
            time: ['2020-01-15'],
            weather_code: [63],
            temperature_2m_max: [31],
            temperature_2m_min: [25],
            temperature_2m_mean: [28],
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
    const weather = await weatherService.getWeatherByDestination('George Town', '2020-01-15');

    expect(get.mock.calls[1][0]).toBe('https://archive-api.open-meteo.com/v1/archive');
    expect(weather.available).toBe(true);
    expect(weather.source).toBe('Open-Meteo Historical Weather');
    expect(weather.condition).toBe('Rain');
    expect(weather.precipitation).toEqual({
      amountMm: 0,
      probability: null,
    });
  });
});
