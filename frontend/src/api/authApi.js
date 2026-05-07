import axiosClient from './axiosClient';

export const login = (payload) => axiosClient.post('/auth/login', payload);
export const register = (payload) => axiosClient.post('/auth/register', payload);
