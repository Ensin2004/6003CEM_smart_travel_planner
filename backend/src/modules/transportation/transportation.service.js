const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');
const transportationRepository = require('./transportation.repository');

const CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_LIMIT = 12;
const AIRPORT_QUERY_CONCURRENCY = 4;
const dailyUsage = {
  date: '',
  count: 0,
};
const aiDailyUsage = {
  date: '',
  count: 0,
};

const airlabsClient = axios.create({
  baseURL: 'https://airlabs.co/api/v9',
  timeout: 8000,
});

const transportApiClient = axios.create({
  baseURL: 'https://transportapi.com/v3/uk',
  timeout: 9000,
});

const fallbackFlights = (message = 'Flight information temporarily unavailable') => ({
  available: false,
  message,
  items: [],
  schedules: [],
  liveFlights: [],
});

const fallbackTrains = (message = 'Train information temporarily unavailable') => ({
  available: false,
  message,
  items: [],
  departures: [],
  stationMatches: [],
});

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const consumeDailyQuota = () => {
  const today = getTodayKey();
  const dailyLimit = Math.max(Number(env.airlabsDailyLimit) || 100, 0);

  if (dailyUsage.date !== today) {
    dailyUsage.date = today;
    dailyUsage.count = 0;
  }

  if (dailyUsage.count >= dailyLimit) {
    return false;
  }

  dailyUsage.count += 1;
  return true;
};

const consumeGeminiQuota = () => {
  const today = getTodayKey();
  const dailyLimit = Math.max(Number(env.geminiDailyLimit) || 100, 0);

  if (aiDailyUsage.date !== today) {
    aiDailyUsage.date = today;
    aiDailyUsage.count = 0;
  }

  if (aiDailyUsage.count >= dailyLimit) {
    return false;
  }

  aiDailyUsage.count += 1;
  return true;
};

const recordAirlabsFailure = (endpoint, message, statusCode, metadata) =>
  env.nodeEnv === 'test'
    ? Promise.resolve()
    : apiLogService
        .recordEvent({
          service: 'airlabs',
          category: 'api',
          severity: statusCode === 429 ? 'warning' : 'error',
          endpoint,
          status: 'fail',
          statusCode,
          message,
          metadata,
        })
        .catch((error) => logger.error(`Failed to record AirLabs API event: ${error.message}`));

const recordTransportApiFailure = (endpoint, message, statusCode, metadata) =>
  env.nodeEnv === 'test'
    ? Promise.resolve()
    : apiLogService
        .recordEvent({
          service: 'transportapi',
          category: 'api',
          severity: statusCode === 429 ? 'warning' : 'error',
          endpoint,
          status: 'fail',
          statusCode,
          message,
          metadata,
        })
        .catch((error) => logger.error(`Failed to record TransportAPI event: ${error.message}`));

const classifyAirlabsError = (error) => {
  if (error.isMissingKey) {
    return { message: 'Flight service is not configured yet.', statusCode: 502 };
  }

  if (error.isDailyLimit) {
    return { message: 'Daily flight API limit reached. Please try again tomorrow.', statusCode: 429 };
  }

  if (error.response?.status === 401 || error.response?.status === 403) {
    return { message: 'Flight service configuration error', statusCode: 502 };
  }

  if (error.response?.status === 429) {
    return { message: 'Flight API rate limit reached', statusCode: 429 };
  }

  if (error.code === 'ECONNABORTED') {
    return { message: 'Flight service timeout', statusCode: 503 };
  }

  if (!error.response) {
    return { message: 'Flight service network error', statusCode: 503 };
  }

  return { message: 'Flight information temporarily unavailable', statusCode: error.response.status || 503 };
};

const classifyGeminiError = (error) => {
  if (error.isDailyLimit) {
    return { message: 'Daily AI price estimate limit reached.', statusCode: 429 };
  }

  if (error.response?.status === 401 || error.response?.status === 403) {
    return { message: 'AI price estimates are temporarily unavailable.', statusCode: 502 };
  }

  if (error.response?.status === 429) {
    return { message: 'AI price estimates are busy right now.', statusCode: 429 };
  }

  if (error.code === 'ECONNABORTED') {
    return { message: 'AI price estimates took too long.', statusCode: 503 };
  }

  return { message: 'AI price estimates are temporarily unavailable.', statusCode: error.response?.status || 503 };
};

const classifyTransportApiError = (error) => {
  if (error.isMissingKey) {
    return { message: 'Train service is not configured yet.', statusCode: 502 };
  }

  if (error.response?.status === 401 || error.response?.status === 403) {
    return { message: 'Train service configuration error', statusCode: 502 };
  }

  if (error.response?.status === 429) {
    return { message: 'Train API rate limit reached', statusCode: 429 };
  }

  if (error.code === 'ECONNABORTED') {
    return { message: 'Train service timeout', statusCode: 503 };
  }

  if (!error.response) {
    return { message: 'Train service network error', statusCode: 503 };
  }

  return { message: 'Train information temporarily unavailable', statusCode: error.response.status || 503 };
};

const normalizeText = (value) => String(value || '').trim();
const normalizeCode = (value) => normalizeText(value).toUpperCase();
const includesText = (value, search) => normalizeText(value).toLowerCase().includes(normalizeText(search).toLowerCase());

const getResponseItems = (response) => {
  const data = response?.data?.response;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') return Object.values(data);
  return [];
};

const getAirlabs = async (endpoint, params, metadata) => {
  if (!env.airlabsApiKey) {
    const error = new Error('Missing AirLabs API key');
    error.isMissingKey = true;
    throw error;
  }

  if (!consumeDailyQuota()) {
    const error = new Error('Daily flight API limit reached. Please try again tomorrow.');
    error.isDailyLimit = true;
    throw error;
  }

  try {
    const response = await airlabsClient.get(endpoint, {
      params: {
        ...params,
        api_key: env.airlabsApiKey,
      },
    });

    if (response.data?.error) {
      throw new Error(response.data.error.message || response.data.error);
    }

    return response;
  } catch (error) {
    const { message, statusCode } = classifyAirlabsError(error);
    recordAirlabsFailure(endpoint.replace('/', ''), message, statusCode, metadata);
    throw error;
  }
};

const getTransportApi = async (endpoint, params, metadata) => {
  if (!env.transportApiAppId || !env.transportApiAppKey) {
    const error = new Error('Missing TransportAPI credentials');
    error.isMissingKey = true;
    throw error;
  }

  try {
    const response = await transportApiClient.get(endpoint, {
      params: {
        ...params,
        app_id: env.transportApiAppId,
        app_key: env.transportApiAppKey,
      },
    });

    if (response.data?.error) {
      throw new Error(response.data.error.message || response.data.error);
    }

    return response;
  } catch (error) {
    const { message, statusCode } = classifyTransportApiError(error);
    recordTransportApiFailure(endpoint, message, statusCode, metadata);
    throw error;
  }
};

