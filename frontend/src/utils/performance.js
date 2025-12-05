/**
 * Performance monitoring utilities for the financial dashboard
 * Provides tools for tracking component render times, API response times,
 * memory usage, and performance alerts.
 */

// Performance metrics storage
const performanceMetrics = {
  componentRenders: new Map(),
  apiCalls: new Map(),
  memoryUsage: [],
  renderTimes: new Map(),
};

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  SLOW_RENDER: 16, // ms (60fps)
  SLOW_API: 2000, // ms
  MEMORY_WARNING: 50 * 1024 * 1024, // 50MB
  CRITICAL_MEMORY: 100 * 1024 * 1024, // 100MB
};

/**
 * Track component render time
 */
export const trackComponentRender = (componentName, renderTime) => {
  if (!performanceMetrics.componentRenders.has(componentName)) {
    performanceMetrics.componentRenders.set(componentName, {
      count: 0,
      totalTime: 0,
      averageTime: 0,
      maxTime: 0,
      minTime: Infinity,
    });
  }

  const metrics = performanceMetrics.componentRenders.get(componentName);
  metrics.count++;
  metrics.totalTime += renderTime;
  metrics.averageTime = metrics.totalTime / metrics.count;
  metrics.maxTime = Math.max(metrics.maxTime, renderTime);
  metrics.minTime = Math.min(metrics.minTime, renderTime);

  // Log slow renders
  if (renderTime > PERFORMANCE_THRESHOLDS.SLOW_RENDER) {
    console.warn(
      `Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`
    );
  }

  return metrics;
};

/**
 * Track API call performance
 */
export const trackApiCall = (endpoint, startTime, endTime, success = true) => {
  const duration = endTime - startTime;

  if (!performanceMetrics.apiCalls.has(endpoint)) {
    performanceMetrics.apiCalls.set(endpoint, {
      count: 0,
      totalTime: 0,
      averageTime: 0,
      maxTime: 0,
      minTime: Infinity,
      successCount: 0,
      errorCount: 0,
    });
  }

  const metrics = performanceMetrics.apiCalls.get(endpoint);
  metrics.count++;
  metrics.totalTime += duration;
  metrics.averageTime = metrics.totalTime / metrics.count;
  metrics.maxTime = Math.max(metrics.maxTime, duration);
  metrics.minTime = Math.min(metrics.minTime, duration);

  if (success) {
    metrics.successCount++;
  } else {
    metrics.errorCount++;
  }

  // Log slow API calls
  if (duration > PERFORMANCE_THRESHOLDS.SLOW_API) {
    console.warn(`Slow API call: ${endpoint} took ${duration.toFixed(2)}ms`);
  }

  return metrics;
};

/**
 * Monitor memory usage
 */
export const trackMemoryUsage = () => {
  if (performance.memory) {
    const memoryInfo = {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
      timestamp: Date.now(),
    };

    performanceMetrics.memoryUsage.push(memoryInfo);

    // Keep only last 100 entries
    if (performanceMetrics.memoryUsage.length > 100) {
      performanceMetrics.memoryUsage.shift();
    }

    // Memory warnings
    if (memoryInfo.used > PERFORMANCE_THRESHOLDS.CRITICAL_MEMORY) {
      console.error(
        `Critical memory usage: ${(memoryInfo.used / 1024 / 1024).toFixed(2)}MB`
      );
    } else if (memoryInfo.used > PERFORMANCE_THRESHOLDS.MEMORY_WARNING) {
      console.warn(
        `High memory usage: ${(memoryInfo.used / 1024 / 1024).toFixed(2)}MB`
      );
    }

    return memoryInfo;
  }
  return null;
};

/**
 * Get performance metrics summary
 */
export const getPerformanceMetrics = () => {
  return {
    components: Object.fromEntries(performanceMetrics.componentRenders),
    apiCalls: Object.fromEntries(performanceMetrics.apiCalls),
    memory: performanceMetrics.memoryUsage.slice(-10), // Last 10 entries
    summary: {
      totalComponents: performanceMetrics.componentRenders.size,
      totalApiEndpoints: performanceMetrics.apiCalls.size,
      currentMemoryUsage: performance.memory
        ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
          }
        : null,
    },
  };
};

/**
 * Clear performance metrics
 */
export const clearPerformanceMetrics = () => {
  performanceMetrics.componentRenders.clear();
  performanceMetrics.apiCalls.clear();
  performanceMetrics.memoryUsage = [];
  performanceMetrics.renderTimes.clear();
};

/**
 * Performance monitoring HOC for React components
 */
export const withPerformanceTracking = (WrappedComponent, componentName) => {
  const TrackedComponent = (props) => {
    const renderStartTime = React.useRef(Date.now());

    React.useEffect(() => {
      const renderTime = Date.now() - renderStartTime.current;
      trackComponentRender(componentName || WrappedComponent.name, renderTime);
    });

    return <WrappedComponent {...props} />;
  };

  TrackedComponent.displayName = `withPerformanceTracking(${componentName || WrappedComponent.name})`;

  return TrackedComponent;
};

