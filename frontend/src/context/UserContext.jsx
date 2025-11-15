import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { usersAPI } from '../api/users.js';
import { useApp } from './AppContext.jsx';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  users: [],
  currentUser: null,
  userMetrics: null,
  applications: [],
  installations: [],
  userStats: null,
  searchResults: [],
  documents: [],
  isLoading: false,
  error: null,
};

// Action types
const USER_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_USERS: 'SET_USERS',
  SET_CURRENT_USER: 'SET_CURRENT_USER',
  SET_USER_METRICS: 'SET_USER_METRICS',
  SET_APPLICATIONS: 'SET_APPLICATIONS',
  SET_INSTALLATIONS: 'SET_INSTALLATIONS',
  SET_STATS: 'SET_STATS',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  SET_DOCUMENTS: 'SET_DOCUMENTS',
  ADD_USER: 'ADD_USER',
  UPDATE_USER: 'UPDATE_USER',
  REMOVE_USER: 'REMOVE_USER',
  ADD_APPLICATION: 'ADD_APPLICATION',
  UPDATE_APPLICATION: 'UPDATE_APPLICATION',
  ADD_INSTALLATION: 'ADD_INSTALLATION',
  UPDATE_INSTALLATION: 'UPDATE_INSTALLATION',
  CLEAR_USER_DATA: 'CLEAR_USER_DATA',
};

