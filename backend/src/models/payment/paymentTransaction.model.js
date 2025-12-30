import mongoose from 'mongoose';
import encryptionService from '../../services/encryption.service.js';
import {
  encryptDatabaseFields,
  decryptDatabaseFields,
} from '../../middleware/encryption.middleware.js';

/**
 * Payment Transaction Schema
 * Extended transaction model with Paystack-specific fields
 */
const paymentTransactionSchema = new mongoose.Schema(
  {
    // Base transaction fields (inherited from existing transaction model)
    transactionId: { type: String, unique: true, required: true },
    type: {
      type: String,
      enum: ['investment', 'repayment', 'fee', 'refund', 'penalty'],
      required: true,
    },
    fromEntity: {
      type: String,
      enum: ['investor', 'user', 'system'],
      required: true,
    },
    toEntity: {
      type: String,
      enum: ['investor', 'user', 'system'],
      required: true,
    },
    fromEntityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    toEntityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'refunded',
      ],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: [
        'card',
        'bank_transfer',
        'mobile_money',
        'ussd',
        'wallet',
        'auto_debit',
      ],
      required: true,
    },
    paymentReference: { type: String, required: true },
    relatedApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SolarApplication',
    },
    relatedInvestment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment',
    },
    fees: {
      processingFee: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
      transactionFee: { type: Number, default: 0 },
    },
    metadata: { type: mongoose.Schema.Types.Mixed },
    processedAt: { type: Date },
    completedAt: { type: Date },
    failedAt: { type: Date },
    failureReason: { type: String },

    // Paystack-specific fields
    paystackReference: { type: String, required: true },
    paystackTransactionId: { type: String },
    authorizationCode: { type: String },
    last4: {
      type: mongoose.Schema.Types.Mixed,
      set: function (value) {
        this._originalLast4 = value;
        return value;
      },
    }, // Last 4 digits of card
    expiryMonth: { type: String },
    expiryYear: { type: String },
    cardType: { type: String },
    bank: {
      type: mongoose.Schema.Types.Mixed,
      set: function (value) {
        this._originalBank = value;
        return value;
      },
    },
    customerCode: { type: String },
    channel: { type: String }, // Payment channel used

    // Split payment fields
    splitCode: { type: String },
    splitPayments: [
      {
        subaccountId: { type: String, required: true },
        subaccountName: { type: String, required: true },
        amount: { type: Number, required: true },
        percentage: { type: Number },
        status: {
          type: String,
          enum: ['pending', 'processing', 'completed', 'failed'],
          default: 'pending',
        },
        transferReference: { type: String },
        processedAt: { type: Date },
        failureReason: { type: String },
      },
    ],

    // Recurring payment fields
    subscriptionId: { type: String },
    subscriptionPlan: { type: String },
    nextPaymentDate: { type: Date },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'paused', 'cancelled', 'completed'],
      default: 'active',
    },

    // Disbursement fields
    disbursementStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    disbursementReference: { type: String },
    disbursementDate: { type: Date },
    disbursementFailureReason: { type: String },

    // Compliance fields
    kycVerified: { type: Boolean, default: false },
    complianceChecked: { type: Boolean, default: false },
    amlScreeningPassed: { type: Boolean, default: false },
    riskScore: { type: Number, min: 0, max: 100 },
    complianceNotes: { type: String },

    // Fraud detection fields
    fraudFlag: { type: Boolean, default: false },
    fraudReason: { type: String },
    fraudReviewed: { type: Boolean, default: false },
    fraudReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Refund fields
    refundableAmount: { type: Number },
    refundStatus: {
      type: String,
      enum: ['none', 'requested', 'processing', 'completed', 'failed'],
      default: 'none',
    },
    refundAmount: { type: Number },
    refundReason: { type: String },
    refundReference: { type: String },
    refundedAt: { type: Date },

    // Audit fields
    ipAddress: { type: String },
    userAgent: { type: String },
    deviceId: { type: String },
    location: {
      country: { type: String },
      city: { type: String },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
paymentTransactionSchema.index({ transactionId: 1 });
paymentTransactionSchema.index({ paystackReference: 1 });
paymentTransactionSchema.index({ status: 1, createdAt: -1 });
paymentTransactionSchema.index({ fromEntityId: 1, status: 1, createdAt: -1 });
paymentTransactionSchema.index({ toEntityId: 1, status: 1, createdAt: -1 });
paymentTransactionSchema.index({ paymentMethod: 1, status: 1, createdAt: -1 });
paymentTransactionSchema.index({ type: 1, status: 1, completedAt: -1 });
paymentTransactionSchema.index({ createdAt: -1, amount: -1 });
paymentTransactionSchema.index({ completedAt: -1, amount: -1 });
paymentTransactionSchema.index({ type: 1, createdAt: -1 });
paymentTransactionSchema.index({ kycVerified: 1, status: 1 });
paymentTransactionSchema.index({ amlScreeningPassed: 1, createdAt: -1 });
paymentTransactionSchema.index({ splitCode: 1, status: 1, createdAt: -1 });
paymentTransactionSchema.index({ subscriptionId: 1, subscriptionStatus: 1 });
paymentTransactionSchema.index({ fraudFlag: 1, createdAt: -1 });

// Compound indexes for complex queries
paymentTransactionSchema.index({
  fromEntityId: 1,
  type: 1,
  status: 1,
  createdAt: -1,
});
paymentTransactionSchema.index({
  toEntityId: 1,
  type: 1,
  status: 1,
  createdAt: -1,
});
paymentTransactionSchema.index({ status: 1, type: 1, amount: -1 });

// Virtual fields for calculated metrics
paymentTransactionSchema.virtual('totalFees').get(function () {
  return (
    (this.fees?.processingFee || 0) +
    (this.fees?.platformFee || 0) +
    (this.fees?.transactionFee || 0)
  );
});

paymentTransactionSchema.virtual('netAmount').get(function () {
  if (this.type === 'investment' || this.type === 'repayment') {
    return this.amount - this.totalFees;
  }
  return this.amount;
});

paymentTransactionSchema.virtual('processingDuration').get(function () {
  if (this.processedAt && this.completedAt) {
    return this.completedAt - this.processedAt; // milliseconds
  }
  return null;
});

paymentTransactionSchema.virtual('isCompleted').get(function () {
  return this.status === 'completed';
});

paymentTransactionSchema.virtual('isFailed').get(function () {
  return this.status === 'failed';
});

paymentTransactionSchema.virtual('isRefundable').get(function () {
  return (
    this.status === 'completed' &&
    this.refundStatus === 'none' &&
    (this.refundableAmount || this.amount) > 0
  );
});

paymentTransactionSchema.virtual('totalSplitAmount').get(function () {
  if (!this.splitPayments) return 0;
  return this.splitPayments.reduce((total, split) => total + split.amount, 0);
});

// Pre-save middleware for encryption
paymentTransactionSchema.pre(
  'save',
  encryptDatabaseFields('paymentTransaction')
);

// Pre-save middleware
paymentTransactionSchema.pre('save', async function (next) {
  // Generate transaction ID if not provided
  if (this.isNew && !this.transactionId) {
    const count = await this.constructor.countDocuments();
    this.transactionId = `TXN${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(count + 1).padStart(6, '0')}`;
  }

  // Set processed timestamp when status changes to processing
  if (
    this.isModified('status') &&
    this.status === 'processing' &&
    !this.processedAt
  ) {
    this.processedAt = new Date();
  }

  // Set completed/failed timestamps
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status === 'failed' && !this.failedAt) {
      this.failedAt = new Date();
    }
  }

  // Calculate refundable amount for completed transactions
  if (this.isModified('status') && this.status === 'completed') {
    this.refundableAmount = this.netAmount;
  }

  next();
});

