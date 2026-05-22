import axiosClient from './axiosClient';

export const searchWeather = (destination) =>
  axiosClient.get('/explore/weather', { params: { destination } });

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
