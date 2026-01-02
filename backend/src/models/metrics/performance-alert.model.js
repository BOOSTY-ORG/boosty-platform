/**
 * Performance Alert Model
 *
 * This model defines the schema for storing performance alerts including:
 * - Alert identification and metadata
 * - Alert conditions and thresholds
 * - Alert status and lifecycle
 * - Alert actions and acknowledgments
 */

import mongoose from 'mongoose';

const performanceAlertSchema = new mongoose.Schema(
  {
    // Alert identification
    alertId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },

    // Alert classification
    category: {
      type: String,
      required: true,
      enum: ['system', 'api', 'database', 'redis', 'custom'],
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['threshold', 'trend', 'anomaly', 'prediction'],
      index: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ['info', 'warning', 'critical'],
      index: true,
    },

    // Alert conditions
    metric: {
      type: String,
      required: true,
      index: true,
    },
    currentValue: {
      type: Number,
      required: true,
    },
    threshold: {
      type: Number,
      required: true,
    },
    operator: {
      type: String,
      enum: ['>', '<', '>=', '<=', '=', '!='],
      default: '>',
    },
    unit: {
      type: String,
      required: true,
    },

    // Timestamps
    triggeredAt: {
      type: Date,
      required: true,
      index: true,
    },
    acknowledgedAt: {
      type: Date,
      index: true,
    },
    resolvedAt: {
      type: Date,
      index: true,
    },
    lastOccurrence: {
      type: Date,
      default: Date.now,
    },
    duration: {
      type: Number, // Duration in seconds
    },

    // Alert status
    status: {
      type: String,
      required: true,
      enum: ['active', 'acknowledged', 'resolved', 'suppressed'],
      default: 'active',
      index: true,
    },

    // Alert lifecycle
    occurrences: {
      type: Number,
      default: 1,
      min: 1,
    },
    maxOccurrences: {
      type: Number,
      default: 10,
    },
    cooldownPeriod: {
      type: Number, // Cooldown period in milliseconds
      default: 300000, // 5 minutes
    },
    nextNotification: {
      type: Date,
    },

    // Alert acknowledgment
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgmentNote: {
      type: String,
    },

    // Alert resolution
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolutionNote: {
      type: String,
    },
    resolutionMethod: {
      type: String,
      enum: ['manual', 'automatic', 'threshold', 'timeout'],
    },

    // Alert configuration
    configId: {
      type: String,
      index: true,
    },
    configVersion: {
      type: Number,
      default: 1,
    },

    // Alert actions
    actions: [
      {
        type: {
          type: String,
          enum: ['email', 'webhook', 'sms', 'slack', 'pagerduty'],
        },
        status: {
          type: String,
          enum: ['pending', 'sent', 'failed', 'skipped'],
          default: 'pending',
        },
        sentAt: {
          type: Date,
        },
        response: {
          type: mongoose.Schema.Types.Mixed,
        },
        error: {
          type: String,
        },
      },
    ],

    // Alert context
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    tags: [
      {
        type: String,
        index: true,
      },
    ],

    // Alert metadata
    source: {
      type: String,
      default: 'performance-monitoring',
    },
    instanceId: {
      type: String,
      index: true,
    },
    environment: {
      type: String,
      default: 'production',
    },

    // Alert suppression
    suppressed: {
      type: Boolean,
      default: false,
    },
    suppressionReason: {
      type: String,
    },
    suppressedUntil: {
      type: Date,
    },
    suppressedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    // Collection options
    collection: 'performance_alerts',
    timestamps: true,

    // Indexes for efficient querying
    index: [
      { status: 1, triggeredAt: -1 },
      { category: 1, severity: 1, status: 1 },
      { metric: 1, triggeredAt: -1 },
      { configId: 1, triggeredAt: -1 },
      { tags: 1, triggeredAt: -1 },
      { triggeredAt: -1, status: 1 },
      { severity: 1, status: 1, triggeredAt: -1 },
      { acknowledgedBy: 1, acknowledgedAt: -1 },
      { resolvedBy: 1, resolvedAt: -1 },
      { suppressed: 1, suppressedUntil: -1 },
      { nextNotification: 1 },
    ],

    // TTL for resolved alerts
    ttl: function () {
      // Keep resolved alerts for 90 days
      if (this.status === 'resolved') {
        return 90 * 24 * 60 * 60; // 90 days in seconds
      }
      // Keep active alerts indefinitely
      return 0;
    },
  }
);

