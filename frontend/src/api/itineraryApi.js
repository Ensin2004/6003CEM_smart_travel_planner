import axiosClient from './axiosClient';

export const getTripItinerary = (tripId) => axiosClient.get(`/itinerary/trips/${tripId}`);
export const updateItineraryDay = (tripId, dayNumber, payload) =>
  axiosClient.patch(`/itinerary/trips/${tripId}/days/${dayNumber}`, payload);
export const createItineraryItem = (tripId, payload) =>
  axiosClient.post(`/itinerary/trips/${tripId}/items`, payload);
export const updateItineraryItem = (itemId, payload) => axiosClient.patch(`/itinerary/items/${itemId}`, payload);
export const deleteItineraryItem = (itemId) => axiosClient.delete(`/itinerary/items/${itemId}`);
