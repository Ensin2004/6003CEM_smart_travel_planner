/**
 * Settings Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';
export const getSettingsContent = () => axiosClient.get('/settings/content');
// Update Settings Content applies allowed changes to an existing record.
export const updateSettingsContent = (payload) => axiosClient.put('/settings/content', payload);
