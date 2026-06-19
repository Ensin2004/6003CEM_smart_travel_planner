/**
 * Admin Log Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

// Retrieves system-wide logging monitoring data with optional query parameters
export const getLoggingMonitoring = (params = {}) =>
  axiosClient.get('/api-logs/monitoring', { params });

// Retrieves activity logs for a specific user by combining userId with additional parameters
export const getUserActivityLogs = (userId, params = {}) =>
  getLoggingMonitoring({ ...params, userId });
