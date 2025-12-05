import mongoose from 'mongoose';

/**
 * Payment Intent Schema
 * Tracks payment intentions before actual payment processing
 */
const paymentIntentSchema = new mongoose.Schema(
  {
    // Basic intent information
    intentId: { type: String, unique: true, required: true },
    type: {
      type: String,
      enum: ['investment', 'repayment', 'fee', 'refund', 'penalty'],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    status: {
      type: String,
      enum: [
        'created',
        'initialized',
        'pending',
        'completed',
        'failed',
        'cancelled',
        'expired',
      ],
      default: 'created',
    },

    // User information
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userEmail: { type: String, required: true },

    // Payment method preferences
    preferredPaymentMethod: {
      type: String,
      enum: ['card', 'bank_transfer', 'mobile_money', 'ussd', 'all'],
    },
    availablePaymentMethods: [
      {
        type: String,
        enum: ['card', 'bank_transfer', 'mobile_money', 'ussd'],
      },
    ],

    // Transaction relationships
    relatedTransactionId: { type: String },
    relatedApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SolarApplication',
    },
    relatedInvestment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment',
    },

    // Payment gateway information
    gatewayReference: { type: String },
    gatewayTransactionId: { type: String },
    gatewayAuthorizationUrl: { type: String },
    gatewayAccessCode: { type: String },

    // Timing information
    expiresAt: { type: Date },
    initializedAt: { type: Date },
    completedAt: { type: Date },
    failedAt: { type: Date },
    cancelledAt: { type: Date },

    // Configuration
    callbackUrl: { type: String },
    returnUrl: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },

    // Split payment configuration
    splitConfig: {
      type: { type: String, enum: ['percentage', 'flat'] },
      splitCode: { type: String },
      subaccounts: [
        {
          subaccountId: { type: String },
          subaccountName: { type: String },
          share: { type: Number },
          amount: { type: Number },
        },
      ],
    },

    // Fees and pricing
    feeStructure: {
      processingFee: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
      transactionFee: { type: Number, default: 0 },
      totalFees: { type: Number, default: 0 },
    },

    // Retry configuration
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    nextRetryAt: { type: Date },

    // Security and compliance
    ipAddress: { type: String },
    userAgent: { type: String },
    deviceId: { type: String },
    kycRequired: { type: Boolean, default: true },
    kycVerified: { type: Boolean, default: false },

    // Notification settings
    notifications: {
      emailEnabled: { type: Boolean, default: true },
      smsEnabled: { type: Boolean, default: false },
      pushEnabled: { type: Boolean, default: true },
    },

    // Additional context
    description: { type: String, maxlength: 500 },
    tags: [String],
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
paymentIntentSchema.index({ intentId: 1 });
paymentIntentSchema.index({ userId: 1, status: 1 });
paymentIntentSchema.index({ status: 1, createdAt: -1 });
paymentIntentSchema.index({ gatewayReference: 1 });
paymentIntentSchema.index({ expiresAt: 1 });
paymentIntentSchema.index({ type: 1, status: 1 });
paymentIntentSchema.index({ relatedApplication: 1 });
paymentIntentSchema.index({ relatedInvestment: 1 });
paymentIntentSchema.index({ createdAt: -1 });

// Compound indexes for complex queries
paymentIntentSchema.index({ userId: 1, type: 1, status: 1 });
paymentIntentSchema.index({ status: 1, expiresAt: 1 });

// Virtual fields for calculated metrics
paymentIntentSchema.virtual('isExpired').get(function () {
  return this.expiresAt && new Date() > this.expiresAt;
});

paymentIntentSchema.virtual('isCompleted').get(function () {
  return this.status === 'completed';
});

paymentIntentSchema.virtual('isPending').get(function () {
  return ['created', 'initialized', 'pending'].includes(this.status);
});

paymentIntentSchema.virtual('isFailed').get(function () {
  return this.status === 'failed';
});

