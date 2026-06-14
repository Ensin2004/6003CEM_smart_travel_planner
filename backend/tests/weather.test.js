/**
 * Weather module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Test group covers fallback behavior when weather service cannot find a destination.
describe('Weather service fallback', () => {
  // Cleanup resets shared state after assertions - clears module cache and mocks.
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  // Scenario verifies that friendly fallback message is returned when destination cannot be geocoded.
  test('returns friendly fallback when Open-Meteo cannot find the destination', async () => {
    // Reset module cache to ensure fresh mocks for this test
    jest.resetModules();

    // Mock axios GET to return empty results array (no geocoding match)
    jest.doMock('axios', () => ({
      get: jest.fn().mockResolvedValue({ data: { results: [] } }),
    }));
    // Mock environment with Open-Meteo rate limit configuration
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      openMeteoDailyLimit: 500,
    }));
    // Mock API log service to prevent logging during tests
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks are in place
    const weatherService = require('../src/modules/explore/weather.service');
    // Attempt to get weather for unknown place
    const weather = await weatherService.getWeatherByDestination('Unknown place', '2026-06-01');

    // Verify service indicates weather is unavailable
    expect(weather.available).toBe(false);
    // Verify error message indicates destination could not be found
    expect(weather.message).toContain('could not be found');
  });
});

// Test group covers normalization of Open-Meteo weather data responses.
describe('Weather service Open-Meteo normalization', () => {
  // Cleanup resets shared state after assertions
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  // Scenario verifies that current forecast fields are parsed without exposing raw provider response.
  test('parses useful current forecast fields without returning the raw provider response', async () => {
    jest.resetModules();
    // Get today's date in YYYY-MM-DD format for forecast date
    const forecastDate = new Date().toISOString().slice(0, 10);

    // Create mock GET function with sequential responses
    const get = jest
      .fn()
      // First call: Geocode the destination (Tokyo)
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
      // Second call: Get current weather for Tokyo
      .mockResolvedValueOnce({
        data: {
          latitude: 35.69,
          longitude: 139.69,
          generationtime_ms: 1.2,  // Internal metadata - should be filtered out
          current_weather: {
            time: `${forecastDate}T13:00`,
            temperature: 24.1,
            weathercode: 61,        // WMO code for light rain
            windspeed: 18,
          },
        },
      });

    // Mock axios with the GET function
    jest.doMock('axios', () => ({ get }));
    // Mock environment with Open-Meteo configuration
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      openMeteoDailyLimit: 500,
    }));
    // Mock API log service
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks
    const weatherService = require('../src/modules/explore/weather.service');
    const weather = await weatherService.getWeatherByDestination('Tokyo', forecastDate);

    // Verify service indicates weather is available
    expect(weather.available).toBe(true);
    // Verify source is correctly identified
    expect(weather.source).toBe('Open-Meteo Forecast');
    // Verify weather condition is mapped from weathercode 61
    expect(weather.condition).toBe('Light rain');
    // Verify temperature fields are correctly populated
    expect(weather.temperature).toEqual({
      min: 24.1,
      max: 24.1,
      mean: 24.1,
      unit: 'C',
    });
    // Verify precipitation fields (null for current weather as no daily data)
    expect(weather.precipitation).toEqual({
      amountMm: null,
      probability: null,
    });
    // Verify raw provider data is not exposed to client
    expect(weather).not.toHaveProperty('daily');
    expect(weather).not.toHaveProperty('generationtime_ms');
  });

  // Scenario verifies that supplied coordinates are used when place name cannot be geocoded.
  test('uses supplied coordinates when a place name is not geocodable', async () => {
    jest.resetModules();
    const forecastDate = new Date().toISOString().slice(0, 10);

    // Create mock GET function that returns only weather data (no geocoding call needed)
    const get = jest.fn().mockResolvedValue({
      data: {
        current_weather: {
          time: `${forecastDate}T12:00`,
          temperature: 26,
          weathercode: 0,  // Clear sky
          windspeed: 12,
        },
      },
    });

    // Mock axios with the GET function
    jest.doMock('axios', () => ({ get }));
    // Mock environment
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      openMeteoDailyLimit: 500,
    }));
    // Mock API log service
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks
    const weatherService = require('../src/modules/explore/weather.service');
    // Get weather using explicit coordinates (skips geocoding entirely)
    const weather = await weatherService.getWeatherByDestination('KLCC Aquaria', forecastDate, {
      latitude: 3.1537,
      longitude: 101.7133,
      locationLabel: 'KLCC Aquaria',
    });

    // Verify only weather API call was made (no geocoding call)
    expect(get).toHaveBeenCalledTimes(1);
    // Verify service indicates weather is available
    expect(weather.available).toBe(true);
    // Verify location label from supplied coordinates is used
    expect(weather.location.label).toBe('KLCC Aquaria');
    // Verify condition from weathercode 0 is correctly mapped
    expect(weather.condition).toBe('Clear');
  });

  // Scenario verifies that near-future dates use the Open-Meteo Forecast API daily endpoint.
  test('uses Open-Meteo forecast daily data for future dates within 16 days', async () => {
    jest.resetModules();
    // Calculate date 5 days in the future (within 16-day forecast window)
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Create mock GET function with sequential responses
    const get = jest
      .fn()
      // First call: Geocode Singapore
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
      // Second call: Get daily forecast data
      .mockResolvedValueOnce({
        data: {
          daily: {
            time: [futureDate],
            weather_code: [80],           // WMO code for rain showers
            temperature_2m_max: [31],
            temperature_2m_min: [25],
            precipitation_sum: [6],       // 6mm of rain expected
          },
        },
      });

    // Mock axios with GET function
    jest.doMock('axios', () => ({ get }));
    // Mock environment
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      openMeteoDailyLimit: 500,
    }));
    // Mock API log service
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks
    const weatherService = require('../src/modules/explore/weather.service');
    const weather = await weatherService.getWeatherByDestination('Singapore', futureDate);

    // Verify forecast API endpoint was used (not seasonal or archive)
    expect(get.mock.calls[1][0]).toBe('https://api.open-meteo.com/v1/forecast');
    // Verify daily parameters include all needed fields
    expect(get.mock.calls[1][1].params.daily).toBe('weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum');
    // Verify service indicates weather is available
    expect(weather.available).toBe(true);
    // Verify forecast type is identified as forecast (not seasonal)
    expect(weather.forecastType).toBe('forecast');
    // Verify precipitation amount is correctly parsed
    expect(weather.precipitation.amountMm).toBe(6);
  });

  // Scenario verifies that future dates beyond 16 days use the Open-Meteo Seasonal API.
  test('uses Open-Meteo seasonal data for future trip dates', async () => {
    jest.resetModules();
    // Calculate date 30 days in the future (beyond 16-day forecast window)
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Create mock GET function with sequential responses
    const get = jest
      .fn()
      // First call: Geocode Singapore
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
      // Second call: Get seasonal forecast data
      .mockResolvedValueOnce({
        data: {
          daily: {
            time: [futureDate],
            weather_code: [3],            // WMO code for overcast
            temperature_2m_max: [31],
            temperature_2m_min: [25],
            temperature_2m_mean: [28],
            precipitation_sum: [2],
            wind_speed_10m_max: [14],
          },
        },
      });

    // Mock axios with GET function
    jest.doMock('axios', () => ({ get }));
    // Mock environment
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      openMeteoDailyLimit: 500,
    }));
    // Mock API log service
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks
    const weatherService = require('../src/modules/explore/weather.service');
    const weather = await weatherService.getWeatherByDestination('Singapore', futureDate);

    // Verify seasonal API endpoint was used for dates beyond forecast window
    expect(get.mock.calls[1][0]).toBe('https://seasonal-api.open-meteo.com/v1/seasonal');
    // Verify service indicates weather is available
    expect(weather.available).toBe(true);
    // Verify source indicates seasonal forecast
    expect(weather.source).toBe('Open-Meteo Seasonal Forecast');
    // Verify forecast type is correctly identified as seasonal
    expect(weather.forecastType).toBe('seasonal');
  });

  // Scenario verifies that past dates use the Open-Meteo Archive API.
  test('uses Open-Meteo archive data for past trip dates', async () => {
    jest.resetModules();

    // Create mock GET function with sequential responses
    const get = jest
      .fn()
      // First call: Geocode George Town, Penang
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
      // Second call: Get historical archive data for past date
      .mockResolvedValueOnce({
        data: {
          daily: {
            time: ['2020-01-15'],
            weather_code: [63],           // WMO code for rain
            temperature_2m_max: [31],
            temperature_2m_min: [25],
            temperature_2m_mean: [28],
          },
        },
      });

    // Mock axios with GET function
    jest.doMock('axios', () => ({ get }));
    // Mock environment
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      openMeteoDailyLimit: 500,
    }));
    // Mock API log service
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks
    const weatherService = require('../src/modules/explore/weather.service');
    // Get weather for past date (pre-2020)
    const weather = await weatherService.getWeatherByDestination('George Town', '2020-01-15');

    // Verify archive API endpoint was used for historical dates
    expect(get.mock.calls[1][0]).toBe('https://archive-api.open-meteo.com/v1/archive');
    // Verify service indicates weather is available
    expect(weather.available).toBe(true);
    // Verify source indicates historical weather
    expect(weather.source).toBe('Open-Meteo Historical Weather');
    // Verify condition from weathercode 63 is correctly mapped to Rain
    expect(weather.condition).toBe('Rain');
    // Verify precipitation amount is set to 0 (archive data may not include amount)
    expect(weather.precipitation).toEqual({
      amountMm: 0,
      probability: null,
    });
  });
});