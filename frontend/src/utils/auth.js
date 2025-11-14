// Get authentication token from localStorage
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Set authentication token in localStorage
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

// Remove authentication token from localStorage
export const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

// Get user data from localStorage
export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Set user data in localStorage
export const setUser = (user) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

// Remove user data from localStorage
export const removeUser = () => {
  localStorage.removeItem('user');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getAuthToken();
  const user = getUser();
  
  if (!token || !user) {
    return false;
  }
  
  // Check if token is expired (if token contains expiration info)
  try {
    const tokenData = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    if (tokenData.exp && tokenData.exp < currentTime) {
      removeAuthToken();
      removeUser();
      return false;
    }
    
    return true;
  } catch (error) {
    // If token parsing fails, consider it invalid
    return false;
  }
};

// Check if user has specific role
export const hasRole = (role) => {
  const user = getUser();
  return user && user.role === role;
};

// Check if user has any of the specified roles
export const hasAnyRole = (roles) => {
  const user = getUser();
  return user && roles.includes(user.role);
};

// Check if user has all of the specified roles
export const hasAllRoles = (roles) => {
  const user = getUser();
  return user && roles.every(role => user.role === role);
};

// Get user permissions based on role
export const getPermissions = () => {
  const user = getUser();
  
  if (!user) {
    return [];
  }
  
  const rolePermissions = {
    admin: [
      'read:all',
      'write:all',
      'delete:all',
      'manage:users',
      'manage:investors',
      'manage:payments',
      'manage:reports',
      'manage:crm',
    ],
    finance: [
      'read:payments',
      'write:payments',
      'read:investors',
      'read:reports',
      'manage:transactions',
      'manage:payouts',
    ],
    support: [
      'read:users',
      'read:investors',
      'write:crm',
      'read:reports',
      'manage:tickets',
      'manage:communications',
    ],
    manager: [
      'read:all',
      'write:users',
      'write:investors',
      'read:payments',
      'manage:reports',
      'manage:analytics',
    ],
    user: [
      'read:own',
      'write:own',
    ],
  };
  
  return rolePermissions[user.role] || [];
};

// Check if user has specific permission
export const hasPermission = (permission) => {
  const permissions = getPermissions();
  return permissions.includes(permission);
};

// Check if user has any of the specified permissions
export const hasAnyPermission = (permissions) => {
  const userPermissions = getPermissions();
  return permissions.some(permission => userPermissions.includes(permission));
};

// Format token for API requests
export const formatAuthHeader = () => {
  const token = getAuthToken();
  return token ? `Bearer ${token}` : '';
};

// Clear all auth data
export const clearAuthData = () => {
  removeAuthToken();
  removeUser();
};

// Store refresh token
export const setRefreshToken = (token) => {
  if (token) {
    localStorage.setItem('refreshToken', token);
  } else {
    localStorage.removeItem('refreshToken');
  }
};

// Get refresh token
export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

// Remove refresh token
export const removeRefreshToken = () => {
  localStorage.removeItem('refreshToken');
};

// Initialize auth state from localStorage
export const initializeAuth = () => {
  const token = getAuthToken();
  const user = getUser();
  
  return {
    token,
    user,
    isAuthenticated: isAuthenticated(),
  };
};