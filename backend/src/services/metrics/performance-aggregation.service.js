/**
 * Performance Aggregation Service
 *
 * This service handles performance data aggregation including:
 * - Real-time metric aggregation
 * - Historical data aggregation
 * - Multi-dimensional aggregation
 * - Performance summary generation
 */

import PerformanceMetric from '../../models/metrics/performance-metric.model.js';
import logger from '../../helpers/logger.js';

class PerformanceAggregationService {
  constructor() {
    this.aggregationIntervals = {
      '1m': 60000, // 1 minute
      '5m': 300000, // 5 minutes
      '15m': 900000, // 15 minutes
      '1h': 3600000, // 1 hour
      '6h': 21600000, // 6 hours
      '24h': 86400000, // 24 hours
    };

    this.isRunning = false;
    this.aggregationJobs = new Map();
  }

  /**
   * Start the aggregation service
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Performance aggregation service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting performance aggregation service');

    // Start aggregation jobs for different intervals
    this.startAggregationJob('1m', 60000); // Every minute
    this.startAggregationJob('5m', 300000); // Every 5 minutes
    this.startAggregationJob('15m', 900000); // Every 15 minutes
    this.startAggregationJob('1h', 3600000); // Every hour
    this.startAggregationJob('6h', 21600000); // Every 6 hours
    this.startAggregationJob('24h', 86400000); // Every 24 hours

    logger.info('Performance aggregation service started successfully');
  }

  /**
   * Stop the aggregation service
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Performance aggregation service is not running');
      return;
    }

    this.isRunning = false;

    // Stop all aggregation jobs
    for (const [interval, job] of this.aggregationJobs.entries()) {
      if (job) {
        clearInterval(job);
        logger.debug(`Stopped aggregation job for ${interval}`);
      }
    }
    this.aggregationJobs.clear();

    logger.info('Performance aggregation service stopped');
  }

  /**
   * Start aggregation job for specific interval
   */
  startAggregationJob(interval, runInterval) {
    const job = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.performAggregation(interval);
      } catch (error) {
        logger.error(`Error in aggregation job for ${interval}:`, error);
      }
    }, runInterval);

    this.aggregationJobs.set(interval, job);
    logger.debug(
      `Started aggregation job for ${interval} (runs every ${runInterval}ms)`
    );
  }

  /**
   * Perform aggregation for specific interval
   */
  async performAggregation(interval) {
    const timeWindow = this.aggregationIntervals[interval];
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindow);

    logger.debug(
      `Performing ${interval} aggregation from ${startTime} to ${endTime}`
    );

    try {
      // Use bulk operations for better performance
      const aggregationResult = await PerformanceMetric.aggregate([
        {
          $match: {
            timestamp: { $gte: startTime, $lte: endTime },
            aggregationLevel: 'raw',
          },
        },
        {
          $group: {
            _id: {
              category: '$category',
              name: '$name',
              unit: '$unit',
              tags: '$tags',
              instanceId: '$instanceId',
              timeBucket: {
                $dateTrunc: {
                  date: '$timestamp',
                  unit: interval,
                  binSize: 1,
                },
              },
            },
            avg: { $avg: '$value' },
            min: { $min: '$value' },
            max: { $max: '$value' },
            sum: { $sum: '$value' },
            count: { $sum: 1 },
            firstTimestamp: { $min: '$timestamp' },
            lastTimestamp: { $max: '$timestamp' },
          },
        },
        {
          $project: {
            _id: 0,
            metricId: {
              $concat: [
                '$_id.category',
                '-',
                '$_id.name',
                '-',
                { $toString: '$_id.timeBucket' },
                '-',
                interval,
              ],
            },
            category: '$_id.category',
            name: '$_id.name',
            value: '$avg',
            unit: '$_id.unit',
            timestamp: '$_id.timeBucket',
            tags: '$_id.tags',
            metadata: {
              aggregationLevel: interval,
              min: '$min',
              max: '$max',
              sum: '$sum',
              count: '$count',
              firstTimestamp: '$firstTimestamp',
              lastTimestamp: '$lastTimestamp',
            },
            aggregationLevel: interval,
            source: 'aggregation-service',
            instanceId: '$_id.instanceId',
            quality: 'good',
            confidence: {
              $multiply: [{ $divide: ['$count', 10] }, 100],
            },
          },
        },
      ]).allowDiskUse(true);

      // Use bulkWrite for better performance with large datasets
      if (aggregationResult.length > 0) {
        const bulkOps = aggregationResult.map((doc) => ({
          updateOne: {
            filter: { metricId: doc.metricId },
            update: { $set: doc },
            upsert: true,
          },
        }));

        await PerformanceMetric.bulkWrite(bulkOps, { ordered: false });
      }

      logger.debug(
        `${interval} aggregation completed: ${aggregationResult.length} metrics processed`
      );

      // Clean up old raw metrics
      await this.cleanupOldMetrics(interval);

      return aggregationResult.length;
    } catch (error) {
      logger.error(`Error performing ${interval} aggregation:`, error);
      throw error;
    }
  }

  /**
   * Get aggregated metrics for time range with pagination
   */
  async getAggregatedMetrics(
    category,
    startTime,
    endTime,
    interval = '1h',
    page = 1,
    limit = 1000
  ) {
    try {
      const metrics = await PerformanceMetric.findByCategoryAndTimeRange(
        category,
        startTime,
        endTime,
        interval,
        page,
        limit
      );

      return this.processAggregatedMetrics(metrics, interval);
    } catch (error) {
      logger.error('Error getting aggregated metrics:', error);
      throw error;
    }
  }

  /**
   * Get performance summary for time range with parallel processing
   */
  async getPerformanceSummary(
    startTime,
    endTime,
    categories = ['system', 'api', 'database', 'redis']
  ) {
    try {
      const summary = {
        timestamp: new Date().toISOString(),
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        },
        categories: {},
        overall: {
          health: 'unknown',
          score: 0,
          issues: [],
        },
      };

      // Process categories in parallel for better performance
      const categoryPromises = categories.map((category) =>
        this.getCategorySummary(category, startTime, endTime)
          .then((categorySummary) => ({ category, summary: categorySummary }))
          .catch((error) => ({ category, error }))
      );

      const categoryResults = await Promise.all(categoryPromises);

      // Process results
      for (const result of categoryResults) {
        if (result.error) {
          logger.error(
            `Error getting ${result.category} summary:`,
            result.error
          );
          summary.categories[result.category] = {
            category: result.category,
            error: result.error.message,
            health: 'error',
            score: 0,
            issues: [],
          };
        } else {
          summary.categories[result.category] = result.summary;
        }
      }

      // Calculate overall health and score
      summary.overall = this.calculateOverallHealth(summary.categories);

      return summary;
    } catch (error) {
      logger.error('Error getting performance summary:', error);
      throw error;
    }
  }

  /**
   * Get category-specific summary with optimized processing
   */
  async getCategorySummary(category, startTime, endTime) {
    try {
      // Use aggregation for better performance instead of fetching all documents
      const aggregationResult = await PerformanceMetric.aggregate([
        {
          $match: {
            category,
            timestamp: { $gte: startTime, $lte: endTime },
            aggregationLevel: 'raw',
          },
        },
        {
          $group: {
            _id: '$name',
            values: { $push: '$value' },
            timestamps: { $push: '$timestamp' },
            count: { $sum: 1 },
            sum: { $sum: '$value' },
            avg: { $avg: '$value' },
            min: { $min: '$value' },
            max: { $max: '$value' },
            latest: { $last: '$value' },
            latestTimestamp: { $max: '$timestamp' },
          },
        },
        {
          $project: {
            _id: 0,
            name: '$_id',
            values: 1,
            timestamps: 1,
            count: 1,
            sum: 1,
            avg: { $round: ['$avg', 2] },
            min: { $round: ['$min', 2] },
            max: { $round: ['$max', 2] },
            latest: { $round: ['$latest', 2] },
            latestTimestamp: 1,
          },
        },
      ]).allowDiskUse(true);

      const summary = {
        category,
        metrics: {},
        health: 'unknown',
        score: 0,
        issues: [],
      };

      // Process aggregated results
      for (const metricData of aggregationResult) {
        // Calculate percentiles from the values array
        const sortedValues = [...metricData.values].sort((a, b) => a - b);
        const p50 = sortedValues[Math.floor(sortedValues.length * 0.5)];
        const p90 = sortedValues[Math.floor(sortedValues.length * 0.9)];
        const p95 = sortedValues[Math.floor(sortedValues.length * 0.95)];
        const p99 = sortedValues[Math.floor(sortedValues.length * 0.99)];

        // Calculate trend
        const trend = this.calculateTrend(
          metricData.timestamps,
          metricData.values
        );

        summary.metrics[metricData.name] = {
          count: metricData.count,
          avg: metricData.avg,
          min: metricData.min,
          max: metricData.max,
          sum: metricData.sum,
          latest: metricData.latest,
          p50,
          p90,
          p95,
          p99,
          trend,
          unit: 'unknown', // Would need to be fetched separately if needed
        };
      }

      // Calculate category health and score
      const categoryHealth = this.calculateCategoryHealth(
        category,
        summary.metrics
      );
      summary.health = categoryHealth.status;
      summary.score = categoryHealth.score;
      summary.issues = categoryHealth.issues;

      return summary;
    } catch (error) {
      logger.error(`Error getting ${category} summary:`, error);
      throw error;
    }
  }

  /**
   * Calculate statistics for a metric
   */
  calculateMetricStats(metricData) {
    if (!metricData || metricData.length === 0) {
      return {
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        sum: 0,
        latest: 0,
        trend: 'unknown',
      };
    }

    const values = metricData.map((m) => m.value);
    const timestamps = metricData.map((m) => m.timestamp);

    // Basic statistics
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = values[values.length - 1];

    // Calculate percentiles
    const sortedValues = [...values].sort((a, b) => a - b);
    const p50 = sortedValues[Math.floor(count * 0.5)];
    const p90 = sortedValues[Math.floor(count * 0.9)];
    const p95 = sortedValues[Math.floor(count * 0.95)];
    const p99 = sortedValues[Math.floor(count * 0.99)];

    // Calculate trend
    const trend = this.calculateTrend(timestamps, values);

    return {
      count,
      avg,
      min,
      max,
      sum,
      latest,
      p50,
      p90,
      p95,
      p99,
      trend,
      unit: metricData[0]?.unit || 'unknown',
    };
  }

  /**
   * Calculate trend for metric data
   */
  calculateTrend(timestamps, values) {
    if (values.length < 2) {
      return 'unknown';
    }

    // Sort by timestamp
    const sortedData = timestamps
      .map((timestamp, index) => ({
        timestamp,
        value: values[index],
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    const sortedValues = sortedData.map((d) => d.value);
    const sortedTimestamps = sortedData.map((d) => d.timestamp);

    // Simple linear regression for trend
    const n = sortedValues.length;
    const sumX = sortedTimestamps.reduce((sum, ts) => sum + ts.getTime(), 0);
    const sumY = sortedValues.reduce((sum, val) => sum + val, 0);
    const sumXY = sortedTimestamps.reduce(
      (sum, ts, index) => sum + ts.getTime() * sortedValues[index],
      0
    );
    const sumXX = sortedTimestamps.reduce(
      (sum, ts) => sum + ts.getTime() * ts.getTime(),
      0
    );

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Determine trend direction
    if (Math.abs(slope) < 0.001) {
      return 'stable';
    } else if (slope > 0) {
      return 'increasing';
    } else {
      return 'decreasing';
    }
  }

  /**
   * Calculate category health
   */
  calculateCategoryHealth(category, metrics) {
    const healthThresholds = {
      system: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 80, critical: 95 },
        eventLoopLag: { warning: 20, critical: 50 },
      },
      api: {
        responseTime: { warning: 500, critical: 1000 },
        errorRate: { warning: 5, critical: 10 },
      },
      database: {
        queryTime: { warning: 200, critical: 500 },
        connectionCount: { warning: 50, critical: 80 },
      },
      redis: {
        hitRate: { warning: 85, critical: 80 },
        responseTime: { warning: 10, critical: 20 },
      },
    };

    const thresholds = healthThresholds[category] || {};
    let score = 100;
    const issues = [];

    // Check each metric against thresholds
    for (const [metricName, metricStats] of Object.entries(metrics)) {
      const threshold = thresholds[metricName];
      if (!threshold) continue;

      const latestValue = metricStats.latest;

      if (latestValue >= threshold.critical) {
        score -= 20;
        issues.push({
          metric: metricName,
          severity: 'critical',
          value: latestValue,
          threshold: threshold.critical,
        });
      } else if (latestValue >= threshold.warning) {
        score -= 10;
        issues.push({
          metric: metricName,
          severity: 'warning',
          value: latestValue,
          threshold: threshold.warning,
        });
      }

      // Consider trend in health calculation
      if (
        metricStats.trend === 'increasing' &&
        latestValue > threshold.warning
      ) {
        score -= 5;
        issues.push({
          metric: metricName,
          severity: 'trend',
          value: latestValue,
          trend: 'increasing',
        });
      }
    }

    // Determine overall health status
    let status = 'healthy';
    if (score < 50) {
      status = 'critical';
    } else if (score < 75) {
      status = 'warning';
    } else if (score < 90) {
      status = 'degraded';
    }

    return {
      status,
      score: Math.max(0, score),
      issues,
    };
  }

  /**
   * Calculate overall health from categories
   */
  calculateOverallHealth(categories) {
    let totalScore = 0;
    const totalIssues = [];
    let categoryCount = 0;

    for (const [category, categoryData] of Object.entries(categories)) {
      totalScore += categoryData.score || 0;
      totalIssues.push(...(categoryData.issues || []));
      categoryCount++;
    }

    const avgScore = categoryCount > 0 ? totalScore / categoryCount : 0;

    // Determine overall status
    let status = 'healthy';
    if (avgScore < 50) {
      status = 'critical';
    } else if (avgScore < 75) {
      status = 'warning';
    } else if (avgScore < 90) {
      status = 'degraded';
    }

    // Prioritize critical issues
    const criticalIssues = totalIssues.filter(
      (issue) => issue.severity === 'critical'
    );
    if (criticalIssues.length > 0) {
      status = 'critical';
    }

    return {
      health: status,
      score: Math.round(avgScore),
      issues: totalIssues,
      criticalIssues: criticalIssues.length,
    };
  }

  /**
   * Process aggregated metrics for response
   */
  processAggregatedMetrics(metrics, interval) {
    const processed = {
      interval,
      timestamp: new Date().toISOString(),
      metrics: {},
    };

    // Group metrics by name
    const metricsByName = {};
    metrics.forEach((metric) => {
      if (!metricsByName[metric.name]) {
        metricsByName[metric.name] = [];
      }
      metricsByName[metric.name].push(metric);
    });

    // Process each metric
    for (const [name, metricData] of Object.entries(metricsByName)) {
      processed.metrics[name] = this.calculateMetricStats(metricData);
    }

    return processed;
  }

  /**
   * Clean up old metrics based on aggregation interval
   */
  async cleanupOldMetrics(interval) {
    try {
      // Keep raw metrics for longer than the aggregation interval
      const retentionMultiplier = {
        '1m': 10, // Keep 10 minutes of raw data
        '5m': 30, // Keep 30 minutes of raw data
        '15m': 60, // Keep 1 hour of raw data
        '1h': 180, // Keep 3 hours of raw data
        '6h': 720, // Keep 12 hours of raw data
        '24h': 1440, // Keep 24 hours of raw data
      };

      const retentionMinutes = retentionMultiplier[interval] || 60;
      const cutoffTime = new Date(Date.now() - retentionMinutes * 60 * 1000);

      const result = await PerformanceMetric.deleteMany({
        aggregationLevel: 'raw',
        timestamp: { $lt: cutoffTime },
      });

      if (result.deletedCount > 0) {
        logger.debug(
          `Cleaned up ${result.deletedCount} old metrics for ${interval} aggregation`
        );
      }

      return result.deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old metrics:', error);
      throw error;
    }
  }

  /**
   * Get aggregation statistics
   */
  getAggregationStats() {
    const stats = {
      isRunning: this.isRunning,
      activeJobs: this.aggregationJobs.size,
      intervals: Object.keys(this.aggregationIntervals),
      lastAggregation: {},
    };

    // Get last aggregation time for each interval
    for (const interval of Object.keys(this.aggregationIntervals)) {
      // This would typically be stored in a database or cache
      // For now, we'll return placeholder data
      stats.lastAggregation[interval] = {
        time: new Date().toISOString(),
        status: 'completed',
        metricsProcessed: 0,
      };
    }

    return stats;
  }

  /**
   * Force aggregation for specific interval
   */
  async forceAggregation(interval) {
    if (!this.aggregationIntervals[interval]) {
      throw new Error(`Invalid aggregation interval: ${interval}`);
    }

    logger.info(`Forcing ${interval} aggregation`);
    return await this.performAggregation(interval);
  }

  /**
   * Get aggregation health status
   */
  getAggregationHealth() {
    const health = {
      status: 'healthy',
      issues: [],
      lastCheck: new Date().toISOString(),
    };

    // Check if aggregation service is running
    if (!this.isRunning) {
      health.status = 'error';
      health.issues.push('Aggregation service is not running');
      return health;
    }

    // Check if all jobs are active
    const expectedJobs = Object.keys(this.aggregationIntervals).length;
    if (this.aggregationJobs.size < expectedJobs) {
      health.status = 'warning';
      health.issues.push(
        `Only ${this.aggregationJobs.size} of ${expectedJobs} aggregation jobs are running`
      );
    }

    return health;
  }
}

// Create and export singleton instance
const performanceAggregationService = new PerformanceAggregationService();

export default performanceAggregationService;
