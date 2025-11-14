import { USER_ROLES, PERMISSIONS } from './constants.js';

// Role hierarchy for permission inheritance
const ROLE_HIERARCHY = {
  [USER_ROLES.ADMIN]: 5,
  [USER_ROLES.MANAGER]: 4,
  [USER_ROLES.FINANCE]: 3,
  [USER_ROLES.SUPPORT]: 2,
  [USER_ROLES.USER]: 1,
};

// Permission mapping by role
const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.READ_ALL,
    PERMISSIONS.WRITE_ALL,
    PERMISSIONS.DELETE_ALL,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_INVESTORS,
    PERMISSIONS.MANAGE_PAYMENTS,
    PERMISSIONS.MANAGE_REPORTS,
    PERMISSIONS.MANAGE_CRM,
    PERMISSIONS.MANAGE_TRANSACTIONS,
    PERMISSIONS.MANAGE_PAYOUTS,
    PERMISSIONS.MANAGE_TICKETS,
    PERMISSIONS.MANAGE_COMMUNICATIONS,
    PERMISSIONS.MANAGE_ANALYTICS,
  ],
  [USER_ROLES.MANAGER]: [
    PERMISSIONS.READ_ALL,
    PERMISSIONS.WRITE_USERS,
    PERMISSIONS.WRITE_INVESTORS,
    PERMISSIONS.READ_PAYMENTS,
    PERMISSIONS.MANAGE_REPORTS,
    PERMISSIONS.MANAGE_ANALYTICS,
    PERMISSIONS.READ_CRM,
  ],
  [USER_ROLES.FINANCE]: [
    PERMISSIONS.READ_PAYMENTS,
    PERMISSIONS.WRITE_PAYMENTS,
    PERMISSIONS.READ_INVESTORS,
    PERMISSIONS.READ_REPORTS,
    PERMISSIONS.MANAGE_TRANSACTIONS,
    PERMISSIONS.MANAGE_PAYOUTS,
  ],
  [USER_ROLES.SUPPORT]: [
    PERMISSIONS.READ_USERS,
    PERMISSIONS.READ_INVESTORS,
    PERMISSIONS.WRITE_CRM,
    PERMISSIONS.READ_REPORTS,
    PERMISSIONS.MANAGE_TICKETS,
    PERMISSIONS.MANAGE_COMMUNICATIONS,
  ],
  [USER_ROLES.USER]: [
    PERMISSIONS.READ_OWN,
    PERMISSIONS.WRITE_OWN,
  ],
};

// Check if user has specific permission
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false;
  
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];
  return userPermissions.includes(permission);
};

// Check if user has any of the specified permissions
export const hasAnyPermission = (userRole, permissions) => {
  if (!userRole || !permissions || !Array.isArray(permissions)) return false;
  
  return permissions.some(permission => hasPermission(userRole, permission));
};

// Check if user has all of the specified permissions
export const hasAllPermissions = (userRole, permissions) => {
  if (!userRole || !permissions || !Array.isArray(permissions)) return false;
  
  return permissions.every(permission => hasPermission(userRole, permission));
};

// Check if user can access a specific route
export const canAccessRoute = (userRole, route) => {
  if (!userRole || !route) return false;
  
  const routePermissions = route.permissions || [];
  
  if (routePermissions.length === 0) return true;
  
  return hasAnyPermission(userRole, routePermissions);
};

// Check if user can perform a specific action
export const canPerformAction = (userRole, action, resource) => {
  if (!userRole || !action) return false;
  
  // Build permission string from action and resource
  const permission = `${action}:${resource}`;
  
  return hasPermission(userRole, permission);
};

// Get all permissions for a role
export const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

// Check if role has higher or equal hierarchy level
export const hasRoleLevel = (userRole, requiredRole) => {
  if (!userRole || !requiredRole) return false;
  
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
};