// Static methods for common queries
performanceAlertSchema.statics = {
  /**
   * Find active alerts with pagination
   */
  findActive: function (filters = {}, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    return this.find({
      status: 'active',
      suppressed: { $ne: true },
      ...filters,
    })
      .sort({ severity: -1, triggeredAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  /**
   * Find alerts by category and severity with pagination
   */
  findByCategoryAndSeverity: function (
    category,
    severity,
    status = 'active',
    page = 1,
    limit = 50
  ) {
    const skip = (page - 1) * limit;
    return this.find({
      category,
      severity,
      status,
      suppressed: { $ne: true },
    })
      .sort({ triggeredAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  /**
   * Find alerts by time range with pagination
   */
  findByTimeRange: function (
    startTime,
    endTime,
    status = null,
    page = 1,
    limit = 100
  ) {
    const skip = (page - 1) * limit;
    const query = {
      triggeredAt: { $gte: startTime, $lte: endTime },
    };

    if (status) {
      query.status = status;
    }

    return this.find(query)
      .sort({ triggeredAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  /**
   * Find alerts by metric with pagination
   */
  findByMetric: function (metric, status = 'active', page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    return this.find({
      metric,
      status,
      suppressed: { $ne: true },
    })
      .sort({ triggeredAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  /**
   * Get alert statistics with optimized aggregation
   */
  getStatistics: function (timeRange = null) {
    const matchStage = {};

    if (timeRange) {
      matchStage.triggeredAt = {
        $gte: new Date(Date.now() - timeRange),
      };
    }

    return this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
          acknowledged: {
            $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          critical: {
            $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] },
          },
          warning: {
            $sum: { $cond: [{ $eq: ['$severity', 'warning'] }, 1, 0] },
          },
          info: {
            $sum: { $cond: [{ $eq: ['$severity', 'info'] }, 1, 0] },
          },
          // Use $facet for parallel aggregation
          categories: { $addToSet: '$category' },
          metrics: { $addToSet: '$metric' },
        },
      },
      {
        $lookup: {
          from: 'performance_alerts',
          let: { timeRange: matchStage.triggeredAt },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $gte: ['$triggeredAt', '$$timeRange.$gte'] },
                    { $lte: ['$triggeredAt', new Date()] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                critical: {
                  $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] },
                },
                warning: {
                  $sum: { $cond: [{ $eq: ['$severity', 'warning'] }, 1, 0] },
                },
              },
            },
          ],
          as: 'categoryDetails',
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          active: 1,
          acknowledged: 1,
          resolved: 1,
          critical: 1,
          warning: 1,
          info: 1,
          categoryStats: {
            $arrayToObject: {
              $map: {
                input: '$categories',
                as: 'cat',
                in: {
                  k: '$$cat',
                  v: {
                    $let: {
                      vars: {
                        catDetail: {
                          $arrayToObject: {
                            $filter: {
                              input: '$categoryDetails',
                              cond: { $eq: ['$$this._id', '$$cat'] },
                            },
                          },
                        },
                      },
                      in: {
                        $let: {
                          vars: {
                            detail: {
                              $arrayElemAt: [
                                { $objectToArray: '$$catDetail' },
                                0,
                              ],
                            },
                          },
                          in: {
                            total: { $ifNull: ['$$detail.v.count', 0] },
                            critical: { $ifNull: ['$$detail.v.critical', 0] },
                            warning: { $ifNull: ['$$detail.v.warning', 0] },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ]).allowDiskUse(true);
  },

  /**
   * Find alerts requiring attention
   */
  findAlertsRequiringAttention: function () {
    return this.find({
      $or: [
        { status: 'active' },
        {
          status: 'acknowledged',
          acknowledgedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Acknowledged more than 24h ago
        },
      ],
      suppressed: { $ne: true },
    }).sort({ severity: -1, triggeredAt: -1 });
  },

  /**
   * Clean up old resolved alerts
   */
  cleanupOldAlerts: function (retentionDays = 90) {
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    );

    return this.deleteMany({
      status: 'resolved',
      resolvedAt: { $lt: cutoffDate },
    });
  },

  /**
   * Find similar alerts
   */
  findSimilarAlerts: function (metric, threshold, timeWindow = 3600000) {
    // 1 hour default
    const cutoffTime = new Date(Date.now() - timeWindow);

    return this.find({
      metric,
      threshold,
      triggeredAt: { $gte: cutoffTime },
      status: { $in: ['active', 'acknowledged'] },
    }).sort({ triggeredAt: -1 });
  },
};

// Instance methods
performanceAlertSchema.methods = {
  /**
   * Acknowledge alert
   */
  acknowledge: function (userId, note = '') {
    this.status = 'acknowledged';
    this.acknowledgedBy = userId;
    this.acknowledgmentNote = note;
    this.acknowledgedAt = new Date();
    return this.save();
  },

  /**
   * Resolve alert
   */
  resolve: function (userId, note = '', method = 'manual') {
    this.status = 'resolved';
    this.resolvedBy = userId;
    this.resolutionNote = note;
    this.resolutionMethod = method;
    this.resolvedAt = new Date();

    if (this.triggeredAt) {
      this.duration = Math.floor(
        (this.resolvedAt.getTime() - this.triggeredAt.getTime()) / 1000
      );
    }

    return this.save();
  },

  /**
   * Suppress alert
   */
  suppress: function (userId, reason = '', duration = 3600000) {
    // 1 hour default
    this.suppressed = true;
    this.suppressionReason = reason;
    this.suppressedBy = userId;
    this.suppressedUntil = new Date(Date.now() + duration);
    return this.save();
  },

  /**
   * Check if alert is suppressed
   */
  isSuppressed: function () {
    return (
      this.suppressed &&
      (!this.suppressedUntil || this.suppressedUntil > new Date())
    );
  },

  /**
   * Check if alert can be notified
   */
  canNotify: function () {
    if (this.isSuppressed()) {
      return false;
    }

    if (!this.nextNotification) {
      return true;
    }

    return new Date() >= this.nextNotification;
  },

  /**
   * Update next notification time
   */
  updateNextNotification: function () {
    this.nextNotification = new Date(Date.now() + this.cooldownPeriod);
    return this.save();
  },

  /**
   * Increment occurrence count
   */
  incrementOccurrence: function () {
    this.occurrences += 1;
    this.lastOccurrence = new Date();

    // Check if max occurrences reached
    if (this.occurrences >= this.maxOccurrences) {
      this.status = 'suppressed';
      this.suppressionReason = 'Max occurrences reached';
    }

    return this.save();
  },

  /**
   * Get alert age in seconds
   */
  getAgeInSeconds: function () {
    return Math.floor((Date.now() - this.triggeredAt.getTime()) / 1000);
  },

  /**
   * Get formatted duration
   */
  getFormattedDuration: function () {
    if (!this.duration) {
      return null;
    }

    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = this.duration % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  },

  /**
   * Check if alert is stale
   */
  isStale: function (staleThreshold = 86400000) {
    // 24 hours default
    return (
      this.status === 'active' &&
      Date.now() - this.triggeredAt.getTime() > staleThreshold
    );
  },
};

// Virtual fields
performanceAlertSchema.virtual('isAcknowledged').get(function () {
  return this.status === 'acknowledged';
});

performanceAlertSchema.virtual('isResolved').get(function () {
  return this.status === 'resolved';
});

performanceAlertSchema.virtual('isActive').get(function () {
  return this.status === 'active' && !this.isSuppressed();
});

// Pre-save middleware
performanceAlertSchema.pre('save', function (next) {
  // Ensure alertId is set
  if (!this.alertId) {
    this.alertId = `${this.category}-${this.metric}-${this.triggeredAt.getTime()}`;
  }

  // Update last occurrence if triggered
  if (this.isModified('status') && this.status === 'active') {
    this.lastOccurrence = new Date();
  }

  next();
});

// Post-save middleware
performanceAlertSchema.post('save', function (doc) {
  // Log critical alerts
  if (doc.severity === 'critical' && doc.status === 'active') {
    console.warn(`Critical alert triggered: ${doc.title} - ${doc.description}`);
  }
});

const PerformanceAlert = mongoose.model(
  'PerformanceAlert',
  performanceAlertSchema
);

export default PerformanceAlert;