const normalizeAirport = (airport = {}) => ({
  name: airport.name || airport.names?.en || 'Airport name unavailable',
  iata: airport.iata_code || '',
  icao: airport.icao_code || '',
  city: airport.city || '',
  cityCode: airport.city_code || '',
  countryCode: airport.country_code || '',
  latitude: airport.lat ?? null,
  longitude: airport.lng ?? null,
  timezone: airport.timezone || '',
  website: airport.website || '',
  isMajor: Boolean(airport.is_major),
  isInternational: Boolean(airport.is_international),
});

const normalizeAirline = (airline = {}) => ({
  name: airline.name || 'Airline name unavailable',
  iata: airline.iata_code || '',
  icao: airline.icao_code || '',
  callsign: airline.callsign || '',
  countryCode: airline.country_code || '',
  website: airline.website || '',
  isScheduled: Boolean(airline.is_scheduled),
  isPassenger: Boolean(airline.is_passenger),
  isInternational: Boolean(airline.is_international),
});

const airportMatchesName = (airport, airportName) =>
  !airportName || includesText(airport.name, airportName) || includesText(airport.city, airportName) || includesText(airport.iata_code, airportName);

const rankAirports = (airports, airportName) =>
  [...airports].sort((first, second) => {
    const firstMajorScore = first.is_major ? 0 : 1;
    const secondMajorScore = second.is_major ? 0 : 1;

    if (firstMajorScore !== secondMajorScore) return firstMajorScore - secondMajorScore;
    if (!airportName) return 0;

    const firstExact = normalizeText(first.name).toLowerCase() === normalizeText(airportName).toLowerCase() ? 0 : 1;
    const secondExact = normalizeText(second.name).toLowerCase() === normalizeText(airportName).toLowerCase() ? 0 : 1;
    return firstExact - secondExact;
  });

const resolveAirport = async ({ countryCode, airportName, role }) => {
  if (!normalizeText(countryCode)) {
    return null;
  }

  const response = await getAirlabs(
    '/airports',
    {
      country_code: normalizeCode(countryCode),
      _fields: 'name,iata_code,icao_code,lat,lng,city,city_code,country_code,timezone,website,is_major,is_international',
    },
    { countryCode, airportName, role }
  );
  const candidates = getResponseItems(response).filter((airport) => airport.iata_code && airportMatchesName(airport, airportName));
  const selectedAirport = rankAirports(candidates, airportName)[0];

  return selectedAirport ? normalizeAirport(selectedAirport) : null;
};

const resolveCountryAirports = async ({ countryCode, airportName, role }) => {
  if (!normalizeText(countryCode)) {
    return [];
  }

  const response = await getAirlabs(
    '/airports',
    {
      country_code: normalizeCode(countryCode),
      _fields: 'name,iata_code,icao_code,lat,lng,city,city_code,country_code,timezone,website,is_major,is_international',
    },
    { countryCode, airportName, role }
  );
  const candidates = getResponseItems(response).filter((airport) => airport.iata_code && airportMatchesName(airport, airportName));

  return rankAirports(candidates, airportName).map(normalizeAirport);
};

const resolveAirportByCode = async ({ iata, icao }) => {
  const normalizedIata = normalizeCode(iata);
  const normalizedIcao = normalizeCode(icao);

  if (!normalizedIata && !normalizedIcao) {
    return null;
  }

  const response = await getAirlabs(
    '/airports',
    {
      ...(normalizedIata ? { iata_code: normalizedIata } : { icao_code: normalizedIcao }),
      _fields: 'name,iata_code,icao_code,lat,lng,city,city_code,country_code,timezone,website,is_major,is_international',
    },
    { iata: normalizedIata, icao: normalizedIcao }
  );
  const airports = getResponseItems(response);
  const airport =
    airports.find((item) => normalizeCode(item.iata_code) === normalizedIata || normalizeCode(item.icao_code) === normalizedIcao) ||
    airports[0];

  return airport ? normalizeAirport(airport) : null;
};

const resolveAirline = async (airlineName) => {
  const normalizedAirlineName = normalizeText(airlineName);

  if (!normalizedAirlineName) {
    return null;
  }

  const response = await getAirlabs(
    '/airlines',
    {
      name: normalizedAirlineName,
      _fields: 'name,iata_code,icao_code,callsign,country_code,website,is_scheduled,is_passenger,is_international',
    },
    { airlineName: normalizedAirlineName }
  );
  const candidates = getResponseItems(response).filter((airline) => includesText(airline.name, normalizedAirlineName) && airline.iata_code);
  const selectedAirline = candidates[0] || getResponseItems(response).find((airline) => airline.iata_code);

  return selectedAirline ? normalizeAirline(selectedAirline) : null;
};

const getFlightTimeDate = (value) => normalizeText(value).slice(0, 10);

const matchesDepartureDate = (schedule, departureDate) => {
  if (!departureDate) return true;

  const localDate = getFlightTimeDate(schedule.dep_time);
  const utcDate = getFlightTimeDate(schedule.dep_time_utc);

  return localDate === departureDate || utcDate === departureDate;
};

const addAirportToLookup = (lookup, airport) => {
  if (!airport) return;
  if (airport.iata) lookup.set(normalizeCode(airport.iata), airport);
  if (airport.icao) lookup.set(normalizeCode(airport.icao), airport);
};

const getAirportFromLookup = ({ lookup, iata, icao, fallbackName }) =>
  (lookup || new Map()).get(normalizeCode(iata)) ||
  (lookup || new Map()).get(normalizeCode(icao)) || {
    name: fallbackName,
    iata: normalizeCode(iata),
    icao: normalizeCode(icao),
    city: '',
    countryCode: '',
  };

const isLandedFlight = (flight = {}) => normalizeText(flight.status).toLowerCase() === 'landed';

const hasAirportCode = (airport) => Boolean(airport?.iata);

const rowKey = (row = {}) =>
  [
    row.flight_iata || row.flight_icao || row.flight_number || '',
    row.airline_iata || row.airline_icao || '',
    row.dep_iata || row.dep_icao || '',
    row.arr_iata || row.arr_icao || '',
    row.dep_time || row.dep_time_utc || row.updated || '',
  ].join(':');

const uniqueRows = (rows) => [...new Map(rows.map((row) => [rowKey(row), row])).values()];

const sortSchedulesByDepartureTime = (schedules) =>
  [...schedules].sort((first, second) => normalizeText(first.dep_time).localeCompare(normalizeText(second.dep_time)));

const runLimited = async (items, limit, task) => {
  const results = [];

  for (let index = 0; index < items.length; index += limit) {
    const batch = items.slice(index, index + limit);
    const batchResults = await Promise.all(batch.map(task));
    results.push(...batchResults);
  }

  return results;
};