// Reducer function
const userReducer = (state, action) => {
  switch (action.type) {
    case USER_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case USER_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case USER_ACTIONS.SET_USERS:
      return {
        ...state,
        users: action.payload,
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.SET_CURRENT_USER:
      return {
        ...state,
        currentUser: action.payload,
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.SET_USER_METRICS:
      return {
        ...state,
        userMetrics: action.payload,
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.SET_APPLICATIONS:
      return {
        ...state,
        applications: action.payload,
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.SET_INSTALLATIONS:
      return {
        ...state,
        installations: action.payload,
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.SET_STATS:
      return {
        ...state,
        userStats: action.payload,
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.SET_SEARCH_RESULTS:
      return {
        ...state,
        searchResults: action.payload,
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.SET_DOCUMENTS:
      return {
        ...state,
        documents: action.payload,
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.ADD_USER:
      return {
        ...state,
        users: [action.payload, ...state.users],
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.UPDATE_USER:
      return {
        ...state,
        users: state.users.map((user) =>
          user._id === action.payload._id ? action.payload : user
        ),
        currentUser:
          state.currentUser?._id === action.payload._id
            ? action.payload
            : state.currentUser,
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.REMOVE_USER:
      return {
        ...state,
        users: state.users.filter((user) => user._id !== action.payload),
        currentUser:
          state.currentUser?._id === action.payload ? null : state.currentUser,
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.ADD_APPLICATION:
      return {
        ...state,
        applications: [action.payload, ...state.applications],
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.UPDATE_APPLICATION:
      return {
        ...state,
        applications: state.applications.map((app) =>
          app._id === action.payload._id ? action.payload : app
        ),
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.ADD_INSTALLATION:
      return {
        ...state,
        installations: [action.payload, ...state.installations],
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.UPDATE_INSTALLATION:
      return {
        ...state,
        installations: state.installations.map((installation) =>
          installation._id === action.payload._id ? action.payload : installation
        ),
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.CLEAR_USER_DATA:
      return {
        ...initialState,
      };

    default:
      return state;
  }
};

// Create context
const UserContext = createContext();

// User provider component
export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);
  const { dateRange, pagination, filters } = useApp();

  // Get all users
  const getUsers = async (params = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const users = await usersAPI.getUsers({
        page: pagination.page,
        limit: pagination.limit,
        dateRange,
        ...filters,
        ...params,
      });
      dispatch({ type: USER_ACTIONS.SET_USERS, payload: users });
      return users;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch users';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get user by ID
  const getUserById = async (id) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const user = await usersAPI.getUserById(id);
      dispatch({ type: USER_ACTIONS.SET_CURRENT_USER, payload: user });
      return user;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch user';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Create new user
  const createUser = async (userData) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const user = await usersAPI.createUser(userData);
      dispatch({ type: USER_ACTIONS.ADD_USER, payload: user });
      toast.success('User created successfully');
      return user;
    } catch (error) {
      const errorMessage = error.message || 'Failed to create user';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Update user
  const updateUser = async (id, userData) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const user = await usersAPI.updateUser(id, userData);
      dispatch({ type: USER_ACTIONS.UPDATE_USER, payload: user });
      toast.success('User updated successfully');
      return user;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update user';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Delete user
  const deleteUser = async (id) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      await usersAPI.deleteUser(id);
      dispatch({ type: USER_ACTIONS.REMOVE_USER, payload: id });
      toast.success('User deleted successfully');
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete user';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get user metrics
  const getUserMetrics = async (params = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const metrics = await usersAPI.getUserMetrics({
        dateRange,
        ...params,
      });
      dispatch({ type: USER_ACTIONS.SET_USER_METRICS, payload: metrics });
      return metrics;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch user metrics';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get user applications
  const getUserApplications = async (id, params = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const applications = await usersAPI.getUserApplications(id, params);
      dispatch({ type: USER_ACTIONS.SET_APPLICATIONS, payload: applications });
      return applications;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch user applications';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Create user application
  const createUserApplication = async (id, applicationData) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const application = await usersAPI.createUserApplication(id, applicationData);
      dispatch({ type: USER_ACTIONS.ADD_APPLICATION, payload: application });
      toast.success('Application created successfully');
      return application;
    } catch (error) {
      const errorMessage = error.message || 'Failed to create application';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Update user application
  const updateUserApplication = async (id, applicationId, applicationData) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const application = await usersAPI.updateUserApplication(id, applicationId, applicationData);
      dispatch({ type: USER_ACTIONS.UPDATE_APPLICATION, payload: application });
      toast.success('Application updated successfully');
      return application;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update application';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get user installations
  const getUserInstallations = async (id, params = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const installations = await usersAPI.getUserInstallations(id, params);
      dispatch({ type: USER_ACTIONS.SET_INSTALLATIONS, payload: installations });
      return installations;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch user installations';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Create user installation
  const createUserInstallation = async (id, installationData) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const installation = await usersAPI.createUserInstallation(id, installationData);
      dispatch({ type: USER_ACTIONS.ADD_INSTALLATION, payload: installation });
      toast.success('Installation created successfully');
      return installation;
    } catch (error) {
      const errorMessage = error.message || 'Failed to create installation';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Update user installation
  const updateUserInstallation = async (id, installationId, installationData) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const installation = await usersAPI.updateUserInstallation(id, installationId, installationData);
      dispatch({ type: USER_ACTIONS.UPDATE_INSTALLATION, payload: installation });
      toast.success('Installation updated successfully');
      return installation;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update installation';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get user statistics
  const getUserStats = async (customFilters = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const stats = await usersAPI.getUserStats({
        dateRange,
        ...filters,
        ...customFilters,
      });
      dispatch({ type: USER_ACTIONS.SET_STATS, payload: stats });
      return stats;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch user statistics';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Search users
  const searchUsers = async (query, params = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const searchResults = await usersAPI.searchUsers(query, params);
      dispatch({ type: USER_ACTIONS.SET_SEARCH_RESULTS, payload: searchResults });
      return searchResults;
    } catch (error) {
      const errorMessage = error.message || 'Failed to search users';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get user activity
  const getUserActivity = async (id, params = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const activity = await usersAPI.getUserActivity(id, params);
      return activity;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch user activity';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get user documents
  const getUserDocuments = async (id, params = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const documents = await usersAPI.getUserDocuments(id, params);
      dispatch({ type: USER_ACTIONS.SET_DOCUMENTS, payload: documents });
      return documents;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch user documents';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Upload user document
  const uploadUserDocument = async (id, formData) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const result = await usersAPI.uploadUserDocument(id, formData);
      toast.success('Document uploaded successfully');
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to upload document';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Clear user data
  const clearUserData = () => {
    dispatch({ type: USER_ACTIONS.CLEAR_USER_DATA });
  };

  const value = {
    ...state,
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUserMetrics,
    getUserApplications,
    createUserApplication,
    updateUserApplication,
    getUserInstallations,
    createUserInstallation,
    updateUserInstallation,
    getUserStats,
    searchUsers,
    getUserActivity,
    getUserDocuments,
    uploadUserDocument,
    clearUserData,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Custom hook to use user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;