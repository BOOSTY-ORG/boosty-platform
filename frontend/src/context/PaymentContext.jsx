import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { paymentsAPI } from '../api/payments.js';
import { useApp } from './AppContext.js';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  payments: [],
  currentPayment: null,
  paymentMetrics: null,
  transactionLedger: [],
  payoutConfirmations: [],
  paymentStats: null,
  searchResults: [],
  paymentHistory: [],
  isLoading: false,
  error: null,
};

// Action types
const PAYMENT_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_PAYMENTS: 'SET_PAYMENTS',
  SET_CURRENT_PAYMENT: 'SET_CURRENT_PAYMENT',
  SET_PAYMENT_METRICS: 'SET_PAYMENT_METRICS',
  SET_TRANSACTION_LEDGER: 'SET_TRANSACTION_LEDGER',
  SET_PAYOUT_CONFIRMATIONS: 'SET_PAYOUT_CONFIRMATIONS',
  SET_STATS: 'SET_STATS',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  SET_PAYMENT_HISTORY: 'SET_PAYMENT_HISTORY',
  ADD_PAYMENT: 'ADD_PAYMENT',
  UPDATE_PAYMENT: 'UPDATE_PAYMENT',
  REMOVE_PAYMENT: 'REMOVE_PAYMENT',
  CONFIRM_PAYOUT: 'CONFIRM_PAYOUT',
  PROCESS_REFUND: 'PROCESS_REFUND',
  CLEAR_PAYMENT_DATA: 'CLEAR_PAYMENT_DATA',
};

// Reducer function
const paymentReducer = (state, action) => {
  switch (action.type) {
    case PAYMENT_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case PAYMENT_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case PAYMENT_ACTIONS.SET_PAYMENTS:
      return {
        ...state,
        payments: action.payload,
        isLoading: false,
        error: null,
      };

    case PAYMENT_ACTIONS.SET_CURRENT_PAYMENT:
      return {
        ...state,
        currentPayment: action.payload,
        isLoading: false,
        error: null,
      };

    case PAYMENT_ACTIONS.SET_PAYMENT_METRICS:
      return {
        ...state,
        paymentMetrics: action.payload,
        isLoading: false,
        error: null,
      };

    case PAYMENT_ACTIONS.SET_TRANSACTION_LEDGER:
      return {
        ...state,
        transactionLedger: action.payload,
        isLoading: false,
        error: null,
      };

    case PAYMENT_ACTIONS.SET_PAYOUT_CONFIRMATIONS:
      return {
        ...state,
        payoutConfirmations: action.payload,
        isLoading: false,
        error: null,
      };

    case PAYMENT_ACTIONS.SET_STATS:
      return {
        ...state,
        paymentStats: action.payload,
        isLoading: false,
        error: null,
      };

    case PAYMENT_ACTIONS.SET_SEARCH_RESULTS:
      return {
        ...state,
        searchResults: action.payload,
        isLoading: false,
        error: null,
      };

    case PAYMENT_ACTIONS.SET_PAYMENT_HISTORY:
      return {
        ...state,
        paymentHistory: action.payload,
        isLoading: false,
        error: null,
      };

    case PAYMENT_ACTIONS.ADD_PAYMENT:
      return {
        ...state,
        payments: [action.payload, ...state.payments],
        isLoading: false,
        error: null,
      };

    case PAYMENT_ACTIONS.UPDATE_PAYMENT:
      return {
        ...state,
        payments: state.payments.map((payment) =>
          payment._id === action.payload._id ? action.payload : payment
        ),
        currentPayment:
          state.currentPayment?._id === action.payload._id
            ? action.payload
            : state.currentPayment,
        isLoading: false,
        error: null,
      };

    case PAYMENT_ACTIONS.REMOVE_PAYMENT:
      return {
        ...state,
        payments: state.payments.filter(
          (payment) => payment._id !== action.payload
        ),
        currentPayment:
          state.currentPayment?._id === action.payload ? null : state.currentPayment,
        isLoading: false,
        error: null,
      };

    case PAYMENT_ACTIONS.CONFIRM_PAYOUT:
      return {
        ...state,
        payments: state.payments.map((payment) =>
          payment._id === action.payload._id ? action.payload : payment
        ),
        isLoading: false,
        error: null,
      };

    case PAYMENT_ACTIONS.PROCESS_REFUND:
      return {
        ...state,
        payments: state.payments.map((payment) =>
          payment._id === action.payload._id ? action.payload : payment
        ),
        isLoading: false,
        error: null,
      };

    case PAYMENT_ACTIONS.CLEAR_PAYMENT_DATA:
      return {
        ...initialState,
      };

    default:
      return state;
  }
};

// Create context
const PaymentContext = createContext();