const buildFlightQueryParams = ({ departureAirport, arrivalAirport, airline }) => {
  const queryParams = {
    limit: DEFAULT_LIMIT,
  };

  if (departureAirport?.iata) {
    queryParams.dep_iata = departureAirport.iata;
  }

  if (arrivalAirport?.iata) {
    queryParams.arr_iata = arrivalAirport.iata;
  }

  if (airline?.iata) {
    queryParams.airline_iata = airline.iata;
  }

  return queryParams;
};

const airportMatchesFilter = ({ airportCode, airports }) => {
  if (!airports.length) return true;

  const normalizedAirportCode = normalizeCode(airportCode);
  return airports.some((airport) => normalizeCode(airport.iata) === normalizedAirportCode);
};

const getAirportSearchPairs = ({ departureAirports, arrivalAirports, airline }) => {
  const departures = departureAirports.filter(hasAirportCode);
  const arrivals = arrivalAirports.filter(hasAirportCode);

  if (departures.length && arrivals.length) {
    const useDepartures = departures.length <= arrivals.length;
    return useDepartures
      ? departures.map((departureAirport) => ({ departureAirport, arrivalAirport: null, filterArrivals: arrivals }))
      : arrivals.map((arrivalAirport) => ({ departureAirport: null, arrivalAirport, filterDepartures: departures }));
  }

  if (departures.length) {
    return departures.map((departureAirport) => ({ departureAirport, arrivalAirport: null }));
  }

  if (arrivals.length) {
    return arrivals.map((arrivalAirport) => ({ departureAirport: null, arrivalAirport }));
  }

  return airline?.iata ? [{ departureAirport: null, arrivalAirport: null }] : [];
};

const fetchFlightRowsForSearch = async ({ departureAirports, arrivalAirports, airline, departureDate, metadata }) => {
  const searchPairs = getAirportSearchPairs({ departureAirports, arrivalAirports, airline });

  if (!searchPairs.length) {
    return { schedules: [], liveFlights: [] };
  }

  const responses = await runLimited(searchPairs, AIRPORT_QUERY_CONCURRENCY, async (pair) => {
    const queryParams = buildFlightQueryParams({
      departureAirport: pair.departureAirport,
      arrivalAirport: pair.arrivalAirport,
      airline,
    });

    const scheduleResponse = await getAirlabs('/schedules', queryParams, metadata);
    const liveFlightResponse = departureDate
      ? null
      : await getAirlabs(
          '/flights',
          {
            ...queryParams,
            _fields: 'flag,flight_number,flight_icao,flight_iata,dep_icao,dep_iata,arr_icao,arr_iata,airline_icao,airline_iata,status,lat,lng,alt,dir,speed,updated',
            limit: DEFAULT_LIMIT,
          },
          metadata
        );

    return {
      schedules: getResponseItems(scheduleResponse).filter(
        (schedule) =>
          airportMatchesFilter({ airportCode: schedule.dep_iata, airports: pair.filterDepartures || [] }) &&
          airportMatchesFilter({ airportCode: schedule.arr_iata, airports: pair.filterArrivals || [] })
      ),
      liveFlights: getResponseItems(liveFlightResponse).filter(
        (flight) =>
          airportMatchesFilter({ airportCode: flight.dep_iata, airports: pair.filterDepartures || [] }) &&
          airportMatchesFilter({ airportCode: flight.arr_iata, airports: pair.filterArrivals || [] })
      ),
    };
  });

  return {
    schedules: sortSchedulesByDepartureTime(uniqueRows(responses.flatMap((response) => response.schedules))),
    liveFlights: uniqueRows(responses.flatMap((response) => response.liveFlights)),
  };
};

const buildAirportLookup = async ({ schedules, liveFlights, departureAirport, arrivalAirport, departureAirports = [], arrivalAirports = [] }) => {
  const lookup = new Map();
  addAirportToLookup(lookup, departureAirport);
  addAirportToLookup(lookup, arrivalAirport);
  departureAirports.forEach((airport) => addAirportToLookup(lookup, airport));
  arrivalAirports.forEach((airport) => addAirportToLookup(lookup, airport));

  const codePairLookup = new Map();
  [...schedules, ...liveFlights]
    .flatMap((flight) => [
      { iata: flight.dep_iata, icao: flight.dep_icao },
      { iata: flight.arr_iata, icao: flight.arr_icao },
    ])
    .forEach((codes) => {
      const iata = normalizeCode(codes.iata);
      const icao = normalizeCode(codes.icao);
      const key = iata || icao;

      if ((iata || icao) && !lookup.has(iata) && !lookup.has(icao) && !codePairLookup.has(key)) {
        codePairLookup.set(key, { iata, icao });
      }
    });

  const airports = await Promise.all(
    [...codePairLookup.values()].map((codes) =>
      resolveAirportByCode(codes).catch((error) => {
        logger.error(`Failed to hydrate airport details: ${error.message}`);
        return null;
      })
    )
  );
  airports.forEach((airport) => addAirportToLookup(lookup, airport));

  return lookup;
};

const normalizeLiveFlight = (flight = {}, context = {}) => ({
  id: flight.hex || flight.flight_iata || flight.flight_icao || `${flight.airline_iata || 'flight'}-${flight.flight_number || ''}`,
  type: 'live',
  flag: flight.flag || '',
  flightNumber: flight.flight_number || '',
  flightIata: flight.flight_iata || '',
  flightIcao: flight.flight_icao || '',
  status: flight.status || 'unknown',
  airline: context.airline || {
    name: flight.airline_iata || flight.airline_icao || 'Airline name unavailable',
    iata: flight.airline_iata || '',
    icao: flight.airline_icao || '',
  },
  departure: {
    airport: getAirportFromLookup({
      lookup: context.airportLookup,
      iata: flight.dep_iata,
      icao: flight.dep_icao,
      fallbackName: 'Departure airport unavailable',
    }),
  },
  arrival: {
    airport: getAirportFromLookup({
      lookup: context.airportLookup,
      iata: flight.arr_iata,
      icao: flight.arr_icao,
      fallbackName: 'Arrival airport unavailable',
    }),
  },
  live: {
    latitude: flight.lat ?? null,
    longitude: flight.lng ?? null,
    altitude: flight.alt ?? null,
    direction: flight.dir ?? null,
    speed: flight.speed ?? null,
  },
  lastUpdated: flight.updated ? new Date(Number(flight.updated) * 1000).toISOString() : new Date().toISOString(),
});