paymentIntentSchema.virtual('canRetry').get(function () {
  return (
    this.status === 'failed' &&
    this.retryCount < this.maxRetries &&
    (!this.nextRetryAt || new Date() >= this.nextRetryAt)
  );
});

paymentIntentSchema.virtual('netAmount').get(function () {
  if (this.feeStructure) {
    return this.amount - this.feeStructure.totalFees;
  }
  return this.amount;
});

paymentIntentSchema.virtual('timeToExpiry').get(function () {
  if (!this.expiresAt) return null;
  return this.expiresAt - new Date();
});

// Pre-save middleware
paymentIntentSchema.pre('save', async function (next) {
  // Generate intent ID if not provided
  if (this.isNew && !this.intentId) {
    const count = await this.constructor.countDocuments();
    this.intentId = `INT${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(count + 1).padStart(6, '0')}`;
  }

  // Set expiration time if not provided (30 minutes from creation)
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  }

  // Set timestamps based on status changes
  if (this.isModified('status')) {
    const now = new Date();

    switch (this.status) {
      case 'initialized':
        if (!this.initializedAt) this.initializedAt = now;
        break;
      case 'completed':
        if (!this.completedAt) this.completedAt = now;
        break;
      case 'failed':
        if (!this.failedAt) this.failedAt = now;
        break;
      case 'cancelled':
        if (!this.cancelledAt) this.cancelledAt = now;
        break;
    }
  }

  // Calculate total fees
  if (this.isModified('feeStructure') && this.feeStructure) {
    this.feeStructure.totalFees =
      (this.feeStructure.processingFee || 0) +
      (this.feeStructure.platformFee || 0) +
      (this.feeStructure.transactionFee || 0);
  }

  next();
});

// Post-save middleware for cleanup and notifications
paymentIntentSchema.post('save', async function (doc) {
  // Handle expired intents
  if (doc.isExpired && doc.status !== 'expired') {
    await doc.constructor.updateOne({ _id: doc._id }, { status: 'expired' });
  }

  // Handle retry scheduling
  if (doc.status === 'failed' && doc.canRetry) {
    // Schedule retry logic would go here
    // await scheduleRetry(doc);
  }
});

// Static methods for common queries
paymentIntentSchema.statics.findByIntentId = function (intentId) {
  return this.findOne({ intentId });
};

paymentIntentSchema.statics.findByUserId = function (userId, options = {}) {
  const { page = 1, limit = 20, status, type } = options;
  const filter = { userId };

  if (status) filter.status = status;
  if (type) filter.type = type;

  const skip = (page - 1) * limit;

  return this.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
};

paymentIntentSchema.statics.findExpiredIntents = function () {
  return this.find({
    status: { $in: ['created', 'initialized', 'pending'] },
    expiresAt: { $lt: new Date() },
  });
};

paymentIntentSchema.statics.findRetryableIntents = function () {
  return this.find({
    status: 'failed',
    retryCount: { $lt: this.maxRetries },
    $or: [
      { nextRetryAt: { $lte: new Date() } },
      { nextRetryAt: { $exists: false } },
    ],
  });
};

paymentIntentSchema.statics.getIntentStats = function (filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalIntents: { $sum: 1 },
        completedIntents: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        failedIntents: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
        expiredIntents: {
          $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] },
        },
        totalAmount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' },
      },
    },
  ]);
};

paymentIntentSchema.statics.getPaymentMethodStats = function (filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$preferredPaymentMethod',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        successRate: {
          $avg: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

paymentIntentSchema.statics.getDailyIntentStats = function (
  startDate,
  endDate
) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
          },
        },
        totalIntents: { $sum: 1 },
        completedIntents: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        failedIntents: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
        totalAmount: { $sum: '$amount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

paymentIntentSchema.statics.cleanupExpiredIntents = function () {
  return this.updateMany(
    {
      status: { $in: ['created', 'initialized', 'pending'] },
      expiresAt: { $lt: new Date() },
    },
    {
      status: 'expired',
    }
  );
};

const PaymentIntent = mongoose.model('PaymentIntent', paymentIntentSchema);

export default PaymentIntent;
