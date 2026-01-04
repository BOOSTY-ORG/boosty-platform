/**
 * Performance Authentication Middleware
 *
 * This middleware handles role-based access control for performance endpoints including:
 * - Tiered access control (Admin, Manager, Analyst)
 * - Endpoint-specific permissions
 * - Resource-based access control
 * - Audit logging for performance endpoint access
 */

import jwt from 'jsonwebtoken';
import User from '../../models/user.model.js';
import logger from '../../helpers/logger.js';

/**
 * Require performance-specific authentication
 */
const requirePerformanceAuth = async (req, res, next) => {
  try {
    const token = req.cookies.t || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'PERFORMANCE_AUTH_REQUIRED',
          message: 'Authentication token is required for performance endpoints',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id).select('role email name');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'PERFORMANCE_INVALID_TOKEN',
          message: 'Invalid authentication token',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Add performance-specific data to request
    req.auth = decoded;
    req.user = user;
    req.performanceAccess = {
      role: user.role,
      permissions: getRolePermissions(user.role),
    };

    // Log access to performance endpoints
    logger.info(`Performance endpoint access`, {
      userId: user._id,
      role: user.role,
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    next();
  } catch (error) {
    logger.error('Performance authentication error:', error);
    return res.status(401).json({
      success: false,
      error: {
        code: 'PERFORMANCE_AUTH_ERROR',
        message: 'Performance authentication failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Require specific performance access level
 */
const requirePerformanceAccess = (requiredLevel) => {
  return (req, res, next) => {
    if (!req.user || !req.performanceAccess) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'PERFORMANCE_ACCESS_DENIED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const userRole = req.user.role;
    const userPermissions = req.performanceAccess.permissions;

    // Check if user has required access level
    if (!hasRequiredAccess(userRole, requiredLevel)) {
      logger.warn(`Performance access denied`, {
        userId: req.user._id,
        role: userRole,
        requiredLevel,
        endpoint: req.path,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'PERFORMANCE_INSUFFICIENT_PERMISSIONS',
          message: `Access denied for ${userRole} role. Required level: ${requiredLevel}`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Add access level to request for downstream use
    req.performanceAccess.level = requiredLevel;
    next();
  };
};

/**
 * Require dashboard-specific access
 */
const requireDashboardAccess = (dashboardType) => {
  return (req, res, next) => {
    if (!req.user || !req.performanceAccess) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'DASHBOARD_ACCESS_DENIED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const userRole = req.user.role;
    const dashboardPermissions = getDashboardPermissions(userRole);

    // Check if user has access to specific dashboard type
    if (!dashboardPermissions[dashboardType]) {
      logger.warn(`Dashboard access denied`, {
        userId: req.user._id,
        role: userRole,
        dashboardType,
        endpoint: req.path,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'DASHBOARD_INSUFFICIENT_PERMISSIONS',
          message: `Access denied for ${userRole} role to ${dashboardType} dashboard`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Add dashboard permissions to request
    req.performanceAccess.dashboardPermissions =
      dashboardPermissions[dashboardType];
    next();
  };
};

/**
 * Require analytics-specific access
 */
const requireAnalyticsAccess = (analyticsType = 'all') => {
  return (req, res, next) => {
    if (!req.user || !req.performanceAccess) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ANALYTICS_ACCESS_DENIED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const userRole = req.user.role;
    const analyticsPermissions = getAnalyticsPermissions(userRole);

    // Check if user has access to specific analytics type
    if (analyticsType !== 'all' && !analyticsPermissions[analyticsType]) {
      logger.warn(`Analytics access denied`, {
        userId: req.user._id,
        role: userRole,
        analyticsType,
        endpoint: req.path,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'ANALYTICS_INSUFFICIENT_PERMISSIONS',
          message: `Access denied for ${userRole} role to ${analyticsType} analytics`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Add analytics permissions to request
    req.performanceAccess.analyticsPermissions =
      analyticsType === 'all'
        ? analyticsPermissions
        : analyticsPermissions[analyticsType];
    next();
  };
};

/**
 * Require configuration-specific access
 */
const requireConfigurationAccess = (configType = 'all') => {
  return (req, res, next) => {
    if (!req.user || !req.performanceAccess) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'CONFIG_ACCESS_DENIED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const userRole = req.user.role;
    const configPermissions = getConfigurationPermissions(userRole);

    // Check if user has access to specific configuration type
    if (configType !== 'all' && !configPermissions[configType]) {
      logger.warn(`Configuration access denied`, {
        userId: req.user._id,
        role: userRole,
        configType,
        endpoint: req.path,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'CONFIG_INSUFFICIENT_PERMISSIONS',
          message: `Access denied for ${userRole} role to ${configType} configuration`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Add configuration permissions to request
    req.performanceAccess.configPermissions =
      configType === 'all' ? configPermissions : configPermissions[configType];
    next();
  };
};

/**
 * Check if user has required access level
 */
const hasRequiredAccess = (userRole, requiredLevel) => {
  const accessLevels = {
    admin: ['admin', 'manager', 'analyst'],
    manager: ['manager', 'analyst'],
    analyst: ['analyst'],
  };

  return accessLevels[requiredLevel]?.includes(userRole) || false;
};

/**
 * Get permissions based on user role
 */
const getRolePermissions = (role) => {
  const permissions = {
    admin: {
      dashboard: ['read', 'write', 'configure', 'delete'],
      realtime: ['read', 'write', 'configure'],
      analytics: ['read', 'write', 'configure'],
      configuration: ['read', 'write', 'configure', 'delete'],
      alerts: ['read', 'write', 'acknowledge', 'resolve', 'configure'],
    },
    manager: {
      dashboard: ['read', 'write', 'configure'],
      realtime: ['read', 'write'],
      analytics: ['read', 'write'],
      configuration: ['read'],
      alerts: ['read', 'write', 'acknowledge'],
    },
    analyst: {
      dashboard: ['read'],
      realtime: ['read'],
      analytics: ['read'],
      configuration: [],
      alerts: ['read'],
    },
  };

  return permissions[role] || permissions.analyst;
};

/**
 * Get dashboard permissions based on user role
 */
const getDashboardPermissions = (role) => {
  const permissions = {
    admin: {
      overview: { view: true, edit: true, configure: true, delete: true },
      system: { view: true, edit: true, configure: true, delete: true },
      api: { view: true, edit: true, configure: true, delete: true },
      database: { view: true, edit: true, configure: true, delete: true },
      alerts: { view: true, edit: true, configure: true, delete: true },
    },
    manager: {
      overview: { view: true, edit: true, configure: true },
      system: { view: true, edit: true, configure: true },
      api: { view: true, edit: true, configure: true },
      database: { view: true, edit: true, configure: true },
      alerts: { view: true, edit: true, configure: true },
    },
    analyst: {
      overview: { view: true },
      system: { view: true },
      api: { view: true },
      database: { view: false },
      alerts: { view: true },
    },
  };

  return permissions[role] || permissions.analyst;
};

/**
 * Get analytics permissions based on user role
 */
const getAnalyticsPermissions = (role) => {
  const permissions = {
    admin: {
      trends: { view: true, export: true },
      bottlenecks: { view: true, export: true },
      predictions: { view: true, export: true },
      comparisons: { view: true, export: true },
      recommendations: { view: true, export: true },
      reports: { view: true, export: true, generate: true },
    },
    manager: {
      trends: { view: true, export: true },
      bottlenecks: { view: true, export: true },
      predictions: { view: true },
      comparisons: { view: true, export: true },
      recommendations: { view: true, export: true },
      reports: { view: true, export: true },
    },
    analyst: {
      trends: { view: true, export: true },
      bottlenecks: { view: true },
      predictions: { view: true },
      comparisons: { view: true },
      recommendations: { view: true },
      reports: { view: true, export: true },
    },
  };

  return permissions[role] || permissions.analyst;
};

/**
 * Get configuration permissions based on user role
 */
const getConfigurationPermissions = (role) => {
  const permissions = {
    admin: {
      dashboards: { view: true, create: true, edit: true, delete: true },
      alerts: { view: true, create: true, edit: true, delete: true },
      thresholds: { view: true, edit: true },
      settings: { view: true, edit: true },
    },
    manager: {
      dashboards: { view: true, create: true, edit: true },
      alerts: { view: true, create: true, edit: true },
      thresholds: { view: true },
      settings: { view: true },
    },
    analyst: {
      dashboards: { view: true },
      alerts: { view: true },
      thresholds: { view: true },
      settings: { view: true },
    },
  };

  return permissions[role] || permissions.analyst;
};

/**
 * Pre-defined access level middleware
 */
const requireAdminAccess = requirePerformanceAccess('admin');
const requireManagerAccess = requirePerformanceAccess('manager');
const requireAnalystAccess = requirePerformanceAccess('analyst');

/**
 * Dashboard-specific middleware
 */
const requireOverviewDashboardAccess = requireDashboardAccess('overview');
const requireSystemDashboardAccess = requireDashboardAccess('system');
const requireApiDashboardAccess = requireDashboardAccess('api');
const requireDatabaseDashboardAccess = requireDashboardAccess('database');
const requireAlertsDashboardAccess = requireDashboardAccess('alerts');

/**
 * Analytics-specific middleware
 */
const requireTrendsAnalyticsAccess = requireAnalyticsAccess('trends');
const requireBottlenecksAnalyticsAccess = requireAnalyticsAccess('bottlenecks');
const requirePredictionsAnalyticsAccess = requireAnalyticsAccess('predictions');
const requireComparisonsAnalyticsAccess = requireAnalyticsAccess('comparisons');
const requireRecommendationsAnalyticsAccess =
  requireAnalyticsAccess('recommendations');
const requireReportsAnalyticsAccess = requireAnalyticsAccess('reports');

/**
 * Configuration-specific middleware
 */
const requireDashboardConfigAccess = requireConfigurationAccess('dashboards');
const requireAlertConfigAccess = requireConfigurationAccess('alerts');
const requireThresholdConfigAccess = requireConfigurationAccess('thresholds');
const requireSettingsConfigAccess = requireConfigurationAccess('settings');

/**
 * Audit logging middleware
 */
const auditPerformanceAccess = (req, res, next) => {
  // Store original res.json to intercept responses
  const originalJson = res.json;

  res.json = function (data) {
    // Log the response for audit purposes
    logger.info('Performance endpoint response', {
      userId: req.user?._id,
      role: req.user?.role,
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      success: data?.success || false,
      responseTime: data?.meta?.responseTime,
      timestamp: new Date().toISOString(),
    });

    // Call original json method
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Rate limiting based on user role
 */
const roleBasedRateLimit = (limits) => {
  return (req, res, next) => {
    if (!req.user || !req.performanceAccess) {
      return next();
    }

    const userRole = req.user.role;
    const userLimits = limits[userRole] || limits.analyst;

    // Add rate limit info to request headers
    res.set({
      'X-RateLimit-Limit': userLimits.requests,
      'X-RateLimit-Window': userLimits.window,
      'X-RateLimit-Remaining': Math.max(
        0,
        userLimits.requests - (req.rateLimit?.current || 0)
      ),
    });

    next();
  };
};

// Simple cache middleware for dashboard responses
const dashboardCache = (req, res, next) => {
  // Simple cache implementation - in production, use Redis or similar
  const cacheKey = `dashboard_${req.user?.role}_${req.path}`;
  const cachedData = {}; // In production, this would be a proper cache
  
  if (cachedData[cacheKey]) {
    return res.json(cachedData[cacheKey]);
  }
  
  next();
};

export {
  requirePerformanceAuth,
  requirePerformanceAccess,
  requireDashboardAccess,
  requireAnalyticsAccess,
  requireConfigurationAccess,
  requireAdminAccess,
  requireManagerAccess,
  requireAnalystAccess,
  requireOverviewDashboardAccess,
  requireSystemDashboardAccess,
  requireApiDashboardAccess,
  requireDatabaseDashboardAccess,
  requireAlertsDashboardAccess,
  requireTrendsAnalyticsAccess,
  requireBottlenecksAnalyticsAccess,
  requirePredictionsAnalyticsAccess,
  requireComparisonsAnalyticsAccess,
  requireRecommendationsAnalyticsAccess,
  requireReportsAnalyticsAccess,
  requireDashboardConfigAccess,
  requireAlertConfigAccess,
  requireThresholdConfigAccess,
  requireSettingsConfigAccess,
  auditPerformanceAccess,
  roleBasedRateLimit,
  dashboardCache,
};