const normalizeSchedule = (schedule = {}, context = {}) => ({
  id: schedule.flight_iata || schedule.flight_icao || `${schedule.airline_iata || 'schedule'}-${schedule.flight_number || ''}`,
  type: 'schedule',
  flightNumber: schedule.flight_number || '',
  flightIata: schedule.flight_iata || '',
  flightIcao: schedule.flight_icao || '',
  codeshare: {
    airlineIata: schedule.cs_airline_iata || '',
    flightNumber: schedule.cs_flight_number || '',
    flightIata: schedule.cs_flight_iata || '',
  },
  status: schedule.status || 'scheduled',
  airline: context.airline || {
    name: schedule.airline_iata || schedule.airline_icao || 'Airline name unavailable',
    iata: schedule.airline_iata || '',
    icao: schedule.airline_icao || '',
  },
  departure: {
    airport: getAirportFromLookup({
      lookup: context.airportLookup,
      iata: schedule.dep_iata,
      icao: schedule.dep_icao,
      fallbackName: 'Departure airport unavailable',
    }),
    terminal: schedule.dep_terminal || '',
    gate: schedule.dep_gate || '',
    scheduledTime: schedule.dep_time || '',
    estimatedTime: schedule.dep_estimated || '',
    actualTime: schedule.dep_actual || '',
    utcTime: schedule.dep_time_utc || '',
    delayMinutes: schedule.dep_delayed ?? schedule.delayed ?? null,
  },
  arrival: {
    airport: getAirportFromLookup({
      lookup: context.airportLookup,
      iata: schedule.arr_iata,
      icao: schedule.arr_icao,
      fallbackName: 'Arrival airport unavailable',
    }),
    terminal: schedule.arr_terminal || '',
    gate: schedule.arr_gate || '',
    baggage: schedule.arr_baggage || '',
    scheduledTime: schedule.arr_time || '',
    estimatedTime: schedule.arr_estimated || '',
    actualTime: schedule.arr_actual || '',
    utcTime: schedule.arr_time_utc || '',
    delayMinutes: schedule.arr_delayed ?? schedule.delayed ?? null,
  },
  durationMinutes: schedule.duration ?? null,
});

const sanitizeFlightForPricePrompt = (flight = {}) => ({
  id: flight.id,
  airline: flight.airline?.name || '',
  status: flight.status || '',
  departureCity: flight.departure?.airport?.city || '',
  departureCountryCode: flight.departure?.airport?.countryCode || '',
  arrivalCity: flight.arrival?.airport?.city || '',
  arrivalCountryCode: flight.arrival?.airport?.countryCode || '',
  departureTime: flight.departure?.scheduledTime || '',
  arrivalTime: flight.arrival?.scheduledTime || '',
  durationMinutes: flight.durationMinutes || null,
  type: flight.type || '',
});

const parseAiJson = (response) => {
  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('AI price service returned an empty response');
  }

  return JSON.parse(text);
};

const buildPricePrompt = ({ flights, query }) => `
Estimate one-way ticket prices for the supplied flight search results.
Use broad public-market knowledge and route distance assumptions. Return estimates only, not live fares.
Currency must be MYR. Keep estimates realistic and conservative.

Search context:
${JSON.stringify(query, null, 2)}

Flights:
${JSON.stringify(flights.map(sanitizeFlightForPricePrompt), null, 2)}

Return JSON with:
{
  "prices": [
    {
      "id": "matching flight id",
      "currency": "MYR",
      "min": number,
      "max": number,
      "confidence": "low" | "medium" | "high",
      "note": "short reason"
    }
  ]
}
`;

const estimateFallbackPriceRange = (flight = {}) => {
  const durationMinutes = Number(flight.durationMinutes);
  const estimatedDistance = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes * 12 : 900;
  const baseFare = 95;
  const distanceFare = estimatedDistance * 0.28;
  const airlineFactor = flight.airline?.isInternational ? 1.2 : 1;
  const min = Math.max(Math.round((baseFare + distanceFare) * airlineFactor), 120);
  const max = Math.round(min * 1.55 + 80);

  return {
    min,
    max,
  };
};

const attachFallbackPriceEstimates = (flights, note = 'AI price estimation is not configured.') =>
  flights.map((flight) => ({
    ...flight,
    priceEstimate: (() => {
      const price = estimateFallbackPriceRange(flight);

      return {
        available: true,
        isFallback: true,
        currency: 'MYR',
        min: price.min,
        max: price.max,
        display: `MYR ${price.min.toLocaleString('en-US')} - ${price.max.toLocaleString('en-US')}`,
        confidence: 'low',
        note,
      };
    })(),
  }));

