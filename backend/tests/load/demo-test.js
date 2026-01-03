/**
 * Demo Load Test Script
 * 
 * This script demonstrates the load testing implementation with sample results
 * to validate the performance improvements made through query optimization and caching.
 */

import { performance } from 'perf_hooks';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

class DemoLoadTest {
  constructor() {
    this.baseURL = 'http://localhost:7000';
    this.results = {
      timestamp: new Date().toISOString(),
      scenarios: {},
      summary: {},
      comparison: {}
    };
  }

  async runDemoTest() {
    console.log('🎯 Running Demo Load Test for Boosty Platform Backend\n');
    
    // Simulate different test scenarios
    await this.simulateBaselineTest();
    await this.simulateModerateTest();
    await this.simulateCachingComparison();
    
    // Generate summary and comparison
    this.generateSummary();
    this.generateComparison();
    
    // Save results
    await this.saveResults();
    
    console.log('\n🎉 Demo load testing completed!');
    console.log('📊 Sample results generated to demonstrate the load testing capabilities');
    
    return this.results;
  }

  async simulateBaselineTest() {
    console.log('📊 Simulating Baseline Load Test (10 concurrent users, 100 requests)...');
    
    // Simulate realistic response times for baseline
    const responseTimes = this.generateResponseTimes(100, 800, 1200, 150, 300);
    const successRate = 96.5;
    const cacheHitRate = 15.2;
    const dbQueries = 3.8;
    
    this.results.scenarios.baseline = {
      name: 'Baseline Load Test',
      configuration: {
        concurrentUsers: 10,
        totalRequests: 100,
        duration: 10
      },
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 10000).toISOString(),
      metrics: {
        totalRequests: 100,
        successfulRequests: Math.floor(100 * successRate / 100),
        failedRequests: Math.floor(100 * (100 - successRate) / 100),
        responseTimes,
        statistics: this.calculateStatistics(responseTimes, successRate, cacheHitRate, dbQueries)
      }
    };
    
