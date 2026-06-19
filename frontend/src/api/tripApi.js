/**
 * Trip Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

// Retrieves all trips belonging to the current user
export const getTrips = () => axiosClient.get('/trips');

// Create Trip builds a new record from validated input.
export const createTrip = (payload) => axiosClient.post('/trips', payload);

// Update Trip applies settings changes while keeping HTTP details out of page components.
export const updateTrip = (id, payload) => axiosClient.patch(`/trips/${id}`, payload);

// Sends a deletion request to remove a trip by its identifier
export const deleteTrip = (id) => axiosClient.delete(`/trips/${id}`);

// Retrieves a summarized overview of a specific trip by its identifier
export const getTripSummary = (id) => axiosClient.get(`/trips/${id}/summary`);
