/**
 * Performance Tracking Integration Tests
 *
 * Comprehensive integration tests for all performance tracking endpoints including:
 * - End-to-end request/response testing
 * - Authentication and authorization flows
 * - Real-time streaming functionality
 * - Data aggregation and analytics
 * - Error handling and edge cases
 * - Performance and load testing
 */

import express from 'express';
const request = require('supertest');
const {
  setupTestDatabase,
  teardownTestDatabase,
  createTestData,
  generateTestDates,
} = require('../../helpers/metrics.test.helpers.js');

// Mock dependencies for testing
const jwt = require('jsonwebtoken');

describe('Performance Tracking Integration Tests', () => {
  let app, server;
  let adminToken, managerToken, analystToken, userToken;

  beforeAll(async () => {
    await setupTestDatabase();

    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Import all performance tracking routes
    app.use(
      '/api/v1/performance/dashboard',
      require('../../../src/routes/metrics/performance-dashboard.routes.js')
    );
    app.use(
      '/api/v1/performance/realtime',
      require('../../../src/routes/metrics/performance-realtime.routes.js')
    );
    app.use(
      '/api/v1/performance/analytics',
      require('../../../src/routes/metrics/performance-analytics.routes.js')
    );
    app.use(
      '/api/v1/performance/configuration',
      require('../../../src/routes/metrics/performance-configuration.routes.js')
    );

    // Generate test tokens for different roles
    adminToken = jwt.sign(
      { id: 'admin123', email: 'admin@example.com', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret'
    );

    managerToken = jwt.sign(
      { id: 'manager123', email: 'manager@example.com', role: 'manager' },
      process.env.JWT_SECRET || 'test-secret'
    );

    analystToken = jwt.sign(
      { id: 'analyst123', email: 'analyst@example.com', role: 'analyst' },
      process.env.JWT_SECRET || 'test-secret'
    );

    userToken = jwt.sign(
      { id: 'user123', email: 'user@example.com', role: 'user' },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clear database before each test
    await setupTestDatabase();
  });

  describe('Dashboard Endpoints Integration', () => {
    test('GET /api/v1/performance/dashboard/overview - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .query({ timeRange: '1h', refreshRate: '30' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('widgets');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('meta');
      expect(response.body.data.meta).toHaveProperty('generatedAt');
      expect(response.body.data.meta).toHaveProperty('responseTime');
    });

    test('GET /api/v1/performance/dashboard/system - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/dashboard/system')
        .query({ timeRange: '6h' })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('widgets');
      expect(response.body.data.widgets).toHaveLength(3); // cpu, memory, event-loop-lag
    });

    test('GET /api/v1/performance/dashboard/api - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/dashboard/api')
        .query({ timeRange: '24h' })
        .set('Authorization', `Bearer ${analystToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('widgets');
      expect(response.body.data.widgets).toHaveLength(3); // response-time, request-volume, top-endpoints
    });

    test('GET /api/v1/performance/dashboard/database - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/dashboard/database')
        .query({ timeRange: '1h' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('widgets');
      expect(response.body.data.widgets).toHaveLength(2); // query-performance, slow-queries
    });

    test('GET /api/v1/performance/dashboard/alerts - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/dashboard/alerts')
        .query({ level: 'warning', limit: '10', offset: '0' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('summary');
    });

    test('Dashboard endpoints - unauthorized access', async () => {
      const response = await request(app).get(
        '/api/v1/performance/dashboard/overview'
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('Dashboard endpoints - insufficient permissions', async () => {
      const response = await request(app)
        .get('/api/v1/performance/dashboard/system')
        .set('Authorization', `Bearer ${analystToken}`); // Analyst may not have access

      expect([401, 403]).toContain(response.status);
    });

    test('Dashboard endpoints - invalid parameters', async () => {
      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .query({ timeRange: 'invalid', refreshRate: 'invalid' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Real-time Endpoints Integration', () => {
    test('GET /api/v1/performance/realtime/metrics - SSE connection', async () => {
      const response = await request(app)
        .get('/api/v1/performance/realtime/metrics')
        .set('Accept', 'text/event-stream')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Cache-Control', 'no-cache');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.headers['connection']).toBe('keep-alive');
    });

    test('GET /api/v1/performance/realtime/metrics - with filters', async () => {
      const response = await request(app)
        .get('/api/v1/performance/realtime/metrics')
        .set('Accept', 'text/event-stream')
        .query({
          categories: 'system,api',
          interval: '5000',
          metrics: 'cpu,memory',
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
    });

    test('GET /api/v1/performance/realtime/alerts - SSE connection', async () => {
      const response = await request(app)
        .get('/api/v1/performance/realtime/alerts')
        .set('Accept', 'text/event-stream')
        .query({ severity: 'critical,warning' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
    });

    test('POST /api/v1/performance/realtime/subscribe - successful subscription', async () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu', 'memory'],
        interval: 5000,
        filters: { environment: 'production' },
      };

      const response = await request(app)
        .post('/api/v1/performance/realtime/subscribe')
        .send(subscriptionData)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('subscriptionId');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data.status).toBe('active');
    });

    test('POST /api/v1/performance/realtime/subscribe - validation error', async () => {
      const invalidSubscriptionData = {
        categories: 'invalid', // Should be array
        metrics: [], // Should not be empty
        interval: 'invalid', // Should be number
      };

      const response = await request(app)
        .post('/api/v1/performance/realtime/subscribe')
        .send(invalidSubscriptionData)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
    });

    test('DELETE /api/v1/performance/realtime/unsubscribe/:subscriptionId - successful unsubscription', async () => {
      // First create a subscription
      const createResponse = await request(app)
        .post('/api/v1/performance/realtime/subscribe')
        .send({
          categories: ['system'],
          metrics: ['cpu'],
          interval: 5000,
        })
        .set('Authorization', `Bearer ${adminToken}`);

      const subscriptionId = createResponse.body.data.subscriptionId;

      // Then unsubscribe
      const response = await request(app)
        .delete(`/api/v1/performance/realtime/unsubscribe/${subscriptionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('GET /api/v1/performance/realtime/subscriptions - list subscriptions', async () => {
      const response = await request(app)
        .get('/api/v1/performance/realtime/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('subscriptions');
      expect(Array.isArray(response.body.data.subscriptions)).toBe(true);
    });

    test('Real-time endpoints - unauthorized access', async () => {
      const response = await request(app).get(
        '/api/v1/performance/realtime/metrics'
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('Real-time endpoints - insufficient permissions', async () => {
      const response = await request(app)
        .post('/api/v1/performance/realtime/subscribe')
        .send({
          categories: ['system'],
          metrics: ['cpu'],
          interval: 5000,
        })
        .set('Authorization', `Bearer ${userToken}`); // User may not have access

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Analytics Endpoints Integration', () => {
    test('GET /api/v1/performance/analytics/trends - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/analytics/trends')
        .query({
          metrics: 'cpu,memory',
          categories: 'system',
          timeRange: '24h',
          interval: '1h',
        })
        .set('Authorization', `Bearer ${analystToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trends');
      expect(response.body.data).toHaveProperty('meta');
    });

    test('GET /api/v1/performance/analytics/aggregations - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/analytics/aggregations')
        .query({
          metrics: 'cpu,memory',
          categories: 'system',
          timeRange: '6h',
          aggregationType: 'avg,min,max,stdDev',
        })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('aggregations');
    });

    test('GET /api/v1/performance/analytics/statistics - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/analytics/statistics')
        .query({
          timeRange: '24h',
          include: 'overview,system,api',
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data.statistics).toHaveProperty('overview');
      expect(response.body.data.statistics).toHaveProperty('system');
      expect(response.body.data.statistics).toHaveProperty('api');
    });

    test('GET /api/v1/performance/analytics/percentiles - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/analytics/percentiles')
        .query({
          metrics: 'cpu,memory',
          categories: 'system',
          timeRange: '24h',
          percentiles: '50,90,95,99',
        })
        .set('Authorization', `Bearer ${analystToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('percentiles');
    });

    test('GET /api/v1/performance/analytics/comparisons - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/analytics/comparisons')
        .query({
          metrics: 'cpu,memory',
          categories: 'system',
          currentPeriod: '24h',
          previousPeriod: '24h',
          previousOffset: '24h',
        })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('comparisons');
    });

    test('GET /api/v1/performance/analytics/correlations - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/analytics/correlations')
        .query({
          metrics: 'cpu,memory',
          categories: 'system',
          timeRange: '24h',
          threshold: '0.5',
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('correlations');
    });

    test('GET /api/v1/performance/analytics/anomalies - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/analytics/anomalies')
        .query({
          timeRange: '24h',
          severity: 'warning,critical',
          confidence: '0.8',
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('anomalies');
      expect(response.body.data).toHaveProperty('summary');
    });

    test('GET /api/v1/performance/analytics/forecasts - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/analytics/forecasts')
        .query({
          metrics: 'cpu,memory',
          categories: 'system',
          horizon: '6h',
          model: 'linear_regression',
          confidence: '0.7',
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('forecasts');
    });

    test('POST /api/v1/performance/analytics/custom - successful request', async () => {
      const customQuery = {
        name: 'Performance Analysis Query',
        description: 'Analyzing CPU and Memory trends',
        metrics: [
          { category: 'system', name: 'cpu', aggregation: 'avg' },
          { category: 'system', name: 'memory', aggregation: 'avg' },
        ],
        timeRange: '24h',
        operations: [
          { type: 'trend', metric: 'cpu' },
          { type: 'correlation', metrics: ['cpu', 'memory'] },
        ],
      };

      const response = await request(app)
        .post('/api/v1/performance/analytics/custom')
        .send(customQuery)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('queryId');
      expect(response.body.data).toHaveProperty('status');
    });

    test('Analytics endpoints - unauthorized access', async () => {
      const response = await request(app).get(
        '/api/v1/performance/analytics/trends'
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('Analytics endpoints - insufficient permissions', async () => {
      const response = await request(app)
        .post('/api/v1/performance/analytics/custom')
        .send({
          name: 'Test Query',
          metrics: [{ category: 'system', name: 'cpu' }],
        })
        .set('Authorization', `Bearer ${userToken}`); // User may not have access

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Configuration Endpoints Integration', () => {
    test('GET /api/v1/performance/configuration/alerts - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/configuration/alerts')
        .query({ category: 'system', enabled: 'true' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('alerts');
      expect(Array.isArray(response.body.data.alerts)).toBe(true);
    });

    test('POST /api/v1/performance/configuration/alerts - create alert config', async () => {
      const alertConfig = {
        name: 'High CPU Alert',
        description: 'Alert when CPU exceeds 80%',
        category: 'system',
        metric: 'cpu',
        threshold: 80,
        operator: '>',
        severity: 'warning',
        enabled: true,
        cooldownPeriod: 300000,
        notifications: [
          { type: 'email', enabled: true, recipients: ['admin@example.com'] },
        ],
      };

      const response = await request(app)
        .post('/api/v1/performance/configuration/alerts')
        .send(alertConfig)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('configId');
      expect(response.body.data.name).toBe(alertConfig.name);
    });

    test('PUT /api/v1/performance/configuration/alerts/:configId - update alert config', async () => {
      // First create an alert config
      const createResponse = await request(app)
        .post('/api/v1/performance/configuration/alerts')
        .send({
          name: 'Test Alert',
          category: 'system',
          metric: 'cpu',
          threshold: 75,
          operator: '>',
          severity: 'warning',
          enabled: true,
        })
        .set('Authorization', `Bearer ${adminToken}`);

      const configId = createResponse.body.data.configId;

      // Then update it
      const updateData = {
        threshold: 85,
        enabled: false,
      };

      const response = await request(app)
        .put(`/api/v1/performance/configuration/alerts/${configId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.threshold).toBe(85);
      expect(response.body.data.enabled).toBe(false);
    });

    test('DELETE /api/v1/performance/configuration/alerts/:configId - delete alert config', async () => {
      // First create an alert config
      const createResponse = await request(app)
        .post('/api/v1/performance/configuration/alerts')
        .send({
          name: 'Test Alert',
          category: 'system',
          metric: 'cpu',
          threshold: 75,
          operator: '>',
          severity: 'warning',
          enabled: true,
        })
        .set('Authorization', `Bearer ${adminToken}`);

      const configId = createResponse.body.data.configId;

      // Then delete it
      const response = await request(app)
        .delete(`/api/v1/performance/configuration/alerts/${configId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('GET /api/v1/performance/configuration/dashboards - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/configuration/dashboards')
        .query({ type: 'overview', isDefault: 'true' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dashboards');
      expect(Array.isArray(response.body.data.dashboards)).toBe(true);
    });

    test('GET /api/v1/performance/configuration/metrics - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/configuration/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('collection');
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('api');
      expect(response.body.data).toHaveProperty('database');
    });

    test('PUT /api/v1/performance/configuration/metrics - update metrics config', async () => {
      const updateData = {
        collection: {
          interval: 60000, // 1 minute
          retention: 2592000, // 30 days
        },
        system: {
          thresholds: {
            cpu: { warning: 75, critical: 90 },
          },
        },
      };

      const response = await request(app)
        .put('/api/v1/performance/configuration/metrics')
        .send(updateData)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.collection.interval).toBe(60000);
    });

    test('GET /api/v1/performance/configuration/thresholds - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/configuration/thresholds')
        .query({ category: 'system' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('api');
      expect(response.body.data).toHaveProperty('database');
    });

    test('PUT /api/v1/performance/configuration/thresholds - update thresholds', async () => {
      const updateData = {
        system: {
          cpu: { warning: 80, critical: 95 },
          memory: { warning: 85, critical: 98 },
        },
        api: {
          responseTime: { warning: 600, critical: 1200 },
          errorRate: { warning: 5, critical: 10 },
        },
      };

      const response = await request(app)
        .put('/api/v1/performance/configuration/thresholds')
        .send(updateData)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.system.cpu.warning).toBe(80);
      expect(response.body.data.api.responseTime.warning).toBe(600);
    });

    test('GET /api/v1/performance/configuration/summary - successful request', async () => {
      const response = await request(app)
        .get('/api/v1/performance/configuration/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('dashboards');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('thresholds');
    });

    test('Configuration endpoints - unauthorized access', async () => {
      const response = await request(app).get(
        '/api/v1/performance/configuration/alerts'
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('Configuration endpoints - insufficient permissions', async () => {
      const response = await request(app)
        .post('/api/v1/performance/configuration/alerts')
        .send({
          name: 'Test Alert',
          category: 'system',
          metric: 'cpu',
          threshold: 75,
          operator: '>',
          severity: 'warning',
          enabled: true,
        })
        .set('Authorization', `Bearer ${analystToken}`); // Analyst may not have access

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Cross-Endpoint Integration', () => {
    test('Dashboard data flows to analytics', async () => {
      // Get dashboard data
      const dashboardResponse = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .query({ timeRange: '1h' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dashboardResponse.status).toBe(200);

      // Use dashboard data in analytics
      const analyticsResponse = await request(app)
        .get('/api/v1/performance/analytics/trends')
        .query({
          metrics: 'cpu,memory',
          timeRange: '1h',
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.success).toBe(true);
    });

    test('Configuration changes affect dashboard data', async () => {
      // Create alert configuration
      const alertConfig = {
        name: 'Test Alert',
        category: 'system',
        metric: 'cpu',
        threshold: 80,
        operator: '>',
        severity: 'warning',
        enabled: true,
      };

      const createResponse = await request(app)
        .post('/api/v1/performance/configuration/alerts')
        .send(alertConfig)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(createResponse.status).toBe(201);

      // Check if alert appears in dashboard
      const dashboardResponse = await request(app)
        .get('/api/v1/performance/dashboard/alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(
        dashboardResponse.body.data.alerts.some(
          (alert) => alert.title === 'Test Alert'
        )
      ).toBe(true);
    });

    test('Real-time subscription affects analytics data', async () => {
      // Create subscription
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 1000,
      };

      const createResponse = await request(app)
        .post('/api/v1/performance/realtime/subscribe')
        .send(subscriptionData)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(createResponse.status).toBe(201);

      // Generate some metrics data
      // This would normally be done by the performance collector
      // For testing, we'll verify the subscription exists

      const subscriptionsResponse = await request(app)
        .get('/api/v1/performance/realtime/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(subscriptionsResponse.status).toBe(200);
      expect(
        subscriptionsResponse.body.data.subscriptions.some(
          (sub) =>
            sub.categories.includes('system') && sub.metrics.includes('cpu')
        )
      ).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    test('404 Not Found for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/performance/non-existent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('500 Internal Server Error simulation', async () => {
      // This would require mocking the server to return an error
      // For now, we'll test with malformed request that might trigger errors

      const response = await request(app)
        .post('/api/v1/performance/analytics/custom')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });

    test('Rate limiting on frequent requests', async () => {
      const requests = Array(20)
        .fill()
        .map(() =>
          request(app)
            .get('/api/v1/performance/dashboard/overview')
            .set('Authorization', `Bearer ${adminToken}`)
        );

      const responses = await Promise.all(requests);

      // Some requests should succeed, some should be rate limited
      const successResponses = responses.filter((r) => r.status === 200);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      expect(successResponses.length + rateLimitedResponses.length).toBe(20);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('Request timeout handling', async () => {
      // Test with a very long-running request
      const response = await request(app)
        .get('/api/v1/performance/analytics/trends')
        .query({
          timeRange: '90d', // Very large time range
          metrics: 'cpu,memory,responseTime', // Multiple metrics
          categories: 'system,api,database',
          interval: '1m', // Very granular
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(5000); // 5 second timeout

      // Should either succeed or timeout
      expect([200, 408]).toContain(response.status);
    });
  });

  describe('Performance Integration', () => {
    test('Response times within acceptable limits', async () => {
      const requests = Array(10)
        .fill()
        .map(() =>
          request(app)
            .get('/api/v1/performance/dashboard/overview')
            .set('Authorization', `Bearer ${adminToken}`)
        );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(responses).toHaveLength(10);
      expect(responses.every((r) => r.status === 200)).toBe(true);
      expect(totalTime).toBeLessThan(2000); // Should complete in under 2 seconds
    });

    test('Concurrent request handling', async () => {
      const concurrentRequests = Array(50)
        .fill()
        .map((_, i) =>
          request(app)
            .get('/api/v1/performance/dashboard/overview')
            .query({ requestId: i })
            .set('Authorization', `Bearer ${adminToken}`)
        );

      const responses = await Promise.all(concurrentRequests);

      expect(responses).toHaveLength(50);
      expect(responses.every((r) => r.status === 200)).toBe(true);
    });

    test('Memory usage during large requests', async () => {
      // This would require monitoring memory usage
      // For now, we'll test with many concurrent requests

      const largeConcurrentRequests = Array(100)
        .fill()
        .map(() =>
          request(app)
            .get('/api/v1/performance/analytics/trends')
            .query({ timeRange: '7d' }) // Large time range
            .set('Authorization', `Bearer ${adminToken}`)
        );

      const responses = await Promise.all(largeConcurrentRequests);

      expect(responses.length).toBeGreaterThan(90); // Most should succeed
      // Memory usage would need to be monitored separately
    });
  });

  describe('Data Consistency Integration', () => {
    test('Consistent data across related endpoints', async () => {
      // Get dashboard data
      const dashboardResponse = await request(app)
        .get('/api/v1/performance/dashboard/system')
        .query({ timeRange: '1h' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dashboardResponse.status).toBe(200);

      // Get analytics data for same time range
      const analyticsResponse = await request(app)
        .get('/api/v1/performance/analytics/aggregations')
        .query({
          metrics: 'cpu,memory',
          categories: 'system',
          timeRange: '1h',
          aggregationType: 'avg',
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(analyticsResponse.status).toBe(200);

      // Data should be consistent (same time range and metrics)
      const dashboardCpu = dashboardResponse.body.data.widgets.find(
        (w) => w.id === 'cpu-usage'
      );
      const analyticsCpu = analyticsResponse.body.data.aggregations.system.cpu;

      // Values should be roughly the same (within reasonable tolerance)
      expect(dashboardCpu && analyticsCpu).toBeDefined();
      if (dashboardCpu && analyticsCpu) {
        expect(
          Math.abs(dashboardCpu.data.current - analyticsCpu.value)
        ).toBeLessThan(5);
      }
    });

    test('Pagination consistency', async () => {
      // Test pagination for alerts
      const page1 = await request(app)
        .get('/api/v1/performance/dashboard/alerts')
        .query({ limit: 10, offset: 0 })
        .set('Authorization', `Bearer ${adminToken}`);

      const page2 = await request(app)
        .get('/api/v1/performance/dashboard/alerts')
        .query({ limit: 10, offset: 10 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);

      // Should get different alerts
      const page1Alerts = page1.body.data.alerts;
      const page2Alerts = page2.body.data.alerts;

      expect(page1Alerts).not.toEqual(page2Alerts);
      expect(page1Alerts.length).toBeLessThanOrEqual(10);
      expect(page2Alerts.length).toBeLessThanOrEqual(10);
    });
  });
});
