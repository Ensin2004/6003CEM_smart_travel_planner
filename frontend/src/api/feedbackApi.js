/**
 * Feedback Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

// Submit Feedback sends form data after client-side checks pass.
export const submitFeedback = (payload) => axiosClient.post('/feedback', payload);

// Retrieves all submitted feedback records from the system
export const getFeedback = () => axiosClient.get('/feedback');
