/**
 * Performance Monitoring Middleware
 *
 * This middleware provides performance monitoring capabilities including:
 * - Request/response time tracking
 * - Database query monitoring
 * - Memory and CPU monitoring
 * - Error tracking
 * - API endpoint performance analysis
 */

import { performance, setImmediate } from 'timers';
import crypto from 'crypto';
import performanceCollector from '../../monitoring/performance-collector.js';
import alertingService from '../../monitoring/alerting.service.js';
import monitoringConfig from '../../config/monitoring.config.js';
import logger from '../../helpers/logger.js';

/**
 * Middleware to track API request performance
 */
export const trackRequestPerformance = (req, res, next) => {
  // Skip monitoring for excluded endpoints
  if (shouldSkipEndpoint(req.path)) {
    return next();
  }

  // Generate unique request ID
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Record start time
  const startTime = performance.now();
  const startMemory = process.memoryUsage();

  // Log request start
  logger.debug(`Request started: ${req.method} ${req.path}`, {
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    // Calculate response time
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    const endMemory = process.memoryUsage();

    // Record metrics
    performanceCollector.recordApiEndpoint(
      req.method,
      req.path,
      responseTime,
      res.statusCode
    );

    // Log request completion
    logger.debug(`Request completed: ${req.method} ${req.path}`, {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: responseTime.toFixed(2),
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      },
    });

    // Check for slow requests and trigger alerts if needed
    if (responseTime > monitoringConfig.thresholds.responseTime.critical) {
      const alert = {
        id: `slow-request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        metric: 'slowRequest',
        value: responseTime,
        threshold: monitoringConfig.thresholds.responseTime.critical,
        level: 'critical',
        timestamp: Date.now(),
        message: `Slow request detected: ${req.method} ${req.path} took ${responseTime.toFixed(2)}ms`,
        context: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          requestId,
        },
      };

      alertingService.processAlert(alert);
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware to monitor database query performance
 */
export const trackDatabasePerformance = () => {
  return (req, res, next) => {
    // Store original database methods if they exist
    if (req.db && !req.db._performanceWrapped) {
      wrapDatabaseMethods(req.db);
      req.db._performanceWrapped = true;
    }

    next();
  };
};

/**
 * Middleware to monitor memory and CPU usage
 */
export const trackSystemResources = (req, res, next) => {
  // Get current system metrics
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  // Add system metrics to request object for potential use
  req.systemMetrics = {
    memory: {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    timestamp: Date.now(),
  };

  // Check for high memory usage
  const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (memoryPercent > monitoringConfig.thresholds.memoryUsage.critical) {
    const alert = {
      id: `high-memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      metric: 'memory',
      value: memoryPercent,
      threshold: monitoringConfig.thresholds.memoryUsage.critical,
      level: 'critical',
      timestamp: Date.now(),
      message: `High memory usage detected: ${memoryPercent.toFixed(2)}%`,
      context: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        path: req.path,
        method: req.method,
      },
    };

    alertingService.processAlert(alert);
  }

  next();
};

/**
 * Middleware to track errors and exceptions
 */
export const trackErrors = (err, req, res, next) => {
  // Record error metrics
  const errorInfo = {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500,
    path: req.path,
    method: req.method,
    requestId: req.requestId,
    timestamp: Date.now(),
  };

  logger.error('Request error:', errorInfo);

  // Check for high error rates
  const metrics = performanceCollector.getMetricsSnapshot();
  const errorRate =
    metrics.api.requestCount > 0
      ? (metrics.api.errorCount / metrics.api.requestCount) * 100
      : 0;

  if (errorRate > monitoringConfig.thresholds.errorRate.critical) {
    const alert = {
      id: `high-error-rate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      metric: 'errorRate',
      value: errorRate,
      threshold: monitoringConfig.thresholds.errorRate.critical,
      level: 'critical',
      timestamp: Date.now(),
      message: `High error rate detected: ${errorRate.toFixed(2)}%`,
      context: {
        currentError: errorInfo,
        totalErrors: metrics.api.errorCount,
        totalRequests: metrics.api.requestCount,
      },
    };

    alertingService.processAlert(alert);
  }

  // Pass error to next error handler
  next(err);
};

/**
 * Middleware to monitor concurrent requests
 */
export const trackConcurrentRequests = (() => {
  let concurrentRequests = 0;
  const maxConcurrentRequests = 100; // Configurable threshold

  return (req, res, next) => {
    concurrentRequests++;

    // Log concurrent request count
    logger.debug(`Concurrent requests: ${concurrentRequests}`);

    // Check for too many concurrent requests
    if (concurrentRequests > maxConcurrentRequests) {
      const alert = {
        id: `high-concurrency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        metric: 'concurrentRequests',
        value: concurrentRequests,
        threshold: maxConcurrentRequests,
        level: 'warning',
        timestamp: Date.now(),
        message: `High number of concurrent requests: ${concurrentRequests}`,
        context: {
          path: req.path,
          method: req.method,
        },
      };

      alertingService.processAlert(alert);
    }

    // Decrement counter when response finishes
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
      concurrentRequests--;
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
})();

