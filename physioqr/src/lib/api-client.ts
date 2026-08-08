import axios from 'axios';
import { getAccessToken, clearTokens } from './auth-storage';

const BASE_URL = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

    if (status === 401) {
      clearTokens();
      window.location.href = '/login';
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
