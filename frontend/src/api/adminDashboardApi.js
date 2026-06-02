/**
 * Admin Dashboard Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';
export const getAdminDashboard = () => axiosClient.get('/admin/dashboard');
