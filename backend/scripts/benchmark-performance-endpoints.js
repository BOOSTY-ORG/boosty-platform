/**
 * Performance Benchmarking Script for Performance Tracking API
 *
 * This script measures and benchmarks the performance of the optimized
 * performance tracking API endpoints to validate the improvements.
 */

import { performance } from 'perf_hooks';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:7000';
const RESULTS_FILE = path.join(
  __dirname,
  '../test-results/performance-benchmark-results.json'
);

// Test scenarios
const testScenarios = [
  {
    name: 'Dashboard Overview',
    endpoint: '/api/metrics/performance/dashboard/overview',
    method: 'GET',
    params: { timeRange: '1h' },
    expectedMaxTime: 100, // Target: <100ms
  },
  {
    name: 'Analytics Trends',
    endpoint: '/api/metrics/performance/analytics/trends',
    method: 'GET',
    params: { timeRange: '24h', metrics: 'system,api' },
    expectedMaxTime: 250, // Target: <250ms
  },
  {
    name: 'Analytics Bottlenecks',
    endpoint: '/api/metrics/performance/analytics/bottlenecks',
    method: 'GET',
    params: { severity: 'all', category: 'all' },
    expectedMaxTime: 250, // Target: <250ms
  },
  {
    name: 'Real-time Metrics Stream',
    endpoint: '/api/metrics/performance/realtime/metrics',
    method: 'GET',
    params: { interval: 5000 },
    expectedMaxTime: 100, // Target: <100ms for connection setup
    isStreaming: true,
  },
  {
    name: 'Configuration',
    endpoint: '/api/metrics/performance/configuration/summary',
    method: 'GET',
    params: {},
    expectedMaxTime: 80, // Target: <80ms
  },
];

// Concurrent load test scenarios
const loadTestScenarios = [
  {
    name: 'Dashboard Concurrent Load',
    endpoint: '/api/metrics/performance/dashboard/overview',
    method: 'GET',
    params: { timeRange: '1h' },
    concurrentRequests: 20,
    expectedSuccessRate: 95, // Target: >95% success rate
  },
  {
    name: 'Analytics Concurrent Load',
    endpoint: '/api/metrics/performance/analytics/trends',
    method: 'GET',
    params: { timeRange: '24h', metrics: 'system,api' },
    concurrentRequests: 10,
    expectedSuccessRate: 85, // Target: >85% success rate
  },
];

/**
 * Make a single API request and measure response time
 */
async function makeRequest(endpoint, method = 'GET', params = null) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();

    const url = new URL(endpoint, API_BASE_URL);

    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 7000,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;

          try {
            const response = JSON.parse(data);
            resolve({
              responseTime,
              statusCode: res.statusCode,
              success: response.success !== false,
              response,
            });
          } catch (parseError) {
            resolve({
              responseTime,
              statusCode: res.statusCode,
              success: false,
              error: 'Invalid JSON response',
            });
          }
        });
      }
    );

    req.on('error', (error) => {
      const endTime = performance.now();
      reject({
        responseTime: endTime - startTime,
        error: error.message,
        success: false,
      });
    });

    req.setTimeout(10000); // 10 second timeout
    req.end();
  });
}

/**
 * Run a single test scenario
 */
async function runTestScenario(scenario) {
  console.log(`Running test: ${scenario.name}`);

  const results = {
    name: scenario.name,
    endpoint: scenario.endpoint,
    method: scenario.method,
    params: scenario.params,
    samples: [],
    averageTime: 0,
    minTime: Infinity,
    maxTime: 0,
    successRate: 0,
    errors: [],
  };

  // Run multiple samples for better accuracy
  const sampleCount = 10;

  for (let i = 0; i < sampleCount; i++) {
    try {
      const result = await makeRequest(
        scenario.endpoint,
        scenario.method,
        scenario.params
      );
      results.samples.push(result.responseTime);
      results.minTime = Math.min(results.minTime, result.responseTime);
      results.maxTime = Math.max(results.maxTime, result.responseTime);

      if (result.success) {
        results.successRate++;
      } else {
        results.errors.push(result.error || 'Unknown error');
      }

      // Add delay between requests
      if (i < sampleCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms between requests
      }
    } catch (error) {
      results.errors.push(error.message);
      console.error(`Error in sample ${i + 1}:`, error.message);
    }
  }

  // Calculate statistics
  results.averageTime =
    results.samples.reduce((sum, time) => sum + time, 0) /
    results.samples.length;
  results.successRate = (results.successRate / sampleCount) * 100;

  // Determine if test passed performance targets
  results.passed = results.averageTime <= scenario.expectedMaxTime;
  if (scenario.isStreaming) {
    // For streaming endpoints, we measure connection setup time
    results.passed = results.maxTime <= scenario.expectedMaxTime;
  }

  return results;
}

