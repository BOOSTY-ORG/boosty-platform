import mongoose from 'mongoose';

const exportHistorySchema = new mongoose.Schema(
  {
    exportId: {
      type: String,
      required: true,
      unique: true
    },
    filename: {
      type: String,
      required: true
    },
    format: {
      type: String,
      required: true,
      enum: ['csv', 'excel', 'pdf', 'json']
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    totalRecords: {
      type: Number,
      default: 0
    },
    processedRecords: {
      type: Number,
      default: 0
    },
    fields: [String],
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
        startDate: Date,
        endDate: Date
      },
      search: String,
      customFilters: mongoose.Schema.Types.Mixed
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExportTemplate'
    },
    filePath: {
      type: String
    },
    fileSize: {
      type: Number
    },
    downloadUrl: {
      type: String
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },
    downloadedAt: {
      type: Date
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    error: {
      message: String,
      stack: String,
      code: String
    },
    metadata: {
      processingTime: Number, // in milliseconds
      compressionRatio: Number,
      averageRecordSize: Number
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    completedAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    },
    scheduledExport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduledExport'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better performance
exportHistorySchema.index({ exportId: 1 });
exportHistorySchema.index({ createdBy: 1 });
exportHistorySchema.index({ status: 1 });
exportHistorySchema.index({ createdAt: -1 });
exportHistorySchema.index({ expiresAt: 1 });
exportHistorySchema.index({ template: 1 });
exportHistorySchema.index({ scheduledExport: 1 });

// Virtual for checking if export is expired
exportHistorySchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual for checking if export is downloadable
exportHistorySchema.virtual('isDownloadable').get(function() {
  return this.status === 'completed' && !this.isExpired;
});

// Pre-save middleware to set completedAt when status changes to completed
exportHistorySchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  if (this.isModified('status') && this.status === 'cancelled' && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }
  
  next();
});

// Instance method to update progress
exportHistorySchema.methods.updateProgress = function(processed, total) {
  this.processedRecords = processed;
  this.totalRecords = total;
  this.progress = total > 0 ? Math.round((processed / total) * 100) : 0;
  return this.save();
};

// Instance method to mark as downloaded
exportHistorySchema.methods.markAsDownloaded = function() {
  this.downloadedAt = new Date();
  this.downloadCount += 1;
  return this.save();
};

// Instance method to complete export
exportHistorySchema.methods.complete = function(filePath, fileSize, metadata = {}) {
  this.status = 'completed';
  this.filePath = filePath;
  this.fileSize = fileSize;
  this.progress = 100;
  this.processedRecords = this.totalRecords;
  this.completedAt = new Date();
  this.metadata = { ...this.metadata, ...metadata };
  return this.save();
};

// Instance method to fail export
exportHistorySchema.methods.fail = function(error) {
  this.status = 'failed';
  this.error = {
    message: error.message,
    stack: error.stack,
    code: error.code
  };
  return this.save();
};

// Static method to get active exports
exportHistorySchema.statics.getActiveExports = function(userId) {
  return this.find({
    createdBy: userId,
    status: { $in: ['pending', 'processing'] }
  }).sort({ createdAt: -1 });
};

// Static method to get completed exports
exportHistorySchema.statics.getCompletedExports = function(userId, limit = 50) {
  return this.find({
    createdBy: userId,
    status: 'completed'
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to cleanup expired exports
exportHistorySchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount;
};

// Static method to get export statistics
exportHistorySchema.statics.getStatistics = function(userId, dateRange = null) {
  const matchStage = { createdBy: userId };
  
  if (dateRange && dateRange.startDate && dateRange.endDate) {
    matchStage.createdAt = {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        avgProcessingTime: { $avg: '$metadata.processingTime' }
      }
    }
  ]);
};

const ExportHistory = mongoose.model('ExportHistory', exportHistorySchema);

export default ExportHistory;