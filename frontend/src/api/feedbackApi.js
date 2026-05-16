import axiosClient from './axiosClient';

export const submitFeedback = (payload) => axiosClient.post('/feedback', payload);
export const getFeedback = () => axiosClient.get('/feedback');
