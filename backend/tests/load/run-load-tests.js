/**
 * Load Testing Runner for Boosty Platform Backend
 *
 * This script executes load test scenarios and generates comprehensive reports
 * to validate performance improvements through query optimization and caching.
 */

import { performance } from 'perf_hooks';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import configurations and utilities
import testScenarios from './load-test.config.js';
import {
  PerformanceMetrics,
  AuthHelper,
  TestDataGenerator,
  Randomizer,
  HttpRequestHelper,
  CacheMonitor,
} from './load-test-utilities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class LoadTestRunner {
  constructor() {
    this.baseURL = 'http://localhost:7000';
    this.results = {
      timestamp: new Date().toISOString(),
      scenarios: {},
      summary: {},
      comparison: {},
    };
    this.authHelper = new AuthHelper(this.baseURL);
    this.testDataGenerator = new TestDataGenerator();
    this.globalMetrics = new PerformanceMetrics();
  }

  async runScenario(scenarioName, config) {
    console.log(`\n🚀 Starting load test scenario: ${scenarioName}`);
    console.log(`📊 Configuration: ${JSON.stringify(config.phases)}`);

    const scenarioMetrics = new PerformanceMetrics();
    const scenarioResults = {
      name: scenarioName,
      config: config,
      startTime: new Date().toISOString(),
      endTime: null,
      metrics: {},
      errors: [],
      requests: [],
    };

    try {
      scenarioMetrics.startTest();

      // Execute each phase
      for (let i = 0; i < config.phases.length; i++) {
        const phase = config.phases[i];
        console.log(
          `\n⏱️  Phase ${i + 1}: ${phase.duration}s at ${phase.arrivalRate} requests/sec`
        );

        await this.executePhase(
          phase,
          config.scenarios,
          scenarioMetrics,
          scenarioResults
        );

        // Brief pause between phases
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      scenarioMetrics.endTest();
      scenarioResults.endTime = new Date().toISOString();
      scenarioResults.metrics = scenarioMetrics.getStatistics();

      console.log(`✅ Scenario '${scenarioName}' completed successfully`);
      console.log(
        `📈 Success Rate: ${scenarioResults.metrics.successRate.toFixed(2)}%`
      );
      console.log(
        `⚡ Average Response Time: ${scenarioResults.metrics.averageResponseTime.toFixed(2)}ms`
      );
      console.log(
        `💾 Cache Hit Rate: ${scenarioResults.metrics.cacheHitRate.toFixed(2)}%`
      );
    } catch (error) {
      console.error(`❌ Scenario '${scenarioName}' failed:`, error.message);
      scenarioResults.errors.push({
        type: 'scenario_error',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return scenarioResults;
  }

  async executePhase(phase, scenarios, metrics, results) {
    const { duration, arrivalRate } = phase;
    const totalRequests = duration * arrivalRate;
    const interval = 1000 / arrivalRate;

    console.log(`🔄 Executing ${totalRequests} requests over ${duration}s`);

    const startTime = performance.now();
    const endTime = startTime + duration * 1000;
    let requestCount = 0;

    while (performance.now() < endTime && requestCount < totalRequests) {
      const promises = [];

      // Create batch of concurrent requests
      const batchSize = Math.min(arrivalRate, totalRequests - requestCount);

      for (let i = 0; i < batchSize; i++) {
        const scenario = this.selectWeightedScenario(scenarios);
        promises.push(this.executeScenarioFlow(scenario, metrics, results));
      }

      // Wait for batch to complete
      await Promise.allSettled(promises);
      requestCount += batchSize;

      // Wait for next interval
      if (performance.now() < endTime) {
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }
  }

  selectWeightedScenario(scenarios) {
    const totalWeight = scenarios.reduce(
      (sum, scenario) => sum + (scenario.weight || 1),
      0
    );
    let random = Math.random() * totalWeight;

    for (const scenario of scenarios) {
      random -= scenario.weight || 1;
      if (random <= 0) {
        return scenario;
      }
    }

    return scenarios[0];
  }

  async executeScenarioFlow(scenario, metrics, results) {
    const flowMetrics = new PerformanceMetrics();
    let authToken = null;

    try {
      for (const step of scenario.flow) {
        if (step.post) {
          // Handle POST request (typically login)
          const response = await this.makeRequest(
            'POST',
            step.post.url,
            step.post.json
          );

          if (step.post.capture) {
            for (const capture of step.post.capture) {
              if (
                capture.as === 'authToken' &&
                response.data &&
                response.data.token
              ) {
                authToken = response.data.token;
              }
            }
          }
        } else if (step.get) {
          // Handle GET request
          const headers = { ...step.get.headers };
          if (authToken && !headers.Authorization) {
            headers.Authorization = `Bearer ${authToken}`;
          }

          await this.makeRequest('GET', step.get.url, null, headers);
        } else if (step.think) {
          // Simulate user thinking time
          await new Promise((resolve) =>
            setTimeout(resolve, step.think * 1000)
          );
        }
      }
    } catch (error) {
      results.errors.push({
        scenario: scenario.name,
        type: 'flow_error',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async makeRequest(method, url, data = null, headers = {}) {
    const startTime = performance.now();
    let response;
    let error = null;

    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...headers,
        },
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      response = await fetch(`${this.baseURL}${url}`, options);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      let responseData;
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      const requestData = {
        url,
        method,
        statusCode: response.status,
        responseTime,
        success: response.ok,
        cacheHit: response.headers.get('X-Cache') === 'HIT',
        cacheMiss: response.headers.get('X-Cache') === 'MISS',
        dbQueries: parseInt(response.headers.get('X-DB-Queries') || '0'),
        timestamp: new Date().toISOString(),
      };

      this.globalMetrics.recordRequest(requestData);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${responseData?.message || response.statusText}`
        );
      }

      return { response, data: responseData, responseTime };
    } catch (err) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      error = err;

      const requestData = {
        url,
        method,
        error: err.message,
        responseTime,
        success: false,
        timestamp: new Date().toISOString(),
      };

      this.globalMetrics.recordRequest(requestData);
      throw err;
    }
  }

  async runAllTests() {
    console.log(
      '🎯 Starting comprehensive load testing for Boosty Platform Backend\n'
    );

    // Test scenarios to run
    const scenariosToRun = [
      'baseline',
      'moderate',
      'high',
      'stress',
      'withCaching',
      'withoutCaching',
    ];

    // Run each scenario
    for (const scenarioName of scenariosToRun) {
      if (testScenarios[scenarioName]) {
        const scenarioResult = await this.runScenario(
          scenarioName,
          testScenarios[scenarioName]
        );
        this.results.scenarios[scenarioName] = scenarioResult;

        // Brief pause between scenarios
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        console.warn(
          `⚠️  Scenario '${scenarioName}' not found in configuration`
        );
      }
    }

    // Generate comparison metrics
    this.generateComparisonMetrics();

    // Generate summary
    this.generateSummary();

    // Save results
    await this.saveResults();

    console.log('\n🎉 All load tests completed successfully!');
    console.log('📊 Results saved to reports directory');
  }

  generateComparisonMetrics() {
    console.log('\n📊 Generating comparison metrics...');

    const withCaching = this.results.scenarios.withCaching;
    const withoutCaching = this.results.scenarios.withoutCaching;

    if (withCaching && withoutCaching) {
      this.results.comparison = {
        caching: {
          averageResponseTimeImprovement: this.calculateImprovement(
            withoutCaching.metrics.averageResponseTime,
            withCaching.metrics.averageResponseTime
          ),
          p95ResponseTimeImprovement: this.calculateImprovement(
            withoutCaching.metrics.p95ResponseTime,
            withCaching.metrics.p95ResponseTime
          ),
          cacheHitRate: withCaching.metrics.cacheHitRate,
          dbQueryReduction: this.calculateImprovement(
            withoutCaching.metrics.totalDbQueries /
              withoutCaching.metrics.totalRequests,
            withCaching.metrics.totalDbQueries /
              withCaching.metrics.totalRequests
          ),
        },
      };
    }
  }

  calculateImprovement(baseline, optimized) {
    if (baseline === 0) return 0;
    return ((baseline - optimized) / baseline) * 100;
  }

  generateSummary() {
    console.log('\n📋 Generating test summary...');

    const scenarios = Object.values(this.results.scenarios);
    const totalRequests = scenarios.reduce(
      (sum, scenario) => sum + scenario.metrics.totalRequests,
      0
    );
    const totalSuccessful = scenarios.reduce(
      (sum, scenario) => sum + scenario.metrics.successfulRequests,
      0
    );
    const avgResponseTime =
      scenarios.reduce(
        (sum, scenario) => sum + scenario.metrics.averageResponseTime,
        0
      ) / scenarios.length;

    this.results.summary = {
      totalScenarios: scenarios.length,
      totalRequests,
      totalSuccessful,
      overallSuccessRate: (totalSuccessful / totalRequests) * 100,
      averageResponseTime: avgResponseTime,
      bestPerformingScenario: this.findBestPerformingScenario(scenarios),
      worstPerformingScenario: this.findWorstPerformingScenario(scenarios),
      recommendations: this.generateRecommendations(scenarios),
    };
  }

  findBestPerformingScenario(scenarios) {
    return scenarios.reduce((best, current) => {
      const bestScore =
        best.metrics.successRate * 0.5 +
        (1000 / best.metrics.averageResponseTime) * 0.5;
      const currentScore =
        current.metrics.successRate * 0.5 +
        (1000 / current.metrics.averageResponseTime) * 0.5;
      return currentScore > bestScore ? current : best;
    });
  }

  findWorstPerformingScenario(scenarios) {
    return scenarios.reduce((worst, current) => {
      const worstScore =
        worst.metrics.successRate * 0.5 +
        (1000 / worst.metrics.averageResponseTime) * 0.5;
      const currentScore =
        current.metrics.successRate * 0.5 +
        (1000 / current.metrics.averageResponseTime) * 0.5;
      return currentScore < worstScore ? current : worst;
    });
  }

  generateRecommendations(scenarios) {
    const recommendations = [];

    // Analyze response times
    const highResponseTimeScenarios = scenarios.filter(
      (s) => s.metrics.averageResponseTime > 1000
    );
    if (highResponseTimeScenarios.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message:
          'Consider optimizing slow endpoints. Average response times exceed 1000ms in some scenarios.',
        affectedScenarios: highResponseTimeScenarios.map((s) => s.name),
      });
    }

    // Analyze success rates
    const lowSuccessRateScenarios = scenarios.filter(
      (s) => s.metrics.successRate < 95
    );
    if (lowSuccessRateScenarios.length > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message:
          'Success rates below 95% detected. Investigate error handling and capacity planning.',
        affectedScenarios: lowSuccessRateScenarios.map((s) => s.name),
      });
    }

    // Analyze cache performance
    const lowCacheHitScenarios = scenarios.filter(
      (s) => s.metrics.cacheHitRate < 50 && s.name.includes('Caching')
    );
    if (lowCacheHitScenarios.length > 0) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        message:
          'Cache hit rates are low. Consider adjusting cache TTL or cache key strategies.',
        affectedScenarios: lowCacheHitScenarios.map((s) => s.name),
      });
    }

    return recommendations;
  }

  async saveResults() {
    console.log('\n💾 Saving test results...');

    // Ensure reports directory exists
    const reportsDir = join(__dirname, 'reports');
    try {
      await mkdir(reportsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Save JSON results
    const jsonResultsPath = join(
      reportsDir,
      `load-test-results-${Date.now()}.json`
    );
    await writeFile(jsonResultsPath, JSON.stringify(this.results, null, 2));

    // Save HTML report
    const htmlReportPath = join(
      reportsDir,
      `load-test-report-${Date.now()}.html`
    );
    const htmlContent = this.generateHTMLReport();
    await writeFile(htmlReportPath, htmlContent);

    console.log(`📄 JSON results saved to: ${jsonResultsPath}`);
    console.log(`🌐 HTML report saved to: ${htmlReportPath}`);
  }

  generateHTMLReport() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Boosty Platform - Load Test Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; }
        h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { background: #ecf0f1; padding: 15px; border-radius: 5px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #2c3e50; }
        .summary-card .value { font-size: 24px; font-weight: bold; color: #3498db; }
        .scenario-section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .metrics-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .metrics-table th, .metrics-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .metrics-table th { background-color: #3498db; color: white; }
        .chart-container { margin: 20px 0; height: 400px; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .recommendations h3 { color: #856404; margin-top: 0; }
        .recommendation-item { margin: 10px 0; padding: 10px; background: white; border-radius: 3px; }
        .high { border-left: 4px solid #e74c3c; }
        .medium { border-left: 4px solid #f39c12; }
        .low { border-left: 4px solid #27ae60; }
        .timestamp { text-align: center; color: #7f8c8d; font-size: 14px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Boosty Platform - Load Test Report</h1>
        
        <div class="timestamp">
            Generated on: ${new Date().toLocaleString()}
        </div>
        
        <h2>📊 Executive Summary</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <h3>Total Scenarios</h3>
                <div class="value">${this.results.summary.totalScenarios}</div>
            </div>
            <div class="summary-card">
                <h3>Total Requests</h3>
                <div class="value">${this.results.summary.totalRequests.toLocaleString()}</div>
            </div>
            <div class="summary-card">
                <h3>Success Rate</h3>
                <div class="value">${this.results.summary.overallSuccessRate.toFixed(2)}%</div>
            </div>
            <div class="summary-card">
                <h3>Avg Response Time</h3>
                <div class="value">${this.results.summary.averageResponseTime.toFixed(0)}ms</div>
            </div>
        </div>
        
        <h2>📈 Performance Comparison</h2>
        <div class="chart-container">
            <canvas id="responseTimeChart"></canvas>
        </div>
        
        <div class="chart-container">
            <canvas id="successRateChart"></canvas>
        </div>
        
        ${
          this.results.comparison.caching
            ? `
        <h2>💾 Caching Impact Analysis</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <h3>Response Time Improvement</h3>
                <div class="value">${this.results.comparison.caching.averageResponseTimeImprovement.toFixed(1)}%</div>
            </div>
            <div class="summary-card">
                <h3>P95 Response Time Improvement</h3>
                <div class="value">${this.results.comparison.caching.p95ResponseTimeImprovement.toFixed(1)}%</div>
            </div>
            <div class="summary-card">
                <h3>Cache Hit Rate</h3>
                <div class="value">${this.results.comparison.caching.cacheHitRate.toFixed(1)}%</div>
            </div>
            <div class="summary-card">
                <h3>DB Query Reduction</h3>
                <div class="value">${this.results.comparison.caching.dbQueryReduction.toFixed(1)}%</div>
            </div>
        </div>
        `
            : ''
        }
        
        <h2>🔍 Scenario Details</h2>
        ${Object.values(this.results.scenarios)
          .map(
            (scenario) => `
        <div class="scenario-section">
            <h3>${scenario.name}</h3>
            <table class="metrics-table">
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Total Requests</td>
                    <td>${scenario.metrics.totalRequests.toLocaleString()}</td>
                </tr>
                <tr>
                    <td>Successful Requests</td>
                    <td>${scenario.metrics.successfulRequests.toLocaleString()}</td>
                </tr>
                <tr>
                    <td>Success Rate</td>
                    <td>${scenario.metrics.successRate.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Average Response Time</td>
                    <td>${scenario.metrics.averageResponseTime.toFixed(2)}ms</td>
                </tr>
                <tr>
                    <td>Min Response Time</td>
                    <td>${scenario.metrics.minResponseTime.toFixed(2)}ms</td>
                </tr>
                <tr>
                    <td>Max Response Time</td>
                    <td>${scenario.metrics.maxResponseTime.toFixed(2)}ms</td>
                </tr>
                <tr>
                    <td>P95 Response Time</td>
                    <td>${scenario.metrics.p95ResponseTime.toFixed(2)}ms</td>
                </tr>
                <tr>
                    <td>P99 Response Time</td>
                    <td>${scenario.metrics.p99ResponseTime.toFixed(2)}ms</td>
                </tr>
                <tr>
                    <td>Cache Hit Rate</td>
                    <td>${scenario.metrics.cacheHitRate.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Total DB Queries</td>
                    <td>${scenario.metrics.totalDbQueries.toLocaleString()}</td>
                </tr>
                <tr>
                    <td>Test Duration</td>
                    <td>${(scenario.metrics.testDuration / 1000).toFixed(2)}s</td>
                </tr>
            </table>
        </div>
        `
          )
          .join('')}
        
        ${
          this.results.summary.recommendations.length > 0
            ? `
        <h2>💡 Recommendations</h2>
        <div class="recommendations">
            <h3>Performance Optimization Suggestions</h3>
            ${this.results.summary.recommendations
              .map(
                (rec) => `
            <div class="recommendation-item ${rec.priority}">
                <strong>${rec.type.toUpperCase()} - ${rec.priority.toUpperCase()}:</strong> ${rec.message}
                <br><em>Affected scenarios: ${rec.affectedScenarios.join(', ')}</em>
            </div>
            `
              )
              .join('')}
        </div>
        `
            : ''
        }
    </div>
    
    <script>
        // Response Time Chart
        const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
        new Chart(responseTimeCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(Object.keys(this.results.scenarios))},
                datasets: [{
                    label: 'Average Response Time (ms)',
                    data: ${JSON.stringify(Object.values(this.results.scenarios).map((s) => s.metrics.averageResponseTime.toFixed(2)))},
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }, {
                    label: 'P95 Response Time (ms)',
                    data: ${JSON.stringify(Object.values(this.results.scenarios).map((s) => s.metrics.p95ResponseTime.toFixed(2)))},
                    backgroundColor: 'rgba(231, 76, 60, 0.6)',
                    borderColor: 'rgba(231, 76, 60, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Response Time (ms)'
                        }
                    }
                }
            }
        });
        
        // Success Rate Chart
        const successRateCtx = document.getElementById('successRateChart').getContext('2d');
        new Chart(successRateCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(Object.keys(this.results.scenarios))},
                datasets: [{
                    label: 'Success Rate (%)',
                    data: ${JSON.stringify(Object.values(this.results.scenarios).map((s) => s.metrics.successRate.toFixed(2)))},
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Success Rate (%)'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;
  }
}

// Main execution
async function main() {
  const runner = new LoadTestRunner();

  try {
    await runner.runAllTests();
  } catch (error) {
    console.error('💥 Load testing failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default LoadTestRunner;
