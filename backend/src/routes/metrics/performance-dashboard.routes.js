/**
 * Performance Dashboard Routes
 *
 * This file defines all routes for performance dashboard endpoints including:
 * - Dashboard overview
 * - System metrics dashboard
 * - API performance dashboard
 * - Database performance dashboard
 * - Alerts dashboard
 */

import { Router } from 'express';
import performanceDashboardController from '../../controllers/metrics/performance-dashboard.controller.js';
import {
  requirePerformanceAuth,
  requireOverviewDashboardAccess,
  requireSystemDashboardAccess,
  requireApiDashboardAccess,
  requireDatabaseDashboardAccess,
  requireAlertsDashboardAccess,
  dashboardCache,
  auditPerformanceAccess,
} from '../../middleware/metrics/performance-auth.middleware.js';
import { validateRequest } from '../../middleware/metrics/validation.middleware.js';
import { rateLimit } from '../../middleware/metrics/rateLimit.middleware.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(requirePerformanceAuth);

// Apply audit logging
router.use(auditPerformanceAccess);

// Apply rate limiting
router.use(
  rateLimit({
    max: 30, // 30 requests
    windowMs: 60000, // per minute
    message: 'Too many dashboard requests, please try again later.',
  })
);

/**
 * @route GET /api/v1/performance/dashboard/overview
 * @desc Get main dashboard overview
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/overview',
  requireOverviewDashboardAccess,
  dashboardCache,
  validateRequest({
    query: {
      timeRange: {
        type: 'string',
        enum: ['1h', '6h', '24h', '7d', '30d'],
        default: '1h',
      },
      refreshRate: {
        type: 'number',
        min: 5,
        max: 300,
        default: 30,
      },
    },
  }),
  performanceDashboardController.getDashboardOverview
);

/**
 * @route GET /api/v1/performance/dashboard/system
 * @desc Get system metrics dashboard
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/system',
  requireSystemDashboardAccess,
  dashboardCache,
  validateRequest({
    query: {
      timeRange: {
        type: 'string',
        enum: ['1h', '6h', '24h', '7d'],
        default: '1h',
      },
    },
  }),
  performanceDashboardController.getSystemDashboard
);

/**
 * @route GET /api/v1/performance/dashboard/api
 * @desc Get API performance dashboard
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/api',
  requireApiDashboardAccess,
  dashboardCache,
  validateRequest({
    query: {
      timeRange: {
        type: 'string',
        enum: ['1h', '6h', '24h', '7d'],
        default: '1h',
      },
    },
  }),
  performanceDashboardController.getApiDashboard
);

/**
 * @route GET /api/v1/performance/dashboard/database
 * @desc Get database performance dashboard
 * @access Private (Admin, Manager only)
 */
router.get(
  '/database',
  requireDatabaseDashboardAccess,
  dashboardCache,
  validateRequest({
    query: {
      timeRange: {
        type: 'string',
        enum: ['1h', '6h', '24h', '7d'],
        default: '1h',
      },
    },
  }),
  performanceDashboardController.getDatabaseDashboard
);

/**
 * @route GET /api/v1/performance/dashboard/alerts
 * @desc Get alerts dashboard
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/alerts',
  requireAlertsDashboardAccess,
  dashboardCache,
  validateRequest({
    query: {
      level: {
        type: 'string',
        enum: ['all', 'warning', 'critical'],
        default: 'all',
      },
      limit: {
        type: 'number',
        min: 1,
        max: 100,
        default: 50,
      },
      offset: {
        type: 'number',
        min: 0,
        default: 0,
      },
    },
  }),
  performanceDashboardController.getAlertsDashboard
);

export default router;
