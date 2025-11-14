import api from './index.js';

export const investorsAPI = {
  // Get all investors
  getInvestors: async (params = {}) => {
    return api.get('/metrics/investors', { params });
  },

  // Get investor by ID
  getInvestorById: async (id) => {
    return api.get(`/metrics/investors/${id}`);
  },

  // Create new investor
  createInvestor: async (investorData) => {
    return api.post('/metrics/investors', investorData);
  },

  // Update investor
  updateInvestor: async (id, investorData) => {
    return api.put(`/metrics/investors/${id}`, investorData);
  },

  // Delete investor
  deleteInvestor: async (id) => {
    return api.delete(`/metrics/investors/${id}`);
  },

  // Get investor metrics
  getInvestorMetrics: async (params = {}) => {
    return api.get('/metrics/investors/metrics', { params });
  },

  // Get investor KYC documents
  getInvestorKYC: async (id) => {
    return api.get(`/metrics/investors/${id}/kyc`);
  },

  // Upload KYC document
  uploadKYCDocument: async (id, formData) => {
    return api.post(`/metrics/investors/${id}/kyc`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Verify KYC document
  verifyKYCDocument: async (id, documentId) => {
    return api.put(`/metrics/investors/${id}/kyc/${documentId}/verify`);
  },

  // Get investor investments
  getInvestorInvestments: async (id, params = {}) => {
    return api.get(`/metrics/investors/${id}/investments`, { params });
  },

  // Get investor transactions
  getInvestorTransactions: async (id, params = {}) => {
    return api.get(`/metrics/investors/${id}/transactions`, { params });
  },

  // Get investor performance
  getInvestorPerformance: async (id, period = '1y') => {
    return api.get(`/metrics/investors/${id}/performance`, {
      params: { period },
    });
  },

  // Get investor statistics
  getInvestorStats: async (filters = {}) => {
    return api.get('/metrics/investors/stats', { params: filters });
  },

  // Search investors
  searchInvestors: async (query, params = {}) => {
    return api.get('/metrics/investors/search', {
      params: { q: query, ...params },
    });
  },
};