const attachGeminiPriceEstimates = async ({ flights, query }) => {
  if (!flights.length) {
    return flights;
  }

  if (!env.geminiApiKey) {
    return attachFallbackPriceEstimates(flights);
  }

  if (!consumeGeminiQuota()) {
    const error = new Error('Daily AI price estimate limit reached.');
    error.isDailyLimit = true;
    throw error;
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`,
    {
      contents: [
        {
          parts: [{ text: buildPricePrompt({ flights: flights.slice(0, DEFAULT_LIMIT), query }) }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 900,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            prices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  currency: { type: 'string' },
                  min: { type: 'number' },
                  max: { type: 'number' },
                  confidence: { type: 'string' },
                  note: { type: 'string' },
                },
                required: ['id', 'currency', 'min', 'max', 'confidence', 'note'],
              },
            },
          },
          required: ['prices'],
        },
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.geminiApiKey,
      },
      timeout: 20000,
    }
  );
  const parsed = parseAiJson(response);
  const priceById = new Map(
    (parsed.prices || []).map((price) => [
      normalizeText(price.id),
      {
        available: true,
        currency: normalizeCode(price.currency || 'MYR') || 'MYR',
        min: Math.max(Number(price.min) || 0, 0),
        max: Math.max(Number(price.max) || Number(price.min) || 0, 0),
        confidence: normalizeText(price.confidence) || 'low',
        note: normalizeText(price.note).slice(0, 140),
      },
    ])
  );

  return flights.map((flight) => {
    const price = priceById.get(normalizeText(flight.id));

    if (!price) {
      return {
        ...flight,
        priceEstimate: attachFallbackPriceEstimates(
          [flight],
          'AI did not return a matching estimate, so this is a route-based estimate.'
        )[0].priceEstimate,
      };
    }

    return {
      ...flight,
      priceEstimate: {
        ...price,
        display: `${price.currency} ${Math.round(price.min).toLocaleString('en-US')} - ${Math.round(price.max).toLocaleString('en-US')}`,
      },
    };
  });
};

const addPriceEstimates = async ({ flights, query }) => {
  try {
    return await attachGeminiPriceEstimates({ flights, query });
  } catch (error) {
    const { message, statusCode } = classifyGeminiError(error);
    recordAirlabsFailure('flight-price-estimate', message, statusCode, {
      fromCountryCode: query.fromCountryCode,
      toCountryCode: query.toCountryCode,
      airlineName: query.airlineName,
    });
    return attachFallbackPriceEstimates(flights, message);
  }
};

const getFlightsBySearch = async ({
  airlineName,
  fromCountryCode,
  fromCountryName,
  toCountryCode,
  toCountryName,
  departureDate,
}) => {
  const normalizedDepartureDate = normalizeText(departureDate);
  const cacheKey = [
    'flights',
    normalizeText(airlineName).toLowerCase(),
    normalizeCode(fromCountryCode),
    normalizeCode(toCountryCode),
    normalizedDepartureDate,
  ].join(':');

  const cached = await transportationRepository.findValidCache(cacheKey).catch(() => null);
  if (cached?.data) {
    return { ...cached.data, cached: true };
  }

  try {
    const [departureAirports, arrivalAirports, airline] = await Promise.all([
      resolveCountryAirports({ countryCode: fromCountryCode, role: 'departure' }),
      resolveCountryAirports({ countryCode: toCountryCode, role: 'arrival' }),
      resolveAirline(airlineName),
    ]);
    const departureAirport = departureAirports[0] || null;
    const arrivalAirport = arrivalAirports[0] || null;

    if (fromCountryCode && !departureAirports.length) {
      return fallbackFlights(`No departure airport found for ${fromCountryName || fromCountryCode}.`);
    }

    if (toCountryCode && !arrivalAirports.length) {
      return fallbackFlights(`No arrival airport found for ${toCountryName || toCountryCode}.`);
    }

    if (!departureAirports.length && !arrivalAirports.length && !airline?.iata) {
      return fallbackFlights('No matching airline or airport filters were found.');
    }

    const flightRows = await fetchFlightRowsForSearch({
      departureAirports,
      arrivalAirports,
      airline,
      departureDate: normalizedDepartureDate,
      metadata: { fromCountryCode, toCountryCode, airlineName },
    });
    const rawSchedules = flightRows.schedules
      .filter((schedule) => matchesDepartureDate(schedule, normalizedDepartureDate))
      .filter((schedule) => !isLandedFlight(schedule))
      .slice(0, DEFAULT_LIMIT);
    const rawLiveFlights = flightRows.liveFlights.filter((flight) => !isLandedFlight(flight)).slice(0, DEFAULT_LIMIT);
    const airportLookup = await buildAirportLookup({
      schedules: rawSchedules,
      liveFlights: rawLiveFlights,
      departureAirport,
      arrivalAirport,
      departureAirports,
      arrivalAirports,
    });
    const context = {
      airline,
      airportLookup,
    };
    const schedules = rawSchedules.map((schedule) => normalizeSchedule(schedule, context));
    const liveFlights = rawLiveFlights.map((flight) => normalizeLiveFlight(flight, context));
    const query = {
      airlineName: airline?.name || normalizeText(airlineName),
      fromCountryName,
      fromCountryCode: normalizeCode(fromCountryCode),
      toCountryName,
      toCountryCode: normalizeCode(toCountryCode),
      departureDate: normalizedDepartureDate,
      departureAirport,
      arrivalAirport,
      departureAirports,
      arrivalAirports,
    };
    const items = await addPriceEstimates({
      flights: [...schedules, ...liveFlights].slice(0, DEFAULT_LIMIT),
      query,
    });
    const data = {
      available: items.length > 0,
      message:
        items.length > 0
          ? 'Flight results loaded.'
          : 'No matching flights found for this route.',
      source: 'AirLabs Flights and Schedules APIs',
      query,
      items,
      schedules,
      liveFlights,
      lastUpdated: new Date().toISOString(),
    };

    transportationRepository.upsertCache(cacheKey, data, new Date(Date.now() + CACHE_TTL_MS)).catch((error) => {
      logger.error(`Failed to cache flight search: ${error.message}`);
    });

    return data;
  } catch (error) {
    const { message, statusCode } = classifyAirlabsError(error);
    recordAirlabsFailure('flight-search', message, statusCode, { fromCountryCode, toCountryCode, airlineName });
    return fallbackFlights(message);
  }
};

const getTimeValue = (section = {}, key) => section?.[key]?.time || section?.[key] || '';
const getDateValue = (section = {}, key) => section?.[key]?.date || '';

const getNestedText = (...values) => values.map(normalizeText).find(Boolean) || '';

const getStationDate = (value, fallbackDate = '') => normalizeText(value).slice(0, 10) || normalizeText(fallbackDate);

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
};

const normalizeTrainStationPlace = (place = {}) => ({
  name: normalizeText(place.name),
  stationCode: normalizeCode(place.station_code || place.crs_code || place.code),
  tiplocCode: normalizeText(place.tiploc_code),
  type: normalizeText(place.type),
  description: normalizeText(place.description),
  latitude: place.latitude ?? null,
  longitude: place.longitude ?? null,
});

const isLikelyCrsCode = (value) => /^[a-z]{3}$/i.test(normalizeText(value));

const resolveTrainStation = async (stationQuery) => {
  const normalizedQuery = normalizeText(stationQuery);

  if (isLikelyCrsCode(normalizedQuery)) {
    return {
      stationCode: normalizeCode(normalizedQuery),
      stationName: '',
      stationMatches: [],
    };
  }

  const response = await getTransportApi(
    '/places.json',
    {
      query: normalizedQuery,
      type: 'train_station',
    },
    { stationQuery: normalizedQuery }
  );
  const stationMatches = (response.data?.member || [])
    .map(normalizeTrainStationPlace)
    .filter((place) => place.stationCode);
  const selectedStation = stationMatches[0];

  if (!selectedStation) {
    return {
      stationCode: '',
      stationName: '',
      stationMatches: [],
    };
  }

  return {
    stationCode: selectedStation.stationCode,
    stationName: selectedStation.name,
    stationMatches,
  };
};

const extractActualJourneyRid = (train = {}) => {
  const actualJourneyId =
    train.actual_journey?.id ||
    train.actualJourney?.id ||
    train.actual_journeys?.id ||
    train.performance?.id ||
    train.service?.id ||
    '';
  const ridFromUrl = normalizeText(actualJourneyId).match(/actual_journeys\/([^/.?]+)/)?.[1];
  return normalizeText(train.rid || train.service_rid || train.actual_rid || ridFromUrl);
};

const extractServiceTimetableMeta = (train = {}) => {
  const serviceTimetableId = normalizeText(train.service_timetable?.id || train.serviceTimetableId);
  const matched = serviceTimetableId.match(/\/service\/([^/]+)\/([^/]+)\/timetable\.json/i);

  return {
    serviceTimetableId,
    serviceIdentifier: normalizeText(train.serviceIdentifier || train.service_identifier || (matched ? decodeURIComponent(matched[1]) : '')),
    trainUid: normalizeText(train.trainUid || train.train_uid || (matched?.[1] || '').replace(/^train_uid:/i, '')),
    serviceDate: normalizeText(train.serviceDate || train.date || matched?.[2] || ''),
  };
};

const normalizeStationDeparture = (departure = {}, index = 0, context = {}) => {
  const serviceMeta = extractServiceTimetableMeta(departure);
  const actualRid = extractActualJourneyRid(departure);
  const fallbackDate = context.date || serviceMeta.serviceDate;
  const departureDate = getStationDate(
    departure.expected_departure_date || departure.aimed_departure_date || departure.date,
    fallbackDate
  );
  const arrivalDate = getStationDate(
    departure.expected_arrival_date || departure.aimed_arrival_date || departure.date,
    fallbackDate
  );
  const estimateMinutes = Number(departure.best_arrival_estimate_mins || departure.best_departure_estimate_mins || departure.duration || 0);
  const segmentDistanceKm = Math.max(Math.round((Number.isFinite(estimateMinutes) && estimateMinutes > 0 ? estimateMinutes : 45) * 1.15), 18);
  const segmentDistanceMiles = Math.round(segmentDistanceKm * 0.621371);
  const estimatedPriceMin = Math.max(Math.round(segmentDistanceKm * 1.05), 28);
  const estimatedPriceMax = Math.max(Math.round(segmentDistanceKm * 1.9 + 18), estimatedPriceMin + 12);

  return {
    id: [
      departure.service,
      departure.train_uid,
      departure.aimed_departure_time || departure.aimed_arrival_time,
      departure.destination_name,
      index,
    ]
      .filter(Boolean)
      .join(':'),
    mode: departure.mode || 'train',
    service: normalizeText(departure.service),
    trainUid: serviceMeta.trainUid || normalizeText(departure.train_uid),
    serviceIdentifier: serviceMeta.serviceIdentifier || (departure.train_uid ? `train_uid:${departure.train_uid}` : ''),
    serviceDate: serviceMeta.serviceDate,
    actualRid,
    platform: normalizeText(departure.platform),
    operator: normalizeText(departure.operator),
    operatorName: normalizeText(departure.operator_name),
    status: normalizeText(departure.status || departure.category || 'scheduled'),
    originName: normalizeText(departure.origin_name),
    destinationName: normalizeText(departure.destination_name),
    aimedDepartureTime: normalizeText(departure.aimed_departure_time),
    aimedArrivalTime: normalizeText(departure.aimed_arrival_time),
    departureDate,
    arrivalDate,
    expectedDepartureTime: normalizeText(departure.expected_departure_time),
    expectedArrivalTime: normalizeText(departure.expected_arrival_time),
    expectedDepartureDate: getStationDate(departure.expected_departure_date, departureDate),
    expectedArrivalDate: getStationDate(departure.expected_arrival_date, arrivalDate),
    bestDepartureEstimateMinutes: departure.best_departure_estimate_mins ?? null,
    bestArrivalEstimateMinutes: departure.best_arrival_estimate_mins ?? null,
    distanceEstimate: {
      available: true,
      isFallback: true,
      kilometers: segmentDistanceKm,
      miles: segmentDistanceMiles,
      display: `${segmentDistanceMiles.toLocaleString('en-US')} mi`,
      confidence: 'low',
      note: 'Estimated from timetable timing for the station result.',
    },
    priceEstimate: {
      available: true,
      isFallback: true,
      currency: 'MYR',
      min: estimatedPriceMin,
      max: estimatedPriceMax,
      display: `MYR ${estimatedPriceMin.toLocaleString('en-US')} - ${estimatedPriceMax.toLocaleString('en-US')}`,
      confidence: 'low',
      note: 'Estimated from distance and UK rail fare assumptions.',
    },
    serviceTimetableId: serviceMeta.serviceTimetableId,
  };
};

const normalizeCoach = (coach = {}, index = 0) => ({
  id: normalizeText(coach.id || coach.coach_id || coach.number || coach.coach_number || index + 1),
  number: normalizeText(coach.number || coach.coach_number || coach.coach),
  class: normalizeText(coach.class || coach.travel_class || coach.accommodation_class || coach.seating_class),
  status: normalizeText(coach.status),
  loading: normalizeText(coach.loading || coach.loading_status),
});

const normalizeServiceStop = (stop = {}, index = 0, context = {}) => {
  const fallbackDate = context.date || '';
  const departureDate = getStationDate(stop.expected_departure_date || stop.aimed_departure_date || stop.date, fallbackDate);
  const arrivalDate = getStationDate(stop.expected_arrival_date || stop.aimed_arrival_date || stop.date, fallbackDate);

  return {
    id: [stop.station_code, stop.station_name, stop.aimed_departure_time || stop.aimed_arrival_time || stop.aimed_pass_time, index]
      .filter(Boolean)
      .join(':'),
    stationName: normalizeText(stop.station_name),
    stationCode: normalizeText(stop.station_code),
    platform: normalizeText(stop.platform),
    stopType: normalizeText(stop.stop_type),
    aimedArrivalTime: normalizeText(stop.aimed_arrival_time),
    aimedDepartureTime: normalizeText(stop.aimed_departure_time),
    aimedPassTime: normalizeText(stop.aimed_pass_time),
    arrivalDate,
    departureDate,
    expectedArrivalTime: normalizeText(stop.expected_arrival_time),
    expectedDepartureTime: normalizeText(stop.expected_departure_time),
    expectedArrivalDate: getStationDate(stop.expected_arrival_date, arrivalDate),
    expectedDepartureDate: getStationDate(stop.expected_departure_date, departureDate),
    actualArrivalTime: normalizeText(stop.actual_arrival_time),
    actualDepartureTime: normalizeText(stop.actual_departure_time),
    actualArrivalDate: getStationDate(stop.actual_arrival_date, arrivalDate),
    actualDepartureDate: getStationDate(stop.actual_departure_date, departureDate),
    status: normalizeText(stop.status),
    cancelled: Boolean(stop.cancelled || stop.is_cancelled),
    cancellationCode: getNestedText(stop.cancellation_code, stop.cancellation?.code, stop.cancellation_reason_code),
    cancellationReason: getNestedText(stop.cancellation_reason, stop.cancellation?.reason),
    coaches: asArray(stop.coaches || stop.formation || stop.train_formation).map(normalizeCoach),
  };
};

const normalizeActualJourneyStop = (journey = {}, index = 0) => {
  const station = journey.station || {};

  return {
    id: [station.crs || journey.station_code, station.name || journey.station_name, index].filter(Boolean).join(':'),
    stationName: normalizeText(station.name || journey.station_name),
    stationCode: normalizeText(station.crs || journey.station_code),
    platform: normalizeText(journey.platform),
    stopType: normalizeText(journey.stop_type),
    cancelled: Boolean(journey.cancelled),
    aimedArrivalTime: normalizeText(getTimeValue(journey.aimed, 'arrival')),
    aimedDepartureTime: normalizeText(getTimeValue(journey.aimed, 'departure')),
    actualArrivalTime: normalizeText(getTimeValue(journey.actual, 'arrival')),
    actualDepartureTime: normalizeText(getTimeValue(journey.actual, 'departure')),
    expectedArrivalTime: normalizeText(getTimeValue(journey.expected, 'arrival')),
    expectedDepartureTime: normalizeText(getTimeValue(journey.expected, 'departure')),
    aimedArrivalDate: normalizeText(getDateValue(journey.aimed, 'arrival')),
    aimedDepartureDate: normalizeText(getDateValue(journey.aimed, 'departure')),
    arrivalDate: normalizeText(getDateValue(journey.expected, 'arrival') || getDateValue(journey.aimed, 'arrival')),
    departureDate: normalizeText(getDateValue(journey.expected, 'departure') || getDateValue(journey.aimed, 'departure')),
    cancellationCode: getNestedText(journey.cancellation_code, journey.cancellation?.code, journey.cancelled_reason_code),
    cancellationReason: getNestedText(journey.cancellation_reason, journey.cancellation?.reason),
    coaches: asArray(journey.coaches || journey.formation || journey.train_formation).map(normalizeCoach),
  };
};

const normalizeActualJourney = (data = {}) => {
  const service = data.service || data.member?.[0]?.service || data;
  const stops = service.stops || data.stops || data.actual || [];

  return {
    available: Array.isArray(stops) && stops.length > 0,
    rid: normalizeText(service.rid || data.rid),
    trainUid: normalizeText(service.train_uid || data.train_uid),
    headcode: normalizeText(service.headcode || data.headcode),
    retailServiceIdentifier: normalizeText(service.retail_service_identifier || data.retail_service_identifier),
    tocCode: normalizeText(service.toc?.atoc_code || data.toc?.atoc_code),
    operatorName: normalizeText(service.toc?.name || service.operator_name),
    originName: normalizeText(service.origin_name),
    destinationName: normalizeText(service.destination_name),
    date: normalizeText(service.date || data.date),
    cancelled: Boolean(service.cancellation?.cancelled || data.cancellation?.cancelled),
    cancellationCode: getNestedText(service.cancellation?.code, data.cancellation?.code, service.cancellation_code),
    cancellationReason: getNestedText(service.cancellation?.reason, data.cancellation?.reason, service.cancellation_reason),
    runningLateCode: getNestedText(service.running_late?.code, data.running_late?.code),
    runningLateReason: normalizeText(service.running_late?.reason),
    coaches: asArray(service.coaches || service.formation || service.train_formation || data.coaches || data.formation).map(normalizeCoach),
    scheduleUpdates: asArray(service.schedule_updates || data.schedule_updates).map((update) => ({
      id: normalizeText(update.id),
    })),
    stops: Array.isArray(stops) ? stops.map(normalizeActualJourneyStop) : [],
  };
};

const buildTrainDistancePrompt = ({ service, stops }) => `
Estimate the rail route distance for this UK train service.
Use general rail geography knowledge. Return an estimate, not live measured data.

Service:
${JSON.stringify(
  {
    operatorName: service.operatorName,
    originName: service.originName,
    destinationName: service.destinationName,
    date: service.date,
    trainUid: service.trainUid,
  },
  null,
  2
)}

Stops:
${JSON.stringify(
  stops.map((stop) => ({
    stationName: stop.stationName,
    stationCode: stop.stationCode,
  })),
  null,
  2
)}

Return JSON with:
{
  "distance": {
    "kilometers": number,
    "miles": number,
    "confidence": "low" | "medium" | "high",
    "note": "short reason"
  }
}
`;

const getFallbackTrainDistanceEstimate = (stops = []) => {
  const segmentCount = Math.max(stops.length - 1, 1);
  const kilometers = Math.round(segmentCount * 18);
  const miles = Math.round(kilometers * 0.621371);

  return {
    available: true,
    isFallback: true,
    kilometers,
    miles,
    display: `${miles.toLocaleString('en-US')} mi`,
    confidence: 'low',
    note: 'Estimated from the number of calling-point segments.',
  };
};

const estimateTrainDistance = async ({ service, stops }) => {
  if (!stops.length) {
    return {
      available: false,
      display: 'Distance unavailable',
    };
  }

  if (!env.geminiApiKey) {
    return getFallbackTrainDistanceEstimate(stops);
  }

  try {
    if (!consumeGeminiQuota()) {
      const error = new Error('Daily AI distance estimate limit reached.');
      error.isDailyLimit = true;
      throw error;
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`,
      {
        contents: [
          {
            parts: [{ text: buildTrainDistancePrompt({ service, stops }) }],
          },
        ],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 240,
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              distance: {
                type: 'object',
                properties: {
                  kilometers: { type: 'number' },
                  miles: { type: 'number' },
                  confidence: { type: 'string' },
                  note: { type: 'string' },
                },
                required: ['kilometers', 'miles', 'confidence', 'note'],
              },
            },
            required: ['distance'],
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.geminiApiKey,
        },
        timeout: 16000,
      }
    );
    const parsed = parseAiJson(response);
    const distance = parsed.distance || {};
    const kilometers = Math.max(Math.round(Number(distance.kilometers) || 0), 0);
    const miles = Math.max(Math.round(Number(distance.miles) || kilometers * 0.621371), 0);

    if (!kilometers && !miles) {
      return getFallbackTrainDistanceEstimate(stops);
    }

    return {
      available: true,
      kilometers,
      miles,
      display: `${miles.toLocaleString('en-US')} mi`,
      confidence: normalizeText(distance.confidence) || 'low',
      note: normalizeText(distance.note).slice(0, 140),
    };
  } catch (error) {
    const { message, statusCode } = classifyGeminiError(error);
    recordAirlabsFailure('train-distance-estimate', message, statusCode, {
      originName: service.originName,
      destinationName: service.destinationName,
      trainUid: service.trainUid,
    });
    return getFallbackTrainDistanceEstimate(stops);
  }
};

