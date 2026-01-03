/**
 * Performance Monitoring Configuration
 *
 * This file contains configuration settings for the performance monitoring system
 * including thresholds, intervals, and alert settings.
 */

// Performance monitoring configuration
const monitoringConfig = {
  // General settings
  enabled: process.env.NODE_ENV !== 'test',
  debug: process.env.NODE_ENV === 'development',

  // Metrics collection intervals (in milliseconds)
  intervals: {
    systemMetrics: 30000, // Collect system metrics every 30 seconds
    databaseMetrics: 60000, // Collect database metrics every minute
    performanceMetrics: 10000, // Collect performance metrics every 10 seconds
    alertCheck: 15000, // Check for alerts every 15 seconds
    cleanup: 300000, // Clean up old metrics every 5 minutes
  },

  // Data retention settings (in milliseconds)
  retention: {
    realtimeMetrics: 3600000, // Keep real-time metrics for 1 hour
    hourlyMetrics: 86400000, // Keep hourly metrics for 24 hours
    dailyMetrics: 604800000, // Keep daily metrics for 7 days
    alerts: 2592000000, // Keep alerts for 30 days
  },

  // Performance thresholds for alerting
  thresholds: {
    // Response time thresholds (in milliseconds)
    responseTime: {
      warning: 500, // Warning if response time > 500ms
      critical: 1000, // Critical if response time > 1000ms
    },

    // Memory usage thresholds (in percentage)
    memoryUsage: {
      warning: 70, // Warning if memory usage > 70%
      critical: 85, // Critical if memory usage > 85%
    },

    // CPU usage thresholds (in percentage)
    cpuUsage: {
      warning: 70, // Warning if CPU usage > 70%
      critical: 85, // Critical if CPU usage > 85%
    },

    // Event loop lag thresholds (in milliseconds)
    eventLoopLag: {
      warning: 10, // Warning if event loop lag > 10ms
      critical: 50, // Critical if event loop lag > 50ms
    },

    // Database query thresholds (in milliseconds)
    databaseQuery: {
      warning: 100, // Warning if query time > 100ms
      critical: 500, // Critical if query time > 500ms
    },

    // Error rate thresholds (in percentage)
    errorRate: {
      warning: 5, // Warning if error rate > 5%
      critical: 10, // Critical if error rate > 10%
    },

    // Redis performance thresholds
    redis: {
      hitRateWarning: 90, // Warning if hit rate < 90%
      hitRateCritical: 80, // Critical if hit rate < 80%
      responseTimeWarning: 5, // Warning if response time > 5ms
      responseTimeCritical: 10, // Critical if response time > 10ms
    },
  },

  // Alert configuration
  alerts: {
    enabled: true,
    channels: {
      email: {
        enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
        recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
        template: 'performance-alert',
      },
      webhook: {
        enabled: process.env.ALERT_WEBHOOK_ENABLED === 'true',
        url: process.env.ALERT_WEBHOOK_URL || '',
        timeout: 5000,
      },
      log: {
        enabled: true,
        level: 'warn',
      },
    },
    cooldown: {
      warning: 300000, // 5 minutes cooldown between warning alerts
      critical: 60000, // 1 minute cooldown between critical alerts
    },
  },

  // Database monitoring settings
  database: {
    enabled: true,
    slowQueryThreshold: 100, // Log queries slower than 100ms
    trackConnections: true,
    trackOperations: true,
  },

  // Redis monitoring settings
  redis: {
    enabled: true,
    trackMemory: true,
    trackOperations: true,
    trackHitRate: true,
  },

  // API endpoint monitoring
  api: {
    enabled: true,
    trackAllEndpoints: true,
    excludeEndpoints: ['/health', '/ping', '/metrics/health'],
    sampleRate: 1.0, // Track 100% of requests (can be reduced for high traffic)
  },

  // Analytics settings
  analytics: {
    enabled: true,
    trendAnalysisWindow: 3600000, // 1 hour window for trend analysis
    bottleneckDetection: {
      enabled: true,
      sampleSize: 100, // Minimum samples for bottleneck detection
    },
    regressionDetection: {
      enabled: true,
      baselineWindow: 86400000, // 24 hours baseline
      threshold: 10, // 10% degradation threshold
    },
  },

  // Dashboard settings
  dashboard: {
    enabled: true,
    refreshInterval: 5000, // 5 seconds refresh interval
    maxDataPoints: 100, // Maximum data points to display
  },
};

export default monitoringConfig;
