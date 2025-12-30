import logger from '../helpers/logger.js';
import User from '../models/user.model.js';

/**
 * Role hierarchy and permissions configuration
 * Higher roles inherit permissions from lower roles
 */
const ROLE_HIERARCHY = {
  superadmin: 6,
  admin: 5,
  manager: 4,
  analyst: 3,
  investor: 2,
  user: 1,
};

/**
 * Permission categories and their specific actions
 */
const PERMISSION_CATEGORIES = {
  user_management: {
    create: ['superadmin', 'admin', 'manager'],
    read: ['superadmin', 'admin', 'manager', 'analyst'],
    update: ['superadmin', 'admin', 'manager'],
    delete: ['superadmin', 'admin'],
  },
  financial_access: {
    view: ['superadmin', 'admin', 'manager', 'analyst'],
    edit: ['superadmin', 'admin', 'manager'],
    approve: ['superadmin', 'admin'],
  },
  analytics_access: {
    view: ['superadmin', 'admin', 'manager', 'analyst'],
    export: ['superadmin', 'admin', 'manager', 'analyst'],
    advanced: ['superadmin', 'admin', 'analyst'],
  },
  system_configuration: {
    view: ['superadmin', 'admin'],
    modify: ['superadmin', 'admin'],
  },
  content_management: {
    create: ['superadmin', 'admin', 'manager'],
    update: ['superadmin', 'admin', 'manager'],
    delete: ['superadmin', 'admin'],
    publish: ['superadmin', 'admin'],
  },
  communication_access: {
    send: ['superadmin', 'admin', 'manager'],
    manage_templates: ['superadmin', 'admin', 'manager'],
    view_history: ['superadmin', 'admin', 'manager', 'analyst'],
  },
};

/**
 * Role Management Service
 * Handles role hierarchy, permissions, and role assignments
 */
