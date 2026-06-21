/**
 * Admin Dashboard Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

// Fetches administrative dashboard data from the server endpoint
export const getAdminDashboard = (params = {}) => axiosClient.get('/admin/dashboard', { params });
