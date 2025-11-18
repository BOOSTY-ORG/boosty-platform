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
  communications: [],
  communicationStats: null,
  communicationTemplates: [],
  isLoading: false,
  error: null,
  filterPresets: [],
  columnConfigurations: {},
  activePreset: null,
  // Bulk operations state
  selectedUsers: [],
  bulkOperations: {
    active: [],
    history: [],
    queueStatus: {},
  },
  bulkOperationProgress: {},
  showBulkEditModal: false,
  showBulkCommunicationModal: false,
  showBulkKYCModal: false,
  showBulkOperationManager: false,
  // Export state
  exportTemplates: [],
  exportHistory: [],
  exportProgress: {},
  showExportModal: false,
  showExportProgress: false,
  showExportHistory: false,
  showExportTemplate: false,
  showExportScheduler: false,
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
  SET_COMMUNICATIONS: 'SET_COMMUNICATIONS',
  SET_COMMUNICATION_STATS: 'SET_COMMUNICATION_STATS',
  SET_COMMUNICATION_TEMPLATES: 'SET_COMMUNICATION_TEMPLATES',
  ADD_COMMUNICATION: 'ADD_COMMUNICATION',
  UPDATE_COMMUNICATION: 'UPDATE_COMMUNICATION',
  DELETE_COMMUNICATION: 'DELETE_COMMUNICATION',
  ADD_COMMUNICATION_TEMPLATE: 'ADD_COMMUNICATION_TEMPLATE',
  UPDATE_COMMUNICATION_TEMPLATE: 'UPDATE_COMMUNICATION_TEMPLATE',
  DELETE_COMMUNICATION_TEMPLATE: 'DELETE_COMMUNICATION_TEMPLATE',
  ADD_USER: 'ADD_USER',
  UPDATE_USER: 'UPDATE_USER',
  REMOVE_USER: 'REMOVE_USER',
  ADD_APPLICATION: 'ADD_APPLICATION',
  UPDATE_APPLICATION: 'UPDATE_APPLICATION',
  ADD_INSTALLATION: 'ADD_INSTALLATION',
  UPDATE_INSTALLATION: 'UPDATE_INSTALLATION',
  CLEAR_USER_DATA: 'CLEAR_USER_DATA',
  SET_FILTER_PRESETS: 'SET_FILTER_PRESETS',
  ADD_FILTER_PRESET: 'ADD_FILTER_PRESET',
  UPDATE_FILTER_PRESET: 'UPDATE_FILTER_PRESET',
  DELETE_FILTER_PRESET: 'DELETE_FILTER_PRESET',
  SET_ACTIVE_PRESET: 'SET_ACTIVE_PRESET',
  SET_COLUMN_CONFIGURATIONS: 'SET_COLUMN_CONFIGURATIONS',
  UPDATE_COLUMN_CONFIGURATION: 'UPDATE_COLUMN_CONFIGURATION',
  // Bulk operation actions
  SET_SELECTED_USERS: 'SET_SELECTED_USERS',
  CLEAR_SELECTED_USERS: 'CLEAR_SELECTED_USERS',
  SET_BULK_OPERATIONS: 'SET_BULK_OPERATIONS',
  SET_BULK_OPERATION_PROGRESS: 'SET_BULK_OPERATION_PROGRESS',
  SHOW_BULK_EDIT_MODAL: 'SHOW_BULK_EDIT_MODAL',
  HIDE_BULK_EDIT_MODAL: 'HIDE_BULK_EDIT_MODAL',
  SHOW_BULK_COMMUNICATION_MODAL: 'SHOW_BULK_COMMUNICATION_MODAL',
  HIDE_BULK_COMMUNICATION_MODAL: 'HIDE_BULK_COMMUNICATION_MODAL',
  SHOW_BULK_KYC_MODAL: 'SHOW_BULK_KYC_MODAL',
  HIDE_BULK_KYC_MODAL: 'HIDE_BULK_KYC_MODAL',
  SHOW_BULK_OPERATION_MANAGER: 'SHOW_BULK_OPERATION_MANAGER',
  HIDE_BULK_OPERATION_MANAGER: 'HIDE_BULK_OPERATION_MANAGER',
  // Export actions
  SET_EXPORT_TEMPLATES: 'SET_EXPORT_TEMPLATES',
  SET_EXPORT_HISTORY: 'SET_EXPORT_HISTORY',
  SET_EXPORT_PROGRESS: 'SET_EXPORT_PROGRESS',
  SHOW_EXPORT_MODAL: 'SHOW_EXPORT_MODAL',
  HIDE_EXPORT_MODAL: 'HIDE_EXPORT_MODAL',
  SHOW_EXPORT_PROGRESS: 'SHOW_EXPORT_PROGRESS',
  HIDE_EXPORT_PROGRESS: 'HIDE_EXPORT_PROGRESS',
  SHOW_EXPORT_HISTORY: 'SHOW_EXPORT_HISTORY',
  HIDE_EXPORT_HISTORY: 'HIDE_EXPORT_HISTORY',
  SHOW_EXPORT_TEMPLATE: 'SHOW_EXPORT_TEMPLATE',
  HIDE_EXPORT_TEMPLATE: 'HIDE_EXPORT_TEMPLATE',
  SHOW_EXPORT_SCHEDULER: 'SHOW_EXPORT_SCHEDULER',
  HIDE_EXPORT_SCHEDULER: 'HIDE_EXPORT_SCHEDULER',
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

    case USER_ACTIONS.SET_COMMUNICATIONS:
      return {
        ...state,
        communications: action.payload,
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.SET_COMMUNICATION_STATS:
      return {
        ...state,
        communicationStats: action.payload,
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.SET_COMMUNICATION_TEMPLATES:
      return {
        ...state,
        communicationTemplates: action.payload,
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.ADD_COMMUNICATION:
      return {
        ...state,
        communications: [action.payload, ...state.communications],
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.UPDATE_COMMUNICATION:
      return {
        ...state,
        communications: state.communications.map((comm) =>
          comm._id === action.payload._id ? action.payload : comm
        ),
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.DELETE_COMMUNICATION:
      return {
        ...state,
        communications: state.communications.filter((comm) => comm._id !== action.payload),
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.ADD_COMMUNICATION_TEMPLATE:
      return {
        ...state,
        communicationTemplates: [action.payload, ...state.communicationTemplates],
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.UPDATE_COMMUNICATION_TEMPLATE:
      return {
        ...state,
        communicationTemplates: state.communicationTemplates.map((template) =>
          template._id === action.payload._id ? action.payload : template
        ),
        isLoading: false,
        error: null,
      };

    case USER_ACTIONS.DELETE_COMMUNICATION_TEMPLATE:
      return {
        ...state,
        communicationTemplates: state.communicationTemplates.filter(
          (template) => template._id !== action.payload
        ),
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

    case USER_ACTIONS.SET_FILTER_PRESETS:
      return {
        ...state,
        filterPresets: action.payload,
      };

    case USER_ACTIONS.ADD_FILTER_PRESET:
      return {
        ...state,
        filterPresets: [...state.filterPresets, action.payload],
      };

    case USER_ACTIONS.UPDATE_FILTER_PRESET:
      return {
        ...state,
        filterPresets: state.filterPresets.map(preset =>
          preset.id === action.payload.id ? action.payload : preset
        ),
      };

    case USER_ACTIONS.DELETE_FILTER_PRESET:
      return {
        ...state,
        filterPresets: state.filterPresets.filter(preset => preset.id !== action.payload),
        activePreset: state.activePreset?.id === action.payload ? null : state.activePreset,
      };

    case USER_ACTIONS.SET_ACTIVE_PRESET:
      return {
        ...state,
        activePreset: action.payload,
      };

    case USER_ACTIONS.SET_COLUMN_CONFIGURATIONS:
      return {
        ...state,
        columnConfigurations: action.payload,
      };

    case USER_ACTIONS.UPDATE_COLUMN_CONFIGURATION:
      return {
        ...state,
        columnConfigurations: {
          ...state.columnConfigurations,
          [action.key]: action.payload,
        },
      };

    // Bulk operation reducer cases
    case USER_ACTIONS.SET_SELECTED_USERS:
      return {
        ...state,
        selectedUsers: action.payload,
      };

    case USER_ACTIONS.CLEAR_SELECTED_USERS:
      return {
        ...state,
        selectedUsers: [],
      };

    case USER_ACTIONS.SET_BULK_OPERATIONS:
      return {
        ...state,
        bulkOperations: {
          ...state.bulkOperations,
          ...action.payload,
        },
      };

    case USER_ACTIONS.SET_BULK_OPERATION_PROGRESS:
      return {
        ...state,
        bulkOperationProgress: {
          ...state.bulkOperationProgress,
          [action.operationId]: action.payload,
        },
      };

    case USER_ACTIONS.SHOW_BULK_EDIT_MODAL:
      return {
        ...state,
        showBulkEditModal: true,
      };

    case USER_ACTIONS.HIDE_BULK_EDIT_MODAL:
      return {
        ...state,
        showBulkEditModal: false,
      };

    case USER_ACTIONS.SHOW_BULK_COMMUNICATION_MODAL:
      return {
        ...state,
        showBulkCommunicationModal: true,
      };

    case USER_ACTIONS.HIDE_BULK_COMMUNICATION_MODAL:
      return {
        ...state,
        showBulkCommunicationModal: false,
      };

    case USER_ACTIONS.SHOW_BULK_KYC_MODAL:
      return {
        ...state,
        showBulkKYCModal: true,
      };

    case USER_ACTIONS.HIDE_BULK_KYC_MODAL:
      return {
        ...state,
        showBulkKYCModal: false,
      };

    case USER_ACTIONS.SHOW_BULK_OPERATION_MANAGER:
      return {
        ...state,
        showBulkOperationManager: true,
      };

    case USER_ACTIONS.HIDE_BULK_OPERATION_MANAGER:
      return {
        ...state,
        showBulkOperationManager: false,
      };

    // Export reducer cases
    case USER_ACTIONS.SET_EXPORT_TEMPLATES:
      return {
        ...state,
        exportTemplates: action.payload,
      };

    case USER_ACTIONS.SET_EXPORT_HISTORY:
      return {
        ...state,
        exportHistory: action.payload,
      };

    case USER_ACTIONS.SET_EXPORT_PROGRESS:
      return {
        ...state,
        exportProgress: {
          ...state.exportProgress,
          [action.exportId]: action.payload,
        },
      };

    case USER_ACTIONS.SHOW_EXPORT_MODAL:
      return {
        ...state,
        showExportModal: true,
      };

    case USER_ACTIONS.HIDE_EXPORT_MODAL:
      return {
        ...state,
        showExportModal: false,
      };

    case USER_ACTIONS.SHOW_EXPORT_PROGRESS:
      return {
        ...state,
        showExportProgress: true,
      };

    case USER_ACTIONS.HIDE_EXPORT_PROGRESS:
      return {
        ...state,
        showExportProgress: false,
      };

    case USER_ACTIONS.SHOW_EXPORT_HISTORY:
      return {
        ...state,
        showExportHistory: true,
      };

    case USER_ACTIONS.HIDE_EXPORT_HISTORY:
      return {
        ...state,
        showExportHistory: false,
      };

    case USER_ACTIONS.SHOW_EXPORT_TEMPLATE:
      return {
        ...state,
        showExportTemplate: true,
      };

    case USER_ACTIONS.HIDE_EXPORT_TEMPLATE:
      return {
        ...state,
        showExportTemplate: false,
      };

    case USER_ACTIONS.SHOW_EXPORT_SCHEDULER:
      return {
        ...state,
        showExportScheduler: true,
      };

    case USER_ACTIONS.HIDE_EXPORT_SCHEDULER:
      return {
        ...state,
        showExportScheduler: false,
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

  // Load filter presets and column configurations from localStorage on mount
  useEffect(() => {
    const savedPresets = localStorage.getItem('userFilterPresets');
    const savedColumnConfigs = localStorage.getItem('userColumnConfigurations');
    
    if (savedPresets) {
      try {
        dispatch({ type: USER_ACTIONS.SET_FILTER_PRESETS, payload: JSON.parse(savedPresets) });
      } catch (error) {
        console.error('Error loading filter presets:', error);
      }
    }
    
    if (savedColumnConfigs) {
      try {
        dispatch({ type: USER_ACTIONS.SET_COLUMN_CONFIGURATIONS, payload: JSON.parse(savedColumnConfigs) });
      } catch (error) {
        console.error('Error loading column configurations:', error);
      }
    }
  }, []);

  // Save filter presets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('userFilterPresets', JSON.stringify(state.filterPresets));
  }, [state.filterPresets]);

  // Save column configurations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('userColumnConfigurations', JSON.stringify(state.columnConfigurations));
  }, [state.columnConfigurations]);

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

  // Filter preset management
  const saveFilterPreset = async (name, filters) => {
    try {
      const newPreset = {
        id: Date.now().toString(),
        name,
        filters,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dispatch({ type: USER_ACTIONS.ADD_FILTER_PRESET, payload: newPreset });
      return newPreset;
    } catch (error) {
      console.error('Error saving filter preset:', error);
      throw error;
    }
  };

  const updateFilterPreset = async (presetId, filters) => {
    try {
      const existingPreset = state.filterPresets.find(p => p.id === presetId);
      if (!existingPreset) {
        throw new Error('Preset not found');
      }

      const updatedPreset = {
        ...existingPreset,
        filters,
        updatedAt: new Date().toISOString(),
      };

      dispatch({ type: USER_ACTIONS.UPDATE_FILTER_PRESET, payload: updatedPreset });
      return updatedPreset;
    } catch (error) {
      console.error('Error updating filter preset:', error);
      throw error;
    }
  };

  const deleteFilterPreset = async (presetId) => {
    try {
      dispatch({ type: USER_ACTIONS.DELETE_FILTER_PRESET, payload: presetId });
    } catch (error) {
      console.error('Error deleting filter preset:', error);
      throw error;
    }
  };

  const loadFilterPreset = async (preset) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_ACTIVE_PRESET, payload: preset });
      return preset;
    } catch (error) {
      console.error('Error loading filter preset:', error);
      throw error;
    }
  };

  const clearActivePreset = () => {
    dispatch({ type: USER_ACTIONS.SET_ACTIVE_PRESET, payload: null });
  };

  // Column configuration management
  const saveColumnConfiguration = async (key, configuration) => {
    try {
      dispatch({ type: USER_ACTIONS.UPDATE_COLUMN_CONFIGURATION, payload: configuration, key });
      return configuration;
    } catch (error) {
      console.error('Error saving column configuration:', error);
      throw error;
    }
  };

  const getColumnConfiguration = (key) => {
    return state.columnConfigurations[key] || null;
  };

  // Bulk operation functions
  const setSelectedUsers = (userIds) => {
    dispatch({ type: USER_ACTIONS.SET_SELECTED_USERS, payload: userIds });
  };

  const clearSelectedUsers = () => {
    dispatch({ type: USER_ACTIONS.CLEAR_SELECTED_USERS });
  };

  const showBulkEditModal = () => {
    dispatch({ type: USER_ACTIONS.SHOW_BULK_EDIT_MODAL });
  };

  const hideBulkEditModal = () => {
    dispatch({ type: USER_ACTIONS.HIDE_BULK_EDIT_MODAL });
  };

  const showBulkCommunicationModal = () => {
    dispatch({ type: USER_ACTIONS.SHOW_BULK_COMMUNICATION_MODAL });
  };

  const hideBulkCommunicationModal = () => {
    dispatch({ type: USER_ACTIONS.HIDE_BULK_COMMUNICATION_MODAL });
  };

  const showBulkKYCModal = () => {
    dispatch({ type: USER_ACTIONS.SHOW_BULK_KYC_MODAL });
  };

  const hideBulkKYCModal = () => {
    dispatch({ type: USER_ACTIONS.HIDE_BULK_KYC_MODAL });
  };

  const showBulkOperationManager = () => {
    dispatch({ type: USER_ACTIONS.SHOW_BULK_OPERATION_MANAGER });
  };

  const hideBulkOperationManager = () => {
    dispatch({ type: USER_ACTIONS.HIDE_BULK_OPERATION_MANAGER });
  };

  // Bulk operation API calls
  const bulkUpdateUsers = async (userIds, updateData) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const response = await usersAPI.bulkUpdateUsers(userIds, updateData);
      
      // Refresh users list to show updates
      await getUsers();
      
      toast.success(`Successfully updated ${userIds.length} user(s)`);
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update users';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const bulkSendCommunication = async (communicationData) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const response = await usersAPI.bulkSendCommunication(communicationData);
      toast.success(`Communication sent to ${communicationData.userIds.length} user(s)`);
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to send communication';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const bulkVerifyKYC = async (userIds, options = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const response = await usersAPI.bulkVerifyKYC(userIds, options);
      
      // Refresh users list to show updates
      await getUsers();
      
      toast.success(`KYC verified for ${userIds.length} user(s)`);
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to verify KYC';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const bulkRejectKYC = async (userIds, options = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const response = await usersAPI.bulkRejectKYC(userIds, options);
      
      // Refresh users list to show updates
      await getUsers();
      
      toast.success(`KYC rejected for ${userIds.length} user(s)`);
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to reject KYC';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const bulkRequestDocuments = async (userIds, options = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const response = await usersAPI.bulkRequestDocuments(userIds, options);
      toast.success(`Document requests sent to ${userIds.length} user(s)`);
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to request documents';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const bulkFlagForReview = async (userIds, options = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const response = await usersAPI.bulkFlagForReview(userIds, options);
      
      // Refresh users list to show updates
      await getUsers();
      
      toast.success(`${userIds.length} user(s) flagged for review`);
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to flag for review';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const bulkSetRiskLevel = async (userIds, options = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const response = await usersAPI.bulkSetRiskLevel(userIds, options);
      
      // Refresh users list to show updates
      await getUsers();
      
      toast.success(`Risk level set for ${userIds.length} user(s)`);
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to set risk level';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const bulkUpdateStatus = async (userIds, status, options = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const response = await usersAPI.bulkUpdateStatus(userIds, status, options);
      
      // Refresh users list to show updates
      await getUsers();
      
      toast.success(`Status updated to ${status} for ${userIds.length} user(s)`);
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update status';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const bulkExportUsers = async (userIds, exportOptions = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const response = await usersAPI.bulkExportUsers(userIds, exportOptions);
      
      // Handle file download
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_export.${exportOptions.format || 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Exported ${userIds.length} user(s)`);
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to export users';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const bulkDeleteUsers = async (userIds, options = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const response = await usersAPI.bulkDeleteUsers(userIds, options);
      
      // Refresh users list to show updates
      await getUsers();
      
      toast.success(`Deleted ${userIds.length} user(s)`);
      clearSelectedUsers();
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete users';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const bulkAssignToTeam = async (userIds, teamData, options = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const response = await usersAPI.bulkAssignToTeam(userIds, teamData, options);
      
      // Refresh users list to show updates
      await getUsers();
      
      toast.success(`Assigned ${userIds.length} user(s) to team`);
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to assign to team';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const getBulkOperationHistory = async () => {
    try {
      const response = await usersAPI.getBulkOperationHistory();
      dispatch({
        type: USER_ACTIONS.SET_BULK_OPERATIONS,
        payload: { history: response.data || [] }
      });
      return response;
    } catch (error) {
      console.error('Failed to fetch bulk operation history:', error);
      throw error;
    }
  };

  const getOperationQueueStatus = async () => {
    try {
      const response = await usersAPI.getOperationQueueStatus();
      dispatch({
        type: USER_ACTIONS.SET_BULK_OPERATIONS,
        payload: {
          active: response.data?.active || [],
          queueStatus: response.data || {}
        }
      });
      return response;
    } catch (error) {
      console.error('Failed to fetch operation queue status:', error);
      throw error;
    }
  };

  // Communication functions
  const getUserCommunications = async (userId, params = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const communications = await usersAPI.getUserCommunications(userId, params);
      dispatch({ type: USER_ACTIONS.SET_COMMUNICATIONS, payload: communications });
      return communications;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch user communications';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const createUserCommunication = async (userId, communicationData) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const communication = await usersAPI.createUserCommunication(userId, communicationData);
      dispatch({ type: USER_ACTIONS.ADD_COMMUNICATION, payload: communication });
      toast.success('Communication sent successfully');
      return communication;
    } catch (error) {
      const errorMessage = error.message || 'Failed to send communication';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const updateUserCommunication = async (userId, communicationId, communicationData) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const communication = await usersAPI.updateUserCommunication(userId, communicationId, communicationData);
      dispatch({ type: USER_ACTIONS.UPDATE_COMMUNICATION, payload: communication });
      toast.success('Communication updated successfully');
      return communication;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update communication';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const deleteUserCommunication = async (userId, communicationId) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      await usersAPI.deleteUserCommunication(userId, communicationId);
      dispatch({ type: USER_ACTIONS.DELETE_COMMUNICATION, payload: communicationId });
      toast.success('Communication deleted successfully');
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete communication';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const getCommunicationStats = async (userId, params = {}) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const stats = await usersAPI.getCommunicationStats(userId, params);
      dispatch({ type: USER_ACTIONS.SET_COMMUNICATION_STATS, payload: stats });
      return stats;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch communication stats';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const getCommunicationTemplates = async () => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const templates = await usersAPI.getCommunicationTemplates();
      dispatch({ type: USER_ACTIONS.SET_COMMUNICATION_TEMPLATES, payload: templates });
      return templates;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch communication templates';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const createCommunicationTemplate = async (templateData) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const template = await usersAPI.createCommunicationTemplate(templateData);
      dispatch({ type: USER_ACTIONS.ADD_COMMUNICATION_TEMPLATE, payload: template });
      toast.success('Template created successfully');
      return template;
    } catch (error) {
      const errorMessage = error.message || 'Failed to create template';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const updateCommunicationTemplate = async (templateId, templateData) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const template = await usersAPI.updateCommunicationTemplate(templateId, templateData);
      dispatch({ type: USER_ACTIONS.UPDATE_COMMUNICATION_TEMPLATE, payload: template });
      toast.success('Template updated successfully');
      return template;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update template';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const deleteCommunicationTemplate = async (templateId) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      await usersAPI.deleteCommunicationTemplate(templateId);
      dispatch({ type: USER_ACTIONS.DELETE_COMMUNICATION_TEMPLATE, payload: templateId });
      toast.success('Template deleted successfully');
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete template';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const scheduleCommunication = async (userId, communicationData) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const communication = await usersAPI.scheduleCommunication(userId, communicationData);
      dispatch({ type: USER_ACTIONS.ADD_COMMUNICATION, payload: communication });
      toast.success('Communication scheduled successfully');
      return communication;
    } catch (error) {
      const errorMessage = error.message || 'Failed to schedule communication';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const cancelScheduledCommunication = async (userId, communicationId) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      await usersAPI.cancelScheduledCommunication(userId, communicationId);
      dispatch({ type: USER_ACTIONS.UPDATE_COMMUNICATION, payload: { _id: communicationId, status: 'cancelled' } });
      toast.success('Scheduled communication cancelled');
    } catch (error) {
      const errorMessage = error.message || 'Failed to cancel scheduled communication';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const resendCommunication = async (userId, communicationId) => {
    try {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
      const communication = await usersAPI.resendCommunication(userId, communicationId);
      dispatch({ type: USER_ACTIONS.ADD_COMMUNICATION, payload: communication });
      toast.success('Communication resent successfully');
      return communication;
    } catch (error) {
      const errorMessage = error.message || 'Failed to resend communication';
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Export functions
  const getExportTemplates = async () => {
    try {
      const response = await usersAPI.getExportTemplates();
      dispatch({ type: USER_ACTIONS.SET_EXPORT_TEMPLATES, payload: response.data || [] });
      return response;
    } catch (error) {
      console.error('Failed to fetch export templates:', error);
      showNotification({
        type: 'error',
        message: 'Failed to fetch export templates'
      });
      throw error;
    }
  };

  const createExportTemplate = async (templateData) => {
    try {
      const response = await usersAPI.createExportTemplate(templateData);
      dispatch({
        type: USER_ACTIONS.SET_EXPORT_TEMPLATES,
        payload: [...state.exportTemplates, response.data]
      });
      showNotification({
        type: 'success',
        message: 'Export template created successfully'
      });
      return response;
    } catch (error) {
      console.error('Failed to create export template:', error);
      showNotification({
        type: 'error',
        message: 'Failed to create export template'
      });
      throw error;
    }
  };

  const updateExportTemplate = async (templateId, templateData) => {
    try {
      const response = await usersAPI.updateExportTemplate(templateId, templateData);
      dispatch({
        type: USER_ACTIONS.SET_EXPORT_TEMPLATES,
        payload: state.exportTemplates.map(template =>
          template._id === templateId ? response.data : template
        )
      });
      showNotification({
        type: 'success',
        message: 'Export template updated successfully'
      });
      return response;
    } catch (error) {
      console.error('Failed to update export template:', error);
      showNotification({
        type: 'error',
        message: 'Failed to update export template'
      });
      throw error;
    }
  };

  const deleteExportTemplate = async (templateId) => {
    try {
      await usersAPI.deleteExportTemplate(templateId);
      dispatch({
        type: USER_ACTIONS.SET_EXPORT_TEMPLATES,
        payload: state.exportTemplates.filter(template => template._id !== templateId)
      });
      showNotification({
        type: 'success',
        message: 'Export template deleted successfully'
      });
    } catch (error) {
      console.error('Failed to delete export template:', error);
      showNotification({
        type: 'error',
        message: 'Failed to delete export template'
      });
      throw error;
    }
  };

  const getExportHistory = async (params = {}) => {
    try {
      const response = await usersAPI.getExportHistory(params);
      dispatch({ type: USER_ACTIONS.SET_EXPORT_HISTORY, payload: response.data || [] });
      return response;
    } catch (error) {
      console.error('Failed to fetch export history:', error);
      showNotification({
        type: 'error',
        message: 'Failed to fetch export history'
      });
      throw error;
    }
  };

  const getExportStatus = async (exportId) => {
    try {
      const response = await usersAPI.getExportStatus(exportId);
      dispatch({
        type: USER_ACTIONS.SET_EXPORT_PROGRESS,
        exportId,
        payload: response.data
      });
      return response;
    } catch (error) {
      console.error('Failed to fetch export status:', error);
      showNotification({
        type: 'error',
        message: 'Failed to fetch export status'
      });
      throw error;
    }
  };

  const downloadExportFile = async (exportId) => {
    try {
      const response = await usersAPI.downloadExportFile(exportId);
      
      // Create download link
      const blob = new Blob([response.data], {
        type: getContentType('xlsx') // Default type, should be determined from export status
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export_${exportId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showNotification({
        type: 'success',
        message: 'Export download started'
      });
      return response;
    } catch (error) {
      console.error('Failed to download export file:', error);
      showNotification({
        type: 'error',
        message: 'Failed to download export file'
      });
      throw error;
    }
  };

  const cancelExport = async (exportId) => {
    try {
      await usersAPI.cancelExport(exportId);
      dispatch({
        type: USER_ACTIONS.SET_EXPORT_PROGRESS,
        exportId,
        payload: { status: 'cancelled' }
      });
      showNotification({
        type: 'info',
        message: 'Export cancelled successfully'
      });
    } catch (error) {
      console.error('Failed to cancel export:', error);
      showNotification({
        type: 'error',
        message: 'Failed to cancel export'
      });
      throw error;
    }
  };

  const exportUsersAdvanced = async (exportOptions) => {
    try {
      const response = await usersAPI.exportUsersAdvanced(exportOptions);
      
      // For large exports, the response might contain an export ID
      if (response.data?.exportId) {
        dispatch({
          type: USER_ACTIONS.SET_EXPORT_PROGRESS,
          exportId: response.data.exportId,
          payload: { status: 'processing' }
        });
        dispatch({ type: USER_ACTIONS.SHOW_EXPORT_PROGRESS });
        dispatch({ type: USER_ACTIONS.HIDE_EXPORT_MODAL });
        showNotification({
          type: 'info',
          message: 'Export started. You can track progress in the export history.'
        });
      } else {
        // Direct download for small exports
        const blob = new Blob([response.data], {
          type: getContentType(exportOptions.format)
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.${exportOptions.format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        showNotification({
          type: 'success',
          message: `Successfully exported users in ${exportOptions.format.toUpperCase()} format`
        });
      }
      return response;
    } catch (error) {
      console.error('Export failed:', error);
      showNotification({
        type: 'error',
        message: 'Export failed. Please try again.'
      });
      throw error;
    }
  };

  const getScheduledExports = async (params = {}) => {
    try {
      const response = await usersAPI.getScheduledExports(params);
      return response;
    } catch (error) {
      console.error('Failed to fetch scheduled exports:', error);
      showNotification({
        type: 'error',
        message: 'Failed to fetch scheduled exports'
      });
      throw error;
    }
  };

  const scheduleExport = async (scheduleData) => {
    try {
      const response = await usersAPI.scheduleExport(scheduleData);
      showNotification({
        type: 'success',
        message: 'Export schedule created successfully'
      });
      return response;
    } catch (error) {
      console.error('Failed to schedule export:', error);
      showNotification({
        type: 'error',
        message: 'Failed to schedule export'
      });
      throw error;
    }
  };

  const updateScheduledExport = async (scheduleId, scheduleData) => {
    try {
      const response = await usersAPI.updateScheduledExport(scheduleId, scheduleData);
      showNotification({
        type: 'success',
        message: 'Export schedule updated successfully'
      });
      return response;
    } catch (error) {
      console.error('Failed to update scheduled export:', error);
      showNotification({
        type: 'error',
        message: 'Failed to update export schedule'
      });
      throw error;
    }
  };

  const deleteScheduledExport = async (scheduleId) => {
    try {
      await usersAPI.deleteScheduledExport(scheduleId);
      showNotification({
        type: 'success',
        message: 'Export schedule deleted successfully'
      });
    } catch (error) {
      console.error('Failed to delete scheduled export:', error);
      showNotification({
        type: 'error',
        message: 'Failed to delete export schedule'
      });
      throw error;
    }
  };

  const getContentType = (format) => {
    switch (format) {
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  };

  // Export modal functions
  const showExportModal = () => {
    dispatch({ type: USER_ACTIONS.SHOW_EXPORT_MODAL });
  };

  const hideExportModal = () => {
    dispatch({ type: USER_ACTIONS.HIDE_EXPORT_MODAL });
  };

  const showExportProgress = () => {
    dispatch({ type: USER_ACTIONS.SHOW_EXPORT_PROGRESS });
  };

  const hideExportProgress = () => {
    dispatch({ type: USER_ACTIONS.HIDE_EXPORT_PROGRESS });
  };

  const showExportHistory = () => {
    dispatch({ type: USER_ACTIONS.SHOW_EXPORT_HISTORY });
  };

  const hideExportHistory = () => {
    dispatch({ type: USER_ACTIONS.HIDE_EXPORT_HISTORY });
  };

  const showExportTemplate = () => {
    dispatch({ type: USER_ACTIONS.SHOW_EXPORT_TEMPLATE });
  };

  const hideExportTemplate = () => {
    dispatch({ type: USER_ACTIONS.HIDE_EXPORT_TEMPLATE });
  };

  const showExportScheduler = () => {
    dispatch({ type: USER_ACTIONS.SHOW_EXPORT_SCHEDULER });
  };

  const hideExportScheduler = () => {
    dispatch({ type: USER_ACTIONS.HIDE_EXPORT_SCHEDULER });
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
    saveFilterPreset,
    updateFilterPreset,
    deleteFilterPreset,
    loadFilterPreset,
    clearActivePreset,
    saveColumnConfiguration,
    getColumnConfiguration,
    // Communication functions
    getUserCommunications,
    createUserCommunication,
    updateUserCommunication,
    deleteUserCommunication,
    getCommunicationStats,
    getCommunicationTemplates,
    createCommunicationTemplate,
    updateCommunicationTemplate,
    deleteCommunicationTemplate,
    scheduleCommunication,
    cancelScheduledCommunication,
    resendCommunication,
    // Bulk operation functions
    setSelectedUsers,
    clearSelectedUsers,
    showBulkEditModal,
    hideBulkEditModal,
    showBulkCommunicationModal,
    hideBulkCommunicationModal,
    showBulkKYCModal,
    hideBulkKYCModal,
    showBulkOperationManager,
    hideBulkOperationManager,
    bulkUpdateUsers,
    bulkSendCommunication,
    bulkVerifyKYC,
    bulkRejectKYC,
    bulkRequestDocuments,
    bulkFlagForReview,
    bulkSetRiskLevel,
    bulkUpdateStatus,
    bulkExportUsers,
    bulkDeleteUsers,
    bulkAssignToTeam,
    getBulkOperationHistory,
    getOperationQueueStatus,
    // Export functions
    getExportTemplates,
    createExportTemplate,
    updateExportTemplate,
    deleteExportTemplate,
    getExportHistory,
    getExportStatus,
    downloadExportFile,
    cancelExport,
    exportUsersAdvanced,
    getScheduledExports,
    scheduleExport,
    updateScheduledExport,
    deleteScheduledExport,
    showExportModal,
    hideExportModal,
    showExportProgress,
    hideExportProgress,
    showExportHistory,
    hideExportHistory,
    showExportTemplate,
    hideExportTemplate,
    showExportScheduler,
    hideExportScheduler,
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