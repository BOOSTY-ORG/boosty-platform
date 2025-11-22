import api from './index.js';

export const authAPI = {
  // Login user
  login: async (credentials) => {
    return api.post('/auth/signin', credentials);
  },

  // Register new user
  register: async (userData) => {
    return api.post('/auth/register', userData);
  },

  // Logout user
  logout: async () => {
    return api.get('/auth/signout');
  },

  // Refresh token
  refreshToken: async () => {
    return api.post('/auth/refresh');
  },

  // Forgot password
  forgotPassword: async (email) => {
    return api.post('/auth/forgot-password', { email });
  },

  // Reset password
  resetPassword: async (token, password) => {
    return api.post('/auth/reset-password', { token, password });
  },

  // Verify email
  verifyEmail: async (token) => {
    return api.post('/auth/verify-email', { token });
  },

  // Get current user
  getCurrentUser: async () => {
    return api.get('/auth/me');
  },

  // Update password
  updatePassword: async (passwordData) => {
    return api.put('/auth/update-password', passwordData);
  },
};