// Post-find middleware for decryption
paymentTransactionSchema.post(
  'find',
  decryptDatabaseFields('paymentTransaction')
);
paymentTransactionSchema.post(
  'findOne',
  decryptDatabaseFields('paymentTransaction')
);
paymentTransactionSchema.post(
  'findOneAndUpdate',
  decryptDatabaseFields('paymentTransaction')
);

// Post-save middleware for event emission
paymentTransactionSchema.post('save', async function (doc) {
  // Emit events for status changes
  if (doc.isModified('status')) {
    // This would typically emit to an event system
    // await emitTransactionStatusChanged(doc);
  }
});

// Static methods for common queries
paymentTransactionSchema.statics.findByReference = function (reference) {
  return this.findOne({ paystackReference: reference });
};

paymentTransactionSchema.statics.findByTransactionId = function (
  transactionId
) {
  return this.findOne({ transactionId });
};

paymentTransactionSchema.statics.findWithPagination = function (
  filter,
  options = {},
  sort = { createdAt: -1 }
) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  return this.find(filter).sort(sort).skip(skip).limit(limit).exec();
};

paymentTransactionSchema.statics.countWithFilter = function (filter) {
  return this.countDocuments(filter);
};

paymentTransactionSchema.statics.findByUser = function (userId, options = {}) {
  const { page = 1, limit = 20, status, type } = options;
  const filter = {
    $or: [{ fromEntityId: userId }, { toEntityId: userId }],
  };

  if (status) filter.status = status;
  if (type) filter.type = type;

  return this.findWithPagination(filter, { page, limit });
};

