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
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = localStorage.getItem('refreshToken');
    const requestUrl = originalRequest?.url || '';
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
