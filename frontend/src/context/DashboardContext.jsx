import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { dashboardAPI } from '../api/dashboard.js';
import { useApp } from './AppContext.js';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  overview: null,
  metrics: [],
  realTimeData: null,
  summaryStats: null,
  performanceMetrics: null,
  activityLogs: [],
  systemHealth: null,
  recentTransactions: [],
  userActivity: null,
  financialSummary: null,
  isLoading: false,
  error: null,
};

// Action types
const DASHBOARD_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_OVERVIEW: 'SET_OVERVIEW',
  SET_METRICS: 'SET_METRICS',
  SET_REAL_TIME_DATA: 'SET_REAL_TIME_DATA',
  SET_SUMMARY_STATS: 'SET_SUMMARY_STATS',
  SET_PERFORMANCE_METRICS: 'SET_PERFORMANCE_METRICS',
  SET_ACTIVITY_LOGS: 'SET_ACTIVITY_LOGS',
  SET_SYSTEM_HEALTH: 'SET_SYSTEM_HEALTH',
  SET_RECENT_TRANSACTIONS: 'SET_RECENT_TRANSACTIONS',
  SET_USER_ACTIVITY: 'SET_USER_ACTIVITY',
  SET_FINANCIAL_SUMMARY: 'SET_FINANCIAL_SUMMARY',
  CLEAR_DASHBOARD_DATA: 'CLEAR_DASHBOARD_DATA',
};

// Reducer function
const dashboardReducer = (state, action) => {
  switch (action.type) {
    case DASHBOARD_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case DASHBOARD_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case DASHBOARD_ACTIONS.SET_OVERVIEW:
      return {
        ...state,
        overview: action.payload,
        isLoading: false,
        error: null,
      };

    case DASHBOARD_ACTIONS.SET_METRICS:
      return {
        ...state,
        metrics: action.payload,
        isLoading: false,
        error: null,
      };

    case DASHBOARD_ACTIONS.SET_REAL_TIME_DATA:
      return {
        ...state,
        realTimeData: action.payload,
        isLoading: false,
        error: null,
      };

    case DASHBOARD_ACTIONS.SET_SUMMARY_STATS:
      return {
        ...state,
        summaryStats: action.payload,
        isLoading: false,
        error: null,
      };

    case DASHBOARD_ACTIONS.SET_PERFORMANCE_METRICS:
      return {
        ...state,
        performanceMetrics: action.payload,
        isLoading: false,
        error: null,
      };

    case DASHBOARD_ACTIONS.SET_ACTIVITY_LOGS:
      return {
        ...state,
        activityLogs: action.payload,
        isLoading: false,
        error: null,
      };

    case DASHBOARD_ACTIONS.SET_SYSTEM_HEALTH:
      return {
        ...state,
        systemHealth: action.payload,
        isLoading: false,
        error: null,
      };

    case DASHBOARD_ACTIONS.SET_RECENT_TRANSACTIONS:
      return {
        ...state,
        recentTransactions: action.payload,
        isLoading: false,
        error: null,
      };

    case DASHBOARD_ACTIONS.SET_USER_ACTIVITY:
      return {
        ...state,
        userActivity: action.payload,
        isLoading: false,
        error: null,
      };

    case DASHBOARD_ACTIONS.SET_FINANCIAL_SUMMARY:
      return {
        ...state,
        financialSummary: action.payload,
        isLoading: false,
        error: null,
      };

    case DASHBOARD_ACTIONS.CLEAR_DASHBOARD_DATA:
      return {
        ...initialState,
      };

    default:
      return state;
  }
};

// Create context
const DashboardContext = createContext();

