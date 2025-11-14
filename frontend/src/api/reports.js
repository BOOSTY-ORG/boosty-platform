import api from './index.js';

export const reportsAPI = {
  // Get all reports
  getReports: async (params = {}) => {
    return api.get('/metrics/reports', { params });
  },

  // Get report by ID
  getReportById: async (id) => {
    return api.get(`/metrics/reports/${id}`);
  },

  // Generate new report
  generateReport: async (reportData) => {
    return api.post('/metrics/reports/generate', reportData);
  },

  // Get report templates
  getReportTemplates: async () => {
    return api.get('/metrics/reports/templates');
  },

  // Get report metrics
  getReportMetrics: async (params = {}) => {
    return api.get('/metrics/reports/metrics', { params });
  },

  // Get financial reports
  getFinancialReports: async (params = {}) => {
    return api.get('/metrics/reports/financial', { params });
  },

  // Get performance reports
  getPerformanceReports: async (params = {}) => {
    return api.get('/metrics/reports/performance', { params });
  },

  // Get user reports
  getUserReports: async (params = {}) => {
    return api.get('/metrics/reports/users', { params });
  },

  // Get investor reports
  getInvestorReports: async (params = {}) => {
    return api.get('/metrics/reports/investors', { params });
  },

  // Get transaction reports
  getTransactionReports: async (params = {}) => {
    return api.get('/metrics/reports/transactions', { params });
  },

  // Get analytics data
  getAnalyticsData: async (params = {}) => {
    return api.get('/metrics/reports/analytics', { params });
  },

  // Export report
  exportReport: async (id, format = 'pdf') => {
    return api.get(`/metrics/reports/${id}/export`, {
      params: { format },
      responseType: 'blob',
    });
  },

  // Schedule report
  scheduleReport: async (reportData) => {
    return api.post('/metrics/reports/schedule', reportData);
  },

  // Get scheduled reports
  getScheduledReports: async (params = {}) => {
    return api.get('/metrics/reports/scheduled', { params });
  },

  // Update scheduled report
  updateScheduledReport: async (id, scheduleData) => {
    return api.put(`/metrics/reports/scheduled/${id}`, scheduleData);
  },

  // Delete scheduled report
  deleteScheduledReport: async (id) => {
    return api.delete(`/metrics/reports/scheduled/${id}`);
  },

  // Get report filters
  getReportFilters: async (reportType) => {
    return api.get(`/metrics/reports/filters/${reportType}`);
  },

  // Search reports
  searchReports: async (query, params = {}) => {
    return api.get('/metrics/reports/search', {
      params: { q: query, ...params },
    });
  },
};