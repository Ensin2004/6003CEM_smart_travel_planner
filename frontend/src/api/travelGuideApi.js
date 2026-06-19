/**
 * Travel Guide Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

// Retrieves a list of travel guide destinations with optional query parameters for filtering
export const getTravelGuideDestinations = (params) =>
  axiosClient.get('/travel-guide/destinations', { params });

// Fetches detailed information about a specific destination using query parameters
export const getTravelGuideDestinationDetails = (params) =>
  axiosClient.get('/travel-guide/destination', { params });

// Retrieves the list of available countries with optional query parameters
export const getTravelGuideCountries = (params) =>
  axiosClient.get('/travel-guide/countries', { params });
