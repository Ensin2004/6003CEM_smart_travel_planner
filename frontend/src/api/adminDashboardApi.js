/**
 * Admin Dashboard Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

// Fetches administrative dashboard data from the server endpoint
export const getAdminDashboard = () => axiosClient.get('/admin/dashboard');
