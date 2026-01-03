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
  configurationCache,
  auditPerformanceAccess,
  invalidatePerformanceCache,
} from '../../middleware/metrics/performance-auth.middleware.js';
import { validateRequest } from '../../middleware/metrics/validation.middleware.js';
import { rateLimiter } from '../../middleware/metrics/rateLimit.middleware.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(requirePerformanceAuth);

// Apply audit logging
router.use(auditPerformanceAccess);

// Apply rate limiting
router.use(rateLimiter);

/**
 * @route GET /api/v1/performance/configuration/dashboards
 * @desc Get dashboard configurations
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/dashboards',
  requireDashboardConfigAccess,
  configurationCache,
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
  invalidatePerformanceCache(['performance', 'dashboard']),
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
  configurationCache,
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
  invalidatePerformanceCache(['performance', 'alerts']),
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
  configurationCache,
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
  invalidatePerformanceCache(['performance', 'thresholds']),
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
  configurationCache,
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
  invalidatePerformanceCache(['performance', 'settings']),
  performanceConfigurationController.updatePerformanceSettings
);

export default router;
