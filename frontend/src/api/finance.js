import api from "./index.js";

export const financeAPI = {
  // Get KPI data
  getKPIData: async (params = {}) => {
    return api.get("/metrics/finance/kpi", { params });
  },

  // Get transaction timeline
  getTransactionTimeline: async (params = {}) => {
    return api.get("/metrics/finance/transaction-timeline", { params });
  },

  // Get payout data
  getPayoutData: async (params = {}) => {
    return api.get("/metrics/finance/payouts", { params });
  },

  // Get ROI analytics
  getROIAnalytics: async (params = {}) => {
    return api.get("/metrics/finance/roi-analytics", { params });
  },

  // Get payout analytics
  getPayoutAnalytics: async (params = {}) => {
    return api.get("/metrics/finance/payout-analytics", { params });
  },

  // Get revenue data
  getRevenueData: async (params = {}) => {
    return api.get("/metrics/finance/revenue", { params });
  },

  // Get investment data
  getInvestmentData: async (params = {}) => {
    return api.get("/metrics/finance/investments", { params });
  },

  // Get portfolio performance
  getPortfolioPerformance: async (params = {}) => {
    return api.get("/metrics/finance/portfolio-performance", { params });
  },

  // Get investor performance
  getInvestorPerformance: async (params = {}) => {
    return api.get("/metrics/finance/investor-performance", { params });
  },

  // Get financial summary
  getFinancialSummary: async (params = {}) => {
    return api.get("/metrics/finance/summary", { params });
  },

  // Get financial metrics for a specific date range
  getFinancialMetrics: async (dateRange, params = {}) => {
    return api.get("/metrics/finance/metrics", {
      params: { ...dateRange, ...params },
    });
  },

  // Export financial data
  exportFinancialData: async (format, params = {}) => {
    return api.get(`/metrics/finance/export/${format}`, {
      params,
      responseType: "blob",
    });
  },

  // Get financial dashboard overview
  getDashboardOverview: async (params = {}) => {
    return api.get("/metrics/finance/dashboard", { params });
  },

  // Get detailed transaction data
  getTransactionDetails: async (transactionId) => {
    return api.get(`/metrics/finance/transactions/${transactionId}`);
  },

  // Get detailed payout data
  getPayoutDetails: async (payoutId) => {
    return api.get(`/metrics/finance/payouts/${payoutId}`);
  },

  // Get detailed ROI data
  getROIDetails: async (roiId) => {
    return api.get(`/metrics/finance/roi/${roiId}`);
  },

  // Search financial data
  searchFinancialData: async (query, params = {}) => {
    return api.get("/metrics/finance/search", {
      params: { q: query, ...params },
    });
  },

  // Get financial trends
  getFinancialTrends: async (params = {}) => {
    return api.get("/metrics/finance/trends", { params });
  },

  // Get financial forecasts
  getFinancialForecasts: async (params = {}) => {
    return api.get("/metrics/finance/forecasts", { params });
  },

  // Get financial comparisons
  getFinancialComparisons: async (params = {}) => {
    return api.get("/metrics/finance/comparisons", { params });
  },

  // Get financial benchmarks
  getFinancialBenchmarks: async (params = {}) => {
    return api.get("/metrics/finance/benchmarks", { params });
  },

  // Get financial alerts
  getFinancialAlerts: async (params = {}) => {
    return api.get("/metrics/finance/alerts", { params });
  },

  // Get financial reports
  getFinancialReports: async (params = {}) => {
    return api.get("/metrics/finance/reports", { params });
  },

  // Create financial report
  createFinancialReport: async (reportData) => {
    return api.post("/metrics/finance/reports", reportData);
  },

  // Update financial report
  updateFinancialReport: async (reportId, reportData) => {
    return api.put(`/metrics/finance/reports/${reportId}`, reportData);
  },

  // Delete financial report
  deleteFinancialReport: async (reportId) => {
    return api.delete(`/metrics/finance/reports/${reportId}`);
  },

  // Get financial settings
  getFinancialSettings: async () => {
    return api.get("/metrics/finance/settings");
  },

  // Update financial settings
  updateFinancialSettings: async (settingsData) => {
    return api.put("/metrics/finance/settings", settingsData);
  },

  // Get financial notifications
  getFinancialNotifications: async (params = {}) => {
    return api.get("/metrics/finance/notifications", { params });
  },

  // Mark financial notification as read
  markNotificationAsRead: async (notificationId) => {
    return api.put(`/metrics/finance/notifications/${notificationId}/read`);
  },

  // Get financial audit logs
  getFinancialAuditLogs: async (params = {}) => {
    return api.get("/metrics/finance/audit-logs", { params });
  },
};

export default financeAPI;
