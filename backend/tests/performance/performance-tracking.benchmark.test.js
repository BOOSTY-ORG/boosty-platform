/**
 * Performance Tracking Benchmark Tests
 *
 * Performance benchmarks for all performance tracking endpoints including:
 * - Response time measurements
 * - Concurrent request handling
 * - Memory usage analysis
 * - Caching effectiveness
 * - Load testing
 */

const request = require('supertest');
const { performance } = require('perf_hooks');
const {
  setupTestDatabase,
  teardownTestDatabase,
} = require('../../helpers/metrics.test.helpers.js');

// Mock dependencies for testing
const jwt = require('jsonwebtoken');

describe('Performance Tracking Benchmark Tests', () => {
  let app, server;
  let adminToken;

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

    // Generate admin token for testing
    adminToken = jwt.sign(
      { id: 'admin123', email: 'admin@example.com', role: 'admin' },
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

  describe('Dashboard Endpoint Benchmarks', () => {
    test('GET /api/v1/performance/dashboard/overview - response time', async () => {
      const measurements = [];

      // Run 10 requests and measure response times
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/dashboard/overview')
          .query({ timeRange: '1h' })
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      // Calculate statistics
      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxResponseTime = Math.max(...measurements);
      const minResponseTime = Math.min(...measurements);

      console.log(
        `Dashboard Overview - Avg: ${avgResponseTime.toFixed(2)}ms, Min: ${minResponseTime.toFixed(2)}ms, Max: ${maxResponseTime.toFixed(2)}ms`
      );

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(200); // Average should be under 200ms
      expect(maxResponseTime).toBeLessThan(500); // Max should be under 500ms
    });

    test('GET /api/v1/performance/dashboard/system - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/dashboard/system')
          .query({ timeRange: '6h' })
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(`Dashboard System - Avg: ${avgResponseTime.toFixed(2)}ms`);
      expect(avgResponseTime).toBeLessThan(250);
    });

    test('GET /api/v1/performance/dashboard/api - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/dashboard/api')
          .query({ timeRange: '24h' })
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(`Dashboard API - Avg: ${avgResponseTime.toFixed(2)}ms`);
      expect(avgResponseTime).toBeLessThan(300); // Longer time range might take longer
    });

    test('GET /api/v1/performance/dashboard/database - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/dashboard/database')
          .query({ timeRange: '1h' })
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(`Dashboard Database - Avg: ${avgResponseTime.toFixed(2)}ms`);
      expect(avgResponseTime).toBeLessThan(250);
    });

    test('GET /api/v1/performance/dashboard/alerts - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/dashboard/alerts')
          .query({ limit: '20', offset: '0' })
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(`Dashboard Alerts - Avg: ${avgResponseTime.toFixed(2)}ms`);
      expect(avgResponseTime).toBeLessThan(200);
    });
  });

  describe('Analytics Endpoint Benchmarks', () => {
    test('GET /api/v1/performance/analytics/trends - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/analytics/trends')
          .query({
            metrics: 'cpu,memory',
            categories: 'system',
            timeRange: '6h',
            interval: '1h',
          })
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(`Analytics Trends - Avg: ${avgResponseTime.toFixed(2)}ms`);
      expect(avgResponseTime).toBeLessThan(500); // Analytics might take longer
    });

    test('GET /api/v1/performance/analytics/aggregations - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/analytics/aggregations')
          .query({
            metrics: 'cpu,memory',
            categories: 'system',
            timeRange: '6h',
            aggregationType: 'avg,min,max,stdDev',
          })
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(
        `Analytics Aggregations - Avg: ${avgResponseTime.toFixed(2)}ms`
      );
      expect(avgResponseTime).toBeLessThan(600);
    });

    test('GET /api/v1/performance/analytics/statistics - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/analytics/statistics')
          .query({
            timeRange: '6h',
            include: 'overview,system,api',
          })
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(
        `Analytics Statistics - Avg: ${avgResponseTime.toFixed(2)}ms`
      );
      expect(avgResponseTime).toBeLessThan(700);
    });

    test('GET /api/v1/performance/analytics/percentiles - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/analytics/percentiles')
          .query({
            metrics: 'cpu,memory',
            categories: 'system',
            timeRange: '6h',
            percentiles: '50,90,95,99',
          })
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(
        `Analytics Percentiles - Avg: ${avgResponseTime.toFixed(2)}ms`
      );
      expect(avgResponseTime).toBeLessThan(800); // Percentiles can be expensive
    });

    test('GET /api/v1/performance/analytics/comparisons - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/analytics/comparisons')
          .query({
            metrics: 'cpu,memory',
            categories: 'system',
            currentPeriod: '6h',
            previousPeriod: '6h',
            previousOffset: '6h',
          })
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(
        `Analytics Comparisons - Avg: ${avgResponseTime.toFixed(2)}ms`
      );
      expect(avgResponseTime).toBeLessThan(900); // Comparisons can be expensive
    });

    test('GET /api/v1/performance/analytics/correlations - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/analytics/correlations')
          .query({
            metrics: 'cpu,memory',
            categories: 'system',
            timeRange: '6h',
            threshold: '0.5',
          })
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(
        `Analytics Correlations - Avg: ${avgResponseTime.toFixed(2)}ms`
      );
      expect(avgResponseTime).toBeLessThan(1000); // Correlations can be very expensive
    });

    test('GET /api/v1/performance/analytics/anomalies - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/analytics/anomalies')
          .query({
            timeRange: '6h',
            severity: 'warning,critical',
            confidence: '0.8',
          })
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(`Analytics Anomalies - Avg: ${avgResponseTime.toFixed(2)}ms`);
      expect(avgResponseTime).toBeLessThan(1200); // Anomaly detection is expensive
    });

    test('GET /api/v1/performance/analytics/forecasts - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

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

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(`Analytics Forecasts - Avg: ${avgResponseTime.toFixed(2)}ms`);
      expect(avgResponseTime).toBeLessThan(1500); // Forecasting can be very expensive
    });

    test('POST /api/v1/performance/analytics/custom - response time', async () => {
      const customQuery = {
        name: 'Performance Analysis Query',
        description: 'Analyzing CPU and Memory trends',
        metrics: [
          { category: 'system', name: 'cpu', aggregation: 'avg' },
          { category: 'system', name: 'memory', aggregation: 'avg' },
        ],
        timeRange: '6h',
        operations: [
          { type: 'trend', metric: 'cpu' },
          { type: 'correlation', metrics: ['cpu', 'memory'] },
        ],
      };

      const measurements = [];

      for (let i = 0; i < 5; i++) {
        // Fewer iterations for expensive operations
        const startTime = performance.now();

        const response = await request(app)
          .post('/api/v1/performance/analytics/custom')
          .send(customQuery)
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(`Analytics Custom - Avg: ${avgResponseTime.toFixed(2)}ms`);
      expect(avgResponseTime).toBeLessThan(2000); // Custom queries can be very expensive
    });
  });

  describe('Configuration Endpoint Benchmarks', () => {
    test('GET /api/v1/performance/configuration/alerts - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/configuration/alerts')
          .query({ category: 'system', enabled: 'true' })
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(
        `Configuration Alerts - Avg: ${avgResponseTime.toFixed(2)}ms`
      );
      expect(avgResponseTime).toBeLessThan(150);
    });

    test('POST /api/v1/performance/configuration/alerts - response time', async () => {
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

      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .post('/api/v1/performance/configuration/alerts')
          .send(alertConfig)
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(201);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(
        `Configuration Create Alert - Avg: ${avgResponseTime.toFixed(2)}ms`
      );
      expect(avgResponseTime).toBeLessThan(200);
    });

    test('GET /api/v1/performance/configuration/metrics - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/configuration/metrics')
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(
        `Configuration Metrics - Avg: ${avgResponseTime.toFixed(2)}ms`
      );
      expect(avgResponseTime).toBeLessThan(100);
    });

    test('GET /api/v1/performance/configuration/thresholds - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/configuration/thresholds')
          .query({ category: 'system' })
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(
        `Configuration Thresholds - Avg: ${avgResponseTime.toFixed(2)}ms`
      );
      expect(avgResponseTime).toBeLessThan(100);
    });

    test('GET /api/v1/performance/configuration/summary - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/configuration/summary')
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(
        `Configuration Summary - Avg: ${avgResponseTime.toFixed(2)}ms`
      );
      expect(avgResponseTime).toBeLessThan(200);
    });
  });

  describe('Real-time Endpoint Benchmarks', () => {
    test('GET /api/v1/performance/realtime/metrics - connection time', async () => {
      const measurements = [];

      for (let i = 0; i < 5; i++) {
        // Fewer iterations for streaming endpoints
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/realtime/metrics')
          .set('Accept', 'text/event-stream')
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(`Realtime Metrics - Avg: ${avgResponseTime.toFixed(2)}ms`);
      expect(avgResponseTime).toBeLessThan(300); // Connection setup time
    });

    test('POST /api/v1/performance/realtime/subscribe - response time', async () => {
      const subscriptionData = {
        categories: ['system'],
        metrics: ['cpu', 'memory'],
        interval: 5000,
        filters: { environment: 'production' },
      };

      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .post('/api/v1/performance/realtime/subscribe')
          .send(subscriptionData)
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(201);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(`Realtime Subscribe - Avg: ${avgResponseTime.toFixed(2)}ms`);
      expect(avgResponseTime).toBeLessThan(200);
    });

    test('GET /api/v1/performance/realtime/subscriptions - response time', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await request(app)
          .get('/api/v1/performance/realtime/subscriptions')
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        measurements.push(responseTime);
        expect(response.status).toBe(200);
      }

      const avgResponseTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;

      console.log(
        `Realtime Subscriptions - Avg: ${avgResponseTime.toFixed(2)}ms`
      );
      expect(avgResponseTime).toBeLessThan(150);
    });
  });

  describe('Concurrent Request Benchmarks', () => {
    test('Concurrent dashboard requests', async () => {
      const concurrentRequests = Array(20)
        .fill()
        .map(() =>
          request(app)
            .get('/api/v1/performance/dashboard/overview')
            .query({ timeRange: '1h' })
            .set('Authorization', `Bearer ${adminToken}`)
        );

      const startTime = performance.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const successfulResponses = responses.filter((r) => r.status === 200);

      console.log(
        `Concurrent Dashboard - Total: ${totalTime.toFixed(2)}ms, Success: ${successfulResponses.length}/${responses.length}`
      );

      expect(successfulResponses.length).toBeGreaterThan(18); // At least 90% should succeed
      expect(totalTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('Concurrent analytics requests', async () => {
      const concurrentRequests = Array(10)
        .fill()
        .map(() =>
          request(app)
            .get('/api/v1/performance/analytics/trends')
            .query({
              metrics: 'cpu,memory',
              categories: 'system',
              timeRange: '6h',
              interval: '1h',
            })
            .set('Authorization', `Bearer ${adminToken}`)
        );

      const startTime = performance.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const successfulResponses = responses.filter((r) => r.status === 200);

      console.log(
        `Concurrent Analytics - Total: ${totalTime.toFixed(2)}ms, Success: ${successfulResponses.length}/${responses.length}`
      );

      expect(successfulResponses.length).toBeGreaterThan(8); // At least 80% should succeed
      expect(totalTime).toBeLessThan(2000); // Should complete in under 2 seconds
    });

    test('Concurrent configuration requests', async () => {
      const concurrentRequests = Array(30)
        .fill()
        .map(() =>
          request(app)
            .get('/api/v1/performance/configuration/metrics')
            .set('Authorization', `Bearer ${adminToken}`)
        );

      const startTime = performance.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const successfulResponses = responses.filter((r) => r.status === 200);

      console.log(
        `Concurrent Configuration - Total: ${totalTime.toFixed(2)}ms, Success: ${successfulResponses.length}/${responses.length}`
      );

      expect(successfulResponses.length).toBeGreaterThan(27); // At least 90% should succeed
      expect(totalTime).toBeLessThan(800); // Should complete in under 800ms
    });
  });

  describe('Load Testing', () => {
    test('Sustained load - dashboard endpoints', async () => {
      const batches = 5;
      const requestsPerBatch = 20;
      const batchResults = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchStartTime = performance.now();

        const requests = Array(requestsPerBatch)
          .fill()
          .map(() =>
            request(app)
              .get('/api/v1/performance/dashboard/overview')
              .query({ timeRange: '1h' })
              .set('Authorization', `Bearer ${adminToken}`)
          );

        const responses = await Promise.all(requests);
        const batchEndTime = performance.now();

        const batchTime = batchEndTime - batchStartTime;
        const successfulResponses = responses.filter((r) => r.status === 200);

        batchResults.push({
          batch: batch + 1,
          time: batchTime,
          success: successfulResponses.length,
          total: responses.length,
        });

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const avgBatchTime =
        batchResults.reduce((sum, r) => sum + r.time, 0) / batchResults.length;
      const totalSuccess = batchResults.reduce((sum, r) => sum + r.success, 0);
      const totalRequests = batchResults.reduce((sum, r) => sum + r.total, 0);

      console.log(
        `Sustained Load Dashboard - Avg Batch Time: ${avgBatchTime.toFixed(2)}ms, Success: ${totalSuccess}/${totalRequests}`
      );

      expect(totalSuccess).toBeGreaterThan(totalRequests * 0.9); // At least 90% success rate
      expect(avgBatchTime).toBeLessThan(1000); // Average batch time under 1 second
    });

    test('Sustained load - analytics endpoints', async () => {
      const batches = 3;
      const requestsPerBatch = 10;
      const batchResults = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchStartTime = performance.now();

        const requests = Array(requestsPerBatch)
          .fill()
          .map(() =>
            request(app)
              .get('/api/v1/performance/analytics/aggregations')
              .query({
                metrics: 'cpu,memory',
                categories: 'system',
                timeRange: '6h',
                aggregationType: 'avg,min,max',
              })
              .set('Authorization', `Bearer ${adminToken}`)
          );

        const responses = await Promise.all(requests);
        const batchEndTime = performance.now();

        const batchTime = batchEndTime - batchStartTime;
        const successfulResponses = responses.filter((r) => r.status === 200);

        batchResults.push({
          batch: batch + 1,
          time: batchTime,
          success: successfulResponses.length,
          total: responses.length,
        });

        // Longer delay between batches for expensive operations
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const avgBatchTime =
        batchResults.reduce((sum, r) => sum + r.time, 0) / batchResults.length;
      const totalSuccess = batchResults.reduce((sum, r) => sum + r.success, 0);
      const totalRequests = batchResults.reduce((sum, r) => sum + r.total, 0);

      console.log(
        `Sustained Load Analytics - Avg Batch Time: ${avgBatchTime.toFixed(2)}ms, Success: ${totalSuccess}/${totalRequests}`
      );

      expect(totalSuccess).toBeGreaterThan(totalRequests * 0.8); // At least 80% success rate
      expect(avgBatchTime).toBeLessThan(3000); // Average batch time under 3 seconds
    });
  });

  describe('Memory Usage Benchmarks', () => {
    test('Memory usage during large concurrent requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Make many concurrent requests
      const largeConcurrentRequests = Array(100)
        .fill()
        .map(() =>
          request(app)
            .get('/api/v1/performance/analytics/trends')
            .query({ timeRange: '24h' }) // Large time range
            .set('Authorization', `Bearer ${adminToken}`)
        );

      const responses = await Promise.all(largeConcurrentRequests);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      const successfulResponses = responses.filter((r) => r.status === 200);

      console.log(
        `Memory Usage - Initial: ${(initialMemory / (1024 * 1024)).toFixed(2)}MB, Final: ${(finalMemory / (1024 * 1024)).toFixed(2)}MB, Increase: ${memoryIncreaseMB.toFixed(2)}MB`
      );
      console.log(
        `Memory Usage - Success: ${successfulResponses.length}/${responses.length}`
      );

      expect(successfulResponses.length).toBeGreaterThan(90); // At least 90% should succeed
      expect(memoryIncreaseMB).toBeLessThan(50); // Memory increase should be reasonable
    });

    test('Memory usage during streaming', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create multiple streaming connections
      const streamingRequests = Array(10)
        .fill()
        .map(() =>
          request(app)
            .get('/api/v1/performance/realtime/metrics')
            .set('Accept', 'text/event-stream')
            .set('Authorization', `Bearer ${adminToken}`)
        );

      const responses = await Promise.all(streamingRequests);

      // Wait a bit for streaming to establish
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      const successfulResponses = responses.filter((r) => r.status === 200);

      console.log(
        `Streaming Memory - Initial: ${(initialMemory / (1024 * 1024)).toFixed(2)}MB, Final: ${(finalMemory / (1024 * 1024)).toFixed(2)}MB, Increase: ${memoryIncreaseMB.toFixed(2)}MB`
      );
      console.log(
        `Streaming Memory - Success: ${successfulResponses.length}/${responses.length}`
      );

      expect(successfulResponses.length).toBeGreaterThan(8); // At least 80% should succeed
      expect(memoryIncreaseMB).toBeLessThan(20); // Memory increase for streaming should be reasonable
    });
  });

  describe('Caching Effectiveness Benchmarks', () => {
    test('Cache hit response time vs cache miss', async () => {
      // First request (cache miss)
      const missStartTime = performance.now();
      const missResponse = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .query({ timeRange: '1h' })
        .set('Authorization', `Bearer ${adminToken}`);
      const missEndTime = performance.now();
      const missTime = missEndTime - missStartTime;

      // Second request (potential cache hit)
      const hitStartTime = performance.now();
      const hitResponse = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .query({ timeRange: '1h' })
        .set('Authorization', `Bearer ${adminToken}`);
      const hitEndTime = performance.now();
      const hitTime = hitEndTime - hitStartTime;

      console.log(
        `Cache Effectiveness - Miss: ${missTime.toFixed(2)}ms, Hit: ${hitTime.toFixed(2)}ms`
      );

      expect(missResponse.status).toBe(200);
      expect(hitResponse.status).toBe(200);

      // Cache hit should be faster or at least not significantly slower
      expect(hitTime).toBeLessThanOrEqual(missTime * 1.2);
    });

    test('Cache invalidation behavior', async () => {
      // First request to populate cache
      const firstResponse = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .query({ timeRange: '1h' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(firstResponse.status).toBe(200);

      // Second request should potentially hit cache
      const secondResponse = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .query({ timeRange: '1h' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(secondResponse.status).toBe(200);

      // Request with different parameters should not hit cache
      const differentResponse = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .query({ timeRange: '6h' }) // Different time range
        .set('Authorization', `Bearer ${adminToken}`);

      expect(differentResponse.status).toBe(200);

      // All responses should be successful
      expect(firstResponse.status).toBe(200);
      expect(secondResponse.status).toBe(200);
      expect(differentResponse.status).toBe(200);
    });
  });
});
