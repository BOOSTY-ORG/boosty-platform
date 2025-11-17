import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { investorsAPI } from '../api/investors.js';
import { useApp } from './AppContext.jsx';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  investors: [],
  currentInvestor: null,
  investorMetrics: null,
  kycDocuments: [],
  investments: [],
  transactions: [],
  performance: null,
  stats: null,
  searchResults: [],
  isLoading: false,
  error: null,
};

// Action types
const INVESTOR_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_INVESTORS: 'SET_INVESTORS',
  SET_CURRENT_INVESTOR: 'SET_CURRENT_INVESTOR',
  SET_INVESTOR_METRICS: 'SET_INVESTOR_METRICS',
  SET_KYC_DOCUMENTS: 'SET_KYC_DOCUMENTS',
  SET_INVESTMENTS: 'SET_INVESTMENTS',
  SET_TRANSACTIONS: 'SET_TRANSACTIONS',
  SET_PERFORMANCE: 'SET_PERFORMANCE',
  SET_STATS: 'SET_STATS',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  ADD_INVESTOR: 'ADD_INVESTOR',
  UPDATE_INVESTOR: 'UPDATE_INVESTOR',
  REMOVE_INVESTOR: 'REMOVE_INVESTOR',
  CLEAR_INVESTOR_DATA: 'CLEAR_INVESTOR_DATA',
};

// Reducer function
const investorReducer = (state, action) => {
  switch (action.type) {
    case INVESTOR_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case INVESTOR_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case INVESTOR_ACTIONS.SET_INVESTORS:
      return {
        ...state,
        investors: action.payload.data || action.payload,
        isLoading: false,
        error: null,
      };

    case INVESTOR_ACTIONS.SET_CURRENT_INVESTOR:
      return {
        ...state,
        currentInvestor: action.payload,
        isLoading: false,
        error: null,
      };

    case INVESTOR_ACTIONS.SET_INVESTOR_METRICS:
      return {
        ...state,
        investorMetrics: action.payload,
        isLoading: false,
        error: null,
      };

    case INVESTOR_ACTIONS.SET_KYC_DOCUMENTS:
      return {
        ...state,
        kycDocuments: action.payload,
        isLoading: false,
        error: null,
      };

    case INVESTOR_ACTIONS.SET_INVESTMENTS:
      return {
        ...state,
        investments: action.payload,
        isLoading: false,
        error: null,
      };

    case INVESTOR_ACTIONS.SET_TRANSACTIONS:
      return {
        ...state,
        transactions: action.payload,
        isLoading: false,
        error: null,
      };

    case INVESTOR_ACTIONS.SET_PERFORMANCE:
      return {
        ...state,
        performance: action.payload,
        isLoading: false,
        error: null,
      };

    case INVESTOR_ACTIONS.SET_STATS:
      return {
        ...state,
        stats: action.payload,
        isLoading: false,
        error: null,
      };

    case INVESTOR_ACTIONS.SET_SEARCH_RESULTS:
      return {
        ...state,
        searchResults: action.payload.data || action.payload,
        isLoading: false,
        error: null,
      };

    case INVESTOR_ACTIONS.ADD_INVESTOR:
      return {
        ...state,
        investors: [action.payload, ...state.investors],
        isLoading: false,
        error: null,
      };

    case INVESTOR_ACTIONS.UPDATE_INVESTOR:
      return {
        ...state,
        investors: state.investors.map((investor) =>
          investor._id === action.payload._id ? action.payload : investor
        ),
        currentInvestor:
          state.currentInvestor?._id === action.payload._id
            ? action.payload
            : state.currentInvestor,
        isLoading: false,
        error: null,
      };

    case INVESTOR_ACTIONS.REMOVE_INVESTOR:
      return {
        ...state,
        investors: state.investors.filter(
          (investor) => investor._id !== action.payload
        ),
        currentInvestor:
          state.currentInvestor?._id === action.payload ? null : state.currentInvestor,
        isLoading: false,
        error: null,
      };

    case INVESTOR_ACTIONS.CLEAR_INVESTOR_DATA:
      return {
        ...initialState,
      };

    default:
      return state;
  }
};

// Create context
const InvestorContext = createContext();

