/**
 * Admin User Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

// Retrieves the list of all users for administrative management
export const getAdminUsers = () => axiosClient.get('/admin/users');

// Remove Admin User removes a record after ownership checks.
export const removeAdminUser = (userId) => axiosClient.delete(`/admin/users/${userId}`);
