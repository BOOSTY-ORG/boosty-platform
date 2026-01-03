/**
 * Performance Dashboard Controller
 *
 * This controller handles all dashboard-specific performance endpoints including:
 * - Main dashboard overview
 * - System metrics dashboard
 * - API performance dashboard
 * - Database performance dashboard
 * - Alerts dashboard
 */

import { performance } from 'perf_hooks';
import performanceCollector from '../../monitoring/performance-collector.js';
import performanceAnalytics from '../../monitoring/performance-analytics.js';
import monitoringConfig from '../../config/monitoring.config.js';
import logger from '../../helpers/logger.js';

class PerformanceDashboardController {
  /**
   * Get main dashboard overview
   */
  async getDashboardOverview(req, res) {
    try {
      const startTime = performance.now();
      const {
        timeRange = '1h',
        refreshRate = 30,
        page = 1,
        limit = 20,
      } = req.query;

      // Check cache first
      const cacheKey = `dashboard:overview:${timeRange}:${refreshRate}:${req.user?.role}:${page}:${limit}`;
      const cachedResult = await this.getFromCache(cacheKey);

      if (cachedResult) {
        return res.json({
          ...cachedResult,
          meta: {
            ...cachedResult.meta,
            cached: true,
          },
        });
      }

      // Parse time range
      const timeRanges = {
        '1h': 3600000, // 1 hour
        '6h': 21600000, // 6 hours
        '24h': 86400000, // 24 hours
        '7d': 604800000, // 7 days
        '30d': 2592000000, // 30 days
      };

      const timeWindow = timeRanges[timeRange] || timeRanges['1h'];
      const endTime = Date.now();
      const dashboardStartTime = endTime - timeWindow;

      // Get metrics snapshot with pagination
      const metrics = performanceCollector.getMetricsSnapshot(
        parseInt(page),
        parseInt(limit)
      );
      const summary = performanceCollector.getPerformanceSummary();

      // Generate dashboard widgets in parallel
      const [widgets, dashboardSummary] = await Promise.all([
        this.generateDashboardWidgets(metrics, timeWindow, req.user.role),
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(this.calculateDashboardSummary(summary, metrics));
          }, 0);
        }),
      ]);

      const responseTime = performance.now() - startTime;

      const result = {
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          timeRange,
          refreshInterval: parseInt(refreshRate),
          widgets,
          summary: dashboardSummary,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
            nextUpdate: new Date(
              Date.now() + parseInt(refreshRate) * 1000
            ).toISOString(),
            dataFreshness: this.calculateDataFreshness(metrics),
            page: parseInt(page),
            limit: parseInt(limit),
          },
        },
      };

      // Cache the result
      await this.setCache(cacheKey, result, 30000); // 30 seconds cache

      res.json(result);
    } catch (error) {
      logger.error('Error getting dashboard overview:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_OVERVIEW_ERROR',
          message: 'Failed to retrieve dashboard overview',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get system metrics dashboard
   */
  async getSystemDashboard(req, res) {
    try {
      const startTime = performance.now();
      const { timeRange = '1h' } = req.query;

      // Parse time range
      const timeRanges = {
        '1h': 3600000,
        '6h': 21600000,
        '24h': 86400000,
        '7d': 604800000,
      };

      const timeWindow = timeRanges[timeRange] || timeRanges['1h'];
      const endTime = Date.now();
      const dashboardStartTime = endTime - timeWindow;

      // Get metrics snapshot
      const metrics = performanceCollector.getMetricsSnapshot();

      // Generate system-specific widgets
      const widgets = await this.generateSystemWidgets(
        metrics,
        timeWindow,
        req.user.role
      );

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          timeRange,
          widgets,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
            nextUpdate: new Date(
              Date.now() + monitoringConfig.intervals.systemMetrics
            ).toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error('Error getting system dashboard:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SYSTEM_DASHBOARD_ERROR',
          message: 'Failed to retrieve system dashboard',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get API performance dashboard
   */
  async getApiDashboard(req, res) {
    try {
      const startTime = performance.now();
      const { timeRange = '1h' } = req.query;

      // Parse time range
      const timeRanges = {
        '1h': 3600000,
        '6h': 21600000,
        '24h': 86400000,
        '7d': 604800000,
      };

      const timeWindow = timeRanges[timeRange] || timeRanges['1h'];
      const endTime = Date.now();
      const dashboardStartTime = endTime - timeWindow;

      // Get metrics snapshot
      const metrics = performanceCollector.getMetricsSnapshot();

      // Generate API-specific widgets
      const widgets = await this.generateApiWidgets(
        metrics,
        timeWindow,
        req.user.role
      );

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          timeRange,
          widgets,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
            nextUpdate: new Date(
              Date.now() + monitoringConfig.intervals.systemMetrics
            ).toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error('Error getting API dashboard:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'API_DASHBOARD_ERROR',
          message: 'Failed to retrieve API dashboard',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get database performance dashboard
   */
  async getDatabaseDashboard(req, res) {
    try {
      const startTime = performance.now();
      const { timeRange = '1h' } = req.query;

      // Parse time range
      const timeRanges = {
        '1h': 3600000,
        '6h': 21600000,
        '24h': 86400000,
        '7d': 604800000,
      };

      const timeWindow = timeRanges[timeRange] || timeRanges['1h'];
      const endTime = Date.now();
      const dashboardStartTime = endTime - timeWindow;

      // Get metrics snapshot
      const metrics = performanceCollector.getMetricsSnapshot();

      // Generate database-specific widgets
      const widgets = await this.generateDatabaseWidgets(
        metrics,
        timeWindow,
        req.user.role
      );

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          timeRange,
          widgets,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
            nextUpdate: new Date(
              Date.now() + monitoringConfig.intervals.databaseMetrics
            ).toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error('Error getting database dashboard:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_DASHBOARD_ERROR',
          message: 'Failed to retrieve database dashboard',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get alerts dashboard
   */
  async getAlertsDashboard(req, res) {
    try {
      const startTime = performance.now();
      const { level = 'all', limit = 50, offset = 0 } = req.query;

      // Get metrics snapshot
      const metrics = performanceCollector.getMetricsSnapshot();
      let alerts = metrics.alerts;

      // Filter by level if specified
      if (level !== 'all') {
        alerts = alerts.filter((alert) => alert.level === level);
      }

      // Sort by timestamp (newest first)
      alerts.sort((a, b) => b.timestamp - a.timestamp);

      // Apply pagination
      const startIndex = parseInt(offset) || 0;
      const endIndex = startIndex + parseInt(limit);
      const paginatedAlerts = alerts.slice(startIndex, endIndex);

      // Generate alert widgets
      const widgets = await this.generateAlertsWidgets(
        paginatedAlerts,
        req.user.role
      );

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          widgets,
          alerts: paginatedAlerts,
          pagination: {
            total: alerts.length,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: endIndex < alerts.length,
          },
          summary: {
            total: alerts.length,
            critical: alerts.filter((a) => a.level === 'critical').length,
            warning: alerts.filter((a) => a.level === 'warning').length,
            recent: alerts.filter((a) => Date.now() - a.timestamp < 3600000)
              .length, // Last hour
          },
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
            nextUpdate: new Date(
              Date.now() + monitoringConfig.intervals.alertCheck
            ).toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error('Error getting alerts dashboard:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ALERTS_DASHBOARD_ERROR',
          message: 'Failed to retrieve alerts dashboard',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Generate dashboard widgets based on user role with optimization
   */
  async generateDashboardWidgets(metrics, timeWindow, userRole) {
    // Generate widgets in parallel for better performance
    const [
      systemHealthWidget,
      performanceOverviewWidget,
      recentAlertsWidget,
      apiPerformanceWidget,
    ] = await Promise.all([
      // System health widget
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: 'system-health',
            type: 'metric',
            title: 'System Health',
            data: {
              status: this.getSystemHealthStatus(metrics),
              uptime: metrics.system.uptime,
              lastUpdated: new Date().toISOString(),
            },
            config: {
              refreshInterval: 30,
              colorScheme: 'health',
            },
            permissions: this.getWidgetPermissions('system-health', userRole),
          });
        }, 0);
      }),
      // Performance overview widget
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: 'performance-overview',
            type: 'chart',
            title: 'Performance Overview',
            data: {
              cpu: this.getMetricData(metrics.system.cpu, timeWindow),
              memory: this.getMetricData(metrics.system.memory, timeWindow),
              responseTime: this.getMetricData(
                metrics.api.responseTimes,
                timeWindow
              ),
            },
            config: {
              chartType: 'line',
              timeRange: timeWindow,
              yAxis: ['percentage', 'percentage', 'milliseconds'],
            },
            permissions: this.getWidgetPermissions(
              'performance-overview',
              userRole
            ),
          });
        }, 0);
      }),
      // Recent alerts widget
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: 'recent-alerts',
            type: 'alert',
            title: 'Recent Alerts',
            data: {
              alerts: metrics.alerts.slice(-5).reverse(),
              total: metrics.alerts.length,
            },
            config: {
              maxItems: 5,
              sortBy: 'timestamp',
            },
            permissions: this.getWidgetPermissions('recent-alerts', userRole),
          });
        }, 0);
      }),
      // API performance widget
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: 'api-performance',
            type: 'table',
            title: 'API Performance',
            data: {
              endpoints: this.getTopEndpoints(metrics.api.endpoints, 5),
            },
            config: {
              columns: ['endpoint', 'requests', 'avgResponseTime', 'errorRate'],
              sortBy: 'avgResponseTime',
            },
            permissions: this.getWidgetPermissions('api-performance', userRole),
          });
        }, 0);
      }),
    ]);

    return [
      systemHealthWidget,
      performanceOverviewWidget,
      recentAlertsWidget,
      apiPerformanceWidget,
    ];
  }

  /**
   * Generate system-specific widgets
   */
  async generateSystemWidgets(metrics, timeWindow, userRole) {
    const widgets = [];

    // CPU usage widget
    widgets.push({
      id: 'cpu-usage',
      type: 'chart',
      title: 'CPU Usage',
      data: {
        current: this.getLatestMetric(metrics.system.cpu),
        average: this.getAverageMetric(metrics.system.cpu, timeWindow),
        trend: this.calculateTrend(metrics.system.cpu),
        history: this.getMetricData(metrics.system.cpu, timeWindow),
      },
      config: {
        chartType: 'line',
        unit: 'percentage',
        thresholds: {
          warning: 70,
          critical: 90,
        },
      },
      permissions: this.getWidgetPermissions('cpu-usage', userRole),
    });

    // Memory usage widget
    widgets.push({
      id: 'memory-usage',
      type: 'chart',
      title: 'Memory Usage',
      data: {
        current: this.getLatestMetric(metrics.system.memory),
        average: this.getAverageMetric(metrics.system.memory, timeWindow),
        trend: this.calculateTrend(metrics.system.memory),
        history: this.getMetricData(metrics.system.memory, timeWindow),
      },
      config: {
        chartType: 'line',
        unit: 'percentage',
        thresholds: {
          warning: 80,
          critical: 95,
        },
      },
      permissions: this.getWidgetPermissions('memory-usage', userRole),
    });

    // Event loop lag widget
    widgets.push({
      id: 'event-loop-lag',
      type: 'chart',
      title: 'Event Loop Lag',
      data: {
        current: this.getLatestMetric(metrics.system.eventLoopLag),
        average: this.getAverageMetric(metrics.system.eventLoopLag, timeWindow),
        history: this.getMetricData(metrics.system.eventLoopLag, timeWindow),
      },
      config: {
        chartType: 'line',
        unit: 'milliseconds',
        thresholds: {
          warning: 20,
          critical: 50,
        },
      },
      permissions: this.getWidgetPermissions('event-loop-lag', userRole),
    });

    return widgets;
  }

  /**
   * Generate API-specific widgets
   */
  async generateApiWidgets(metrics, timeWindow, userRole) {
    const widgets = [];

    // Response time widget
    widgets.push({
      id: 'api-response-time',
      type: 'chart',
      title: 'API Response Time',
      data: {
        current: this.getLatestMetric(metrics.api.responseTimes),
        average: this.getAverageMetric(metrics.api.responseTimes, timeWindow),
        p95: this.getPercentile(metrics.api.responseTimes, 95),
        history: this.getMetricData(metrics.api.responseTimes, timeWindow),
      },
      config: {
        chartType: 'line',
        unit: 'milliseconds',
        thresholds: {
          warning: 500,
          critical: 1000,
        },
      },
      permissions: this.getWidgetPermissions('api-response-time', userRole),
    });

    // Request volume widget
    widgets.push({
      id: 'request-volume',
      type: 'metric',
      title: 'Request Volume',
      data: {
        total: metrics.api.requestCount,
        errorCount: metrics.api.errorCount,
        errorRate:
          metrics.api.requestCount > 0
            ? (metrics.api.errorCount / metrics.api.requestCount) * 100
            : 0,
      },
      config: {
        unit: 'requests',
        showTrend: true,
      },
      permissions: this.getWidgetPermissions('request-volume', userRole),
    });

    // Top endpoints widget
    widgets.push({
      id: 'top-endpoints',
      type: 'table',
      title: 'Top Endpoints by Traffic',
      data: {
        endpoints: this.getTopEndpoints(metrics.api.endpoints, 10),
      },
      config: {
        columns: ['endpoint', 'requests', 'avgResponseTime', 'errorRate'],
        sortBy: 'requests',
        sortOrder: 'desc',
      },
      permissions: this.getWidgetPermissions('top-endpoints', userRole),
    });

    return widgets;
  }

  /**
   * Generate database-specific widgets
   */
  async generateDatabaseWidgets(metrics, timeWindow, userRole) {
    const widgets = [];

    // Query performance widget
    widgets.push({
      id: 'query-performance',
      type: 'chart',
      title: 'Database Query Performance',
      data: {
        average: this.getAverageMetric(metrics.database.queryTimes, timeWindow),
        slowQueries: metrics.database.slowQueries.length,
        connectionCount: metrics.database.connectionCount,
        history: this.getMetricData(metrics.database.queryTimes, timeWindow),
      },
      config: {
        chartType: 'line',
        unit: 'milliseconds',
        thresholds: {
          warning: 200,
          critical: 500,
        },
      },
      permissions: this.getWidgetPermissions('query-performance', userRole),
    });

    // Slow queries widget
    widgets.push({
      id: 'slow-queries',
      type: 'table',
      title: 'Recent Slow Queries',
      data: {
        queries: metrics.database.slowQueries.slice(-10).reverse(),
      },
      config: {
        columns: ['operation', 'collection', 'queryTime', 'timestamp'],
        sortBy: 'queryTime',
        sortOrder: 'desc',
        maxItems: 10,
      },
      permissions: this.getWidgetPermissions('slow-queries', userRole),
    });

    return widgets;
  }

  /**
   * Generate alerts-specific widgets
   */
  async generateAlertsWidgets(alerts, userRole) {
    const widgets = [];

    // Alert summary widget
    widgets.push({
      id: 'alert-summary',
      type: 'metric',
      title: 'Alert Summary',
      data: {
        total: alerts.length,
        critical: alerts.filter((a) => a.level === 'critical').length,
        warning: alerts.filter((a) => a.level === 'warning').length,
        recent: alerts.filter((a) => Date.now() - a.timestamp < 3600000).length,
      },
      config: {
        showTrend: true,
        colorScheme: 'alert',
      },
      permissions: this.getWidgetPermissions('alert-summary', userRole),
    });

    // Recent alerts widget
    widgets.push({
      id: 'recent-alerts',
      type: 'alert',
      title: 'Recent Alerts',
      data: {
        alerts: alerts,
      },
      config: {
        maxItems: 20,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      },
      permissions: this.getWidgetPermissions('recent-alerts', userRole),
    });

    return widgets;
  }

  /**
   * Get widget permissions based on user role
   */
  getWidgetPermissions(widgetId, userRole) {
    const permissions = {
      view: true,
      export: ['admin', 'manager'].includes(userRole),
      configure: ['admin'].includes(userRole),
    };

    // Special permissions for specific widgets
    if (
      widgetId === 'slow-queries' &&
      !['admin', 'manager'].includes(userRole)
    ) {
      permissions.view = false;
    }

    return permissions;
  }

  /**
   * Calculate dashboard summary
   */
  calculateDashboardSummary(summary, metrics) {
    const criticalAlerts = metrics.alerts.filter(
      (a) => a.level === 'critical'
    ).length;
    const warningAlerts = metrics.alerts.filter(
      (a) => a.level === 'warning'
    ).length;

    // Determine overall health
    let overallHealth = 'healthy';
    if (criticalAlerts > 0) {
      overallHealth = 'critical';
    } else if (
      warningAlerts > 0 ||
      summary.system.cpu > 80 ||
      summary.system.memory > 80
    ) {
      overallHealth = 'warning';
    } else if (summary.system.cpu > 60 || summary.system.memory > 70) {
      overallHealth = 'degraded';
    }

    return {
      overallHealth,
      criticalAlerts,
      warningAlerts,
      systemLoad: summary.system.cpu,
      activeUsers: metrics.api.requestCount,
      responseTime: summary.api.avgResponseTime,
    };
  }

  /**
   * Get system health status
   */
  getSystemHealthStatus(metrics) {
    const summary = performanceCollector.getPerformanceSummary();

    if (
      summary.system.cpu > 90 ||
      summary.system.memory > 95 ||
      summary.system.eventLoopLag > 50
    ) {
      return 'critical';
    } else if (
      summary.system.cpu > 70 ||
      summary.system.memory > 80 ||
      summary.system.eventLoopLag > 20
    ) {
      return 'warning';
    } else if (summary.system.cpu > 50 || summary.system.memory > 60) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get metric data for time range
   */
  getMetricData(metricArray, timeWindow) {
    if (!Array.isArray(metricArray)) return [];

    const endTime = Date.now();
    const startTime = endTime - timeWindow;

    return metricArray
      .filter((m) => m.timestamp >= startTime && m.timestamp <= endTime)
      .map((m) => ({
        timestamp: m.timestamp,
        value: m.value,
      }));
  }

  /**
   * Get latest metric value
   */
  getLatestMetric(metricArray) {
    if (!Array.isArray(metricArray) || metricArray.length === 0) return 0;
    return metricArray[metricArray.length - 1].value;
  }

  /**
   * Get average metric value for time window
   */
  getAverageMetric(metricArray, timeWindow) {
    if (!Array.isArray(metricArray) || metricArray.length === 0) return 0;

    const endTime = Date.now();
    const startTime = endTime - timeWindow;

    const filteredMetrics = metricArray.filter(
      (m) => m.timestamp >= startTime && m.timestamp <= endTime
    );

    if (filteredMetrics.length === 0) return 0;

    const sum = filteredMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / filteredMetrics.length;
  }

  /**
   * Get percentile value from metric array
   */
  getPercentile(metricArray, percentile) {
    if (!Array.isArray(metricArray) || metricArray.length === 0) return 0;

    const values = metricArray.map((m) => m.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * values.length) - 1;

    return values[index] || 0;
  }

  /**
   * Calculate trend for metric
   */
  calculateTrend(metricArray) {
    if (!Array.isArray(metricArray) || metricArray.length < 2) return 'stable';

    const recent = metricArray.slice(-10);
    const older = metricArray.slice(-20, -10);

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg =
      recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.value, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';

    return 'stable';
  }

  /**
   * Get top endpoints by performance
   */
  getTopEndpoints(endpoints, limit = 10) {
    return Object.entries(endpoints)
      .map(([endpoint, data]) => ({
        endpoint,
        requests: data.count,
        avgResponseTime:
          data.count > 0 ? data.totalResponseTime / data.count : 0,
        errorRate: data.count > 0 ? (data.errors / data.count) * 100 : 0,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, limit);
  }

  /**
   * Calculate data freshness in seconds
   */
  calculateDataFreshness(metrics) {
    const latestTimestamps = [
      metrics.system.cpu?.[metrics.system.cpu.length - 1]?.timestamp,
      metrics.system.memory?.[metrics.system.memory.length - 1]?.timestamp,
      metrics.api.responseTimes?.[metrics.api.responseTimes.length - 1]
        ?.timestamp,
    ].filter(Boolean);

    if (latestTimestamps.length === 0) return 0;

    const latestTimestamp = Math.max(...latestTimestamps);
    return Math.floor((Date.now() - latestTimestamp) / 1000);
  }

  /**
   * Get data from cache
   */
  async getFromCache(key) {
    try {
      // This would use the cache service in a real implementation
      // For now, return null to skip caching
      return null;
    } catch (error) {
      logger.error('Error getting cache:', error);
      return null;
    }
  }

  /**
   * Set data to cache
   */
  async setCache(key, data, ttl) {
    try {
      // This would use the cache service in a real implementation
      // For now, just log the caching attempt
      logger.debug(`Caching data for key: ${key}, TTL: ${ttl}ms`);
    } catch (error) {
      logger.error('Error setting cache:', error);
    }
  }
}

export default new PerformanceDashboardController();
