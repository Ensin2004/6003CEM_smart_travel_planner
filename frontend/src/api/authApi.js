import axiosClient from './axiosClient';

export const login = (payload) => axiosClient.post('/auth/login', payload);
export const register = (payload) => axiosClient.post('/auth/register', payload);
export const refreshSession = (payload) => axiosClient.post('/auth/refresh', payload);
export const logoutSession = (payload) => axiosClient.post('/auth/logout', payload);
export const verifyEmail = (payload) => axiosClient.post('/auth/verify-email', payload);
export const resendVerificationEmail = (payload) => axiosClient.post('/auth/verify-email/resend', payload);
export const checkPasswordResetEmail = (payload) => axiosClient.post('/auth/forgot-password/check-email', payload);
export const resetPassword = (payload) => axiosClient.post('/auth/forgot-password/reset', payload);
