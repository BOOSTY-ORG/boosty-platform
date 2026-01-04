/**
 * Performance Metrics Collector
 *
 * This module collects various performance metrics including:
 * - System metrics (CPU, memory, event loop lag)
 * - Database query performance
 * - Redis performance
 * - API endpoint response times
 * - Error rates
 */

import os from 'os';
import { performance } from 'perf_hooks';
import { setImmediate } from 'timers';
import EventEmitter from 'events';
import monitoringConfig from '../config/monitoring.config.js';
import logger from '../helpers/logger.js';

class PerformanceCollector extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      system: {
        cpu: [],
        memory: [],
        eventLoopLag: [],
        uptime: 0,
      },
      database: {
        queryTimes: [],
        slowQueries: [],
        connectionCount: 0,
        operations: {},
      },
      redis: {
        hitRate: 0,
        responseTime: [],
        memory: {},
        operations: {},
      },
      api: {
        endpoints: {},
        responseTimes: [],
        errorRates: {},
        requestCount: 0,
        errorCount: 0,
      },
      alerts: [],
    };

    this.intervals = new Map();
    this.isRunning = false;
    this.lastAlertTime = new Map();
  }

  /**
   * Start the performance collector
   */
  start() {
    if (this.isRunning) {
      logger.warn('Performance collector is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting performance metrics collector');

    // Start collecting system metrics
    this.startSystemMetricsCollection();

    // Start collecting database metrics
    this.startDatabaseMetricsCollection();

    // Start collecting Redis metrics
    this.startRedisMetricsCollection();

    // Start alert checking
    this.startAlertChecking();

    // Start cleanup process
    this.startCleanupProcess();

    logger.info('Performance metrics collector started successfully');
  }

  /**
   * Stop the performance collector
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Performance collector is not running');
      return;
    }

    this.isRunning = false;

    // Clear all intervals
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
      logger.debug(`Stopped ${name} collection`);
    }
    this.intervals.clear();

    logger.info('Performance metrics collector stopped');
  }

  /**
   * Start collecting system metrics
   */
  startSystemMetricsCollection() {
    const interval = setInterval(() => {
      if (!this.isRunning) return;

      try {
        // CPU usage
        const cpuUsage = process.cpuUsage();
        const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to percentage

        // Memory usage
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memoryPercent = (usedMem / totalMem) * 100;

        // Event loop lag
        const start = performance.now();
        setImmediate(() => {
          const lag = performance.now() - start;
          this.addMetric('system', 'eventLoopLag', lag);
        });

        // Add metrics
        this.addMetric('system', 'cpu', cpuPercent);
        this.addMetric('system', 'memory', memoryPercent);
        this.metrics.system.uptime = process.uptime();

        // Emit system metrics event
        this.emit('systemMetrics', {
          cpu: cpuPercent,
          memory: memoryPercent,
          uptime: this.metrics.system.uptime,
        });
      } catch (error) {
        logger.error('Error collecting system metrics:', error);
      }
    }, monitoringConfig.intervals.systemMetrics);

    this.intervals.set('systemMetrics', interval);
  }

  /**
   * Start collecting database metrics
   */
  startDatabaseMetricsCollection() {
    if (!monitoringConfig.database.enabled) return;

    const interval = setInterval(() => {
      if (!this.isRunning) return;

      try {
        // This would be implemented based on your database connection
        // For now, we'll simulate with placeholder data
        const mockConnectionCount = Math.floor(Math.random() * 10) + 1;
        this.metrics.database.connectionCount = mockConnectionCount;

        // Emit database metrics event
        this.emit('databaseMetrics', {
          connectionCount: this.metrics.database.connectionCount,
          slowQueries: this.metrics.database.slowQueries.length,
        });
      } catch (error) {
        logger.error('Error collecting database metrics:', error);
      }
    }, monitoringConfig.intervals.databaseMetrics);

    this.intervals.set('databaseMetrics', interval);
  }

  /**
   * Start collecting Redis metrics
   */
  startRedisMetricsCollection() {
    if (!monitoringConfig.redis.enabled) return;

    const interval = setInterval(() => {
      if (!this.isRunning) return;

      try {
        // This would be implemented based on your Redis client
        // For now, we'll simulate with placeholder data
        const mockHitRate = 85 + Math.random() * 14; // 85-99%
        const mockResponseTime = Math.random() * 10; // 0-10ms

        this.metrics.redis.hitRate = mockHitRate;
        this.addMetric('redis', 'responseTime', mockResponseTime);

        // Emit Redis metrics event
        this.emit('redisMetrics', {
          hitRate: mockHitRate,
          responseTime: mockResponseTime,
        });
      } catch (error) {
        logger.error('Error collecting Redis metrics:', error);
      }
    }, monitoringConfig.intervals.databaseMetrics);

    this.intervals.set('redisMetrics', interval);
  }

  /**
   * Start alert checking
   */
  startAlertChecking() {
    const interval = setInterval(() => {
      if (!this.isRunning) return;

      try {
        this.checkThresholds();
      } catch (error) {
        logger.error('Error checking alerts:', error);
      }
    }, monitoringConfig.intervals.alertCheck);

    this.intervals.set('alertChecking', interval);
  }

  /**
   * Start cleanup process
   */
  startCleanupProcess() {
    const interval = setInterval(() => {
      if (!this.isRunning) return;

      try {
        this.cleanupOldMetrics();
      } catch (error) {
        logger.error('Error cleaning up old metrics:', error);
      }
    }, monitoringConfig.intervals.cleanup);

    this.intervals.set('cleanup', interval);
  }

  /**
   * Add a metric to the collection
   */
  addMetric(category, name, value, timestamp = Date.now()) {
    if (!this.metrics[category]) {
      this.metrics[category] = {};
    }

    if (!this.metrics[category][name]) {
      this.metrics[category][name] = [];
    }

    this.metrics[category][name].push({
      value,
      timestamp,
    });

    // Limit the number of stored metrics to prevent memory issues
    const maxMetrics = 1000;
    if (this.metrics[category][name].length > maxMetrics) {
      this.metrics[category][name] =
        this.metrics[category][name].slice(-maxMetrics);
    }
  }

  /**
   * Record API endpoint performance
   */
  recordApiEndpoint(method, path, responseTime, statusCode) {
    const endpointKey = `${method} ${path}`;

    if (!this.metrics.api.endpoints[endpointKey]) {
      this.metrics.api.endpoints[endpointKey] = {
        count: 0,
        totalResponseTime: 0,
        errors: 0,
        responseTimes: [],
      };
    }

    const endpoint = this.metrics.api.endpoints[endpointKey];
    endpoint.count++;
    endpoint.totalResponseTime += responseTime;
    endpoint.responseTimes.push(responseTime);

    if (statusCode >= 400) {
      endpoint.errors++;
      this.metrics.api.errorCount++;
    }

    this.metrics.api.requestCount++;
    this.addMetric('api', 'responseTimes', responseTime);

    // Limit response times array
    if (endpoint.responseTimes.length > 100) {
      endpoint.responseTimes = endpoint.responseTimes.slice(-100);
    }
  }

  /**
   * Record database query performance
   */
  recordDatabaseQuery(operation, collection, queryTime, success = true) {
    this.addMetric('database', 'queryTimes', queryTime);

    if (!success || queryTime > monitoringConfig.database.slowQueryThreshold) {
      this.metrics.database.slowQueries.push({
        operation,
        collection,
        queryTime,
        timestamp: Date.now(),
        success,
      });

      // Limit slow queries array
      if (this.metrics.database.slowQueries.length > 100) {
        this.metrics.database.slowQueries =
          this.metrics.database.slowQueries.slice(-100);
      }
    }

    // Track operation counts
    const opKey = `${operation}.${collection}`;
    if (!this.metrics.database.operations[opKey]) {
      this.metrics.database.operations[opKey] = 0;
    }
    this.metrics.database.operations[opKey]++;
  }

  /**
   * Check thresholds and trigger alerts
   */
  checkThresholds() {
    const thresholds = monitoringConfig.thresholds;

    // Check CPU usage
    const latestCpu = this.getLatestMetric('system', 'cpu');
    if (latestCpu) {
      this.checkThreshold('cpu', latestCpu, thresholds.cpuUsage);
    }

    // Check memory usage
    const latestMemory = this.getLatestMetric('system', 'memory');
    if (latestMemory) {
      this.checkThreshold('memory', latestMemory, thresholds.memoryUsage);
    }

    // Check event loop lag
    const latestEventLoop = this.getLatestMetric('system', 'eventLoopLag');
    if (latestEventLoop) {
      this.checkThreshold(
        'eventLoopLag',
        latestEventLoop,
        thresholds.eventLoopLag
      );
    }

    // Check Redis hit rate
    if (this.metrics.redis.hitRate > 0) {
      this.checkThreshold(
        'redisHitRate',
        this.metrics.redis.hitRate,
        {
          warning: thresholds.redis.hitRateWarning,
          critical: thresholds.redis.hitRateCritical,
        },
        true // Lower is worse for hit rate
      );
    }

    // Check error rate
    if (this.metrics.api.requestCount > 0) {
      const errorRate =
        (this.metrics.api.errorCount / this.metrics.api.requestCount) * 100;
      this.checkThreshold('errorRate', errorRate, thresholds.errorRate);
    }
  }

  /**
   * Check a specific threshold and trigger alert if needed
   */
  checkThreshold(metricName, value, thresholds, lowerIsWorse = false) {
    const alertLevel = this.getAlertLevel(value, thresholds, lowerIsWorse);
    if (!alertLevel) return;

    const alertKey = `${metricName}-${alertLevel}`;
    const now = Date.now();
    const cooldown = monitoringConfig.alerts.cooldown[alertLevel];

    // Check if we're still in cooldown period
    if (this.lastAlertTime.has(alertKey)) {
      const lastTime = this.lastAlertTime.get(alertKey);
      if (now - lastTime < cooldown) {
        return;
      }
    }

    // Create and emit alert
    const alert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      metric: metricName,
      value,
      threshold: thresholds[alertLevel],
      level: alertLevel,
      timestamp: now,
      message: this.getAlertMessage(
        metricName,
        value,
        thresholds,
        alertLevel,
        lowerIsWorse
      ),
    };

    this.metrics.alerts.push(alert);
    this.lastAlertTime.set(alertKey, now);

    // Limit alerts array
    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts = this.metrics.alerts.slice(-100);
    }

    this.emit('alert', alert);
    logger.warn(`Performance alert: ${alert.message}`);
  }

  /**
   * Get alert level based on value and thresholds
   */
  getAlertLevel(value, thresholds, lowerIsWorse) {
    if (lowerIsWorse) {
      if (value < thresholds.critical) return 'critical';
      if (value < thresholds.warning) return 'warning';
    } else {
      if (value > thresholds.critical) return 'critical';
      if (value > thresholds.warning) return 'warning';
    }
    return null;
  }

  /**
   * Generate alert message
   */
  getAlertMessage(metricName, value, thresholds, level, lowerIsWorse) {
    const comparison = lowerIsWorse ? 'below' : 'above';
    const operator = lowerIsWorse ? '<' : '>';
    return `${metricName} is ${comparison} ${level} threshold: ${value.toFixed(2)} ${operator} ${thresholds[level]}`;
  }

  /**
   * Get the latest metric value
   */
  getLatestMetric(category, name) {
    const metrics = this.metrics[category]?.[name];
    if (!metrics || metrics.length === 0) return null;
    return metrics[metrics.length - 1].value;
  }

  /**
   * Get average metric value over a time window
   */
  getAverageMetric(category, name, timeWindow = 300000) {
    // 5 minutes default
    const metrics = this.metrics[category]?.[name];
    if (!metrics || metrics.length === 0) return null;

    const now = Date.now();
    const windowStart = now - timeWindow;
    const recentMetrics = metrics.filter((m) => m.timestamp >= windowStart);

    if (recentMetrics.length === 0) return null;

    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / recentMetrics.length;
  }

  /**
   * Clean up old metrics based on retention policy
   */
  cleanupOldMetrics() {
    const now = Date.now();

    // Clean up system metrics
    this.cleanupMetricCategory(
      'system',
      now,
      monitoringConfig.retention.realtimeMetrics
    );

    // Clean up database metrics
    this.cleanupMetricCategory(
      'database',
      now,
      monitoringConfig.retention.realtimeMetrics
    );

    // Clean up Redis metrics
    this.cleanupMetricCategory(
      'redis',
      now,
      monitoringConfig.retention.realtimeMetrics
    );

    // Clean up API metrics
    this.cleanupMetricCategory(
      'api',
      now,
      monitoringConfig.retention.realtimeMetrics
    );

    // Clean up old alerts
    this.metrics.alerts = this.metrics.alerts.filter(
      (alert) => now - alert.timestamp < monitoringConfig.retention.alerts
    );
  }

  /**
   * Clean up a specific metric category
   */
  cleanupMetricCategory(category, now, maxAge) {
    if (!this.metrics[category]) return;

    for (const [name, metrics] of Object.entries(this.metrics[category])) {
      if (Array.isArray(metrics)) {
        this.metrics[category][name] = metrics.filter(
          (m) => now - m.timestamp < maxAge
        );
      }
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetricsSnapshot() {
    return JSON.parse(JSON.stringify(this.metrics));
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      system: {
        cpu: this.getLatestMetric('system', 'cpu'),
        memory: this.getLatestMetric('system', 'memory'),
        eventLoopLag: this.getLatestMetric('system', 'eventLoopLag'),
        uptime: this.metrics.system.uptime,
      },
      database: {
        avgQueryTime: this.getAverageMetric('database', 'queryTimes'),
        slowQueryCount: this.metrics.database.slowQueries.length,
        connectionCount: this.metrics.database.connectionCount,
      },
      redis: {
        hitRate: this.metrics.redis.hitRate,
        avgResponseTime: this.getAverageMetric('redis', 'responseTime'),
      },
      api: {
        avgResponseTime: this.getAverageMetric('api', 'responseTimes'),
        requestCount: this.metrics.api.requestCount,
        errorCount: this.metrics.api.errorCount,
        errorRate:
          this.metrics.api.requestCount > 0
            ? (this.metrics.api.errorCount / this.metrics.api.requestCount) *
              100
            : 0,
      },
      alerts: {
        total: this.metrics.alerts.length,
        recent: this.metrics.alerts.filter(
          (a) => Date.now() - a.timestamp < 3600000
        ).length, // Last hour
      },
    };

    return summary;
  }
}

// Create and export singleton instance
const performanceCollector = new PerformanceCollector();
export default performanceCollector;
