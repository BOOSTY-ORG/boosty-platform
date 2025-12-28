/**
 * Performance Monitoring System Integration
 *
 * This module integrates all performance monitoring components and provides
 * a unified interface for the monitoring system.
 */

import performanceCollector from './performance-collector.js';
import alertingService from './alerting.service.js';
import performanceAnalytics from './performance-analytics.js';
import performanceDashboard from './performance-dashboard.js';
import monitoringConfig from '../config/monitoring.config.js';
import logger from '../helpers/logger.js';

class PerformanceMonitoringSystem {
  constructor() {
    this.isInitialized = false;
    this.isRunning = false;
  }

  /**
   * Initialize the performance monitoring system
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Performance monitoring system is already initialized');
      return;
    }

    try {
      logger.info('Initializing performance monitoring system...');

      // Initialize alerting service
      await alertingService.initialize();

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      logger.info('Performance monitoring system initialized successfully');
    } catch (error) {
      logger.error(
        'Failed to initialize performance monitoring system:',
        error
      );
      throw error;
    }
  }

  /**
   * Start the performance monitoring system
   */
  async start() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isRunning) {
      logger.warn('Performance monitoring system is already running');
      return;
    }

    try {
      logger.info('Starting performance monitoring system...');

      // Start performance collector
      performanceCollector.start();

      // Start dashboard if enabled
      if (monitoringConfig.dashboard.enabled) {
        await performanceDashboard.start();
      }

      this.isRunning = true;
      logger.info('Performance monitoring system started successfully');
    } catch (error) {
      logger.error('Failed to start performance monitoring system:', error);
      throw error;
    }
  }

  /**
   * Stop the performance monitoring system
   */
  async stop() {
    if (!this.isRunning) {
      logger.warn('Performance monitoring system is not running');
      return;
    }

    try {
      logger.info('Stopping performance monitoring system...');

      // Stop performance collector
      performanceCollector.stop();

      // Stop dashboard
      await performanceDashboard.stop();

      // Shutdown alerting service
      await alertingService.shutdown();

      this.isRunning = false;
      logger.info('Performance monitoring system stopped successfully');
    } catch (error) {
      logger.error('Failed to stop performance monitoring system:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners between components
   */
  setupEventListeners() {
    // Listen to performance collector alerts and forward to alerting service
    performanceCollector.on('alert', (alert) => {
      alertingService.processAlert(alert);
    });

    // Listen to alerting service events
    alertingService.on('alertProcessed', (alert) => {
      logger.debug(`Alert processed: ${alert.message}`);
    });

    alertingService.on('alertError', ({ alert, error }) => {
      logger.error(`Alert processing error: ${error.message}`, { alert });
    });

    logger.debug('Performance monitoring event listeners setup complete');
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      collector: {
        running: performanceCollector.isRunning,
        metricsCount: this.getMetricsCount(),
      },
      dashboard: {
        running: performanceDashboard.isRunning,
        port: performanceDashboard.port,
        url: `http://localhost:${performanceDashboard.port}`,
      },
      alerting: {
        initialized: alertingService.isInitialized,
        statistics: alertingService.getAlertStatistics(),
      },
      config: {
        enabled: monitoringConfig.enabled,
        debug: monitoringConfig.debug,
        intervals: monitoringConfig.intervals,
        thresholds: monitoringConfig.thresholds,
      },
    };
  }

  /**
   * Get metrics count
   */
  getMetricsCount() {
    const metrics = performanceCollector.getMetricsSnapshot();
    let count = 0;

    const countArray = (arr) => (Array.isArray(arr) ? arr.length : 0);

    count += countArray(metrics.system.cpu);
    count += countArray(metrics.system.memory);
    count += countArray(metrics.system.eventLoopLag);
    count += countArray(metrics.database.queryTimes);
    count += countArray(metrics.database.slowQueries);
    count += countArray(metrics.redis.responseTime);
    count += countArray(metrics.api.responseTimes);
    count += countArray(metrics.alerts);

    return count;
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport() {
    const metrics = performanceCollector.getMetricsSnapshot();
    return performanceAnalytics.generatePerformanceReport(metrics);
  }

  /**
   * Test the monitoring system
   */
  async testSystem() {
    logger.info('Testing performance monitoring system...');

    const testResults = {
      collector: false,
      alerting: false,
      dashboard: false,
      analytics: false,
    };

    try {
      // Test collector
      const summary = performanceCollector.getPerformanceSummary();
      testResults.collector = !!summary;

      // Test alerting
      const alertTest = await alertingService.testNotificationChannels();
      testResults.alerting = alertTest.success;

      // Test dashboard
      testResults.dashboard = performanceDashboard.isRunning;

      // Test analytics
      const report = this.generateReport();
      testResults.analytics = !!report;

      logger.info('Performance monitoring system test results:', testResults);
      return testResults;
    } catch (error) {
      logger.error('Performance monitoring system test failed:', error);
      return testResults;
    }
  }

  /**
   * Get performance recommendations
   */
  getRecommendations() {
    const metrics = performanceCollector.getMetricsSnapshot();
    const bottlenecks = performanceAnalytics.detectBottlenecks(metrics);
    const regressions = performanceAnalytics.detectRegression(metrics);

    return performanceAnalytics.generateRecommendations(
      metrics,
      bottlenecks,
      regressions
    );
  }

  /**
   * Get health check
   */
  async healthCheck() {
    try {
      const status = this.getSystemStatus();
      const summary = performanceCollector.getPerformanceSummary();

      // Calculate overall health
      let healthScore = 100;

      if (!status.initialized) healthScore -= 50;
      if (!status.running) healthScore -= 30;
      if (!status.collector.running) healthScore -= 20;
      if (!status.alerting.initialized) healthScore -= 10;

      const health = {
        status:
          healthScore >= 90
            ? 'healthy'
            : healthScore >= 70
              ? 'degraded'
              : 'unhealthy',
        score: Math.max(0, healthScore),
        details: status,
        summary,
        timestamp: new Date().toISOString(),
      };

      return health;
    } catch (error) {
      logger.error('Performance monitoring health check failed:', error);
      return {
        status: 'unhealthy',
        score: 0,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Create and export singleton instance
const performanceMonitoringSystem = new PerformanceMonitoringSystem();

// Auto-start if enabled
if (monitoringConfig.enabled && process.env.NODE_ENV !== 'test') {
  performanceMonitoringSystem.start().catch((error) => {
    logger.error('Failed to auto-start performance monitoring:', error);
  });
}

export default performanceMonitoringSystem;