// Payment provider component
export const PaymentProvider = ({ children }) => {
  const [state, dispatch] = useReducer(paymentReducer, initialState);
  const { dateRange, pagination, filters } = useApp();

  // Get all payments
  const getPayments = async (params = {}) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      const payments = await paymentsAPI.getPayments({
        page: pagination.page,
        limit: pagination.limit,
        dateRange,
        ...filters,
        ...params,
      });
      dispatch({ type: PAYMENT_ACTIONS.SET_PAYMENTS, payload: payments });
      return payments;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch payments';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get payment by ID
  const getPaymentById = async (id) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      const payment = await paymentsAPI.getPaymentById(id);
      dispatch({ type: PAYMENT_ACTIONS.SET_CURRENT_PAYMENT, payload: payment });
      return payment;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch payment';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Create new payment
  const createPayment = async (paymentData) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      const payment = await paymentsAPI.createPayment(paymentData);
      dispatch({ type: PAYMENT_ACTIONS.ADD_PAYMENT, payload: payment });
      toast.success('Payment created successfully');
      return payment;
    } catch (error) {
      const errorMessage = error.message || 'Failed to create payment';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Update payment
  const updatePayment = async (id, paymentData) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      const payment = await paymentsAPI.updatePayment(id, paymentData);
      dispatch({ type: PAYMENT_ACTIONS.UPDATE_PAYMENT, payload: payment });
      toast.success('Payment updated successfully');
      return payment;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update payment';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Delete payment
  const deletePayment = async (id) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      await paymentsAPI.deletePayment(id);
      dispatch({ type: PAYMENT_ACTIONS.REMOVE_PAYMENT, payload: id });
      toast.success('Payment deleted successfully');
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete payment';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get payment metrics
  const getPaymentMetrics = async (params = {}) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      const metrics = await paymentsAPI.getPaymentMetrics({
        dateRange,
        ...params,
      });
      dispatch({ type: PAYMENT_ACTIONS.SET_PAYMENT_METRICS, payload: metrics });
      return metrics;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch payment metrics';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get transaction ledger
  const getTransactionLedger = async (params = {}) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      const ledger = await paymentsAPI.getTransactionLedger({
        dateRange,
        ...params,
      });
      dispatch({ type: PAYMENT_ACTIONS.SET_TRANSACTION_LEDGER, payload: ledger });
      return ledger;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch transaction ledger';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get payout confirmations
  const getPayoutConfirmations = async (params = {}) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      const confirmations = await paymentsAPI.getPayoutConfirmations({
        dateRange,
        ...params,
      });
      dispatch({ type: PAYMENT_ACTIONS.SET_PAYOUT_CONFIRMATIONS, payload: confirmations });
      return confirmations;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch payout confirmations';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Confirm payout
  const confirmPayout = async (id, confirmationData) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      const payment = await paymentsAPI.confirmPayout(id, confirmationData);
      dispatch({ type: PAYMENT_ACTIONS.CONFIRM_PAYOUT, payload: payment });
      toast.success('Payout confirmed successfully');
      return payment;
    } catch (error) {
      const errorMessage = error.message || 'Failed to confirm payout';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get payment statistics
  const getPaymentStats = async (customFilters = {}) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      const stats = await paymentsAPI.getPaymentStats({
        dateRange,
        ...filters,
        ...customFilters,
      });
      dispatch({ type: PAYMENT_ACTIONS.SET_STATS, payload: stats });
      return stats;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch payment statistics';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get payments by investor
  const getPaymentsByInvestor = async (investorId, params = {}) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      const payments = await paymentsAPI.getPaymentsByInvestor(investorId, {
        dateRange,
        ...params,
      });
      dispatch({ type: PAYMENT_ACTIONS.SET_PAYMENTS, payload: payments });
      return payments;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch investor payments';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get payments by user
  const getPaymentsByUser = async (userId, params = {}) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      const payments = await paymentsAPI.getPaymentsByUser(userId, {
        dateRange,
        ...params,
      });
      dispatch({ type: PAYMENT_ACTIONS.SET_PAYMENTS, payload: payments });
      return payments;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch user payments';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Process refund
  const processRefund = async (id, refundData) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      const payment = await paymentsAPI.processRefund(id, refundData);
      dispatch({ type: PAYMENT_ACTIONS.PROCESS_REFUND, payload: payment });
      toast.success('Refund processed successfully');
      return payment;
    } catch (error) {
      const errorMessage = error.message || 'Failed to process refund';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get payment history
  const getPaymentHistory = async (params = {}) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      const history = await paymentsAPI.getPaymentHistory({
        dateRange,
        ...params,
      });
      dispatch({ type: PAYMENT_ACTIONS.SET_PAYMENT_HISTORY, payload: history });
      return history;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch payment history';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Export payments
  const exportPayments = async (params = {}) => {
    try {
      const blob = await paymentsAPI.exportPayments({
        dateRange,
        ...filters,
        ...params,
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payments-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Payments exported successfully');
      return blob;
    } catch (error) {
      const errorMessage = error.message || 'Failed to export payments';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Search payments
  const searchPayments = async (query, params = {}) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
      const searchResults = await paymentsAPI.searchPayments(query, params);
      dispatch({ type: PAYMENT_ACTIONS.SET_SEARCH_RESULTS, payload: searchResults });
      return searchResults;
    } catch (error) {
      const errorMessage = error.message || 'Failed to search payments';
      dispatch({ type: PAYMENT_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Clear payment data
  const clearPaymentData = () => {
    dispatch({ type: PAYMENT_ACTIONS.CLEAR_PAYMENT_DATA });
  };

  const value = {
    ...state,
    getPayments,
    getPaymentById,
    createPayment,
    updatePayment,
    deletePayment,
    getPaymentMetrics,
    getTransactionLedger,
    getPayoutConfirmations,
    confirmPayout,
    getPaymentStats,
    getPaymentsByInvestor,
    getPaymentsByUser,
    processRefund,
    getPaymentHistory,
    exportPayments,
    searchPayments,
    clearPaymentData,
  };

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
};

// Custom hook to use payment context
export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};

export default PaymentContext;