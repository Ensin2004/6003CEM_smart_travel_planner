import axiosClient from './axiosClient';

export const getAdminUsers = () => axiosClient.get('/admin/users');
export const removeAdminUser = (userId) => axiosClient.delete(`/admin/users/${userId}`);
