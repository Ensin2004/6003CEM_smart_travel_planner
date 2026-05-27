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

const fallbackFlights = (message = 'Flight information temporarily unavailable') => ({
  available: false,
  message,
  items: [],
  schedules: [],
  liveFlights: [],
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

module.exports = { getFlightsBySearch };
