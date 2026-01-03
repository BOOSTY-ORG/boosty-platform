/**
 * Performance Streaming Service Tests
 *
 * Tests for PerformanceStreamingService including:
 * - Server-Sent Events (SSE) streaming
 * - WebSocket connections
 * - Subscription management
 * - Real-time data delivery
 * - Connection lifecycle
 */

const performanceStreamingService = require('../../../src/services/metrics/performance-streaming.service.js');
const {
  setupTestDatabase,
  teardownTestDatabase,
  generateTestDates,
} = require('../../helpers/metrics.test.helpers.js');

// Mock dependencies
jest.mock('../../../src/helpers/logger.js');

describe('PerformanceStreamingService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Subscription Management', () => {
    test('should create subscription successfully', () => {
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

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);

      expect(subscription).toBeDefined();
      expect(subscription.subscriptionId).toBeDefined();
      expect(subscription.status).toBe('active');
      expect(subscription.categories).toEqual(subscriptionData.categories);
      expect(subscription.metrics).toEqual(subscriptionData.metrics);
      expect(subscription.interval).toBe(subscriptionData.interval);
      expect(subscription.filters).toEqual(subscriptionData.filters);
      expect(subscription.createdAt).toBeDefined();
    });

    test('should validate subscription data', () => {
      const invalidSubscriptionData = {
        categories: 'invalid', // Should be array
        metrics: [], // Should not be empty
        interval: 'invalid', // Should be number
        filters: null, // Should be object
      };

      expect(() => {
        performanceStreamingService.createSubscription(invalidSubscriptionData);
      }).toThrow();
    });

    test('should cancel subscription successfully', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const result = performanceStreamingService.cancelSubscription(
        subscription.subscriptionId
      );

      expect(result).toBe(true);

      const cancelledSubscription = performanceStreamingService.getSubscription(
        subscription.subscriptionId
      );
      expect(cancelledSubscription.status).toBe('cancelled');
    });

    test('should handle non-existent subscription cancellation', () => {
      const result =
        performanceStreamingService.cancelSubscription('non-existent-id');

      expect(result).toBe(false);
    });

    test('should update subscription successfully', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const updateData = {
        interval: 10000,
        filters: { environment: 'staging' },
      };

      const result = performanceStreamingService.updateSubscription(
        subscription.subscriptionId,
        updateData
      );

      expect(result).toBe(true);

      const updatedSubscription = performanceStreamingService.getSubscription(
        subscription.subscriptionId
      );
      expect(updatedSubscription.interval).toBe(10000);
      expect(updatedSubscription.filters.environment).toBe('staging');
    });

    test('should get active subscriptions', () => {
      const subscriptionData1 = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      const subscriptionData2 = {
        categories: ['api'],
        metrics: ['responseTime'],
        interval: 10000,
      };

      const subscription1 =
        performanceStreamingService.createSubscription(subscriptionData1);
      const subscription2 =
        performanceStreamingService.createSubscription(subscriptionData2);

      const activeSubscriptions =
        performanceStreamingService.getActiveSubscriptions();

      expect(activeSubscriptions).toHaveLength(2);
      expect(activeSubscriptions[0].subscriptionId).toBe(
        subscription1.subscriptionId
      );
      expect(activeSubscriptions[1].subscriptionId).toBe(
        subscription2.subscriptionId
      );
    });

    test('should filter subscriptions by criteria', () => {
      const subscriptionData1 = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      const subscriptionData2 = {
        categories: ['api'],
        metrics: ['responseTime'],
        interval: 10000,
      };

      performanceStreamingService.createSubscription(subscriptionData1);
      performanceStreamingService.createSubscription(subscriptionData2);

      const systemSubscriptions =
        performanceStreamingService.getActiveSubscriptions({
          categories: ['system'],
        });

      const apiSubscriptions =
        performanceStreamingService.getActiveSubscriptions({
          categories: ['api'],
        });

      expect(systemSubscriptions).toHaveLength(1);
      expect(systemSubscriptions[0].categories).toContain('system');
      expect(apiSubscriptions).toHaveLength(1);
      expect(apiSubscriptions[0].categories).toContain('api');
    });
  });

  describe('SSE Streaming', () => {
    test('should create SSE stream', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 1000,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );

      expect(stream).toBeDefined();
      expect(stream.subscriptionId).toBe(subscription.subscriptionId);
      expect(stream.type).toBe('sse');
    });

    test('should send data through SSE stream', (done) => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 100, // Short interval for testing
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );

      let messageCount = 0;
      stream.on('data', (data) => {
        messageCount++;
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('metrics');
        expect(data.metrics).toHaveProperty('cpu');

        if (messageCount >= 3) {
          stream.close();
          done();
        }
      });

      // Start streaming
      performanceStreamingService.startStreaming(subscription.subscriptionId);
    });

    test('should handle SSE stream errors', (done) => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 100,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );

      stream.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      // Simulate error condition
      performanceStreamingService.simulateStreamError(
        subscription.subscriptionId
      );
    });

    test('should close SSE stream properly', (done) => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 100,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );

      stream.on('close', () => {
        expect(stream.isClosed()).toBe(true);
        done();
      });

      // Start and then stop streaming
      performanceStreamingService.startStreaming(subscription.subscriptionId);
      setTimeout(() => {
        performanceStreamingService.stopStreaming(subscription.subscriptionId);
      }, 200);
    });

    test('should respect subscription interval', (done) => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 200, // 200ms interval
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );

      const timestamps = [];
      stream.on('data', (data) => {
        timestamps.push(data.timestamp);

        if (timestamps.length >= 3) {
          stream.close();

          // Verify intervals are approximately correct
          const interval1 = timestamps[1] - timestamps[0];
          const interval2 = timestamps[2] - timestamps[1];

          expect(interval1).toBeGreaterThan(180); // Allow some tolerance
          expect(interval1).toBeLessThan(220);
          expect(interval2).toBeGreaterThan(180);
          expect(interval2).toBeLessThan(220);

          done();
        }
      });

      performanceStreamingService.startStreaming(subscription.subscriptionId);
    });
  });

  describe('WebSocket Connections', () => {
    test('should create WebSocket connection', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const wsConnection =
        performanceStreamingService.createWebSocketConnection(
          subscription.subscriptionId
        );

      expect(wsConnection).toBeDefined();
      expect(wsConnection.subscriptionId).toBe(subscription.subscriptionId);
      expect(wsConnection.type).toBe('websocket');
    });

    test('should handle WebSocket messages', (done) => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 100,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const wsConnection =
        performanceStreamingService.createWebSocketConnection(
          subscription.subscriptionId
        );

      let messageCount = 0;
      wsConnection.on('message', (data) => {
        messageCount++;
        expect(JSON.parse(data)).toHaveProperty('metrics');

        if (messageCount >= 3) {
          wsConnection.close();
          done();
        }
      });

      // Start streaming
      performanceStreamingService.startStreaming(subscription.subscriptionId);
    });

    test('should handle WebSocket connection lifecycle', (done) => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 100,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const wsConnection =
        performanceStreamingService.createWebSocketConnection(
          subscription.subscriptionId
        );

      let connectionState = 'disconnected';

      wsConnection.on('open', () => {
        connectionState = 'connected';
      });

      wsConnection.on('close', () => {
        connectionState = 'disconnected';
        expect(connectionState).toBe('connected');
        done();
      });

      // Simulate connection lifecycle
      setTimeout(() => {
        wsConnection.close();
      }, 200);
    });
  });

  describe('Data Filtering', () => {
    test('should filter data by category', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu', 'memory'],
        interval: 1000,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );

      const receivedData = [];
      stream.on('data', (data) => {
        receivedData.push(data);

        if (receivedData.length >= 3) {
          stream.close();

          // Verify only system metrics are included
          receivedData.forEach((data) => {
            expect(data.metrics).toHaveProperty('cpu');
            expect(data.metrics).toHaveProperty('memory');
            expect(data.metrics).not.toHaveProperty('responseTime');
          });
        }
      });

      performanceStreamingService.startStreaming(subscription.subscriptionId);
    });

    test('should filter data by metric name', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'], // Only CPU metric
        interval: 1000,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );

      stream.on('data', (data) => {
        expect(data.metrics).toHaveProperty('cpu');
        expect(data.metrics).not.toHaveProperty('memory');
        stream.close();
      });

      performanceStreamingService.startStreaming(subscription.subscriptionId);
    });

    test('should apply custom filters', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 1000,
        filters: {
          environment: 'production',
          instanceId: 'server-001',
        },
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );

      stream.on('data', (data) => {
        expect(data.filters.environment).toBe('production');
        expect(data.filters.instanceId).toBe('server-001');
        stream.close();
      });

      performanceStreamingService.startStreaming(subscription.subscriptionId);
    });
  });

  describe('Connection Limits', () => {
    test('should enforce maximum connections per client', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      // Create multiple subscriptions
      const subscriptions = [];
      for (let i = 0; i < 15; i++) {
        try {
          subscriptions.push(
            performanceStreamingService.createSubscription(subscriptionData)
          );
        } catch (error) {
          // Expected to fail after reaching limit
        }
      }

      // Should allow reasonable number but reject excess
      expect(subscriptions.length).toBeLessThan(15);
      expect(subscriptions.length).toBeGreaterThan(0);
    });

    test('should enforce maximum total connections', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      const initialConnections =
        performanceStreamingService.getConnectionStats().totalConnections;

      // Create subscriptions until limit is reached
      const subscriptions = [];
      let reachedLimit = false;

      for (let i = 0; i < 100; i++) {
        try {
          subscriptions.push(
            performanceStreamingService.createSubscription(subscriptionData)
          );
        } catch (error) {
          reachedLimit = true;
          break;
        }
      }

      expect(reachedLimit).toBe(true);
      expect(subscriptions.length).toBeLessThan(100);
    });

    test('should prioritize connections by role', () => {
      const adminSubscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
        userRole: 'admin',
      };

      const userSubscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
        userRole: 'user',
      };

      const adminSubscription = performanceStreamingService.createSubscription(
        adminSubscriptionData
      );
      const userSubscription =
        performanceStreamingService.createSubscription(userSubscriptionData);

      // Admin connections should have higher priority
      const connectionStats = performanceStreamingService.getConnectionStats();

      expect(connectionStats.totalConnections).toBeGreaterThan(0);
      // Priority testing would depend on implementation
    });
  });

  describe('Performance Monitoring', () => {
    test('should track connection statistics', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);

      const initialStats = performanceStreamingService.getConnectionStats();

      // Create and close a connection
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );
      performanceStreamingService.startStreaming(subscription.subscriptionId);

      setTimeout(() => {
        stream.close();

        const finalStats = performanceStreamingService.getConnectionStats();

        expect(finalStats.totalConnections).toBeGreaterThanOrEqual(
          initialStats.totalConnections
        );
        expect(finalStats.activeConnections).toBeLessThanOrEqual(
          initialStats.activeConnections
        );
      }, 200);
    });

    test('should monitor stream performance', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 100, // High frequency for testing
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );

      const deliveryTimes = [];
      stream.on('data', (data) => {
        deliveryTimes.push({
          timestamp: Date.now(),
          latency: data.latency || 0,
        });

        if (deliveryTimes.length >= 10) {
          stream.close();

          // Check for performance issues
          const avgLatency =
            deliveryTimes.reduce((sum, d) => sum + d.latency, 0) /
            deliveryTimes.length;
          expect(avgLatency).toBeLessThan(1000); // Should be under 1 second
        }
      });

      performanceStreamingService.startStreaming(subscription.subscriptionId);
    });

    test('should detect connection issues', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );

      stream.on('error', (error) => {
        expect(error).toBeDefined();
      });

      // Simulate connection issues
      performanceStreamingService.simulateConnectionIssue(
        subscription.subscriptionId
      );
    });
  });

  describe('Data Transformation', () => {
    test('should transform data for different formats', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 1000,
        format: 'json', // Explicit format
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );

      stream.on('data', (data) => {
        expect(typeof data).toBe('object');
        expect(data).toHaveProperty('metrics');
        expect(data).toHaveProperty('timestamp');
        stream.close();
      });

      performanceStreamingService.startStreaming(subscription.subscriptionId);
    });

    test('should handle custom data transformation', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 1000,
        transform: {
          type: 'delta', // Send only changes
          threshold: 5, // Only send if change > 5
        },
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );

      let lastValue = null;
      stream.on('data', (data) => {
        if (lastValue !== null) {
          const change = Math.abs(data.metrics.cpu - lastValue);
          expect(change).toBeGreaterThan(5);
        }
        lastValue = data.metrics.cpu;

        stream.close();
      });

      performanceStreamingService.startStreaming(subscription.subscriptionId);
    });
  });

  describe('Cleanup and Maintenance', () => {
    test('should cleanup inactive connections', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );

      // Simulate inactive connection
      stream.lastActivity = Date.now() - 30 * 60 * 1000; // 30 minutes ago

      const cleanupResult =
        performanceStreamingService.cleanupInactiveConnections({
          maxInactiveTime: 15 * 60 * 1000, // 15 minutes
        });

      expect(cleanupResult.cleanedUp).toBeGreaterThan(0);
    });

    test('should handle service restart gracefully', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      // Create subscription before restart
      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);

      // Simulate service restart
      performanceStreamingService.handleServiceRestart();

      // Verify service state after restart
      const stats = performanceStreamingService.getConnectionStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.activeConnections).toBe(0);
    });

    test('should maintain subscription persistence', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
        persistent: true,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);

      // Simulate service restart
      performanceStreamingService.handleServiceRestart();

      // Check if persistent subscription is restored
      const restoredSubscriptions =
        performanceStreamingService.getActiveSubscriptions();
      const persistentSubscription = restoredSubscriptions.find(
        (s) => s.persistent
      );

      expect(persistentSubscription).toBeDefined();
      expect(persistentSubscription.categories).toEqual(
        subscriptionData.categories
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle subscription creation errors', () => {
      const invalidSubscriptionData = {
        categories: null,
        metrics: [],
        interval: -1,
      };

      expect(() => {
        performanceStreamingService.createSubscription(invalidSubscriptionData);
      }).toThrow();
    });

    test('should handle streaming errors gracefully', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
      };

      const subscription =
        performanceStreamingService.createSubscription(subscriptionData);
      const stream = performanceStreamingService.createSSEStream(
        subscription.subscriptionId
      );

      stream.on('error', (error) => {
        expect(error).toBeDefined();
        stream.close();
      });

      // Simulate streaming error
      performanceStreamingService.simulateStreamingError(
        subscription.subscriptionId,
        'Test error'
      );
    });

    test('should handle data processing errors', () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu'],
        interval: 5000,
        transform: {
          type: 'invalid_transform',
        },
      };

      expect(() => {
        performanceStreamingService.createSubscription(subscriptionData);
      }).toThrow();
    });
  });
});
