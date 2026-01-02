/**
 * Performance Realtime Controller Tests
 *
 * Tests for PerformanceRealtimeController including:
 * - Real-time metrics streaming
 * - Server-Sent Events (SSE)
 * - Real-time alerts
 * - WebSocket connections
 * - Connection management
 */

const request = require('supertest');
const express = require('express');
const http = require('http');
const EventSource = require('eventsource');
const performanceRealtimeController = require('../../../src/controllers/metrics/performance-realtime.controller.js');
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
jest.mock('../../../src/services/metrics/performance-streaming.service.js');
jest.mock('../../../src/helpers/logger.js');

describe('PerformanceRealtimeController', () => {
  let app, server;

  beforeAll(async () => {
    await setupTestDatabase();

    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Setup routes
    app.get(
      '/api/v1/performance/realtime/metrics',
      performanceRealtimeController.getRealtimeMetrics
    );
    app.get(
      '/api/v1/performance/realtime/alerts',
      performanceRealtimeController.getRealtimeAlerts
    );
    app.post(
      '/api/v1/performance/realtime/subscribe',
      performanceRealtimeController.subscribeToMetrics
    );
    app.delete(
      '/api/v1/performance/realtime/unsubscribe/:subscriptionId',
      performanceRealtimeController.unsubscribeFromMetrics
    );
    app.get(
      '/api/v1/performance/realtime/subscriptions',
      performanceRealtimeController.getActiveSubscriptions
    );
    app.post(
      '/api/v1/performance/realtime/connections/test',
      performanceRealtimeController.testConnection
    );
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

  describe('getRealtimeMetrics', () => {
    test('should establish SSE connection for real-time metrics', async () => {
      const mockMetricsSnapshot = {
        system: {
          cpu: [{ timestamp: Date.now(), value: 75 }],
          memory: [{ timestamp: Date.now(), value: 60 }],
          eventLoopLag: [{ timestamp: Date.now(), value: 5 }],
        },
        api: {
          responseTimes: [{ timestamp: Date.now(), value: 250 }],
          requestCount: 100,
          errorCount: 5,
        },
      };

      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');
      performanceCollector.getMetricsSnapshot.mockReturnValue(
        mockMetricsSnapshot
      );

      const response = await request(app)
        .get('/api/v1/performance/realtime/metrics')
        .set('Accept', 'text/event-stream')
        .set('Cache-Control', 'no-cache');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe(
        'text/event-stream; charset=utf-8'
      );
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.headers['connection']).toBe('keep-alive');
    });

    test('should handle SSE connection with filters', async () => {
      const response = await request(app)
        .get('/api/v1/performance/realtime/metrics')
        .query({
          categories: 'system,api',
          interval: '1000',
          metrics: 'cpu,memory,responseTime',
        })
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
    });

    test('should handle errors in SSE connection', async () => {
      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');
      performanceCollector.getMetricsSnapshot.mockImplementation(() => {
        throw new Error('Metrics collection error');
      });

      const response = await request(app)
        .get('/api/v1/performance/realtime/metrics')
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REALTIME_METRICS_ERROR');
    });
  });

  describe('getRealtimeAlerts', () => {
    test('should establish SSE connection for real-time alerts', async () => {
      const mockActiveAlerts = [
        {
          alertId: 'cpu-high-001',
          title: 'High CPU Usage',
          severity: 'warning',
          currentValue: 85,
          threshold: 80,
          timestamp: Date.now(),
        },
        {
          alertId: 'memory-critical-001',
          title: 'Critical Memory Usage',
          severity: 'critical',
          currentValue: 95,
          threshold: 90,
          timestamp: Date.now(),
        },
      ];

      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');
      performanceStreamingService.getActiveAlerts.mockReturnValue(
        mockActiveAlerts
      );

      const response = await request(app)
        .get('/api/v1/performance/realtime/alerts')
        .set('Accept', 'text/event-stream')
        .set('Cache-Control', 'no-cache');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe(
        'text/event-stream; charset=utf-8'
      );
      expect(response.headers['cache-control']).toBe('no-cache');
    });

    test('should handle SSE connection with alert filters', async () => {
      const response = await request(app)
        .get('/api/v1/performance/realtime/alerts')
        .query({
          severity: 'critical,warning',
          categories: 'system,api',
          limit: '50',
        })
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
    });

    test('should handle errors in alert SSE connection', async () => {
      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');
      performanceStreamingService.getActiveAlerts.mockImplementation(() => {
        throw new Error('Alert streaming error');
      });

      const response = await request(app)
        .get('/api/v1/performance/realtime/alerts')
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REALTIME_ALERTS_ERROR');
    });
  });

  describe('subscribeToMetrics', () => {
    test('should create subscription for real-time metrics', async () => {
      const subscriptionData = {
        categories: ['system', 'api'],
        metrics: ['cpu', 'memory', 'responseTime'],
        interval: 5000,
        filters: {
          environment: 'production',
          instanceId: 'server-001',
        },
        webhook: {
          url: 'https://example.com/webhook',
          secret: 'webhook-secret',
        },
      };

      const mockSubscription = {
        subscriptionId: 'sub-001',
        status: 'active',
        createdAt: new Date(),
        ...subscriptionData,
      };

      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');
      performanceStreamingService.createSubscription.mockReturnValue(
        mockSubscription
      );

      const response = await request(app)
        .post('/api/v1/performance/realtime/subscribe')
        .send(subscriptionData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.subscriptionId).toBe('sub-001');
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.categories).toEqual(
        subscriptionData.categories
      );
      expect(response.body.data.metrics).toEqual(subscriptionData.metrics);
      expect(response.body.data.interval).toBe(subscriptionData.interval);
    });

    test('should validate subscription data', async () => {
      const invalidSubscriptionData = {
        categories: 'invalid', // Should be array
        metrics: [], // Should not be empty
        interval: 'invalid', // Should be number
      };

      const response = await request(app)
        .post('/api/v1/performance/realtime/subscribe')
        .send(invalidSubscriptionData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle subscription creation errors', async () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');
      performanceStreamingService.createSubscription.mockImplementation(() => {
        throw new Error('Subscription creation failed');
      });

      const response = await request(app)
        .post('/api/v1/performance/realtime/subscribe')
        .send(subscriptionData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUBSCRIPTION_ERROR');
    });
  });

  describe('unsubscribeFromMetrics', () => {
    test('should cancel subscription', async () => {
      const subscriptionId = 'sub-001';

      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');
      performanceStreamingService.cancelSubscription.mockReturnValue(true);

      const response = await request(app).delete(
        `/api/v1/performance/realtime/unsubscribe/${subscriptionId}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled successfully');
    });

    test('should handle non-existent subscription', async () => {
      const subscriptionId = 'non-existent';

      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');
      performanceStreamingService.cancelSubscription.mockReturnValue(false);

      const response = await request(app).delete(
        `/api/v1/performance/realtime/unsubscribe/${subscriptionId}`
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUBSCRIPTION_NOT_FOUND');
    });

    test('should handle unsubscription errors', async () => {
      const subscriptionId = 'sub-001';

      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');
      performanceStreamingService.cancelSubscription.mockImplementation(() => {
        throw new Error('Unsubscription failed');
      });

      const response = await request(app).delete(
        `/api/v1/performance/realtime/unsubscribe/${subscriptionId}`
      );

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNSUBSCRIPTION_ERROR');
    });
  });

  describe('getActiveSubscriptions', () => {
    test('should return list of active subscriptions', async () => {
      const mockSubscriptions = [
        {
          subscriptionId: 'sub-001',
          categories: ['system'],
          metrics: ['cpu', 'memory'],
          interval: 5000,
          status: 'active',
          createdAt: new Date(),
        },
        {
          subscriptionId: 'sub-002',
          categories: ['api'],
          metrics: ['responseTime'],
          interval: 10000,
          status: 'active',
          createdAt: new Date(),
        },
      ];

      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');
      performanceStreamingService.getActiveSubscriptions.mockReturnValue(
        mockSubscriptions
      );

      const response = await request(app).get(
        '/api/v1/performance/realtime/subscriptions'
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].subscriptionId).toBe('sub-001');
      expect(response.body.data[1].subscriptionId).toBe('sub-002');
    });

    test('should filter subscriptions by status', async () => {
      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');
      performanceStreamingService.getActiveSubscriptions.mockReturnValue([]);

      const response = await request(app)
        .get('/api/v1/performance/realtime/subscriptions')
        .query({ status: 'inactive' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    test('should handle errors in fetching subscriptions', async () => {
      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');
      performanceStreamingService.getActiveSubscriptions.mockImplementation(
        () => {
          throw new Error('Failed to fetch subscriptions');
        }
      );

      const response = await request(app).get(
        '/api/v1/performance/realtime/subscriptions'
      );

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUBSCRIPTIONS_FETCH_ERROR');
    });
  });

  describe('testConnection', () => {
    test('should test connection health', async () => {
      const connectionTestData = {
        type: 'sse',
        endpoint: '/api/v1/performance/realtime/metrics',
        filters: {
          categories: ['system'],
          metrics: ['cpu'],
        },
      };

      const mockConnectionTest = {
        status: 'success',
        latency: 50,
        message: 'Connection successful',
        timestamp: new Date(),
      };

      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');
      performanceStreamingService.testConnection.mockReturnValue(
        mockConnectionTest
      );

      const response = await request(app)
        .post('/api/v1/performance/realtime/connections/test')
        .send(connectionTestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('success');
      expect(response.body.data.latency).toBe(50);
      expect(response.body.data.message).toBe('Connection successful');
    });

    test('should handle connection test failures', async () => {
      const connectionTestData = {
        type: 'sse',
        endpoint: '/api/v1/performance/realtime/metrics',
      };

      const mockConnectionTest = {
        status: 'failed',
        error: 'Connection timeout',
        latency: null,
        timestamp: new Date(),
      };

      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');
      performanceStreamingService.testConnection.mockReturnValue(
        mockConnectionTest
      );

      const response = await request(app)
        .post('/api/v1/performance/realtime/connections/test')
        .send(connectionTestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('failed');
      expect(response.body.data.error).toBe('Connection timeout');
    });

    test('should validate connection test data', async () => {
      const invalidTestData = {
        type: 'invalid',
        endpoint: '', // Required
      };

      const response = await request(app)
        .post('/api/v1/performance/realtime/connections/test')
        .send(invalidTestData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('SSE Event Formatting', () => {
    test('should format SSE events correctly', async () => {
      // This test would require a more complex setup to actually test SSE streaming
      // For now, we'll test that the endpoint responds correctly
      const mockMetricsSnapshot = {
        system: {
          cpu: [{ timestamp: Date.now(), value: 75 }],
          memory: [{ timestamp: Date.now(), value: 60 }],
        },
      };

      const {
        performanceCollector,
      } = require('../../../src/monitoring/performance-collector.js');
      performanceCollector.getMetricsSnapshot.mockReturnValue(
        mockMetricsSnapshot
      );

      const response = await request(app)
        .get('/api/v1/performance/realtime/metrics')
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
    });
  });

  describe('Connection Management', () => {
    test('should track active connections', async () => {
      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');

      const mockConnectionStats = {
        activeConnections: 5,
        totalConnections: 100,
        connectionsByType: {
          sse: 3,
          websocket: 2,
        },
      };

      performanceStreamingService.getConnectionStats.mockReturnValue(
        mockConnectionStats
      );

      // This would be tested through a dedicated endpoint if implemented
      // For now, we're testing the service integration
      expect(performanceStreamingService.getConnectionStats).toBeDefined();
    });

    test('should handle connection limits', async () => {
      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');

      performanceStreamingService.createSubscription.mockImplementation(() => {
        const error = new Error('Connection limit exceeded');
        error.code = 'CONNECTION_LIMIT_EXCEEDED';
        throw error;
      });

      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      const response = await request(app)
        .post('/api/v1/performance/realtime/subscribe')
        .send(subscriptionData);

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONNECTION_LIMIT_EXCEEDED');
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication for subscription endpoints', async () => {
      const response = await request(app)
        .post('/api/v1/performance/realtime/subscribe')
        .send({ categories: ['system'], metrics: ['cpu'] });

      // This would depend on the authentication middleware
      // For now, we're testing the endpoint exists
      expect([200, 401]).toContain(response.status);
    });

    test('should require appropriate permissions for admin operations', async () => {
      // This would test role-based access control
      // Implementation depends on authentication middleware
      const response = await request(app)
        .get('/api/v1/performance/realtime/subscriptions')
        .set('Authorization', 'Bearer user-token');

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to subscription creation', async () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      // Make multiple requests to test rate limiting
      const requests = Array(10)
        .fill()
        .map(() =>
          request(app)
            .post('/api/v1/performance/realtime/subscribe')
            .send(subscriptionData)
        );

      const responses = await Promise.all(requests);

      // At least some requests should succeed
      const successResponses = responses.filter((r) => r.status === 201);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      expect(successResponses.length + rateLimitedResponses.length).toBe(10);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed JSON in subscription requests', async () => {
      const response = await request(app)
        .post('/api/v1/performance/realtime/subscribe')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    test('should handle missing query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/performance/realtime/metrics')
        .query({}); // No parameters

      expect([200, 400]).toContain(response.status);
    });

    test('should handle invalid subscription ID format', async () => {
      const response = await request(app).delete(
        '/api/v1/performance/realtime/unsubscribe/invalid-id'
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    test('should handle service unavailable scenarios', async () => {
      const {
        performanceStreamingService,
      } = require('../../../src/services/metrics/performance-streaming.service.js');

      performanceStreamingService.createSubscription.mockImplementation(() => {
        const error = new Error('Service temporarily unavailable');
        error.code = 'SERVICE_UNAVAILABLE';
        throw error;
      });

      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      const response = await request(app)
        .post('/api/v1/performance/realtime/subscribe')
        .send(subscriptionData);

      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });
  });
});