// Check if user can manage another user
export const canManageUser = (managerRole, targetUserRole) => {
  if (!managerRole || !targetUserRole) return false;
  
  // Admin can manage everyone
  if (managerRole === USER_ROLES.ADMIN) return true;
  
  // Manager can manage support, finance, and user roles
  if (managerRole === USER_ROLES.MANAGER) {
    return [USER_ROLES.SUPPORT, USER_ROLES.FINANCE, USER_ROLES.USER].includes(targetUserRole);
  }
  
  // Finance can manage user role
  if (managerRole === USER_ROLES.FINANCE) {
    return targetUserRole === USER_ROLES.USER;
  }
  
  // Support can manage user role
  if (managerRole === USER_ROLES.SUPPORT) {
    return targetUserRole === USER_ROLES.USER;
  }
  
  return false;
};

// Check if user can access own resources
export const canAccessOwnResource = (userId, resourceUserId, userRole) => {
  if (!userId || !resourceUserId) return false;
  
  // Users can only access their own resources
  if (userRole === USER_ROLES.USER) {
    return userId === resourceUserId;
  }
  
  // Other roles can access any resource
  return true;
};

// Get accessible routes for a role
export const getAccessibleRoutes = (userRole, routes) => {
  if (!userRole || !routes) return [];
  
  return routes.filter(route => canAccessRoute(userRole, route));
};

// Filter menu items by role
export const filterMenuByRole = (userRole, menuItems) => {
  if (!userRole || !menuItems) return [];
  
  return menuItems.filter(item => {
    if (item.roles && !item.roles.includes(userRole)) {
      return false;
    }
    
    if (item.permissions && !hasAnyPermission(userRole, item.permissions)) {
      return false;
    }
    
    return true;
  });
};

// Check if user can view financial data
export const canViewFinancialData = (userRole) => {
  return hasAnyPermission(userRole, [
    PERMISSIONS.READ_PAYMENTS,
    PERMISSIONS.MANAGE_PAYMENTS,
    PERMISSIONS.MANAGE_TRANSACTIONS,
    PERMISSIONS.MANAGE_PAYOUTS,
  ]);
};

// Check if user can manage users
export const canManageUsers = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.MANAGE_USERS);
};

// Check if user can manage investors
export const canManageInvestors = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.MANAGE_INVESTORS);
};

// Check if user can manage CRM
export const canManageCRM = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.MANAGE_CRM);
};

// Check if user can manage reports
export const canManageReports = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.MANAGE_REPORTS);
};

// Check if user can access analytics
export const canAccessAnalytics = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.MANAGE_ANALYTICS);
};

// Check if user can delete resources
export const canDelete = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.DELETE_ALL);
};

// Check if user can export data
export const canExportData = (userRole) => {
  return hasAnyPermission(userRole, [
    PERMISSIONS.MANAGE_REPORTS,
    PERMISSIONS.MANAGE_ANALYTICS,
    PERMISSIONS.MANAGE_PAYMENTS,
  ]);
};

// Get role display name
export const getRoleDisplayName = (role) => {
  const roleNames = {
    [USER_ROLES.ADMIN]: 'Administrator',
    [USER_ROLES.MANAGER]: 'Manager',
    [USER_ROLES.FINANCE]: 'Finance',
    [USER_ROLES.SUPPORT]: 'Support',
    [USER_ROLES.USER]: 'User',
  };
  
  return roleNames[role] || 'Unknown';
};

