/**
 * Axios Client module.
 * Exports and local helpers keep related behavior in a single module.
 */
import axios from 'axios';
const getBaseURL = () => {
  const fallbackBaseURL = 'http://localhost:5000/api/v1';
  const configuredBaseURL = String(import.meta.env.VITE_API_BASE_URL || '').trim();

  if (!configuredBaseURL || ['null', 'undefined'].includes(configuredBaseURL.toLowerCase())) {
    return fallbackBaseURL;
  }

  return configuredBaseURL;
};

const baseURL = getBaseURL();
export const apiBaseURL = baseURL;

const axiosClient = axios.create({
  baseURL,
  timeout: 30000,
});

const redactSensitiveFields = (value) => {
  if (!value || typeof value !== 'object') return value;

  const sensitiveFields = new Set([
    'accessToken',
    'authorization',
    'confirmPassword',
    'currentPassword',
    'newPassword',
    'password',
    'refreshToken',
    'token',
  ]);

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveFields.has(key) ? '[REDACTED]' : item,
    ])
  );
};

const clearSessionAndRedirect = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (import.meta.env.DEV) {
    const method = config.method?.toUpperCase() || 'REQUEST';
    const url = `${config.baseURL || ''}${config.url || ''}`;

    console.groupCollapsed(`[API Request] ${method} ${url}`);
    if (config.params) console.log('Query parameters:', redactSensitiveFields(config.params));
    if (config.data) console.log('JSON body:', redactSensitiveFields(config.data));
    console.groupEnd();
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      const method = response.config?.method?.toUpperCase() || 'REQUEST';
      const url = `${response.config?.baseURL || ''}${response.config?.url || ''}`;

      console.groupCollapsed(`[API] ${method} ${url} - ${response.status}`);
      console.log('JSON response:', response.data);
      console.groupEnd();
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = localStorage.getItem('refreshToken');
    const requestUrl = originalRequest?.url || '';

    if (import.meta.env.DEV && error.response) {
      const method = originalRequest?.method?.toUpperCase() || 'REQUEST';
      const url = `${originalRequest?.baseURL || ''}${requestUrl}`;

      console.groupCollapsed(`[API Error] ${method} ${url} - ${error.response.status}`);
      console.log('JSON response:', error.response.data);
      console.groupEnd();
    }

    const isAuthFormRequest = [
      '/auth/login',
      '/auth/register',
      '/auth/logout',
      '/auth/verify-email',
      '/auth/verify-email/resend',
      '/auth/forgot-password/check-email',
      '/auth/forgot-password/reset',
    ].some((path) => requestUrl.includes(path));

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      originalRequest?.url?.includes('/auth/refresh') ||
      isAuthFormRequest ||
      !refreshToken
    ) {
      if (error.response?.status === 401 && !refreshToken && !isAuthFormRequest) {
        clearSessionAndRedirect();
      }

      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: nextRefreshToken, user } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', nextRefreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      return axiosClient(originalRequest);
    } catch (refreshError) {
      clearSessionAndRedirect();
      return Promise.reject(refreshError);
    }
  }
);
// Default export registers the primary  value.
export default axiosClient;
