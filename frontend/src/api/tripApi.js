/**
 * Trip Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';
export const getTrips = () => axiosClient.get('/trips');
// Create Trip builds a new record from validated input.
export const createTrip = (payload) => axiosClient.post('/trips', payload);
export const getTripSummary = (id) => axiosClient.get(`/trips/${id}/summary`);
