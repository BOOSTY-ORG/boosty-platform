import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { reportsAPI } from '../api/reports.js';
import { useApp } from './AppContext.js';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  reports: [],
  currentReport: null,
  reportTemplates: [],
  reportMetrics: null,
  financialReports: [],
  performanceReports: [],
  userReports: [],
  investorReports: [],
  transactionReports: [],
  analyticsData: null,
  scheduledReports: [],
  reportFilters: {},
  searchResults: [],
  isLoading: false,
  error: null,
};

// Action types
const REPORT_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_REPORTS: 'SET_REPORTS',
  SET_CURRENT_REPORT: 'SET_CURRENT_REPORT',
  SET_REPORT_TEMPLATES: 'SET_REPORT_TEMPLATES',
  SET_REPORT_METRICS: 'SET_REPORT_METRICS',
  SET_FINANCIAL_REPORTS: 'SET_FINANCIAL_REPORTS',
  SET_PERFORMANCE_REPORTS: 'SET_PERFORMANCE_REPORTS',
  SET_USER_REPORTS: 'SET_USER_REPORTS',
  SET_INVESTOR_REPORTS: 'SET_INVESTOR_REPORTS',
  SET_TRANSACTION_REPORTS: 'SET_TRANSACTION_REPORTS',
  SET_ANALYTICS_DATA: 'SET_ANALYTICS_DATA',
  SET_SCHEDULED_REPORTS: 'SET_SCHEDULED_REPORTS',
  SET_REPORT_FILTERS: 'SET_REPORT_FILTERS',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  ADD_REPORT: 'ADD_REPORT',
  UPDATE_REPORT: 'UPDATE_REPORT',
  REMOVE_REPORT: 'REMOVE_REPORT',
  ADD_SCHEDULED_REPORT: 'ADD_SCHEDULED_REPORT',
  UPDATE_SCHEDULED_REPORT: 'UPDATE_SCHEDULED_REPORT',
  REMOVE_SCHEDULED_REPORT: 'REMOVE_SCHEDULED_REPORT',
  CLEAR_REPORT_DATA: 'CLEAR_REPORT_DATA',
};

