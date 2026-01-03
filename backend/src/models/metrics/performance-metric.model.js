/**
 * Performance Metric Model
 *
 * This model defines the schema for storing performance metrics data including:
 * - System metrics (CPU, memory, event loop)
 * - Database metrics (query times, connections)
 * - Redis metrics (hit rate, response times)
 * - API metrics (response times, error rates)
 */

import mongoose from 'mongoose';

const performanceMetricSchema = new mongoose.Schema(
  {
    // Metric identification
    metricId: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['system', 'database', 'redis', 'api'],
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },

    // Metric data
    value: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },

    // Timestamps
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    collectedAt: {
      type: Date,
      default: Date.now,
    },

    // Additional metadata
    tags: [
      {
        type: String,
        index: true,
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Aggregation data
    aggregationLevel: {
      type: String,
      enum: ['raw', '1m', '5m', '15m', '1h', '6h', '24h'],
      default: 'raw',
      index: true,
    },

    // Source information
    source: {
      type: String,
      default: 'performance-collector',
    },
    instanceId: {
      type: String,
      index: true,
    },

    // Data quality
    quality: {
      type: String,
      enum: ['good', 'fair', 'poor'],
      default: 'good',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
  },
  {
    // Collection options
    collection: 'performance_metrics',
    timestamps: true,

    // Indexes for efficient querying
    index: [
      { category: 1, name: 1, timestamp: -1 },
      { metricId: 1, timestamp: -1 },
      { timestamp: -1, aggregationLevel: 1 },
      { tags: 1, timestamp: -1 },
      { category: 1, aggregationLevel: 1, timestamp: -1 },
      { name: 1, aggregationLevel: 1, timestamp: -1 },
      { instanceId: 1, timestamp: -1 },
      { source: 1, timestamp: -1 },
    ],

    // TTL for data retention
    ttl: 2592000, // 30 days in seconds
  }
);

// Static methods for common queries
performanceMetricSchema.statics = {
  /**
   * Find metrics by category and time range with pagination
   */
  findByCategoryAndTimeRange: function (
    category,
    startTime,
    endTime,
    aggregationLevel = 'raw',
    page = 1,
    limit = 1000
  ) {
    const skip = (page - 1) * limit;
    return this.find({
      category,
      timestamp: { $gte: startTime, $lte: endTime },
      aggregationLevel,
    })
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Return plain JavaScript objects for better performance
  },

  /**
   * Find metrics by name and time range with pagination
   */
  findByNameAndTimeRange: function (
    name,
    startTime,
    endTime,
    aggregationLevel = 'raw',
    page = 1,
    limit = 1000
  ) {
    const skip = (page - 1) * limit;
    return this.find({
      name,
      timestamp: { $gte: startTime, $lte: endTime },
      aggregationLevel,
    })
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  /**
   * Find metrics by tags and time range with pagination
   */
  findByTagsAndTimeRange: function (
    tags,
    startTime,
    endTime,
    aggregationLevel = 'raw',
    page = 1,
    limit = 1000
  ) {
    const skip = (page - 1) * limit;
    return this.find({
      tags: { $in: tags },
      timestamp: { $gte: startTime, $lte: endTime },
      aggregationLevel,
    })
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  /**
   * Get latest metric value with lean query
   */
  getLatestValue: function (category, name, aggregationLevel = 'raw') {
    return this.findOne({
      category,
      name,
      aggregationLevel,
    })
      .sort({ timestamp: -1 })
      .lean();
  },

  /**
   * Get aggregated statistics for time range with optimized pipeline
   */
  getAggregatedStats: function (
    category,
    name,
    startTime,
    endTime,
    aggregationInterval = '1h'
  ) {
    return this.aggregate([
      {
        $match: {
          category,
          name,
          timestamp: { $gte: startTime, $lte: endTime },
        },
      },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: '$timestamp',
              unit: aggregationInterval,
              binSize: 1,
            },
          },
          avg: { $avg: '$value' },
          min: { $min: '$value' },
          max: { $max: '$value' },
          count: { $sum: 1 },
          // Add sum for additional calculations
          sum: { $sum: '$value' },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        // Add computed fields for better performance in client
        $project: {
          _id: 0,
          timestamp: '$_id',
          avg: { $round: ['$avg', 2] },
          min: { $round: ['$min', 2] },
          max: { $round: ['$max', 2] },
          count: 1,
          sum: { $round: ['$sum', 2] },
          // Calculate range
          range: { $subtract: ['$max', '$min'] },
        },
      },
    ]).allowDiskUse(true); // Allow disk use for large aggregations
  },

  /**
   * Get percentile values for time range with optimized approach
   */
  getPercentiles: function (
    category,
    name,
    startTime,
    endTime,
    percentiles = [50, 90, 95, 99]
  ) {
    return this.aggregate([
      {
        $match: {
          category,
          name,
          timestamp: { $gte: startTime, $lte: endTime },
        },
      },
      // Sort values before grouping to improve performance
      { $sort: { value: 1 } },
      {
        $group: {
          _id: null,
          values: { $push: '$value' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          count: 1,
          percentiles: percentiles.map((p) => ({
            percentile: p,
            // Use approximate percentiles for better performance on large datasets
            value: {
              $let: {
                vars: {
                  index: {
                    $multiply: [{ $divide: [{ $size: '$values' }, 100] }, p],
                  },
                },
                in: {
                  $arrayElemAt: [
                    '$values',
                    { $floor: { $subtract: ['$$index', 1] } },
                  ],
                },
              },
            },
          })),
        },
      },
    ]).allowDiskUse(true);
  },

  /**
   * Clean up old metrics based on retention policy
   */
  cleanupOldMetrics: function (retentionDays = 30) {
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    );

    return this.deleteMany({
      timestamp: { $lt: cutoffDate },
      aggregationLevel: 'raw',
    });
  },

  /**
   * Create aggregated metrics from raw data
   */
  createAggregatedMetrics: function (aggregationLevel, timeWindow) {
    const aggregationMap = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '6h': 21600000,
      '24h': 86400000,
    };

    const intervalMs = aggregationMap[aggregationLevel];
    if (!intervalMs) {
      throw new Error(`Invalid aggregation level: ${aggregationLevel}`);
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindow);

    return this.aggregate([
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
                unit: aggregationLevel,
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
              aggregationLevel,
            ],
          },
          category: '$_id.category',
          name: '$_id.name',
          value: '$avg',
          unit: '$_id.unit',
          timestamp: '$_id.timeBucket',
          tags: '$_id.tags',
          metadata: {
            aggregationLevel,
            min: '$min',
            max: '$max',
            sum: '$sum',
            count: '$count',
            firstTimestamp: '$firstTimestamp',
            lastTimestamp: '$lastTimestamp',
          },
          aggregationLevel,
          source: 'aggregation-service',
          instanceId: '$_id.instanceId',
          quality: 'good',
          confidence: {
            $multiply: [{ $divide: ['$count', 10] }, 100],
          },
        },
      },
      {
        $out: 'performance_metrics',
      },
    ]);
  },
};

