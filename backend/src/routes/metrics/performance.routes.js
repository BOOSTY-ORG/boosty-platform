/**
 * Performance Monitoring Routes
 *
 * This file defines all routes related to performance monitoring including:
 * - Real-time metrics endpoints
 * - Historical data endpoints
 * - Alert management endpoints
 * - System health endpoints
 * - Performance analytics endpoints
 */

import { Router } from 'express';
import performanceController from '../../controllers/metrics/performance.controller.js';
import { authenticate } from '../../middleware/metrics/auth.middleware.js';
import { validateRequest } from '../../middleware/metrics/validation.middleware.js';
import { rateLimiter } from '../../middleware/metrics/rateLimit.middleware.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply rate limiting to prevent abuse
router.use(rateLimiter);

/**
 * @route GET /api/metrics/performance/realtime
 * @desc Get real-time performance metrics
 * @access Private
 */
router.get('/realtime', performanceController.getRealTimeMetrics);

/**
 * @route GET /api/metrics/performance/historical
 * @desc Get historical performance metrics
 * @access Private
 * @query {string} timeRange - Time range (1h, 6h, 24h, 7d, 30d)
 * @query {string} metric - Metric type (all, system, database, redis, api)
 * @query {string} granularity - Data granularity (1m, 5m, 15m, 1h)
 */
router.get(
  '/historical',
  validateRequest({
    query: {
      timeRange: {
        type: 'string',
        enum: ['1h', '6h', '24h', '7d', '30d'],
        default: '1h',
      },
      metric: {
        type: 'string',
        enum: ['all', 'system', 'database', 'redis', 'api'],
        default: 'all',
      },
      granularity: {
        type: 'string',
        enum: ['1m', '5m', '15m', '1h'],
        default: '1m',
      },
    },
  }),
  performanceController.getHistoricalMetrics
);

/**
 * @route GET /api/metrics/performance/alerts
 * @desc Get performance alerts
 * @access Private
 * @query {string} level - Alert level (all, warning, critical)
 * @query {number} limit - Number of alerts to return
 * @query {number} offset - Offset for pagination
 */
router.get(
  '/alerts',
  validateRequest({
    query: {
      level: {
        type: 'string',
        enum: ['all', 'warning', 'critical'],
        default: 'all',
      },
      limit: { type: 'number', min: 1, max: 100, default: 50 },
      offset: { type: 'number', min: 0, default: 0 },
    },
  }),
  performanceController.getAlerts
);

/**
 * @route GET /api/metrics/performance/health
 * @desc Get system health status
 * @access Private
 */
router.get('/health', performanceController.getSystemHealth);

/**
 * @route GET /api/metrics/performance/analytics
 * @desc Get performance analytics
 * @access Private
 * @query {string} timeRange - Time range for analysis (1h, 6h, 24h, 7d, 30d)
 * @query {string} analysis - Analysis type (all, trends, bottlenecks, regression, recommendations)
 */
router.get(
  '/analytics',
  validateRequest({
    query: {
      timeRange: {
        type: 'string',
        enum: ['1h', '6h', '24h', '7d', '30d'],
        default: '24h',
      },
      analysis: {
        type: 'string',
        enum: ['all', 'trends', 'bottlenecks', 'regression', 'recommendations'],
        default: 'all',
      },
    },
  }),
  performanceController.getPerformanceAnalytics
);

/**
 * @route GET /api/metrics/performance/endpoints/:endpoint
 * @desc Get detailed performance for a specific endpoint
 * @access Private
 * @param {string} endpoint - Endpoint identifier (e.g., "GET /api/users")
 * @query {string} timeRange - Time range for analysis (1h, 6h, 24h, 7d)
 */
router.get(
  '/endpoints/:endpoint',
  validateRequest({
    params: {
      endpoint: { type: 'string', required: true },
    },
    query: {
      timeRange: {
        type: 'string',
        enum: ['1h', '6h', '24h', '7d'],
        default: '1h',
      },
    },
  }),
  performanceController.getEndpointPerformance
);

/**
 * @route GET /api/metrics/performance/dashboard
 * @desc Get performance dashboard data
 * @access Private
 * @desc This endpoint aggregates multiple performance metrics for dashboard display
 */
router.get('/dashboard', performanceController.getRealTimeMetrics);

/**
 * @route GET /api/metrics/performance/summary
 * @desc Get performance summary
 * @access Private
 * @desc This endpoint provides a quick overview of system performance
 */
router.get('/summary', performanceController.getSystemHealth);

export default router;
