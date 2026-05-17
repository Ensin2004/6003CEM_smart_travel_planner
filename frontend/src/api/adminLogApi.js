import axiosClient from './axiosClient';

export const getLoggingMonitoring = (params = {}) =>
  axiosClient.get('/api-logs/monitoring', { params });
