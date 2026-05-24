import axiosClient from './axiosClient';

export const getTravelGuideDestinations = (params) =>
  axiosClient.get('/travel-guide/destinations', { params });

export const getTravelGuideDestinationDetails = (params) =>
  axiosClient.get('/travel-guide/destination', { params });
