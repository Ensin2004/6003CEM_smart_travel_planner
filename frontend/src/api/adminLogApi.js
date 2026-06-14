/**
 * Admin Log Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';
export const getLoggingMonitoring = (params = {}) =>
  axiosClient.get('/api-logs/monitoring', { params });
export const getUserActivityLogs = (userId, params = {}) =>
  getLoggingMonitoring({ ...params, userId });
