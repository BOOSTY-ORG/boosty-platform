import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { financeAPI } from '../api/finance.js';
import { useApp } from './AppContext.jsx';
import toast from 'react-hot-toast';
import testConfig, { getCurrentScenario, getCurrentDataSize } from '../utils/testConfig.js';
import financeMockData from '../utils/financeMockData.js';

// Initial state
const initialState = {
  kpiData: null,
  transactionTimeline: [],
  payoutData: [],
  roiAnalytics: [],
  payoutAnalytics: [],
  revenueData: [],
  investmentData: [],
  portfolioPerformance: [],
  investorPerformance: [],
  financialSummary: null,
  dashboardOverview: null,
  financialTrends: [],
  financialForecasts: [],
  financialComparisons: [],
  financialBenchmarks: [],
  financialAlerts: [],
  financialReports: [],
  financialNotifications: [],
  auditLogs: [],
  settings: null,
  
  // Pagination states
  transactionTimelinePagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  payoutDataPagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  roiAnalyticsPagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  investorPerformancePagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  
  // Filter states
  dateRange: {
    startDate: null,
    endDate: null,
  },
  filters: {
    investorType: '',
    status: '',
    amountRange: { min: '', max: '' },
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  
  // UI states
  isLoading: false,
  isExporting: false,
  error: null,
  lastUpdated: null,
};

// Action types
const FINANCE_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_KPI_DATA: 'SET_KPI_DATA',
  SET_TRANSACTION_TIMELINE: 'SET_TRANSACTION_TIMELINE',
  SET_PAYOUT_DATA: 'SET_PAYOUT_DATA',
  SET_ROI_ANALYTICS: 'SET_ROI_ANALYTICS',
  SET_PAYOUT_ANALYTICS: 'SET_PAYOUT_ANALYTICS',
  SET_REVENUE_DATA: 'SET_REVENUE_DATA',
  SET_INVESTMENT_DATA: 'SET_INVESTMENT_DATA',
  SET_PORTFOLIO_PERFORMANCE: 'SET_PORTFOLIO_PERFORMANCE',
  SET_INVESTOR_PERFORMANCE: 'SET_INVESTOR_PERFORMANCE',
  SET_FINANCIAL_SUMMARY: 'SET_FINANCIAL_SUMMARY',
  SET_DASHBOARD_OVERVIEW: 'SET_DASHBOARD_OVERVIEW',
  SET_FINANCIAL_TRENDS: 'SET_FINANCIAL_TRENDS',
  SET_FINANCIAL_FORECASTS: 'SET_FINANCIAL_FORECASTS',
  SET_FINANCIAL_COMPARISONS: 'SET_FINANCIAL_COMPARISONS',
  SET_FINANCIAL_BENCHMARKS: 'SET_FINANCIAL_BENCHMARKS',
  SET_FINANCIAL_ALERTS: 'SET_FINANCIAL_ALERTS',
  SET_FINANCIAL_REPORTS: 'SET_FINANCIAL_REPORTS',
  SET_FINANCIAL_NOTIFICATIONS: 'SET_FINANCIAL_NOTIFICATIONS',
  SET_AUDIT_LOGS: 'SET_AUDIT_LOGS',
  SET_SETTINGS: 'SET_SETTINGS',
  SET_DATE_RANGE: 'SET_DATE_RANGE',
  SET_FILTERS: 'SET_FILTERS',
  SET_PAGINATION: 'SET_PAGINATION',
  SET_EXPORTING: 'SET_EXPORTING',
  CLEAR_FINANCE_DATA: 'CLEAR_FINANCE_DATA',
  UPDATE_LAST_REFRESHED: 'UPDATE_LAST_REFRESHED',
};

