import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const axiosClient = axios.create({
  baseURL,
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

export default axiosClient;
