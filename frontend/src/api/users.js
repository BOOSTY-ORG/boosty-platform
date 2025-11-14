import api from './index.js';

export const usersAPI = {
  // Get all users
  getUsers: async (params = {}) => {
    return api.get('/metrics/users', { params });
  },

  // Get user by ID
  getUserById: async (id) => {
    return api.get(`/metrics/users/${id}`);
  },

  // Create new user
  createUser: async (userData) => {
    return api.post('/metrics/users', userData);
  },

  // Update user
  updateUser: async (id, userData) => {
    return api.put(`/metrics/users/${id}`, userData);
  },

  // Delete user
  deleteUser: async (id) => {
    return api.delete(`/metrics/users/${id}`);
  },

  // Get user metrics
  getUserMetrics: async (params = {}) => {
    return api.get('/metrics/users/metrics', { params });
  },

  // Get user applications
  getUserApplications: async (id, params = {}) => {
    return api.get(`/metrics/users/${id}/applications`, { params });
  },

  // Create user application
  createUserApplication: async (id, applicationData) => {
    return api.post(`/metrics/users/${id}/applications`, applicationData);
  },

  // Update user application
  updateUserApplication: async (id, applicationId, applicationData) => {
    return api.put(`/metrics/users/${id}/applications/${applicationId}`, applicationData);
  },

  // Get user installations
  getUserInstallations: async (id, params = {}) => {
    return api.get(`/metrics/users/${id}/installations`, { params });
  },

  // Create user installation
  createUserInstallation: async (id, installationData) => {
    return api.post(`/metrics/users/${id}/installations`, installationData);
  },

  // Update user installation
  updateUserInstallation: async (id, installationId, installationData) => {
    return api.put(`/metrics/users/${id}/installations/${installationId}`, installationData);
  },

  // Get user statistics
  getUserStats: async (filters = {}) => {
    return api.get('/metrics/users/stats', { params: filters });
  },

  // Search users
  searchUsers: async (query, params = {}) => {
    return api.get('/metrics/users/search', {
      params: { q: query, ...params },
    });
  },

  // Get user activity
  getUserActivity: async (id, params = {}) => {
    return api.get(`/metrics/users/${id}/activity`, { params });
  },

  // Get user documents
  getUserDocuments: async (id, params = {}) => {
    return api.get(`/metrics/users/${id}/documents`, { params });
  },

  // Upload user document
  uploadUserDocument: async (id, formData) => {
    return api.post(`/metrics/users/${id}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};