import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import RoleManagementService from '../services/roleManagement.service.js';
import logger from '../helpers/logger.js';

/**
 * Middleware to verify JWT token and attach user to request
 * This should be used before any role-based middleware
 */
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies.t || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token is required',
        },
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id).select(
      'role userType email name status permissions'
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
        },
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account is not active',
        },
      });
    }

    // Normalize role - prefer role field, fallback to userType
    const userRole = user.role || user.userType || 'user';

    req.auth = decoded;
    req.user = {
      ...user.toObject(),
      role: userRole, // Ensure role is consistently available
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed',
      },
    });
  }
};

/**
 * Middleware factory to check if user has required role(s)
 * @param {string|Array} requiredRoles - Required role(s) to access the resource
 * @returns {Function} Express middleware function
 */
const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: 'User role not found',
        },
      });
    }

    const hasRequiredRole = RoleManagementService.hasRole(
      req.user.role,
      requiredRoles
    );

    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: `Access denied. Required role(s): ${Array.isArray(requiredRoles) ? requiredRoles.join(', ') : requiredRoles}`,
        },
      });
    }

    next();
  };
};

/**
 * Middleware factory to check if user has specific permission
 * @param {string} category - Permission category
 * @param {string} action - Permission action
 * @returns {Function} Express middleware function
 */