// Investor provider component
export const InvestorProvider = ({ children }) => {
  const [state, dispatch] = useReducer(investorReducer, initialState);
  const { dateRange, pagination, filters } = useApp();

  // Get all investors
  const getInvestors = async (params = {}) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const response = await investorsAPI.getInvestors({
        page: pagination.page,
        limit: pagination.limit,
        dateRange,
        ...filters,
        ...params,
      });
      
      // Handle different response formats from backend
      const investors = response.data?.data || response.data || response;
      
      dispatch({ type: INVESTOR_ACTIONS.SET_INVESTORS, payload: investors });
      return investors;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch investors';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get investor by ID
  const getInvestorById = async (id) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const investor = await investorsAPI.getInvestorById(id);
      dispatch({ type: INVESTOR_ACTIONS.SET_CURRENT_INVESTOR, payload: investor });
      return investor;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch investor';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Create new investor
  const createInvestor = async (investorData) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const response = await investorsAPI.createInvestor(investorData);
      
      // Handle different response formats from backend
      const investor = response.data?.data || response.data || response;
      
      dispatch({ type: INVESTOR_ACTIONS.ADD_INVESTOR, payload: investor });
      toast.success('Investor created successfully');
      return investor;
    } catch (error) {
      const errorMessage = error.message || 'Failed to create investor';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Update investor
  const updateInvestor = async (id, investorData) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const response = await investorsAPI.updateInvestor(id, investorData);
      
      // Handle different response formats from backend
      const investor = response.data?.data || response.data || response;
      
      dispatch({ type: INVESTOR_ACTIONS.UPDATE_INVESTOR, payload: investor });
      toast.success('Investor updated successfully');
      return investor;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update investor';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Delete investor
  const deleteInvestor = async (id) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      await investorsAPI.deleteInvestor(id);
      dispatch({ type: INVESTOR_ACTIONS.REMOVE_INVESTOR, payload: id });
      toast.success('Investor deleted successfully');
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete investor';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get investor metrics
  const getInvestorMetrics = async (params = {}) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const metrics = await investorsAPI.getInvestorMetrics({
        dateRange,
        ...params,
      });
      dispatch({ type: INVESTOR_ACTIONS.SET_INVESTOR_METRICS, payload: metrics });
      return metrics;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch investor metrics';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get investor KYC documents
  const getInvestorKYC = async (id) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const response = await investorsAPI.getInvestorKYC(id);
      
      // Handle different response formats from backend
      const kycDocuments = response.data?.data || response.data || response;
      
      dispatch({ type: INVESTOR_ACTIONS.SET_KYC_DOCUMENTS, payload: kycDocuments });
      return kycDocuments;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch KYC documents';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Upload KYC document
  const uploadKYCDocument = async (id, formData) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const result = await investorsAPI.uploadKYCDocument(id, formData);
      toast.success('KYC document uploaded successfully');
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to upload KYC document';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Verify KYC document
  const verifyKYCDocument = async (id, documentId) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const result = await investorsAPI.verifyKYCDocument(id, documentId);
      toast.success('KYC document verified successfully');
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to verify KYC document';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get investor investments
  const getInvestorInvestments = async (id, params = {}) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const investments = await investorsAPI.getInvestorInvestments(id, params);
      dispatch({ type: INVESTOR_ACTIONS.SET_INVESTMENTS, payload: investments });
      return investments;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch investor investments';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get investor transactions
  const getInvestorTransactions = async (id, params = {}) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const transactions = await investorsAPI.getInvestorTransactions(id, params);
      dispatch({ type: INVESTOR_ACTIONS.SET_TRANSACTIONS, payload: transactions });
      return transactions;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch investor transactions';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get investor performance
  const getInvestorPerformance = async (id, period = '1y') => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const performance = await investorsAPI.getInvestorPerformance(id, period);
      dispatch({ type: INVESTOR_ACTIONS.SET_PERFORMANCE, payload: performance });
      return performance;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch investor performance';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get investor statistics
  const getInvestorStats = async (customFilters = {}) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const stats = await investorsAPI.getInvestorStats({
        dateRange,
        ...filters,
        ...customFilters,
      });
      dispatch({ type: INVESTOR_ACTIONS.SET_STATS, payload: stats });
      return stats;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch investor statistics';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Search investors
  const searchInvestors = async (query, params = {}) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const searchResults = await investorsAPI.searchInvestors(query, params);
      dispatch({ type: INVESTOR_ACTIONS.SET_SEARCH_RESULTS, payload: searchResults });
      return searchResults;
    } catch (error) {
      const errorMessage = error.message || 'Failed to search investors';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Clear investor data
  const clearInvestorData = () => {
    dispatch({ type: INVESTOR_ACTIONS.CLEAR_INVESTOR_DATA });
  };

  const value = {
    ...state,
    getInvestors,
    getInvestorById,
    createInvestor,
    updateInvestor,
    deleteInvestor,
    getInvestorMetrics,
    getInvestorKYC,
    uploadKYCDocument,
    verifyKYCDocument,
    getInvestorInvestments,
    getInvestorTransactions,
    getInvestorPerformance,
    getInvestorStats,
    searchInvestors,
    clearInvestorData,
  };

  return <InvestorContext.Provider value={value}>{children}</InvestorContext.Provider>;
};

// Custom hook to use investor context
export const useInvestor = () => {
  const context = useContext(InvestorContext);
  if (!context) {
    throw new Error('useInvestor must be used within an InvestorProvider');
  }
  return context;
};

export default InvestorContext;