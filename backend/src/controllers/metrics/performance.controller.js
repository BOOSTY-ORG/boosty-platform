/**
 * Performance Metrics Controller
 *
 * This controller handles all performance monitoring endpoints including:
 * - Real-time performance metrics
 * - Historical performance data
 * - Performance alerts
 * - System health status
 * - Performance analytics
 */

import { performance } from 'perf_hooks';
import performanceCollector from '../../monitoring/performance-collector.js';
import monitoringConfig from '../../config/monitoring.config.js';
import logger from '../../helpers/logger.js';

class PerformanceController {
  /**
   * Get real-time performance metrics
   */
  async getRealTimeMetrics(req, res) {
    try {
      const startTime = performance.now();

      // Get current metrics snapshot
      const metrics = performanceCollector.getMetricsSnapshot();

      // Get performance summary
      const summary = performanceCollector.getPerformanceSummary();

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          responseTime: responseTime.toFixed(2),
          summary,
          metrics: {
            system: {
              cpu: metrics.system.cpu.slice(-10), // Last 10 data points
              memory: metrics.system.memory.slice(-10),
              eventLoopLag: metrics.system.eventLoopLag.slice(-10),
              uptime: metrics.system.uptime,
            },
            database: {
              queryTimes: metrics.database.queryTimes.slice(-20),
              slowQueries: metrics.database.slowQueries.slice(-5),
              connectionCount: metrics.database.connectionCount,
              operations: metrics.database.operations,
            },
            redis: {
              hitRate: metrics.redis.hitRate,
              responseTime: metrics.redis.responseTime.slice(-20),
              memory: metrics.redis.memory,
              operations: metrics.redis.operations,
            },
            api: {
              responseTimes: metrics.api.responseTimes.slice(-50),
              requestCount: metrics.api.requestCount,
              errorCount: metrics.api.errorCount,
              endpoints: metrics.api.endpoints,
            },
          },
        },
        meta: {
          generatedAt: new Date().toISOString(),
          nextUpdate: new Date(
            Date.now() + monitoringConfig.intervals.systemMetrics
          ).toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error getting real-time metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve real-time metrics',
        error: error.message,
      });
    }
  }

  /**
   * Get historical performance metrics
   */
  async getHistoricalMetrics(req, res) {
    try {
      const {
        timeRange = '1h',
        metric = 'all',
        granularity = '1m',
      } = req.query;

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
      const startTime = endTime - timeWindow;

      // Get metrics snapshot
      const metrics = performanceCollector.getMetricsSnapshot();

      // Filter metrics by time range
      const filterByTime = (data) => {
        if (!Array.isArray(data)) return data;
        return data.filter(
          (item) => item.timestamp >= startTime && item.timestamp <= endTime
        );
      };

      // Prepare response based on requested metrics
      let responseData = {};

      if (metric === 'all' || metric === 'system') {
        responseData.system = {
          cpu: filterByTime(metrics.system.cpu),
          memory: filterByTime(metrics.system.memory),
          eventLoopLag: filterByTime(metrics.system.eventLoopLag),
        };
      }

      if (metric === 'all' || metric === 'database') {
        responseData.database = {
          queryTimes: filterByTime(metrics.database.queryTimes),
          slowQueries: filterByTime(metrics.database.slowQueries),
        };
      }

      if (metric === 'all' || metric === 'redis') {
        responseData.redis = {
          responseTime: filterByTime(metrics.redis.responseTime),
        };
      }

      if (metric === 'all' || metric === 'api') {
        responseData.api = {
          responseTimes: filterByTime(metrics.api.responseTimes),
        };
      }

      res.json({
        success: true,
        data: {
          timeRange,
          metric,
          granularity,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          metrics: responseData,
        },
        meta: {
          generatedAt: new Date().toISOString(),
          dataPoints: this.countDataPoints(responseData),
        },
      });
    } catch (error) {
      logger.error('Error getting historical metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve historical metrics',
        error: error.message,
      });
    }
  }

  /**
   * Get performance alerts
   */
  async getAlerts(req, res) {
    try {
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

      res.json({
        success: true,
        data: {
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
        },
        meta: {
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error getting alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve alerts',
        error: error.message,
      });
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(req, res) {
    try {
      const summary = performanceCollector.getPerformanceSummary();
      const thresholds = monitoringConfig.thresholds;

      // Calculate overall health score (0-100)
      let healthScore = 100;
      let issues = [];

      // Check CPU usage
      if (summary.system.cpu > thresholds.cpuUsage.critical) {
        healthScore -= 30;
        issues.push({
          component: 'CPU',
          severity: 'critical',
          message: `CPU usage is critically high: ${summary.system.cpu.toFixed(2)}%`,
        });
      } else if (summary.system.cpu > thresholds.cpuUsage.warning) {
        healthScore -= 15;
        issues.push({
          component: 'CPU',
          severity: 'warning',
          message: `CPU usage is high: ${summary.system.cpu.toFixed(2)}%`,
        });
      }

      // Check memory usage
      if (summary.system.memory > thresholds.memoryUsage.critical) {
        healthScore -= 30;
        issues.push({
          component: 'Memory',
          severity: 'critical',
          message: `Memory usage is critically high: ${summary.system.memory.toFixed(2)}%`,
        });
      } else if (summary.system.memory > thresholds.memoryUsage.warning) {
        healthScore -= 15;
        issues.push({
          component: 'Memory',
          severity: 'warning',
          message: `Memory usage is high: ${summary.system.memory.toFixed(2)}%`,
        });
      }

      // Check event loop lag
      if (summary.system.eventLoopLag > thresholds.eventLoopLag.critical) {
        healthScore -= 25;
        issues.push({
          component: 'Event Loop',
          severity: 'critical',
          message: `Event loop lag is critically high: ${summary.system.eventLoopLag.toFixed(2)}ms`,
        });
      } else if (
        summary.system.eventLoopLag > thresholds.eventLoopLag.warning
      ) {
        healthScore -= 10;
        issues.push({
          component: 'Event Loop',
          severity: 'warning',
          message: `Event loop lag is high: ${summary.system.eventLoopLag.toFixed(2)}ms`,
        });
      }

      // Check error rate
      if (summary.api.errorRate > thresholds.errorRate.critical) {
        healthScore -= 20;
        issues.push({
          component: 'API',
          severity: 'critical',
          message: `Error rate is critically high: ${summary.api.errorRate.toFixed(2)}%`,
        });
      } else if (summary.api.errorRate > thresholds.errorRate.warning) {
        healthScore -= 10;
        issues.push({
          component: 'API',
          severity: 'warning',
          message: `Error rate is high: ${summary.api.errorRate.toFixed(2)}%`,
        });
      }

      // Check Redis hit rate
      if (
        summary.redis.hitRate > 0 &&
        summary.redis.hitRate < thresholds.redis.hitRateCritical
      ) {
        healthScore -= 15;
        issues.push({
          component: 'Redis',
          severity: 'critical',
          message: `Redis hit rate is critically low: ${summary.redis.hitRate.toFixed(2)}%`,
        });
      } else if (
        summary.redis.hitRate > 0 &&
        summary.redis.hitRate < thresholds.redis.hitRateWarning
      ) {
        healthScore -= 5;
        issues.push({
          component: 'Redis',
          severity: 'warning',
          message: `Redis hit rate is low: ${summary.redis.hitRate.toFixed(2)}%`,
        });
      }

      // Determine overall status
      let status = 'healthy';
      if (healthScore < 50) {
        status = 'critical';
      } else if (healthScore < 75) {
        status = 'warning';
      } else if (healthScore < 90) {
        status = 'degraded';
      }

      res.json({
        success: true,
        data: {
          status,
          healthScore: Math.max(0, healthScore),
          components: {
            system: {
              status: this.getComponentStatus(
                summary.system.cpu,
                thresholds.cpuUsage
              ),
              cpu: summary.system.cpu,
              memory: summary.system.memory,
              eventLoopLag: summary.system.eventLoopLag,
              uptime: summary.system.uptime,
            },
            database: {
              status: this.getComponentStatus(
                summary.database.avgQueryTime,
                thresholds.databaseQuery
              ),
              avgQueryTime: summary.database.avgQueryTime,
              slowQueryCount: summary.database.slowQueryCount,
              connectionCount: summary.database.connectionCount,
            },
            redis: {
              status: this.getComponentStatus(
                summary.redis.hitRate,
                {
                  warning: thresholds.redis.hitRateWarning,
                  critical: thresholds.redis.hitRateCritical,
                },
                true
              ),
              hitRate: summary.redis.hitRate,
              avgResponseTime: summary.redis.avgResponseTime,
            },
            api: {
              status: this.getComponentStatus(
                summary.api.errorRate,
                thresholds.errorRate
              ),
              avgResponseTime: summary.api.avgResponseTime,
              requestCount: summary.api.requestCount,
              errorCount: summary.api.errorCount,
              errorRate: summary.api.errorRate,
            },
          },
          issues,
          alerts: {
            total: summary.alerts.total,
            recent: summary.alerts.recent,
          },
        },
        meta: {
          generatedAt: new Date().toISOString(),
          nextCheck: new Date(
            Date.now() + monitoringConfig.intervals.alertCheck
          ).toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error getting system health:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system health',
        error: error.message,
      });
    }
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(req, res) {
    try {
      const { timeRange = '24h', analysis = 'all' } = req.query;

      // Parse time range
      const timeRanges = {
        '1h': 3600000,
        '6h': 21600000,
        '24h': 86400000,
        '7d': 604800000,
        '30d': 2592000000,
      };

      const timeWindow = timeRanges[timeRange] || timeRanges['24h'];
      const endTime = Date.now();
      const startTime = endTime - timeWindow;

      // Get metrics snapshot
      const metrics = performanceCollector.getMetricsSnapshot();

      const analytics = {};

      // Trend analysis
      if (analysis === 'all' || analysis === 'trends') {
        analytics.trends = this.analyzeTrends(metrics, startTime, endTime);
      }

      // Bottleneck detection
      if (analysis === 'all' || analysis === 'bottlenecks') {
        analytics.bottlenecks = this.detectBottlenecks(metrics);
      }

      // Performance regression
      if (analysis === 'all' || analysis === 'regression') {
        analytics.regression = this.detectRegression(metrics, timeWindow);
      }

      // Recommendations
      if (analysis === 'all' || analysis === 'recommendations') {
        analytics.recommendations = this.generateRecommendations(metrics);
      }

      res.json({
        success: true,
        data: {
          timeRange,
          analysis,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          analytics,
        },
        meta: {
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error getting performance analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve performance analytics',
        error: error.message,
      });
    }
  }

  /**
   * Get endpoint performance details
   */
  async getEndpointPerformance(req, res) {
    try {
      const { endpoint } = req.params;
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
      const startTime = endTime - timeWindow;

      // Get metrics snapshot
      const metrics = performanceCollector.getMetricsSnapshot();

      // Find endpoint data
      const endpointData = metrics.api.endpoints[endpoint];
      if (!endpointData) {
        return res.status(404).json({
          success: false,
          message: `Endpoint ${endpoint} not found`,
        });
      }

      // Calculate statistics
      const responseTimes = endpointData.responseTimes || [];
      const avgResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) /
            responseTimes.length
          : 0;

      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
      const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
      const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;

      const errorRate =
        endpointData.count > 0
          ? (endpointData.errors / endpointData.count) * 100
          : 0;

      res.json({
        success: true,
        data: {
          endpoint,
          timeRange,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          statistics: {
            requestCount: endpointData.count,
            errorCount: endpointData.errors,
            errorRate: errorRate.toFixed(2),
            avgResponseTime: avgResponseTime.toFixed(2),
            p50ResponseTime: p50.toFixed(2),
            p95ResponseTime: p95.toFixed(2),
            p99ResponseTime: p99.toFixed(2),
          },
          recentResponseTimes: responseTimes.slice(-20),
        },
        meta: {
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error getting endpoint performance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve endpoint performance',
        error: error.message,
      });
    }
  }

  /**
   * Helper method to count data points
   */
  countDataPoints(data) {
    let count = 0;
    for (const category of Object.values(data)) {
      if (Array.isArray(category)) {
        count += category.length;
      } else if (typeof category === 'object') {
        count += this.countDataPoints(category);
      }
    }
    return count;
  }

  /**
   * Get component status based on thresholds
   */
  getComponentStatus(value, thresholds, lowerIsWorse = false) {
    if (lowerIsWorse) {
      if (value < thresholds.critical) return 'critical';
      if (value < thresholds.warning) return 'warning';
    } else {
      if (value > thresholds.critical) return 'critical';
      if (value > thresholds.warning) return 'warning';
    }
    return 'healthy';
  }

  /**
   * Analyze performance trends
   */
  analyzeTrends(metrics, startTime, endTime) {
    // This is a simplified trend analysis
    // In a real implementation, you would use more sophisticated algorithms
    const trends = {};

    // CPU trend
    const cpuData = metrics.system.cpu.filter((m) => m.timestamp >= startTime);
    if (cpuData.length > 1) {
      const firstHalf = cpuData.slice(0, Math.floor(cpuData.length / 2));
      const secondHalf = cpuData.slice(Math.floor(cpuData.length / 2));

      const firstAvg =
        firstHalf.reduce((sum, m) => sum + m.value, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, m) => sum + m.value, 0) / secondHalf.length;

      trends.cpu = {
        direction: secondAvg > firstAvg ? 'increasing' : 'decreasing',
        change: (((secondAvg - firstAvg) / firstAvg) * 100).toFixed(2),
      };
    }

    // Memory trend
    const memoryData = metrics.system.memory.filter(
      (m) => m.timestamp >= startTime
    );
    if (memoryData.length > 1) {
      const firstHalf = memoryData.slice(0, Math.floor(memoryData.length / 2));
      const secondHalf = memoryData.slice(Math.floor(memoryData.length / 2));

      const firstAvg =
        firstHalf.reduce((sum, m) => sum + m.value, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, m) => sum + m.value, 0) / secondHalf.length;

      trends.memory = {
        direction: secondAvg > firstAvg ? 'increasing' : 'decreasing',
        change: (((secondAvg - firstAvg) / firstAvg) * 100).toFixed(2),
      };
    }

    return trends;
  }

  /**
   * Detect performance bottlenecks
   */
  detectBottlenecks(metrics) {
    const bottlenecks = [];

    // Check for slow database queries
    const slowQueries = metrics.database.slowQueries;
    if (slowQueries.length > 5) {
      bottlenecks.push({
        type: 'database',
        severity: 'high',
        description: `High number of slow queries detected: ${slowQueries.length}`,
        recommendation: 'Optimize database queries and add appropriate indexes',
      });
    }

    // Check for high memory usage
    const latestMemory =
      metrics.system.memory[metrics.system.memory.length - 1];
    if (latestMemory && latestMemory.value > 80) {
      bottlenecks.push({
        type: 'memory',
        severity: 'medium',
        description: `High memory usage: ${latestMemory.value.toFixed(2)}%`,
        recommendation: 'Check for memory leaks and optimize memory usage',
      });
    }

    // Check for high error rates
    const errorRate =
      metrics.api.requestCount > 0
        ? (metrics.api.errorCount / metrics.api.requestCount) * 100
        : 0;

    if (errorRate > 5) {
      bottlenecks.push({
        type: 'api',
        severity: 'high',
        description: `High API error rate: ${errorRate.toFixed(2)}%`,
        recommendation: 'Investigate error patterns and fix underlying issues',
      });
    }

    return bottlenecks;
  }

  /**
   * Detect performance regression
   */
  detectRegression(metrics, timeWindow) {
    // This is a simplified regression detection
    // In a real implementation, you would compare against historical baselines
    const regressions = [];

    // Compare recent performance with older performance
    const recentWindow = timeWindow / 2;
    const now = Date.now();
    const recentStart = now - recentWindow;
    const olderStart = now - timeWindow;
    const olderEnd = recentStart;

    // Check API response time regression
    const recentResponseTimes = metrics.api.responseTimes.filter(
      (m) => m.timestamp >= recentStart
    );
    const olderResponseTimes = metrics.api.responseTimes.filter(
      (m) => m.timestamp >= olderStart && m.timestamp < olderEnd
    );

    if (recentResponseTimes.length > 10 && olderResponseTimes.length > 10) {
      const recentAvg =
        recentResponseTimes.reduce((sum, m) => sum + m.value, 0) /
        recentResponseTimes.length;
      const olderAvg =
        olderResponseTimes.reduce((sum, m) => sum + m.value, 0) /
        olderResponseTimes.length;

      const regressionPercent = ((recentAvg - olderAvg) / olderAvg) * 100;

      if (regressionPercent > 10) {
        regressions.push({
          metric: 'apiResponseTime',
          regression: regressionPercent.toFixed(2),
          description: `API response time has degraded by ${regressionPercent.toFixed(2)}%`,
        });
      }
    }

    return regressions;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    // Memory recommendations
    const latestMemory =
      metrics.system.memory[metrics.system.memory.length - 1];
    if (latestMemory && latestMemory.value > 70) {
      recommendations.push({
        category: 'memory',
        priority: 'high',
        title: 'Optimize Memory Usage',
        description:
          'Memory usage is above 70%. Consider implementing memory optimization strategies.',
        actions: [
          'Check for memory leaks in the application',
          'Implement proper garbage collection practices',
          'Consider increasing available memory if necessary',
        ],
      });
    }

    // Database recommendations
    const slowQueryCount = metrics.database.slowQueries.length;
    if (slowQueryCount > 3) {
      recommendations.push({
        category: 'database',
        priority: 'high',
        title: 'Optimize Database Queries',
        description: `${slowQueryCount} slow queries detected in the recent period.`,
        actions: [
          'Review and optimize slow queries',
          'Add appropriate database indexes',
          'Consider query result caching',
        ],
      });
    }

    // API recommendations
    const errorRate =
      metrics.api.requestCount > 0
        ? (metrics.api.errorCount / metrics.api.requestCount) * 100
        : 0;

    if (errorRate > 2) {
      recommendations.push({
        category: 'api',
        priority: 'medium',
        title: 'Reduce API Error Rate',
        description: `API error rate is ${errorRate.toFixed(2)}%, which is above optimal levels.`,
        actions: [
          'Investigate common error patterns',
          'Improve input validation',
          'Enhance error handling and logging',
        ],
      });
    }

    return recommendations;
  }
}

export default new PerformanceController();
