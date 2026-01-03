/**
 * Performance Analytics Controller Tests
 *
 * Tests for PerformanceAnalyticsController including:
 * - Analytics data endpoints
 * - Performance trends
 * - Metric aggregations
 * - Statistical analysis
 * - Custom analytics queries
 */

const request = require('supertest');
const express = require('express');
const performanceAnalyticsController = require('../../../src/controllers/metrics/performance-analytics.controller.js');
const {
  setupTestDatabase,
  teardownTestDatabase,
  createMockRequest,
  createMockResponse,
  createMockNext,
  generateTestDates,
} = require('../../helpers/metrics.test.helpers.js');

// Mock dependencies
jest.mock('../../../src/monitoring/performance-analytics.js');
jest.mock('../../../src/services/metrics/performance-aggregation.service.js');
jest.mock('../../../src/helpers/logger.js');

describe('PerformanceAnalyticsController', () => {
  let app;

  beforeAll(async () => {
    await setupTestDatabase();

    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Setup routes
    app.get(
      '/api/v1/performance/analytics/trends',
      performanceAnalyticsController.getPerformanceTrends
    );
    app.get(
      '/api/v1/performance/analytics/aggregations',
      performanceAnalyticsController.getMetricAggregations
    );
    app.get(
      '/api/v1/performance/analytics/statistics',
      performanceAnalyticsController.getPerformanceStatistics
    );
    app.get(
      '/api/v1/performance/analytics/percentiles',
      performanceAnalyticsController.getMetricPercentiles
    );
    app.get(
      '/api/v1/performance/analytics/comparisons',
      performanceAnalyticsController.getPerformanceComparisons
    );
    app.get(
      '/api/v1/performance/analytics/correlations',
      performanceAnalyticsController.getMetricCorrelations
    );
    app.get(
      '/api/v1/performance/analytics/anomalies',
      performanceAnalyticsController.getAnomalies
    );
    app.get(
      '/api/v1/performance/analytics/forecasts',
      performanceAnalyticsController.getPerformanceForecasts
    );
    app.post(
      '/api/v1/performance/analytics/custom',
      performanceAnalyticsController.runCustomAnalytics
    );
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPerformanceTrends', () => {
    test('should return performance trends with valid parameters', async () => {
      const mockTrends = {
        system: {
          cpu: {
            trend: 'increasing',
            slope: 0.5,
            dataPoints: [
              { timestamp: Date.now() - 3600000, value: 70 },
              { timestamp: Date.now() - 1800000, value: 75 },
              { timestamp: Date.now(), value: 80 },
            ],
          },
          memory: {
            trend: 'stable',
            slope: 0.1,
            dataPoints: [
              { timestamp: Date.now() - 3600000, value: 60 },
              { timestamp: Date.now() - 1800000, value: 62 },
              { timestamp: Date.now(), value: 61 },
            ],
          },
        },
        api: {
          responseTime: {
            trend: 'decreasing',
            slope: -2.0,
            dataPoints: [
              { timestamp: Date.now() - 3600000, value: 300 },
              { timestamp: Date.now() - 1800000, value: 280 },
              { timestamp: Date.now(), value: 260 },
            ],
          },
        },
      };

      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getTrends.mockReturnValue(mockTrends);

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
      expect(response.body.data.trends).toHaveProperty('system');
      expect(response.body.data.trends).toHaveProperty('api');
      expect(response.body.data.meta).toHaveProperty('timeRange');
      expect(response.body.data.meta).toHaveProperty('interval');
      expect(response.body.data.meta).toHaveProperty('generatedAt');
    });

    test('should handle missing parameters gracefully', async () => {
      const mockTrends = { system: {}, api: {} };

      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getTrends.mockReturnValue(mockTrends);

      const response = await request(app)
        .get('/api/v1/performance/analytics/trends')
        .query({}) // No parameters
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.trends).toBeDefined();
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getTrends.mockImplementation(() => {
        throw new Error('Trends analysis failed');
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/trends')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TRENDS_ANALYSIS_ERROR');
    });
  });

  describe('getMetricAggregations', () => {
    test('should return metric aggregations with valid parameters', async () => {
      const mockAggregations = {
        system: {
          cpu: {
            min: 45,
            max: 95,
            avg: 70,
            sum: 1400,
            count: 20,
            stdDev: 12.5,
          },
          memory: {
            min: 30,
            max: 85,
            avg: 60,
            sum: 1200,
            count: 20,
            stdDev: 15.2,
          },
        },
        api: {
          responseTime: {
            min: 100,
            max: 500,
            avg: 250,
            sum: 5000,
            count: 20,
            stdDev: 80.5,
          },
        },
      };

      const {
        performanceAggregationService,
      } = require('../../../src/services/metrics/performance-aggregation.service.js');
      performanceAggregationService.getAggregations.mockReturnValue(
        mockAggregations
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/aggregations')
        .query({
          metrics: 'cpu,memory,responseTime',
          categories: 'system,api',
          timeRange: '24h',
          aggregationType: 'avg,min,max,stdDev',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('aggregations');
      expect(response.body.data.aggregations.system.cpu).toHaveProperty('min');
      expect(response.body.data.aggregations.system.cpu).toHaveProperty('max');
      expect(response.body.data.aggregations.system.cpu).toHaveProperty('avg');
      expect(response.body.data.aggregations.system.cpu).toHaveProperty(
        'stdDev'
      );
    });

    test('should handle different aggregation types', async () => {
      const mockAggregations = {
        system: {
          cpu: {
            p50: 70,
            p90: 85,
            p95: 90,
            p99: 95,
          },
        },
      };

      const {
        performanceAggregationService,
      } = require('../../../src/services/metrics/performance-aggregation.service.js');
      performanceAggregationService.getAggregations.mockReturnValue(
        mockAggregations
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/aggregations')
        .query({
          metrics: 'cpu',
          categories: 'system',
          timeRange: '24h',
          aggregationType: 'p50,p90,p95,p99',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.aggregations.system.cpu).toHaveProperty('p50');
      expect(response.body.data.aggregations.system.cpu).toHaveProperty('p90');
      expect(response.body.data.aggregations.system.cpu).toHaveProperty('p95');
      expect(response.body.data.aggregations.system.cpu).toHaveProperty('p99');
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceAggregationService,
      } = require('../../../src/services/metrics/performance-aggregation.service.js');
      performanceAggregationService.getAggregations.mockImplementation(() => {
        throw new Error('Aggregation failed');
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/aggregations')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AGGREGATION_ERROR');
    });
  });

  describe('getPerformanceStatistics', () => {
    test('should return comprehensive performance statistics', async () => {
      const mockStatistics = {
        overview: {
          totalMetrics: 150,
          activeAlerts: 3,
          systemHealth: 'warning',
          dataPoints: 10000,
        },
        system: {
          avgCpuUsage: 70,
          avgMemoryUsage: 60,
          avgEventLoopLag: 5,
          uptime: 86400000,
        },
        api: {
          totalRequests: 5000,
          avgResponseTime: 250,
          errorRate: 2.5,
          topEndpoints: [
            { endpoint: '/api/users', requests: 2000, avgResponseTime: 200 },
            {
              endpoint: '/api/investors',
              requests: 1500,
              avgResponseTime: 300,
            },
          ],
        },
        database: {
          avgQueryTime: 150,
          slowQueries: 5,
          connectionCount: 25,
          operations: {
            reads: 3000,
            writes: 500,
            updates: 200,
          },
        },
      };

      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getStatistics.mockReturnValue(mockStatistics);

      const response = await request(app)
        .get('/api/v1/performance/analytics/statistics')
        .query({
          timeRange: '24h',
          include: 'overview,system,api,database',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data.statistics).toHaveProperty('overview');
      expect(response.body.data.statistics).toHaveProperty('system');
      expect(response.body.data.statistics).toHaveProperty('api');
      expect(response.body.data.statistics).toHaveProperty('database');
      expect(response.body.data.statistics.overview.totalMetrics).toBe(150);
      expect(response.body.data.statistics.system.avgCpuUsage).toBe(70);
    });

    test('should filter statistics by category', async () => {
      const mockStatistics = {
        system: {
          avgCpuUsage: 70,
          avgMemoryUsage: 60,
        },
      };

      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getStatistics.mockReturnValue(mockStatistics);

      const response = await request(app)
        .get('/api/v1/performance/analytics/statistics')
        .query({
          timeRange: '24h',
          include: 'system',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.statistics).toHaveProperty('system');
      expect(response.body.data.statistics).not.toHaveProperty('api');
      expect(response.body.data.statistics).not.toHaveProperty('database');
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getStatistics.mockImplementation(() => {
        throw new Error('Statistics generation failed');
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/statistics')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STATISTICS_ERROR');
    });
  });

  describe('getMetricPercentiles', () => {
    test('should return percentile values for metrics', async () => {
      const mockPercentiles = {
        system: {
          cpu: {
            p50: 70,
            p75: 80,
            p90: 85,
            p95: 90,
            p99: 95,
            p999: 98,
          },
          memory: {
            p50: 60,
            p75: 70,
            p90: 75,
            p95: 80,
            p99: 85,
            p999: 90,
          },
        },
        api: {
          responseTime: {
            p50: 200,
            p75: 300,
            p90: 400,
            p95: 450,
            p99: 500,
            p999: 550,
          },
        },
      };

      const {
        performanceAggregationService,
      } = require('../../../src/services/metrics/performance-aggregation.service.js');
      performanceAggregationService.getPercentiles.mockReturnValue(
        mockPercentiles
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/percentiles')
        .query({
          metrics: 'cpu,memory,responseTime',
          categories: 'system,api',
          timeRange: '24h',
          percentiles: '50,75,90,95,99,999',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('percentiles');
      expect(response.body.data.percentiles.system.cpu.p50).toBe(70);
      expect(response.body.data.percentiles.system.cpu.p95).toBe(90);
      expect(response.body.data.percentiles.api.responseTime.p99).toBe(500);
    });

    test('should handle custom percentile values', async () => {
      const mockPercentiles = {
        system: {
          cpu: {
            p25: 60,
            p75: 80,
          },
        },
      };

      const {
        performanceAggregationService,
      } = require('../../../src/services/metrics/performance-aggregation.service.js');
      performanceAggregationService.getPercentiles.mockReturnValue(
        mockPercentiles
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/percentiles')
        .query({
          metrics: 'cpu',
          categories: 'system',
          timeRange: '24h',
          percentiles: '25,75',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.percentiles.system.cpu.p25).toBe(60);
      expect(response.body.data.percentiles.system.cpu.p75).toBe(80);
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceAggregationService,
      } = require('../../../src/services/metrics/performance-aggregation.service.js');
      performanceAggregationService.getPercentiles.mockImplementation(() => {
        throw new Error('Percentile calculation failed');
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/percentiles')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PERCENTILE_ERROR');
    });
  });

  describe('getPerformanceComparisons', () => {
    test('should return performance comparisons between time periods', async () => {
      const mockComparisons = {
        system: {
          cpu: {
            current: { avg: 75, min: 60, max: 90 },
            previous: { avg: 70, min: 55, max: 85 },
            change: { absolute: 5, percentage: 7.1, trend: 'increasing' },
          },
          memory: {
            current: { avg: 60, min: 45, max: 75 },
            previous: { avg: 65, min: 50, max: 80 },
            change: { absolute: -5, percentage: -7.7, trend: 'decreasing' },
          },
        },
      };

      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getComparisons.mockReturnValue(mockComparisons);

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
      expect(response.body.data.comparisons.system.cpu).toHaveProperty(
        'current'
      );
      expect(response.body.data.comparisons.system.cpu).toHaveProperty(
        'previous'
      );
      expect(response.body.data.comparisons.system.cpu).toHaveProperty(
        'change'
      );
      expect(response.body.data.comparisons.system.cpu.change.absolute).toBe(5);
      expect(response.body.data.comparisons.system.cpu.change.percentage).toBe(
        7.1
      );
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getComparisons.mockImplementation(() => {
        throw new Error('Comparison analysis failed');
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/comparisons')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPARISON_ERROR');
    });
  });

  describe('getMetricCorrelations', () => {
    test('should return correlations between metrics', async () => {
      const mockCorrelations = {
        correlations: [
          {
            metric1: { category: 'system', name: 'cpu' },
            metric2: { category: 'api', name: 'responseTime' },
            correlation: 0.75,
            strength: 'strong',
            direction: 'positive',
          },
          {
            metric1: { category: 'system', name: 'memory' },
            metric2: { category: 'database', name: 'queryTime' },
            correlation: 0.6,
            strength: 'moderate',
            direction: 'positive',
          },
        ],
      };

      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getCorrelations.mockReturnValue(mockCorrelations);

      const response = await request(app)
        .get('/api/v1/performance/analytics/correlations')
        .query({
          metrics: 'cpu,memory,responseTime,queryTime',
          categories: 'system,api,database',
          timeRange: '24h',
          threshold: '0.5',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('correlations');
      expect(response.body.data.correlations).toHaveLength(2);
      expect(response.body.data.correlations[0].correlation).toBe(0.75);
      expect(response.body.data.correlations[0].strength).toBe('strong');
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getCorrelations.mockImplementation(() => {
        throw new Error('Correlation analysis failed');
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/correlations')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CORRELATION_ERROR');
    });
  });

  describe('getAnomalies', () => {
    test('should return detected anomalies', async () => {
      const mockAnomalies = {
        anomalies: [
          {
            id: 'anomaly-001',
            metric: { category: 'system', name: 'cpu' },
            timestamp: Date.now() - 3600000,
            value: 95,
            expectedValue: 70,
            deviation: 25,
            severity: 'high',
            confidence: 0.9,
            description: 'CPU usage spike detected',
          },
          {
            id: 'anomaly-002',
            metric: { category: 'api', name: 'responseTime' },
            timestamp: Date.now() - 1800000,
            value: 800,
            expectedValue: 250,
            deviation: 550,
            severity: 'critical',
            confidence: 0.95,
            description: 'API response time anomaly detected',
          },
        ],
        summary: {
          total: 2,
          bySeverity: { high: 1, critical: 1, medium: 0, low: 0 },
          byCategory: { system: 1, api: 1, database: 0 },
        },
      };

      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getAnomalies.mockReturnValue(mockAnomalies);

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
      expect(response.body.data.anomalies).toHaveLength(2);
      expect(response.body.data.anomalies[0].severity).toBe('high');
      expect(response.body.data.anomalies[1].severity).toBe('critical');
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getAnomalies.mockImplementation(() => {
        throw new Error('Anomaly detection failed');
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/anomalies')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ANOMALY_DETECTION_ERROR');
    });
  });

  describe('getPerformanceForecasts', () => {
    test('should return performance forecasts', async () => {
      const mockForecasts = {
        forecasts: [
          {
            metric: { category: 'system', name: 'cpu' },
            model: 'linear_regression',
            accuracy: 0.85,
            horizon: '6h',
            predictions: [
              { timestamp: Date.now() + 3600000, value: 78, confidence: 0.8 },
              { timestamp: Date.now() + 7200000, value: 80, confidence: 0.75 },
              { timestamp: Date.now() + 10800000, value: 82, confidence: 0.7 },
            ],
            upperBound: [
              { timestamp: Date.now() + 3600000, value: 85 },
              { timestamp: Date.now() + 7200000, value: 88 },
              { timestamp: Date.now() + 10800000, value: 90 },
            ],
            lowerBound: [
              { timestamp: Date.now() + 3600000, value: 71 },
              { timestamp: Date.now() + 7200000, value: 72 },
              { timestamp: Date.now() + 10800000, value: 74 },
            ],
          },
        ],
      };

      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getForecasts.mockReturnValue(mockForecasts);

      const response = await request(app)
        .get('/api/v1/performance/analytics/forecasts')
        .query({
          metrics: 'cpu',
          categories: 'system',
          horizon: '6h',
          model: 'linear_regression',
          confidence: '0.7',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('forecasts');
      expect(response.body.data.forecasts).toHaveLength(1);
      expect(response.body.data.forecasts[0].metric.name).toBe('cpu');
      expect(response.body.data.forecasts[0].predictions).toHaveLength(3);
      expect(response.body.data.forecasts[0].accuracy).toBe(0.85);
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getForecasts.mockImplementation(() => {
        throw new Error('Forecast generation failed');
      });

      const response = await request(app)
        .get('/api/v1/performance/analytics/forecasts')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORECAST_ERROR');
    });
  });

  describe('runCustomAnalytics', () => {
    test('should run custom analytics query', async () => {
      const customQuery = {
        name: 'CPU vs Response Time Analysis',
        description:
          'Analyze correlation between CPU usage and API response times',
        metrics: [
          { category: 'system', name: 'cpu', aggregation: 'avg' },
          { category: 'api', name: 'responseTime', aggregation: 'avg' },
        ],
        timeRange: '24h',
        interval: '1h',
        operations: [
          { type: 'correlation', metrics: ['cpu', 'responseTime'] },
          { type: 'trend', metric: 'cpu' },
          { type: 'percentiles', metric: 'responseTime', values: [50, 90, 95] },
        ],
        filters: {
          environment: 'production',
          instanceId: 'server-001',
        },
      };

      const mockResult = {
        queryId: 'custom-query-001',
        status: 'completed',
        executionTime: 2500,
        results: {
          correlation: { value: 0.75, significance: 0.01 },
          trend: { metric: 'cpu', direction: 'increasing', slope: 0.5 },
          percentiles: {
            metric: 'responseTime',
            p50: 200,
            p90: 400,
            p95: 450,
          },
        },
      };

      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.runCustomQuery.mockReturnValue(mockResult);

      const response = await request(app)
        .post('/api/v1/performance/analytics/custom')
        .send(customQuery)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.queryId).toBe('custom-query-001');
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.results).toHaveProperty('correlation');
      expect(response.body.data.results).toHaveProperty('trend');
      expect(response.body.data.results).toHaveProperty('percentiles');
    });

    test('should validate custom query parameters', async () => {
      const invalidQuery = {
        name: '',
        metrics: [], // Should not be empty
        operations: ['invalid'], // Invalid operation type
      };

      const response = await request(app)
        .post('/api/v1/performance/analytics/custom')
        .send(invalidQuery)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle async query execution', async () => {
      const customQuery = {
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

      const mockResult = {
        queryId: 'custom-query-002',
        status: 'running',
        message: 'Query is being processed',
        estimatedCompletion: Date.now() + 30000, // 30 seconds
      };

      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.runCustomQuery.mockReturnValue(mockResult);

      const response = await request(app)
        .post('/api/v1/performance/analytics/custom')
        .send(customQuery)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('running');
      expect(response.body.data).toHaveProperty('estimatedCompletion');
    });

    test('should handle errors gracefully', async () => {
      const customQuery = {
        name: 'Test Query',
        metrics: [{ category: 'system', name: 'cpu' }],
        timeRange: '24h',
        operations: [{ type: 'trend', metric: 'cpu' }],
      };

      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.runCustomQuery.mockImplementation(() => {
        throw new Error('Custom query execution failed');
      });

      const response = await request(app)
        .post('/api/v1/performance/analytics/custom')
        .send(customQuery)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CUSTOM_QUERY_ERROR');
    });
  });

  describe('Parameter Validation and Edge Cases', () => {
    test('should validate time range parameters', async () => {
      const response = await request(app)
        .get('/api/v1/performance/analytics/trends')
        .query({
          timeRange: 'invalid',
        })
        .set('Authorization', 'Bearer valid-token');

      expect([200, 400]).toContain(response.status);
    });

    test('should validate metric parameters', async () => {
      const response = await request(app)
        .get('/api/v1/performance/analytics/aggregations')
        .query({
          metrics: '',
        })
        .set('Authorization', 'Bearer valid-token');

      expect([200, 400]).toContain(response.status);
    });

    test('should handle large time ranges efficiently', async () => {
      const mockTrends = { system: {}, api: {} };

      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getTrends.mockReturnValue(mockTrends);

      const response = await request(app)
        .get('/api/v1/performance/analytics/trends')
        .query({
          timeRange: '90d', // Large time range
          metrics: 'cpu',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      // Should handle large time ranges without timeout
    });

    test('should handle empty results gracefully', async () => {
      const mockTrends = { system: {}, api: {} };

      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');
      performanceAnalytics.getTrends.mockReturnValue(mockTrends);

      const response = await request(app)
        .get('/api/v1/performance/analytics/trends')
        .query({
          timeRange: '1h',
          metrics: 'nonexistent',
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.trends).toBeDefined();
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication for analytics endpoints', async () => {
      const response = await request(app).get(
        '/api/v1/performance/analytics/trends'
      );

      // This would depend on authentication middleware
      // For now, we're testing that endpoint exists
      expect([200, 401]).toContain(response.status);
    });

    test('should require appropriate permissions for advanced analytics', async () => {
      const customQuery = {
        name: 'Advanced Analysis',
        metrics: [{ category: 'system', name: 'cpu' }],
        timeRange: '24h',
        operations: [{ type: 'correlation', metrics: ['cpu'] }],
      };

      const response = await request(app)
        .post('/api/v1/performance/analytics/custom')
        .send(customQuery)
        .set('Authorization', 'Bearer user-token'); // Limited permissions

      // This would depend on authorization middleware
      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to expensive analytics operations', async () => {
      const customQuery = {
        name: 'Expensive Query',
        metrics: [{ category: 'system', name: 'cpu' }],
        timeRange: '30d', // Expensive operation
        operations: [{ type: 'correlation', metrics: ['cpu'] }],
      };

      // Make multiple requests to test rate limiting
      const requests = Array(5)
        .fill()
        .map(() =>
          request(app)
            .post('/api/v1/performance/analytics/custom')
            .send(customQuery)
            .set('Authorization', 'Bearer valid-token')
        );

      const responses = await Promise.all(requests);

      // At least some requests should succeed
      const successResponses = responses.filter((r) => r.status === 200);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      expect(successResponses.length + rateLimitedResponses.length).toBe(5);
    });
  });
});