// Dashboard provider component
export const DashboardProvider = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const { dateRange, setLoading, setError } = useApp();

  // Get dashboard overview
  const getOverview = async (params = {}) => {
    try {
      dispatch({ type: DASHBOARD_ACTIONS.SET_LOADING, payload: true });
      const overview = await dashboardAPI.getOverview({ dateRange, ...params });
      dispatch({ type: DASHBOARD_ACTIONS.SET_OVERVIEW, payload: overview });
      return overview;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch dashboard overview';
      dispatch({ type: DASHBOARD_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get dashboard metrics
  const getMetrics = async (params = {}) => {
    try {
      dispatch({ type: DASHBOARD_ACTIONS.SET_LOADING, payload: true });
      const metrics = await dashboardAPI.getMetrics({ dateRange, ...params });
      dispatch({ type: DASHBOARD_ACTIONS.SET_METRICS, payload: metrics });
      return metrics;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch dashboard metrics';
      dispatch({ type: DASHBOARD_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get real-time data
  const getRealTimeData = async () => {
    try {
      const realTimeData = await dashboardAPI.getRealTimeData();
      dispatch({ type: DASHBOARD_ACTIONS.SET_REAL_TIME_DATA, payload: realTimeData });
      return realTimeData;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch real-time data';
      dispatch({ type: DASHBOARD_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get summary statistics
  const getSummaryStats = async (customDateRange) => {
    try {
      dispatch({ type: DASHBOARD_ACTIONS.SET_LOADING, payload: true });
      const summaryStats = await dashboardAPI.getSummaryStats(customDateRange || dateRange);
      dispatch({ type: DASHBOARD_ACTIONS.SET_SUMMARY_STATS, payload: summaryStats });
      return summaryStats;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch summary statistics';
      dispatch({ type: DASHBOARD_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get performance metrics
  const getPerformanceMetrics = async (period = '30d') => {
    try {
      dispatch({ type: DASHBOARD_ACTIONS.SET_LOADING, payload: true });
      const performanceMetrics = await dashboardAPI.getPerformanceMetrics(period);
      dispatch({ type: DASHBOARD_ACTIONS.SET_PERFORMANCE_METRICS, payload: performanceMetrics });
      return performanceMetrics;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch performance metrics';
      dispatch({ type: DASHBOARD_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get activity logs
  const getActivityLogs = async (params = {}) => {
    try {
      dispatch({ type: DASHBOARD_ACTIONS.SET_LOADING, payload: true });
      const activityLogs = await dashboardAPI.getActivityLogs(params);
      dispatch({ type: DASHBOARD_ACTIONS.SET_ACTIVITY_LOGS, payload: activityLogs });
      return activityLogs;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch activity logs';
      dispatch({ type: DASHBOARD_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get system health
  const getSystemHealth = async () => {
    try {
      const systemHealth = await dashboardAPI.getSystemHealth();
      dispatch({ type: DASHBOARD_ACTIONS.SET_SYSTEM_HEALTH, payload: systemHealth });
      return systemHealth;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch system health';
      dispatch({ type: DASHBOARD_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get recent transactions
  const getRecentTransactions = async (limit = 10) => {
    try {
      const recentTransactions = await dashboardAPI.getRecentTransactions(limit);
      dispatch({ type: DASHBOARD_ACTIONS.SET_RECENT_TRANSACTIONS, payload: recentTransactions });
      return recentTransactions;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch recent transactions';
      dispatch({ type: DASHBOARD_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get user activity
  const getUserActivity = async (params = {}) => {
    try {
      dispatch({ type: DASHBOARD_ACTIONS.SET_LOADING, payload: true });
      const userActivity = await dashboardAPI.getUserActivity({ dateRange, ...params });
      dispatch({ type: DASHBOARD_ACTIONS.SET_USER_ACTIVITY, payload: userActivity });
      return userActivity;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch user activity';
      dispatch({ type: DASHBOARD_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get financial summary
  const getFinancialSummary = async (customDateRange) => {
    try {
      dispatch({ type: DASHBOARD_ACTIONS.SET_LOADING, payload: true });
      const financialSummary = await dashboardAPI.getFinancialSummary(customDateRange || dateRange);
      dispatch({ type: DASHBOARD_ACTIONS.SET_FINANCIAL_SUMMARY, payload: financialSummary });
      return financialSummary;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch financial summary';
      dispatch({ type: DASHBOARD_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Clear dashboard data
  const clearDashboardData = () => {
    dispatch({ type: DASHBOARD_ACTIONS.CLEAR_DASHBOARD_DATA });
  };

  const value = {
    ...state,
    getOverview,
    getMetrics,
    getRealTimeData,
    getSummaryStats,
    getPerformanceMetrics,
    getActivityLogs,
    getSystemHealth,
    getRecentTransactions,
    getUserActivity,
    getFinancialSummary,
    clearDashboardData,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

// Custom hook to use dashboard context
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export default DashboardContext;