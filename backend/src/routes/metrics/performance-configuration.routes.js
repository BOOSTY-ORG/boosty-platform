/**
 * Performance Configuration Routes
 *
 * This file defines all routes for performance configuration endpoints including:
 * - Dashboard configurations
 * - Alert configurations
 * - Threshold configurations
 * - Performance settings
 */

import { Router } from 'express';
import performanceConfigurationController from '../../controllers/metrics/performance-configuration.controller.js';
import {
  requirePerformanceAuth,
  requireDashboardConfigAccess,
  requireAlertConfigAccess,
  requireThresholdConfigAccess,
  requireSettingsConfigAccess,
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
    message: 'Too many configuration requests, please try again later.',
  })
);

/**
 * @route GET /api/v1/performance/configuration/dashboards
 * @desc Get dashboard configurations
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/dashboards',
  requireDashboardConfigAccess,
  dashboardCache,
  validateRequest({
    query: {
      type: {
        type: 'string',
        enum: ['all', 'overview', 'system', 'api', 'database', 'custom'],
        default: 'all',
      },
    },
  }),
  performanceConfigurationController.getDashboardConfigurations
);

/**
 * @route PUT /api/v1/performance/configuration/dashboards/:id
 * @desc Update dashboard configuration
 * @access Private (Admin, Manager)
 */
router.put(
  '/dashboards/:id',
  requireDashboardConfigAccess,
  // Cache invalidation would be implemented here in production
  validateRequest({
    params: {
      id: {
        type: 'string',
        required: true,
      },
    },
  }),
  performanceConfigurationController.updateDashboardConfiguration
);

/**
 * @route GET /api/v1/performance/configuration/alerts
 * @desc Get alert configurations
 * @access Private (Admin, Manager)
 */
router.get(
  '/alerts',
  requireAlertConfigAccess,
  dashboardCache,
  validateRequest({
    query: {
      type: {
        type: 'string',
        enum: ['all', 'system', 'api', 'database', 'redis', 'custom'],
        default: 'all',
      },
    },
  }),
  performanceConfigurationController.getAlertConfigurations
);

/**
 * @route PUT /api/v1/performance/configuration/alerts/:id
 * @desc Update alert configuration
 * @access Private (Admin only)
 */
router.put(
  '/alerts/:id',
  requireAlertConfigAccess,
  // Cache invalidation would be implemented here in production
  validateRequest({
    params: {
      id: {
        type: 'string',
        required: true,
      },
    },
  }),
  performanceConfigurationController.updateAlertConfiguration
);

/**
 * @route GET /api/v1/performance/configuration/thresholds
 * @desc Get threshold configurations
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/thresholds',
  requireThresholdConfigAccess,
  dashboardCache,
  validateRequest({
    query: {
      category: {
        type: 'string',
        enum: ['all', 'system', 'api', 'database', 'redis'],
        default: 'all',
      },
    },
  }),
  performanceConfigurationController.getThresholdConfigurations
);

/**
 * @route PUT /api/v1/performance/configuration/thresholds/:category
 * @desc Update threshold configuration
 * @access Private (Admin only)
 */
router.put(
  '/thresholds/:category',
  requireThresholdConfigAccess,
  // Cache invalidation would be implemented here in production
  validateRequest({
    params: {
      category: {
        type: 'string',
        required: true,
      },
    },
  }),
  performanceConfigurationController.updateThresholdConfiguration
);

/**
 * @route GET /api/v1/performance/configuration/settings
 * @desc Get performance settings
 * @access Private (Admin only)
 */
router.get(
  '/settings',
  requireSettingsConfigAccess,
  dashboardCache,
  performanceConfigurationController.getPerformanceSettings
);

/**
 * @route PUT /api/v1/performance/configuration/settings
 * @desc Update performance settings
 * @access Private (Admin only)
 */
router.put(
  '/settings',
  requireSettingsConfigAccess,
  // Cache invalidation would be implemented here in production
  performanceConfigurationController.updatePerformanceSettings
);

export default router;
