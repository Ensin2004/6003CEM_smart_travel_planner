/**
 * Visited place API module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

// Retrieves the complete list of places marked as visited by the current user
export const getVisitedPlaces = () => axiosClient.get('/visited-places');

// Fetches visited places data formatted for calendar display with optional parameters
export const getVisitedCalendar = (params = {}) =>
  axiosClient.get('/visited-places/calendar', { params });

// Triggers an enrichment process to add or update images for visited places
export const enrichVisitedPlaceImages = () =>
  axiosClient.post('/visited-places/enrich-images');

// Marks a place as visited by submitting the place data
export const markVisitedPlace = (payload) => axiosClient.post('/visited-places', payload);

// Removes a visited place record by its identifier
export const deleteVisitedPlace = (id) => axiosClient.delete(`/visited-places/${id}`);
