import mongoose from 'mongoose';

const scheduledExportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Schedule name is required'],
      trim: true,
      maxlength: [100, 'Schedule name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    format: {
      type: String,
      required: [true, 'Export format is required'],
      enum: ['csv', 'excel', 'pdf', 'json'],
      default: 'csv'
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
      default: 'daily'
    },
    cronExpression: {
      type: String,
      validate: {
        validator: function(v) {
          // Only required for custom frequency
          if (this.frequency === 'custom') {
            return v && v.trim().length > 0;
          }
          return true;
        },
        message: 'Cron expression is required for custom frequency'
      }
    },
    nextRun: {
      type: Date,
      required: true
    },
    lastRun: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    },
    fields: [{
      name: {
        type: String,
        required: true
      },
      label: {
        type: String,
        required: true
      },
      order: {
        type: Number,
        default: 0
      }
    }],
    includeRelated: {
      applications: {
        type: Boolean,
        default: false
      },
      installations: {
        type: Boolean,
        default: false
      },
      communications: {
        type: Boolean,
        default: false
      },
      documents: {
        type: Boolean,
        default: false
      }
    },
    filters: {
      status: [String],
      dateRange: {
        // For relative date ranges like "last_30_days"
        type: String
      },
      search: String,
      customFilters: mongoose.Schema.Types.Mixed
    },
    sortBy: {
      field: {
        type: String,
        default: 'createdAt'
      },
      order: {
        type: String,
        enum: ['asc', 'desc'],
        default: 'desc'
      }
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExportTemplate'
    },
    notifications: {
      email: {
        enabled: {
          type: Boolean,
          default: false
        },
        recipients: [String],
        subject: {
          type: String,
          default: 'Scheduled Export Completed'
        },
        body: {
          type: String,
          default: 'Your scheduled export is ready for download.'
        }
      },
      inApp: {
        enabled: {
          type: Boolean,
          default: true
        }
      }
    },
    retention: {
      keepCount: {
        type: Number,
        default: 10,
        min: 1,
        max: 100
      },
      keepDays: {
        type: Number,
        default: 30,
        min: 1,
        max: 365
      }
    },
    exportHistory: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExportHistory'
    }],
    runCount: {
      type: Number,
      default: 0
    },
    successCount: {
      type: Number,
      default: 0
    },
    failureCount: {
      type: Number,
      default: 0
    },
    lastStatus: {
      type: String,
      enum: ['success', 'failure', 'pending'],
      default: 'pending'
    },
    lastError: {
      message: String,
      code: String,
      occurredAt: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better performance
scheduledExportSchema.index({ createdBy: 1 });
scheduledExportSchema.index({ isActive: 1, nextRun: 1 });
scheduledExportSchema.index({ frequency: 1 });
scheduledExportSchema.index({ lastRun: 1 });
scheduledExportSchema.index({ template: 1 });

// Virtual for checking if schedule is due to run
scheduledExportSchema.virtual('isDue').get(function() {
  return this.isActive && new Date() >= this.nextRun;
});

// Virtual for success rate
scheduledExportSchema.virtual('successRate').get(function() {
  if (this.runCount === 0) return 0;
  return Math.round((this.successCount / this.runCount) * 100);
});

// Pre-save middleware to calculate next run time
scheduledExportSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('frequency')) {
    this.calculateNextRun();
  }
  next();
});

// Instance method to calculate next run time
scheduledExportSchema.methods.calculateNextRun = function() {
  const now = new Date();
  let nextRun = new Date(now);
  
  switch (this.frequency) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
    case 'quarterly':
      nextRun.setMonth(nextRun.getMonth() + 3);
      break;
    case 'yearly':
      nextRun.setFullYear(nextRun.getFullYear() + 1);
      break;
    case 'custom':
      // For custom frequency, the cronExpression should be used
      // This is a simplified calculation - in production, use a cron parser
      nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to 24 hours
      break;
  }
  
  this.nextRun = nextRun;
  return this.nextRun;
};

// Instance method to record a run
scheduledExportSchema.methods.recordRun = function(status, exportHistoryId = null, error = null) {
  this.lastRun = new Date();
  this.runCount += 1;
  this.lastStatus = status;
  
  if (status === 'success') {
    this.successCount += 1;
    this.lastError = undefined;
  } else if (status === 'failure' && error) {
    this.failureCount += 1;
    this.lastError = {
      message: error.message,
      code: error.code,
      occurredAt: new Date()
    };
  }
  
  if (exportHistoryId) {
    this.exportHistory.push(exportHistoryId);
  }
  
  // Calculate next run time
  this.calculateNextRun();
  
  return this.save();
};

// Instance method to get recent export history
scheduledExportSchema.methods.getRecentExports = function(limit = 10) {
  return this.model('ExportHistory')
    .find({ scheduledExport: this._id })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get due schedules
scheduledExportSchema.statics.getDueSchedules = function() {
  return this.find({
    isActive: true,
    nextRun: { $lte: new Date() }
  }).sort({ nextRun: 1 });
};

// Static method to get user's active schedules
scheduledExportSchema.statics.getActiveSchedules = function(userId) {
  return this.find({
    createdBy: userId,
    isActive: true
  }).sort({ nextRun: 1 });
};

// Static method to get schedule statistics
scheduledExportSchema.statics.getStatistics = function(userId) {
  return this.aggregate([
    { $match: { createdBy: userId } },
    {
      $group: {
        _id: '$frequency',
        count: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        avgSuccessRate: { $avg: { $divide: ['$successCount', '$runCount'] } },
        totalRuns: { $sum: '$runCount' }
      }
    }
  ]);
};

// Static method to cleanup old export history references
scheduledExportSchema.statics.cleanupHistory = async function(maxAge = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAge);
  
  const oldExports = await this.model('ExportHistory')
    .find({ createdAt: { $lt: cutoffDate } })
    .select('_id');
  
  const oldExportIds = oldExports.map(exp => exp._id);
  
  // Remove old export references from all schedules
  await this.updateMany(
    {},
    { $pull: { exportHistory: { $in: oldExportIds } } }
  );
  
  return oldExportIds.length;
};

const ScheduledExport = mongoose.model('ScheduledExport', scheduledExportSchema);

export default ScheduledExport;