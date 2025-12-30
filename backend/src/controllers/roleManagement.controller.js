import RoleManagementService from '../services/roleManagement.service.js';
import User from '../models/user.model.js';
import logger from '../helpers/logger.js';
import { getErrorMessage } from '../helpers/dbErrorHandler.js';

/**
 * Get all available roles in the system
 */
const getAllRoles = async (req, res) => {
  try {
    const roles = RoleManagementService.getAllRoles();
    res.status(200).json({
      success: true,
      data: {
        roles,
        hierarchy: {
          superadmin: 6,
          admin: 5,
          manager: 4,
          analyst: 3,
          investor: 2,
          user: 1,
        },
      },
    });
  } catch (error) {
    logger.error('Error getting all roles:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ROLES_ERROR',
        message: 'Failed to retrieve roles',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }
};

/**
 * Get role statistics
 */
const getRoleStatistics = async (req, res) => {
  try {
    const statistics = await RoleManagementService.getRoleStatistics();
    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    logger.error('Error getting role statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ROLE_STATISTICS_ERROR',
        message: 'Failed to retrieve role statistics',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }
};

/**
 * Get users by role
 */
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    if (!RoleManagementService.isValidRole(role)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROLE',
          message: `Invalid role: ${role}`,
        },
      });
    }

    const users = await RoleManagementService.getUsersByRole(role);
    res.status(200).json({
      success: true,
      data: {
        role,
        count: users.length,
        users,
      },
    });
  } catch (error) {
    logger.error('Error getting users by role:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_USERS_BY_ROLE_ERROR',
        message: 'Failed to retrieve users by role',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }
};

/**
 * Assign a new role to a user
 */
const assignRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newRole, reason } = req.body;
    const initiatorId = req.auth._id;

    if (!newRole) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ROLE',
          message: 'New role is required',
        },
      });
    }

    const updatedUser = await RoleManagementService.assignRole(
      userId,
      newRole,
      initiatorId,
      reason
    );

    res.status(200).json({
      success: true,
      message: 'Role assigned successfully',
      data: {
        userId: updatedUser._id,
        previousRole:
          updatedUser.roleHistory[updatedUser.roleHistory.length - 1]
            ?.previousRole,
        newRole: updatedUser.role,
        changedAt:
          updatedUser.roleHistory[updatedUser.roleHistory.length - 1]
            ?.changedAt,
      },
    });
  } catch (error) {
    logger.error('Error assigning role:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'ASSIGN_ROLE_ERROR',
        message: error.message || 'Failed to assign role',
        details:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });
  }
};

/**
 * Grant specific permissions to a user
 */
const grantPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;
    const initiatorId = req.auth._id;

    if (
      !permissions ||
      !Array.isArray(permissions) ||
      permissions.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PERMISSIONS',
          message: 'Permissions array is required',
        },
      });
    }

    // Validate permission format
    const invalidPermissions = permissions.filter(
      (permission) => !/^[\w_]+:[\w_]+$/.test(permission)
    );

    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PERMISSION_FORMAT',
          message:
            'Invalid permission format. Expected format: "category:action"',
          details: { invalidPermissions },
        },
      });
    }

    const updatedUser = await RoleManagementService.grantPermissions(
      userId,
      permissions,
      initiatorId
    );

    res.status(200).json({
      success: true,
      message: 'Permissions granted successfully',
      data: {
        userId: updatedUser._id,
        grantedPermissions: permissions,
        currentPermissions: updatedUser.permissions,
      },
    });
  } catch (error) {
    logger.error('Error granting permissions:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'GRANT_PERMISSIONS_ERROR',
        message: error.message || 'Failed to grant permissions',
        details:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });
  }
};

/**
 * Revoke specific permissions from a user
 */
const revokePermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;
    const initiatorId = req.auth._id;

    if (
      !permissions ||
      !Array.isArray(permissions) ||
      permissions.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PERMISSIONS',
          message: 'Permissions array is required',
        },
      });
    }

    const updatedUser = await RoleManagementService.revokePermissions(
      userId,
      permissions,
      initiatorId
    );

    res.status(200).json({
      success: true,
      message: 'Permissions revoked successfully',
      data: {
        userId: updatedUser._id,
        revokedPermissions: permissions,
        currentPermissions: updatedUser.permissions,
      },
    });
  } catch (error) {
    logger.error('Error revoking permissions:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'REVOKE_PERMISSIONS_ERROR',
        message: error.message || 'Failed to revoke permissions',
        details:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });
  }
};

/**
 * Get role history for a user
 */
const getRoleHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await RoleManagementService.getRoleHistory(userId);

    res.status(200).json({
      success: true,
      data: {
        userId,
        history,
      },
    });
  } catch (error) {
    logger.error('Error getting role history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ROLE_HISTORY_ERROR',
        message: error.message || 'Failed to retrieve role history',
        details:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });
  }
};

/**
 * Get user permissions
 */
const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('role permissions');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    const rolePermissions = RoleManagementService.getRolePermissions(user.role);
    const userSpecificPermissions = user.permissions || [];

    res.status(200).json({
      success: true,
      data: {
        userId,
        role: user.role,
        rolePermissions,
        userSpecificPermissions,
        effectivePermissions: {
          ...rolePermissions,
          custom: userSpecificPermissions,
        },
      },
    });
  } catch (error) {
    logger.error('Error getting user permissions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_USER_PERMISSIONS_ERROR',
        message: 'Failed to retrieve user permissions',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }
};

/**
 * Get permission categories and actions
 */
const getPermissionCategories = async (req, res) => {
  try {
    const categories = {
      user_management: {
        description: 'User management operations',
        actions: ['create', 'read', 'update', 'delete'],
      },
      financial_access: {
        description: 'Financial data access',
        actions: ['view', 'edit', 'approve'],
      },
      analytics_access: {
        description: 'Analytics and reporting',
        actions: ['view', 'export', 'advanced'],
      },
      system_configuration: {
        description: 'System settings management',
        actions: ['view', 'modify'],
      },
      content_management: {
        description: 'Content operations',
        actions: ['create', 'update', 'delete', 'publish'],
      },
      communication_access: {
        description: 'Communication operations',
        actions: ['send', 'manage_templates', 'view_history'],
      },
    };

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error('Error getting permission categories:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PERMISSION_CATEGORIES_ERROR',
        message: 'Failed to retrieve permission categories',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }
};

/**
 * Batch role assignment for multiple users
 */
const batchAssignRoles = async (req, res) => {
  try {
    const { userRoles, reason } = req.body;
    const initiatorId = req.auth._id;

    if (!userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BATCH_REQUEST',
          message: 'User roles array is required',
        },
      });
    }

    const results = [];
    const errors = [];

    for (const { userId, newRole } of userRoles) {
      try {
        const updatedUser = await RoleManagementService.assignRole(
          userId,
          newRole,
          initiatorId,
          reason
        );
        results.push({
          userId,
          success: true,
          newRole: updatedUser.role,
        });
      } catch (error) {
        errors.push({
          userId,
          success: false,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${userRoles.length} role assignments`,
      data: {
        successful: results.length,
        failed: errors.length,
        results,
        errors,
      },
    });
  } catch (error) {
    logger.error('Error in batch role assignment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_ASSIGN_ROLES_ERROR',
        message: 'Failed to process batch role assignment',
        details:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });
  }
};

export {
  getAllRoles,
  getRoleStatistics,
  getUsersByRole,
  assignRole,
  grantPermissions,
  revokePermissions,
  getRoleHistory,
  getUserPermissions,
  getPermissionCategories,
  batchAssignRoles,
};
