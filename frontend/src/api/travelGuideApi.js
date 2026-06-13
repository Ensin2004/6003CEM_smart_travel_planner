/**
 * Travel Guide Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';
export const getTravelGuideDestinations = (params) =>
  axiosClient.get('/travel-guide/destinations', { params });
export const getTravelGuideDestinationDetails = (params) =>
  axiosClient.get('/travel-guide/destination', { params });
export const getTravelGuideCountries = (params) =>
  axiosClient.get('/travel-guide/countries', { params });