const filterTrainDeparturesByDate = (departures, { departureDate, arrivalDate }) =>
  departures.filter((departure) => {
    const matchesDepartureDate =
      !departureDate || departure.departureDate === departureDate || departure.expectedDepartureDate === departureDate;
    const matchesArrivalDate = !arrivalDate || departure.arrivalDate === arrivalDate || departure.expectedArrivalDate === arrivalDate;

    return matchesDepartureDate && matchesArrivalDate;
  });

const getStationTimetableEndpoint = ({ stationCode, departureDate }) =>
  departureDate
    ? `/train/station/${encodeURIComponent(stationCode)}/${encodeURIComponent(departureDate)}/00:00/timetable.json`
    : `/train/station_timetables/${encodeURIComponent(stationCode)}.json`;

const getTrainStationTimetable = async ({ stationCode, stationQuery, departureDate, arrivalDate }) => {
  const normalizedStationQuery = normalizeText(stationQuery || stationCode);
  const normalizedDepartureDate = normalizeText(departureDate);
  const normalizedArrivalDate = normalizeText(arrivalDate);

  try {
    const resolvedStation = await resolveTrainStation(normalizedStationQuery);
    const normalizedStationCode = resolvedStation.stationCode;

    if (!normalizedStationCode) {
      return fallbackTrains(`No train station found for ${normalizedStationQuery}.`);
    }

    const cacheKey = ['train-station-timetable', normalizedStationCode, normalizedDepartureDate, normalizedArrivalDate].join(':');
    const cached = await transportationRepository.findValidCache(cacheKey).catch(() => null);

    if (cached?.data) {
      return { ...cached.data, cached: true };
    }

    const response = await getTransportApi(
      getStationTimetableEndpoint({ stationCode: normalizedStationCode, departureDate: normalizedDepartureDate }),
      {
        train_status: 'passenger',
      },
      { stationQuery: normalizedStationQuery, stationCode: normalizedStationCode, departureDate, arrivalDate }
    );
    const data = response.data || {};
    const allDepartures = (data.departures?.all || []).map((departure, index) =>
      normalizeStationDeparture(departure, index, { date: data.date || normalizedDepartureDate })
    );
    const departures = filterTrainDeparturesByDate(allDepartures, {
      departureDate: normalizedDepartureDate,
      arrivalDate: normalizedArrivalDate,
    });
    const result = {
      available: departures.length > 0,
      message: departures.length > 0 ? 'Train station timetable loaded.' : 'No trains found for this station.',
      source: 'TransportAPI TAPI Rail Information station timetable',
      query: {
        stationQuery: normalizedStationQuery,
        stationCode: normalizedStationCode,
        departureDate: normalizedDepartureDate,
        arrivalDate: normalizedArrivalDate,
      },
      stationName: normalizeText(data.station_name || resolvedStation.stationName),
      stationCode: normalizeText(data.station_code || normalizedStationCode),
      stationMatches: resolvedStation.stationMatches,
      date: normalizeText(data.date),
      timeOfDay: normalizeText(data.time_of_day),
      departures,
      items: departures,
      lastUpdated: new Date().toISOString(),
    };

    transportationRepository.upsertCache(cacheKey, result, new Date(Date.now() + CACHE_TTL_MS)).catch((error) => {
      logger.error(`Failed to cache train station timetable: ${error.message}`);
    });

    return result;
  } catch (error) {
    const { message, statusCode } = classifyTransportApiError(error);
    recordTransportApiFailure('train-station-timetable', message, statusCode, {
      stationQuery: normalizedStationQuery,
      departureDate,
      arrivalDate,
    });
    return fallbackTrains(message);
  }
};

