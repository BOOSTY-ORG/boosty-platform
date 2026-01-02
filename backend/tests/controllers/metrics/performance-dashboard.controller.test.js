/**
 * Performance Dashboard Controller Tests
 *
 * Tests for PerformanceDashboardController including:
 * - Dashboard overview endpoint
 * - System dashboard endpoint
 * - API dashboard endpoint
 * - Database dashboard endpoint
 * - Alerts dashboard endpoint
 * - Widget generation methods
 * - Error handling
 */

const request = require('supertest');
const express = require('express');
const performanceDashboardController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
const {
  setupTestDatabase,
  teardownTestDatabase,
  createMockRequest,
  createMockResponse,
  createMockNext,
  generateTestDates,
} = require('../../helpers/metrics.test.helpers.js');

// Mock the dependencies
jest.mock('../../../src/monitoring/performance-collector.js');
jest.mock('../../../src/monitoring/performance-analytics.js');
jest.mock('../../../src/config/monitoring.config.js');
jest.mock('../../../src/helpers/logger.js');

describe('PerformanceDashboardController', () => {
  let app;

  beforeAll(async () => {
    await setupTestDatabase();

    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Setup routes
    app.get(
      '/api/v1/performance/dashboard/overview',
      performanceDashboardController.getDashboardOverview
    );
    app.get(
      '/api/v1/performance/dashboard/system',
      performanceDashboardController.getSystemDashboard
    );
    app.get(
      '/api/v1/performance/dashboard/api',
      performanceDashboardController.getApiDashboard
    );
    app.get(
      '/api/v1/performance/dashboard/database',
      performanceDashboardController.getDatabaseDashboard
    );
    app.get(
      '/api/v1/performance/dashboard/alerts',
      performanceDashboardController.getAlertsDashboard
    );
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardOverview', () => {
    test('should return dashboard overview with valid time range', async () => {
      // Mock performance collector
      const mockMetricsSnapshot = {
        system: {
          cpu: [{ timestamp: Date.now() - 300000, value: 75 }],
          memory: [{ timestamp: Date.now() - 300000, value: 60 }],
          uptime: 86400000,
        },
        api: {
          responseTimes: [{ timestamp: Date.now() - 300000, value: 250 }],
          endpoints: {
            '/api/users': { count: 100, totalResponseTime: 25000, errors: 5 },
          },
          requestCount: 100,
          errorCount: 5,
        },
        alerts: [
          {
            level: 'warning',
            timestamp: Date.now() - 600000,
            message: 'High CPU usage',
          },
        ],
      };

      const mockPerformanceSummary = {
        system: { cpu: 75, memory: 60, eventLoopLag: 5 },
        api: { avgResponseTime: 250, requestCount: 100, errorCount: 5 },
      };

      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');
      const {
        performanceAnalytics,
      } = require('../../../src/monitoring/performance-analytics.js');

      performanceCollector.getMetricsSnapshot.mockReturnValue(
        mockMetricsSnapshot
      );
      performanceCollector.getPerformanceSummary.mockReturnValue(
        mockPerformanceSummary
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .query({ timeRange: '1h', refreshRate: '30' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data.timeRange).toBe('1h');
      expect(response.body.data.refreshInterval).toBe(30);
      expect(response.body.data).toHaveProperty('widgets');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('meta');
      expect(response.body.data.meta).toHaveProperty('generatedAt');
      expect(response.body.data.meta).toHaveProperty('responseTime');
      expect(response.body.data.meta).toHaveProperty('nextUpdate');
      expect(response.body.data.meta).toHaveProperty('dataFreshness');
    });

    test('should use default time range when not provided', async () => {
      const mockMetricsSnapshot = {
        system: { cpu: [], memory: [], uptime: 0 },
        api: {
          responseTimes: [],
          endpoints: {},
          requestCount: 0,
          errorCount: 0,
        },
        alerts: [],
      };

      const mockPerformanceSummary = {
        system: { cpu: 0, memory: 0, eventLoopLag: 0 },
        api: { avgResponseTime: 0, requestCount: 0, errorCount: 0 },
      };

      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');

      performanceCollector.getMetricsSnapshot.mockReturnValue(
        mockMetricsSnapshot
      );
      performanceCollector.getPerformanceSummary.mockReturnValue(
        mockPerformanceSummary
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.timeRange).toBe('1h'); // Default value
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');

      performanceCollector.getMetricsSnapshot.mockImplementation(() => {
        throw new Error('Collector error');
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DASHBOARD_OVERVIEW_ERROR');
      expect(response.body.error.message).toBe(
        'Failed to retrieve dashboard overview'
      );
    });

    test('should generate appropriate widgets for different user roles', async () => {
      const mockMetricsSnapshot = {
        system: { cpu: [], memory: [], uptime: 0 },
        api: {
          responseTimes: [],
          endpoints: {},
          requestCount: 0,
          errorCount: 0,
        },
        alerts: [],
      };

      const mockPerformanceSummary = {
        system: { cpu: 0, memory: 0, eventLoopLag: 0 },
        api: { avgResponseTime: 0, requestCount: 0, errorCount: 0 },
      };

      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');

      performanceCollector.getMetricsSnapshot.mockReturnValue(
        mockMetricsSnapshot
      );
      performanceCollector.getPerformanceSummary.mockReturnValue(
        mockPerformanceSummary
      );

      // Test with admin role
      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.data.widgets).toBeDefined();
      expect(Array.isArray(response.body.data.widgets)).toBe(true);

      // Check that widgets have proper permissions
      const widgets = response.body.data.widgets;
      widgets.forEach((widget) => {
        expect(widget).toHaveProperty('permissions');
        expect(widget.permissions).toHaveProperty('view');
        expect(widget.permissions).toHaveProperty('export');
        expect(widget.permissions).toHaveProperty('configure');
      });
    });
  });

  describe('getSystemDashboard', () => {
    test('should return system dashboard with valid time range', async () => {
      const mockMetricsSnapshot = {
        system: {
          cpu: [
            { timestamp: Date.now() - 300000, value: 75 },
            { timestamp: Date.now() - 600000, value: 70 },
          ],
          memory: [
            { timestamp: Date.now() - 300000, value: 60 },
            { timestamp: Date.now() - 600000, value: 55 },
          ],
          eventLoopLag: [
            { timestamp: Date.now() - 300000, value: 5 },
            { timestamp: Date.now() - 600000, value: 3 },
          ],
        },
      };

      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');
      performanceCollector.getMetricsSnapshot.mockReturnValue(
        mockMetricsSnapshot
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/system')
        .query({ timeRange: '6h' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.timeRange).toBe('6h');
      expect(response.body.data).toHaveProperty('widgets');
      expect(response.body.data.meta).toHaveProperty('nextUpdate');

      // Check for system-specific widgets
      const widgets = response.body.data.widgets;
      const cpuWidget = widgets.find((w) => w.id === 'cpu-usage');
      const memoryWidget = widgets.find((w) => w.id === 'memory-usage');
      const eventLoopWidget = widgets.find((w) => w.id === 'event-loop-lag');

      expect(cpuWidget).toBeDefined();
      expect(memoryWidget).toBeDefined();
      expect(eventLoopWidget).toBeDefined();

      expect(cpuWidget.data).toHaveProperty('current');
      expect(cpuWidget.data).toHaveProperty('average');
      expect(cpuWidget.data).toHaveProperty('trend');
      expect(cpuWidget.data).toHaveProperty('history');
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');

      performanceCollector.getMetricsSnapshot.mockImplementation(() => {
        throw new Error('System metrics error');
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/system')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SYSTEM_DASHBOARD_ERROR');
    });
  });

  describe('getApiDashboard', () => {
    test('should return API dashboard with valid time range', async () => {
      const mockMetricsSnapshot = {
        api: {
          responseTimes: [
            { timestamp: Date.now() - 300000, value: 250 },
            { timestamp: Date.now() - 600000, value: 300 },
          ],
          endpoints: {
            '/api/users': { count: 100, totalResponseTime: 25000, errors: 5 },
            '/api/investors': {
              count: 50,
              totalResponseTime: 15000,
              errors: 2,
            },
          },
          requestCount: 150,
          errorCount: 7,
        },
      };

      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');
      performanceCollector.getMetricsSnapshot.mockReturnValue(
        mockMetricsSnapshot
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/api')
        .query({ timeRange: '24h' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.timeRange).toBe('24h');
      expect(response.body.data).toHaveProperty('widgets');

      // Check for API-specific widgets
      const widgets = response.body.data.widgets;
      const responseTimeWidget = widgets.find(
        (w) => w.id === 'api-response-time'
      );
      const requestVolumeWidget = widgets.find(
        (w) => w.id === 'request-volume'
      );
      const topEndpointsWidget = widgets.find((w) => w.id === 'top-endpoints');

      expect(responseTimeWidget).toBeDefined();
      expect(requestVolumeWidget).toBeDefined();
      expect(topEndpointsWidget).toBeDefined();

      expect(responseTimeWidget.data).toHaveProperty('current');
      expect(responseTimeWidget.data).toHaveProperty('average');
      expect(responseTimeWidget.data).toHaveProperty('p95');
      expect(responseVolumeWidget.data).toHaveProperty('total');
      expect(requestVolumeWidget.data).toHaveProperty('errorCount');
      expect(requestVolumeWidget.data).toHaveProperty('errorRate');
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');

      performanceCollector.getMetricsSnapshot.mockImplementation(() => {
        throw new Error('API metrics error');
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/api')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('API_DASHBOARD_ERROR');
    });
  });

  describe('getDatabaseDashboard', () => {
    test('should return database dashboard with valid time range', async () => {
      const mockMetricsSnapshot = {
        database: {
          queryTimes: [
            { timestamp: Date.now() - 300000, value: 150 },
            { timestamp: Date.now() - 600000, value: 200 },
          ],
          slowQueries: [
            {
              operation: 'find',
              collection: 'users',
              queryTime: 500,
              timestamp: Date.now() - 300000,
            },
            {
              operation: 'aggregate',
              collection: 'transactions',
              queryTime: 800,
              timestamp: Date.now() - 600000,
            },
          ],
          connectionCount: 25,
        },
      };

      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');
      performanceCollector.getMetricsSnapshot.mockReturnValue(
        mockMetricsSnapshot
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/database')
        .query({ timeRange: '1h' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.timeRange).toBe('1h');
      expect(response.body.data).toHaveProperty('widgets');

      // Check for database-specific widgets
      const widgets = response.body.data.widgets;
      const queryPerformanceWidget = widgets.find(
        (w) => w.id === 'query-performance'
      );
      const slowQueriesWidget = widgets.find((w) => w.id === 'slow-queries');

      expect(queryPerformanceWidget).toBeDefined();
      expect(slowQueriesWidget).toBeDefined();

      expect(queryPerformanceWidget.data).toHaveProperty('average');
      expect(queryPerformanceWidget.data).toHaveProperty('slowQueries');
      expect(queryPerformanceWidget.data).toHaveProperty('connectionCount');
      expect(slowQueriesWidget.data).toHaveProperty('queries');
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');

      performanceCollector.getMetricsSnapshot.mockImplementation(() => {
        throw new Error('Database metrics error');
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/database')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DATABASE_DASHBOARD_ERROR');
    });
  });

  describe('getAlertsDashboard', () => {
    test('should return alerts dashboard with valid parameters', async () => {
      const mockMetricsSnapshot = {
        alerts: [
          {
            level: 'critical',
            timestamp: Date.now() - 300000,
            message: 'Critical CPU usage',
          },
          {
            level: 'warning',
            timestamp: Date.now() - 600000,
            message: 'High memory usage',
          },
          {
            level: 'info',
            timestamp: Date.now() - 900000,
            message: 'System update completed',
          },
          {
            level: 'warning',
            timestamp: Date.now() - 1200000,
            message: 'Slow API response',
          },
        ],
      };

      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');
      performanceCollector.getMetricsSnapshot.mockReturnValue(
        mockMetricsSnapshot
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/alerts')
        .query({ level: 'warning', limit: '10', offset: '0' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('widgets');
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('summary');

      // Check pagination
      expect(response.body.data.pagination.total).toBe(2); // 2 warning alerts
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.offset).toBe(0);

      // Check summary
      expect(response.body.data.summary.total).toBe(2);
      expect(response.body.data.summary.critical).toBe(0);
      expect(response.body.data.summary.warning).toBe(2);
      expect(response.body.data.summary.info).toBe(0);
    });

    test('should return all alerts when level is "all"', async () => {
      const mockMetricsSnapshot = {
        alerts: [
          {
            level: 'critical',
            timestamp: Date.now() - 300000,
            message: 'Critical CPU usage',
          },
          {
            level: 'warning',
            timestamp: Date.now() - 600000,
            message: 'High memory usage',
          },
          {
            level: 'info',
            timestamp: Date.now() - 900000,
            message: 'System update completed',
          },
        ],
      };

      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');
      performanceCollector.getMetricsSnapshot.mockReturnValue(
        mockMetricsSnapshot
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/alerts')
        .query({ level: 'all' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.summary.total).toBe(3);
      expect(response.body.data.summary.critical).toBe(1);
      expect(response.body.data.summary.warning).toBe(1);
      expect(response.body.data.summary.info).toBe(1);
    });

    test('should handle pagination correctly', async () => {
      const mockMetricsSnapshot = {
        alerts: Array.from({ length: 25 }, (_, i) => ({
          level: 'warning',
          timestamp: Date.now() - (i + 1) * 60000,
          message: `Warning alert ${i + 1}`,
        })),
      };

      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');
      performanceCollector.getMetricsSnapshot.mockReturnValue(
        mockMetricsSnapshot
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/alerts')
        .query({ limit: '10', offset: '20' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBe(25);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.offset).toBe(20);
      expect(response.body.data.pagination.hasMore).toBe(false);
      expect(response.body.data.alerts).toHaveLength(5); // Remaining items
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');

      performanceCollector.getMetricsSnapshot.mockImplementation(() => {
        throw new Error('Alerts error');
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/alerts')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ALERTS_DASHBOARD_ERROR');
    });
  });

  describe('Widget Generation Methods', () => {
    let controller;
    let mockMetrics;

    beforeEach(() => {
      controller = performanceDashboardController;
      mockMetrics = {
        system: {
          cpu: [
            { timestamp: Date.now() - 300000, value: 75 },
            { timestamp: Date.now() - 600000, value: 70 },
          ],
          memory: [
            { timestamp: Date.now() - 300000, value: 60 },
            { timestamp: Date.now() - 600000, value: 55 },
          ],
          uptime: 86400000,
        },
        api: {
          responseTimes: [
            { timestamp: Date.now() - 300000, value: 250 },
            { timestamp: Date.now() - 600000, value: 300 },
          ],
          endpoints: {
            '/api/users': { count: 100, totalResponseTime: 25000, errors: 5 },
          },
          requestCount: 100,
          errorCount: 5,
        },
        alerts: [
          {
            level: 'warning',
            timestamp: Date.now() - 600000,
            message: 'High CPU usage',
          },
        ],
      };
    });

    test('generateDashboardWidgets should create appropriate widgets', async () => {
      const widgets = await controller.generateDashboardWidgets(
        mockMetrics,
        3600000,
        'admin'
      );

      expect(widgets).toHaveLength(4); // system-health, performance-overview, recent-alerts, api-performance

      const systemHealthWidget = widgets.find((w) => w.id === 'system-health');
      expect(systemHealthWidget).toBeDefined();
      expect(systemHealthWidget.type).toBe('metric');
      expect(systemHealthWidget.data).toHaveProperty('status');
      expect(systemHealthWidget.data).toHaveProperty('uptime');

      const performanceOverviewWidget = widgets.find(
        (w) => w.id === 'performance-overview'
      );
      expect(performanceOverviewWidget).toBeDefined();
      expect(performanceOverviewWidget.type).toBe('chart');
      expect(performanceOverviewWidget.data).toHaveProperty('cpu');
      expect(performanceOverviewWidget.data).toHaveProperty('memory');
      expect(performanceOverviewWidget.data).toHaveProperty('responseTime');
    });

    test('generateSystemWidgets should create system-specific widgets', async () => {
      const widgets = await controller.generateSystemWidgets(
        mockMetrics,
        3600000,
        'admin'
      );

      expect(widgets).toHaveLength(3); // cpu-usage, memory-usage, event-loop-lag

      const cpuWidget = widgets.find((w) => w.id === 'cpu-usage');
      expect(cpuWidget).toBeDefined();
      expect(cpuWidget.type).toBe('chart');
      expect(cpuWidget.data).toHaveProperty('current');
      expect(cpuWidget.data).toHaveProperty('average');
      expect(cpuWidget.data).toHaveProperty('trend');
      expect(cpuWidget.config).toHaveProperty('thresholds');
    });

    test('generateApiWidgets should create API-specific widgets', async () => {
      const widgets = await controller.generateApiWidgets(
        mockMetrics,
        3600000,
        'admin'
      );

      expect(widgets).toHaveLength(3); // api-response-time, request-volume, top-endpoints

      const responseTimeWidget = widgets.find(
        (w) => w.id === 'api-response-time'
      );
      expect(responseTimeWidget).toBeDefined();
      expect(responseTimeWidget.type).toBe('chart');
      expect(responseTimeWidget.data).toHaveProperty('current');
      expect(responseTimeWidget.data).toHaveProperty('average');
      expect(responseTimeWidget.data).toHaveProperty('p95');

      const topEndpointsWidget = widgets.find((w) => w.id === 'top-endpoints');
      expect(topEndpointsWidget).toBeDefined();
      expect(topEndpointsWidget.type).toBe('table');
      expect(topEndpointsWidget.data).toHaveProperty('endpoints');
      expect(Array.isArray(topEndpointsWidget.data.endpoints)).toBe(true);
    });

    test('generateDatabaseWidgets should create database-specific widgets', async () => {
      mockMetrics.database = {
        queryTimes: [
          { timestamp: Date.now() - 300000, value: 150 },
          { timestamp: Date.now() - 600000, value: 200 },
        ],
        slowQueries: [
          {
            operation: 'find',
            collection: 'users',
            queryTime: 500,
            timestamp: Date.now() - 300000,
          },
        ],
        connectionCount: 25,
      };

      const widgets = await controller.generateDatabaseWidgets(
        mockMetrics,
        3600000,
        'admin'
      );

      expect(widgets).toHaveLength(2); // query-performance, slow-queries

      const queryPerformanceWidget = widgets.find(
        (w) => w.id === 'query-performance'
      );
      expect(queryPerformanceWidget).toBeDefined();
      expect(queryPerformanceWidget.type).toBe('chart');
      expect(queryPerformanceWidget.data).toHaveProperty('average');
      expect(queryPerformanceWidget.data).toHaveProperty('slowQueries');
      expect(queryPerformanceWidget.data).toHaveProperty('connectionCount');
    });

    test('generateAlertsWidgets should create alerts-specific widgets', async () => {
      const alerts = [
        {
          level: 'critical',
          timestamp: Date.now() - 300000,
          message: 'Critical CPU usage',
        },
        {
          level: 'warning',
          timestamp: Date.now() - 600000,
          message: 'High memory usage',
        },
      ];

      const widgets = await controller.generateAlertsWidgets(alerts, 'admin');

      expect(widgets).toHaveLength(2); // alert-summary, recent-alerts

      const alertSummaryWidget = widgets.find((w) => w.id === 'alert-summary');
      expect(alertSummaryWidget).toBeDefined();
      expect(alertSummaryWidget.type).toBe('metric');
      expect(alertSummaryWidget.data).toHaveProperty('total');
      expect(alertSummaryWidget.data).toHaveProperty('critical');
      expect(alertSummaryWidget.data).toHaveProperty('warning');
    });
  });

  describe('Helper Methods', () => {
    let controller;

    beforeEach(() => {
      controller = performanceDashboardController;
    });

    test('getWidgetPermissions should return correct permissions based on role', () => {
      const adminPermissions = controller.getWidgetPermissions(
        'test-widget',
        'admin'
      );
      expect(adminPermissions.view).toBe(true);
      expect(adminPermissions.export).toBe(true);
      expect(adminPermissions.configure).toBe(true);

      const managerPermissions = controller.getWidgetPermissions(
        'test-widget',
        'manager'
      );
      expect(managerPermissions.view).toBe(true);
      expect(managerPermissions.export).toBe(true);
      expect(managerPermissions.configure).toBe(false);

      const analystPermissions = controller.getWidgetPermissions(
        'test-widget',
        'analyst'
      );
      expect(analystPermissions.view).toBe(true);
      expect(analystPermissions.export).toBe(false);
      expect(analystPermissions.configure).toBe(false);

      // Special permissions for sensitive widgets
      const slowQueriesPermissions = controller.getWidgetPermissions(
        'slow-queries',
        'analyst'
      );
      expect(slowQueriesPermissions.view).toBe(false);
    });

    test('calculateDashboardSummary should return correct summary', () => {
      const summary = {
        system: { cpu: 75, memory: 60, eventLoopLag: 5 },
        api: { avgResponseTime: 250, requestCount: 100, errorCount: 5 },
      };

      const metrics = {
        alerts: [
          { level: 'critical', timestamp: Date.now() - 300000 },
          { level: 'warning', timestamp: Date.now() - 600000 },
        ],
      };

      const dashboardSummary = controller.calculateDashboardSummary(
        summary,
        metrics
      );

      expect(dashboardSummary.overallHealth).toBe('critical');
      expect(dashboardSummary.criticalAlerts).toBe(1);
      expect(dashboardSummary.warningAlerts).toBe(1);
      expect(dashboardSummary.systemLoad).toBe(75);
      expect(dashboardSummary.activeUsers).toBe(100);
      expect(dashboardSummary.responseTime).toBe(250);
    });

    test('getSystemHealthStatus should return correct status', () => {
      const mockPerformanceCollector = {
        getPerformanceSummary: jest.fn().mockReturnValue({
          system: { cpu: 95, memory: 60, eventLoopLag: 5 },
        }),
      };

      // Temporarily replace the imported module
      const originalModule = require('../../../src/monitoring/performance-collector.js');
      require('../../../src/monitoring/performance-collector.js').performanceCollector =
        mockPerformanceCollector;

      const status = controller.getSystemHealthStatus({});
      expect(status).toBe('critical');

      // Restore original module
      require('../../../src/monitoring/performance-collector.js').performanceCollector =
        originalModule.performanceCollector;
    });

    test('getMetricData should filter metrics by time range', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      const twoHoursAgo = now - 7200000;

      const metricArray = [
        { timestamp: twoHoursAgo, value: 50 },
        { timestamp: oneHourAgo, value: 75 },
        { timestamp: now, value: 80 },
      ];

      const filteredData = controller.getMetricData(metricArray, 3600000); // Last hour

      expect(filteredData).toHaveLength(2);
      expect(filteredData[0].value).toBe(75);
      expect(filteredData[1].value).toBe(80);
    });

    test('getLatestMetric should return latest value', () => {
      const metricArray = [
        { timestamp: Date.now() - 600000, value: 50 },
        { timestamp: Date.now() - 300000, value: 75 },
        { timestamp: Date.now(), value: 80 },
      ];

      const latestValue = controller.getLatestMetric(metricArray);
      expect(latestValue).toBe(80);
    });

    test('getAverageMetric should return average for time window', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      const twoHoursAgo = now - 7200000;

      const metricArray = [
        { timestamp: twoHoursAgo, value: 50 },
        { timestamp: oneHourAgo, value: 75 },
        { timestamp: now, value: 80 },
      ];

      const averageValue = controller.getAverageMetric(metricArray, 3600000); // Last hour
      expect(averageValue).toBe(77.5); // (75 + 80) / 2
    });

    test('getPercentile should return correct percentile', () => {
      const metricArray = [
        { value: 10 },
        { value: 20 },
        { value: 30 },
        { value: 40 },
        { value: 50 },
        { value: 60 },
        { value: 70 },
        { value: 80 },
        { value: 90 },
        { value: 100 },
      ];

      const percentile95 = controller.getPercentile(metricArray, 95);
      expect(percentile95).toBe(100);

      const percentile50 = controller.getPercentile(metricArray, 50);
      expect(percentile50).toBe(50);
    });

    test('calculateTrend should return correct trend', () => {
      // Increasing trend
      const increasingMetrics = [
        { value: 50 },
        { value: 60 },
        { value: 70 },
        { value: 80 },
        { value: 90 },
      ];

      const increasingTrend = controller.calculateTrend(increasingMetrics);
      expect(increasingTrend).toBe('increasing');

      // Decreasing trend
      const decreasingMetrics = [
        { value: 90 },
        { value: 80 },
        { value: 70 },
        { value: 60 },
        { value: 50 },
      ];

      const decreasingTrend = controller.calculateTrend(decreasingMetrics);
      expect(decreasingTrend).toBe('decreasing');

      // Stable trend
      const stableMetrics = [
        { value: 50 },
        { value: 52 },
        { value: 48 },
        { value: 51 },
        { value: 49 },
      ];

      const stableTrend = controller.calculateTrend(stableMetrics);
      expect(stableTrend).toBe('stable');
    });

    test('getTopEndpoints should return top endpoints by traffic', () => {
      const endpoints = {
        '/api/users': { count: 100, totalResponseTime: 25000, errors: 5 },
        '/api/investors': { count: 50, totalResponseTime: 15000, errors: 2 },
        '/api/transactions': {
          count: 200,
          totalResponseTime: 50000,
          errors: 10,
        },
      };

      const topEndpoints = controller.getTopEndpoints(endpoints, 2);

      expect(topEndpoints).toHaveLength(2);
      expect(topEndpoints[0].endpoint).toBe('/api/transactions');
      expect(topEndpoints[0].requests).toBe(200);
      expect(topEndpoints[0].avgResponseTime).toBe(250); // 50000 / 200
      expect(topEndpoints[0].errorRate).toBe(5); // (10 / 200) * 100

      expect(topEndpoints[1].endpoint).toBe('/api/users');
      expect(topEndpoints[1].requests).toBe(100);
    });

    test('calculateDataFreshness should return data age in seconds', () => {
      const now = Date.now();
      const fiveSecondsAgo = now - 5000;

      const metrics = {
        system: {
          cpu: [{ timestamp: fiveSecondsAgo, value: 75 }],
          memory: [{ timestamp: fiveSecondsAgo, value: 60 }],
        },
        api: {
          responseTimes: [{ timestamp: fiveSecondsAgo, value: 250 }],
        },
      };

      const freshness = controller.calculateDataFreshness(metrics);
      expect(freshness).toBeGreaterThanOrEqual(4);
      expect(freshness).toBeLessThanOrEqual(6);
    });
  });
});
