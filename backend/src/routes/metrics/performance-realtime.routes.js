/**
 * Performance Real-time Routes
 *
 * This file defines all routes for real-time performance endpoints including:
 * - Real-time metrics streaming
 * - System metrics streaming
 * - Endpoint-specific metrics streaming
 * - Real-time alerts streaming
 */

import { Router } from 'express';
import performanceRealtimeController from '../../controllers/metrics/performance-realtime.controller.js';
import {
  requirePerformanceAuth,
  requireAnalystAccess,
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

// Apply rate limiting (higher rate for real-time endpoints)
router.use(
  rateLimit({
    max: 100, // 100 requests
    windowMs: 60000, // per minute
    message: 'Too many real-time requests, please try again later.',
  })
);

/**
 * @route GET /api/v1/performance/realtime/metrics
 * @desc Get real-time metrics stream (SSE)
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/metrics',
  requireAnalystAccess,
  dashboardCache, // Very short cache for real-time data
  validateRequest({
    query: {
      interval: {
        type: 'number',
        min: 1000,
        max: 60000,
        default: 5000,
      },
    },
  }),
  performanceRealtimeController.getRealtimeMetrics
);

/**
 * @route GET /api/v1/performance/realtime/system
 * @desc Get real-time system metrics stream
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/system',
  requireAnalystAccess,
  dashboardCache, // Very short cache for real-time data
  validateRequest({
    query: {
      interval: {
        type: 'number',
        min: 1000,
        max: 60000,
        default: 2000,
      },
    },
  }),
  performanceRealtimeController.getRealtimeSystemMetrics
);

/**
 * @route GET /api/v1/performance/realtime/endpoints/:endpoint
 * @desc Get real-time endpoint metrics stream
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/endpoints/:endpoint',
  requireAnalystAccess,
  dashboardCache, // Very short cache for real-time data
  validateRequest({
    params: {
      endpoint: {
        type: 'string',
        required: true,
      },
    },
    query: {
      interval: {
        type: 'number',
        min: 1000,
        max: 60000,
        default: 3000,
      },
    },
  }),
  performanceRealtimeController.getRealtimeEndpointMetrics
);

/**
 * @route GET /api/v1/performance/realtime/alerts
 * @desc Get real-time alerts stream
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/alerts',
  requireAnalystAccess,
  dashboardCache, // Very short cache for real-time data
  validateRequest({
    query: {
      level: {
        type: 'string',
        enum: ['all', 'warning', 'critical'],
        default: 'all',
      },
    },
  }),
  performanceRealtimeController.getRealtimeAlerts
);

export default router;
