const request = require('supertest');
const app = require('../src/app');

describe('Transportation routes', () => {
  test('requires authentication for flight lookup', async () => {
    const response = await request(app)
      .get('/api/v1/transportation/flights')
      .query({
        fromCountryCode: 'US',
        fromCountryName: 'United States',
        toCountryCode: 'US',
        toCountryName: 'United States',
        departureDate: '2026-06-01',
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.status).toBe('fail');
  });
});

describe('Transportation flight service', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('normalizes AirLabs route search using AirLabs airport and airline data', async () => {
    jest.resetModules();

    const get = jest
      .fn()
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
      .mockResolvedValueOnce({
        data: {
          response: [
            {
              name: 'American Airlines',
              iata_code: 'AA',
              icao_code: 'AAL',
              country_code: 'US',
              is_scheduled: 1,
              is_passenger: 1,
            },
          ],
        },
      })
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
              duration: 359,
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
              status: 'landed',
            },
          ],
        },
      })
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
              status: 'en-route',
              updated: 1780320000,
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

    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get })),
    }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      airlabsApiKey: 'test-key',
      airlabsDailyLimit: 100,
    }));
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));
    jest.doMock('../src/modules/transportation/transportation.repository', () => ({
      findValidCache: jest.fn().mockResolvedValue(null),
      upsertCache: jest.fn().mockResolvedValue({}),
    }));

    const transportationService = require('../src/modules/transportation/transportation.service');
    const result = await transportationService.getFlightsBySearch({
      airlineName: 'American Airlines',
      fromCountryCode: 'US',
      fromCountryName: 'United States',
      toCountryCode: 'US',
      toCountryName: 'United States',
      departureDate: '2026-06-01',
    });

    expect(result.available).toBe(true);
    expect(result.items[0].airline.name).toBe('American Airlines');
    expect(result.items[0].departure.airport.name).toBe('Miami International Airport');
    expect(result.items[0].arrival.airport.name).toBe('San Francisco International Airport');
    expect(result.items.every((item) => item.status !== 'landed')).toBe(true);
    expect(result.items[0].priceEstimate.available).toBe(true);
    expect(result.items[0].priceEstimate.isFallback).toBe(true);
    expect(result.items[0].priceEstimate.display).toMatch(/^MYR [\d,]+ - [\d,]+$/);
    expect(result).not.toHaveProperty('response');
  });

  test('searches schedules across country airport IATA codes and filters by dep_time date', async () => {
    jest.resetModules();

    const get = jest
      .fn()
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
              arr_iata: 'OKA',
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
              dep_time: '2026-05-28 14:50',
              arr_iata: 'OKA',
              arr_time: '2026-05-28 17:00',
              status: 'scheduled',
            },
          ],
        },
      })
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
              arr_iata: 'FUK',
              arr_icao: 'RJFF',
              arr_time: '2026-05-27 17:30',
              duration: 55,
              status: 'scheduled',
            },
          ],
        },
      })
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

    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get })),
    }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      airlabsApiKey: 'test-key',
      airlabsDailyLimit: 100,
    }));
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));
    jest.doMock('../src/modules/transportation/transportation.repository', () => ({
      findValidCache: jest.fn().mockResolvedValue(null),
      upsertCache: jest.fn().mockResolvedValue({}),
    }));

    const transportationService = require('../src/modules/transportation/transportation.service');
    const result = await transportationService.getFlightsBySearch({
      fromCountryCode: 'JP',
      fromCountryName: 'Japan',
      departureDate: '2026-05-27',
    });

    expect(result.available).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.flightIata)).toEqual(['JL2407', 'JL3654']);
    expect(result.items.every((item) => item.departure.scheduledTime.startsWith('2026-05-27'))).toBe(true);
    expect(result.items[0].departure.airport.name).toBe('Osaka International Airport');
    expect(result.items[1].departure.airport.name).toBe('Kagoshima Airport');
  });

  test('returns graceful fallback when AirLabs key is missing', async () => {
    jest.resetModules();

    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get: jest.fn() })),
    }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      airlabsApiKey: '',
      airlabsDailyLimit: 100,
    }));
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));
    jest.doMock('../src/modules/transportation/transportation.repository', () => ({
      findValidCache: jest.fn().mockResolvedValue(null),
      upsertCache: jest.fn().mockResolvedValue({}),
    }));

    const transportationService = require('../src/modules/transportation/transportation.service');
    const result = await transportationService.getFlightsBySearch({
      fromCountryCode: 'US',
      fromCountryName: 'United States',
      toCountryCode: 'US',
      toCountryName: 'United States',
      departureDate: '2026-06-01',
    });

    expect(result.available).toBe(false);
    expect(result.message).toBe('Flight service is not configured yet.');
  });
});

describe('Transportation train service', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('adds route-based fallback distance and price estimates to station timetable trains', async () => {
    jest.resetModules();

    const get = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          station_name: 'London Euston',
          station_code: 'EUS',
          date: '2026-06-01',
          departures: {
            all: [
              {
                service: '1A23',
                train_uid: 'W12345',
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

    jest.doMock('axios', () => ({
      create: jest.fn(() => ({ get })),
    }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'test',
      airlabsDailyLimit: 100,
      transportApiAppId: 'test-app',
      transportApiAppKey: 'test-key',
      geminiApiKey: '',
      geminiDailyLimit: 100,
    }));
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));
    jest.doMock('../src/modules/transportation/transportation.repository', () => ({
      findValidCache: jest.fn().mockResolvedValue(null),
      upsertCache: jest.fn().mockResolvedValue({}),
    }));

    const transportationService = require('../src/modules/transportation/transportation.service');
    const result = await transportationService.getTrainStationTimetable({
      stationQuery: 'EUS',
      departureDate: '2026-06-01',
    });

    expect(result.available).toBe(true);
    expect(result.items[0].distanceEstimate.available).toBe(true);
    expect(result.items[0].distanceEstimate.isFallback).toBe(true);
    expect(result.items[0].distanceEstimate.display).toMatch(/km$/);
    expect(result.items[0].priceEstimate.available).toBe(true);
    expect(result.items[0].priceEstimate.isFallback).toBe(true);
    expect(result.items[0].priceEstimate.display).toMatch(/^MYR [\d,]+ - [\d,]+$/);
  });
});
