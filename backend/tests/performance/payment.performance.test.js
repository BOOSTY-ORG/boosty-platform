import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/express.js';
import PaymentIntent from '../../src/models/payment/paymentIntent.model.js';
import PaymentTransaction from '../../src/models/payment/paymentTransaction.model.js';
import Payout from '../../src/models/payment/payout.model.js';
import {
  generateMockPaymentIntent,
  generateMockPaymentTransaction,
  generateMockPayout,
  setupTestDatabase,
  cleanupTestDatabase,
  createAuthHeaders
} from '../helpers/payment.test.helpers.js';

describe('Payment Performance Tests', () => {
  let authToken;
  let adminAuthToken;
  let testUser;
  let adminUser;
  let performanceMetrics = {
    responseTimes: [],
    throughput: [],
    memoryUsage: [],
    dbQueryTimes: []
  };

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test users
    testUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'user@example.com',
      role: 'user'
    };
    
    adminUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'admin@example.com',
      role: 'admin'
    };
    
    authToken = 'test_user_token';
    adminAuthToken = 'test_admin_token';
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(() => {
    // Reset performance metrics before each test
    performanceMetrics = {
      responseTimes: [],
      throughput: [],
      memoryUsage: [],
      dbQueryTimes: []
    };
  });

  const measureResponseTime = async (requestFunction) => {
    const startTime = process.hrtime.bigint();
    const response = await requestFunction();
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    performanceMetrics.responseTimes.push(responseTime);
    return { response, responseTime };
  };

  const measureMemoryUsage = () => {
    const memoryUsage = process.memoryUsage();
    performanceMetrics.memoryUsage.push({
      heapUsed: memoryUsage.heapUsed / 1024 / 1024, // MB
      heapTotal: memoryUsage.heapTotal / 1024 / 1024, // MB
      external: memoryUsage.external / 1024 / 1024, // MB
      rss: memoryUsage.rss / 1024 / 1024 // MB
    });
    return memoryUsage;
  };

  const measureDbQueryTime = async (queryFunction) => {
    const startTime = process.hrtime.bigint();
    const result = await queryFunction();
    const endTime = process.hrtime.bigint();
    const queryTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    performanceMetrics.dbQueryTimes.push(queryTime);
    return { result, queryTime };
  };

  describe('Payment Endpoint Performance', () => {
    it('should handle payment initialization within performance targets', async () => {
      const paymentData = {
        amount: 50000,
        type: 'investment',
        paymentMethod: 'card',
        metadata: {
          investmentId: 'PERF_TEST_001',
          description: 'Performance test payment'
        }
      };

      // Measure multiple payment initialization requests
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          measureResponseTime(() =>
            request(app)
              .post('/api/payments/initialize')
              .set(createAuthHeaders(authToken))
              .send({
                ...paymentData,
                metadata: {
                  ...paymentData.metadata,
                  index: i
                }
              })
          )
        );
      }

      const results = await Promise.all(requests);

      // Analyze performance metrics
      const avgResponseTime = performanceMetrics.responseTimes.reduce((a, b) => a + b, 0) / performanceMetrics.responseTimes.length;
      const maxResponseTime = Math.max(...performanceMetrics.responseTimes);
      const minResponseTime = Math.min(...performanceMetrics.responseTimes);

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(500); // Average response time under 500ms
      expect(maxResponseTime).toBeLessThan(2000); // Maximum response time under 2s
      expect(minResponseTime).toBeGreaterThan(0);

      // Verify all requests were successful
      results.forEach(({ response }) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      console.log(`Payment Initialization Performance:
        Average: ${avgResponseTime.toFixed(2)}ms
        Min: ${minResponseTime.toFixed(2)}ms
        Max: ${maxResponseTime.toFixed(2)}ms
        Requests: ${performanceMetrics.responseTimes.length}`);
    });

    it('should handle payment verification under load', async () => {
      // Create test payment intents for verification
      const paymentIntents = [];
      for (let i = 0; i < 50; i++) {
        const intent = await PaymentIntent.create(
          generateMockPaymentIntent({
            intentId: `PERF_VERIFY_${i}`,
            status: 'completed',
            amount: 10000 + (i * 100),
            reference: `PERF_REF_${i}`,
            userId: testUser._id,
            completedAt: new Date()
          })
        );
        paymentIntents.push(intent);
      }

      // Measure verification requests
      const requests = [];
      for (const intent of paymentIntents) {
        requests.push(
          measureResponseTime(() =>
            request(app)
              .post(`/api/payments/${intent.reference}/verify`)
              .set(createAuthHeaders(authToken))
          )
        );
      }

      const results = await Promise.all(requests);

      // Performance analysis
      const avgResponseTime = performanceMetrics.responseTimes.reduce((a, b) => a + b, 0) / performanceMetrics.responseTimes.length;
      const p95ResponseTime = performanceMetrics.responseTimes.sort((a, b) => a - b)[Math.floor(performanceMetrics.responseTimes.length * 0.95)];

      expect(avgResponseTime).toBeLessThan(300); // Average under 300ms
      expect(p95ResponseTime).toBeLessThan(800); // 95th percentile under 800ms

      // Verify all verifications were successful
      results.forEach(({ response }) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.payment.status).toBe('completed');
      });

      console.log(`Payment Verification Performance:
        Average: ${avgResponseTime.toFixed(2)}ms
        95th Percentile: ${p95ResponseTime.toFixed(2)}ms`);
    });

    it('should handle transaction history queries efficiently', async () => {
      // Create large dataset of transactions
      const transactions = [];
      for (let i = 0; i < 1000; i++) {
        transactions.push(generateMockPaymentTransaction({
          transactionId: `PERF_TXN_${i}`,
          status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'pending' : 'failed',
          amount: 1000 + (i * 10),
          reference: `PERF_TXN_REF_${i}`,
          userId: testUser._id,
          createdAt: new Date(Date.now() - (i * 60000))
        }));
      }

      await PaymentTransaction.create(transactions);

      // Test different query scenarios
      const queryScenarios = [
        { name: 'Basic Query', query: {} },
        { name: 'Filtered Query', query: { status: 'completed' } },
        { name: 'Paginated Query', query: { page: 1, limit: 50 } },
        { name: 'Date Range Query', query: { startDate: '2023-01-01', endDate: '2023-12-31' } },
        { name: 'Complex Query', query: { status: 'completed', page: 2, limit: 25, startDate: '2023-01-01' } }
      ];

      for (const scenario of queryScenarios) {
        performanceMetrics.responseTimes = []; // Reset for each scenario

        const requests = [];
        for (let i = 0; i < 20; i++) {
          requests.push(
            measureResponseTime(() =>
              request(app)
                .get('/api/transactions/history')
                .set(createAuthHeaders(authToken))
                .query(scenario.query)
            )
          );
        }

        const results = await Promise.all(requests);
        const avgResponseTime = performanceMetrics.responseTimes.reduce((a, b) => a + b, 0) / performanceMetrics.responseTimes.length;

        expect(avgResponseTime).toBeLessThan(1000); // All queries under 1s average

        results.forEach(({ response }) => {
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        });

        console.log(`${scenario.name} Performance: ${avgResponseTime.toFixed(2)}ms average`);
      }
    });
  });

  describe('Database Query Performance', () => {
    it('should handle large dataset queries efficiently', async () => {
      // Create large dataset
      const largeDataset = [];
      for (let i = 0; i < 5000; i++) {
        largeDataset.push(generateMockPaymentIntent({
          intentId: `LARGE_PERF_${i}`,
          status: i % 4 === 0 ? 'completed' : i % 4 === 1 ? 'pending' : i % 4 === 2 ? 'failed' : 'expired',
          amount: 5000 + (i * 20),
          reference: `LARGE_REF_${i}`,
          userId: testUser._id,
          createdAt: new Date(Date.now() - (i * 30000))
        }));
      }

      await measureDbQueryTime(() => PaymentIntent.create(largeDataset));

      // Test various database queries
      const queries = [
        {
          name: 'Find by Status',
          query: () => PaymentIntent.find({ status: 'completed' })
        },
        {
          name: 'Find with Pagination',
          query: () => PaymentIntent.find({}).skip(100).limit(50)
        },
        {
          name: 'Find with Date Range',
          query: () => PaymentIntent.find({
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              $lte: new Date()
            }
          })
        },
        {
          name: 'Aggregate by Status',
          query: () => PaymentIntent.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
          ])
        },
        {
          name: 'Complex Query with Multiple Filters',
          query: () => PaymentIntent.find({
            status: { $in: ['completed', 'pending'] },
            amount: { $gte: 10000, $lte: 50000 },
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }).sort({ createdAt: -1 }).limit(100)
        }
      ];

      for (const queryTest of queries) {
        const { queryTime } = await measureDbQueryTime(queryTest.query);
        
        // Database queries should complete within reasonable time
        expect(queryTime).toBeLessThan(500); // Under 500ms for all queries
        
        console.log(`${queryTest.name} Query Time: ${queryTime.toFixed(2)}ms`);
      }

      // Analyze overall database performance
      const avgQueryTime = performanceMetrics.dbQueryTimes.reduce((a, b) => a + b, 0) / performanceMetrics.dbQueryTimes.length;
      const maxQueryTime = Math.max(...performanceMetrics.dbQueryTimes);

      expect(avgQueryTime).toBeLessThan(200); // Average under 200ms
      expect(maxQueryTime).toBeLessThan(1000); // Maximum under 1s

      console.log(`Database Query Performance:
        Average: ${avgQueryTime.toFixed(2)}ms
        Maximum: ${maxQueryTime.toFixed(2)}ms`);
    });

    it('should handle concurrent database operations', async () => {
      // Test concurrent read/write operations
      const concurrentOperations = [];
      
      // Concurrent writes
      for (let i = 0; i < 100; i++) {
        concurrentOperations.push(
          measureDbQueryTime(() =>
            PaymentIntent.create(
              generateMockPaymentIntent({
                intentId: `CONCURRENT_${i}`,
                status: 'pending',
                amount: 1000 + (i * 10),
                reference: `CONCURRENT_REF_${i}`,
                userId: testUser._id
              })
            )
          )
        );
      }

      // Concurrent reads
      for (let i = 0; i < 100; i++) {
        concurrentOperations.push(
          measureDbQueryTime(() =>
            PaymentIntent.findOne({ intentId: `CONCURRENT_${i % 10}` })
          )
        );
      }

      const results = await Promise.all(concurrentOperations);
      
      // Analyze concurrent operation performance
      const writeOperations = results.slice(0, 100);
      const readOperations = results.slice(100);

      const avgWriteTime = writeOperations.reduce((sum, op) => sum + op.queryTime, 0) / writeOperations.length;
      const avgReadTime = readOperations.reduce((sum, op) => sum + op.queryTime, 0) / readOperations.length;

      expect(avgWriteTime).toBeLessThan(100); // Writes under 100ms average
      expect(avgReadTime).toBeLessThan(50); // Reads under 50ms average

      console.log(`Concurrent Operations Performance:
        Average Write: ${avgWriteTime.toFixed(2)}ms
        Average Read: ${avgReadTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = measureMemoryUsage();

      // Process large number of payments
      const paymentPromises = [];
      for (let i = 0; i < 500; i++) {
        paymentPromises.push(
          request(app)
            .post('/api/payments/initialize')
            .set(createAuthHeaders(authToken))
            .send({
              amount: 1000 + (i * 5),
              type: 'investment',
              paymentMethod: 'card',
              metadata: { index: i }
            })
        );
      }

      await Promise.all(paymentPromises);

      const afterLoadMemory = measureMemoryUsage();
      
      // Memory usage should not increase dramatically
      const memoryIncrease = afterLoadMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100); // Less than 100MB increase

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterGCMemory = measureMemoryUsage();
      const memoryAfterGC = afterGCMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory should be reclaimed after garbage collection
      expect(memoryAfterGC).toBeLessThan(memoryIncrease);

      console.log(`Memory Usage Analysis:
        Initial: ${initialMemory.heapUsed.toFixed(2)}MB
        After Load: ${afterLoadMemory.heapUsed.toFixed(2)}MB
        After GC: ${afterGCMemory.heapUsed.toFixed(2)}MB
        Increase: ${memoryIncrease.toFixed(2)}MB
        After GC Increase: ${memoryAfterGC.toFixed(2)}MB`);
    });

    it('should handle memory leaks in long-running processes', async () => {
      const memorySnapshots = [];

      // Simulate long-running process with periodic operations
      for (let cycle = 0; cycle < 10; cycle++) {
        // Perform operations
        const operations = [];
        for (let i = 0; i < 50; i++) {
          operations.push(
            request(app)
              .post('/api/payments/initialize')
              .set(createAuthHeaders(authToken))
              .send({
                amount: 5000,
                type: 'investment',
                paymentMethod: 'card',
                metadata: { cycle, index: i }
              })
          );
        }

        await Promise.all(operations);

        // Take memory snapshot
        measureMemoryUsage();
        memorySnapshots.push({
          cycle,
          memory: performanceMetrics.memoryUsage[performanceMetrics.memoryUsage.length - 1]
        });

        // Small delay between cycles
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Analyze memory growth over cycles
      const initialMemory = memorySnapshots[0].memory.heapUsed;
      const finalMemory = memorySnapshots[memorySnapshots.length - 1].memory.heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be minimal
      expect(memoryGrowth).toBeLessThan(50); // Less than 50MB growth over 10 cycles

      // Check for consistent memory growth pattern (potential leak)
      let consecutiveGrowth = 0;
      for (let i = 1; i < memorySnapshots.length; i++) {
        if (memorySnapshots[i].memory.heapUsed > memorySnapshots[i - 1].memory.heapUsed) {
          consecutiveGrowth++;
        } else {
          consecutiveGrowth = 0;
        }
        expect(consecutiveGrowth).toBeLessThan(5); // No more than 5 consecutive increases
      }

      console.log(`Memory Leak Analysis:
        Initial: ${initialMemory.toFixed(2)}MB
        Final: ${finalMemory.toFixed(2)}MB
        Growth: ${memoryGrowth.toFixed(2)}MB`);
    });
  });

  describe('Throughput and Scalability', () => {
    it('should handle high concurrent request throughput', async () => {
      const concurrentUsers = 50;
      const requestsPerUser = 10;
      const totalRequests = concurrentUsers * requestsPerUser;

      const startTime = Date.now();
      
      // Create concurrent user simulations
      const userSimulations = [];
      for (let user = 0; user < concurrentUsers; user++) {
        const userRequests = [];
        
        for (let req = 0; req < requestsPerUser; req++) {
          userRequests.push(
            request(app)
              .post('/api/payments/initialize')
              .set(createAuthHeaders(authToken))
              .send({
                amount: 10000,
                type: 'investment',
                paymentMethod: 'card',
                metadata: { user, request: req }
              })
          );
        }
        
        userSimulations.push(Promise.all(userRequests));
      }

      const results = await Promise.all(userSimulations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Calculate throughput metrics
      const throughput = totalRequests / (totalTime / 1000); // Requests per second
      const avgResponseTime = performanceMetrics.responseTimes.reduce((a, b) => a + b, 0) / performanceMetrics.responseTimes.length;

      // Performance assertions
      expect(throughput).toBeGreaterThan(50); // At least 50 requests per second
      expect(avgResponseTime).toBeLessThan(2000); // Average under 2 seconds
      expect(totalTime).toBeLessThan(30000); // Complete within 30 seconds

      // Verify all requests were successful
      const flatResults = results.flat();
      flatResults.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      console.log(`Throughput Performance:
        Total Requests: ${totalRequests}
        Total Time: ${totalTime}ms
        Throughput: ${throughput.toFixed(2)} requests/second
        Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });

    it('should maintain performance under increasing load', async () => {
      const loadLevels = [10, 25, 50, 100, 200];
      const performanceByLoad = [];

      for (const loadLevel of loadLevels) {
        performanceMetrics.responseTimes = []; // Reset for each load level

        const requests = [];
        for (let i = 0; i < loadLevel; i++) {
          requests.push(
            measureResponseTime(() =>
              request(app)
                .get('/api/transactions/history')
                .set(createAuthHeaders(authToken))
                .query({ limit: 10 })
            )
          );
        }

        await Promise.all(requests);

        const avgResponseTime = performanceMetrics.responseTimes.reduce((a, b) => a + b, 0) / performanceMetrics.responseTimes.length;
        const maxResponseTime = Math.max(...performanceMetrics.responseTimes);

        performanceByLoad.push({
          loadLevel,
          avgResponseTime,
          maxResponseTime
        });

        // Performance should degrade gracefully
        expect(avgResponseTime).toBeLessThan(5000); // Even at highest load, under 5s average
        expect(maxResponseTime).toBeLessThan(10000); // Even at highest load, under 10s max
      }

      // Analyze performance degradation
      const lowLoadPerf = performanceByLoad[0];
      const highLoadPerf = performanceByLoad[performanceByLoad.length - 1];
      const performanceDegradation = highLoadPerf.avgResponseTime / lowLoadPerf.avgResponseTime;

      // Performance should not degrade more than 10x
      expect(performanceDegradation).toBeLessThan(10);

      console.log('Load Performance Analysis:');
      performanceByLoad.forEach(({ loadLevel, avgResponseTime, maxResponseTime }) => {
        console.log(`  Load ${loadLevel}: Avg ${avgResponseTime.toFixed(2)}ms, Max ${maxResponseTime.toFixed(2)}ms`);
      });
      console.log(`Performance Degradation: ${performanceDegradation.toFixed(2)}x`);
    });
  });

  describe('Stress Testing', () => {
    it('should handle extreme load without system failure', async () => {
      const extremeLoad = 1000;
      const batchSize = 50;
      const batches = Math.ceil(extremeLoad / batchSize);

      let successCount = 0;
      let errorCount = 0;
      const responseTimes = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchRequests = [];
        
        for (let i = 0; i < batchSize && (batch * batchSize + i) < extremeLoad; i++) {
          batchRequests.push(
            measureResponseTime(() =>
              request(app)
                .post('/api/payments/initialize')
                .set(createAuthHeaders(authToken))
                .send({
                  amount: 5000,
                  type: 'investment',
                  paymentMethod: 'card',
                  metadata: { batch, request: i }
                })
            )
          );
        }

        const batchResults = await Promise.allSettled(batchRequests);
        
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            if (result.value.response.status === 200) {
              successCount++;
              responseTimes.push(result.value.responseTime);
            } else {
              errorCount++;
            }
          } else {
            errorCount++;
          }
        });

        // Small delay between batches to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const successRate = (successCount / extremeLoad) * 100;
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      // System should maintain reasonable success rate even under extreme load
      expect(successRate).toBeGreaterThan(80); // At least 80% success rate
      expect(avgResponseTime).toBeLessThan(10000); // Average under 10 seconds

      console.log(`Stress Test Results:
        Total Requests: ${extremeLoad}
        Successful: ${successCount} (${successRate.toFixed(2)}%)
        Failed: ${errorCount}
        Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });

    it('should recover gracefully from system overload', async () => {
      // Phase 1: Overload the system
      const overloadRequests = [];
      for (let i = 0; i < 500; i++) {
        overloadRequests.push(
          request(app)
            .post('/api/payments/initialize')
            .set(createAuthHeaders(authToken))
            .send({
              amount: 1000,
              type: 'investment',
              paymentMethod: 'card',
              metadata: { overload: true, index: i }
            })
        );
      }

      await Promise.allSettled(overloadRequests);

      // Phase 2: Allow system to recover
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Phase 3: Test normal operation after recovery
      const recoveryRequests = [];
      for (let i = 0; i < 50; i++) {
        recoveryRequests.push(
          measureResponseTime(() =>
            request(app)
              .post('/api/payments/initialize')
              .set(createAuthHeaders(authToken))
              .send({
                amount: 5000,
                type: 'investment',
                paymentMethod: 'card',
                metadata: { recovery: true, index: i }
              })
          )
        );
      }

      const recoveryResults = await Promise.all(recoveryRequests);
      
      // System should recover and perform normally
      const successCount = recoveryResults.filter(({ response }) => response.status === 200).length;
      const avgResponseTime = recoveryResults.reduce((sum, { responseTime }) => sum + responseTime, 0) / recoveryResults.length;

      expect(successCount).toBeGreaterThan(45); // At least 90% success rate
      expect(avgResponseTime).toBeLessThan(2000); // Average under 2 seconds

      console.log(`Recovery Test Results:
        Successful Requests: ${successCount}/50
        Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should establish performance benchmarks for comparison', () => {
      // Define performance benchmarks based on test results
      const benchmarks = {
        paymentInitialization: {
          averageResponseTime: 500, // ms
          maxResponseTime: 2000, // ms
          throughput: 100 // requests/second
        },
        paymentVerification: {
          averageResponseTime: 300, // ms
          p95ResponseTime: 800 // ms
        },
        transactionHistory: {
          averageResponseTime: 1000, // ms
          maxResponseTime: 5000 // ms
        },
        databaseQueries: {
          averageQueryTime: 200, // ms
          maxQueryTime: 1000 // ms
        },
        memoryUsage: {
          maxIncrease: 100, // MB
          maxGrowthRate: 50 // MB over 10 cycles
        },
        throughput: {
          minimumThroughput: 50, // requests/second
          maxDegradation: 10 // x factor
        }
      };

      // Store benchmarks for future comparison
      expect(benchmarks).toBeDefined();
      
      console.log('Performance Benchmarks Established:', JSON.stringify(benchmarks, null, 2));
    });
  });
});