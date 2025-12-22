import mongoose from 'mongoose';

const notificationDeliverySchema = new mongoose.Schema(
  {
    // Reference to the notification
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
      required: [true, 'Notification ID is required'],
      index: true,
    },

    // Channel information
    channel: {
      type: String,
      required: [true, 'Channel is required'],
      enum: ['email', 'sms', 'in_app', 'push_notification'],
      index: true,
    },

    // Provider information
    provider: {
      type: String,
      required: [true, 'Provider is required'],
      enum: ['twilio', 'mailgun', 'firebase', 'apns', 'webpush'],
      index: true,
    },

    // External IDs
    externalId: String, // Provider-specific message ID
    externalBatchId: String, // For batch operations

    // Delivery status
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: [
        'pending',
        'queued',
        'sent',
        'delivered',
        'read',
        'failed',
        'bounced',
        'complained',
        'unsubscribed',
      ],
      default: 'pending',
      index: true,
    },

    // Timestamps
    queuedAt: Date,
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    failedAt: Date,

    // Delivery attempts
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxAttempts: {
      type: Number,
      default: 3,
      min: 1,
    },

    // Error information
    error: {
      code: String,
      message: String,
      details: mongoose.Schema.Types.Mixed,
      providerError: mongoose.Schema.Types.Mixed,
    },

    // Response data from provider
    providerResponse: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Engagement tracking
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
        referer: String,
      },
    ],

    // Bounce/complaint specific
    bounceType: {
      type: String,
      enum: ['hard', 'soft', 'transient'],
    },

    bounceReason: String,

    complaintType: {
      type: String,
      enum: ['spam', 'abuse', 'other'],
    },

    // Cost tracking
    cost: {
      amount: Number,
      currency: {
        type: String,
        default: 'USD',
      },
    },

    // Additional metadata
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
notificationDeliverySchema.index({ notificationId: 1, channel: 1 });
notificationDeliverySchema.index({ channel: 1, status: 1 });
notificationDeliverySchema.index({ provider: 1, status: 1 });
notificationDeliverySchema.index({ externalId: 1 });
notificationDeliverySchema.index({ sentAt: 1 });
notificationDeliverySchema.index({ deliveredAt: 1 });
notificationDeliverySchema.index({ failedAt: 1 });
notificationDeliverySchema.index({ createdAt: -1, status: 1 });

// Virtuals
notificationDeliverySchema.virtual('isDelivered').get(function () {
  return this.status === 'delivered' || this.status === 'read';
});

notificationDeliverySchema.virtual('isFailed').get(function () {
  return this.status === 'failed' || this.status === 'bounced';
});

notificationDeliverySchema.virtual('isPending').get(function () {
  return this.status === 'pending' || this.status === 'queued';
});

notificationDeliverySchema.virtual('deliveryTime').get(function () {
  if (this.sentAt && this.deliveredAt) {
    return this.deliveredAt.getTime() - this.sentAt.getTime();
  }
  return null;
});

notificationDeliverySchema.virtual('canRetry').get(function () {
  return this.status === 'failed' && this.attempts < this.maxAttempts;
});

notificationDeliverySchema.virtual('hasEngagement').get(function () {
  return this.opened || this.clicks > 0;
});

// Instance methods
notificationDeliverySchema.methods.markAsQueued = function (providerResponse) {
  this.status = 'queued';
  this.queuedAt = new Date();
  this.attempts += 1;

  if (providerResponse) {
    this.providerResponse.set('queued', providerResponse);
  }

  return this.save();
};

notificationDeliverySchema.methods.markAsSent = function (
  externalId,
  providerResponse
) {
  this.status = 'sent';
  this.sentAt = new Date();
  this.externalId = externalId;

  if (providerResponse) {
    this.providerResponse.set('sent', providerResponse);
  }

  return this.save();
};

notificationDeliverySchema.methods.markAsDelivered = function (
  providerResponse
) {
  this.status = 'delivered';
  this.deliveredAt = new Date();

  if (providerResponse) {
    this.providerResponse.set('delivered', providerResponse);
  }

  return this.save();
};