/**
 * Middleware to monitor response size
 */
export const trackResponseSize = (req, res, next) => {
  let responseSize = 0;

  // Hook into res.write to track response size
  const originalWrite = res.write;
  res.write = function (chunk, encoding) {
    if (chunk) {
      responseSize += Buffer.byteLength(chunk, encoding);
    }
    return originalWrite.call(this, chunk, encoding);
  };

  // Hook into res.end to finalize tracking
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    if (chunk) {
      responseSize += Buffer.byteLength(chunk, encoding);
    }

    // Log large responses
    if (responseSize > 1024 * 1024) {
      // 1MB
      logger.warn('Large response detected', {
        path: req.path,
        method: req.method,
        responseSize,
        requestId: req.requestId,
      });
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Combined performance monitoring middleware
 */
export const performanceMonitoring = [
  trackRequestPerformance,
  trackDatabasePerformance(),
  trackSystemResources,
  trackConcurrentRequests,
  trackResponseSize,
];

/**
 * Check if endpoint should be skipped from monitoring
 */
function shouldSkipEndpoint(path) {
  return monitoringConfig.api.excludeEndpoints.some((excluded) => {
    if (excluded.includes('*')) {
      const regex = new RegExp(excluded.replace(/\*/g, '.*'));
      return regex.test(path);
    }
    return path === excluded;
  });
}

/**
 * Wrap database methods to track performance
 */
function wrapDatabaseMethods(db) {
  // This is a placeholder implementation
  // In a real application, you would wrap the actual database methods
  // For example, if using Mongoose:

  /*
  const originalExec = mongoose.Query.prototype.exec;
  mongoose.Query.prototype.exec = function() {
    const startTime = performance.now();
    const operation = this.op;
    const collection = this.model.collection.name;
    
    return originalExec.call(this).then(result => {
      const queryTime = performance.now() - startTime;
      performanceCollector.recordDatabaseQuery(operation, collection, queryTime, true);
      return result;
    }).catch(error => {
      const queryTime = performance.now() - startTime;
      performanceCollector.recordDatabaseQuery(operation, collection, queryTime, false);
      throw error;
    });
  };
  */

  logger.debug('Database performance tracking enabled');
}

/**
 * Middleware to add performance headers to responses
 */
export const addPerformanceHeaders = (req, res, next) => {
  // Add performance monitoring headers
  res.setHeader('X-Performance-Monitoring', 'enabled');
  res.setHeader('X-Monitoring-Version', '1.0.0');

  next();
};

/**
 * Middleware to sample requests for monitoring
 */
export const sampleRequests = (
  sampleRate = monitoringConfig.api.sampleRate
) => {
  return (req, res, next) => {
    // Skip sampling if sample rate is 100%
    if (sampleRate >= 1.0) {
      return next();
    }

    // Random sampling based on sample rate
    if (Math.random() > sampleRate) {
      // Add header to indicate request was not sampled
      res.setHeader('X-Performance-Sampled', 'false');

      // Skip performance tracking for this request
      req.skipPerformanceTracking = true;
    } else {
      res.setHeader('X-Performance-Sampled', 'true');
    }

    next();
  };
};

/**
 * Middleware to track custom metrics
 */
export const trackCustomMetrics = (metricName, getValue) => {
  return (req, res, next) => {
    try {
      const value = getValue(req, res);
      performanceCollector.addMetric('custom', metricName, value);
    } catch (error) {
      logger.error(`Error tracking custom metric ${metricName}:`, error);
    }

    next();
  };
};

/**
 * Middleware to monitor event loop lag
 */
export const trackEventLoopLag = (req, res, next) => {
  const start = performance.now();

  // Use setImmediate to measure event loop lag
  setImmediate(() => {
    const lag = performance.now() - start;
    performanceCollector.addMetric('system', 'eventLoopLag', lag);

    // Check for high event loop lag
    if (lag > monitoringConfig.thresholds.eventLoopLag.critical) {
      const alert = {
        id: `event-loop-lag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        metric: 'eventLoopLag',
        value: lag,
        threshold: monitoringConfig.thresholds.eventLoopLag.critical,
        level: 'critical',
        timestamp: Date.now(),
        message: `High event loop lag detected: ${lag.toFixed(2)}ms`,
        context: {
          path: req.path,
          method: req.method,
        },
      };

      alertingService.processAlert(alert);
    }
  });

  next();
};

export default {
  trackRequestPerformance,
  trackDatabasePerformance,
  trackSystemResources,
  trackErrors,
  trackConcurrentRequests,
  trackResponseSize,
  performanceMonitoring,
  addPerformanceHeaders,
  sampleRequests,
  trackCustomMetrics,
  trackEventLoopLag,
};
