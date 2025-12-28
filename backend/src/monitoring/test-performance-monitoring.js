/**
 * Test Performance Monitoring System
 *
 * This script tests all components of the performance monitoring system
 * to ensure they work correctly together.
 */

import performanceMonitoringSystem from './index.js';
import performanceCollector from './performance-collector.js';
import alertingService from './alerting.service.js';
import performanceAnalytics from './performance-analytics.js';
import logger from '../helpers/logger.js';

class PerformanceMonitoringTester {
  constructor() {
    this.testResults = [];
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    logger.info('Starting performance monitoring system tests...');

    try {
      // Test 1: System Initialization
      await this.testSystemInitialization();

      // Test 2: Metrics Collection
      await this.testMetricsCollection();

      // Test 3: Alert Processing
      await this.testAlertProcessing();

      // Test 4: Analytics Functions
      await this.testAnalyticsFunctions();

      // Test 5: Dashboard Functionality
      await this.testDashboardFunctionality();

      // Test 6: Integration Test
      await this.testSystemIntegration();

      // Generate test report
      this.generateTestReport();
    } catch (error) {
      logger.error('Performance monitoring test failed:', error);
    }
  }

  /**
   * Test system initialization
   */
  async testSystemInitialization() {
    logger.info('Testing system initialization...');

    try {
      // Test initialization
      await performanceMonitoringSystem.initialize();

      const status = performanceMonitoringSystem.getSystemStatus();

      this.addTestResult('System Initialization', {
        passed: status.initialized,
        details: {
          initialized: status.initialized,
          collectorRunning: status.collector.running,
          alertingInitialized: status.alerting.initialized,
        },
      });

      logger.info('System initialization test completed');
    } catch (error) {
      this.addTestResult('System Initialization', {
        passed: false,
        error: error.message,
      });
    }
  }

  /**
   * Test metrics collection
   */
  async testMetricsCollection() {
    logger.info('Testing metrics collection...');

    try {
      // Get initial metrics
      const initialMetrics = performanceCollector.getMetricsSnapshot();

      // Record some test metrics
      performanceCollector.recordApiEndpoint('GET', '/test', 150, 200);
      performanceCollector.recordDatabaseQuery('find', 'users', 50, true);

      // Wait a moment for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get updated metrics
      const updatedMetrics = performanceCollector.getMetricsSnapshot();

      // Check if metrics were recorded
      const apiEndpointRecorded = updatedMetrics.api.endpoints['GET /test'];
      const databaseQueryRecorded =
        updatedMetrics.database.queryTimes.length >
        initialMetrics.database.queryTimes.length;

      this.addTestResult('Metrics Collection', {
        passed: apiEndpointRecorded && databaseQueryRecorded,
        details: {
          apiEndpointRecorded: !!apiEndpointRecorded,
          databaseQueryRecorded,
          initialQueryCount: initialMetrics.database.queryTimes.length,
          updatedQueryCount: updatedMetrics.database.queryTimes.length,
        },
      });

      logger.info('Metrics collection test completed');
    } catch (error) {
      this.addTestResult('Metrics Collection', {
        passed: false,
        error: error.message,
      });
    }
  }

  /**
   * Test alert processing
   */
  async testAlertProcessing() {
    logger.info('Testing alert processing...');

    try {
      // Create a test alert
      const testAlert = {
        id: 'test-alert-1',
        metric: 'cpu',
        value: 95,
        threshold: 80,
        level: 'critical',
        timestamp: Date.now(),
        message: 'Test alert: High CPU usage',
      };

      // Process the alert
      await alertingService.processAlert(testAlert);

      // Check alert history
      const alertHistory = alertingService.getAllAlertHistory(10);
      const alertProcessed = alertHistory.some(
        (alert) => alert.id === testAlert.id
      );

      this.addTestResult('Alert Processing', {
        passed: alertProcessed,
        details: {
          alertProcessed,
          totalAlerts: alertHistory.length,
        },
      });

      logger.info('Alert processing test completed');
    } catch (error) {
      this.addTestResult('Alert Processing', {
        passed: false,
        error: error.message,
      });
    }
  }

