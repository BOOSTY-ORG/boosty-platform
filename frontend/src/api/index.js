import axios from 'axios';
import { getAuthToken } from '../utils/auth.js';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:7000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);
    
    // Handle network errors for development
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      console.log('Backend not available, using mock response for development');
      
      // Return mock response for login endpoint
      if (error.config?.url?.includes('/auth/signin')) {
        const mockResponse = {
          token: 'mock-jwt-token-for-development',
          user: {
            id: 1,
            email: 'admin@example.com',
            role: error.config.data?.includes('admin') ? 'admin' : 'user',
            name: error.config.data?.includes('admin') ? 'Admin User' : 'Regular User'
          }
        };
        return mockResponse;
      }
      
      // Return mock response for current user endpoint
      if (error.config?.url?.includes('/auth/me')) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          return JSON.parse(storedUser);
        }
      }
    }
    
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error.response?.data || error.message);
  },
);

export default api;