// Get permission display name
export const getPermissionDisplayName = (permission) => {
  const permissionNames = {
    [PERMISSIONS.READ_ALL]: 'Read All',
    [PERMISSIONS.READ_OWN]: 'Read Own',
    [PERMISSIONS.READ_USERS]: 'Read Users',
    [PERMISSIONS.READ_INVESTORS]: 'Read Investors',
    [PERMISSIONS.READ_PAYMENTS]: 'Read Payments',
    [PERMISSIONS.READ_REPORTS]: 'Read Reports',
    [PERMISSIONS.READ_CRM]: 'Read CRM',
    
    [PERMISSIONS.WRITE_ALL]: 'Write All',
    [PERMISSIONS.WRITE_OWN]: 'Write Own',
    [PERMISSIONS.WRITE_USERS]: 'Write Users',
    [PERMISSIONS.WRITE_INVESTORS]: 'Write Investors',
    [PERMISSIONS.WRITE_PAYMENTS]: 'Write Payments',
    [PERMISSIONS.WRITE_CRM]: 'Write CRM',
    
    [PERMISSIONS.DELETE_ALL]: 'Delete All',
    
    [PERMISSIONS.MANAGE_USERS]: 'Manage Users',
    [PERMISSIONS.MANAGE_INVESTORS]: 'Manage Investors',
    [PERMISSIONS.MANAGE_PAYMENTS]: 'Manage Payments',
    [PERMISSIONS.MANAGE_REPORTS]: 'Manage Reports',
    [PERMISSIONS.MANAGE_CRM]: 'Manage CRM',
    [PERMISSIONS.MANAGE_TRANSACTIONS]: 'Manage Transactions',
    [PERMISSIONS.MANAGE_PAYOUTS]: 'Manage Payouts',
    [PERMISSIONS.MANAGE_TICKETS]: 'Manage Tickets',
    [PERMISSIONS.MANAGE_COMMUNICATIONS]: 'Manage Communications',
    [PERMISSIONS.MANAGE_ANALYTICS]: 'Manage Analytics',
  };
  
  return permissionNames[permission] || permission;
};

// Create permission checker hook
export const createPermissionChecker = (userRole) => {
  return {
    hasPermission: (permission) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions) => hasAnyPermission(userRole, permissions),
    hasAllPermissions: (permissions) => hasAllPermissions(userRole, permissions),
    canAccessRoute: (route) => canAccessRoute(userRole, route),
    canPerformAction: (action, resource) => canPerformAction(userRole, action, resource),
    canManageUser: (targetRole) => canManageUser(userRole, targetRole),
    canAccessOwnResource: (userId, resourceUserId) => canAccessOwnResource(userId, resourceUserId, userRole),
    canViewFinancialData: () => canViewFinancialData(userRole),
    canManageUsers: () => canManageUsers(userRole),
    canManageInvestors: () => canManageInvestors(userRole),
    canManageCRM: () => canManageCRM(userRole),
    canManageReports: () => canManageReports(userRole),
    canAccessAnalytics: () => canAccessAnalytics(userRole),
    canDelete: () => canDelete(userRole),
    canExportData: () => canExportData(userRole),
    getRolePermissions: () => getRolePermissions(userRole),
    getRoleDisplayName: () => getRoleDisplayName(userRole),
  };
};

// Permission middleware for API calls
export const withPermissionCheck = (apiCall, permission, userRole) => {
  return (...args) => {
    if (!hasPermission(userRole, permission)) {
      throw new Error('Insufficient permissions');
    }
    
    return apiCall(...args);
  };
};

// Higher-order component for permission-based rendering
export const withPermission = (Component, requiredPermission) => {
  return (props) => {
    const { user } = props;
    
    if (!user || !hasPermission(user.role, requiredPermission)) {
      return null; // or a fallback component
    }
    
    return <Component {...props} />;
  };
};

// Permission-based conditional rendering
export const PermissionGate = ({ 
  user, 
  permission, 
  permissions, 
  requireAll = false, 
  children, 
  fallback = null 
}) => {
  if (!user) return fallback;
  
  let hasRequiredPermission = false;
  
  if (permission) {
    hasRequiredPermission = hasPermission(user.role, permission);
  } else if (permissions) {
    hasRequiredPermission = requireAll 
      ? hasAllPermissions(user.role, permissions)
      : hasAnyPermission(user.role, permissions);
  }
  
  return hasRequiredPermission ? children : fallback;
};