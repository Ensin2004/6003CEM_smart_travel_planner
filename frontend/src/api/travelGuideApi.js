import axiosClient from './axiosClient';

export const getTravelGuideDestinations = (params) =>
  axiosClient.get('/travel-guide/destinations', { params });

export const getTravelGuideDestinationDetails = (params) =>
  axiosClient.get('/travel-guide/destination', { params });

export const getTravelGuideCountries = (params) =>
  axiosClient.get('/travel-guide/countries', { params });
