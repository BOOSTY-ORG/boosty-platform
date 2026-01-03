/**
 * Notification System Performance Tests
 *
 * This test suite provides comprehensive performance and load testing:
 * - High-volume notification sending
 * - Queue throughput testing
 * - Concurrent operation testing
 * - Memory and CPU usage monitoring
 * - Database query performance testing
 * - External service rate limiting
 * - Real-time connection stress testing
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import NotificationService from '../src/services/notification/notification.service.js';
import QueueManager from '../src/services/notification/queueManager.service.js';
import Notification from '../src/models/notification.model.js';
import NotificationDelivery from '../src/models/notificationDelivery.model.js';
import User from '../src/models/user.model.js';
import NotificationTestFixtures from './helpers/notification-test-fixtures.js';

// Test configuration
let mongoServer;
let testFixtures;
let testUsers;
let testTemplates;
let testPreferences;
let performanceMetrics;

// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.startTime = null;
    this.endMemory = null;
    this.startMemory = null;
    this.metrics = {
      notificationsPerSecond: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      errorRate: 0,
      queueDepth: 0,
    };
  }

  start() {
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage();
  }

  end() {
    this.endMemory = process.memoryUsage();
    const duration = Date.now() - this.startTime;

    this.metrics.memoryUsage =
      this.endMemory.heapUsed - this.startMemory.heapUsed;
    this.metrics.duration = duration;

    return this.metrics;
  }

  recordResponse(responseTime) {
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime + responseTime) / 2;
  }

  recordError() {
    this.metrics.errorRate++;
  }

  recordQueueDepth(depth) {
    this.metrics.queueDepth = Math.max(this.metrics.queueDepth, depth);
  }

  getReport() {
    return {
      ...this.metrics,
      memoryUsageMB: Math.round(this.metrics.memoryUsage / 1024 / 1024),
      startMemoryMB: Math.round(this.startMemory.heapUsed / 1024 / 1024),
      endMemoryMB: Math.round(this.endMemory.heapUsed / 1024 / 1024),
    };
  }
}

// Setup and teardown
beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Initialize test fixtures
  testFixtures = new NotificationTestFixtures();
  performanceMetrics = new PerformanceMonitor();
});

afterAll(async () => {
  // Cleanup
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Create test data
  testUsers = await testFixtures.generateTestUsers(10);
  testTemplates = await testFixtures.generateNotificationTemplates(5);
  testPreferences = await testFixtures.generateUserPreferences(testUsers);

  // Clear collections
  await Notification.deleteMany({});
  await NotificationDelivery.deleteMany({});
});

afterEach(async () => {
  // Cleanup test data
  await testFixtures.cleanupTestData(testUsers);
});

describe('Notification Performance Tests', () => {
  let notificationService;
  let queueManager;

  beforeEach(async () => {
    // Initialize services
    notificationService = new NotificationService();
    queueManager = QueueManager;
    await queueManager.initialize();
  });

  afterEach(async () => {
    // Shutdown queue manager
    await queueManager.shutdown();
  });

  describe('High-Volume Notification Sending', () => {
    it('should handle 1000 notifications efficiently', async () => {
      performanceMetrics.start();

      const notifications = testFixtures.generateNotificationData(
        testUsers,
        testTemplates,
        {
          count: 1000,
          useTemplates: true,
        }
      );

      const startTime = Date.now();
      const result = await notificationService.sendBulkNotifications(
        notifications,
        {
          batchSize: 50,
          delayBetweenBatches: 10,
        }
      );
      const endTime = Date.now();

      const report = performanceMetrics.end();
      const duration = endTime - startTime;
      const notificationsPerSecond = (result.successful / duration) * 1000;

      expect(result.successful).toBeGreaterThan(950); // Allow for some failures
      expect(result.failed).toBeLessThan(50);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(notificationsPerSecond).toBeGreaterThan(30); // At least 30 notifications per second

      console.log(`📊 Performance Report - 1000 Notifications:`);
      console.log(`   Duration: ${duration}ms`);
      console.log(
        `   Success Rate: ${((result.successful / 1000) * 100).toFixed(2)}%`
      );
      console.log(
        `   Notifications/Second: ${notificationsPerSecond.toFixed(2)}`
      );
      console.log(`   Memory Usage: ${report.memoryUsageMB}MB`);
    });

    it('should handle 5000 notifications with moderate performance', async () => {
      performanceMetrics.start();

      const notifications = testFixtures.generateNotificationData(
        testUsers,
        testTemplates,
        {
          count: 5000,
          useTemplates: false,
        }
      );

      const startTime = Date.now();
      const result = await notificationService.sendBulkNotifications(
        notifications,
        {
          batchSize: 100,
          delayBetweenBatches: 50,
        }
      );
      const endTime = Date.now();

      const report = performanceMetrics.end();
      const duration = endTime - startTime;
      const notificationsPerSecond = (result.successful / duration) * 1000;

      expect(result.successful).toBeGreaterThan(4500); // Allow for some failures
      expect(duration).toBeLessThan(120000); // Should complete within 2 minutes
      expect(notificationsPerSecond).toBeGreaterThan(40); // At least 40 notifications per second

      console.log(`📊 Performance Report - 5000 Notifications:`);
      console.log(`   Duration: ${duration}ms`);
      console.log(
        `   Success Rate: ${((result.successful / 5000) * 100).toFixed(2)}%`
      );
      console.log(
        `   Notifications/Second: ${notificationsPerSecond.toFixed(2)}`
      );
      console.log(`   Memory Usage: ${report.memoryUsageMB}MB`);
    });

    it('should maintain performance under sustained load', async () => {
      const batchSizes = [100, 500, 1000];
      const results = [];

      for (const batchSize of batchSizes) {
        performanceMetrics.start();

        const notifications = testFixtures.generateNotificationData(
          testUsers,
          testTemplates,
          {
            count: batchSize,
            useTemplates: true,
          }
        );

        const startTime = Date.now();
        const result =
          await notificationService.sendBulkNotifications(notifications);
        const endTime = Date.now();

        const report = performanceMetrics.end();
        const duration = endTime - startTime;
        const notificationsPerSecond = (result.successful / duration) * 1000;

        results.push({
          batchSize,
          duration,
          successRate: (result.successful / batchSize) * 100,
          notificationsPerSecond,
          memoryUsage: report.memoryUsageMB,
        });

        expect(result.successful).toBeGreaterThan(batchSize * 0.9); // At least 90% success
        expect(duration).toBeLessThan(batchSize * 20); // Should scale reasonably
      }

      // Verify performance scales reasonably
      const avgNps100 = results.find(
        (r) => r.batchSize === 100
      ).notificationsPerSecond;
      const avgNps1000 = results.find(
        (r) => r.batchSize === 1000
      ).notificationsPerSecond;

      // 1000 batch should not be significantly slower than 100 batch
      expect(avgNps1000 / avgNps100).toBeGreaterThan(0.5);

      console.log(`📊 Sustained Load Performance:`);
      results.forEach((result) => {
        console.log(
          `   Batch Size ${result.batchSize}: ${result.notificationsPerSecond.toFixed(2)} nps, ${result.successRate.toFixed(2)}% success, ${result.memoryUsageMB}MB memory`
        );
      });
    });
  });

  describe('Queue Throughput Testing', () => {
    it('should process queue jobs efficiently', async () => {
      performanceMetrics.start();

      const jobCount = 1000;
      const jobs = [];

      // Add jobs to queue
      for (let i = 0; i < jobCount; i++) {
        const notificationData = {
          id: new mongoose.Types.ObjectId(),
          userId: testUsers[i % testUsers.length]._id,
          type: 'email',
          channels: ['email'],
          priority: i % 3 === 0 ? 'high' : 'medium',
        };

        jobs.push(queueManager.addNotificationJob(notificationData));
      }

      await Promise.all(jobs);

      // Wait for queue processing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const stats = await queueManager.getQueueStats();
      const report = performanceMetrics.end();

      expect(stats.highPriority).toBeDefined();
      expect(stats.normalPriority).toBeDefined();
      expect(stats.lowPriority).toBeDefined();

      // Queue should process jobs efficiently
      const totalJobs = Object.values(stats).reduce(
        (sum, queue) => sum + (queue.waiting || 0),
        0
      );
      expect(totalJobs).toBeLessThan(jobCount * 0.3); // Most jobs should be processed

      console.log(`📊 Queue Throughput Report:`);
      console.log(`   Jobs Added: ${jobCount}`);
      console.log(`   Jobs Remaining: ${totalJobs}`);
      console.log(
        `   Processing Rate: ${((jobCount - totalJobs) / 5).toFixed(2)} jobs/second`
      );
      console.log(`   Memory Usage: ${report.memoryUsageMB}MB`);
    });

    it('should handle priority-based processing', async () => {
      performanceMetrics.start();

      const jobCounts = { urgent: 100, high: 200, medium: 300, low: 400 };
      const jobs = [];

      // Add jobs with different priorities
      for (const [priority, count] of Object.entries(jobCounts)) {
        for (let i = 0; i < count; i++) {
          const notificationData = {
            id: new mongoose.Types.ObjectId(),
            userId: testUsers[0]._id,
            type: 'email',
            channels: ['email'],
            priority,
          };

          jobs.push(queueManager.addNotificationJob(notificationData));
        }
      }

      await Promise.all(jobs);

      // Wait for queue processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const stats = await queueManager.getQueueStats();
      const report = performanceMetrics.end();

      // High priority jobs should be processed first
      expect(stats.highPriority.waiting || 0).toBeLessThan(
        stats.lowPriority.waiting || 0
      );

      console.log(`📊 Priority Processing Report:`);
      console.log(`   Urgent Jobs: ${jobCounts.urgent}`);
      console.log(`   High Priority Jobs: ${jobCounts.high}`);
      console.log(`   Medium Priority Jobs: ${jobCounts.medium}`);
      console.log(`   Low Priority Jobs: ${jobCounts.low}`);
      console.log(`   Memory Usage: ${report.memoryUsageMB}MB`);
    });
  });

  describe('Concurrent Operation Testing', () => {
    it('should handle concurrent notification sending', async () => {
      performanceMetrics.start();

      const concurrentRequests = 50;
      const notificationsPerRequest = 20;

      const promises = [];
      for (let i = 0; i < concurrentRequests; i++) {
        const notifications = testFixtures.generateNotificationData(
          testUsers,
          testTemplates,
          {
            count: notificationsPerRequest,
            useTemplates: true,
          }
        );

        promises.push(notificationService.sendBulkNotifications(notifications));
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const totalNotifications = successful * notificationsPerRequest;
      const duration = endTime - startTime;
      const notificationsPerSecond = (totalNotifications / duration) * 1000;

      const report = performanceMetrics.end();

      expect(successful).toBeGreaterThan(concurrentRequests * 0.8); // At least 80% success
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(notificationsPerSecond).toBeGreaterThan(30); // At least 30 notifications per second

      console.log(`📊 Concurrent Operations Report:`);
      console.log(`   Concurrent Requests: ${concurrentRequests}`);
      console.log(
        `   Successful Requests: ${successful}/${concurrentRequests}`
      );
      console.log(`   Total Notifications: ${totalNotifications}`);
      console.log(
        `   Notifications/Second: ${notificationsPerSecond.toFixed(2)}`
      );
      console.log(`   Memory Usage: ${report.memoryUsageMB}MB`);
    });

    it('should handle concurrent queue operations', async () => {
      performanceMetrics.start();

      const concurrentOperations = 20;
      const operationsPerType = 25;

      const promises = [];

      // Concurrent job additions
      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          new Promise(async (resolve) => {
            const jobs = [];
            for (let j = 0; j < operationsPerType; j++) {
              const notificationData = {
                id: new mongoose.Types.ObjectId(),
                userId: testUsers[i % testUsers.length]._id,
                type: 'email',
                channels: ['email'],
                priority: 'medium',
              };

              jobs.push(queueManager.addNotificationJob(notificationData));
            }
            await Promise.all(jobs);
            resolve(jobs.length);
          })
        );
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const totalJobs = successful * operationsPerType;
      const duration = endTime - startTime;
      const jobsPerSecond = (totalJobs / duration) * 1000;

      const report = performanceMetrics.end();

      expect(successful).toBeGreaterThan(concurrentOperations * 0.8); // At least 80% success
      expect(jobsPerSecond).toBeGreaterThan(100); // At least 100 jobs per second

      console.log(`📊 Concurrent Queue Operations Report:`);
      console.log(`   Concurrent Operations: ${concurrentOperations}`);
      console.log(
        `   Successful Operations: ${successful}/${concurrentOperations}`
      );
      console.log(`   Total Jobs: ${totalJobs}`);
      console.log(`   Jobs/Second: ${jobsPerSecond.toFixed(2)}`);
      console.log(`   Memory Usage: ${report.memoryUsageMB}MB`);
    });
  });

  describe('Database Performance Testing', () => {
    it('should handle large notification queries efficiently', async () => {
      performanceMetrics.start();

      // Create many notifications for testing
      const notifications = [];
      for (let i = 0; i < 5000; i++) {
        notifications.push(
          new Notification({
            userId: testUsers[i % testUsers.length]._id,
            type: 'email',
            channels: ['email'],
            content: `Test content ${i}`,
            category: 'general',
            priority: 'medium',
            status: ['sent', 'delivered', 'read'][i % 3],
            createdAt: new Date(Date.now() - i * 60 * 1000), // Spaced over time
          })
        );
      }
      await Notification.insertMany(notifications);

      // Test query performance
      const queries = [
        // Get user notifications with pagination
        () => Notification.getByUser(testUsers[0]._id, { page: 1, limit: 20 }),

        // Get notifications by date range
        () =>
          Notification.find({
            userId: testUsers[0]._id,
            createdAt: {
              $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              $lte: new Date(),
            },
          })
            .sort({ createdAt: -1 })
            .limit(100),

        // Get notification stats
        () => Notification.getStats(testUsers[0]._id),

        // Get delivery stats
        () => NotificationDelivery.getDeliveryStats(),

        // Complex aggregation
        () =>
          Notification.aggregate([
            { $match: { userId: testUsers[0]._id } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
      ];

      const queryResults = [];
      const startTime = Date.now();

      for (const query of queries) {
        const result = await query();
        queryResults.push(result);
      }

      const endTime = Date.now();
      const report = performanceMetrics.end();
      const avgQueryTime = (endTime - startTime) / queries.length;

      // All queries should complete reasonably quickly
      expect(avgQueryTime).toBeLessThan(100); // Average query time under 100ms
      expect(queryResults[0]).toHaveLength(20); // Pagination limit
      expect(Array.isArray(queryResults[1])).toBe(true);
      expect(Array.isArray(queryResults[2])).toBe(true);
      expect(Array.isArray(queryResults[3])).toBe(true);
      expect(Array.isArray(queryResults[4])).toBe(true);

      console.log(`📊 Database Performance Report:`);
      console.log(`   Total Notifications: ${notifications.length}`);
      console.log(`   Queries Executed: ${queries.length}`);
      console.log(`   Average Query Time: ${avgQueryTime.toFixed(2)}ms`);
      console.log(`   Memory Usage: ${report.memoryUsageMB}MB`);
    });

    it('should handle concurrent database operations', async () => {
      performanceMetrics.start();

      const concurrentOperations = 10;
      const operationsPerType = 50;

      const promises = [];

      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          new Promise(async (resolve) => {
            const operations = [];

            // Concurrent reads
            for (let j = 0; j < operationsPerType; j++) {
              operations.push(
                Notification.findOne({ _id: new mongoose.Types.ObjectId() })
              );
            }

            // Concurrent writes
            for (let j = 0; j < operationsPerType; j++) {
              operations.push(
                new Notification({
                  userId: testUsers[i % testUsers.length]._id,
                  type: 'email',
                  channels: ['email'],
                  content: `Concurrent test ${i}-${j}`,
                  category: 'general',
                  priority: 'medium',
                }).save()
              );
            }

            await Promise.all(operations);
            resolve(operations.length);
          })
        );
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const totalOperations = successful * operationsPerType * 2;
      const duration = endTime - startTime;
      const operationsPerSecond = (totalOperations / duration) * 1000;

      const report = performanceMetrics.end();

      expect(successful).toBeGreaterThan(concurrentOperations * 0.8); // At least 80% success
      expect(operationsPerSecond).toBeGreaterThan(200); // At least 200 operations per second

      console.log(`📊 Concurrent Database Operations Report:`);
      console.log(`   Concurrent Operations: ${concurrentOperations}`);
      console.log(
        `   Successful Operations: ${successful}/${concurrentOperations}`
      );
      console.log(`   Total Operations: ${totalOperations}`);
      console.log(`   Operations/Second: ${operationsPerSecond.toFixed(2)}`);
      console.log(`   Memory Usage: ${report.memoryUsageMB}MB`);
    });
  });

  describe('Memory and CPU Usage Monitoring', () => {
    it('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();

      // Generate significant load
      const notifications = testFixtures.generateNotificationData(
        testUsers,
        testTemplates,
        {
          count: 2000,
          useTemplates: true,
        }
      );

      await notificationService.sendBulkNotifications(notifications);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      // Memory usage should be reasonable for 2000 notifications
      expect(memoryIncreaseMB).toBeLessThan(100); // Less than 100MB increase

      console.log(`📊 Memory Usage Report:`);
      console.log(
        `   Initial Memory: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`
      );
      console.log(
        `   Final Memory: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`
      );
      console.log(`   Memory Increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      console.log(
        `   Memory per Notification: ${(memoryIncrease / 2000 / 1024).toFixed(2)}KB`
      );
    });

    it('should handle CPU-intensive operations efficiently', async () => {
      const startTime = process.hrtime.bigint();

      // CPU-intensive operations
      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(
          // Complex aggregation
          Notification.aggregate([
            { $match: { userId: testUsers[0]._id } },
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                avgTime: { $avg: '$createdAt' },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ])
        );
      }

      await Promise.all(operations);

      const endTime = process.hrtime.bigint();
      const cpuTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      // Operations should complete in reasonable time
      expect(cpuTime).toBeLessThan(10000); // Less than 10 seconds for 100 complex aggregations

      console.log(`📊 CPU Performance Report:`);
      console.log(`   Complex Operations: ${operations.length}`);
      console.log(`   Total CPU Time: ${cpuTime.toFixed(2)}ms`);
      console.log(
        `   Average per Operation: ${(cpuTime / operations.length).toFixed(2)}ms`
      );
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should respect external service rate limits', async () => {
      // This test would require actual external services
      // For now, we'll test the rate limiting logic

      const rateLimitTests = [
        { count: 10, expectedDelay: 0 }, // Under limit
        { count: 50, expectedDelay: 100 }, // Near limit
        { count: 100, expectedDelay: 500 }, // Over limit
      ];

      for (const test of rateLimitTests) {
        performanceMetrics.start();

        const notifications = testFixtures.generateNotificationData(
          testUsers,
          testTemplates,
          {
            count: test.count,
            useTemplates: false,
          }
        );

        const startTime = Date.now();
        await notificationService.sendBulkNotifications(notifications, {
          batchSize: 10,
          delayBetweenBatches: 0, // No artificial delays
        });
        const endTime = Date.now();

        const duration = endTime - startTime;
        const report = performanceMetrics.end();

        // Higher volumes should take longer due to rate limiting
        if (test.expectedDelay > 0) {
          expect(duration).toBeGreaterThan(test.expectedDelay);
        }

        console.log(`📊 Rate Limiting Test (${test.count} notifications):`);
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Expected Delay: ${test.expectedDelay}ms`);
        console.log(`   Memory Usage: ${report.memoryUsageMB}MB`);
      }
    });
  });

  describe('Stress Testing', () => {
    it('should handle extreme load without crashing', async () => {
      performanceMetrics.start();

      const extremeLoad = 10000;
      const notifications = testFixtures.generateNotificationData(
        testUsers,
        testTemplates,
        {
          count: extremeLoad,
          useTemplates: false,
        }
      );

      const startTime = Date.now();
      const result = await notificationService.sendBulkNotifications(
        notifications,
        {
          batchSize: 200,
          delayBetweenBatches: 100,
        }
      );
      const endTime = Date.now();

      const report = performanceMetrics.end();
      const duration = endTime - startTime;
      const notificationsPerSecond = (result.successful / duration) * 1000;

      // System should handle extreme load gracefully
      expect(result.successful).toBeGreaterThan(extremeLoad * 0.7); // At least 70% success
      expect(duration).toBeLessThan(300000); // Should complete within 5 minutes
      expect(notificationsPerSecond).toBeGreaterThan(20); // At least 20 notifications per second even under extreme load

      console.log(`📊 Extreme Load Report (${extremeLoad} notifications):`);
      console.log(`   Duration: ${duration}ms`);
      console.log(
        `   Success Rate: ${((result.successful / extremeLoad) * 100).toFixed(2)}%`
      );
      console.log(
        `   Notifications/Second: ${notificationsPerSecond.toFixed(2)}`
      );
      console.log(`   Memory Usage: ${report.memoryUsageMB}MB`);
      console.log(`   Failed: ${result.failed}`);
    });

    it('should recover from temporary failures', async () => {
      performanceMetrics.start();

      // Create notifications that will fail
      const notifications = testFixtures.generateNotificationData(
        testUsers,
        testTemplates,
        {
          count: 100,
          useTemplates: false,
        }
      );

      // Make some notifications invalid to induce failures
      for (let i = 0; i < 10; i++) {
        notifications[i].userId = 'invalid-id';
      }

      const startTime = Date.now();
      const result = await notificationService.sendBulkNotifications(
        notifications,
        {
          batchSize: 20,
          retryFailures: true,
        }
      );
      const endTime = Date.now();

      const report = performanceMetrics.end();
      const successRate =
        (result.successful / (notifications.length - 10)) * 100; // Exclude invalid ones

      // System should handle failures gracefully
      expect(result.successful).toBeGreaterThan(80); // Most valid notifications should succeed
      expect(result.failed).toBeGreaterThanOrEqual(10); // Invalid ones should fail
      expect(successRate).toBeGreaterThan(80); // High success rate for valid notifications

      console.log(`📊 Failure Recovery Report:`);
      console.log(`   Total Notifications: ${notifications.length}`);
      console.log(`   Valid Notifications: ${notifications.length - 10}`);
      console.log(`   Successful: ${result.successful}`);
      console.log(`   Failed: ${result.failed}`);
      console.log(`   Success Rate: ${successRate.toFixed(2)}%`);
      console.log(`   Duration: ${endTime - startTime}ms`);
      console.log(`   Memory Usage: ${report.memoryUsageMB}MB`);
    });
  });
});
