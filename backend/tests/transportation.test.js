/**
 * Transportation module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Import HTTP testing utilities and the application instance
const request = require('supertest');
const app = require('../src/app');

// Test group covers authentication requirements for transportation endpoints.
describe('Transportation routes', () => {
  // Scenario verifies that unauthenticated requests to flight lookup endpoint are rejected.
  test('requires authentication for flight lookup', async () => {
    // Send GET request to flights endpoint without authentication header
    const response = await request(app)
      .get('/api/v1/transportation/flights')
      .query({
        fromCountryCode: 'US',
        fromCountryName: 'United States',
        toCountryCode: 'US',
        toCountryName: 'United States',
        departureDate: '2026-06-01',
      });

    // Verify unauthorized status code is returned
    expect(response.statusCode).toBe(401);
    // Verify response status indicates operation failure
    expect(response.body.status).toBe('fail');
  });
});

// Test group covers flight search functionality using AirLabs API.
describe('Transportation flight service', () => {
  // Cleanup resets shared state after assertions - clears module cache and mocks.
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  // Scenario verifies that AirLabs route search normalizes airport, airline, and flight data.
  test('normalizes AirLabs route search using AirLabs airport and airline data', async () => {
    jest.resetModules();

    // Create mock GET function with sequential responses for different AirLabs endpoints
    const get = jest
      .fn()
      // First call: Search for departure airport (Miami)
      .mockResolvedValueOnce({
        data: {
          response: [
            {
              name: 'Miami International Airport',
              iata_code: 'MIA',
              icao_code: 'KMIA',
              city: 'Miami',
              country_code: 'US',
              is_major: true,
            },
          ],
        },
      })
      // Second call: Search for arrival airport (San Francisco)
      .mockResolvedValueOnce({
        data: {
          response: [
            {
              name: 'San Francisco International Airport',
              iata_code: 'SFO',
              icao_code: 'KSFO',
              city: 'San Francisco',
              country_code: 'US',
              is_major: true,
            },
          ],
        },
      })
      // Third call: Search for airline by name (American Airlines)
      .mockResolvedValueOnce({
        data: {
          response: [
            {
              name: 'American Airlines',
              iata_code: 'AA',
              icao_code: 'AAL',
              country_code: 'US',
              is_scheduled: 1,     // Scheduled airline flag
              is_passenger: 1,      // Passenger airline flag
            },
          ],
        },
      })
      // Fourth call: Search for flight schedules between MIA and SFO
      .mockResolvedValueOnce({
        data: {
          response: [
            {
              airline_iata: 'AA',
              airline_icao: 'AAL',
              flight_number: '2421',
              flight_iata: 'AA2421',
              flight_icao: 'AAL2421',
              dep_iata: 'MIA',
              dep_icao: 'KMIA',
              dep_terminal: 'C',
              dep_gate: 'E4',
              dep_time: '2026-06-01 19:53',
              arr_iata: 'SFO',
              arr_icao: 'KSFO',
              arr_terminal: '1',
              arr_gate: 'B24',
              arr_time: '2026-06-01 22:52',
              duration: 359,        // Duration in minutes (5h 59m)
              status: 'scheduled',
            },
            {
              airline_iata: 'AA',
              airline_icao: 'AAL',
              flight_number: '2422',
              flight_iata: 'AA2422',
              flight_icao: 'AAL2422',
              dep_iata: 'MIA',
              arr_iata: 'SFO',
              dep_time: '2026-06-01 13:00',
              arr_time: '2026-06-01 16:00',
              status: 'landed',     // Already landed - should be filtered out
            },
          ],
        },
      })
      // Fifth call: Get real-time flight status updates
      .mockResolvedValueOnce({
        data: {
          response: [
            {
              flag: 'US',
              flight_number: '2421',
              flight_iata: 'AA2421',
              flight_icao: 'AAL2421',
              dep_iata: 'MIA',
              dep_icao: 'KMIA',
              arr_iata: 'SFO',
              arr_icao: 'KSFO',
              airline_iata: 'AA',
              airline_icao: 'AAL',
              status: 'en-route',   // Real-time status
              updated: 1780320000,   // Unix timestamp
            },
            {
              flag: 'US',
              flight_number: '2422',
              flight_iata: 'AA2422',
              dep_iata: 'MIA',
              arr_iata: 'SFO',
              airline_iata: 'AA',
              status: 'landed',
            },
          ],
        },
      });

    // Mock axios with the GET function
    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get })),
    }));
    // Mock environment with AirLabs API key
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      airlabsApiKey: 'test-key',
      airlabsDailyLimit: 100,
    }));
    // Mock API log service
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));
    // Mock repository to bypass cache
    jest.doMock('../src/modules/transportation/transportation.repository', () => ({
      findValidCache: jest.fn().mockResolvedValue(null),
      upsertCache: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks
    const transportationService = require('../src/modules/transportation/transportation.service');
    const result = await transportationService.getFlightsBySearch({
      airlineName: 'American Airlines',
      fromCountryCode: 'US',
      fromCountryName: 'United States',
      toCountryCode: 'US',
      toCountryName: 'United States',
      departureDate: '2026-06-01',
    });

    // Verify service indicates successful response
    expect(result.available).toBe(true);
    // Verify airline name is correctly normalized
    expect(result.items[0].airline.name).toBe('American Airlines');
    // Verify departure airport details
    expect(result.items[0].departure.airport.name).toBe('Miami International Airport');
    // Verify arrival airport details
    expect(result.items[0].arrival.airport.name).toBe('San Francisco International Airport');
    // Verify landed flights are filtered out (only scheduled/en-route returned)
    expect(result.items.every((item) => item.status !== 'landed')).toBe(true);
    // Verify price estimate is available
    expect(result.items[0].priceEstimate.available).toBe(true);
    // Verify price estimate uses fallback calculation (AI not called)
    expect(result.items[0].priceEstimate.isFallback).toBe(true);
    // Verify price estimate has proper currency format (MYR)
    expect(result.items[0].priceEstimate.display).toMatch(/^MYR [\d,]+ - [\d,]+$/);
    // Verify raw API response is not exposed to client
    expect(result).not.toHaveProperty('response');
  });

  // Scenario verifies that flight schedules are searched across country airports and filtered by date.
  test('searches schedules across country airport IATA codes and filters by dep_time date', async () => {
    jest.resetModules();

    // Create mock GET function with responses for multiple Japanese airports and routes
    const get = jest
      .fn()
      // First call: Get all airports in Japan
      .mockResolvedValueOnce({
        data: {
          response: [
            {
              name: 'Osaka International Airport',
              iata_code: 'ITM',
              icao_code: 'RJOO',
              country_code: 'JP',
            },
            {
              name: 'Kagoshima Airport',
              iata_code: 'KOJ',
              icao_code: 'RJFK',
              country_code: 'JP',
            },
          ],
        },
      })
      // Second call: Get flights departing from ITM (Osaka)
      .mockResolvedValueOnce({
        data: {
          response: [
            {
              airline_iata: 'JL',
              flight_number: '2407',
              flight_iata: 'JL2407',
              dep_iata: 'ITM',
              dep_icao: 'RJOO',
              dep_time: '2026-05-27 14:50',
              arr_iata: 'OKA',      // Naha, Okinawa
              arr_icao: 'ROAH',
              arr_time: '2026-05-27 17:00',
              duration: 130,
              status: 'scheduled',
            },
            {
              airline_iata: 'JL',
              flight_number: '2408',
              flight_iata: 'JL2408',
              dep_iata: 'ITM',
              dep_time: '2026-05-28 14:50',  // Next day - should be filtered out
              arr_iata: 'OKA',
              arr_time: '2026-05-28 17:00',
              status: 'scheduled',
            },
          ],
        },
      })
      // Third call: Get flights departing from KOJ (Kagoshima)
      .mockResolvedValueOnce({
        data: {
          response: [
            {
              airline_iata: 'JL',
              flight_number: '3654',
              flight_iata: 'JL3654',
              dep_iata: 'KOJ',
              dep_icao: 'RJFK',
              dep_time: '2026-05-27 16:35',
              arr_iata: 'FUK',      // Fukuoka
              arr_icao: 'RJFF',
              arr_time: '2026-05-27 17:30',
              duration: 55,
              status: 'scheduled',
            },
          ],
        },
      })
      // Fourth call: Get details for OKA (Naha) airport
      .mockResolvedValueOnce({
        data: {
          response: [
            {
              name: 'Naha Airport',
              iata_code: 'OKA',
              icao_code: 'ROAH',
              country_code: 'JP',
            },
          ],
        },
      })
      // Fifth call: Get details for FUK (Fukuoka) airport
      .mockResolvedValueOnce({
        data: {
          response: [
            {
              name: 'Fukuoka Airport',
              iata_code: 'FUK',
              icao_code: 'RJFF',
              country_code: 'JP',
            },
          ],
        },
      });

    // Mock axios with GET function
    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get })),
    }));
    // Mock environment with AirLabs API key
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      airlabsApiKey: 'test-key',
      airlabsDailyLimit: 100,
    }));
    // Mock API log service and repository
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));
    jest.doMock('../src/modules/transportation/transportation.repository', () => ({
      findValidCache: jest.fn().mockResolvedValue(null),
      upsertCache: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks
    const transportationService = require('../src/modules/transportation/transportation.service');
    const result = await transportationService.getFlightsBySearch({
      fromCountryCode: 'JP',
      fromCountryName: 'Japan',
      departureDate: '2026-05-27',  // Only return flights on this specific date
    });

    // Verify service indicates successful response
    expect(result.available).toBe(true);
    // Verify only flights on the requested date are returned (2 flights)
    expect(result.items).toHaveLength(2);
    // Verify correct flight IATA codes are returned
    expect(result.items.map((item) => item.flightIata)).toEqual(['JL2407', 'JL3654']);
    // Verify all flights depart on the requested date
    expect(result.items.every((item) => item.departure.scheduledTime.startsWith('2026-05-27'))).toBe(true);
    // Verify first flight departs from Osaka
    expect(result.items[0].departure.airport.name).toBe('Osaka International Airport');
    // Verify second flight departs from Kagoshima
    expect(result.items[1].departure.airport.name).toBe('Kagoshima Airport');
  });

  // Scenario verifies that graceful fallback is returned when AirLabs API key is missing.
  test('returns graceful fallback when AirLabs key is missing', async () => {
    jest.resetModules();

    // Mock axios (not actually called due to early exit)
    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get: jest.fn() })),
    }));
    // Mock environment with empty AirLabs API key
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      airlabsApiKey: '',  // Missing API key
      airlabsDailyLimit: 100,
    }));
    // Mock other dependencies
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));
    jest.doMock('../src/modules/transportation/transportation.repository', () => ({
      findValidCache: jest.fn().mockResolvedValue(null),
      upsertCache: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks
    const transportationService = require('../src/modules/transportation/transportation.service');
    const result = await transportationService.getFlightsBySearch({
      fromCountryCode: 'US',
      fromCountryName: 'United States',
      toCountryCode: 'US',
      toCountryName: 'United States',
      departureDate: '2026-06-01',
    });

    // Verify service indicates API is unavailable
    expect(result.available).toBe(false);
    // Verify friendly error message is returned
    expect(result.message).toBe('Flight service is not configured yet.');
  });
});

// Test group covers train timetable functionality with AI distance and price estimates.
describe('Transportation train service', () => {
  // Cleanup resets shared state after assertions
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  // Scenario verifies that AI distance and price estimates are added to station timetable trains.
  test('adds AI distance and price estimates to station timetable trains', async () => {
    jest.resetModules();

    // Mock POST function for Gemini AI API call
    const post = jest.fn().mockResolvedValue({
      data: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    estimates: [
                      {
                        id: '1A23:W12345:09:00:Manchester Piccadilly',
                        kilometers: 296,
                        miles: 184,
                        priceMin: 190,
                        priceMax: 360,
                        confidence: 'medium',
                        note: 'AI rail geography and fare estimate.',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      },
    });

    // Mock GET function for Transport API calls
    const get = jest
      .fn()
      // First call: Get station timetable for London Euston
      .mockResolvedValueOnce({
        data: {
          station_name: 'London Euston',
          station_code: 'EUS',
          date: '2026-06-01',
          departures: {
            all: [
              {
                service: '1A23',           // Train service number
                train_uid: 'W12345',       // Unique train identifier
                operator_name: 'Avanti West Coast',
                origin_name: 'London Euston',
                destination_name: 'Manchester Piccadilly',
                aimed_departure_time: '09:00',
                aimed_arrival_time: '11:10',
                date: '2026-06-01',
                service_timetable: {
                  id: '/train/service/train_uid:W12345/2026-06-01/timetable.json',
                },
              },
            ],
          },
        },
      })
      // Second call: Get detailed service timetable with stops
      .mockResolvedValueOnce({
        data: {
          train_uid: 'W12345',
          operator_name: 'Avanti West Coast',
          origin_name: 'London Euston',
          destination_name: 'Manchester Piccadilly',
          date: '2026-06-01',
          stops: [
            {
              station_name: 'London Euston',
              station_code: 'EUS',
              aimed_departure_time: '09:00',
              date: '2026-06-01',
            },
            {
              station_name: 'Milton Keynes Central',
              station_code: 'MKC',
              aimed_arrival_time: '09:35',
              aimed_departure_time: '09:37',
              date: '2026-06-01',
            },
            {
              station_name: 'Manchester Piccadilly',
              station_code: 'MAN',
              aimed_arrival_time: '11:10',
              date: '2026-06-01',
            },
          ],
        },
      });

    // Mock axios with POST and GET functions
    jest.doMock('axios', () => ({
      post,
      create: jest.fn(() => ({ get })),
    }));
    // Mock environment with Transport API and Gemini AI keys
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'test',
      airlabsDailyLimit: 100,
      transportApiAppId: 'test-app',
      transportApiAppKey: 'test-key',
      geminiApiKey: 'test-gemini-key',
      geminiModel: 'gemini-test',
      geminiDailyLimit: 100,
    }));
    // Mock API log service and repository
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));
    jest.doMock('../src/modules/transportation/transportation.repository', () => ({
      findValidCache: jest.fn().mockResolvedValue(null),
      upsertCache: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks
    const transportationService = require('../src/modules/transportation/transportation.service');
    const result = await transportationService.getTrainStationTimetable({
      stationQuery: 'EUS',           // London Euston station code
      departureDate: '2026-06-01',
    });

    // Verify service indicates successful response
    expect(result.available).toBe(true);
    // Verify distance estimate is available
    expect(result.items[0].distanceEstimate.available).toBe(true);
    // Verify distance estimate uses AI (not fallback)
    expect(result.items[0].distanceEstimate.isFallback).toBe(false);
    // Verify distance display format
    expect(result.items[0].distanceEstimate.display).toBe('296 km');
    // Verify price estimate is available
    expect(result.items[0].priceEstimate.available).toBe(true);
    // Verify price estimate uses AI (not fallback)
    expect(result.items[0].priceEstimate.isFallback).toBe(false);
    // Verify price display format (MYR currency)
    expect(result.items[0].priceEstimate.display).toBe('MYR 190 - 360');
  });
});