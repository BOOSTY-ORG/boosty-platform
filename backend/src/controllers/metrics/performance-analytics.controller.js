/**
 * Performance Analytics Controller
 *
 * This controller handles all advanced analytics endpoints including:
 * - Trend analysis
 * - Bottleneck detection
 * - Predictive analytics
 * - Performance comparisons
 * - Optimization recommendations
 */

import { performance } from 'perf_hooks';
import performanceCollector from '../../monitoring/performance-collector.js';
import performanceAnalytics from '../../monitoring/performance-analytics.js';
import logger from '../../helpers/logger.js';

class PerformanceAnalyticsController {
  /**
   * Get performance trends analysis
   */
  async getTrendsAnalysis(req, res) {
    try {
      const startTime = performance.now();
      const {
        timeRange = '24h',
        metrics = 'all',
        granularity = 'auto',
        page = 1,
        limit = 1000,
      } = req.query;

      // Parse time range
      const timeRanges = {
        '1h': 3600000, // 1 hour
        '6h': 21600000, // 6 hours
        '24h': 86400000, // 24 hours
        '7d': 604800000, // 7 days
        '30d': 2592000000, // 30 days
      };

      const timeWindow = timeRanges[timeRange] || timeRanges['24h'];
      const endTime = Date.now();
      const analysisStartTime = endTime - timeWindow;

      // Check cache first
      const cacheKey = `trends:${timeRange}:${metrics}:${granularity}:${page}:${limit}`;
      const cachedResult = await this.getFromCache();

      if (cachedResult) {
        return res.json({
          ...cachedResult,
          meta: {
            ...cachedResult.meta,
            cached: true,
          },
        });
      }

      // Get metrics snapshot with pagination
      const metricsData = performanceCollector.getMetricsSnapshot(
        parseInt(page),
        parseInt(limit)
      );

      // Analyze trends in parallel for better performance
      const [trends, summary] = await Promise.all([
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(
              performanceAnalytics.analyzeTrends(metricsData, timeWindow)
            );
          }, 0);
        }),
        new Promise((resolve) => {
          setTimeout(() => {
            const filteredTrends =
              metrics === 'all'
                ? trends
                : Object.keys(trends)
                    .filter((category) => metrics.split(',').includes(category))
                    .reduce((obj, key) => {
                      obj[key] = trends[key];
                      return obj;
                    }, {});

            resolve(this.generateTrendsSummary(filteredTrends));
          }, 0);
        }),
      ]);

      const responseTime = performance.now() - startTime;

      const result = {
        success: true,
        data: {
          timeRange,
          metrics,
          granularity,
          startTime: new Date(analysisStartTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          trends,
          summary,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
            dataPoints: this.countTrendDataPoints(trends),
            page: parseInt(page),
            limit: parseInt(limit),
          },
        },
      };

      // Cache the result
      await this.setCache(cacheKey, result, 300000); // 5 minutes cache

      res.json(result);
    } catch (error) {
      logger.error('Error getting trends analysis:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TRENDS_ANALYSIS_ERROR',
          message: 'Failed to retrieve trends analysis',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get bottleneck detection analysis
   */
  async getBottlenecksAnalysis(req, res) {
    try {
      const startTime = performance.now();
      const {
        severity = 'all',
        category = 'all',
        includeRecommendations = true,
        page = 1,
        limit = 100,
      } = req.query;

      // Check cache first
      const cacheKey = `bottlenecks:${severity}:${category}:${includeRecommendations}:${page}:${limit}`;
      const cachedResult = await this.getFromCache();

      if (cachedResult) {
        return res.json({
          ...cachedResult,
          meta: {
            ...cachedResult.meta,
            cached: true,
          },
        });
      }

      // Get metrics snapshot with pagination
      const metricsData = performanceCollector.getMetricsSnapshot(
        parseInt(page),
        parseInt(limit)
      );

      // Process in parallel for better performance
      const [bottlenecks, , recommendations] = await Promise.all([
        new Promise((resolve) => {
          setTimeout(() => {
            const detected =
              performanceAnalytics.detectBottlenecks(metricsData);

            // Apply filters
            let filtered = detected;
            if (severity !== 'all') {
              filtered = filtered.filter((b) => b.severity === severity);
            }
            if (category !== 'all') {
              filtered = filtered.filter((b) => b.type === category);
            }

            resolve(filtered);
          }, 0);
        }),
        new Promise((resolve) => {
          setTimeout(() => {
            // This will be calculated after bottlenecks are filtered
            resolve(null);
          }, 0);
        }),
        new Promise((resolve) => {
          setTimeout(() => {
            if (includeRecommendations === 'true') {
              resolve(this.generateBottleneckRecommendations(bottlenecks));
            } else {
              resolve([]);
            }
          }, 0);
        }),
      ]);

      // Calculate summary after bottlenecks are filtered
      const finalSummary = this.generateBottlenecksSummary(bottlenecks);

      const responseTime = performance.now() - startTime;

      const result = {
        success: true,
        data: {
          bottlenecks,
          summary: finalSummary,
          recommendations,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
            filters: { severity, category },
            page: parseInt(page),
            limit: parseInt(limit),
          },
        },
      };

      // Cache the result for shorter time due to dynamic nature
      await this.setCache(cacheKey, result, 120000); // 2 minutes cache

      res.json(result);
    } catch (error) {
      logger.error('Error getting bottlenecks analysis:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BOTTLENECKS_ANALYSIS_ERROR',
          message: 'Failed to retrieve bottlenecks analysis',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get predictive analytics
   */
  async getPredictiveAnalytics(req, res) {
    try {
      const startTime = performance.now();
      const { horizon = '1h', confidence = '80', metrics = 'all' } = req.query;

      // Parse prediction horizon
      const horizons = {
        '30m': 1800000, // 30 minutes
        '1h': 3600000, // 1 hour
        '6h': 21600000, // 6 hours
        '24h': 86400000, // 24 hours
      };

      const predictionHorizon = horizons[horizon] || horizons['1h'];
      const minConfidence = parseInt(confidence) || 80;

      // Get metrics snapshot
      const metricsData = performanceCollector.getMetricsSnapshot();

      // Generate predictions
      const predictions = performanceAnalytics.predictPerformance(
        metricsData,
        predictionHorizon
      );

      // Filter by confidence level
      const filteredPredictions = {};
      for (const [category, categoryPredictions] of Object.entries(
        predictions
      )) {
        filteredPredictions[category] = {};
        for (const [metric, prediction] of Object.entries(
          categoryPredictions
        )) {
          if (parseFloat(prediction.confidence) >= minConfidence) {
            filteredPredictions[category][metric] = prediction;
          }
        }
      }

      // Filter by requested metrics
      if (metrics !== 'all') {
        const requestedMetrics = metrics.split(',');
        const finalPredictions = {};
        for (const category of requestedMetrics) {
          if (filteredPredictions[category]) {
            finalPredictions[category] = filteredPredictions[category];
          }
        }
        predictions.data = finalPredictions;
      } else {
        predictions.data = filteredPredictions;
      }

      // Generate prediction summary
      const summary = this.generatePredictionsSummary(predictions.data);

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          horizon,
          confidence: minConfidence,
          predictions: predictions.data,
          summary,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
            predictionTime: new Date(
              Date.now() + predictionHorizon
            ).toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error('Error getting predictive analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PREDICTIVE_ANALYTICS_ERROR',
          message: 'Failed to retrieve predictive analytics',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get performance comparisons
   */
  async getPerformanceComparisons(req, res) {
    try {
      const startTime = performance.now();
      const {
        baseline = '24h',
        comparison = '1h',
        metrics = 'all',
      } = req.query;

      // Parse time ranges
      const timeRanges = {
        '1h': 3600000,
        '6h': 21600000,
        '24h': 86400000,
        '7d': 604800000,
      };

      const baselineWindow = timeRanges[baseline] || timeRanges['24h'];
      const comparisonWindow = timeRanges[comparison] || timeRanges['1h'];

      const currentTime = Date.now();
      const comparisonStart = currentTime - comparisonWindow;
      const comparisonEnd = currentTime;
      const baselineStart = comparisonEnd - baselineWindow;
      const baselineEnd = comparisonStart;

      // Get metrics snapshot
      const metricsData = performanceCollector.getMetricsSnapshot();

      // Generate comparisons
      const comparisons = this.generateComparisons(
        metricsData,
        baselineStart,
        baselineEnd,
        comparisonStart,
        comparisonEnd,
        metrics
      );

      // Generate comparison summary
      const summary = this.generateComparisonSummary(comparisons);

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          baseline: {
            period: baseline,
            start: new Date(baselineStart).toISOString(),
            end: new Date(baselineEnd).toISOString(),
          },
          comparison: {
            period: comparison,
            start: new Date(comparisonStart).toISOString(),
            end: new Date(comparisonEnd).toISOString(),
          },
          comparisons,
          summary,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
          },
        },
      });
    } catch (error) {
      logger.error('Error getting performance comparisons:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PERFORMANCE_COMPARISONS_ERROR',
          message: 'Failed to retrieve performance comparisons',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(req, res) {
    try {
      const startTime = performance.now();
      const {
        priority = 'all',
        category = 'all',
        includeImpact = true,
      } = req.query;

      // Get metrics snapshot
      const metricsData = performanceCollector.getMetricsSnapshot();

      // Detect bottlenecks and regressions
      const bottlenecks = performanceAnalytics.detectBottlenecks(metricsData);
      const regressions = performanceAnalytics.detectRegression(metricsData);

      // Generate recommendations
      let recommendations = performanceAnalytics.generateRecommendations(
        metricsData,
        bottlenecks,
        regressions
      );

      // Filter by priority
      if (priority !== 'all') {
        recommendations = recommendations.filter(
          (r) => r.priority === priority
        );
      }

      // Filter by category
      if (category !== 'all') {
        recommendations = recommendations.filter(
          (r) => r.category === category
        );
      }

      // Add impact analysis if requested
      if (includeImpact === 'true') {
        recommendations = recommendations.map((rec) => ({
          ...rec,
          impact: this.calculateRecommendationImpact(rec),
          implementation: this.getImplementationDetails(rec),
        }));
      }

      // Generate recommendations summary
      const summary = this.generateRecommendationsSummary(recommendations);

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          recommendations,
          summary,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
            filters: { priority, category },
          },
        },
      });
    } catch (error) {
      logger.error('Error getting optimization recommendations:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'OPTIMIZATION_RECOMMENDATIONS_ERROR',
          message: 'Failed to retrieve optimization recommendations',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get comprehensive performance report
   */
  async getPerformanceReport(req, res) {
    try {
      const startTime = performance.now();
      const {
        timeRange = '24h',
        sections = 'all',
        format = 'json',
      } = req.query;

      // Get metrics snapshot
      const metricsData = performanceCollector.getMetricsSnapshot();

      // Generate comprehensive report
      const report =
        performanceAnalytics.generatePerformanceReport(metricsData);

      // Filter sections if requested
      if (sections !== 'all') {
        const requestedSections = sections.split(',');
        const filteredReport = {
          timestamp: report.timestamp,
          summary: report.summary,
        };

        for (const section of requestedSections) {
          if (report[section]) {
            filteredReport[section] = report[section];
          }
        }

        report.data = filteredReport;
      } else {
        report.data = report;
      }

      const responseTime = performance.now() - startTime;

      // Format response based on requested format
      if (format === 'csv') {
        // For CSV format, we would need to implement CSV conversion
        // For now, we'll return JSON
        return res.json({
          success: true,
          data: report.data,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
            format: 'json', // CSV conversion not implemented yet
          },
        });
      }

      res.json({
        success: true,
        data: report.data,
        meta: {
          generatedAt: new Date().toISOString(),
          responseTime: responseTime.toFixed(2),
          timeRange,
          sections,
        },
      });
    } catch (error) {
      logger.error('Error getting performance report:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PERFORMANCE_REPORT_ERROR',
          message: 'Failed to retrieve performance report',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Generate trends summary
   */
  generateTrendsSummary(trends) {
    const summary = {
      totalMetrics: 0,
      increasing: 0,
      decreasing: 0,
      stable: 0,
      significantChanges: 0,
    };

    for (const category of Object.values(trends)) {
      for (const trend of Object.values(category)) {
        summary.totalMetrics++;

        if (trend.direction === 'increasing') {
          summary.increasing++;
        } else if (trend.direction === 'decreasing') {
          summary.decreasing++;
        } else {
          summary.stable++;
        }

        if (Math.abs(parseFloat(trend.change)) > 10) {
          summary.significantChanges++;
        }
      }
    }

    return summary;
  }

  /**
   * Generate bottlenecks summary
   */
  generateBottlenecksSummary(bottlenecks) {
    const summary = {
      total: bottlenecks.length,
      critical: bottlenecks.filter((b) => b.severity === 'critical').length,
      high: bottlenecks.filter((b) => b.severity === 'high').length,
      medium: bottlenecks.filter((b) => b.severity === 'medium').length,
      low: bottlenecks.filter((b) => b.severity === 'low').length,
      byType: {},
      byComponent: {},
    };

    // Count by type and component
    bottlenecks.forEach((bottleneck) => {
      summary.byType[bottleneck.type] =
        (summary.byType[bottleneck.type] || 0) + 1;
      summary.byComponent[bottleneck.component] =
        (summary.byComponent[bottleneck.component] || 0) + 1;
    });

    return summary;
  }

  /**
   * Generate predictions summary
   */
  generatePredictionsSummary(predictions) {
    const summary = {
      totalPredictions: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      concerning: 0,
      improving: 0,
    };

    for (const category of Object.values(predictions)) {
      for (const prediction of Object.values(category)) {
        summary.totalPredictions++;

        const confidence = parseFloat(prediction.confidence);
        if (confidence >= 90) {
          summary.highConfidence++;
        } else if (confidence >= 70) {
          summary.mediumConfidence++;
        } else {
          summary.lowConfidence++;
        }

        const change = parseFloat(prediction.change);
        if (prediction.trend === 'increasing' && Math.abs(change) > 15) {
          summary.concerning++;
        } else if (prediction.trend === 'decreasing' && Math.abs(change) > 10) {
          summary.improving++;
        }
      }
    }

    return summary;
  }

  /**
   * Generate comparisons
   */
  generateComparisons(
    metricsData,
    baselineStart,
    baselineEnd,
    comparisonStart,
    comparisonEnd,
    metricsFilter
  ) {
    const comparisons = {};

    const categories =
      metricsFilter === 'all'
        ? ['system', 'database', 'redis', 'api']
        : metricsFilter.split(',');

    for (const category of categories) {
      if (!metricsData[category]) continue;

      comparisons[category] = {};

      for (const [metricName, metricData] of Object.entries(
        metricsData[category]
      )) {
        if (!Array.isArray(metricData)) continue;

        // Get baseline data
        const baselineData = metricData.filter(
          (m) => m.timestamp >= baselineStart && m.timestamp <= baselineEnd
        );

        // Get comparison data
        const comparisonData = metricData.filter(
          (m) => m.timestamp >= comparisonStart && m.timestamp <= comparisonEnd
        );

        if (baselineData.length === 0 || comparisonData.length === 0) continue;

        // Calculate averages
        const baselineAvg =
          baselineData.reduce((sum, m) => sum + m.value, 0) /
          baselineData.length;
        const comparisonAvg =
          comparisonData.reduce((sum, m) => sum + m.value, 0) /
          comparisonData.length;

        // Calculate change
        const change =
          baselineAvg !== 0
            ? ((comparisonAvg - baselineAvg) / baselineAvg) * 100
            : 0;

        comparisons[category][metricName] = {
          baseline: {
            average: baselineAvg.toFixed(2),
            min: Math.min(...baselineData.map((m) => m.value)),
            max: Math.max(...baselineData.map((m) => m.value)),
            dataPoints: baselineData.length,
          },
          comparison: {
            average: comparisonAvg.toFixed(2),
            min: Math.min(...comparisonData.map((m) => m.value)),
            max: Math.max(...comparisonData.map((m) => m.value)),
            dataPoints: comparisonData.length,
          },
          change: {
            percentage: change.toFixed(2),
            absolute: (comparisonAvg - baselineAvg).toFixed(2),
            direction:
              change > 5 ? 'increase' : change < -5 ? 'decrease' : 'stable',
          },
        };
      }
    }

    return comparisons;
  }

  /**
   * Generate comparison summary
   */
  generateComparisonSummary(comparisons) {
    const summary = {
      totalMetrics: 0,
      improved: 0,
      degraded: 0,
      stable: 0,
      significantChanges: 0,
    };

    for (const category of Object.values(comparisons)) {
      for (const comparison of Object.values(category)) {
        summary.totalMetrics++;

        if (comparison.change.direction === 'increase') {
          summary.degraded++;
        } else if (comparison.change.direction === 'decrease') {
          summary.improved++;
        } else {
          summary.stable++;
        }

        if (Math.abs(parseFloat(comparison.change.percentage)) > 10) {
          summary.significantChanges++;
        }
      }
    }

    return summary;
  }

  /**
   * Generate bottleneck recommendations
   */
  generateBottleneckRecommendations(bottlenecks) {
    const recommendations = [];

    bottlenecks.forEach((bottleneck) => {
      recommendations.push({
        category: 'bottleneck',
        priority: this.getPriorityFromSeverity(bottleneck.severity),
        title: `Resolve ${bottleneck.component} bottleneck`,
        description: bottleneck.description,
        recommendation: bottleneck.recommendation,
        impact: this.estimateBottleneckImpact(bottleneck),
      });
    });

    return recommendations;
  }

  /**
   * Calculate recommendation impact
   */
  calculateRecommendationImpact(recommendation) {
    // Simple impact calculation based on recommendation type and current metrics
    const baseImpacts = {
      critical: 80,
      high: 60,
      medium: 40,
      low: 20,
    };

    const categoryMultipliers = {
      system: 1.2,
      database: 1.1,
      api: 1.0,
      redis: 0.9,
    };

    const baseImpact = baseImpacts[recommendation.priority] || 40;
    const multiplier = categoryMultipliers[recommendation.category] || 1.0;

    return Math.round(baseImpact * multiplier);
  }

  /**
   * Get implementation details for recommendation
   */
  getImplementationDetails(recommendation) {
    const implementations = {
      memory: {
        complexity: 'medium',
        estimatedTime: '2-4 hours',
        risk: 'low',
        steps: [
          'Profile memory usage patterns',
          'Identify memory leaks',
          'Optimize data structures',
          'Implement garbage collection optimizations',
        ],
      },
      cpu: {
        complexity: 'high',
        estimatedTime: '4-8 hours',
        risk: 'medium',
        steps: [
          'Profile CPU-intensive operations',
          'Optimize algorithms',
          'Implement caching where appropriate',
          'Consider horizontal scaling',
        ],
      },
      database: {
        complexity: 'medium',
        estimatedTime: '2-6 hours',
        risk: 'medium',
        steps: [
          'Analyze slow query logs',
          'Add appropriate indexes',
          'Optimize query structure',
          'Implement query result caching',
        ],
      },
      api: {
        complexity: 'low',
        estimatedTime: '1-3 hours',
        risk: 'low',
        steps: [
          'Analyze endpoint performance',
          'Optimize response payloads',
          'Implement response caching',
          'Review error handling',
        ],
      },
    };

    return (
      implementations[recommendation.category] || {
        complexity: 'medium',
        estimatedTime: '2-4 hours',
        risk: 'medium',
        steps: [
          'Analyze the issue',
          'Develop solution',
          'Test in staging',
          'Deploy to production',
        ],
      }
    );
  }

  /**
   * Generate recommendations summary
   */
  generateRecommendationsSummary(recommendations) {
    const summary = {
      total: recommendations.length,
      critical: recommendations.filter((r) => r.priority === 'critical').length,
      high: recommendations.filter((r) => r.priority === 'high').length,
      medium: recommendations.filter((r) => r.priority === 'medium').length,
      low: recommendations.filter((r) => r.priority === 'low').length,
      byCategory: {},
      totalImpact: recommendations.reduce((sum, r) => sum + (r.impact || 0), 0),
    };

    // Count by category
    recommendations.forEach((rec) => {
      summary.byCategory[rec.category] =
        (summary.byCategory[rec.category] || 0) + 1;
    });

    return summary;
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
   * Estimate bottleneck impact
   */
  estimateBottleneckImpact(bottleneck) {
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
   * Count trend data points
   */
  countTrendDataPoints(trends) {
    let count = 0;
    for (const category of Object.values(trends)) {
      for (const trend of Object.values(category)) {
        count += trend.dataPoints || 0;
      }
    }
    return count;
  }

  /**
   * Get data from cache
   */
  async getFromCache() {
    // This would use the cache service in a real implementation
    // For now, return null to skip caching
    return null;
  }

  /**
   * Set data to cache
   */
  async setCache(key, data, ttl) {
    try {
      // This would use the cache service in a real implementation
      // For now, just log caching attempt
      logger.debug(`Caching data for key: ${key}, TTL: ${ttl}ms`);
    } catch (error) {
      logger.error('Error setting cache:', error);
    }
  }
}

export default new PerformanceAnalyticsController();
