import axiosClient from './axiosClient';

export const getTrips = () => axiosClient.get('/trips');
export const createTrip = (payload) => axiosClient.post('/trips', payload);
export const getTripSummary = (id) => axiosClient.get(`/trips/${id}/summary`);