notificationDeliverySchema.methods.markAsRead = function (providerResponse) {
  this.status = 'read';
  this.readAt = new Date();
  this.opened = true;
  this.openedAt = new Date();

  if (providerResponse) {
    this.providerResponse.set('read', providerResponse);
  }

  return this.save();
};

notificationDeliverySchema.methods.markAsFailed = function (
  error,
  providerResponse
) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.attempts += 1;

  if (error) {
    this.error = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      details: error.details || null,
      providerError: error.providerError || null,
    };
  }

  if (providerResponse) {
    this.providerResponse.set('failed', providerResponse);
  }

  return this.save();
};

notificationDeliverySchema.methods.markAsBounced = function (
  bounceType,
  bounceReason,
  providerResponse
) {
  this.status = 'bounced';
  this.bounceType = bounceType;
  this.bounceReason = bounceReason;

  if (providerResponse) {
    this.providerResponse.set('bounced', providerResponse);
  }

  return this.save();
};

notificationDeliverySchema.methods.markAsComplained = function (
  complaintType,
  providerResponse
) {
  this.status = 'complained';
  this.complaintType = complaintType;

  if (providerResponse) {
    this.providerResponse.set('complained', providerResponse);
  }

  return this.save();
};

notificationDeliverySchema.methods.markAsUnsubscribed = function (
  providerResponse
) {
  this.status = 'unsubscribed';

  if (providerResponse) {
    this.providerResponse.set('unsubscribed', providerResponse);
  }

  return this.save();
};

notificationDeliverySchema.methods.addClick = function (clickData) {
  this.clicks += 1;
  this.clickTracking.push({
    timestamp: new Date(),
    ...clickData,
  });
  return this.save();
};

notificationDeliverySchema.methods.setCost = function (
  amount,
  currency = 'USD'
) {
  this.cost = {
    amount,
    currency,
  };
  return this.save();
};

notificationDeliverySchema.methods.updateProviderResponse = function (
  key,
  data
) {
  this.providerResponse.set(key, data);
  return this.save();
};

// Static methods
notificationDeliverySchema.statics.findByNotification = function (
  notificationId
) {
  return this.find({ notificationId }).sort({ createdAt: -1 });
};

