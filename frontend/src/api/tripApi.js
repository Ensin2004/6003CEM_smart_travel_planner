/**
 * Trip Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';
export const getTrips = () => axiosClient.get('/trips');
// Create Trip builds a new record from validated input.
export const createTrip = (payload) => axiosClient.post('/trips', payload);
// Update Trip applies settings changes while keeping HTTP details out of page components.
export const updateTrip = (id, payload) => axiosClient.patch(`/trips/${id}`, payload);
export const getTripSummary = (id) => axiosClient.get(`/trips/${id}/summary`);
