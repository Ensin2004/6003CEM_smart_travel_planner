import axiosClient from './axiosClient';

export const searchWeather = (destination) =>
  axiosClient.get('/explore/weather', { params: { destination } });

export const searchAttractions = (destination) =>
  axiosClient.get('/explore/attractions', { params: { destination } });
