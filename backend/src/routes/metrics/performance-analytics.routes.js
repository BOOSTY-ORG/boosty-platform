/**
 * Performance Analytics Routes
 *
 * This file defines all routes for performance analytics endpoints including:
 * - Trends analysis
 * - Bottleneck detection
 * - Predictive analytics
 * - Performance comparisons
 * - Optimization recommendations
 * - Comprehensive performance reports
 */

import { Router } from 'express';
import performanceAnalyticsController from '../../controllers/metrics/performance-analytics.controller.js';
import {
  requirePerformanceAuth,
  requireAnalystAccess,
  requireTrendsAnalyticsAccess,
  requireBottlenecksAnalyticsAccess,
  requirePredictionsAnalyticsAccess,
  requireComparisonsAnalyticsAccess,
  requireRecommendationsAnalyticsAccess,
  requireReportsAnalyticsAccess,
  analyticsCache,
  auditPerformanceAccess,
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
 * @route GET /api/v1/performance/analytics/trends
 * @desc Get performance trends analysis
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/trends',
  requireTrendsAnalyticsAccess,
  analyticsCache,
  validateRequest({
    query: {
      timeRange: {
        type: 'string',
        enum: ['1h', '6h', '24h', '7d', '30d'],
        default: '24h',
      },
      metrics: {
        type: 'string',
        default: 'all',
      },
      granularity: {
        type: 'string',
        enum: ['auto', '1m', '5m', '15m', '1h'],
        default: 'auto',
      },
    },
  }),
  performanceAnalyticsController.getTrendsAnalysis
);

/**
 * @route GET /api/v1/performance/analytics/bottlenecks
 * @desc Get bottleneck detection analysis
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/bottlenecks',
  requireBottlenecksAnalyticsAccess,
  analyticsCache,
  validateRequest({
    query: {
      severity: {
        type: 'string',
        enum: ['all', 'critical', 'high', 'medium', 'low'],
        default: 'all',
      },
      category: {
        type: 'string',
        enum: ['all', 'system', 'api', 'database', 'redis'],
        default: 'all',
      },
      includeRecommendations: {
        type: 'boolean',
        default: true,
      },
    },
  }),
  performanceAnalyticsController.getBottlenecksAnalysis
);

/**
 * @route GET /api/v1/performance/analytics/predictions
 * @desc Get predictive analytics
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/predictions',
  requirePredictionsAnalyticsAccess,
  analyticsCache,
  validateRequest({
    query: {
      horizon: {
        type: 'string',
        enum: ['30m', '1h', '6h', '24h'],
        default: '1h',
      },
      confidence: {
        type: 'string',
        enum: ['50', '60', '70', '80', '90', '95'],
        default: '80',
      },
      metrics: {
        type: 'string',
        default: 'all',
      },
    },
  }),
  performanceAnalyticsController.getPredictiveAnalytics
);

/**
 * @route GET /api/v1/performance/analytics/comparisons
 * @desc Get performance comparisons
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/comparisons',
  requireComparisonsAnalyticsAccess,
  analyticsCache,
  validateRequest({
    query: {
      baseline: {
        type: 'string',
        enum: ['1h', '6h', '24h', '7d'],
        default: '24h',
      },
      comparison: {
        type: 'string',
        enum: ['1h', '6h', '24h', '7d'],
        default: '1h',
      },
      metrics: {
        type: 'string',
        default: 'all',
      },
    },
  }),
  performanceAnalyticsController.getPerformanceComparisons
);

/**
 * @route GET /api/v1/performance/analytics/recommendations
 * @desc Get optimization recommendations
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/recommendations',
  requireRecommendationsAnalyticsAccess,
  analyticsCache,
  validateRequest({
    query: {
      priority: {
        type: 'string',
        enum: ['all', 'critical', 'high', 'medium', 'low'],
        default: 'all',
      },
      category: {
        type: 'string',
        enum: ['all', 'system', 'api', 'database', 'redis'],
        default: 'all',
      },
      includeImpact: {
        type: 'boolean',
        default: true,
      },
    },
  }),
  performanceAnalyticsController.getOptimizationRecommendations
);

/**
 * @route GET /api/v1/performance/analytics/reports
 * @desc Get comprehensive performance report
 * @access Private (Admin, Manager, Analyst)
 */
router.get(
  '/reports',
  requireReportsAnalyticsAccess,
  analyticsCache,
  validateRequest({
    query: {
      timeRange: {
        type: 'string',
        enum: ['1h', '6h', '24h', '7d', '30d'],
        default: '24h',
      },
      sections: {
        type: 'string',
        default: 'all',
      },
      format: {
        type: 'string',
        enum: ['json', 'csv'],
        default: 'json',
      },
    },
  }),
  performanceAnalyticsController.getPerformanceReport
);

export default router;
