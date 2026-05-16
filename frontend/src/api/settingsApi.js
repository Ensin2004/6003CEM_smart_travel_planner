import axiosClient from './axiosClient';

export const getSettingsContent = () => axiosClient.get('/settings/content');
export const updateSettingsContent = (payload) => axiosClient.put('/settings/content', payload);
