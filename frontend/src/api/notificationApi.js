/**
 * Notification API helpers.
 */
import axiosClient, { apiBaseURL } from './axiosClient';

// Extracts the base URL without the /api/v1 path for WebSocket connection configuration
export const getSocketBaseURL = () => apiBaseURL.replace(/\/api\/v1\/?$/, '');

// Retrieves the user's notifications with optional sorting order
export const getNotifications = (sort = 'desc') => axiosClient.get('/notifications', { params: { sort } });

// Marks a single notification as read by its identifier
export const markNotificationRead = (id) => axiosClient.patch(`/notifications/${id}/read`);

// Marks all notifications for the current user as read in a single operation
export const markAllNotificationsRead = () => axiosClient.patch('/notifications/read-all');