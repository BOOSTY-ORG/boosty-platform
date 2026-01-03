/**
 * Audit Log Model
 *
 * This model defines the schema for audit logs in the system.
 * It captures all relevant information about user actions, system events,
 * and security incidents for compliance and monitoring purposes.
 */

import mongoose from 'mongoose';
import { LOG_CATEGORIES } from '../config/auditLog.config.js';

const { Schema, model } = mongoose;

// Define the audit log schema
const auditLogSchema = new Schema(
  {
    // Timestamp when the event occurred
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Unique identifier for tracking related events
    correlationId: {
      type: String,
      required: true,
      index: true,
    },

    // User information
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userRole: {
      type: String,
      index: true,
    },
    userName: {
      type: String,
    },
    userEmail: {
      type: String,
    },

    // Action information
    action: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(LOG_CATEGORIES),
      required: true,
      index: true,
    },

    // Resource information
    resource: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      index: true,
    },
    resourceType: {
      type: String,
      index: true,
    },

    // Request information
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    },
    endpoint: {
      type: String,
      index: true,
    },
    httpStatus: {
      type: Number,
      index: true,
    },

    // Network information
    ipAddress: {
      type: String,
      index: true,
    },
    userAgent: {
      type: String,
    },
    sessionId: {
      type: String,
      index: true,
    },

    // Outcome information
    outcome: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'PARTIAL', 'TIMEOUT'],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'SECURITY', 'COMPLIANCE'],
      required: true,
      index: true,
    },

    // Additional context
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Error information (if applicable)
    error: {
      name: String,
      message: String,
      stack: String,
      code: String,
    },

    // Performance metrics
    duration: {
      type: Number, // in milliseconds
    },
    responseSize: {
      type: Number, // in bytes
    },

    // Source information
    source: {
      service: String,
      module: String,
      function: String,
      version: String,
    },

    // Security context
    securityContext: {
      isAuthenticated: Boolean,
      hasValidToken: Boolean,
      tokenExpiry: Date,
      permissions: [String],
      riskScore: Number,
    },

    // Data classification
    dataClassification: {
      type: String,
      enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'],
      default: 'INTERNAL',
    },

    // Compliance flags
    complianceFlags: {
      gdpr: Boolean,
      sox: Boolean,
      hipaa: Boolean,
      pci: Boolean,
    },

    // Processing flags
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    retentionExpiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    // Enable automatic timestamps
    timestamps: true,

    // Configure collection name
    collection: 'auditLogs',

    // Optimize for read performance
    collectionOptions: {
      readPreference: 'secondaryPreferred',
    },
  }
);

// Create indexes for efficient querying
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, severity: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, outcome: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ sessionId: 1, timestamp: -1 });
auditLogSchema.index({ correlationId: 1 });
auditLogSchema.index({ retentionExpiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance methods
auditLogSchema.methods.isHighRisk = function () {
  return (
    this.severity === 'SECURITY' ||
    this.severity === 'COMPLIANCE' ||
    this.outcome === 'FAILURE' ||
    (this.securityContext && this.securityContext.riskScore > 7)
  );
};

auditLogSchema.methods.isComplianceEvent = function () {
  return (
    this.severity === 'COMPLIANCE' ||
    (this.complianceFlags && Object.values(this.complianceFlags).some(Boolean))
  );
};

auditLogSchema.methods.getSummary = function () {
  return {
    id: this._id,
    timestamp: this.timestamp,
    correlationId: this.correlationId,
    userId: this.userId,
    action: this.action,
    category: this.category,
    resource: this.resource,
    outcome: this.outcome,
    severity: this.severity,
    message: this.message,
    isHighRisk: this.isHighRisk(),
    isComplianceEvent: this.isComplianceEvent(),
  };
};

// Static methods for common queries
auditLogSchema.statics.findByUser = function (userId, options = {}) {
  const {
    startDate,
    endDate,
    category,
    severity,
    limit = 100,
    skip = 0,
  } = options;

  const query = { userId };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  if (category) query.category = category;
  if (severity) query.severity = severity;

  return this.find(query).sort({ timestamp: -1 }).limit(limit).skip(skip);
};

auditLogSchema.statics.findByCorrelationId = function (correlationId) {
  return this.find({ correlationId }).sort({ timestamp: 1 });
};

auditLogSchema.statics.findSecurityEvents = function (options = {}) {
  const { startDate, endDate, limit = 100, skip = 0 } = options;

  const query = {
    $or: [
      { severity: 'SECURITY' },
      { severity: 'COMPLIANCE' },
      { outcome: 'FAILURE' },
    ],
  };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return this.find(query).sort({ timestamp: -1 }).limit(limit).skip(skip);
};

auditLogSchema.statics.getAnalytics = function (startDate, endDate) {
  const matchStage = {
    timestamp: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalLogs: { $sum: 1 },
        securityEvents: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'SECURITY'] }, 1, 0],
          },
        },
        failures: {
          $sum: {
            $cond: [{ $eq: ['$outcome', 'FAILURE'] }, 1, 0],
          },
        },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueIps: { $addToSet: '$ipAddress' },
        avgDuration: { $avg: '$duration' },
      },
    },
    {
      $project: {
        totalLogs: 1,
        securityEvents: 1,
        failures: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        uniqueIps: { $size: '$uniqueIps' },
        avgDuration: { $round: ['$avgDuration', 2] },
      },
    },
  ]);
};

// Pre-save middleware to set retention date
auditLogSchema.pre('save', function (next) {
  if (!this.retentionExpiresAt) {
    // Set retention based on severity
    const retentionDays = {
      DEBUG: 30,
      INFO: 180,
      WARN: 365,
      ERROR: 1095,
      SECURITY: 2555,
      COMPLIANCE: 2555,
    };

    const days = retentionDays[this.severity] || 365;
    this.retentionExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  next();
});

// Create and export the model
const AuditLog = model('AuditLog', auditLogSchema);

export default AuditLog;