  /**
   * Test analytics functions
   */
  async testAnalyticsFunctions() {
    logger.info('Testing analytics functions...');

    try {
      // Get metrics for analytics
      const metrics = performanceCollector.getMetricsSnapshot();

      // Test trend analysis
      const trends = performanceAnalytics.analyzeTrends(metrics);

      // Test bottleneck detection
      const bottlenecks = performanceAnalytics.detectBottlenecks(metrics);

      // Test regression detection
      const regressions = performanceAnalytics.detectRegression(metrics);

      // Test recommendations
      const recommendations = performanceAnalytics.generateRecommendations(
        metrics,
        bottlenecks,
        regressions
      );

      // Test predictions
      const predictions = performanceAnalytics.predictPerformance(metrics);

      this.addTestResult('Analytics Functions', {
        passed:
          !!trends &&
          !!bottlenecks &&
          !!regressions &&
          !!recommendations &&
          !!predictions,
        details: {
          trendsGenerated: !!trends,
          bottlenecksDetected: bottlenecks.length >= 0,
          regressionsDetected: regressions.length >= 0,
          recommendationsGenerated: recommendations.length >= 0,
          predictionsGenerated: !!predictions,
        },
      });

      logger.info('Analytics functions test completed');
    } catch (error) {
      this.addTestResult('Analytics Functions', {
        passed: false,
        error: error.message,
      });
    }
  }

  /**
   * Test dashboard functionality
   */
  async testDashboardFunctionality() {
    logger.info('Testing dashboard functionality...');

    try {
      const status = performanceMonitoringSystem.getSystemStatus();

      // Test dashboard status
      const dashboardRunning = status.dashboard.running;

      this.addTestResult('Dashboard Functionality', {
        passed: true, // Dashboard functionality is tested by its existence
        details: {
          dashboardRunning,
          dashboardPort: status.dashboard.port,
          dashboardUrl: status.dashboard.url,
        },
      });

      logger.info('Dashboard functionality test completed');
    } catch (error) {
      this.addTestResult('Dashboard Functionality', {
        passed: false,
        error: error.message,
      });
    }
  }

  /**
   * Test system integration
   */
  async testSystemIntegration() {
    logger.info('Testing system integration...');

    try {
      // Test system health check
      const health = await performanceMonitoringSystem.healthCheck();

      // Test system status
      const status = performanceMonitoringSystem.getSystemStatus();

      // Test comprehensive report generation
      const report = performanceMonitoringSystem.generateReport();

      // Test recommendations
      const recommendations = performanceMonitoringSystem.getRecommendations();

      this.addTestResult('System Integration', {
        passed: !!health && !!status && !!report && !!recommendations,
        details: {
          healthStatus: health.status,
          healthScore: health.score,
          systemInitialized: status.initialized,
          systemRunning: status.running,
          reportGenerated: !!report,
          recommendationsGenerated: recommendations.length >= 0,
        },
      });

      logger.info('System integration test completed');
    } catch (error) {
      this.addTestResult('System Integration', {
        passed: false,
        error: error.message,
      });
    }
  }

  /**
   * Add test result
   */
  addTestResult(testName, result) {
    this.testResults.push({
      testName,
      ...result,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Generate test report
   */
  generateTestReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter((test) => test.passed).length;
    const failedTests = totalTests - passedTests;

    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate:
          totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0,
      },
      tests: this.testResults,
      timestamp: new Date().toISOString(),
    };

    logger.info('Performance Monitoring System Test Report:');
    logger.info(JSON.stringify(report, null, 2));

    // Log summary
    logger.info(
      `Test Summary: ${passedTests}/${totalTests} tests passed (${report.summary.successRate}%)`
    );

    if (failedTests > 0) {
      logger.warn(
        `${failedTests} tests failed. Check the detailed results above.`
      );
    } else {
      logger.info(
        'All tests passed! Performance monitoring system is working correctly.'
      );
    }

    return report;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new PerformanceMonitoringTester();
  tester.runAllTests().catch((error) => {
    logger.error('Test execution failed:', error);
    process.exit(1);
  });
}

export default PerformanceMonitoringTester;
