import { useAccess } from "../context/AccessContext";
import {
  getAccessState,
  getPermissionState,
  getLevelConfig,
} from "../components/access-indicators/utils/accessConfig";

export const useAccessLevel = () => {
  const {
    userLevel,
    hasAccess,
    hasPermission,
    getAccessState: contextGetAccessState,
    getPermissionState: contextGetPermissionState,
    ...accessData
  } = useAccess();

  // Enhanced access checking with state information
  const checkAccess = (requiredLevel) => {
    const isAccessible = hasAccess(requiredLevel);
    const state = contextGetAccessState(requiredLevel);
    const levelConfig = getLevelConfig(requiredLevel);

    return {
      isAccessible,
      state,
      levelConfig,
      requiredLevel,
      userLevel,
      tooltip: isAccessible
        ? `You have ${levelConfig.label} level access`
        : `Requires ${levelConfig.label} level access. Your current level: ${getLevelConfig(userLevel).label}`,
    };
  };

  // Enhanced permission checking with state information
  const checkPermission = (permission) => {
    const hasPermissionAccess = hasPermission(permission);
    const state = contextGetPermissionState(permission);

    return {
      hasPermission: hasPermissionAccess,
      state,
      permission,
      userLevel,
      tooltip: hasPermissionAccess
        ? `You have permission to ${permission.replace("_", " ")}`
        : `Requires higher privileges to ${permission.replace("_", " ")}`,
    };
  };

  // Get access information for navigation items
  const getNavigationAccess = (requiredLevel) => {
    const accessInfo = checkAccess(requiredLevel);

    return {
      ...accessInfo,
      isDisabled: !accessInfo.isAccessible,
      className: accessInfo.isAccessible
        ? "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        : "text-gray-400 cursor-not-allowed",
    };
  };

  // Get access information for actions
  const getActionAccess = (permission, actionName) => {
    const permissionInfo = checkPermission(permission);

    return {
      ...permissionInfo,
      actionName,
      isDisabled: !permissionInfo.hasPermission,
      variant: permissionInfo.hasPermission ? "available" : "restricted",
    };
  };

  // Get access information for headers
  const getHeaderAccess = (requiredLevel, title) => {
    const accessInfo = checkAccess(requiredLevel);

    return {
      ...accessInfo,
      title,
      showWarning: !accessInfo.isAccessible,
      description: accessInfo.isAccessible
        ? `Full access to ${title}`
        : `This section requires ${accessInfo.levelConfig.label} level access`,
    };
  };

  // Get access information for table rows
  const getTableAccess = (entityType, permissions, ownerId = null) => {
    const entityPermissions = {};

    Object.keys(permissions).forEach((action) => {
      const permissionKey = `${entityType}_${action}`;
      entityPermissions[action] = checkPermission(permissionKey);
    });

    return {
      entityType,
      permissions: entityPermissions,
      hasAnyPermission: Object.values(entityPermissions).some(
        (p) => p.hasPermission
      ),
      ownerId,
    };
  };

  // Get access information for form fields
  const getFormFieldAccess = (requiredLevel, fieldName, isEditable = true) => {
    const accessInfo = checkAccess(requiredLevel);
    const canEdit = accessInfo.isAccessible && isEditable;

    return {
      ...accessInfo,
      fieldName,
      isEditable: canEdit,
      isDisabled: !canEdit,
      reason: canEdit
        ? null
        : `Field requires ${accessInfo.levelConfig.label} access to edit`,
    };
  };

  // Get all access levels for comparison
  const getAllAccessLevels = () => {
    return ["platinum", "gold", "silver", "bronze", "investor", "standard"].map(
      (level) => ({
        level,
        config: getLevelConfig(level),
        isCurrent: level === userLevel,
        isAccessible: hasAccess(level),
      })
    );
  };

  // Get user's current access level information
  const getCurrentAccessLevel = () => {
    const config = getLevelConfig(userLevel);

    return {
      level: userLevel,
      config,
      label: config.label,
      description: config.description,
      priority: config.priority,
      icon: config.icon,
    };
  };

  return {
    // Original access data
    ...accessData,

    // Enhanced checking methods
    checkAccess,
    checkPermission,

    // Specialized access methods
    getNavigationAccess,
    getActionAccess,
    getHeaderAccess,
    getTableAccess,
    getFormFieldAccess,

    // Utility methods
    getAllAccessLevels,
    getCurrentAccessLevel,

    // Direct access to user level
    userLevel,
  };
};

export default useAccessLevel;