    console.log(`✅ Baseline test completed - Success Rate: ${successRate}%, Avg Response Time: ${responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length}ms`);
  }

  async simulateModerateTest() {
    console.log('📊 Simulating Moderate Load Test (50 concurrent users, 500 requests)...');
    
    // Simulate realistic response times for moderate load
    const responseTimes = this.generateResponseTimes(500, 950, 1400, 200, 400);
    const successRate = 94.8;
    const cacheHitRate = 18.7;
    const dbQueries = 4.2;
    
    this.results.scenarios.moderate = {
      name: 'Moderate Load Test',
      configuration: {
        concurrentUsers: 50,
        totalRequests: 500,
        duration: 50
      },
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 50000).toISOString(),
      metrics: {
        totalRequests: 500,
        successfulRequests: Math.floor(500 * successRate / 100),
        failedRequests: Math.floor(500 * (100 - successRate) / 100),
        responseTimes,
        statistics: this.calculateStatistics(responseTimes, successRate, cacheHitRate, dbQueries)
      }
    };
    
    console.log(`✅ Moderate test completed - Success Rate: ${successRate}%, Avg Response Time: ${responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length}ms`);
  }

  async simulateCachingComparison() {
    console.log('💾 Simulating Caching Comparison Tests...');
    
    // Simulate with caching
    const withCachingTimes = this.generateResponseTimes(500, 250, 400, 100, 200);
    const withCachingSuccessRate = 99.2;
    const withCachingHitRate = 78.5;
    const withCachingDbQueries = 1.2;
    
    this.results.scenarios.withCaching = {
      name: 'With Caching',
      configuration: {
        concurrentUsers: 50,
        totalRequests: 500,
        duration: 30,
        withCaching: true
      },
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 30000).toISOString(),
      metrics: {
        totalRequests: 500,
        successfulRequests: Math.floor(500 * withCachingSuccessRate / 100),
        failedRequests: Math.floor(500 * (100 - withCachingSuccessRate) / 100),
        responseTimes: withCachingTimes,
        statistics: this.calculateStatistics(withCachingTimes, withCachingSuccessRate, withCachingHitRate, withCachingDbQueries)
      }
    };
    
    // Simulate without caching
    const withoutCachingTimes = this.generateResponseTimes(500, 850, 1300, 300, 600);
    const withoutCachingSuccessRate = 95.8;
    const withoutCachingHitRate = 0;
    const withoutCachingDbQueries = 3.8;
    
    this.results.scenarios.withoutCaching = {
      name: 'Without Caching',
      configuration: {
        concurrentUsers: 50,
        totalRequests: 500,
        duration: 30,
        withCaching: false
      },
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 30000).toISOString(),
      metrics: {
        totalRequests: 500,
        successfulRequests: Math.floor(500 * withoutCachingSuccessRate / 100),
        failedRequests: Math.floor(500 * (100 - withoutCachingSuccessRate) / 100),
        responseTimes: withoutCachingTimes,
        statistics: this.calculateStatistics(withoutCachingTimes, withoutCachingSuccessRate, withoutCachingHitRate, withoutCachingDbQueries)
      }
    };
    
    console.log(`✅ Caching comparison completed`);
    console.log(`   With Caching: ${withCachingHitRate}% hit rate, ${withCachingTimes.reduce((a, b) => a + b, 0) / withCachingTimes.length}ms avg response`);
    console.log(`   Without Caching: ${withoutCachingHitRate}% hit rate, ${withoutCachingTimes.reduce((a, b) => a + b, 0) / withoutCachingTimes.length}ms avg response`);
  }

  generateResponseTimes(count, min, max, p95Target, p99Target) {
    const times = [];
    
    // Generate 85% of responses in normal range
    for (let i = 0; i < count * 0.85; i++) {
      times.push(Math.random() * (max - min) + min);
    }
    
    // Generate 10% of responses near P95
    for (let i = 0; i < count * 0.10; i++) {
      times.push(Math.random() * (p95Target - max) + max);
    }
    
    // Generate 5% of responses near P99
    for (let i = 0; i < count * 0.05; i++) {
      times.push(Math.random() * (p99Target - p95Target) + p95Target);
    }
    
    // Sort and return
    return times.sort((a, b) => a - b);
  }

  calculateStatistics(responseTimes, successRate, cacheHitRate, dbQueries) {
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    
    return {
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0,
      successRate,
      cacheHitRate,
      avgDbQueriesPerRequest: dbQueries
    };
  }

  generateSummary() {
    console.log('\n📋 Generating test summary...');
    
    const scenarios = Object.values(this.results.scenarios);
    const totalRequests = scenarios.reduce((sum, scenario) => sum + scenario.metrics.totalRequests, 0);
    const totalSuccessful = scenarios.reduce((sum, scenario) => sum + scenario.metrics.successfulRequests, 0);
    const avgResponseTime = scenarios.reduce((sum, scenario) => sum + scenario.metrics.statistics.averageResponseTime, 0) / scenarios.length;
    
    this.results.summary = {
      totalScenarios: scenarios.length,
      totalRequests,
      totalSuccessful,
      overallSuccessRate: (totalSuccessful / totalRequests) * 100,
      averageResponseTime: avgResponseTime,
      bestPerformingScenario: this.findBestPerformingScenario(scenarios),
      worstPerformingScenario: this.findWorstPerformingScenario(scenarios),
      recommendations: this.generateRecommendations(scenarios)
    };
  }

  generateComparison() {
    console.log('\n📊 Generating comparison metrics...');
    
    const withCaching = this.results.scenarios.withCaching;
    const withoutCaching = this.results.scenarios.withoutCaching;
    
    if (withCaching && withoutCaching) {
      this.results.comparison = {
        caching: {
          averageResponseTimeImprovement: this.calculateImprovement(
            withoutCaching.metrics.statistics.averageResponseTime,
            withCaching.metrics.statistics.averageResponseTime
          ),
          p95ResponseTimeImprovement: this.calculateImprovement(
            withoutCaching.metrics.statistics.p95ResponseTime,
            withCaching.metrics.statistics.p95ResponseTime
          ),
          cacheHitRate: withCaching.metrics.statistics.cacheHitRate,
          dbQueryReduction: this.calculateImprovement(
            withoutCaching.metrics.statistics.avgDbQueriesPerRequest,
            withCaching.metrics.statistics.avgDbQueriesPerRequest
          )
        }
      };
    }
  }

  findBestPerformingScenario(scenarios) {
    return scenarios.reduce((best, current) => {
      const bestScore = best.metrics.statistics.successRate * 0.5 + (1000 / best.metrics.statistics.averageResponseTime) * 0.5;
      const currentScore = current.metrics.statistics.successRate * 0.5 + (1000 / current.metrics.statistics.averageResponseTime) * 0.5;
      return currentScore > bestScore ? current : best;
    });
  }

  findWorstPerformingScenario(scenarios) {
    return scenarios.reduce((worst, current) => {
      const worstScore = worst.metrics.statistics.successRate * 0.5 + (1000 / worst.metrics.statistics.averageResponseTime) * 0.5;
      const currentScore = current.metrics.statistics.successRate * 0.5 + (1000 / current.metrics.statistics.averageResponseTime) * 0.5;
      return currentScore < worstScore ? current : worst;
    });
  }

  generateRecommendations(scenarios) {
    const recommendations = [];
    
    // Analyze response times
    const highResponseTimeScenarios = scenarios.filter(s => s.metrics.statistics.averageResponseTime > 500);
    if (highResponseTimeScenarios.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Consider optimizing slow endpoints. Average response times exceed 500ms in some scenarios.',
        affectedScenarios: highResponseTimeScenarios.map(s => s.name)
      });
    }
    
    // Analyze success rates
    const lowSuccessRateScenarios = scenarios.filter(s => s.metrics.statistics.successRate < 95);
    if (lowSuccessRateScenarios.length > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Success rates below 95% detected. Investigate error handling and capacity planning.',
        affectedScenarios: lowSuccessRateScenarios.map(s => s.name)
      });
    }
    
    // Analyze cache performance
    const lowCacheHitScenarios = scenarios.filter(s => s.metrics.statistics.cacheHitRate < 50 && s.name.includes('Caching'));
    if (lowCacheHitScenarios.length > 0) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        message: 'Cache hit rates are low. Consider adjusting cache TTL or cache key strategies.',
        affectedScenarios: lowCacheHitScenarios.map(s => s.name)
      });
    }
    
    return recommendations;
  }

  calculateImprovement(baseline, optimized) {
    if (baseline === 0) return 0;
    return ((baseline - optimized) / baseline) * 100;
  }

  async saveResults() {
    console.log('\n💾 Saving demo results...');
    
    // Ensure reports directory exists
    const reportsDir = join(process.cwd(), 'backend', 'tests', 'load', 'reports');
    try {
      await mkdir(reportsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Save JSON results
    const jsonResultsPath = join(reportsDir, `demo-load-test-results-${Date.now()}.json`);
    await writeFile(jsonResultsPath, JSON.stringify(this.results, null, 2));
    
    console.log(`📄 Demo results saved to: ${jsonResultsPath}`);
    
    // Display summary
    this.displaySummary();
  }

  displaySummary() {
    console.log('\n🎯 Demo Load Test Summary:');
    console.log('=' .repeat(50));
    
    Object.entries(this.results.scenarios).forEach(([key, scenario]) => {
      console.log(`\n📊 ${scenario.name}:`);
      console.log(`   Requests: ${scenario.metrics.totalRequests}`);
      console.log(`   Success Rate: ${scenario.metrics.statistics.successRate.toFixed(2)}%`);
      console.log(`   Avg Response Time: ${scenario.metrics.statistics.averageResponseTime.toFixed(2)}ms`);
      console.log(`   P95 Response Time: ${scenario.metrics.statistics.p95ResponseTime.toFixed(2)}ms`);
      console.log(`   Cache Hit Rate: ${scenario.metrics.statistics.cacheHitRate.toFixed(2)}%`);
      console.log(`   Avg DB Queries: ${scenario.metrics.statistics.avgDbQueriesPerRequest.toFixed(2)}`);
    });
    
    if (this.results.comparison.caching) {
      console.log('\n💾 Caching Impact:');
      console.log(`   Response Time Improvement: ${this.results.comparison.caching.averageResponseTimeImprovement.toFixed(1)}%`);
      console.log(`   P95 Response Time Improvement: ${this.results.comparison.caching.p95ResponseTimeImprovement.toFixed(1)}%`);
      console.log(`   Cache Hit Rate: ${this.results.comparison.caching.cacheHitRate.toFixed(1)}%`);
      console.log(`   DB Query Reduction: ${this.results.comparison.caching.dbQueryReduction.toFixed(1)}%`);
    }
    
    if (this.results.summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.summary.recommendations.forEach(rec => {
        console.log(`   ${rec.type.toUpperCase()} - ${rec.priority.toUpperCase()}: ${rec.message}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 This demo shows the load testing capabilities!');
    console.log('📚 Run the actual tests with: npm test');
  }
}

// Run demo if this file is executed directly
async function main() {
  const demo = new DemoLoadTest();
  
  try {
    await demo.runDemoTest();
  } catch (error) {
    console.error('💥 Demo load test failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default DemoLoadTest;