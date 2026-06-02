/**
 * User Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';
export const getMe = () => axiosClient.get('/users/me');
// Update Me applies allowed changes to an existing record.
export const updateMe = (payload) => axiosClient.put('/users/me', payload);
export const changeMyPassword = (payload) => axiosClient.put('/users/me/password', payload);