// Reducer function
const financeReducer = (state, action) => {
  switch (action.type) {
    case FINANCE_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case FINANCE_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case FINANCE_ACTIONS.SET_KPI_DATA:
      return {
        ...state,
        kpiData: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_TRANSACTION_TIMELINE:
      return {
        ...state,
        transactionTimeline: action.payload.data,
        transactionTimelinePagination: action.payload.pagination,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_PAYOUT_DATA:
      return {
        ...state,
        payoutData: action.payload.data,
        payoutDataPagination: action.payload.pagination,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_ROI_ANALYTICS:
      return {
        ...state,
        roiAnalytics: action.payload.data,
        roiAnalyticsPagination: action.payload.pagination,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_PAYOUT_ANALYTICS:
      return {
        ...state,
        payoutAnalytics: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_REVENUE_DATA:
      return {
        ...state,
        revenueData: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_INVESTMENT_DATA:
      return {
        ...state,
        investmentData: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_PORTFOLIO_PERFORMANCE:
      return {
        ...state,
        portfolioPerformance: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_INVESTOR_PERFORMANCE:
      return {
        ...state,
        investorPerformance: action.payload.data,
        investorPerformancePagination: action.payload.pagination,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_FINANCIAL_SUMMARY:
      return {
        ...state,
        financialSummary: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_DASHBOARD_OVERVIEW:
      return {
        ...state,
        dashboardOverview: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_FINANCIAL_TRENDS:
      return {
        ...state,
        financialTrends: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_FINANCIAL_FORECASTS:
      return {
        ...state,
        financialForecasts: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_FINANCIAL_COMPARISONS:
      return {
        ...state,
        financialComparisons: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_FINANCIAL_BENCHMARKS:
      return {
        ...state,
        financialBenchmarks: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_FINANCIAL_ALERTS:
      return {
        ...state,
        financialAlerts: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_FINANCIAL_REPORTS:
      return {
        ...state,
        financialReports: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_FINANCIAL_NOTIFICATIONS:
      return {
        ...state,
        financialNotifications: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_AUDIT_LOGS:
      return {
        ...state,
        auditLogs: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_SETTINGS:
      return {
        ...state,
        settings: action.payload,
        isLoading: false,
        error: null,
      };

    case FINANCE_ACTIONS.SET_DATE_RANGE:
      return {
        ...state,
        dateRange: action.payload,
      };

    case FINANCE_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };

    case FINANCE_ACTIONS.SET_PAGINATION:
      return {
        ...state,
        [`${action.payload.table}Pagination`]: action.payload.pagination,
      };

    case FINANCE_ACTIONS.SET_EXPORTING:
      return {
        ...state,
        isExporting: action.payload,
      };

    case FINANCE_ACTIONS.CLEAR_FINANCE_DATA:
      return {
        ...initialState,
      };

    case FINANCE_ACTIONS.UPDATE_LAST_REFRESHED:
      return {
        ...state,
        lastUpdated: new Date().toISOString(),
      };

    default:
      return state;
  }
};

// Create context
const FinanceContext = createContext();

// Finance provider component
export const FinanceProvider = ({ children }) => {
  const [state, dispatch] = useReducer(financeReducer, initialState);
  const { dateRange: appDateRange } = useApp();
  
  // Check if we should use mock data
  const useMock = testConfig.useMockData;

  // Get KPI data
  const getKPIData = async (params = {}) => {
    try {
      dispatch({ type: FINANCE_ACTIONS.SET_LOADING, payload: true });
      
      let kpiData;
      if (useMock) {
        // Use mock data with scenario configuration
        const scenario = getCurrentScenario();
        const dataSize = getCurrentDataSize();
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
        
        if (scenario.config.simulateError) {
          throw new Error('Mock API error for testing');
        }
        
        kpiData = financeMockData.generateKPIData(scenario.config);
      } else {
        kpiData = await financeAPI.getKPIData({
          dateRange: state.dateRange || appDateRange,
          ...params
        });
      }
      
      dispatch({ type: FINANCE_ACTIONS.SET_KPI_DATA, payload: kpiData });
      return kpiData;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch KPI data';
      dispatch({ type: FINANCE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get transaction timeline
  const getTransactionTimeline = async (params = {}) => {
    try {
      dispatch({ type: FINANCE_ACTIONS.SET_LOADING, payload: true });
      
      let transactionTimeline;
      if (useMock) {
        const scenario = getCurrentScenario();
        const dataSize = getCurrentDataSize();
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
        
        if (scenario.config.simulateError) {
          throw new Error('Mock API error for testing');
        }
        
        const transactions = financeMockData.generateTransactionData(
          scenario.config.dataSize || dataSize
        );
        
        transactionTimeline = financeMockData.createPaginatedResponse(
          transactions,
          params.page || state.transactionTimelinePagination.page,
          params.limit || state.transactionTimelinePagination.limit
        );
      } else {
        transactionTimeline = await financeAPI.getTransactionTimeline({
          dateRange: state.dateRange || appDateRange,
          filters: state.filters,
          pagination: state.transactionTimelinePagination,
          ...params
        });
      }
      
      dispatch({ type: FINANCE_ACTIONS.SET_TRANSACTION_TIMELINE, payload: transactionTimeline });
      return transactionTimeline;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch transaction timeline';
      dispatch({ type: FINANCE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get payout data
  const getPayoutData = async (params = {}) => {
    try {
      dispatch({ type: FINANCE_ACTIONS.SET_LOADING, payload: true });
      
      let payoutData;
      if (useMock) {
        const scenario = getCurrentScenario();
        const dataSize = getCurrentDataSize();
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
        
        if (scenario.config.simulateError) {
          throw new Error('Mock API error for testing');
        }
        
        const payouts = financeMockData.generatePayoutData(
          scenario.config.dataSize || dataSize
        );
        
        payoutData = financeMockData.createPaginatedResponse(
          payouts,
          params.page || state.payoutDataPagination.page,
          params.limit || state.payoutDataPagination.limit
        );
      } else {
        payoutData = await financeAPI.getPayoutData({
          dateRange: state.dateRange || appDateRange,
          filters: state.filters,
          pagination: state.payoutDataPagination,
          ...params
        });
      }
      
      dispatch({ type: FINANCE_ACTIONS.SET_PAYOUT_DATA, payload: payoutData });
      return payoutData;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch payout data';
      dispatch({ type: FINANCE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get ROI analytics
  const getROIAnalytics = async (params = {}) => {
    try {
      dispatch({ type: FINANCE_ACTIONS.SET_LOADING, payload: true });
      
      let roiAnalytics;
      if (useMock) {
        const scenario = getCurrentScenario();
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
        
        if (scenario.config.simulateError) {
          throw new Error('Mock API error for testing');
        }
        
        const analyticsData = financeMockData.generateROIAnalyticsData(
          params.period || 'monthly',
          scenario.config
        );
        
        roiAnalytics = financeMockData.createPaginatedResponse(
          analyticsData,
          params.page || state.roiAnalyticsPagination.page,
          params.limit || state.roiAnalyticsPagination.limit
        );
      } else {
        roiAnalytics = await financeAPI.getROIAnalytics({
          dateRange: state.dateRange || appDateRange,
          filters: state.filters,
          pagination: state.roiAnalyticsPagination,
          ...params
        });
      }
      
      dispatch({ type: FINANCE_ACTIONS.SET_ROI_ANALYTICS, payload: roiAnalytics });
      return roiAnalytics;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch ROI analytics';
      dispatch({ type: FINANCE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get payout analytics
  const getPayoutAnalytics = async (params = {}) => {
    try {
      dispatch({ type: FINANCE_ACTIONS.SET_LOADING, payload: true });
      
      let payoutAnalytics;
      if (useMock) {
        const scenario = getCurrentScenario();
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
        
        if (scenario.config.simulateError) {
          throw new Error('Mock API error for testing');
        }
        
        // Generate mock payout analytics data
        payoutAnalytics = {
          totalPayouts: Math.random() * 1000000,
          averagePayout: Math.random() * 50000,
          payoutTrend: Math.random() * 20 - 10,
          breakdown: {
            investment_return: Math.random() * 500000,
            profit_sharing: Math.random() * 300000,
            dividend: Math.random() * 150000,
            referral_bonus: Math.random() * 50000
          },
          monthly: Array.from({ length: 12 }, (_, i) => ({
            month: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short' }),
            amount: Math.random() * 100000,
            count: Math.floor(Math.random() * 50) + 10
          })),
          ...scenario.config
        };
      } else {
        payoutAnalytics = await financeAPI.getPayoutAnalytics({
          dateRange: state.dateRange || appDateRange,
          ...params
        });
      }
      
      dispatch({ type: FINANCE_ACTIONS.SET_PAYOUT_ANALYTICS, payload: payoutAnalytics });
      return payoutAnalytics;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch payout analytics';
      dispatch({ type: FINANCE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get revenue data
  const getRevenueData = async (params = {}) => {
    try {
      dispatch({ type: FINANCE_ACTIONS.SET_LOADING, payload: true });
      
      let revenueData;
      if (useMock) {
        const scenario = getCurrentScenario();
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
        
        if (scenario.config.simulateError) {
          throw new Error('Mock API error for testing');
        }
        
        revenueData = financeMockData.generateRevenueData(
          params.period || 'monthly',
          scenario.config
        );
      } else {
        revenueData = await financeAPI.getRevenueData({
          dateRange: state.dateRange || appDateRange,
          ...params
        });
      }
      
      dispatch({ type: FINANCE_ACTIONS.SET_REVENUE_DATA, payload: revenueData });
      return revenueData;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch revenue data';
      dispatch({ type: FINANCE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get investment data
  const getInvestmentData = async (params = {}) => {
    try {
      dispatch({ type: FINANCE_ACTIONS.SET_LOADING, payload: true });
      
      let investmentData;
      if (useMock) {
        const scenario = getCurrentScenario();
        const dataSize = getCurrentDataSize();
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
        
        if (scenario.config.simulateError) {
          throw new Error('Mock API error for testing');
        }
        
        investmentData = financeMockData.generateInvestmentData(
          scenario.config.dataSize || dataSize,
          scenario.config
        );
      } else {
        investmentData = await financeAPI.getInvestmentData({
          dateRange: state.dateRange || appDateRange,
          ...params
        });
      }
      
      dispatch({ type: FINANCE_ACTIONS.SET_INVESTMENT_DATA, payload: investmentData });
      return investmentData;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch investment data';
      dispatch({ type: FINANCE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get portfolio performance
  const getPortfolioPerformance = async (params = {}) => {
    try {
      dispatch({ type: FINANCE_ACTIONS.SET_LOADING, payload: true });
      
      let portfolioPerformance;
      if (useMock) {
        const scenario = getCurrentScenario();
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
        
        if (scenario.config.simulateError) {
          throw new Error('Mock API error for testing');
        }
        
        portfolioPerformance = financeMockData.generatePortfolioPerformanceData(
          scenario.config
        );
      } else {
        portfolioPerformance = await financeAPI.getPortfolioPerformance({
          dateRange: state.dateRange || appDateRange,
          ...params
        });
      }
      
      dispatch({ type: FINANCE_ACTIONS.SET_PORTFOLIO_PERFORMANCE, payload: portfolioPerformance });
      return portfolioPerformance;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch portfolio performance';
      dispatch({ type: FINANCE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get investor performance
  const getInvestorPerformance = async (params = {}) => {
    try {
      dispatch({ type: FINANCE_ACTIONS.SET_LOADING, payload: true });
      
      let investorPerformance;
      if (useMock) {
        const scenario = getCurrentScenario();
        const dataSize = getCurrentDataSize();
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
        
        if (scenario.config.simulateError) {
          throw new Error('Mock API error for testing');
        }
        
        const investors = financeMockData.generateInvestorPerformanceData(
          scenario.config.dataSize || dataSize,
          scenario.config
        );
        
        investorPerformance = financeMockData.createPaginatedResponse(
          investors,
          params.page || state.investorPerformancePagination.page,
          params.limit || state.investorPerformancePagination.limit
        );
      } else {
        investorPerformance = await financeAPI.getInvestorPerformance({
          dateRange: state.dateRange || appDateRange,
          filters: state.filters,
          pagination: state.investorPerformancePagination,
          ...params
        });
      }
      
      dispatch({ type: FINANCE_ACTIONS.SET_INVESTOR_PERFORMANCE, payload: investorPerformance });
      return investorPerformance;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch investor performance';
      dispatch({ type: FINANCE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get financial summary
  const getFinancialSummary = async (params = {}) => {
    try {
      dispatch({ type: FINANCE_ACTIONS.SET_LOADING, payload: true });
      
      let financialSummary;
      if (useMock) {
        const scenario = getCurrentScenario();
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
        
        if (scenario.config.simulateError) {
          throw new Error('Mock API error for testing');
        }
        
        financialSummary = financeMockData.generateFinancialSummary(
          scenario.config
        );
      } else {
        financialSummary = await financeAPI.getFinancialSummary({
          dateRange: state.dateRange || appDateRange,
          ...params
        });
      }
      
      dispatch({ type: FINANCE_ACTIONS.SET_FINANCIAL_SUMMARY, payload: financialSummary });
      return financialSummary;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch financial summary';
      dispatch({ type: FINANCE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get dashboard overview
  const getDashboardOverview = async (params = {}) => {
    try {
      dispatch({ type: FINANCE_ACTIONS.SET_LOADING, payload: true });
      
      let dashboardOverview;
      if (useMock) {
        const scenario = getCurrentScenario();
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
        
        if (scenario.config.simulateError) {
          throw new Error('Mock API error for testing');
        }
        
        dashboardOverview = {
          summary: financeMockData.generateFinancialSummary(scenario.config),
          kpiData: financeMockData.generateKPIData(scenario.config),
          recentTransactions: financeMockData.generateTransactionData(5, scenario.config),
          topInvestors: financeMockData.generateInvestorPerformanceData(5, scenario.config),
          alerts: [
            {
              id: '1',
              type: 'warning',
              message: 'Some investors have not completed KYC',
              count: 12
            },
            {
              id: '2',
              type: 'info',
              message: 'New investment opportunities available',
              count: 3
            }
          ],
          ...scenario.config
        };
      } else {
        dashboardOverview = await financeAPI.getDashboardOverview({
          dateRange: state.dateRange || appDateRange,
          ...params
        });
      }
      
      dispatch({ type: FINANCE_ACTIONS.SET_DASHBOARD_OVERVIEW, payload: dashboardOverview });
      return dashboardOverview;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch dashboard overview';
      dispatch({ type: FINANCE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Export financial data
  const exportFinancialData = async (format, params = {}) => {
    try {
      dispatch({ type: FINANCE_ACTIONS.SET_EXPORTING, payload: true });
      
      let response;
      if (useMock) {
        const scenario = getCurrentScenario();
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
        
        if (scenario.config.simulateError) {
          throw new Error('Mock API error for testing');
        }
        
        // Create mock CSV/Excel data
        const mockData = financeMockData.generateTransactionData(100, scenario.config);
        const csvContent = [
          'Transaction ID,Amount,Type,Status,User,Date',
          ...mockData.map(t =>
            `${t.transactionId},${t.amount},${t.type},${t.status},"${t.user.name}",${t.createdAt}`
          )
        ].join('\n');
        
        response = new Blob([csvContent], { type: 'text/csv' });
      } else {
        response = await financeAPI.exportFinancialData(format, {
          dateRange: state.dateRange || appDateRange,
          filters: state.filters,
          ...params
        });
      }
      
      // Create download link
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial-data.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      dispatch({ type: FINANCE_ACTIONS.SET_EXPORTING, payload: false });
      toast.success(`Financial data exported as ${format.toUpperCase()}`);
    } catch (error) {
      const errorMessage = error.message || 'Failed to export financial data';
      dispatch({ type: FINANCE_ACTIONS.SET_EXPORTING, payload: false });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Update date range
  const updateDateRange = (dateRange) => {
    dispatch({ type: FINANCE_ACTIONS.SET_DATE_RANGE, payload: dateRange });
  };

  // Update filters
  const updateFilters = (filters) => {
    dispatch({ type: FINANCE_ACTIONS.SET_FILTERS, payload: filters });
  };

  // Update pagination
  const updatePagination = (table, pagination) => {
    dispatch({ 
      type: FINANCE_ACTIONS.SET_PAGINATION, 
      payload: { table, pagination } 
    });
  };

  // Clear finance data
  const clearFinanceData = () => {
    dispatch({ type: FINANCE_ACTIONS.CLEAR_FINANCE_DATA });
  };

  // Refresh all data
  const refreshAllData = async () => {
    try {
      await Promise.all([
        getKPIData(),
        getTransactionTimeline(),
        getPayoutData(),
        getROIAnalytics(),
        getPayoutAnalytics(),
        getRevenueData(),
        getInvestmentData(),
        getPortfolioPerformance(),
        getInvestorPerformance(),
        getFinancialSummary(),
        getDashboardOverview(),
      ]);
      dispatch({ type: FINANCE_ACTIONS.UPDATE_LAST_REFRESHED });
      toast.success('Financial data refreshed successfully');
    } catch (error) {
      const errorMessage = 'Failed to refresh financial data';
      toast.error(errorMessage);
      throw error;
    }
  };

  const value = {
    ...state,
    getKPIData,
    getTransactionTimeline,
    getPayoutData,
    getROIAnalytics,
    getPayoutAnalytics,
    getRevenueData,
    getInvestmentData,
    getPortfolioPerformance,
    getInvestorPerformance,
    getFinancialSummary,
    getDashboardOverview,
    exportFinancialData,
    updateDateRange,
    updateFilters,
    updatePagination,
    clearFinanceData,
    refreshAllData,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

// Custom hook to use finance context
export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

export default FinanceContext;