import mongoose from 'mongoose';

const communicationSchema = new mongoose.Schema(
  {
    // Reference to the user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    
    // Communication details
    type: {
      type: String,
      required: [true, 'Communication type is required'],
      enum: ['email', 'sms', 'in_app', 'push_notification'],
      index: true
    },
    
    recipient: {
      type: String,
      required: [true, 'Recipient is required'],
      trim: true
    },
    
    subject: {
      type: String,
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true
    },
    
    // Communication metadata
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['welcome', 'application', 'kyc', 'payment', 'support', 'marketing', 'general'],
      index: true
    },
    
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true
    },
    
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'cancelled'],
      default: 'pending',
      index: true
    },
    
    // Template information
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunicationTemplate',
      index: true
    },
    
    template: {
      id: String,
      name: String,
      description: String
    },
    
    // Variables for template substitution
    variables: {
      type: Map,
      of: String,
      default: {}
    },
    
    // Scheduling
    scheduledAt: {
      type: Date,
      index: true
    },
    
    sentAt: {
      type: Date,
      index: true
    },
    
    deliveredAt: {
      type: Date,
      index: true
    },
    
    readAt: {
      type: Date,
      index: true
    },
    
    // Error handling
    error: {
      type: String,
      trim: true
    },
    
    retryCount: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Tracking and analytics
    opened: {
      type: Boolean,
      default: false
    },
    
    openedAt: {
      type: Date
    },
    
    clicks: {
      type: Number,
      default: 0
    },
    
    clickTracking: [{
      timestamp: Date,
      url: String,
      userAgent: String,
      ipAddress: String
    }],
    
    // Attachments
    attachments: [{
      name: String,
      type: String,
      size: Number,
      url: String,
      contentType: String
    }],
    
    // Response tracking
    response: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunicationResponse'
    },
    
    // Additional metadata
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Audit fields
    sentBy: {
      type: String,
      required: true,
      default: 'system'
    },
    
    source: {
      type: String,
      enum: ['manual', 'automated', 'bulk', 'template'],
      default: 'manual'
    },
    
    batchId: {
      type: String,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
communicationSchema.index({ userId: 1, createdAt: -1 });
communicationSchema.index({ userId: 1, status: 1 });
communicationSchema.index({ userId: 1, type: 1 });
communicationSchema.index({ userId: 1, category: 1 });
communicationSchema.index({ scheduledAt: 1, status: 1 });

// Virtuals
communicationSchema.virtual('isScheduled').get(function() {
  return this.scheduledAt && this.scheduledAt > new Date();
});

communicationSchema.virtual('isDelivered').get(function() {
  return this.status === 'delivered' || this.status === 'read';
});

communicationSchema.virtual('isFailed').get(function() {
  return this.status === 'failed';
});

communicationSchema.virtual('deliveryTime').get(function() {
  if (this.sentAt && this.deliveredAt) {
    return this.deliveredAt.getTime() - this.sentAt.getTime();
  }
  return null;
});

// Instance methods
communicationSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

communicationSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

communicationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  if (!this.opened) {
    this.opened = true;
    this.openedAt = new Date();
  }
  return this.save();
};

communicationSchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  this.error = error;
  this.retryCount += 1;
  return this.save();
};

communicationSchema.methods.addClick = function(clickData) {
  this.clicks += 1;
  this.clickTracking.push({
    timestamp: new Date(),
    ...clickData
  });
  return this.save();
};

// Static methods
communicationSchema.statics.getByUser = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = { createdAt: -1 },
    filters = {}
  } = options;

  const query = { userId };
  
  // Apply filters
  if (filters.type) {
    query.type = filters.type;
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.priority) {
    query.priority = filters.priority;
  }
  if (filters.dateRange) {
    const { start, end } = filters.dateRange;
    if (start || end) {
      query.createdAt = {};
      if (start) query.createdAt.$gte = new Date(start);
      if (end) query.createdAt.$lte = new Date(end);
    }
  }

  return this.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('templateId', 'name description');
};

communicationSchema.statics.getStats = function(userId, options = {}) {
  const {
    dateRange,
    category,
    type
  } = options;

  const matchStage = { userId };
  
  if (dateRange) {
    const { start, end } = dateRange;
    if (start || end) {
      matchStage.createdAt = {};
      if (start) matchStage.createdAt.$gte = new Date(start);
      if (end) matchStage.createdAt.$lte = new Date(end);
    }
  }
  
  if (category) {
    matchStage.category = category;
  }
  
  if (type) {
    matchStage.type = type;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        totalDelivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        totalRead: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
        totalFailed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        totalPending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        byType: {
          $push: {
            type: '$type',
            status: '$status'
          }
        },
        byCategory: {
          $push: {
            category: '$category',
            status: '$status'
          }
        },
        byPriority: {
          $push: {
            priority: '$priority',
            status: '$status'
          }
        }
      }
    },
    {
      $addFields: {
        deliveryRate: {
          $multiply: [
            { $divide: ['$totalDelivered', { $add: ['$totalSent', '$totalDelivered', '$totalRead', '$totalFailed'] }] },
            100
          ]
        },
        readRate: {
          $multiply: [
            { $divide: ['$totalRead', { $add: ['$totalSent', '$totalDelivered', '$totalRead', '$totalFailed'] }] },
            100
          ]
        }
      }
    }
  ]);
};

// toJSON transformation
communicationSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Communication = mongoose.model('Communication', communicationSchema);

export default Communication;