const requirePermission = (category, action) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: 'User role not found',
        },
      });
    }

    // Check role-based permissions first
    const hasRolePermission = RoleManagementService.hasPermission(
      req.user.role,
      category,
      action
    );

    // Check user-specific permissions if role doesn't grant access
    const hasUserPermission =
      req.user.permissions &&
      req.user.permissions.includes(`${category}:${action}`);

    if (!hasRolePermission && !hasUserPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required permission: ${category}:${action}`,
        },
      });
    }

    next();
  };
};

/**
 * Middleware to check if user can access their own resource or has admin privileges
 * @param {string} resourceField - Field name containing the resource owner ID (default: 'userId')
 * @returns {Function} Express middleware function
 */
const requireOwnershipOrAdmin = (resourceField = 'userId') => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: 'User role not found',
        },
      });
    }

    const isOwner =
      req.auth && req.auth._id.toString() === req[resourceField]?.toString();
    const isAdmin = RoleManagementService.hasRole(req.user.role, [
      'admin',
      'manager',
      'superadmin',
    ]);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own data or need admin privileges',
        },
      });
    }

    next();
  };
};

/**
 * Middleware to prevent role escalation
 * Checks if the user is trying to assign a role equal to or higher than their own
 */
const preventRoleEscalation = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'ROLE_NOT_FOUND',
        message: 'User role not found',
      },
    });
  }

  const { newRole } = req.body;
  if (!newRole) {
    return next(); // No role assignment in this request
  }

  const canAssign = RoleManagementService.canAssignRole(
    req.user.role,
    req.targetUser?.role || 'user',
    newRole
  );

  if (!canAssign) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'ROLE_ESCALATION_DENIED',
        message: 'Cannot assign a role equal to or higher than your own role',
      },
    });
  }

  next();
};

/**
 * Middleware to fetch target user for role assignment operations
 * @param {string} userIdParam - Parameter name containing the target user ID (default: 'userId')
 * @returns {Function} Express middleware function
 */
const fetchTargetUser = (userIdParam = 'userId') => {
  return async (req, res, next) => {
    try {
      const targetUserId = req.params[userIdParam] || req.body[userIdParam];

      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'Target user ID is required',
          },
        });
      }

      const targetUser = await User.findById(targetUserId).select(
        'role userType email name status'
      );

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Target user not found',
          },
        });
      }

      // Normalize target user role
      req.targetUser = {
        ...targetUser.toObject(),
        role: targetUser.role || targetUser.userType || 'user',
      };

      next();
    } catch (error) {
      logger.error('Error fetching target user:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_USER_ERROR',
          message: 'Error fetching target user',
        },
      });
    }
  };
};

/**
 * Middleware to check resource-specific permissions
 * @param {string} resourceType - Type of resource (e.g., 'user', 'financial', 'analytics')
 * @param {string} action - Action to perform (e.g., 'create', 'read', 'update', 'delete')
 * @returns {Function} Express middleware function
 */
const requireResourcePermission = (resourceType, action) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: 'User role not found',
        },
      });
    }

    // Map resource types to permission categories
    const resourcePermissionMap = {
      user: 'user_management',
      financial: 'financial_access',
      analytics: 'analytics_access',
      system: 'system_configuration',
      content: 'content_management',
      communication: 'communication_access',
    };

    const category = resourcePermissionMap[resourceType];
    if (!category) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RESOURCE_TYPE',
          message: `Invalid resource type: ${resourceType}`,
        },
      });
    }

    const hasPermission = RoleManagementService.hasPermission(
      req.user.role,
      category,
      action
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'RESOURCE_ACCESS_DENIED',
          message: `Access denied for ${action} on ${resourceType} resources`,
        },
      });
    }

    next();
  };
};

/**
 * Predefined role middleware functions for convenience
 */
const requireSuperAdmin = requireRole('superadmin');
const requireAdmin = requireRole(['admin', 'superadmin']);
const requireManager = requireRole(['manager', 'admin', 'superadmin']);
const requireAnalyst = requireRole([
  'analyst',
  'manager',
  'admin',
  'superadmin',
]);
const requireInvestor = requireRole([
  'investor',
  'analyst',
  'manager',
  'admin',
  'superadmin',
]);

/**
 * Predefined permission middleware functions for common operations
 */
const canCreateUser = requirePermission('user_management', 'create');
const canReadUsers = requirePermission('user_management', 'read');
const canUpdateUser = requirePermission('user_management', 'update');
const canDeleteUser = requirePermission('user_management', 'delete');

const canViewFinancial = requirePermission('financial_access', 'view');
const canEditFinancial = requirePermission('financial_access', 'edit');
const canApproveFinancial = requirePermission('financial_access', 'approve');

const canViewAnalytics = requirePermission('analytics_access', 'view');
const canExportAnalytics = requirePermission('analytics_access', 'export');
const canAccessAdvancedAnalytics = requirePermission(
  'analytics_access',
  'advanced'
);

const canViewSystemConfig = requirePermission('system_configuration', 'view');
const canModifySystemConfig = requirePermission(
  'system_configuration',
  'modify'
);

const canCreateContent = requirePermission('content_management', 'create');
const canUpdateContent = requirePermission('content_management', 'update');
const canDeleteContent = requirePermission('content_management', 'delete');
const canPublishContent = requirePermission('content_management', 'publish');

const canSendCommunication = requirePermission('communication_access', 'send');
const canManageTemplates = requirePermission(
  'communication_access',
  'manage_templates'
);
const canViewCommunicationHistory = requirePermission(
  'communication_access',
  'view_history'
);

// Alias for requirePermission to maintain compatibility with existing imports
const authorize = requirePermission;

export {
  // Core middleware
  authenticateToken,
  requireRole,
  requirePermission,
  requireOwnershipOrAdmin,
  preventRoleEscalation,
  fetchTargetUser,
  requireResourcePermission,

  // Predefined role middleware
  requireSuperAdmin,
  requireAdmin,
  requireManager,
  requireAnalyst,
  requireInvestor,

  // Predefined permission middleware
  canCreateUser,
  canReadUsers,
  canUpdateUser,
  canDeleteUser,
  canViewFinancial,
  canEditFinancial,
  canApproveFinancial,
  canViewAnalytics,
  canExportAnalytics,
  canAccessAdvancedAnalytics,
  canViewSystemConfig,
  canModifySystemConfig,
  canCreateContent,
  canUpdateContent,
  canDeleteContent,
  canPublishContent,
  canSendCommunication,
  canManageTemplates,
  canViewCommunicationHistory,

  // Compatibility exports
  authorize,
};
