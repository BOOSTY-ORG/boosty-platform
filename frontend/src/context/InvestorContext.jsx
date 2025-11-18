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
  // KYC filtering and sorting state
  kycFilters: {
    status: '',
    submissionDateRange: { start: '', end: '' },
    verificationDateRange: { start: '', end: '' },
    lastUpdatedRange: { start: '', end: '' },
  },
  kycSort: {
    field: 'createdAt',
    direction: 'desc'
  },
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
  // KYC filtering and sorting actions
  SET_KYC_FILTERS: 'SET_KYC_FILTERS',
  UPDATE_KYC_FILTER: 'UPDATE_KYC_FILTER',
  CLEAR_KYC_FILTERS: 'CLEAR_KYC_FILTERS',
  SET_KYC_SORT: 'SET_KYC_SORT',
  RESET_KYC_SORT: 'RESET_KYC_SORT',
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

    case INVESTOR_ACTIONS.SET_KYC_FILTERS:
      return {
        ...state,
        kycFilters: action.payload,
      };

    case INVESTOR_ACTIONS.UPDATE_KYC_FILTER:
      return {
        ...state,
        kycFilters: {
          ...state.kycFilters,
          [action.payload.key]: action.payload.value,
        },
      };

    case INVESTOR_ACTIONS.CLEAR_KYC_FILTERS:
      return {
        ...state,
        kycFilters: initialState.kycFilters,
      };

    case INVESTOR_ACTIONS.SET_KYC_SORT:
      return {
        ...state,
        kycSort: action.payload,
      };

    case INVESTOR_ACTIONS.RESET_KYC_SORT:
      return {
        ...state,
        kycSort: initialState.kycSort,
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
  const verifyKYCDocument = async (id, documentId, verificationData = {}) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const result = await investorsAPI.verifyKYCDocument(id, documentId, verificationData);
      toast.success('KYC document verified successfully');
      // Refresh KYC documents after verification
      await getInvestorKYC(id);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to verify KYC document';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Reject KYC document
  const rejectKYCDocument = async (id, documentId, rejectionData) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const result = await investorsAPI.rejectKYCDocument(id, documentId, rejectionData);
      toast.success('KYC document rejected successfully');
      // Refresh KYC documents after rejection
      await getInvestorKYC(id);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to reject KYC document';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Flag KYC document for review
  const flagKYCDocument = async (id, documentId, flagData) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const result = await investorsAPI.flagKYCDocument(id, documentId, flagData);
      toast.success('KYC document flagged for review successfully');
      // Refresh KYC documents after flagging
      await getInvestorKYC(id);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to flag KYC document';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get document verification history
  const getDocumentHistory = async (id, documentId) => {
    try {
      const result = await investorsAPI.getDocumentHistory(id, documentId);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch document history';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get document AI analysis
  const getDocumentAIAnalysis = async (id, documentId) => {
    try {
      const result = await investorsAPI.getDocumentAIAnalysis(id, documentId);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch AI analysis';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Re-run AI analysis on document
  const rerunAIAnalysis = async (id, documentId) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const result = await investorsAPI.rerunAIAnalysis(id, documentId);
      toast.success('AI analysis re-run successfully');
      // Refresh KYC documents after analysis
      await getInvestorKYC(id);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to re-run AI analysis';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Bulk verify documents
  const bulkVerifyDocuments = async (id, documentIds, verificationData = {}) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const result = await investorsAPI.bulkVerifyDocuments(id, documentIds, verificationData);
      toast.success(`${documentIds.length} documents verified successfully`);
      // Refresh KYC documents after bulk verification
      await getInvestorKYC(id);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to bulk verify documents';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Bulk reject documents
  const bulkRejectDocuments = async (id, documentIds, rejectionData) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      const result = await investorsAPI.bulkRejectDocuments(id, documentIds, rejectionData);
      toast.success(`${documentIds.length} documents rejected successfully`);
      // Refresh KYC documents after bulk rejection
      await getInvestorKYC(id);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to bulk reject documents';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Compare documents
  const compareDocuments = async (id, documentIds) => {
    try {
      const result = await investorsAPI.compareDocuments(id, documentIds);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to compare documents';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get KYC metrics and analytics
  const getKYCMetrics = async (params = {}) => {
    try {
      const result = await investorsAPI.getKYCMetrics(params);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch KYC metrics';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get KYC analytics
  const getKYCAnalytics = async (params = {}) => {
    try {
      const result = await investorsAPI.getKYCAnalytics(params);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch KYC analytics';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get documents expiring soon
  const getExpiringDocuments = async (days = 30) => {
    try {
      const result = await investorsAPI.getExpiringDocuments(days);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch expiring documents';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get documents with flags
  const getFlaggedDocuments = async (params = {}) => {
    try {
      const result = await investorsAPI.getFlaggedDocuments(params);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch flagged documents';
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

  // KYC filtering and sorting functions
  const setKYCFilters = (filters) => {
    dispatch({ type: INVESTOR_ACTIONS.SET_KYC_FILTERS, payload: filters });
  };

  const updateKYCFilter = (key, value) => {
    dispatch({ type: INVESTOR_ACTIONS.UPDATE_KYC_FILTER, payload: { key, value } });
  };

  const clearKYCFilters = () => {
    dispatch({ type: INVESTOR_ACTIONS.CLEAR_KYC_FILTERS });
  };

  const setKYCSort = (sort) => {
    dispatch({ type: INVESTOR_ACTIONS.SET_KYC_SORT, payload: sort });
  };

  const resetKYCSort = () => {
    dispatch({ type: INVESTOR_ACTIONS.RESET_KYC_SORT });
  };

  // Get investors with KYC filtering and sorting
  const getInvestorsWithKYCFilters = async (params = {}) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      
      // Combine KYC filters with other params
      const combinedParams = {
        page: pagination.page,
        limit: pagination.limit,
        dateRange,
        ...filters,
        ...params,
        // Add KYC specific filters
        kycStatus: state.kycFilters.status,
        kycSubmissionDateFrom: state.kycFilters.submissionDateRange.start,
        kycSubmissionDateTo: state.kycFilters.submissionDateRange.end,
        kycVerificationDateFrom: state.kycFilters.verificationDateRange.start,
        kycVerificationDateTo: state.kycFilters.verificationDateRange.end,
        kycLastUpdatedFrom: state.kycFilters.lastUpdatedRange.start,
        kycLastUpdatedTo: state.kycFilters.lastUpdatedRange.end,
        // Add KYC sorting
        sort: state.kycSort.field ? `${state.kycSort.field}:${state.kycSort.direction}` : undefined,
      };
      
      const response = await investorsAPI.getInvestors(combinedParams);
      
      // Handle different response formats from backend
      const investors = response.data?.data || response.data || response;
      
      dispatch({ type: INVESTOR_ACTIONS.SET_INVESTORS, payload: investors });
      return investors;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch investors with KYC filters';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get KYC statistics
  const getKYCStats = async (customFilters = {}) => {
    try {
      dispatch({ type: INVESTOR_ACTIONS.SET_LOADING, payload: true });
      
      const statsParams = {
        dateRange,
        ...filters,
        ...customFilters,
        // Add KYC specific filters
        kycStatus: state.kycFilters.status,
        kycSubmissionDateFrom: state.kycFilters.submissionDateRange.start,
        kycSubmissionDateTo: state.kycFilters.submissionDateRange.end,
        kycVerificationDateFrom: state.kycFilters.verificationDateRange.start,
        kycVerificationDateTo: state.kycFilters.verificationDateRange.end,
        kycLastUpdatedFrom: state.kycFilters.lastUpdatedRange.start,
        kycLastUpdatedTo: state.kycFilters.lastUpdatedRange.end,
      };
      
      const stats = await investorsAPI.getKYCMetrics(statsParams);
      
      dispatch({ type: INVESTOR_ACTIONS.SET_STATS, payload: stats });
      return stats;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch KYC statistics';
      dispatch({ type: INVESTOR_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
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
    rejectKYCDocument,
    flagKYCDocument,
    getDocumentHistory,
    getDocumentAIAnalysis,
    rerunAIAnalysis,
    bulkVerifyDocuments,
    bulkRejectDocuments,
    compareDocuments,
    getKYCMetrics,
    getKYCAnalytics,
    getExpiringDocuments,
    getFlaggedDocuments,
    getInvestorInvestments,
    getInvestorTransactions,
    getInvestorPerformance,
    getInvestorStats,
    searchInvestors,
    clearInvestorData,
    // KYC filtering and sorting functions
    setKYCFilters,
    updateKYCFilter,
    clearKYCFilters,
    setKYCSort,
    resetKYCSort,
    getInvestorsWithKYCFilters,
    getKYCStats,
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