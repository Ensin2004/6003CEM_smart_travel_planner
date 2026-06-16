/**
 * Axios Client module.
 * Exports and local helpers keep related behavior in a single module.
 */
import axios from 'axios';

// Determines the base URL from environment variables with a fallback to localhost
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

// Creates an axios instance with configured base URL and request timeout
const axiosClient = axios.create({
  baseURL,
  timeout: 30000,
});

// Clears stored authentication data and redirects to the login page
const clearSessionAndRedirect = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

// Intercepts outgoing requests to attach the access token to authorization headers
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepts responses to handle token refresh logic on 401 unauthorized errors
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = localStorage.getItem('refreshToken');
    const requestUrl = originalRequest?.url || '';
    
    // Defines authentication-related endpoints that should not trigger token refresh
    const isAuthFormRequest = [
      '/auth/login',
      '/auth/register',
      '/auth/logout',
      '/auth/verify-email',
      '/auth/verify-email/resend',
      '/auth/forgot-password/check-email',
      '/auth/forgot-password/reset',
    ].some((path) => requestUrl.includes(path));

    // Skips refresh logic if not a 401 error, already retried, refresh endpoint, auth request, or missing refresh token
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

    // Marks the request as retried to prevent infinite refresh loops
    originalRequest._retry = true;
    try {
      // Attempts to refresh the access token using the stored refresh token
      const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: nextRefreshToken, user } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', nextRefreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      // Retries the original request with the new access token
      return axiosClient(originalRequest);
    } catch (refreshError) {
      clearSessionAndRedirect();
      return Promise.reject(refreshError);
    }
  }
);

// Default export registers the primary value.
export default axiosClient;
