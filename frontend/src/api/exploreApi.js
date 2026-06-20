/**
 * Explore Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

// Searches weather data for a destination using optional coordinates and location label
export const searchWeather = ({ destination, date, latitude, longitude, locationLabel }) =>
  axiosClient.get('/explore/weather', {
    params: {
      destination,
      date,
      latitude,
      longitude,
      locationLabel,
    },
  });

// Searches for attractions with flexible filters (string destination or object parameters)
export const searchAttractions = (filters) => {
  const params = typeof filters === 'string' ? { destination: filters } : filters;

  return axiosClient.get('/explore/attractions', {
    params: {
      destination: params?.destination,
      country: params?.country,
      state: params?.state,
      attractionCategory: params?.attractionCategory,
      latitude: params?.latitude,
      longitude: params?.longitude,
      locationLabel: params?.locationLabel,
      start: params?.start,
    },
  });
};

// Retrieves detailed information about a specific attraction by name, address, or identifiers
export const getAttractionDetails = ({ name, address, dataId, placeId }) =>
  axiosClient.get('/explore/attractions/detail', {
    params: {
      name,
      address,
      dataId,
      placeId,
    },
  });

// Searches for hotels based on destination, location, room type, and pagination start
export const searchHotels = ({ destination, country, state, roomType, latitude, longitude, locationLabel, start }) =>
  axiosClient.get('/explore/hotels', {
    params: {
      destination,
      country,
      state,
      roomType,
      latitude,
      longitude,
      locationLabel,
      start,
    },
  });

// Searches for restaurants with destination, location, food category, and pagination options
export const searchRestaurants = ({ destination, country, state, foodCategory, latitude, longitude, locationLabel, start }) =>
  axiosClient.get('/explore/restaurants', {
    params: {
      destination,
      country,
      state,
      foodCategory,
      latitude,
      longitude,
      locationLabel,
      start,
    },
  });

// Fetches detailed information about a specific restaurant by name, address, or identifiers
export const getRestaurantDetails = ({ name, address, dataId, placeId }) =>
  axiosClient.get('/explore/restaurants/detail', {
    params: {
      name,
      address,
      dataId,
      placeId,
    },
  });

// Searches for flights based on airline and route details with departure date
export const searchFlight = ({
  airlineName,
  fromCountryCode,
  fromCountryName,
  toCountryCode,
  toCountryName,
  departureDate,
}) =>
  axiosClient.get('/transportation/flights', {
    params: {
      airlineName,
      fromCountryCode,
      fromCountryName,
      toCountryCode,
      toCountryName,
      departureDate,
    },
  });

// Retrieves detailed information about a specific hotel by name, address, or identifiers
export const getHotelDetails = ({ name, address, dataId, placeId }) =>
  axiosClient.get('/explore/hotels/detail', {
    params: {
      name,
      address,
      dataId,
      placeId,
    },
  });

// Retrieves reviews for a place using dataId or placeId with optional allPages flag
export const getPlaceReviews = ({ dataId, placeId, allPages = true }) =>
  axiosClient.get('/explore/reviews', {
    params: {
      dataId,
      placeId,
      allPages,
    },
  });

// Searches train station timetables by station code, query, date, and operator name
export const searchTrainStationTimetable = ({ stationCode, stationQuery, departureDate, arrivalDate, operatorName }) =>
  axiosClient.get('/transportation/trains/station_timetable', {
    params: {
      stationCode,
      stationQuery,
      departureDate,
      arrivalDate,
      operatorName,
    },
  });

// Searches train service timetables by service identifier, train UID, date, and RID
export const searchTrainServiceTimetable = ({ serviceIdentifier, trainUid, serviceDate, actualRid }) =>
  axiosClient.get('/transportation/trains/service_timetable', {
    params: {
      serviceIdentifier,
      trainUid,
      serviceDate,
      actualRid,
    },
  });

// Requests AI-powered recommendations based on view type, destination, date, weather, and items
export const getAiRecommendations = ({ view, destination, date, weather, items }) =>
  axiosClient.post('/explore/ai-recommendations', {
    view,
    destination,
    date,
    weather,
    items,
  });
  
