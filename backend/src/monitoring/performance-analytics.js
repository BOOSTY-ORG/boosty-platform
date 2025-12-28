/**
 * Performance Analytics Module
 *
 * This module provides advanced performance analytics including:
 * - Trend analysis
 * - Bottleneck detection
 * - Performance regression detection
 * - Optimization recommendations
 * - Predictive analytics
 */

import monitoringConfig from '../config/monitoring.config.js';
import logger from '../helpers/logger.js';

class PerformanceAnalytics {
  constructor() {
    this.baselineData = new Map();
    this.trendCache = new Map();
    this.regressionThresholds =
      monitoringConfig.analytics.regressionDetection.threshold;
  }

  /**
   * Analyze performance trends for metrics
   */
  analyzeTrends(
    metrics,
    timeWindow = monitoringConfig.analytics.trendAnalysisWindow
  ) {
    const trends = {};
    const endTime = Date.now();
    const startTime = endTime - timeWindow;

    // Analyze system metrics trends
    trends.system = this.analyzeMetricTrends(
      metrics.system,
      startTime,
      endTime
    );

    // Analyze database metrics trends
    trends.database = this.analyzeMetricTrends(
      metrics.database,
      startTime,
      endTime
    );

    // Analyze Redis metrics trends
    trends.redis = this.analyzeMetricTrends(metrics.redis, startTime, endTime);

    // Analyze API metrics trends
    trends.api = this.analyzeMetricTrends(metrics.api, startTime, endTime);

    return trends;
  }

  /**
   * Analyze trends for specific metric category
   */
  analyzeMetricTrends(categoryMetrics, startTime, endTime) {
    const trends = {};

    for (const [metricName, metricData] of Object.entries(categoryMetrics)) {
      if (!Array.isArray(metricData) || metricData.length < 2) {
        continue;
      }

      // Filter data within time window
      const windowData = metricData.filter(
        (m) => m.timestamp >= startTime && m.timestamp <= endTime
      );

      if (windowData.length < 2) {
        continue;
      }

      // Calculate trend
      const trend = this.calculateTrend(windowData);
      trends[metricName] = trend;
    }

    return trends;
  }

  /**
   * Calculate trend for metric data
   */
  calculateTrend(data) {
    if (data.length < 2) {
      return { direction: 'stable', change: 0, confidence: 0 };
    }

    // Sort data by timestamp
    const sortedData = data.sort((a, b) => a.timestamp - b.timestamp);

    // Extract values and timestamps
    const values = sortedData.map((d) => d.value);
    const timestamps = sortedData.map((d) => d.timestamp);

    // Calculate linear regression
    const regression = this.linearRegression(timestamps, values);

    // Determine trend direction
    let direction = 'stable';
    if (regression.slope > 0.01) {
      direction = 'increasing';
    } else if (regression.slope < -0.01) {
      direction = 'decreasing';
    }

    // Calculate percentage change
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const change =
      firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    // Calculate confidence based on R-squared
    const confidence = Math.max(0, Math.min(100, regression.r2 * 100));

    return {
      direction,
      change: change.toFixed(2),
      confidence: confidence.toFixed(2),
      slope: regression.slope,
      intercept: regression.intercept,
      dataPoints: data.length,
    };
  }

  /**
   * Perform linear regression
   */
  linearRegression(x, y) {
    const n = x.length;
    if (n === 0) return { slope: 0, intercept: 0, r2: 0 };

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const totalSumSquares = y.reduce(
      (sum, val) => sum + Math.pow(val - meanY, 2),
      0
    );
    const residualSumSquares = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);

    const r2 =
      totalSumSquares > 0 ? 1 - residualSumSquares / totalSumSquares : 0;

