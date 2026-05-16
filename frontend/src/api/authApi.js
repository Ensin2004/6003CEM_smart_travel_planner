import axiosClient from './axiosClient';

export const login = (payload) => axiosClient.post('/auth/login', payload);
export const register = (payload) => axiosClient.post('/auth/register', payload);
export const checkPasswordResetEmail = (payload) => axiosClient.post('/auth/forgot-password/check-email', payload);
export const resetPassword = (payload) => axiosClient.post('/auth/forgot-password/reset', payload);
