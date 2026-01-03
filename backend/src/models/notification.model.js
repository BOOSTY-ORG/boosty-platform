import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    // Reference to the user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    // Notification details
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: ['email', 'sms', 'in_app', 'push_notification'],
      index: true,
    },

    channels: [
      {
        type: String,
        enum: ['email', 'sms', 'in_app', 'push_notification'],
      },
    ],

    recipient: {
      email: String,
      phone: String,
      deviceId: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    // Content
    subject: {
      type: String,
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },

    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
    },

    htmlContent: String, // For email notifications

    // Notification metadata
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'welcome',
        'application',
        'kyc',
        'payment',
        'support',
        'marketing',
        'general',
        'alert',
        'reminder',
      ],
      index: true,
    },

    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },

    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: [
        'pending',
        'queued',
        'processing',
        'sent',
        'delivered',
        'read',
        'failed',
        'cancelled',
      ],
      default: 'pending',
      index: true,
    },

    // Template information
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
      index: true,
    },

    // Variables for template substitution
    variables: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Scheduling
    scheduledAt: {
      type: Date,
      index: true,
    },

    sentAt: {
      type: Date,
      index: true,
    },

    deliveredAt: {
      type: Date,
      index: true,
    },

    readAt: {
      type: Date,
      index: true,
    },

    // Queue information
    queueJobId: String,
    queueName: String,
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
    },

    // Error handling
    error: {
      message: String,
      code: String,
      details: mongoose.Schema.Types.Mixed,
    },

    lastRetryAt: Date,
    nextRetryAt: Date,

    // Delivery tracking per channel
    deliveryStatus: [
      {
        channel: {
          type: String,
          enum: ['email', 'sms', 'in_app', 'push_notification'],
        },
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
        },
        sentAt: Date,
        deliveredAt: Date,
        readAt: Date,
        error: String,
        externalId: String, // Provider-specific ID
      },
    ],

    // Tracking and analytics
    opened: {
      type: Boolean,
      default: false,
    },

    openedAt: Date,

    clicks: {
      type: Number,
      default: 0,
    },

    clickTracking: [
      {
        timestamp: Date,
        url: String,
        userAgent: String,
        ipAddress: String,
      },
    ],

    // Additional metadata
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Audit fields
    sentBy: {
      type: String,
      required: true,
      default: 'system',
    },

    source: {
      type: String,
      enum: ['manual', 'automated', 'bulk', 'template', 'trigger'],
      default: 'manual',
    },

    batchId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ userId: 1, category: 1 });
notificationSchema.index({ scheduledAt: 1, status: 1 });
notificationSchema.index({ queueName: 1, status: 1 });
notificationSchema.index({ batchId: 1 });

// Virtuals
notificationSchema.virtual('isScheduled').get(function () {
  return this.scheduledAt && this.scheduledAt > new Date();
});

notificationSchema.virtual('isDelivered').get(function () {
  return this.status === 'delivered' || this.status === 'read';
});

notificationSchema.virtual('isFailed').get(function () {
  return this.status === 'failed';
});

notificationSchema.virtual('deliveryTime').get(function () {
  if (this.sentAt && this.deliveredAt) {
    return this.deliveredAt.getTime() - this.sentAt.getTime();
  }
  return null;
});

notificationSchema.virtual('canRetry').get(function () {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
});

// Instance methods
notificationSchema.methods.markAsQueued = function (queueName) {
  this.status = 'queued';
  this.queueName = queueName;
  return this.save();
};

notificationSchema.methods.markAsProcessing = function () {
  this.status = 'processing';
  return this.save();
};

notificationSchema.methods.markAsSent = function (channel, externalId) {
  this.status = 'sent';
  this.sentAt = new Date();

  // Update delivery status for specific channel
  if (channel) {
    const channelStatus = this.deliveryStatus.find(
      (ds) => ds.channel === channel
    );
    if (channelStatus) {
      channelStatus.status = 'sent';
      channelStatus.sentAt = new Date();
      if (externalId) channelStatus.externalId = externalId;
    } else {
      this.deliveryStatus.push({
        channel,
        status: 'sent',
        sentAt: new Date(),
        externalId,
      });
    }
  }

  return this.save();
};

