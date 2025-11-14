import api from './index.js';

export const paymentsAPI = {
  // Get all payments
  getPayments: async (params = {}) => {
    return api.get('/metrics/transactions', { params });
  },

  // Get payment by ID
  getPaymentById: async (id) => {
    return api.get(`/metrics/transactions/${id}`);
  },

  // Create new payment
  createPayment: async (paymentData) => {
    return api.post('/metrics/transactions', paymentData);
  },

  // Update payment
  updatePayment: async (id, paymentData) => {
    return api.put(`/metrics/transactions/${id}`, paymentData);
  },

  // Delete payment
  deletePayment: async (id) => {
    return api.delete(`/metrics/transactions/${id}`);
  },

  // Get payment metrics
  getPaymentMetrics: async (params = {}) => {
    return api.get('/metrics/transactions/metrics', { params });
  },

  // Get transaction ledger
  getTransactionLedger: async (params = {}) => {
    return api.get('/metrics/transactions/ledger', { params });
  },

  // Get payout confirmations
  getPayoutConfirmations: async (params = {}) => {
    return api.get('/metrics/transactions/payouts', { params });
  },

  // Confirm payout
  confirmPayout: async (id, confirmationData) => {
    return api.put(`/metrics/transactions/${id}/confirm-payout`, confirmationData);
  },

  // Get payment statistics
  getPaymentStats: async (filters = {}) => {
    return api.get('/metrics/transactions/stats', { params: filters });
  },

  // Get payment by investor
  getPaymentsByInvestor: async (investorId, params = {}) => {
    return api.get(`/metrics/transactions/investor/${investorId}`, { params });
  },

  // Get payment by user
  getPaymentsByUser: async (userId, params = {}) => {
    return api.get(`/metrics/transactions/user/${userId}`, { params });
  },

  // Process refund
  processRefund: async (id, refundData) => {
    return api.post(`/metrics/transactions/${id}/refund`, refundData);
  },

  // Get payment history
  getPaymentHistory: async (params = {}) => {
    return api.get('/metrics/transactions/history', { params });
  },

  // Export payments
  exportPayments: async (params = {}) => {
    return api.get('/metrics/transactions/export', { 
      params,
      responseType: 'blob',
    });
  },

  // Search payments
  searchPayments: async (query, params = {}) => {
    return api.get('/metrics/transactions/search', {
      params: { q: query, ...params },
    });
  },
};