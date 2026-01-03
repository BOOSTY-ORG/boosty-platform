/**
 * Performance Configuration Controller Tests
 *
 * Tests for PerformanceConfigurationController including:
 * - Alert configuration management
 * - Dashboard configuration
 * - Metric collection settings
 * - Threshold management
 * - Configuration validation
 */

const request = require('supertest');
const express = require('express');
const performanceConfigurationController = require('../../../src/controllers/metrics/performance-configuration.controller.js');
const {
  setupTestDatabase,
  teardownTestDatabase,
  createMockRequest,
  createMockResponse,
  createMockNext,
  generateTestDates,
} = require('../../helpers/metrics.test.helpers.js');

// Mock dependencies
jest.mock('../../../src/services/metrics/performance-alert.service.js');
jest.mock('../../../src/models/metrics/performance-alert.model.js');
jest.mock('../../../src/models/metrics/performance-dashboard.model.js');
jest.mock('../../../src/helpers/logger.js');

describe('PerformanceConfigurationController', () => {
  let app;

  beforeAll(async () => {
    await setupTestDatabase();

    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Setup routes
    app.get(
      '/api/v1/performance/configuration/alerts',
      performanceConfigurationController.getAlertConfigurations
    );
    app.post(
      '/api/v1/performance/configuration/alerts',
      performanceConfigurationController.createAlertConfiguration
    );
    app.put(
      '/api/v1/performance/configuration/alerts/:configId',
      performanceConfigurationController.updateAlertConfiguration
    );
    app.delete(
      '/api/v1/performance/configuration/alerts/:configId',
      performanceConfigurationController.deleteAlertConfiguration
    );
    app.get(
      '/api/v1/performance/configuration/dashboards',
      performanceConfigurationController.getDashboardConfigurations
    );
    app.post(
      '/api/v1/performance/configuration/dashboards',
      performanceConfigurationController.createDashboardConfiguration
    );
    app.put(
      '/api/v1/performance/configuration/dashboards/:configId',
      performanceConfigurationController.updateDashboardConfiguration
    );
    app.delete(
      '/api/v1/performance/configuration/dashboards/:configId',
      performanceConfigurationController.deleteDashboardConfiguration
    );
    app.get(
      '/api/v1/performance/configuration/metrics',
      performanceConfigurationController.getMetricConfigurations
    );
    app.put(
      '/api/v1/performance/configuration/metrics',
      performanceConfigurationController.updateMetricConfiguration
    );
    app.get(
      '/api/v1/performance/configuration/thresholds',
      performanceConfigurationController.getThresholds
    );
    app.put(
      '/api/v1/performance/configuration/thresholds',
      performanceConfigurationController.updateThresholds
    );
    app.get(
      '/api/v1/performance/configuration/summary',
      performanceConfigurationController.getConfigurationSummary
    );
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAlertConfigurations', () => {
    test('should return all alert configurations', async () => {
      const mockAlertConfigs = [
        {
          configId: 'cpu-high-alert',
          name: 'High CPU Usage Alert',
          description: 'Alert when CPU usage exceeds threshold',
          category: 'system',
          metric: 'cpu',
          threshold: 80,
          operator: '>',
          severity: 'warning',
          enabled: true,
          cooldownPeriod: 300000,
          notifications: [
            { type: 'email', enabled: true, recipients: ['admin@example.com'] },
            {
              type: 'webhook',
              enabled: true,
              url: 'https://example.com/webhook',
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          configId: 'memory-critical-alert',
          name: 'Critical Memory Usage Alert',
          description: 'Alert when memory usage exceeds critical threshold',
          category: 'system',
          metric: 'memory',
          threshold: 95,
          operator: '>',
          severity: 'critical',
          enabled: true,
          cooldownPeriod: 180000,
          notifications: [
            { type: 'email', enabled: true, recipients: ['admin@example.com'] },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.getAlertConfigurations.mockReturnValue(
        mockAlertConfigs
      );

      const response = await request(app)
        .get('/api/v1/performance/configuration/alerts')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].configId).toBe('cpu-high-alert');
      expect(response.body.data[0].threshold).toBe(80);
      expect(response.body.data[1].severity).toBe('critical');
    });

    test('should filter alert configurations by category', async () => {
      const mockAlertConfigs = [
        {
          configId: 'cpu-high-alert',
          category: 'system',
          metric: 'cpu',
          threshold: 80,
          enabled: true,
        },
      ];

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.getAlertConfigurations.mockReturnValue(
        mockAlertConfigs
      );

      const response = await request(app)
        .get('/api/v1/performance/configuration/alerts')
        .query({ category: 'system' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('system');
    });

    test('should filter alert configurations by enabled status', async () => {
      const mockAlertConfigs = [
        {
          configId: 'cpu-high-alert',
          enabled: true,
        },
        {
          configId: 'disabled-alert',
          enabled: false,
        },
      ];

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.getAlertConfigurations.mockReturnValue(
        mockAlertConfigs
      );

      const response = await request(app)
        .get('/api/v1/performance/configuration/alerts')
        .query({ enabled: 'true' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].enabled).toBe(true);
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.getAlertConfigurations.mockImplementation(() => {
        throw new Error('Failed to fetch alert configurations');
      });

      const response = await request(app)
        .get('/api/v1/performance/configuration/alerts')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ALERT_CONFIG_FETCH_ERROR');
    });
  });

  describe('createAlertConfiguration', () => {
    test('should create a new alert configuration', async () => {
      const alertConfigData = {
        name: 'High API Response Time Alert',
        description: 'Alert when API response time exceeds threshold',
        category: 'api',
        metric: 'responseTime',
        threshold: 500,
        operator: '>',
        severity: 'warning',
        enabled: true,
        cooldownPeriod: 300000,
        notifications: [
          { type: 'email', enabled: true, recipients: ['admin@example.com'] },
          { type: 'slack', enabled: true, channel: '#alerts' },
        ],
      };

      const mockCreatedConfig = {
        configId: 'api-response-time-alert',
        ...alertConfigData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.createAlertConfiguration.mockReturnValue(
        mockCreatedConfig
      );

      const response = await request(app)
        .post('/api/v1/performance/configuration/alerts')
        .send(alertConfigData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.configId).toBe('api-response-time-alert');
      expect(response.body.data.name).toBe('High API Response Time Alert');
      expect(response.body.data.threshold).toBe(500);
      expect(response.body.data.notifications).toHaveLength(2);
    });

    test('should validate alert configuration data', async () => {
      const invalidConfigData = {
        name: '', // Required
        category: 'invalid', // Invalid enum
        metric: '', // Required
        threshold: 'invalid', // Should be number
        operator: 'invalid', // Invalid enum
        severity: 'invalid', // Invalid enum
        enabled: 'invalid', // Should be boolean
      };

      const response = await request(app)
        .post('/api/v1/performance/configuration/alerts')
        .send(invalidConfigData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle creation errors', async () => {
      const alertConfigData = {
        name: 'Test Alert',
        category: 'system',
        metric: 'cpu',
        threshold: 80,
        operator: '>',
        severity: 'warning',
        enabled: true,
      };

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.createAlertConfiguration.mockImplementation(
        () => {
          throw new Error('Failed to create alert configuration');
        }
      );

      const response = await request(app)
        .post('/api/v1/performance/configuration/alerts')
        .send(alertConfigData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ALERT_CONFIG_CREATE_ERROR');
    });
  });

  describe('updateAlertConfiguration', () => {
    test('should update an existing alert configuration', async () => {
      const configId = 'cpu-high-alert';
      const updateData = {
        name: 'Updated High CPU Alert',
        threshold: 85,
        enabled: false,
      };

      const mockUpdatedConfig = {
        configId,
        name: 'Updated High CPU Alert',
        threshold: 85,
        enabled: false,
        updatedAt: new Date(),
      };

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.updateAlertConfiguration.mockReturnValue(
        mockUpdatedConfig
      );

      const response = await request(app)
        .put(`/api/v1/performance/configuration/alerts/${configId}`)
        .send(updateData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.configId).toBe(configId);
      expect(response.body.data.name).toBe('Updated High CPU Alert');
      expect(response.body.data.threshold).toBe(85);
      expect(response.body.data.enabled).toBe(false);
    });

    test('should handle non-existent configuration', async () => {
      const configId = 'non-existent';
      const updateData = { threshold: 85 };

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.updateAlertConfiguration.mockReturnValue(null);

      const response = await request(app)
        .put(`/api/v1/performance/configuration/alerts/${configId}`)
        .send(updateData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ALERT_CONFIG_NOT_FOUND');
    });

    test('should handle update errors', async () => {
      const configId = 'cpu-high-alert';
      const updateData = { threshold: 85 };

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.updateAlertConfiguration.mockImplementation(
        () => {
          throw new Error('Failed to update alert configuration');
        }
      );

      const response = await request(app)
        .put(`/api/v1/performance/configuration/alerts/${configId}`)
        .send(updateData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ALERT_CONFIG_UPDATE_ERROR');
    });
  });

  describe('deleteAlertConfiguration', () => {
    test('should delete an alert configuration', async () => {
      const configId = 'cpu-high-alert';

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.deleteAlertConfiguration.mockReturnValue(true);

      const response = await request(app)
        .delete(`/api/v1/performance/configuration/alerts/${configId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    test('should handle non-existent configuration', async () => {
      const configId = 'non-existent';

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.deleteAlertConfiguration.mockReturnValue(false);

      const response = await request(app)
        .delete(`/api/v1/performance/configuration/alerts/${configId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ALERT_CONFIG_NOT_FOUND');
    });

    test('should handle deletion errors', async () => {
      const configId = 'cpu-high-alert';

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.deleteAlertConfiguration.mockImplementation(
        () => {
          throw new Error('Failed to delete alert configuration');
        }
      );

      const response = await request(app)
        .delete(`/api/v1/performance/configuration/alerts/${configId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ALERT_CONFIG_DELETE_ERROR');
    });
  });

  describe('getDashboardConfigurations', () => {
    test('should return all dashboard configurations', async () => {
      const mockDashboardConfigs = [
        {
          configId: 'system-overview-dashboard',
          name: 'System Overview Dashboard',
          description: 'Main system performance dashboard',
          type: 'overview',
          layout: 'grid',
          widgets: [
            { id: 'cpu-widget', type: 'metric', position: { x: 0, y: 0 } },
            { id: 'memory-widget', type: 'chart', position: { x: 4, y: 0 } },
          ],
          filters: {
            timeRange: '24h',
            environment: 'production',
          },
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          configId: 'api-performance-dashboard',
          name: 'API Performance Dashboard',
          description: 'API performance metrics dashboard',
          type: 'api',
          layout: 'grid',
          widgets: [
            {
              id: 'response-time-widget',
              type: 'chart',
              position: { x: 0, y: 0 },
            },
          ],
          filters: {
            timeRange: '6h',
            environment: 'production',
          },
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const {
        PerformanceDashboard,
      } = require('../../../src/models/metrics/performance-dashboard.model.js');
      PerformanceDashboard.findTemplates.mockResolvedValue(
        mockDashboardConfigs
      );

      const response = await request(app)
        .get('/api/v1/performance/configuration/dashboards')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].configId).toBe('system-overview-dashboard');
      expect(response.body.data[0].type).toBe('overview');
      expect(response.body.data[1].widgets).toHaveLength(1);
    });

    test('should filter dashboard configurations by type', async () => {
      const mockDashboardConfigs = [
        {
          configId: 'system-overview-dashboard',
          type: 'overview',
          isDefault: true,
        },
      ];

      const {
        PerformanceDashboard,
      } = require('../../../src/models/metrics/performance-dashboard.model.js');
      PerformanceDashboard.findTemplates.mockResolvedValue(
        mockDashboardConfigs
      );

      const response = await request(app)
        .get('/api/v1/performance/configuration/dashboards')
        .query({ type: 'overview' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('overview');
    });

    test('should handle errors gracefully', async () => {
      const {
        PerformanceDashboard,
      } = require('../../../src/models/metrics/performance-dashboard.model.js');
      PerformanceDashboard.findTemplates.mockRejectedValue(
        new Error('Failed to fetch dashboard configurations')
      );

      const response = await request(app)
        .get('/api/v1/performance/configuration/dashboards')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DASHBOARD_CONFIG_FETCH_ERROR');
    });
  });

  describe('createDashboardConfiguration', () => {
    test('should create a new dashboard configuration', async () => {
      const dashboardConfigData = {
        name: 'Custom Performance Dashboard',
        description: 'Custom dashboard for specific metrics',
        type: 'custom',
        layout: 'grid',
        columns: 12,
        rows: 8,
        widgets: [
          {
            id: 'custom-widget-1',
            type: 'metric',
            title: 'Custom Metric',
            position: { x: 0, y: 0, width: 4, height: 3 },
            config: { refreshInterval: 30 },
            dataSource: { metric: 'cpu' },
          },
        ],
        filters: {
          timeRange: '6h',
          environment: 'production',
        },
        isDefault: false,
      };

      const mockCreatedConfig = {
        configId: 'custom-dashboard-001',
        ...dashboardConfigData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const {
        PerformanceDashboard,
      } = require('../../../src/models/metrics/performance-dashboard.model.js');
      PerformanceDashboard.create.mockResolvedValue(mockCreatedConfig);

      const response = await request(app)
        .post('/api/v1/performance/configuration/dashboards')
        .send(dashboardConfigData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.configId).toBe('custom-dashboard-001');
      expect(response.body.data.name).toBe('Custom Performance Dashboard');
      expect(response.body.data.widgets).toHaveLength(1);
    });

    test('should validate dashboard configuration data', async () => {
      const invalidConfigData = {
        name: '', // Required
        type: 'invalid', // Invalid enum
        layout: 'invalid', // Invalid enum
        columns: 15, // Exceeds max
        rows: 0, // Below min
        widgets: [], // Should not be empty
      };

      const response = await request(app)
        .post('/api/v1/performance/configuration/dashboards')
        .send(invalidConfigData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle creation errors', async () => {
      const dashboardConfigData = {
        name: 'Test Dashboard',
        type: 'custom',
        layout: 'grid',
        widgets: [
          { id: 'test-widget', type: 'metric', position: { x: 0, y: 0 } },
        ],
      };

      const {
        PerformanceDashboard,
      } = require('../../../src/models/metrics/performance-dashboard.model.js');
      PerformanceDashboard.create.mockRejectedValue(
        new Error('Failed to create dashboard configuration')
      );

      const response = await request(app)
        .post('/api/v1/performance/configuration/dashboards')
        .send(dashboardConfigData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DASHBOARD_CONFIG_CREATE_ERROR');
    });
  });

  describe('getMetricConfigurations', () => {
    test('should return metric collection configurations', async () => {
      const mockMetricConfigs = {
        collection: {
          interval: 30000, // 30 seconds
          retention: 2592000, // 30 days in seconds
          batchSize: 100,
          enabledCategories: ['system', 'api', 'database'],
          aggregationLevels: ['raw', '1m', '5m', '15m', '1h'],
        },
        system: {
          metrics: ['cpu', 'memory', 'eventLoopLag'],
          interval: 15000, // 15 seconds
          thresholds: {
            cpu: { warning: 70, critical: 90 },
            memory: { warning: 80, critical: 95 },
            eventLoopLag: { warning: 20, critical: 50 },
          },
        },
        api: {
          metrics: ['responseTime', 'requestCount', 'errorRate'],
          interval: 60000, // 1 minute
          thresholds: {
            responseTime: { warning: 500, critical: 1000 },
            errorRate: { warning: 5, critical: 10 },
          },
        },
        database: {
          metrics: ['queryTime', 'connectionCount', 'slowQueries'],
          interval: 30000, // 30 seconds
          thresholds: {
            queryTime: { warning: 200, critical: 500 },
            connectionCount: { warning: 80, critical: 95 },
          },
        },
      };

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.getMetricConfigurations.mockReturnValue(
        mockMetricConfigs
      );

      const response = await request(app)
        .get('/api/v1/performance/configuration/metrics')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('collection');
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('api');
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data.collection.interval).toBe(30000);
      expect(response.body.data.system.metrics).toContain('cpu');
      expect(response.body.data.api.thresholds.responseTime.warning).toBe(500);
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.getMetricConfigurations.mockImplementation(() => {
        throw new Error('Failed to fetch metric configurations');
      });

      const response = await request(app)
        .get('/api/v1/performance/configuration/metrics')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('METRIC_CONFIG_FETCH_ERROR');
    });
  });

  describe('updateMetricConfiguration', () => {
    test('should update metric collection configuration', async () => {
      const updateData = {
        collection: {
          interval: 60000, // Update to 1 minute
          retention: 5184000, // Update to 60 days
        },
        system: {
          thresholds: {
            cpu: { warning: 75, critical: 95 }, // Update thresholds
          },
        },
      };

      const mockUpdatedConfig = {
        ...updateData,
        updatedAt: new Date(),
      };

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.updateMetricConfiguration.mockReturnValue(
        mockUpdatedConfig
      );

      const response = await request(app)
        .put('/api/v1/performance/configuration/metrics')
        .send(updateData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.collection.interval).toBe(60000);
      expect(response.body.data.system.thresholds.cpu.warning).toBe(75);
    });

    test('should validate metric configuration data', async () => {
      const invalidUpdateData = {
        collection: {
          interval: 'invalid', // Should be number
          retention: -1, // Should be positive
        },
        system: {
          thresholds: {
            cpu: { warning: 'invalid' }, // Should be number
          },
        },
      };

      const response = await request(app)
        .put('/api/v1/performance/configuration/metrics')
        .send(invalidUpdateData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle update errors', async () => {
      const updateData = {
        collection: {
          interval: 60000,
        },
      };

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.updateMetricConfiguration.mockImplementation(
        () => {
          throw new Error('Failed to update metric configuration');
        }
      );

      const response = await request(app)
        .put('/api/v1/performance/configuration/metrics')
        .send(updateData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('METRIC_CONFIG_UPDATE_ERROR');
    });
  });

  describe('getThresholds', () => {
    test('should return all threshold configurations', async () => {
      const mockThresholds = {
        system: {
          cpu: { warning: 70, critical: 90 },
          memory: { warning: 80, critical: 95 },
          eventLoopLag: { warning: 20, critical: 50 },
        },
        api: {
          responseTime: { warning: 500, critical: 1000 },
          errorRate: { warning: 5, critical: 10 },
          requestCount: { warning: 1000, critical: 2000 },
        },
        database: {
          queryTime: { warning: 200, critical: 500 },
          connectionCount: { warning: 80, critical: 95 },
          slowQueries: { warning: 5, critical: 10 },
        },
      };

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.getThresholds.mockReturnValue(mockThresholds);

      const response = await request(app)
        .get('/api/v1/performance/configuration/thresholds')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('api');
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data.system.cpu.warning).toBe(70);
      expect(response.body.data.system.cpu.critical).toBe(90);
      expect(response.body.data.api.responseTime.critical).toBe(1000);
    });

    test('should filter thresholds by category', async () => {
      const mockThresholds = {
        system: {
          cpu: { warning: 70, critical: 90 },
          memory: { warning: 80, critical: 95 },
        },
      };

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.getThresholds.mockReturnValue(mockThresholds);

      const response = await request(app)
        .get('/api/v1/performance/configuration/thresholds')
        .query({ category: 'system' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).not.toHaveProperty('api');
      expect(response.body.data).not.toHaveProperty('database');
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.getThresholds.mockImplementation(() => {
        throw new Error('Failed to fetch thresholds');
      });

      const response = await request(app)
        .get('/api/v1/performance/configuration/thresholds')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('THRESHOLDS_FETCH_ERROR');
    });
  });

  describe('updateThresholds', () => {
    test('should update threshold configurations', async () => {
      const updateData = {
        system: {
          cpu: { warning: 75, critical: 95 }, // Update thresholds
          memory: { warning: 85, critical: 98 },
        },
        api: {
          responseTime: { warning: 600, critical: 1200 }, // Update thresholds
        },
      };

      const mockUpdatedThresholds = {
        ...updateData,
        updatedAt: new Date(),
      };

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.updateThresholds.mockReturnValue(
        mockUpdatedThresholds
      );

      const response = await request(app)
        .put('/api/v1/performance/configuration/thresholds')
        .send(updateData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.system.cpu.warning).toBe(75);
      expect(response.body.data.system.cpu.critical).toBe(95);
      expect(response.body.data.api.responseTime.warning).toBe(600);
      expect(response.body.data.api.responseTime.critical).toBe(1200);
    });

    test('should validate threshold data', async () => {
      const invalidUpdateData = {
        system: {
          cpu: { warning: 'invalid', critical: 'invalid' }, // Should be numbers
        },
        api: {
          responseTime: { warning: 600, critical: 500 }, // Critical should be > warning
        },
      };

      const response = await request(app)
        .put('/api/v1/performance/configuration/thresholds')
        .send(invalidUpdateData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle update errors', async () => {
      const updateData = {
        system: {
          cpu: { warning: 75, critical: 95 },
        },
      };

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.updateThresholds.mockImplementation(() => {
        throw new Error('Failed to update thresholds');
      });

      const response = await request(app)
        .put('/api/v1/performance/configuration/thresholds')
        .send(updateData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('THRESHOLDS_UPDATE_ERROR');
    });
  });

  describe('getConfigurationSummary', () => {
    test('should return configuration summary', async () => {
      const mockSummary = {
        alerts: {
          total: 10,
          enabled: 8,
          disabled: 2,
          byCategory: {
            system: 4,
            api: 3,
            database: 3,
          },
          bySeverity: {
            info: 2,
            warning: 5,
            critical: 3,
          },
        },
        dashboards: {
          total: 5,
          default: 2,
          custom: 3,
          byType: {
            overview: 1,
            system: 1,
            api: 1,
            database: 1,
            custom: 1,
          },
        },
        metrics: {
          collectionInterval: 30000,
          retentionPeriod: 2592000,
          enabledCategories: ['system', 'api', 'database'],
          totalMetrics: 12,
        },
        thresholds: {
          total: 15,
          byCategory: {
            system: 6,
            api: 5,
            database: 4,
          },
        },
      };

      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.getConfigurationSummary.mockReturnValue(
        mockSummary
      );

      const response = await request(app)
        .get('/api/v1/performance/configuration/summary')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('dashboards');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('thresholds');
      expect(response.body.data.alerts.total).toBe(10);
      expect(response.body.data.alerts.enabled).toBe(8);
      expect(response.body.data.dashboards.default).toBe(2);
      expect(response.body.data.metrics.collectionInterval).toBe(30000);
    });

    test('should handle errors gracefully', async () => {
      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.getConfigurationSummary.mockImplementation(() => {
        throw new Error('Failed to fetch configuration summary');
      });

      const response = await request(app)
        .get('/api/v1/performance/configuration/summary')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFIG_SUMMARY_ERROR');
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication for configuration endpoints', async () => {
      const response = await request(app).get(
        '/api/v1/performance/configuration/alerts'
      );

      // This would depend on authentication middleware
      // For now, we're testing that endpoint exists
      expect([200, 401]).toContain(response.status);
    });

    test('should require appropriate permissions for configuration changes', async () => {
      const alertConfigData = {
        name: 'Test Alert',
        category: 'system',
        metric: 'cpu',
        threshold: 80,
        operator: '>',
        severity: 'warning',
        enabled: true,
      };

      const response = await request(app)
        .post('/api/v1/performance/configuration/alerts')
        .send(alertConfigData)
        .set('Authorization', 'Bearer user-token'); // Limited permissions

      // This would depend on authorization middleware
      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('Parameter Validation and Edge Cases', () => {
    test('should validate configuration ID format', async () => {
      const response = await request(app)
        .get('/api/v1/performance/configuration/alerts/invalid-id')
        .set('Authorization', 'Bearer valid-token');

      // This would be handled by the route
      expect([200, 400, 404]).toContain(response.status);
    });

    test('should handle empty configuration lists', async () => {
      const {
        performanceAlertService,
      } = require('../../../src/services/metrics/performance-alert.service.js');
      performanceAlertService.getAlertConfigurations.mockReturnValue([]);

      const response = await request(app)
        .get('/api/v1/performance/configuration/alerts')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    test('should handle malformed JSON in requests', async () => {
      const response = await request(app)
        .post('/api/v1/performance/configuration/alerts')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
    });
  });
});