paymentTransactionSchema.statics.getTransactionStats = function (filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$totalFees' },
        successfulTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        failedTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
        averageAmount: { $avg: '$amount' },
      },
    },
  ]);
};

paymentTransactionSchema.statics.getPaymentMethodStats = function (
  filter = {}
) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

paymentTransactionSchema.statics.getDailyTransactionStats = function (
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
        totalTransactions: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        successfulTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        failedTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Enhanced static methods for transaction history
paymentTransactionSchema.statics.findWithAdvancedFilters = function (
  filters = {},
  options = {}
) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    cursor,
    includeRelated = true,
  } = options;

  // Build query from filters
  const query = this.buildAdvancedQuery(filters);

  // Build sort options
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Handle cursor-based pagination
  if (cursor) {
    query._id = { $gt: cursor };
  }

  // Build the base query
  let dbQuery = this.find(query)
    .sort(sort)
    .limit(cursor ? limit + 1 : limit);

  // Include related entities if requested
  if (includeRelated) {
    dbQuery = dbQuery
      .populate('fromEntityId', 'name email')
      .populate('toEntityId', 'name email')
      .populate('relatedApplication', 'applicationId')
      .populate('relatedInvestment', 'investmentId');
  }

  return dbQuery.exec();
};

paymentTransactionSchema.statics.buildAdvancedQuery = function (filters) {
  const query = {};

  // Date range filtering
  if (filters.startDate || filters.endDate || filters.dateRange) {
    query.createdAt = {};

    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }

    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }

    if (filters.dateRange) {
      const now = new Date();
      let startDate, endDate;

      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
          );
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
      }

      if (startDate && endDate) {
        query.createdAt = { $gte: startDate, $lte: endDate };
      }
    }
  }

  // Status filtering
  if (filters.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    query.status = { $in: statuses };
  }

  // Transaction type filtering
  if (filters.type) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type];
    query.type = { $in: types };
  }

  // Payment method filtering
  if (filters.paymentMethod) {
    const methods = Array.isArray(filters.paymentMethod)
      ? filters.paymentMethod
      : [filters.paymentMethod];
    query.paymentMethod = { $in: methods };
  }

  // Amount range filtering
  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    query.amount = {};
    if (filters.minAmount !== undefined) {
      query.amount.$gte = parseFloat(filters.minAmount);
    }
    if (filters.maxAmount !== undefined) {
      query.amount.$lte = parseFloat(filters.maxAmount);
    }
  }

  // Entity filtering
  if (filters.userEntity) {
    query.$or = [
      { fromEntityId: filters.userEntity, fromEntity: 'user' },
      { toEntityId: filters.userEntity, toEntity: 'user' },
    ];
  }

  if (filters.investorEntity) {
    const investorFilter = {
      $or: [
        { fromEntityId: filters.investorEntity, fromEntity: 'investor' },
        { toEntityId: filters.investorEntity, toEntity: 'investor' },
      ],
    };

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: investorFilter.$or }];
      delete query.$or;
    } else {
      query.$or = investorFilter.$or;
    }
  }

  // Search functionality
  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    const searchConditions = [
      { transactionId: searchRegex },
      { paymentReference: searchRegex },
      { paystackReference: searchRegex },
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchConditions }];
      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  // Compliance filtering
  if (filters.kycVerified !== undefined) {
    query.kycVerified =
      filters.kycVerified === 'true' || filters.kycVerified === true;
  }

  if (filters.amlScreeningPassed !== undefined) {
    query.amlScreeningPassed =
      filters.amlScreeningPassed === 'true' ||
      filters.amlScreeningPassed === true;
  }

  // Fraud filtering
  if (filters.fraudFlag !== undefined) {
    query.fraudFlag =
      filters.fraudFlag === 'true' || filters.fraudFlag === true;
  }

  // Split payment filtering
  if (filters.hasSplitPayments !== undefined) {
    if (
      filters.hasSplitPayments === 'true' ||
      filters.hasSplitPayments === true
    ) {
      query.splitPayments = { $exists: true, $ne: [] };
    } else {
      query.$or = [
        { splitPayments: { $exists: false } },
        { splitPayments: { $size: 0 } },
      ];
    }
  }

  // Subscription filtering
  if (filters.isSubscription !== undefined) {
    if (filters.isSubscription === 'true' || filters.isSubscription === true) {
      query.subscriptionId = { $exists: true, $ne: null };
    } else {
      query.$or = [
        { subscriptionId: { $exists: false } },
        { subscriptionId: null },
      ];
    }
  }

  return query;
};