const getTrainActualJourney = async ({ actualRid }) => {
  const normalizedRid = normalizeText(actualRid);

  if (!normalizedRid) {
    return null;
  }

  const response = await getTransportApi(
    `/train/actual_journeys/${encodeURIComponent(normalizedRid)}.json`,
    {
      expected: true,
    },
    { actualRid: normalizedRid }
  );

  return normalizeActualJourney(response.data || {});
};

const getTrainServiceTimetable = async ({ serviceIdentifier, trainUid, serviceDate, actualRid }) => {
  const normalizedServiceIdentifier = normalizeText(serviceIdentifier || (trainUid ? `train_uid:${trainUid}` : ''));
  const normalizedServiceDate = normalizeText(serviceDate);

  if (!normalizedServiceIdentifier || !normalizedServiceDate) {
    return {
      available: false,
      message: 'Select a train from the station timetable first.',
      stops: [],
    };
  }

  const cacheKey = ['train-service-timetable', normalizedServiceIdentifier, normalizedServiceDate, normalizeText(actualRid)].join(':');
  const cached = await transportationRepository.findValidCache(cacheKey).catch(() => null);

  if (cached?.data) {
    return { ...cached.data, cached: true };
  }

  try {
    const [serviceResponse, performance] = await Promise.all([
      getTransportApi(
        `/train/service/${encodeURIComponent(normalizedServiceIdentifier)}/${encodeURIComponent(normalizedServiceDate)}/timetable.json`,
        {},
        { serviceIdentifier: normalizedServiceIdentifier, serviceDate: normalizedServiceDate }
      ),
      getTrainActualJourney({ actualRid }).catch((error) => {
        logger.error(`Failed to load train actual journey: ${error.message}`);
        return null;
      }),
    ]);
    const data = serviceResponse.data || {};
    const stops = (data.stops || []).map((stop, index) => normalizeServiceStop(stop, index, { date: data.date || normalizedServiceDate }));
    const performanceStops = performance?.stops || [];
    const visibleStops = performanceStops.length ? performanceStops : stops;
    const serviceSummary = {
      trainUid: normalizeText(data.train_uid || performance?.trainUid || normalizedServiceIdentifier.replace(/^train_uid:/i, '')),
      operatorName: normalizeText(data.operator_name || performance?.operatorName),
      originName: normalizeText(data.origin_name || performance?.originName),
      destinationName: normalizeText(data.destination_name || performance?.destinationName),
      date: normalizeText(data.date || performance?.date || normalizedServiceDate),
    };
    const distanceEstimate = await estimateTrainDistance({
      service: serviceSummary,
      stops: visibleStops,
    });
    const result = {
      available: visibleStops.length > 0,
      message: visibleStops.length > 0 ? 'Train service timetable loaded.' : 'No calling points found for this train.',
      source: 'TransportAPI TAPI Rail Information service timetable',
      performanceSource: performance ? 'TransportAPI TAPI Rail Performance actual_journeys' : '',
      query: {
        serviceIdentifier: normalizedServiceIdentifier,
        serviceDate: normalizedServiceDate,
        actualRid: normalizeText(actualRid),
      },
      ...serviceSummary,
      tocCode: normalizeText(performance?.tocCode),
      headcode: normalizeText(performance?.headcode),
      retailServiceIdentifier: normalizeText(performance?.retailServiceIdentifier),
      cancellationCode: getNestedText(data.cancellation?.code, data.cancellation_code, performance?.cancellationCode),
      cancellationReason: getNestedText(data.cancellation?.reason, data.cancellation_reason, performance?.cancellationReason),
      cancelled: Boolean(data.cancellation?.cancelled || performance?.cancelled),
      runningLateCode: normalizeText(performance?.runningLateCode),
      runningLateReason: normalizeText(performance?.runningLateReason),
      coaches: [
        ...asArray(data.coaches || data.formation || data.train_formation).map(normalizeCoach),
        ...(performance?.coaches || []),
      ],
      distanceEstimate,
      stops: stops.length ? stops : visibleStops,
      performance,
      lastUpdated: new Date().toISOString(),
    };

    transportationRepository.upsertCache(cacheKey, result, new Date(Date.now() + CACHE_TTL_MS)).catch((error) => {
      logger.error(`Failed to cache train service timetable: ${error.message}`);
    });

    return result;
  } catch (error) {
    const { message, statusCode } = classifyTransportApiError(error);
    recordTransportApiFailure('train-service-timetable', message, statusCode, {
      serviceIdentifier: normalizedServiceIdentifier,
      serviceDate: normalizedServiceDate,
      actualRid,
    });
    return {
      available: false,
      message,
      stops: [],
      performance: null,
    };
  }
};

module.exports = { getFlightsBySearch, getTrainStationTimetable, getTrainServiceTimetable };
