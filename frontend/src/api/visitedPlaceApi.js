/**
 * Visited place API module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

export const getVisitedPlaces = () => axiosClient.get('/visited-places');

export const getVisitedCalendar = (params = {}) =>
  axiosClient.get('/visited-places/calendar', { params });

export const enrichVisitedPlaceImages = () =>
  axiosClient.post('/visited-places/enrich-images');

export const markVisitedPlace = (payload) => axiosClient.post('/visited-places', payload);

export const deleteVisitedPlace = (id) => axiosClient.delete(`/visited-places/${id}`);
