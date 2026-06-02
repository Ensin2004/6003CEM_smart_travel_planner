/**
 * Explore Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';
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
export const searchAttractions = (destination) =>
  axiosClient.get('/explore/attractions', { params: { destination } });
export const searchHotels = ({ destination, country, state, roomType, start }) =>
  axiosClient.get('/explore/hotels', {
    params: {
      destination,
      country,
      state,
      roomType,
      start,
    },
  });
export const searchRestaurants = ({ destination, country, state, foodCategory, start }) =>
  axiosClient.get('/explore/restaurants', {
    params: {
      destination,
      country,
      state,
      foodCategory,
      start,
    },
  });
export const getRestaurantDetails = ({ name, address, dataId, placeId }) =>
  axiosClient.get('/explore/restaurants/detail', {
    params: {
      name,
      address,
      dataId,
      placeId,
    },
  });
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
export const getHotelDetails = ({ name, address, dataId, placeId }) =>
  axiosClient.get('/explore/hotels/detail', {
    params: {
      name,
      address,
      dataId,
      placeId,
    },
  });
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
export const searchTrainServiceTimetable = ({ serviceIdentifier, trainUid, serviceDate, actualRid }) =>
  axiosClient.get('/transportation/trains/service_timetable', {
    params: {
      serviceIdentifier,
      trainUid,
      serviceDate,
      actualRid,
    },
  });
export const getAiRecommendations = ({ view, destination, date, weather, items }) =>
  axiosClient.post('/explore/ai-recommendations', {
    view,
    destination,
    date,
    weather,
    items,
  });
