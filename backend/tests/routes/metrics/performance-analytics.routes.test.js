/**
 * Performance Analytics Routes Tests
 *
 * Tests for performance analytics routes including:
 * - Route registration
 * - Middleware integration
 * - Request/response handling
 * - Error routing
 * - Route parameters
 */

const request = require('supertest');
const express = require('express');
const {
  setupTestDatabase,
  teardownTestDatabase,
  createMockRequest,
  createMockResponse,
  createMockNext,
} = require('../../../helpers/metrics.test.helpers.js');

// Mock dependencies
jest.mock(
  '../../../src/controllers/metrics/performance-analytics.controller.js'
);
jest.mock('../../../src/middleware/metrics/performance-auth.middleware.js');
jest.mock('../../../src/middleware/metrics/performance-cache.middleware.js');
jest.mock('../../../src/helpers/logger.js');

describe('Performance Analytics Routes', () => {
  let app, server;

  beforeAll(async () => {
    await setupTestDatabase();

    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Import and use routes
    const performanceAnalyticsRoutes = require('../../../src/routes/metrics/performance-analytics.routes.js');
    app.use('/api/v1/performance/analytics', performanceAnalyticsRoutes);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await teardownTestDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Route Registration', () => {
    test('should register analytics routes correctly', () => {
      // Check that routes are registered
      const app = express();
      const performanceAnalyticsRoutes = require('../../../src/routes/metrics/performance-analytics.routes.js');

      expect(typeof performanceAnalyticsRoutes).toBe('function');

      app.use('/test', performanceAnalyticsRoutes);

      // This is a basic test to ensure routes can be loaded
      expect(app._router).toBeDefined();
    });

    test('should have correct route paths', () => {
      const performanceAnalyticsRoutes = require('../../../src/routes/metrics/performance-analytics.routes.js');

      // This would require access to the Express router internals
      // For now, we're testing that the module exports a function
      expect(typeof performanceAnalyticsRoutes).toBe('function');
    });
  });

  describe('GET /api/v1/performance/analytics/trends', () => {
    test('should return performance trends', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getPerformanceTrends.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            trends: {},
            meta: {
              timeRange: req.query.timeRange,
              interval: req.query.interval,
            },
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/trends')
        .query({
          metrics: 'cpu,memory,responseTime',
          categories: 'system,api',
          timeRange: '24h',
          interval: '1h',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trends');
      expect(response.body.data.meta.timeRange).toBe('24h');
      expect(response.body.data.meta.interval).toBe('1h');
      expect(mockController.getPerformanceTrends).toHaveBeenCalled();
    });

    test('should handle missing parameters', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getPerformanceTrends.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            trends: {},
            meta: {
              timeRange: req.query.timeRange || '1h', // Default
              interval: req.query.interval || '1h', // Default
            },
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/trends')
        .query({}) // No parameters
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.meta.timeRange).toBe('1h');
      expect(response.body.data.meta.interval).toBe('1h');
    });

    test('should require authentication', async () => {
      const mockAuthMiddleware = require('../../../src/middleware/metrics/performance-auth.middleware.js');
      mockAuthMiddleware.requireRole.mockImplementation((req, res, next) => {
        res
          .status(401)
          .json({ success: false, error: 'Authentication required' });
      });

      const response = await request(app).get(
        '/api/v1/performance/analytics/trends'
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(mockAuthMiddleware.requireRole).toHaveBeenCalled();
    });

    test('should require appropriate permissions', async () => {
      const mockAuthMiddleware = require('../../../src/middleware/metrics/performance-auth.middleware.js');
      mockAuthMiddleware.requireRole.mockImplementation((req, res, next) => {
        req.user = { id: 'user123', role: 'user' }; // Insufficient permissions
        next();
      });

      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getPerformanceTrends.mockImplementation((req, res) => {
        res.json({ success: true, data: {} });
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/trends')
        .set('Authorization', 'Bearer user-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(mockAuthMiddleware.requireRole).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/performance/analytics/aggregations', () => {
    test('should return metric aggregations', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getMetricAggregations.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            aggregations: {},
            meta: {
              timeRange: req.query.timeRange,
              aggregationType: req.query.aggregationType,
            },
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/aggregations')
        .query({
          metrics: 'cpu,memory',
          categories: 'system',
          timeRange: '24h',
          aggregationType: 'avg,min,max,stdDev',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('aggregations');
      expect(response.body.data.meta.aggregationType).toBe(
        'avg,min,max,stdDev'
      );
      expect(mockController.getMetricAggregations).toHaveBeenCalled();
    });

    test('should validate aggregation parameters', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getMetricAggregations.mockImplementation(
        (req, res, next) => {
          const validTypes = [
            'avg',
            'min',
            'max',
            'sum',
            'count',
            'stdDev',
            'p50',
            'p90',
            'p95',
            'p99',
          ];

          if (req.query.aggregationType) {
            const types = req.query.aggregationType.split(',');
            const invalidTypes = types.filter(
              (type) => !validTypes.includes(type)
            );

            if (invalidTypes.length > 0) {
              return res.status(400).json({
                success: false,
                error: `Invalid aggregation types: ${invalidTypes.join(', ')}`,
              });
            }
          }

          res.json({ success: true, data: {} });
        }
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/aggregations')
        .query({ aggregationType: 'avg,invalid,min' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain(
        'Invalid aggregation types: invalid'
      );
    });
  });

  describe('GET /api/v1/performance/analytics/statistics', () => {
    test('should return performance statistics', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getPerformanceStatistics.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            statistics: {
              overview: {},
              system: {},
              api: {},
              database: {},
            },
            meta: {
              timeRange: req.query.timeRange,
              include: req.query.include,
            },
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/statistics')
        .query({
          timeRange: '24h',
          include: 'overview,system,api',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toHaveProperty('overview');
      expect(response.body.data.statistics).toHaveProperty('system');
      expect(response.body.data.statistics).toHaveProperty('api');
      expect(response.body.data.meta.include).toBe('overview,system,api');
      expect(mockController.getPerformanceStatistics).toHaveBeenCalled();
    });

    test('should handle large time ranges efficiently', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getPerformanceStatistics.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            statistics: {},
            meta: {
              timeRange: req.query.timeRange,
              processingTime: '150ms', // Simulate longer processing
            },
          },
        });
      });

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/v1/performance/analytics/statistics')
        .query({ timeRange: '90d' }) // Large time range
        .set('Authorization', 'Bearer valid-token');

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(processingTime).toBeGreaterThan(100); // Should take some time
    });
  });

  describe('GET /api/v1/performance/analytics/percentiles', () => {
    test('should return metric percentiles', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getMetricPercentiles.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            percentiles: {},
            meta: {
              timeRange: req.query.timeRange,
              percentiles: req.query.percentiles,
            },
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/percentiles')
        .query({
          metrics: 'cpu,memory',
          categories: 'system',
          timeRange: '24h',
          percentiles: '50,90,95,99',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('percentiles');
      expect(response.body.data.meta.percentiles).toBe('50,90,95,99');
      expect(mockController.getMetricPercentiles).toHaveBeenCalled();
    });

    test('should validate percentile values', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getMetricPercentiles.mockImplementation(
        (req, res, next) => {
          const percentiles = req.query.percentiles
            ? req.query.percentiles.split(',')
            : [];

          for (const p of percentiles) {
            const num = parseInt(p);
            if (isNaN(num) || num < 0 || num > 100) {
              return res.status(400).json({
                success: false,
                error: `Invalid percentile value: ${p}`,
              });
            }
          }

          res.json({ success: true, data: {} });
        }
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/percentiles')
        .query({ percentiles: '50,101,invalid' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid percentile value: 101');
      expect(response.body.error).toContain(
        'Invalid percentile value: invalid'
      );
    });
  });

  describe('GET /api/v1/performance/analytics/comparisons', () => {
    test('should return performance comparisons', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getPerformanceComparisons.mockImplementation(
        (req, res) => {
          res.json({
            success: true,
            data: {
              comparisons: {},
              meta: {
                currentPeriod: req.query.currentPeriod,
                previousPeriod: req.query.previousPeriod,
                previousOffset: req.query.previousOffset,
              },
            },
          });
        }
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/comparisons')
        .query({
          metrics: 'cpu,memory',
          categories: 'system',
          currentPeriod: '24h',
          previousPeriod: '24h',
          previousOffset: '24h',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('comparisons');
      expect(response.body.data.meta.currentPeriod).toBe('24h');
      expect(response.body.data.meta.previousPeriod).toBe('24h');
      expect(response.body.data.meta.previousOffset).toBe('24h');
      expect(mockController.getPerformanceComparisons).toHaveBeenCalled();
    });

    test('should validate time period parameters', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getPerformanceComparisons.mockImplementation(
        (req, res, next) => {
          const validPeriods = ['1h', '6h', '24h', '7d', '30d'];

          if (!validPeriods.includes(req.query.currentPeriod)) {
            return res.status(400).json({
              success: false,
              error: `Invalid current period: ${req.query.currentPeriod}`,
            });
          }

          res.json({ success: true, data: {} });
        }
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/comparisons')
        .query({ currentPeriod: 'invalid' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid current period: invalid');
    });
  });

  describe('GET /api/v1/performance/analytics/correlations', () => {
    test('should return metric correlations', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getMetricCorrelations.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            correlations: [],
            meta: {
              metrics: req.query.metrics,
              threshold: req.query.threshold,
            },
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/correlations')
        .query({
          metrics: 'cpu,memory,responseTime',
          categories: 'system,api',
          threshold: '0.5',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('correlations');
      expect(response.body.data.meta.metrics).toBe('cpu,memory,responseTime');
      expect(response.body.data.meta.threshold).toBe('0.5');
      expect(mockController.getMetricCorrelations).toHaveBeenCalled();
    });

    test('should validate correlation threshold', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getMetricCorrelations.mockImplementation(
        (req, res, next) => {
          const threshold = parseFloat(req.query.threshold);

          if (isNaN(threshold) || threshold < -1 || threshold > 1) {
            return res.status(400).json({
              success: false,
              error: `Invalid correlation threshold: ${req.query.threshold}`,
            });
          }

          res.json({ success: true, data: {} });
        }
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/correlations')
        .query({ threshold: '1.5' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain(
        'Invalid correlation threshold: 1.5'
      );
    });
  });

  describe('GET /api/v1/performance/analytics/anomalies', () => {
    test('should return detected anomalies', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getAnomalies.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            anomalies: [],
            summary: {},
            meta: {
              timeRange: req.query.timeRange,
              severity: req.query.severity,
              confidence: req.query.confidence,
            },
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/anomalies')
        .query({
          timeRange: '24h',
          severity: 'high,critical',
          confidence: '0.8',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('anomalies');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.meta.severity).toBe('high,critical');
      expect(response.body.data.meta.confidence).toBe('0.8');
      expect(mockController.getAnomalies).toHaveBeenCalled();
    });

    test('should handle anomaly detection parameters', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getAnomalies.mockImplementation((req, res, next) => {
        const validSeverities = ['info', 'warning', 'critical'];
        const severity = req.query.severity
          ? req.query.severity.split(',')
          : [];

        for (const s of severity) {
          if (!validSeverities.includes(s)) {
            return res.status(400).json({
              success: false,
              error: `Invalid severity level: ${s}`,
            });
          }
        }

        res.json({ success: true, data: {} });
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/anomalies')
        .query({ severity: 'info,invalid,critical' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid severity level: invalid');
    });
  });

  describe('GET /api/v1/performance/analytics/forecasts', () => {
    test('should return performance forecasts', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getPerformanceForecasts.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            forecasts: [],
            meta: {
              metrics: req.query.metrics,
              horizon: req.query.horizon,
              model: req.query.model,
              confidence: req.query.confidence,
            },
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/forecasts')
        .query({
          metrics: 'cpu,memory',
          horizon: '6h',
          model: 'linear_regression',
          confidence: '0.7',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('forecasts');
      expect(response.body.data.meta.metrics).toBe('cpu,memory');
      expect(response.body.data.meta.horizon).toBe('6h');
      expect(response.body.data.meta.model).toBe('linear_regression');
      expect(response.body.data.meta.confidence).toBe('0.7');
      expect(mockController.getPerformanceForecasts).toHaveBeenCalled();
    });

    test('should validate forecast parameters', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getPerformanceForecasts.mockImplementation(
        (req, res, next) => {
          const validModels = [
            'linear_regression',
            'moving_average',
            'exponential_smoothing',
          ];
          const validHorizons = ['1h', '6h', '24h', '7d'];

          if (req.query.model && !validModels.includes(req.query.model)) {
            return res.status(400).json({
              success: false,
              error: `Invalid forecast model: ${req.query.model}`,
            });
          }

          if (req.query.horizon && !validHorizons.includes(req.query.horizon)) {
            return res.status(400).json({
              success: false,
              error: `Invalid forecast horizon: ${req.query.horizon}`,
            });
          }

          res.json({ success: true, data: {} });
        }
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/forecasts')
        .query({ model: 'invalid_model', horizon: 'invalid_horizon' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain(
        'Invalid forecast model: invalid_model'
      );
      expect(response.body.error).toContain(
        'Invalid forecast horizon: invalid_horizon'
      );
    });
  });

  describe('POST /api/v1/performance/analytics/custom', () => {
    test('should run custom analytics query', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.runCustomAnalytics.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            queryId: 'custom-query-001',
            status: 'completed',
            results: {},
          },
        });
      });

      const customQuery = {
        name: 'Custom Performance Analysis',
        description: 'Analyzing CPU and memory correlation',
        metrics: [
          { category: 'system', name: 'cpu', aggregation: 'avg' },
          { category: 'system', name: 'memory', aggregation: 'avg' },
        ],
        timeRange: '24h',
        operations: [
          { type: 'correlation', metrics: ['cpu', 'memory'] },
          { type: 'trend', metric: 'cpu' },
        ],
      };

      const response = await request(app)
        .post('/api/v1/performance/analytics/custom')
        .send(customQuery)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('queryId');
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data).toHaveProperty('results');
      expect(mockController.runCustomAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ body: customQuery }),
        expect.any(Object),
        expect.any(Function)
      );
    });

    test('should handle async custom queries', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.runCustomAnalytics.mockImplementation((req, res) => {
        res.status(202).json({
          success: true,
          data: {
            queryId: 'custom-query-002',
            status: 'running',
            message: 'Query is being processed',
            estimatedCompletion: new Date(Date.now() + 30000),
          },
        });
      });

      const complexQuery = {
        name: 'Complex Analysis',
        metrics: [
          { category: 'system', name: 'cpu' },
          { category: 'api', name: 'responseTime' },
        ],
        timeRange: '7d', // Longer time range
        operations: [
          { type: 'correlation', metrics: ['cpu', 'responseTime'] },
          { type: 'anomaly_detection', metric: 'cpu' },
        ],
      };

      const response = await request(app)
        .post('/api/v1/performance/analytics/custom')
        .send(complexQuery)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(202);
      expect(response.body.data.status).toBe('running');
      expect(response.body.data).toHaveProperty('estimatedCompletion');
      expect(mockController.runCustomAnalytics).toHaveBeenCalled();
    });

    test('should validate custom query structure', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.runCustomAnalytics.mockImplementation((req, res, next) => {
        if (
          !req.body.name ||
          !req.body.metrics ||
          !Array.isArray(req.body.operations)
        ) {
          return res.status(400).json({
            success: false,
            error: 'Invalid query structure',
          });
        }

        res.json({ success: true, data: {} });
      });

      const invalidQuery = {
        // Missing required fields
        metrics: [{ category: 'system', name: 'cpu' }],
        operations: [{ type: 'correlation', metrics: ['cpu'] }],
      };

      const response = await request(app)
        .post('/api/v1/performance/analytics/custom')
        .send(invalidQuery)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid query structure');
    });
  });

  describe('Middleware Integration', () => {
    test('should apply caching to GET requests', async () => {
      const mockCacheMiddleware = require('../../../src/middleware/metrics/performance-cache.middleware.js');
      mockCacheMiddleware.cache.mockImplementation((options) => {
        return (req, res, next) => {
          // Simulate cache hit
          req.cacheHit = true;
          next();
        };
      });

      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getPerformanceTrends.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: { cacheHit: req.cacheHit },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/trends')
        .query({ metrics: 'cpu' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.cacheHit).toBe(true);
      expect(mockCacheMiddleware.cache).toHaveBeenCalled();
    });

    test('should not apply caching to POST requests', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.runCustomAnalytics.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: { cached: req.cached },
        });
      });

      const response = await request(app)
        .post('/api/v1/performance/analytics/custom')
        .send({ name: 'Test Query' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      // POST requests should not be cached
      expect(response.body.data).not.toHaveProperty('cached');
    });
  });

  describe('Error Handling', () => {
    test('should handle controller errors', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.getPerformanceTrends.mockImplementation(
        (req, res, next) => {
          const error = new Error('Analytics processing error');
          error.code = 'ANALYTICS_ERROR';
          next(error);
        }
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/trends')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ANALYTICS_ERROR');
    });

    test('should handle middleware errors', async () => {
      const mockAuthMiddleware = require('../../../src/middleware/metrics/performance-auth.middleware.js');
      mockAuthMiddleware.requireRole.mockImplementation((req, res, next) => {
        throw new Error('Authentication middleware error');
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/trends')
        .set('Authorization', 'Bearer valid-token');

      expect([500, 401]).toContain(response.status);
    });

    test('should handle large payload errors', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.runCustomAnalytics.mockImplementation((req, res) => {
        // Simulate payload too large error
        const error = new Error('Request payload too large');
        error.code = 'PAYLOAD_TOO_LARGE';
        next(error);
      });

      const largeQuery = {
        name: 'A'.repeat(10000), // Very large string
        metrics: Array(1000).fill({ category: 'system', name: 'cpu' }),
      };

      const response = await request(app)
        .post('/api/v1/performance/analytics/custom')
        .send(largeQuery)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to expensive operations', async () => {
      const mockRateLimitMiddleware = {
        rateLimit: jest.fn().mockImplementation((options) => {
          return (req, res, next) => {
            req.rateLimited = false;
            next();
          };
        }),
      };

      // Mock rate limiting middleware for custom analytics
      app.use(
        '/api/v1/performance/analytics/custom',
        mockRateLimitMiddleware.rateLimit({
          windowMs: 60000, // 1 minute
          max: 5, // Low limit for expensive operations
        })
      );

      const mockController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
      mockController.runCustomAnalytics.mockImplementation((req, res) => {
        res.json({ success: true, data: { rateLimited: req.rateLimited } });
      });

      // Make multiple requests to test rate limiting
      const requests = Array(10)
        .fill()
        .map(() =>
          request(app)
            .post('/api/v1/performance/analytics/custom')
            .send({ name: 'Test Query' })
            .set('Authorization', 'Bearer valid-token')
        );

      const responses = await Promise.all(requests);

      // Some requests should succeed, some should be rate limited
      const successResponses = responses.filter((r) => r.status === 200);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      expect(successResponses.length + rateLimitedResponses.length).toBe(10);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
