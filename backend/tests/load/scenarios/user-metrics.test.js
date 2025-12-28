/**
 * User Metrics Load Test Scenario
 *
 * This file contains specific load testing scenarios for the user metrics endpoint
 * to validate performance improvements through query optimization and caching.
 */

import { performance } from 'perf_hooks';

class UserMetricsTest {
  constructor() {
    this.baseURL = 'http://localhost:7000';
    this.endpoint = '/api/metrics/user';
    this.authToken = null;
  }

  async authenticate() {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'loadtest@boosty.com',
          password: 'LoadTest123!',
        }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      this.authToken = data.token;
      return this.authToken;
    } catch (error) {
      console.error('Authentication error:', error.message);
      throw error;
    }
  }

  async testUserMetrics(options = {}) {
    const {
      concurrentUsers = 10,
      totalRequests = 100,
      duration = 30,
      withCaching = true,
      testVariations = [],
    } = options;

    console.log(`\n🚀 Testing User Metrics Endpoint`);
    console.log(
      `📊 Configuration: ${concurrentUsers} concurrent users, ${totalRequests} total requests`
    );
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`💾 Caching: ${withCaching ? 'Enabled' : 'Disabled'}`);

    const results = {
      endpoint: this.endpoint,
      configuration: options,
      startTime: new Date().toISOString(),
      endTime: null,
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: [],
        errors: [],
        cacheHits: 0,
        cacheMisses: 0,
        dbQueries: 0,
      },
    };

    try {
      // Authenticate first
      if (!this.authToken) {
        await this.authenticate();
      }

      const startTime = performance.now();
      const endTime = startTime + duration * 1000;
      const interval = (duration * 1000) / totalRequests;

      console.log(`\n🔄 Starting load test...`);

      const promises = [];

      // Create concurrent request batches
      for (let i = 0; i < totalRequests; i++) {
        const requestDelay = i * interval;
        const promise = this.makeRequest(
          requestDelay,
          withCaching,
          testVariations
        );
        promises.push(promise);
      }

      // Wait for all requests to complete
      const requestResults = await Promise.allSettled(promises);

      // Process results
      for (const result of requestResults) {
        if (result.status === 'fulfilled') {
          results.metrics.totalRequests++;

          if (result.value.success) {
            results.metrics.successfulRequests++;
            results.metrics.responseTimes.push(result.value.responseTime);

            if (result.value.cacheHit) {
              results.metrics.cacheHits++;
            }

            if (result.value.cacheMiss) {
              results.metrics.cacheMisses++;
            }

            results.metrics.dbQueries += result.value.dbQueries || 0;
          } else {
            results.metrics.failedRequests++;
            results.metrics.errors.push(result.value.error);
          }
        } else {
          results.metrics.totalRequests++;
          results.metrics.failedRequests++;
          results.metrics.errors.push(result.reason.message);
        }
      }

      results.endTime = new Date().toISOString();

      // Calculate statistics
      const responseTimes = results.metrics.responseTimes;
      if (responseTimes.length > 0) {
        responseTimes.sort((a, b) => a - b);
        const p95Index = Math.floor(responseTimes.length * 0.95);
        const p99Index = Math.floor(responseTimes.length * 0.99);

        results.metrics.statistics = {
          averageResponseTime:
            responseTimes.reduce((sum, time) => sum + time, 0) /
            responseTimes.length,
          minResponseTime: Math.min(...responseTimes),
          maxResponseTime: Math.max(...responseTimes),
          p95ResponseTime: responseTimes[p95Index] || 0,
          p99ResponseTime: responseTimes[p99Index] || 0,
          successRate:
            (results.metrics.successfulRequests /
              results.metrics.totalRequests) *
            100,
          cacheHitRate:
            (results.metrics.cacheHits /
              (results.metrics.cacheHits + results.metrics.cacheMisses)) *
              100 || 0,
          avgDbQueriesPerRequest:
            results.metrics.dbQueries / results.metrics.successfulRequests || 0,
        };
      }

      console.log(`\n✅ User Metrics test completed`);
      console.log(
        `📈 Success Rate: ${results.metrics.statistics?.successRate.toFixed(2)}%`
      );
      console.log(
        `⚡ Average Response Time: ${results.metrics.statistics?.averageResponseTime.toFixed(2)}ms`
      );
      console.log(
        `💾 Cache Hit Rate: ${results.metrics.statistics?.cacheHitRate.toFixed(2)}%`
      );
      console.log(
        `🗄️  Avg DB Queries: ${results.metrics.statistics?.avgDbQueriesPerRequest.toFixed(2)}`
      );

      return results;
    } catch (error) {
      console.error(`❌ User Metrics test failed:`, error.message);
      results.metrics.errors.push({
        type: 'test_error',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async makeRequest(delay = 0, withCaching = true, variations = []) {
    // Wait for the specified delay
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const startTime = performance.now();
    let response;
    let error = null;

    try {
      // Build request URL with variations
      let url = this.endpoint;
      const params = new URLSearchParams();

      // Add random variations to simulate real-world usage
      if (variations.length > 0) {
        const variation =
          variations[Math.floor(Math.random() * variations.length)];
        Object.keys(variation).forEach((key) => {
          if (variation[key] !== null && variation[key] !== undefined) {
            params.append(key, variation[key]);
          }
        });
      }

      if (params.toString()) {
        url += '?' + params.toString();
      }

      const headers = {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      // Add cache control headers
      if (withCaching) {
        headers['X-Cache-Enabled'] = 'true';
      } else {
        headers['X-Cache-Disabled'] = 'true';
      }

      response = await fetch(`${this.baseURL}${url}`, {
        method: 'GET',
        headers,
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const result = {
        success: response.ok,
        responseTime,
        statusCode: response.status,
        cacheHit: response.headers.get('X-Cache') === 'HIT',
        cacheMiss: response.headers.get('X-Cache') === 'MISS',
        dbQueries: parseInt(response.headers.get('X-DB-Queries') || '0'),
        url,
        timestamp: new Date().toISOString(),
      };

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        result.error = {
          statusCode: response.status,
          message: errorData.message || response.statusText,
        };
      }

      return result;
    } catch (err) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      error = err;

      return {
        success: false,
        responseTime,
        error: {
          type: 'network_error',
          message: err.message,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async runComparisonTests() {
    console.log('\n🔄 Running comparison tests for User Metrics...');

    // Test variations that simulate real-world usage patterns
    const testVariations = [
      { period: '7d', groupBy: 'day' },
      { period: '30d', groupBy: 'week' },
      { period: '90d', groupBy: 'month' },
      { period: '7d', groupBy: 'day', includeKycStatus: 'true' },
      { period: '30d', groupBy: 'week', includeKycStatus: 'true' },
      { period: '7d', groupBy: 'day', userType: 'investor' },
      { period: '30d', groupBy: 'week', userType: 'admin' },
      { period: '7d', groupBy: 'day', kycStatus: 'verified' },
      { period: '30d', groupBy: 'week', refreshCache: 'true' },
    ];

    // Test with caching
    console.log('\n💾 Testing with caching enabled...');
    const withCachingResults = await this.testUserMetrics({
      concurrentUsers: 50,
      totalRequests: 500,
      duration: 30,
      withCaching: true,
      testVariations,
    });

    // Wait a bit between tests
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Test without caching
    console.log('\n🚫 Testing with caching disabled...');
    const withoutCachingResults = await this.testUserMetrics({
      concurrentUsers: 50,
      totalRequests: 500,
      duration: 30,
      withCaching: false,
      testVariations,
    });

    // Calculate comparison metrics
    const comparison = {
      caching: {
        averageResponseTimeImprovement: this.calculateImprovement(
          withoutCachingResults.metrics.statistics.averageResponseTime,
          withCachingResults.metrics.statistics.averageResponseTime
        ),
        p95ResponseTimeImprovement: this.calculateImprovement(
          withoutCachingResults.metrics.statistics.p95ResponseTime,
          withCachingResults.metrics.statistics.p95ResponseTime
        ),
        cacheHitRate: withCachingResults.metrics.statistics.cacheHitRate,
        dbQueryReduction: this.calculateImprovement(
          withoutCachingResults.metrics.statistics.avgDbQueriesPerRequest,
          withCachingResults.metrics.statistics.avgDbQueriesPerRequest
        ),
      },
    };

    console.log('\n📊 Comparison Results:');
    console.log(
      `📈 Response Time Improvement: ${comparison.caching.averageResponseTimeImprovement.toFixed(1)}%`
    );
    console.log(
      `🎯 P95 Response Time Improvement: ${comparison.caching.p95ResponseTimeImprovement.toFixed(1)}%`
    );
    console.log(
      `💾 Cache Hit Rate: ${comparison.caching.cacheHitRate.toFixed(1)}%`
    );
    console.log(
      `🗄️  DB Query Reduction: ${comparison.caching.dbQueryReduction.toFixed(1)}%`
    );

    return {
      withCaching: withCachingResults,
      withoutCaching: withoutCachingResults,
      comparison,
    };
  }

  calculateImprovement(baseline, optimized) {
    if (baseline === 0) return 0;
    return ((baseline - optimized) / baseline) * 100;
  }
}

// Export for use in other files
export default UserMetricsTest;

// Run if this file is executed directly
async function main() {
  const test = new UserMetricsTest();

  try {
    // Run comparison tests
    const results = await test.runComparisonTests();

    console.log('\n🎉 User Metrics load testing completed!');
    console.log('📄 Results available in the returned object');
  } catch (error) {
    console.error('💥 User Metrics load testing failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
