import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { metricsApi, tokenStorage } from '../services/metricsApi';

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  TOKEN_REFRESH_START: 'TOKEN_REFRESH_START',
  TOKEN_REFRESH_SUCCESS: 'TOKEN_REFRESH_SUCCESS',
  TOKEN_REFRESH_FAILURE: 'TOKEN_REFRESH_FAILURE',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
  role: null,
  permissions: [],
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        role: action.payload.role,
        permissions: action.payload.permissions || [],
        loading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        role: null,
        permissions: [],
        loading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        role: null,
        permissions: [],
        loading: false,
        error: null,
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_START:
      return {
        ...state,
        loading: true,
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_SUCCESS:
      return {
        ...state,
        token: action.payload,
        loading: false,
        error: null,
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
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
const MetricsAuthContext = createContext();

// Provider component
export const MetricsAuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state from stored token
  useEffect(() => {
    const storedToken = tokenStorage.getToken();
    if (storedToken && !tokenStorage.isTokenExpired(storedToken)) {
      try {
        // Decode token to get user info
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            token: storedToken,
            user: payload.user || { id: payload.sub, email: payload.email },
            role: payload.role || 'user',
            permissions: payload.permissions || [],
          }
        });
        
        // Set token in API client
        metricsApi.setToken(storedToken);
      } catch (error) {
        console.error('Failed to parse stored token:', error);
        tokenStorage.clearToken();
      }
    }
  }, []);

  // Login function
  const login = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    
    try {
      // This would typically call your authentication endpoint
      // For now, we'll simulate a successful login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const { token, user, role, permissions } = await response.json();
      
      // Store token
      tokenStorage.setToken(token);
      
      // Set token in API client
      metricsApi.setToken(token);
      
      // Update state
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { token, user, role, permissions }
      });

      return { success: true, user, role, permissions };
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: error.message || 'Login failed'
      });
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = () => {
    // Clear token from storage
    tokenStorage.clearToken();
    
    // Clear token from API client
    metricsApi.clearToken();
    
    // Update state
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  // Refresh token function
  const refreshToken = async () => {
    dispatch({ type: AUTH_ACTIONS.TOKEN_REFRESH_START });
    
    try {
      // This would typically call your refresh endpoint
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: tokenStorage.getRefreshToken()
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const { token } = await response.json();
      
      // Store new token
      tokenStorage.setToken(token);
      
      // Set new token in API client
      metricsApi.setToken(token);
      
      // Update state
      dispatch({
        type: AUTH_ACTIONS.TOKEN_REFRESH_SUCCESS,
        payload: token
      });

      return token;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.TOKEN_REFRESH_FAILURE,
        payload: error.message || 'Token refresh failed'
      });
      
      // If refresh fails, logout the user
      logout();
      
      throw error;
    }
  };

  // Check if user has permission
  const hasPermission = (permission) => {
    if (!state.isAuthenticated || !state.permissions) {
      return false;
    }
    
    return state.permissions.includes(permission) || 
           state.permissions.includes('admin') || 
           state.permissions.includes('superadmin');
  };

  // Check if user has role
  const hasRole = (role) => {
    if (!state.isAuthenticated || !state.role) {
      return false;
    }
    
    return state.role === role || 
           state.role === 'admin' || 
           state.role === 'superadmin';
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    login,
    logout,
    refreshToken,
    hasPermission,
    hasRole,
    clearError,
  };

  return (
    <MetricsAuthContext.Provider value={value}>
      {children}
    </MetricsAuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useMetricsAuth = () => {
  const context = useContext(MetricsAuthContext);
  
  if (!context) {
    throw new Error('useMetricsAuth must be used within a MetricsAuthProvider');
  }
  
  return context;
};

// Higher-order component for protecting routes
export const withMetricsAuth = (Component) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, loading } = useMetricsAuth();
    
    if (loading) {
      return (
        <div className="auth-loading">
          <div className="loading-spinner"></div>
          <p>Authenticating...</p>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      // Redirect to login or show login component
      return (
        <div className="auth-required">
          <h2>Authentication Required</h2>
          <p>Please log in to access the metrics dashboard.</p>
          <button onClick={() => window.location.href = '/login'}>
            Go to Login
          </button>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};

// Role-based access component
export const RoleBasedAccess = ({ children, roles, fallback = null }) => {
  const { hasRole } = useMetricsAuth();
  
  const hasRequiredRole = roles.some(role => hasRole(role));
  
  if (hasRequiredRole) {
    return children;
  }
  
  return fallback || (
    <div className="access-denied">
      <h3>Access Denied</h3>
      <p>You don't have permission to access this resource.</p>
    </div>
  );
};

// Permission-based access component
export const PermissionBasedAccess = ({ children, permissions, fallback = null }) => {
  const { hasPermission } = useMetricsAuth();
  
  const hasRequiredPermission = permissions.some(permission => hasPermission(permission));
  
  if (hasRequiredPermission) {
    return children;
  }
  
  return fallback || (
    <div className="access-denied">
      <h3>Access Denied</h3>
      <p>You don't have permission to access this resource.</p>
    </div>
  );
};

export default MetricsAuthContext;