import axiosClient from './axiosClient';

export const getMe = () => axiosClient.get('/users/me');
export const updateMe = (payload) => axiosClient.put('/users/me', payload);
export const changeMyPassword = (payload) => axiosClient.put('/users/me/password', payload);