// Reducer function
const reportReducer = (state, action) => {
  switch (action.type) {
    case REPORT_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case REPORT_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case REPORT_ACTIONS.SET_REPORTS:
      return {
        ...state,
        reports: action.payload,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.SET_CURRENT_REPORT:
      return {
        ...state,
        currentReport: action.payload,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.SET_REPORT_TEMPLATES:
      return {
        ...state,
        reportTemplates: action.payload,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.SET_REPORT_METRICS:
      return {
        ...state,
        reportMetrics: action.payload,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.SET_FINANCIAL_REPORTS:
      return {
        ...state,
        financialReports: action.payload,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.SET_PERFORMANCE_REPORTS:
      return {
        ...state,
        performanceReports: action.payload,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.SET_USER_REPORTS:
      return {
        ...state,
        userReports: action.payload,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.SET_INVESTOR_REPORTS:
      return {
        ...state,
        investorReports: action.payload,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.SET_TRANSACTION_REPORTS:
      return {
        ...state,
        transactionReports: action.payload,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.SET_ANALYTICS_DATA:
      return {
        ...state,
        analyticsData: action.payload,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.SET_SCHEDULED_REPORTS:
      return {
        ...state,
        scheduledReports: action.payload,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.SET_REPORT_FILTERS:
      return {
        ...state,
        reportFilters: action.payload,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.SET_SEARCH_RESULTS:
      return {
        ...state,
        searchResults: action.payload,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.ADD_REPORT:
      return {
        ...state,
        reports: [action.payload, ...state.reports],
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.UPDATE_REPORT:
      return {
        ...state,
        reports: state.reports.map((report) =>
          report._id === action.payload._id ? action.payload : report
        ),
        currentReport:
          state.currentReport?._id === action.payload._id
            ? action.payload
            : state.currentReport,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.REMOVE_REPORT:
      return {
        ...state,
        reports: state.reports.filter((report) => report._id !== action.payload),
        currentReport:
          state.currentReport?._id === action.payload ? null : state.currentReport,
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.ADD_SCHEDULED_REPORT:
      return {
        ...state,
        scheduledReports: [action.payload, ...state.scheduledReports],
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.UPDATE_SCHEDULED_REPORT:
      return {
        ...state,
        scheduledReports: state.scheduledReports.map((report) =>
          report._id === action.payload._id ? action.payload : report
        ),
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.REMOVE_SCHEDULED_REPORT:
      return {
        ...state,
        scheduledReports: state.scheduledReports.filter(
          (report) => report._id !== action.payload
        ),
        isLoading: false,
        error: null,
      };

    case REPORT_ACTIONS.CLEAR_REPORT_DATA:
      return {
        ...initialState,
      };

    default:
      return state;
  }
};

// Create context
const ReportContext = createContext();

// Report provider component
export const ReportProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reportReducer, initialState);
  const { dateRange, pagination, filters } = useApp();

  // Get all reports
  const getReports = async (params = {}) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      const reports = await reportsAPI.getReports({
        page: pagination.page,
        limit: pagination.limit,
        dateRange,
        ...filters,
        ...params,
      });
      dispatch({ type: REPORT_ACTIONS.SET_REPORTS, payload: reports });
      return reports;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch reports';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get report by ID
  const getReportById = async (id) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      const report = await reportsAPI.getReportById(id);
      dispatch({ type: REPORT_ACTIONS.SET_CURRENT_REPORT, payload: report });
      return report;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch report';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Generate new report
  const generateReport = async (reportData) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      const report = await reportsAPI.generateReport(reportData);
      dispatch({ type: REPORT_ACTIONS.ADD_REPORT, payload: report });
      toast.success('Report generated successfully');
      return report;
    } catch (error) {
      const errorMessage = error.message || 'Failed to generate report';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get report templates
  const getReportTemplates = async () => {
    try {
      const templates = await reportsAPI.getReportTemplates();
      dispatch({ type: REPORT_ACTIONS.SET_REPORT_TEMPLATES, payload: templates });
      return templates;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch report templates';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get report metrics
  const getReportMetrics = async (params = {}) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      const metrics = await reportsAPI.getReportMetrics({
        dateRange,
        ...params,
      });
      dispatch({ type: REPORT_ACTIONS.SET_REPORT_METRICS, payload: metrics });
      return metrics;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch report metrics';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get financial reports
  const getFinancialReports = async (params = {}) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      const reports = await reportsAPI.getFinancialReports({
        dateRange,
        ...params,
      });
      dispatch({ type: REPORT_ACTIONS.SET_FINANCIAL_REPORTS, payload: reports });
      return reports;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch financial reports';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get performance reports
  const getPerformanceReports = async (params = {}) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      const reports = await reportsAPI.getPerformanceReports({
        dateRange,
        ...params,
      });
      dispatch({ type: REPORT_ACTIONS.SET_PERFORMANCE_REPORTS, payload: reports });
      return reports;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch performance reports';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get user reports
  const getUserReports = async (params = {}) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      const reports = await reportsAPI.getUserReports({
        dateRange,
        ...params,
      });
      dispatch({ type: REPORT_ACTIONS.SET_USER_REPORTS, payload: reports });
      return reports;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch user reports';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get investor reports
  const getInvestorReports = async (params = {}) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      const reports = await reportsAPI.getInvestorReports({
        dateRange,
        ...params,
      });
      dispatch({ type: REPORT_ACTIONS.SET_INVESTOR_REPORTS, payload: reports });
      return reports;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch investor reports';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get transaction reports
  const getTransactionReports = async (params = {}) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      const reports = await reportsAPI.getTransactionReports({
        dateRange,
        ...params,
      });
      dispatch({ type: REPORT_ACTIONS.SET_TRANSACTION_REPORTS, payload: reports });
      return reports;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch transaction reports';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get analytics data
  const getAnalyticsData = async (params = {}) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      const analytics = await reportsAPI.getAnalyticsData({
        dateRange,
        ...params,
      });
      dispatch({ type: REPORT_ACTIONS.SET_ANALYTICS_DATA, payload: analytics });
      return analytics;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch analytics data';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Export report
  const exportReport = async (id, format = 'pdf') => {
    try {
      const blob = await reportsAPI.exportReport(id, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${id}-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
      return blob;
    } catch (error) {
      const errorMessage = error.message || 'Failed to export report';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Schedule report
  const scheduleReport = async (reportData) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      const report = await reportsAPI.scheduleReport(reportData);
      dispatch({ type: REPORT_ACTIONS.ADD_SCHEDULED_REPORT, payload: report });
      toast.success('Report scheduled successfully');
      return report;
    } catch (error) {
      const errorMessage = error.message || 'Failed to schedule report';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get scheduled reports
  const getScheduledReports = async (params = {}) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      const reports = await reportsAPI.getScheduledReports(params);
      dispatch({ type: REPORT_ACTIONS.SET_SCHEDULED_REPORTS, payload: reports });
      return reports;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch scheduled reports';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Update scheduled report
  const updateScheduledReport = async (id, scheduleData) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      const report = await reportsAPI.updateScheduledReport(id, scheduleData);
      dispatch({ type: REPORT_ACTIONS.UPDATE_SCHEDULED_REPORT, payload: report });
      toast.success('Scheduled report updated successfully');
      return report;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update scheduled report';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Delete scheduled report
  const deleteScheduledReport = async (id) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      await reportsAPI.deleteScheduledReport(id);
      dispatch({ type: REPORT_ACTIONS.REMOVE_SCHEDULED_REPORT, payload: id });
      toast.success('Scheduled report deleted successfully');
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete scheduled report';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get report filters
  const getReportFilters = async (reportType) => {
    try {
      const filters = await reportsAPI.getReportFilters(reportType);
      dispatch({ type: REPORT_ACTIONS.SET_REPORT_FILTERS, payload: filters });
      return filters;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch report filters';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Search reports
  const searchReports = async (query, params = {}) => {
    try {
      dispatch({ type: REPORT_ACTIONS.SET_LOADING, payload: true });
      const searchResults = await reportsAPI.searchReports(query, params);
      dispatch({ type: REPORT_ACTIONS.SET_SEARCH_RESULTS, payload: searchResults });
      return searchResults;
    } catch (error) {
      const errorMessage = error.message || 'Failed to search reports';
      dispatch({ type: REPORT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Clear report data
  const clearReportData = () => {
    dispatch({ type: REPORT_ACTIONS.CLEAR_REPORT_DATA });
  };

  const value = {
    ...state,
    getReports,
    getReportById,
    generateReport,
    getReportTemplates,
    getReportMetrics,
    getFinancialReports,
    getPerformanceReports,
    getUserReports,
    getInvestorReports,
    getTransactionReports,
    getAnalyticsData,
    exportReport,
    scheduleReport,
    getScheduledReports,
    updateScheduledReport,
    deleteScheduledReport,
    getReportFilters,
    searchReports,
    clearReportData,
  };

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
};

// Custom hook to use report context
export const useReport = () => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReport must be used within a ReportProvider');
  }
  return context;
};

export default ReportContext;