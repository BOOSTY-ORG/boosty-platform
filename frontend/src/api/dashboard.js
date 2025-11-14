import api from './index.js';

export const dashboardAPI = {
  // Get dashboard overview data
  getOverview: async (params = {}) => {
    return api.get('/metrics/dashboard/overview', { params });
  },

  // Get dashboard metrics
  getMetrics: async (params = {}) => {
    return api.get('/metrics/dashboard', { params });
  },

  // Get real-time data
  getRealTimeData: async () => {
    return api.get('/metrics/dashboard/realtime');
  },

  // Get summary statistics
  getSummaryStats: async (dateRange) => {
    return api.get('/metrics/dashboard/summary', { 
      params: { dateRange } 
    });
  },

  // Get performance metrics
  getPerformanceMetrics: async (period = '30d') => {
    return api.get('/metrics/dashboard/performance', { 
      params: { period } 
    });
  },

  // Get activity logs
  getActivityLogs: async (params = {}) => {
    return api.get('/metrics/dashboard/activity', { params });
  },

  // Get system health
  getSystemHealth: async () => {
    return api.get('/metrics/dashboard/health');
  },

  // Get recent transactions
  getRecentTransactions: async (limit = 10) => {
    return api.get('/metrics/dashboard/transactions', { 
      params: { limit } 
    });
  },

  // Get user activity
  getUserActivity: async (params = {}) => {
    return api.get('/metrics/dashboard/users/activity', { params });
  },

  // Get financial summary
  getFinancialSummary: async (dateRange) => {
    return api.get('/metrics/dashboard/financial', { 
      params: { dateRange } 
    });
  },
};