paymentTransactionSchema.statics.getAdvancedTransactionStats = function (
  filters = {}
) {
  const query = this.buildAdvancedQuery(filters);

  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$totalFees' },
        netAmount: { $sum: '$netAmount' },
        successfulTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        failedTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
        pendingTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
        },
        processingTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] },
        },
        refundedTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] },
        },
        averageAmount: { $avg: '$amount' },
        minAmount: { $min: '$amount' },
        maxAmount: { $max: '$amount' },
        averageProcessingTime: { $avg: '$processingDuration' },
        totalRefundAmount: { $sum: '$refundAmount' },
      },
    },
    {
      $addFields: {
        successRate: {
          $multiply: [
            { $divide: ['$successfulTransactions', '$totalTransactions'] },
            100,
          ],
        },
        failureRate: {
          $multiply: [
            { $divide: ['$failedTransactions', '$totalTransactions'] },
            100,
          ],
        },
        refundRate: {
          $multiply: [
            { $divide: ['$refundedTransactions', '$totalTransactions'] },
            100,
          ],
        },
      },
    },
  ]);
};

paymentTransactionSchema.statics.getTransactionVolumeByPeriod = function (
  filters = {},
  granularity = 'day'
) {
  const query = this.buildAdvancedQuery(filters);

  const dateFormats = {
    hour: {
      format: '%Y-%m-%d %H:00:00',
      groupId: { $dateToString: { format: '%Y-%m-%d %H', date: '$createdAt' } },
    },
    day: {
      format: '%Y-%m-%d',
      groupId: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
    },
    week: {
      format: '%Y-%U',
      groupId: { $dateToString: { format: '%Y-%U', date: '$createdAt' } },
    },
    month: {
      format: '%Y-%m',
      groupId: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
    },
    quarter: {
      format: '%Y-Q',
      groupId: {
        $concat: [
          { $dateToString: { format: '%Y', date: '$createdAt' } },
          '-Q',
          { $toString: { $ceil: { $divide: [{ $month: '$createdAt' }, 3] } } },
        ],
      },
    },
    year: {
      format: '%Y',
      groupId: { $dateToString: { format: '%Y', date: '$createdAt' } },
    },
  };

  const dateFormat = dateFormats[granularity] || dateFormats.day;

  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: dateFormat.groupId,
        timestamp: { $first: '$createdAt' },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$totalFees' },
        successfulTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        failedTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
        averageAmount: { $avg: '$amount' },
        uniqueUsers: { $addToSet: '$fromEntityId' },
        uniqueInvestors: { $addToSet: '$toEntityId' },
      },
    },
    {
      $addFields: {
        successRate: {
          $multiply: [{ $divide: ['$successfulTransactions', '$count'] }, 100],
        },
        uniqueUserCount: { $size: '$uniqueUsers' },
        uniqueInvestorCount: { $size: '$uniqueInvestors' },
      },
    },
    {
      $project: {
        uniqueUsers: 0,
        uniqueInvestors: 0,
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

paymentTransactionSchema.statics.getTransactionBreakdownByField = function (
  field,
  filters = {}
) {
  const query = this.buildAdvancedQuery(filters);

  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: `$${field}`,
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$totalFees' },
        successfulTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        averageAmount: { $avg: '$amount' },
      },
    },
    {
      $addFields: {
        successRate: {
          $multiply: [{ $divide: ['$successfulTransactions', '$count'] }, 100],
        },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

paymentTransactionSchema.statics.getTopTransactions = function (
  filters = {},
  limit = 10,
  sortBy = 'amount'
) {
  const query = this.buildAdvancedQuery(filters);
  const sort = {};
  sort[sortBy] = -1;

  return this.find(query)
    .sort(sort)
    .limit(limit)
    .populate('fromEntityId', 'name email')
    .populate('toEntityId', 'name email')
    .populate('relatedApplication', 'applicationId')
    .populate('relatedInvestment', 'investmentId')
    .exec();
};

paymentTransactionSchema.statics.getTransactionAnomalies = function (
  filters = {}
) {
  const query = this.buildAdvancedQuery(filters);

  // Find transactions with unusual patterns
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        avgAmount: { $avg: '$amount' },
        stdDevAmount: { $stdDevPop: '$amount' },
        avgProcessingTime: { $avg: '$processingDuration' },
        stdDevProcessingTime: { $stdDevPop: '$processingDuration' },
      },
    },
    {
      $lookup: {
        from: 'paymenttransactions',
        let: {
          avgAmount: '$avgAmount',
          stdDevAmount: '$stdDevAmount',
          avgProcessingTime: '$avgProcessingTime',
          stdDevProcessingTime: '$stdDevProcessingTime',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  // Amount anomalies (3 standard deviations from mean)
                  {
                    $gt: [
                      '$amount',
                      {
                        $add: [
                          '$$avgAmount',
                          { $multiply: [3, '$$stdDevAmount'] },
                        ],
                      },
                    ],
                  },
                  {
                    $lt: [
                      '$amount',
                      {
                        $subtract: [
                          '$$avgAmount',
                          { $multiply: [3, '$$stdDevAmount'] },
                        ],
                      },
                    ],
                  },
                  // Processing time anomalies
                  {
                    $gt: [
                      '$processingDuration',
                      {
                        $add: [
                          '$$avgProcessingTime',
                          { $multiply: [3, '$$stdDevProcessingTime'] },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'fromEntityId',
              foreignField: '_id',
              as: 'fromUser',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'toEntityId',
              foreignField: '_id',
              as: 'toUser',
            },
          },
        ],
        as: 'anomalies',
      },
    },
    { $unwind: '$anomalies' },
    { $replaceRoot: { newRoot: '$anomalies' } },
  ]);
};

paymentTransactionSchema.statics.getRecentFailedTransactions = function (
  hours = 24,
  limit = 50
) {
  const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.find({
    status: 'failed',
    failedAt: { $gte: startDate },
  })
    .sort({ failedAt: -1 })
    .limit(limit)
    .populate('fromEntityId', 'name email')
    .populate('toEntityId', 'name email')
    .exec();
};

paymentTransactionSchema.statics.getTransactionSuccessRateByTime = function (
  filters = {}
) {
  const query = this.buildAdvancedQuery(filters);

  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          hour: { $hour: '$createdAt' },
          dayOfWeek: { $dayOfWeek: '$createdAt' },
        },
        totalTransactions: { $sum: 1 },
        successfulTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
      },
    },
    {
      $addFields: {
        successRate: {
          $multiply: [
            { $divide: ['$successfulTransactions', '$totalTransactions'] },
            100,
          ],
        },
      },
    },
    { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } },
  ]);
};

