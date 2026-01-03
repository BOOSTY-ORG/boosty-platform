import React, { createContext, useContext, useMemo } from 'react';
import { 
  getLevelConfig, 
  hasAccess, 
  hasPermission,
  mapRoleToLevel,
  ROLE_MAPPING 
} from '../components/access-indicators/utils/accessConfig';

const AccessContext = createContext({});

export const AccessProvider = ({ children, user }) => {
  // Map user role to access level
  const userLevel = user?.role ? mapRoleToLevel(user.role) : 'standard';
  const levelConfig = getLevelConfig(userLevel);

  const value = useMemo(
    () => ({
      // User access information
      userLevel,
      levelConfig,
      user,
      
      // Access checking functions
      hasAccess: (requiredLevel) => hasAccess(userLevel, requiredLevel),
      hasPermission: (permission) => hasPermission(userLevel, permission),
      
      // Convenience methods for common checks
      canViewUsers: hasPermission(userLevel, 'user_view'),
      canEditUsers: hasPermission(userLevel, 'user_edit'),
      canDeleteUsers: hasPermission(userLevel, 'user_delete'),
      canCreateUsers: hasPermission(userLevel, 'user_create'),
      
      canViewPayments: hasPermission(userLevel, 'payment_view'),
      canApprovePayments: hasPermission(userLevel, 'payment_approve'),
      canRefundPayments: hasPermission(userLevel, 'payment_refund'),
      
      canViewInvestors: hasPermission(userLevel, 'investor_view'),
      canEditInvestors: hasPermission(userLevel, 'investor_edit'),
      canDeleteInvestors: hasPermission(userLevel, 'investor_delete'),
      
      canViewReports: hasPermission(userLevel, 'reports_view'),
      canExportReports: hasPermission(userLevel, 'reports_export'),
      canViewAdvancedAnalytics: hasPermission(userLevel, 'analytics_advanced'),
      
      canConfigureSystem: hasPermission(userLevel, 'system_config'),
      canViewSystemLogs: hasPermission(userLevel, 'system_logs'),
      
      canViewCRM: hasPermission(userLevel, 'crm_view'),
      canEditCRM: hasPermission(userLevel, 'crm_edit'),
      canDeleteCRM: hasPermission(userLevel, 'crm_delete'),
      
      // Level checking helpers
      isPlatinum: userLevel === 'platinum',
      isGold: userLevel === 'gold',
      isSilver: userLevel === 'silver',
      isBronze: userLevel === 'bronze',
      isInvestor: userLevel === 'investor',
      isStandard: userLevel === 'standard',
      
      // Hierarchical checks
      isAdminOrAbove: hasAccess(userLevel, 'gold'),
      isManagerOrAbove: hasAccess(userLevel, 'silver'),
      isAnalystOrAbove: hasAccess(userLevel, 'bronze'),
      isInvestorOrAbove: hasAccess(userLevel, 'investor'),
      
      // Get access state for UI components
      getAccessState: (requiredLevel) => {
        return hasAccess(userLevel, requiredLevel) ? 'available' : 'restricted';
      },
      
      getPermissionState: (permission) => {
        return hasPermission(userLevel, permission) ? 'available' : 'restricted';
      },
      
      // Role mapping helpers
      getRoleFromLevel: (level) => {
        for (const [role, mappedLevel] of Object.entries(ROLE_MAPPING)) {
          if (mappedLevel === level) {
            return role;
          }
        }
        return 'user';
      },
      
      // Check if user can perform action on specific entity
      canPerformAction: (entityType, action) => {
        const permissionKey = `${entityType}_${action}`;
        return hasPermission(userLevel, permissionKey);
      },
    }),
    [userLevel, levelConfig, user]
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
};

export const useAccess = () => {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess must be used within an AccessProvider');
  }
  return context;
};

export default AccessContext;