class RoleManagementService {
  /**
   * Get all available roles in the system
   * @returns {Array} Array of role names
   */
  static getAllRoles() {
    return Object.keys(ROLE_HIERARCHY).sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]);
  }

  /**
   * Get role hierarchy level
   * @param {string} role - The role to check
   * @returns {number} Hierarchy level
   */
  static getRoleLevel(role) {
    return ROLE_HIERARCHY[role] || 0;
  }

  /**
   * Check if a role exists in the system
   * @param {string} role - The role to check
   * @returns {boolean} True if role exists
   */
  static isValidRole(role) {
    return Object.keys(ROLE_HIERARCHY).includes(role);
  }

  /**
   * Check if user has the required role or higher
   * @param {string} userRole - Current user role
   * @param {string|Array} requiredRoles - Required role(s)
   * @returns {boolean} True if user has required permissions
   */
  static hasRole(userRole, requiredRoles) {
    if (!userRole || !this.isValidRole(userRole)) {
      return false;
    }

    const userLevel = this.getRoleLevel(userRole);
    const requiredLevels = Array.isArray(requiredRoles)
      ? requiredRoles.map(role => this.getRoleLevel(role))
      : [this.getRoleLevel(requiredRoles)];

    return requiredLevels.some(requiredLevel => userLevel >= requiredLevel);
  }

  /**
   * Check if user has specific permission
   * @param {string} userRole - Current user role
   * @param {string} category - Permission category
   * @param {string} action - Specific action within category
   * @returns {boolean} True if user has permission
   */
  static hasPermission(userRole, category, action) {
    if (!userRole || !this.isValidRole(userRole)) {
      return false;
    }

    if (!PERMISSION_CATEGORIES[category] || !PERMISSION_CATEGORIES[category][action]) {
      return false;
    }

    const allowedRoles = PERMISSION_CATEGORIES[category][action];
    return this.hasRole(userRole, allowedRoles);
  }

  /**
   * Get all permissions for a specific role
   * @param {string} role - The role to get permissions for
   * @returns {Object} Object containing all permissions for the role
   */
  static getRolePermissions(role) {
    if (!this.isValidRole(role)) {
      return {};
    }

    const permissions = {};
    Object.keys(PERMISSION_CATEGORIES).forEach(category => {
      permissions[category] = {};
      Object.keys(PERMISSION_CATEGORIES[category]).forEach(action => {
        permissions[category][action] = this.hasPermission(role, category, action);
      });
    });

    return permissions;
  }

  /**
   * Check if a user can perform role escalation on another user
   * @param {string} initiatorRole - Role of the user making the change
   * @param {string} targetRole - Current role of the target user
   * @param {string} newRole - New role to assign to target user
   * @returns {boolean} True if escalation is allowed
   */
  static canAssignRole(initiatorRole, targetRole, newRole) {
    // Check if all roles are valid
    if (!this.isValidRole(initiatorRole) || !this.isValidRole(targetRole) || !this.isValidRole(newRole)) {
      return false;
    }

    const initiatorLevel = this.getRoleLevel(initiatorRole);
    const targetLevel = this.getRoleLevel(targetRole);
    const newLevel = this.getRoleLevel(newRole);

    // Cannot assign role higher than or equal to initiator's role
    if (newLevel >= initiatorLevel) {
      return false;
    }

    // Cannot modify users with equal or higher role
    if (targetLevel >= initiatorLevel) {
      return false;
    }

    return true;
  }

  /**
   * Assign a new role to a user
   * @param {string} userId - User ID to update
   * @param {string} newRole - New role to assign
   * @param {string} initiatorId - ID of user making the change
   * @param {string} reason - Reason for role change
   * @returns {Object} Updated user object
   */
  static async assignRole(userId, newRole, initiatorId, reason = '') {
    try {
      if (!this.isValidRole(newRole)) {
        throw new Error(`Invalid role: ${newRole}`);
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const initiator = await User.findById(initiatorId);
      if (!initiator) {
        throw new Error('Initiator not found');
      }

      const currentRole = user.role || user.userType || 'user';
      const initiatorRole = initiator.role || initiator.userType || 'user';

      if (!this.canAssignRole(initiatorRole, currentRole, newRole)) {
        throw new Error('Insufficient permissions to assign this role');
      }

      // Store role history
      const roleHistory = user.roleHistory || [];
      roleHistory.push({
        previousRole: currentRole,
        newRole: newRole,
        changedBy: initiatorId,
        changedAt: new Date(),
        reason: reason,
      });

      // Update user role
      user.role = newRole;
      user.roleHistory = roleHistory;
      user.userType = newRole; // Maintain backward compatibility

      await user.save();

      logger.info(`Role assigned to user ${userId}: ${currentRole} -> ${newRole} by ${initiatorId}`);

      return user;
    } catch (error) {
      logger.error('Error assigning role:', error);
      throw error;
    }
  }

  /**
   * Grant specific permissions to a user
   * @param {string} userId - User ID to update
   * @param {Array} permissions - Array of permissions to grant
   * @param {string} initiatorId - ID of user making the change
   * @returns {Object} Updated user object
   */
  static async grantPermissions(userId, permissions, initiatorId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const initiator = await User.findById(initiatorId);
      if (!initiator) {
        throw new Error('Initiator not found');
      }

      const initiatorRole = initiator.role || initiator.userType || 'user';
      const userRole = user.role || user.userType || 'user';

      // Check if initiator has permission to grant these permissions
      for (const permission of permissions) {
        const [category, action] = permission.split(':');
        // To grant permissions, user needs update permission on the category
        if (!this.hasPermission(initiatorRole, category, 'update')) {
          throw new Error(`Insufficient permissions to grant ${permission}`);
        }
      }

      // Add permissions to user
      const currentPermissions = user.permissions || [];
      const newPermissions = [...new Set([...currentPermissions, ...permissions])];

      user.permissions = newPermissions;
      await user.save();

      logger.info(`Permissions granted to user ${userId}: ${permissions.join(', ')} by ${initiatorId}`);

      return user;
    } catch (error) {
      logger.error('Error granting permissions:', error);
      throw error;
    }
  }

  /**
   * Revoke specific permissions from a user
   * @param {string} userId - User ID to update
   * @param {Array} permissions - Array of permissions to revoke
   * @param {string} initiatorId - ID of user making the change
   * @returns {Object} Updated user object
   */
  static async revokePermissions(userId, permissions, initiatorId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const initiator = await User.findById(initiatorId);
      if (!initiator) {
        throw new Error('Initiator not found');
      }

      const initiatorRole = initiator.role || initiator.userType || 'user';

      // Check if initiator has permission to revoke these permissions
      for (const permission of permissions) {
        const [category, action] = permission.split(':');
        if (!this.hasPermission(initiatorRole, category, 'update')) {
          throw new Error(`Insufficient permissions to revoke ${permission}`);
        }
      }

      // Remove permissions from user
      const currentPermissions = user.permissions || [];
      const updatedPermissions = currentPermissions.filter(
        permission => !permissions.includes(permission)
      );

      user.permissions = updatedPermissions;
      await user.save();

      logger.info(`Permissions revoked from user ${userId}: ${permissions.join(', ')} by ${initiatorId}`);

      return user;
    } catch (error) {
      logger.error('Error revoking permissions:', error);
      throw error;
    }
  }

  /**
   * Get role history for a user
   * @param {string} userId - User ID to get history for
   * @returns {Array} Array of role changes
   */
  static async getRoleHistory(userId) {
    try {
      const user = await User.findById(userId).select('roleHistory');
      if (!user) {
        throw new Error('User not found');
      }

      return user.roleHistory || [];
    } catch (error) {
      logger.error('Error getting role history:', error);
      throw error;
    }
  }

  /**
   * Get all users with a specific role
   * @param {string} role - Role to filter by
   * @returns {Array} Array of users with the specified role
   */
  static async getUsersByRole(role) {
    try {
      if (!this.isValidRole(role)) {
        throw new Error(`Invalid role: ${role}`);
      }

      const users = await User.find({
        $or: [{ role: role }, { userType: role }],
      }).select('name email role userType status');

      return users;
    } catch (error) {
      logger.error('Error getting users by role:', error);
      throw error;
    }
  }

  /**
   * Get role statistics
   * @returns {Object} Object with role counts
   */
  static async getRoleStatistics() {
    try {
      const pipeline = [
        {
          $group: {
            _id: {
              $ifNull: ['$role', '$userType'],
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ];

      const results = await User.aggregate(pipeline);
      const statistics = {};

      results.forEach(result => {
        statistics[result._id] = result.count;
      });

      // Ensure all roles are included in the statistics
      Object.keys(ROLE_HIERARCHY).forEach(role => {
        if (!statistics[role]) {
          statistics[role] = 0;
        }
      });

      return statistics;
    } catch (error) {
      logger.error('Error getting role statistics:', error);
      throw error;
    }
  }
}

export default RoleManagementService;