notificationSchema.methods.markAsDelivered = function (channel, externalId) {
  this.status = 'delivered';
  this.deliveredAt = new Date();

  // Update delivery status for specific channel
  if (channel) {
    const channelStatus = this.deliveryStatus.find(
      (ds) => ds.channel === channel
    );
    if (channelStatus) {
      channelStatus.status = 'delivered';
      channelStatus.deliveredAt = new Date();
      if (externalId) channelStatus.externalId = externalId;
    } else {
      this.deliveryStatus.push({
        channel,
        status: 'delivered',
        deliveredAt: new Date(),
        externalId,
      });
    }
  }

  return this.save();
};

notificationSchema.methods.markAsRead = function (channel) {
  this.status = 'read';
  this.readAt = new Date();
  if (!this.opened) {
    this.opened = true;
    this.openedAt = new Date();
  }

  // Update delivery status for specific channel
  if (channel) {
    const channelStatus = this.deliveryStatus.find(
      (ds) => ds.channel === channel
    );
    if (channelStatus) {
      channelStatus.status = 'read';
      channelStatus.readAt = new Date();
    } else {
      this.deliveryStatus.push({
        channel,
        status: 'read',
        readAt: new Date(),
      });
    }
  }

  return this.save();
};

notificationSchema.methods.markAsFailed = function (error, channel) {
  this.status = 'failed';
  this.error = error;
  this.lastRetryAt = new Date();
  this.retryCount += 1;

  // Update delivery status for specific channel
  if (channel) {
    const channelStatus = this.deliveryStatus.find(
      (ds) => ds.channel === channel
    );
    if (channelStatus) {
      channelStatus.status = 'failed';
      channelStatus.error = error.message || error;
    } else {
      this.deliveryStatus.push({
        channel,
        status: 'failed',
        error: error.message || error,
      });
    }
  }

  return this.save();
};

notificationSchema.methods.addClick = function (clickData) {
  this.clicks += 1;
  this.clickTracking.push({
    timestamp: new Date(),
    ...clickData,
  });
  return this.save();
};

notificationSchema.methods.scheduleRetry = function (delay) {
  this.nextRetryAt = new Date(Date.now() + delay);
  return this.save();
};

// Static methods
notificationSchema.statics.getByUser = function (userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = { createdAt: -1 },
    filters = {},
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

notificationSchema.statics.getPendingNotifications = function (queueName) {
  const query = {
    status: 'pending',
    $or: [
      { scheduledAt: { $lte: new Date() } },
      { scheduledAt: { $exists: false } },
    ],
  };

  if (queueName) {
    query.queueName = queueName;
  }

  return this.find(query).sort({ priority: -1, createdAt: 1 });
};

notificationSchema.statics.getRetryableNotifications = function () {
  return this.find({
    status: 'failed',
    retryCount: { $lt: 3 }, // Default maxRetries value
    nextRetryAt: { $lte: new Date() },
  }).sort({ nextRetryAt: 1 });
};

notificationSchema.statics.getStats = function (userId, options = {}) {
  const { dateRange, category, type } = options;

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
        totalDelivered: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
        },
        totalRead: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
        totalFailed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
        totalPending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
        },
        byType: {
          $push: {
            type: '$type',
            status: '$status',
          },
        },
        byCategory: {
          $push: {
            category: '$category',
            status: '$status',
          },
        },
        byPriority: {
          $push: {
            priority: '$priority',
            status: '$status',
          },
        },
      },
    },
    {
      $addFields: {
        deliveryRate: {
          $multiply: [
            {
              $divide: [
                '$totalDelivered',
                {
                  $add: [
                    '$totalSent',
                    '$totalDelivered',
                    '$totalRead',
                    '$totalFailed',
                  ],
                },
              ],
            },
            100,
          ],
        },
        readRate: {
          $multiply: [
            {
              $divide: [
                '$totalRead',
                {
                  $add: [
                    '$totalSent',
                    '$totalDelivered',
                    '$totalRead',
                    '$totalFailed',
                  ],
                },
              ],
            },
            100,
          ],
        },
      },
    },
  ]);
};

// toJSON transformation
notificationSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
