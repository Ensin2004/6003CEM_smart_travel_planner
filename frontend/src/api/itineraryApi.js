/**
 * Itinerary Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';
export const getTripItinerary = (tripId) => axiosClient.get(`/itinerary/trips/${tripId}`);
// Update Itinerary Day applies allowed changes to an existing record.
export const updateItineraryDay = (tripId, dayNumber, payload) =>
  axiosClient.patch(`/itinerary/trips/${tripId}/days/${dayNumber}`, payload);
// Create Itinerary Item builds a new record from validated input.
export const createItineraryItem = (tripId, payload) =>
  axiosClient.post(`/itinerary/trips/${tripId}/items`, payload);
// Update Itinerary Item applies allowed changes to an existing record.
export const updateItineraryItem = (itemId, payload) => axiosClient.patch(`/itinerary/items/${itemId}`, payload);
// Delete Itinerary Item removes a record after ownership checks.
export const deleteItineraryItem = (itemId) => axiosClient.delete(`/itinerary/items/${itemId}`);