notificationDeliverySchema.statics.findByChannel = function (
  channel,
  options = {}
) {
  const { status, limit = 100, page = 1, dateRange } = options;

  const query = { channel };

  if (status) {
    query.status = status;
  }

  if (dateRange) {
    const { start, end } = dateRange;
    if (start || end) {
      query.createdAt = {};
      if (start) query.createdAt.$gte = new Date(start);
      if (end) query.createdAt.$lte = new Date(end);
    }
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('notificationId', 'subject content');
};

notificationDeliverySchema.statics.findByProvider = function (
  provider,
  options = {}
) {
  const { status, limit = 100, page = 1, dateRange } = options;

  const query = { provider };

  if (status) {
    query.status = status;
  }

  if (dateRange) {
    const { start, end } = dateRange;
    if (start || end) {
      query.createdAt = {};
      if (start) query.createdAt.$gte = new Date(start);
      if (end) query.createdAt.$lte = new Date(end);
    }
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

notificationDeliverySchema.statics.findByExternalId = function (externalId) {
  return this.findOne({ externalId }).populate('notificationId');
};

notificationDeliverySchema.statics.getFailedDeliveries = function (
  options = {}
) {
  const { channel, provider, limit = 100, page = 1, dateRange } = options;

  const query = {
    status: { $in: ['failed', 'bounced'] },
  };

  if (channel) {
    query.channel = channel;
  }

  if (provider) {
    query.provider = provider;
  }

  if (dateRange) {
    const { start, end } = dateRange;
    if (start || end) {
      query.createdAt = {};
      if (start) query.createdAt.$gte = new Date(start);
      if (end) query.createdAt.$lte = new Date(end);
    }
  }

  return this.find(query)
    .sort({ failedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('notificationId', 'subject content');
};

notificationDeliverySchema.statics.getRetryableDeliveries = function () {
  return this.find({
    status: 'failed',
    attempts: { $lt: 3 }, // Default maxAttempts value
    createdAt: {
      $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    },
  })
    .sort({ failedAt: 1 })
    .populate('notificationId');
};

notificationDeliverySchema.statics.getDeliveryStats = function (options = {}) {
  const { channel, provider, dateRange, notificationId } = options;

  const matchStage = {};

  if (channel) {
    matchStage.channel = channel;
  }

  if (provider) {
    matchStage.provider = provider;
  }

  if (notificationId) {
    matchStage.notificationId = mongoose.Types.ObjectId(notificationId);
  }

  if (dateRange) {
    const { start, end } = dateRange;
    if (start || end) {
      matchStage.createdAt = {};
      if (start) matchStage.createdAt.$gte = new Date(start);
      if (end) matchStage.createdAt.$lte = new Date(end);
    }
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalDeliveries: { $sum: 1 },
        successfulDeliveries: {
          $sum: { $cond: [{ $in: ['$status', ['delivered', 'read']] }, 1, 0] },
        },
        failedDeliveries: {
          $sum: { $cond: [{ $in: ['$status', ['failed', 'bounced']] }, 1, 0] },
        },
        pendingDeliveries: {
          $sum: { $cond: [{ $in: ['$status', ['pending', 'queued']] }, 1, 0] },
        },
        readDeliveries: {
          $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] },
        },
        totalClicks: { $sum: '$clicks' },
        totalCost: { $sum: '$cost.amount' },
        byChannel: {
          $push: {
            channel: '$channel',
            status: '$status',
          },
        },
        byProvider: {
          $push: {
            provider: '$provider',
            status: '$status',
          },
        },
        avgDeliveryTime: {
          $avg: {
            $cond: [
              {
                $and: [
                  { $ne: ['$sentAt', null] },
                  { $ne: ['$deliveredAt', null] },
                ],
              },
              { $subtract: ['$deliveredAt', '$sentAt'] },
              null,
            ],
          },
        },
      },
    },
    {
      $addFields: {
        successRate: {
          $multiply: [
            { $divide: ['$successfulDeliveries', '$totalDeliveries'] },
            100,
          ],
        },
        failureRate: {
          $multiply: [
            { $divide: ['$failedDeliveries', '$totalDeliveries'] },
            100,
          ],
        },
        readRate: {
          $multiply: [
            { $divide: ['$readDeliveries', '$totalDeliveries'] },
            100,
          ],
        },
      },
    },
  ]);
};

notificationDeliverySchema.statics.getEngagementMetrics = function (
  options = {}
) {
  const { channel, dateRange, notificationId } = options;

  const matchStage = {
    status: { $in: ['delivered', 'read'] },
  };

  if (channel) {
    matchStage.channel = channel;
  }

  if (notificationId) {
    matchStage.notificationId = mongoose.Types.ObjectId(notificationId);
  }

  if (dateRange) {
    const { start, end } = dateRange;
    if (start || end) {
      matchStage.createdAt = {};
      if (start) matchStage.createdAt.$gte = new Date(start);
      if (end) matchStage.createdAt.$lte = new Date(end);
    }
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalDelivered: { $sum: 1 },
        totalOpened: { $sum: { $cond: ['$opened', 1, 0] } },
        totalClicks: { $sum: '$clicks' },
        uniqueClicks: { $addToSet: '$clickTracking.userAgent' },
      },
    },
    {
      $addFields: {
        openRate: {
          $multiply: [{ $divide: ['$totalOpened', '$totalDelivered'] }, 100],
        },
        clickRate: {
          $multiply: [{ $divide: ['$totalClicks', '$totalDelivered'] }, 100],
        },
        uniqueClickCount: { $size: '$uniqueClicks' },
      },
    },
  ]);
};

// toJSON transformation
notificationDeliverySchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const NotificationDelivery = mongoose.model(
  'NotificationDelivery',
  notificationDeliverySchema
);

export default NotificationDelivery;
