import axios from 'axios';
import { getAccessToken, setAccessToken, clearTokens } from './auth-storage';

const BASE_URL = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = apiClient.post('/auth/refresh', {})
      .then((response) => {
        const token = response.data?.token || response.data?.accessToken;
        if (token) setAccessToken(token);
        return token || null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Request interceptor: attach access token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle errors centrally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config || {};

    if (status === 401 && !originalRequest._retry && !String(originalRequest.url || '').includes('/auth/login') && !String(originalRequest.url || '').includes('/auth/refresh')) {
      originalRequest._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      }
    }

    if (status === 401) {
      clearTokens();
      localStorage.removeItem('rc_user');
      sessionStorage.removeItem('rc_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (status === 403) {
      // Permission denied — let the UI handle via error boundary
    }

    if (status === 429) {
      // Rate limited
      console.warn('Rate limited. Please wait before retrying.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
