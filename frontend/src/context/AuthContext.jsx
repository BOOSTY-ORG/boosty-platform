import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../api/auth.js';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('authToken'),
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  LOAD_USER_START: 'LOAD_USER_START',
  LOAD_USER_SUCCESS: 'LOAD_USER_SUCCESS',
  LOAD_USER_FAILURE: 'LOAD_USER_FAILURE',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
    case AUTH_ACTIONS.LOAD_USER_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.REGISTER_FAILURE:
    case AUTH_ACTIONS.LOAD_USER_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set auth token in localStorage
  const setAuthToken = (token) => {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  };

  // Login function
  const login = async (credentials) => {
    try {
      console.log('AuthContext: Login started', { credentials });
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      const response = await authAPI.login(credentials);
      console.log('AuthContext: API response', response);
      
      setAuthToken(response.token);
      
      // Store user data in localStorage
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
        console.log('AuthContext: User data stored in localStorage', response.user);
      }
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: response,
      });
      
      toast.success('Login successful!');
      return response;
    } catch (error) {
      console.error('AuthContext: Login error', error);
      const errorMessage = error.message || 'Login failed';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage,
      });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.REGISTER_START });
      const response = await authAPI.register(userData);
      
      setAuthToken(response.token);
      
      dispatch({
        type: AUTH_ACTIONS.REGISTER_SUCCESS,
        payload: response,
      });
      
      toast.success('Registration successful!');
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Registration failed';
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAILURE,
        payload: errorMessage,
      });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      console.log('AuthContext: Logout started');
      await authAPI.logout();
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
    } finally {
      setAuthToken(null);
      localStorage.removeItem('user');
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.success('Logged out successfully');
      console.log('AuthContext: Logout completed');
    }
  };

  // Load user from token
  const loadUser = async () => {
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    console.log('AuthContext: loadUser called', { tokenExists: !!token, storedUserExists: !!storedUser });
    
    if (!token) {
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_FAILURE, payload: 'No token found' });
      return;
    }

    try {
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_START });
      
      // Try to get user from API first
      try {
        const user = await authAPI.getCurrentUser();
        console.log('AuthContext: User loaded from API', user);
        localStorage.setItem('user', JSON.stringify(user));
        dispatch({
          type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
          payload: user,
        });
      } catch (apiError) {
        console.log('AuthContext: API call failed, using stored user', apiError);
        // Fallback to stored user if API fails
        if (storedUser) {
          const user = JSON.parse(storedUser);
          dispatch({
            type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
            payload: user,
          });
        } else {
          throw apiError;
        }
      }
    } catch (error) {
      console.error('AuthContext: loadUser error', error);
      setAuthToken(null);
      localStorage.removeItem('user');
      dispatch({
        type: AUTH_ACTIONS.LOAD_USER_FAILURE,
        payload: error.message || 'Failed to load user',
      });
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Load user on initial render
  useEffect(() => {
    loadUser();
  }, []);

  const value = {
    ...state,
    login,
    register,
    logout,
    loadUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;