    return { slope, intercept, r2 };
  }

  /**
   * Detect performance bottlenecks
   */
  detectBottlenecks(metrics) {
    const bottlenecks = [];
    const sampleSize =
      monitoringConfig.analytics.bottleneckDetection.sampleSize;

    // Check system bottlenecks
    const systemBottlenecks = this.detectSystemBottlenecks(
      metrics.system,
      sampleSize
    );
    bottlenecks.push(...systemBottlenecks);

    // Check database bottlenecks
    const databaseBottlenecks = this.detectDatabaseBottlenecks(
      metrics.database,
      sampleSize
    );
    bottlenecks.push(...databaseBottlenecks);

    // Check Redis bottlenecks
    const redisBottlenecks = this.detectRedisBottlenecks(
      metrics.redis,
      sampleSize
    );
    bottlenecks.push(...redisBottlenecks);

    // Check API bottlenecks
    const apiBottlenecks = this.detectApiBottlenecks(metrics.api, sampleSize);
    bottlenecks.push(...apiBottlenecks);

    return bottlenecks;
  }

  /**
   * Detect system bottlenecks
   */
  detectSystemBottlenecks(systemMetrics, sampleSize) {
    const bottlenecks = [];

    // Check CPU usage
    const cpuData = systemMetrics.cpu?.slice(-sampleSize) || [];
    if (cpuData.length >= sampleSize) {
      const avgCpu =
        cpuData.reduce((sum, m) => sum + m.value, 0) / cpuData.length;
      if (avgCpu > 80) {
        bottlenecks.push({
          type: 'system',
          component: 'cpu',
          severity: avgCpu > 90 ? 'critical' : 'high',
          value: avgCpu.toFixed(2),
          threshold: 80,
          description: `High CPU usage detected: ${avgCpu.toFixed(2)}%`,
          recommendation:
            'Consider scaling up CPU resources or optimizing CPU-intensive operations',
        });
      }
    }

    // Check memory usage
    const memoryData = systemMetrics.memory?.slice(-sampleSize) || [];
    if (memoryData.length >= sampleSize) {
      const avgMemory =
        memoryData.reduce((sum, m) => sum + m.value, 0) / memoryData.length;
      if (avgMemory > 80) {
        bottlenecks.push({
          type: 'system',
          component: 'memory',
          severity: avgMemory > 90 ? 'critical' : 'high',
          value: avgMemory.toFixed(2),
          threshold: 80,
          description: `High memory usage detected: ${avgMemory.toFixed(2)}%`,
          recommendation:
            'Check for memory leaks and optimize memory usage patterns',
        });
      }
    }

    // Check event loop lag
    const eventLoopData = systemMetrics.eventLoopLag?.slice(-sampleSize) || [];
    if (eventLoopData.length >= sampleSize) {
      const avgLag =
        eventLoopData.reduce((sum, m) => sum + m.value, 0) /
        eventLoopData.length;
      if (avgLag > 20) {
        bottlenecks.push({
          type: 'system',
          component: 'eventLoop',
          severity: avgLag > 50 ? 'critical' : 'high',
          value: avgLag.toFixed(2),
          threshold: 20,
          description: `High event loop lag detected: ${avgLag.toFixed(2)}ms`,
          recommendation:
            'Identify and optimize blocking operations in the event loop',
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Detect database bottlenecks
   */
  detectDatabaseBottlenecks(databaseMetrics, sampleSize) {
    const bottlenecks = [];

    // Check query times
    const queryData = databaseMetrics.queryTimes?.slice(-sampleSize) || [];
    if (queryData.length >= sampleSize) {
      const avgQueryTime =
        queryData.reduce((sum, m) => sum + m.value, 0) / queryData.length;
      const slowQueryCount = queryData.filter(
        (m) => m.value > monitoringConfig.database.slowQueryThreshold
      ).length;

      if (avgQueryTime > 200) {
        bottlenecks.push({
          type: 'database',
          component: 'queryPerformance',
          severity: avgQueryTime > 500 ? 'critical' : 'high',
          value: avgQueryTime.toFixed(2),
          threshold: 200,
          description: `Slow database queries detected: avg ${avgQueryTime.toFixed(2)}ms`,
          recommendation:
            'Optimize database queries, add indexes, and consider query caching',
        });
      }

      if (slowQueryCount > sampleSize * 0.1) {
        // More than 10% slow queries
        bottlenecks.push({
          type: 'database',
          component: 'slowQueries',
          severity: slowQueryCount > sampleSize * 0.2 ? 'critical' : 'high',
          value: slowQueryCount,
          threshold: sampleSize * 0.1,
          description: `High number of slow queries: ${slowQueryCount}/${queryData.length}`,
          recommendation:
            'Review and optimize slow queries, check database indexing',
        });
      }
    }

    // Check connection count
    if (databaseMetrics.connectionCount > 50) {
      bottlenecks.push({
        type: 'database',
        component: 'connections',
        severity: databaseMetrics.connectionCount > 80 ? 'critical' : 'high',
        value: databaseMetrics.connectionCount,
        threshold: 50,
        description: `High database connection count: ${databaseMetrics.connectionCount}`,
        recommendation:
          'Optimize connection pooling and review connection management',
      });
    }

    return bottlenecks;
  }

  /**
   * Detect Redis bottlenecks
   */
  detectRedisBottlenecks(redisMetrics, sampleSize) {
    const bottlenecks = [];

    // Check hit rate
    if (redisMetrics.hitRate > 0 && redisMetrics.hitRate < 85) {
      bottlenecks.push({
        type: 'redis',
        component: 'hitRate',
        severity: redisMetrics.hitRate < 80 ? 'critical' : 'high',
        value: redisMetrics.hitRate.toFixed(2),
        threshold: 85,
        description: `Low Redis hit rate: ${redisMetrics.hitRate.toFixed(2)}%`,
        recommendation: 'Review caching strategy and cache key patterns',
      });
    }

    // Check response times
    const responseTimeData =
      redisMetrics.responseTime?.slice(-sampleSize) || [];
    if (responseTimeData.length >= sampleSize) {
      const avgResponseTime =
        responseTimeData.reduce((sum, m) => sum + m.value, 0) /
        responseTimeData.length;
      if (avgResponseTime > 10) {
        bottlenecks.push({
          type: 'redis',
          component: 'responseTime',
          severity: avgResponseTime > 20 ? 'critical' : 'high',
          value: avgResponseTime.toFixed(2),
          threshold: 10,
          description: `Slow Redis response time: ${avgResponseTime.toFixed(2)}ms`,
          recommendation:
            'Optimize Redis operations and consider Redis clustering',
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Detect API bottlenecks
   */
  detectApiBottlenecks(apiMetrics, sampleSize) {
    const bottlenecks = [];

    // Check response times
    const responseTimeData = apiMetrics.responseTimes?.slice(-sampleSize) || [];
    if (responseTimeData.length >= sampleSize) {
      const avgResponseTime =
        responseTimeData.reduce((sum, m) => sum + m.value, 0) /
        responseTimeData.length;
      if (avgResponseTime > 1000) {
        bottlenecks.push({
          type: 'api',
          component: 'responseTime',
          severity: avgResponseTime > 2000 ? 'critical' : 'high',
          value: avgResponseTime.toFixed(2),
          threshold: 1000,
          description: `Slow API response times: avg ${avgResponseTime.toFixed(2)}ms`,
          recommendation:
            'Optimize API endpoints, implement caching, and review database queries',
        });
      }
    }

    // Check error rates
    if (apiMetrics.requestCount > 0) {
      const errorRate = (apiMetrics.errorCount / apiMetrics.requestCount) * 100;
      if (errorRate > 5) {
        bottlenecks.push({
          type: 'api',
          component: 'errorRate',
          severity: errorRate > 10 ? 'critical' : 'high',
          value: errorRate.toFixed(2),
          threshold: 5,
          description: `High API error rate: ${errorRate.toFixed(2)}%`,
          recommendation:
            'Investigate error patterns and fix underlying issues',
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Detect performance regression
   */
  detectRegression(
    metrics,
    timeWindow = monitoringConfig.analytics.regressionDetection.baselineWindow
  ) {
    const regressions = [];
    const currentTime = Date.now();
    const baselineStart = currentTime - timeWindow;
    const baselineEnd = currentTime - timeWindow / 2;
    const currentStart = baselineEnd;

    // Compare current performance with baseline
    const systemRegressions = this.detectMetricRegressions(
      metrics.system,
      baselineStart,
      baselineEnd,
      currentStart,
      currentTime
    );
    regressions.push(...systemRegressions);

    const databaseRegressions = this.detectMetricRegressions(
      metrics.database,
      baselineStart,
      baselineEnd,
      currentStart,
      currentTime
    );
    regressions.push(...databaseRegressions);

    const redisRegressions = this.detectMetricRegressions(
      metrics.redis,
      baselineStart,
      baselineEnd,
      currentStart,
      currentTime
    );
    regressions.push(...redisRegressions);

    const apiRegressions = this.detectMetricRegressions(
      metrics.api,
      baselineStart,
      baselineEnd,
      currentStart,
      currentTime
    );
    regressions.push(...apiRegressions);

    return regressions;
  }

  /**
   * Detect regression for specific metric category
   */
  detectMetricRegressions(
    categoryMetrics,
    baselineStart,
    baselineEnd,
    currentStart,
    currentEnd
  ) {
    const regressions = [];

    for (const [metricName, metricData] of Object.entries(categoryMetrics)) {
      if (!Array.isArray(metricData) || metricData.length < 10) {
        continue;
      }

      // Get baseline data
      const baselineData = metricData.filter(
        (m) => m.timestamp >= baselineStart && m.timestamp <= baselineEnd
      );

      // Get current data
      const currentData = metricData.filter(
        (m) => m.timestamp >= currentStart && m.timestamp <= currentEnd
      );

      if (baselineData.length < 5 || currentData.length < 5) {
        continue;
      }

      // Calculate averages
      const baselineAvg =
        baselineData.reduce((sum, m) => sum + m.value, 0) / baselineData.length;
      const currentAvg =
        currentData.reduce((sum, m) => sum + m.value, 0) / currentData.length;

      // Calculate regression percentage
      const regressionPercent =
        baselineAvg !== 0
          ? ((currentAvg - baselineAvg) / baselineAvg) * 100
          : 0;

      // Check if regression exceeds threshold
      if (Math.abs(regressionPercent) > this.regressionThreshold) {
        regressions.push({
          metric: metricName,
          baselineAvg: baselineAvg.toFixed(2),
          currentAvg: currentAvg.toFixed(2),
          regression: regressionPercent.toFixed(2),
          severity:
            Math.abs(regressionPercent) > this.regressionThreshold * 2
              ? 'critical'
              : 'warning',
          description: `${metricName} has ${regressionPercent > 0 ? 'degraded' : 'improved'} by ${Math.abs(regressionPercent).toFixed(2)}%`,
          recommendation: this.generateRegressionRecommendation(
            metricName,
            regressionPercent
          ),
        });
      }
    }

    return regressions;
  }

  /**
   * Generate regression recommendation
   */
  generateRegressionRecommendation(metricName, regressionPercent) {
    const recommendations = {
      cpu: 'Review recent code changes for CPU-intensive operations and optimize algorithms',
      memory: 'Check for memory leaks and optimize memory allocation patterns',
      eventLoopLag:
        'Identify blocking operations and optimize async processing',
      queryTimes: 'Review database queries and optimize slow operations',
      responseTime: 'Analyze endpoint performance and optimize bottlenecks',
      hitRate: 'Review caching strategy and optimize cache key patterns',
      errorRate: 'Investigate error patterns and fix underlying issues',
    };

    return (
      recommendations[metricName] ||
      'Review recent changes and analyze performance impact'
    );
  }

  /**
   * Generate performance optimization recommendations
   */
  generateRecommendations(metrics, bottlenecks, regressions) {
    const recommendations = [];
    const recommendationSet = new Set();

    // Add bottleneck-based recommendations
    bottlenecks.forEach((bottleneck) => {
      const key = `${bottleneck.type}-${bottleneck.component}`;
      if (!recommendationSet.has(key)) {
        recommendations.push({
          category: 'bottleneck',
          priority: this.getPriorityFromSeverity(bottleneck.severity),
          title: `Resolve ${bottleneck.component} bottleneck`,
          description: bottleneck.description,
          recommendation: bottleneck.recommendation,
          impact: this.estimateImpact(bottleneck),
        });
        recommendationSet.add(key);
      }
    });

    // Add regression-based recommendations
    regressions.forEach((regression) => {
      const key = `regression-${regression.metric}`;
      if (!recommendationSet.has(key)) {
        recommendations.push({
          category: 'regression',
          priority: this.getPriorityFromSeverity(regression.severity),
          title: `Address ${regression.metric} regression`,
          description: regression.description,
          recommendation: regression.recommendation,
          impact: this.estimateRegressionImpact(regression),
        });
        recommendationSet.add(key);
      }
    });

    // Add proactive recommendations based on metrics
    const proactiveRecommendations =
      this.generateProactiveRecommendations(metrics);
    proactiveRecommendations.forEach((rec) => {
      const key = `proactive-${rec.title}`;
      if (!recommendationSet.has(key)) {
        recommendations.push(rec);
        recommendationSet.add(key);
      }
    });

    // Sort by priority and impact
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return (b.impact || 0) - (a.impact || 0);
    });
  }

  /**
   * Generate proactive recommendations
   */
  generateProactiveRecommendations(metrics) {
    const recommendations = [];

    // Check for optimization opportunities
    if (metrics.api.requestCount > 1000) {
      const avgResponseTime =
        metrics.api.responseTimes.length > 0
          ? metrics.api.responseTimes.reduce((sum, m) => sum + m.value, 0) /
            metrics.api.responseTimes.length
          : 0;

      if (avgResponseTime > 200 && avgResponseTime < 500) {
        recommendations.push({
          category: 'optimization',
          priority: 'medium',
          title: 'Implement response caching',
          description: `API response times are moderate (${avgResponseTime.toFixed(2)}ms) with high traffic`,
          recommendation:
            'Implement response caching for frequently accessed endpoints',
          impact: 30,
        });
      }
    }

    // Check memory optimization opportunities
    const latestMemory =
      metrics.system.memory[metrics.system.memory.length - 1];
    if (latestMemory && latestMemory.value > 60 && latestMemory.value < 70) {
      recommendations.push({
        category: 'optimization',
        priority: 'low',
        title: 'Monitor memory usage trends',
        description: `Memory usage is approaching warning levels: ${latestMemory.value.toFixed(2)}%`,
        recommendation:
          'Monitor memory usage trends and consider optimization strategies',
        impact: 20,
      });
    }

    return recommendations;
  }

  /**
   * Get priority from severity
   */
  getPriorityFromSeverity(severity) {
    const severityMap = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
    };
    return severityMap[severity] || 'medium';
  }

  /**
   * Estimate impact of bottleneck
   */
  estimateImpact(bottleneck) {
    const baseImpacts = {
      critical: 80,
      high: 60,
      medium: 40,
      low: 20,
    };

    const componentMultipliers = {
      cpu: 1.2,
      memory: 1.1,
      eventLoop: 1.3,
      queryPerformance: 1.2,
      responseTime: 1.1,
      errorRate: 1.4,
    };

    const baseImpact = baseImpacts[bottleneck.severity] || 40;
    const multiplier = componentMultipliers[bottleneck.component] || 1.0;

    return Math.round(baseImpact * multiplier);
  }

  /**
   * Estimate impact of regression
   */
  estimateRegressionImpact(regression) {
    const baseImpact = Math.abs(parseFloat(regression.regression)) * 2;
    const severityMultiplier = regression.severity === 'critical' ? 1.5 : 1.0;

    return Math.round(baseImpact * severityMultiplier);
  }

  /**
   * Predict future performance based on trends
   */
  predictPerformance(metrics, predictionHorizon = 3600000) {
    // 1 hour default
    const predictions = {};
    const currentTime = Date.now();
    const futureTime = currentTime + predictionHorizon;

    // Predict system metrics
    predictions.system = this.predictMetrics(
      metrics.system,
      currentTime,
      futureTime
    );

    // Predict database metrics
    predictions.database = this.predictMetrics(
      metrics.database,
      currentTime,
      futureTime
    );

    // Predict Redis metrics
    predictions.redis = this.predictMetrics(
      metrics.redis,
      currentTime,
      futureTime
    );

    // Predict API metrics
    predictions.api = this.predictMetrics(metrics.api, currentTime, futureTime);

    return predictions;
  }

  /**
   * Predict specific metrics
   */
  predictMetrics(categoryMetrics, currentTime, futureTime) {
    const predictions = {};
    const timeDiff = futureTime - currentTime;

    for (const [metricName, metricData] of Object.entries(categoryMetrics)) {
      if (!Array.isArray(metricData) || metricData.length < 10) {
        continue;
      }

      // Calculate trend using linear regression
      const sortedData = metricData.sort((a, b) => a.timestamp - b.timestamp);
      const values = sortedData.map((d) => d.value);
      const timestamps = sortedData.map((d) => d.timestamp);

      const regression = this.linearRegression(timestamps, values);

      // Predict future value
      const predictedValue =
        regression.slope * futureTime + regression.intercept;

      // Calculate confidence based on R-squared and data recency
      const confidence = Math.max(0, Math.min(100, regression.r2 * 100));

      predictions[metricName] = {
        currentValue: values[values.length - 1],
        predictedValue: predictedValue.toFixed(2),
        change: (
          ((predictedValue - values[values.length - 1]) /
            values[values.length - 1]) *
          100
        ).toFixed(2),
        confidence: confidence.toFixed(2),
        trend:
          regression.slope > 0.01
            ? 'increasing'
            : regression.slope < -0.01
              ? 'decreasing'
              : 'stable',
      };
    }

    return predictions;
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(metrics) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {},
      trends: {},
      bottlenecks: [],
      regressions: [],
      recommendations: [],
      predictions: {},
    };

    // Analyze trends
    report.trends = this.analyzeTrends(metrics);

    // Detect bottlenecks
    report.bottlenecks = this.detectBottlenecks(metrics);

    // Detect regressions
    report.regressions = this.detectRegression(metrics);

    // Generate recommendations
    report.recommendations = this.generateRecommendations(
      metrics,
      report.bottlenecks,
      report.regressions
    );

    // Generate predictions
    report.predictions = this.predictPerformance(metrics);

    // Generate summary
    report.summary = {
      overallHealth: this.calculateOverallHealth(
        metrics,
        report.bottlenecks,
        report.regressions
      ),
      criticalIssues:
        report.bottlenecks.filter((b) => b.severity === 'critical').length +
        report.regressions.filter((r) => r.severity === 'critical').length,
      highIssues:
        report.bottlenecks.filter((b) => b.severity === 'high').length +
        report.regressions.filter((r) => r.severity === 'warning').length,
      totalRecommendations: report.recommendations.length,
    };

    return report;
  }

  /**
   * Calculate overall health score
   */
  calculateOverallHealth(metrics, bottlenecks, regressions) {
    let healthScore = 100;

    // Deduct points for bottlenecks
    bottlenecks.forEach((bottleneck) => {
      const deductions = {
        critical: 20,
        high: 15,
        medium: 10,
        low: 5,
      };
      healthScore -= deductions[bottleneck.severity] || 5;
    });

    // Deduct points for regressions
    regressions.forEach((regression) => {
      const deductions = {
        critical: 15,
        warning: 10,
      };
      healthScore -= deductions[regression.severity] || 5;
    });

    // Ensure score doesn't go below 0
    return Math.max(0, healthScore);
  }
}

// Create and export singleton instance
const performanceAnalytics = new PerformanceAnalytics();
export default performanceAnalytics;
