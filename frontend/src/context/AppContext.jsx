import React, { createContext, useContext, useReducer, useEffect } from 'react';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  theme: localStorage.getItem('theme') || 'light',
  sidebarOpen: true,
  notifications: [],
  loading: false,
  error: null,
  currentPage: 'dashboard',
  dateRange: {
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  },
  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
};

// Action types
const APP_ACTIONS = {
  SET_THEME: 'SET_THEME',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_SIDEBAR_OPEN: 'SET_SIDEBAR_OPEN',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  SET_DATE_RANGE: 'SET_DATE_RANGE',
  SET_FILTERS: 'SET_FILTERS',
  UPDATE_FILTER: 'UPDATE_FILTER',
  CLEAR_FILTERS: 'CLEAR_FILTERS',
  SET_PAGINATION: 'SET_PAGINATION',
  UPDATE_PAGINATION: 'UPDATE_PAGINATION',
};

// Reducer function
const appReducer = (state, action) => {
  switch (action.type) {
    case APP_ACTIONS.SET_THEME:
      return {
        ...state,
        theme: action.payload,
      };

    case APP_ACTIONS.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
      };

    case APP_ACTIONS.SET_SIDEBAR_OPEN:
      return {
        ...state,
        sidebarOpen: action.payload,
      };

    case APP_ACTIONS.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };

    case APP_ACTIONS.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(
          (notification) => notification.id !== action.payload,
        ),
      };

    case APP_ACTIONS.CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: [],
      };

    case APP_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    case APP_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };

    case APP_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case APP_ACTIONS.SET_CURRENT_PAGE:
      return {
        ...state,
        currentPage: action.payload,
      };

    case APP_ACTIONS.SET_DATE_RANGE:
      return {
        ...state,
        dateRange: action.payload,
      };

    case APP_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: action.payload,
      };

    case APP_ACTIONS.UPDATE_FILTER:
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.key]: action.payload.value,
        },
      };

    case APP_ACTIONS.CLEAR_FILTERS:
      return {
        ...state,
        filters: {},
      };

    case APP_ACTIONS.SET_PAGINATION:
      return {
        ...state,
        pagination: action.payload,
      };

    case APP_ACTIONS.UPDATE_PAGINATION:
      return {
        ...state,
        pagination: {
          ...state.pagination,
          ...action.payload,
        },
      };

    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// App provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Theme management
  const setTheme = (theme) => {
    localStorage.setItem('theme', theme);
    dispatch({ type: APP_ACTIONS.SET_THEME, payload: theme });
  };

  const toggleTheme = () => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // Sidebar management
  const toggleSidebar = () => {
    dispatch({ type: APP_ACTIONS.TOGGLE_SIDEBAR });
  };

  const setSidebarOpen = (open) => {
    dispatch({ type: APP_ACTIONS.SET_SIDEBAR_OPEN, payload: open });
  };

  // Notification management
  const addNotification = (notification) => {
    const id = Date.now().toString();
    const newNotification = {
      id,
      type: 'info',
      autoClose: true,
      duration: 5000,
      ...notification,
    };

    dispatch({ type: APP_ACTIONS.ADD_NOTIFICATION, payload: newNotification });

    if (newNotification.autoClose) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  };

  const removeNotification = (id) => {
    dispatch({ type: APP_ACTIONS.REMOVE_NOTIFICATION, payload: id });
  };

  const clearNotifications = () => {
    dispatch({ type: APP_ACTIONS.CLEAR_NOTIFICATIONS });
  };

  // Loading and error management
  const setLoading = (loading) => {
    dispatch({ type: APP_ACTIONS.SET_LOADING, payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: APP_ACTIONS.SET_ERROR, payload: error });
    if (error) {
      toast.error(error);
    }
  };

  const clearError = () => {
    dispatch({ type: APP_ACTIONS.CLEAR_ERROR });
  };

  // Page management
  const setCurrentPage = (page) => {
    dispatch({ type: APP_ACTIONS.SET_CURRENT_PAGE, payload: page });
  };

  // Date range management
  const setDateRange = (dateRange) => {
    dispatch({ type: APP_ACTIONS.SET_DATE_RANGE, payload: dateRange });
  };

  // Filter management
  const setFilters = (filters) => {
    dispatch({ type: APP_ACTIONS.SET_FILTERS, payload: filters });
  };

  const updateFilter = (key, value) => {
    dispatch({ type: APP_ACTIONS.UPDATE_FILTER, payload: { key, value } });
  };

  const clearFilters = () => {
    dispatch({ type: APP_ACTIONS.CLEAR_FILTERS });
  };

  // Pagination management
  const setPagination = (pagination) => {
    dispatch({ type: APP_ACTIONS.SET_PAGINATION, payload: pagination });
  };

  const updatePagination = (pagination) => {
    dispatch({ type: APP_ACTIONS.UPDATE_PAGINATION, payload: pagination });
  };

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  const value = {
    ...state,
    setTheme,
    toggleTheme,
    toggleSidebar,
    setSidebarOpen,
    addNotification,
    removeNotification,
    clearNotifications,
    setLoading,
    setError,
    clearError,
    setCurrentPage,
    setDateRange,
    setFilters,
    updateFilter,
    clearFilters,
    setPagination,
    updatePagination,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom hook to use app context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;