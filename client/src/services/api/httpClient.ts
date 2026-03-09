import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';

// Base URL từ environment variable
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Tạo Axios instance
const httpClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - gắn token vào header
httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - xử lý lỗi 401 (unauthorized)
httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token và redirect về login
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default httpClient;