// Static methods for encryption-aware queries
paymentTransactionSchema.statics.findByBankName = async function (bankName) {
  try {
    const encryptedBankName = await encryptionService.encryptField(
      bankName,
      'paymentTransaction',
      'bank'
    );
    return this.find({ bank: encryptedBankName });
  } catch (error) {
    console.error('Error finding transactions by encrypted bank name:', error);
    throw error;
  }
};

paymentTransactionSchema.statics.findByCardLastFour = async function (
  lastFour
) {
  try {
    const encryptedLastFour = await encryptionService.encryptField(
      lastFour,
      'paymentTransaction',
      'last4'
    );
    return this.find({ last4: encryptedLastFour });
  } catch (error) {
    console.error(
      'Error finding transactions by encrypted last 4 digits:',
      error
    );
    throw error;
  }
};

// Instance methods for working with encrypted data
paymentTransactionSchema.methods.getDecryptedBank = async function () {
  try {
    if (this.bank?.encrypted) {
      return await encryptionService.decryptField(
        this.bank,
        'paymentTransaction',
        'bank'
      );
    }
    return this.bank;
  } catch (error) {
    console.error('Error decrypting bank name:', error);
    return null;
  }
};

paymentTransactionSchema.methods.getDecryptedLastFour = async function () {
  try {
    if (this.last4?.encrypted) {
      return await encryptionService.decryptField(
        this.last4,
        'paymentTransaction',
        'last4'
      );
    }
    return this.last4;
  } catch (error) {
    console.error('Error decrypting last 4 digits:', error);
    return null;
  }
};

// Validation for encrypted fields
paymentTransactionSchema.pre('validate', async function (next) {
  try {
    // Validate last4 using original value if provided
    if (this._originalLast4 && this._originalLast4.trim()) {
      const last4Regex = /^\d{4}$/;
      if (!last4Regex.test(this._originalLast4.trim())) {
        this.invalidate('last4', 'Last 4 digits must be exactly 4 digits.');
      }
    }

    // Validate bank name using original value if provided
    if (this._originalBank && this._originalBank.trim()) {
      if (this._originalBank.trim().length < 2) {
        this.invalidate(
          'bank',
          'Bank name must be at least 2 characters long.'
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

const PaymentTransaction = mongoose.model(
  'PaymentTransaction',
  paymentTransactionSchema
);

export default PaymentTransaction;
