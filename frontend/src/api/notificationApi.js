/**
 * Notification API helpers.
 */
import axiosClient, { apiBaseURL } from './axiosClient';

export const getSocketBaseURL = () => apiBaseURL.replace(/\/api\/v1\/?$/, '');
export const getNotifications = (sort = 'desc') => axiosClient.get('/notifications', { params: { sort } });
export const markNotificationRead = (id) => axiosClient.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => axiosClient.patch('/notifications/read-all');