/**
 * API call wrapper with performance tracking
 */
export const withApiTracking = (apiCall, endpoint) => {
  return async (...args) => {
    const startTime = Date.now();
    let success = true;

    try {
      const result = await apiCall(...args);
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const endTime = Date.now();
      trackApiCall(endpoint, startTime, endTime, success);
    }
  };
};

/**
 * Performance alert system
 */
class PerformanceAlertSystem {
  constructor() {
    this.alerts = [];
    this.alertCallbacks = [];
  }

  addAlert(type, message, severity = "warning") {
    const alert = {
      id: Date.now(),
      type,
      message,
      severity,
      timestamp: new Date().toISOString(),
    };

    this.alerts.push(alert);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }

    // Notify callbacks
    this.alertCallbacks.forEach((callback) => callback(alert));

    return alert;
  }

  subscribe(callback) {
    this.alertCallbacks.push(callback);
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  getAlerts(severity = null) {
    if (severity) {
      return this.alerts.filter((alert) => alert.severity === severity);
    }
    return this.alerts;
  }

  clearAlerts() {
    this.alerts = [];
  }
}

export const performanceAlerts = new PerformanceAlertSystem();

/**
 * Automatic performance monitoring
 */
let monitoringInterval = null;

export const startPerformanceMonitoring = (intervalMs = 5000) => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }

  monitoringInterval = setInterval(() => {
    trackMemoryUsage();

    // Check for performance issues
    const metrics = getPerformanceMetrics();

    // Check for slow components
    Object.entries(metrics.components).forEach(([component, data]) => {
      if (data.averageTime > PERFORMANCE_THRESHOLDS.SLOW_RENDER) {
        performanceAlerts.addAlert(
          "slow_component",
          `Component ${component} has average render time of ${data.averageTime.toFixed(2)}ms`,
          "warning"
        );
      }
    });

    // Check for slow API calls
    Object.entries(metrics.apiCalls).forEach(([endpoint, data]) => {
      if (data.averageTime > PERFORMANCE_THRESHOLDS.SLOW_API) {
        performanceAlerts.addAlert(
          "slow_api",
          `API endpoint ${endpoint} has average response time of ${data.averageTime.toFixed(2)}ms`,
          "warning"
        );
      }
    });

    // Check memory usage
    if (metrics.summary.currentMemoryUsage) {
      const memoryUsagePercent =
        (metrics.summary.currentMemoryUsage.used /
          metrics.summary.currentMemoryUsage.limit) *
        100;
      if (memoryUsagePercent > 80) {
        performanceAlerts.addAlert(
          "high_memory",
          `Memory usage is at ${memoryUsagePercent.toFixed(1)}%`,
          "critical"
        );
      }
    }
  }, intervalMs);
};

export const stopPerformanceMonitoring = () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
};

/**
 * Performance reporting
 */
export const generatePerformanceReport = () => {
  const metrics = getPerformanceMetrics();
  const alerts = performanceAlerts.getAlerts();

  return {
    timestamp: new Date().toISOString(),
    metrics,
    alerts,
    recommendations: generateRecommendations(metrics, alerts),
  };
};

/**
 * Generate performance recommendations
 */
const generateRecommendations = (metrics, alerts) => {
  const recommendations = [];

  // Component recommendations
  Object.entries(metrics.components).forEach(([component, data]) => {
    if (data.averageTime > PERFORMANCE_THRESHOLDS.SLOW_RENDER) {
      recommendations.push({
        type: "component",
        target: component,
        message: `Consider optimizing ${component} with React.memo, useMemo, or useCallback`,
        priority: "high",
      });
    }
  });

  // API recommendations
  Object.entries(metrics.apiCalls).forEach(([endpoint, data]) => {
    if (data.averageTime > PERFORMANCE_THRESHOLDS.SLOW_API) {
      recommendations.push({
        type: "api",
        target: endpoint,
        message: `Consider implementing caching or pagination for ${endpoint}`,
        priority: "medium",
      });
    }
  });

  // Memory recommendations
  if (metrics.summary.currentMemoryUsage) {
    const memoryUsagePercent =
      (metrics.summary.currentMemoryUsage.used /
        metrics.summary.currentMemoryUsage.limit) *
      100;
    if (memoryUsagePercent > 70) {
      recommendations.push({
        type: "memory",
        target: "application",
        message: "Consider implementing memory cleanup or data pagination",
        priority: "high",
      });
    }
  }

  return recommendations;
};

// Initialize performance tracking
if (typeof window !== "undefined") {
  // Start monitoring in development mode
  if (process.env.NODE_ENV === "development") {
    startPerformanceMonitoring();
  }
}