/**
 * Run a concurrent load test scenario
 */
async function runLoadTestScenario(scenario) {
  console.log(`Running load test: ${scenario.name}`);

  const results = {
    name: scenario.name,
    endpoint: scenario.endpoint,
    method: scenario.method,
    params: scenario.params,
    concurrentRequests: scenario.concurrentRequests,
    samples: [],
    averageTime: 0,
    minTime: Infinity,
    maxTime: 0,
    successRate: 0,
    errors: [],
  };

  // Create concurrent requests
  const promises = [];
  for (let i = 0; i < scenario.concurrentRequests; i++) {
    promises.push(
      makeRequest(scenario.endpoint, scenario.method, scenario.params)
    );
  }

  // Wait for all requests to complete
  const requestResults = await Promise.allSettled(promises);

  // Process results
  requestResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const responseTime = result.value.responseTime;
      results.samples.push(responseTime);
      results.minTime = Math.min(results.minTime, responseTime);
      results.maxTime = Math.max(results.maxTime, responseTime);

      if (result.value.success) {
        results.successRate++;
      } else {
        results.errors.push(result.value.error || 'Unknown error');
      }
    } else {
      results.errors.push(result.reason || 'Request failed');
    }
  });

  // Calculate statistics
  if (results.samples.length > 0) {
    results.averageTime =
      results.samples.reduce((sum, time) => sum + time, 0) /
      results.samples.length;
  }
  results.successRate =
    (results.successRate / scenario.concurrentRequests) * 100;

  // Determine if test passed performance targets
  results.passed =
    results.averageTime <= scenario.expectedMaxTime &&
    results.successRate >= scenario.expectedSuccessRate;

  return results;
}

/**
 * Generate performance report
 */
function generateReport(testResults, loadTestResults) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: testResults.length + loadTestResults.length,
      passedTests:
        testResults.filter((r) => r.passed).length +
        loadTestResults.filter((r) => r.passed).length,
      failedTests:
        testResults.filter((r) => !r.passed).length +
        loadTestResults.filter((r) => !r.passed).length,
    },
    testResults,
    loadTestResults,
    recommendations: [],
  };

  // Generate recommendations based on results
  testResults.forEach((test) => {
    if (!test.passed) {
      if (test.averageTime > test.expectedMaxTime) {
        report.recommendations.push({
          type: 'performance',
          test: test.name,
          message: `Average response time (${test.averageTime.toFixed(2)}ms) exceeds target (${test.expectedMaxTime}ms). Consider optimizing query performance or adding caching.`,
        });
      }
    }
  });

  loadTestResults.forEach((test) => {
    if (!test.passed) {
      if (test.successRate < test.expectedSuccessRate) {
        report.recommendations.push({
          type: 'reliability',
          test: test.name,
          message: `Success rate (${test.successRate.toFixed(1)}%) is below target (${test.expectedSuccessRate}%). Consider implementing connection pooling or reducing request processing time.`,
        });
      }
    }
  });

  return report;
}

/**
 * Main execution function
 */
async function main() {
  console.log('Starting Performance Tracking API Benchmark Tests...');

  try {
    // Ensure results directory exists
    const resultsDir = path.dirname(RESULTS_FILE);
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Run individual test scenarios
    const testResults = [];
    for (const scenario of testScenarios) {
      const result = await runTestScenario(scenario);
      testResults.push(result);

      console.log(
        `  ${scenario.name}: ${result.passed ? 'PASSED' : 'FAILED'} - Avg: ${result.averageTime.toFixed(2)}ms, Success Rate: ${result.successRate.toFixed(1)}%`
      );
    }

    // Run load test scenarios
    const loadTestResults = [];
    for (const scenario of loadTestScenarios) {
      const result = await runLoadTestScenario(scenario);
      loadTestResults.push(result);

      console.log(
        `  ${scenario.name}: ${result.passed ? 'PASSED' : 'FAILED'} - Avg: ${result.averageTime.toFixed(2)}ms, Success Rate: ${result.successRate.toFixed(1)}%`
      );
    }

    // Generate and save report
    const report = generateReport(testResults, loadTestResults);
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(report, null, 2));

    console.log('\nBenchmark Results Summary:');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests}`);
    console.log(`Failed: ${report.summary.failedTests}`);
    console.log(`\nDetailed results saved to: ${RESULTS_FILE}`);

    if (report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      report.recommendations.forEach((rec) => {
        console.log(
          `- [${rec.type.toUpperCase()}] ${rec.test}: ${rec.message}`
        );
      });
    }

    // Exit with appropriate code
    process.exit(report.summary.failedTests > 0 ? 1 : 0);
  } catch (error) {
    console.error('Benchmark execution failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export default {
  runTestScenario,
  runLoadTestScenario,
  generateReport,
};