// Instance methods
performanceMetricSchema.methods = {
  /**
   * Get formatted value with unit
   */
  getFormattedValue: function () {
    return `${this.value} ${this.unit}`;
  },

  /**
   * Check if metric is within threshold
   */
  isWithinThreshold: function (warningThreshold, criticalThreshold) {
    if (this.value >= criticalThreshold) {
      return { status: 'critical', threshold: criticalThreshold };
    } else if (this.value >= warningThreshold) {
      return { status: 'warning', threshold: warningThreshold };
    }
    return { status: 'normal', threshold: null };
  },

  /**
   * Get age of metric in seconds
   */
  getAgeInSeconds: function () {
    return Math.floor((Date.now() - this.timestamp.getTime()) / 1000);
  },
};

// Pre-save middleware
performanceMetricSchema.pre('save', function (next) {
  // Ensure metricId is set
  if (!this.metricId) {
    this.metricId = `${this.category}-${this.name}-${this.timestamp.getTime()}`;
  }

  // Set quality based on confidence
  if (this.confidence >= 90) {
    this.quality = 'good';
  } else if (this.confidence >= 70) {
    this.quality = 'fair';
  } else {
    this.quality = 'poor';
  }

  next();
});

// Post-save middleware
performanceMetricSchema.post('save', function (doc) {
  // Log when critical metrics are saved
  if (
    doc.category === 'system' &&
    (doc.name === 'cpu' || doc.name === 'memory')
  ) {
    if (doc.value > 90) {
      console.warn(`Critical system metric saved: ${doc.name} = ${doc.value}`);
    }
  }
});

const PerformanceMetric = mongoose.model(
  'PerformanceMetric',
  performanceMetricSchema
);

export default PerformanceMetric;
