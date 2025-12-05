import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
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
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'card', 'wallet', 'auto_debit'],
      required: true,
    },
    paymentReference: { type: String },
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ fromEntity: 1, toEntity: 1 });
transactionSchema.index({ fromEntityId: 1 });
transactionSchema.index({ toEntityId: 1 });
transactionSchema.index({ paymentMethod: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ completedAt: -1 });
transactionSchema.index({ amount: -1 });

// Compound indexes for complex queries
transactionSchema.index({ type: 1, status: 1, completedAt: -1 });
transactionSchema.index({ type: 1, status: 1, amount: -1 });
transactionSchema.index({ fromEntityId: 1, type: 1, completedAt: -1 });
transactionSchema.index({ toEntityId: 1, type: 1, completedAt: -1 });

// Virtual fields for calculated metrics
transactionSchema.virtual('totalFees').get(function () {
  return (
    (this.fees?.processingFee || 0) +
    (this.fees?.platformFee || 0) +
    (this.fees?.transactionFee || 0)
  );
});

transactionSchema.virtual('netAmount').get(function () {
  if (this.type === 'investment' || this.type === 'repayment') {
    return this.amount - this.totalFees;
  }
  return this.amount;
});

transactionSchema.virtual('processingDuration').get(function () {
  if (this.processedAt && this.completedAt) {
    return this.completedAt - this.processedAt; // milliseconds
  }
  return null;
});

transactionSchema.virtual('isCompleted').get(function () {
  return this.status === 'completed';
});

transactionSchema.virtual('isFailed').get(function () {
  return this.status === 'failed';
});

// Pre-save middleware to generate transaction ID if not provided
transactionSchema.pre('save', async function (next) {
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

  next();
});

// Enhanced static methods for transaction history
transactionSchema.statics.findWithAdvancedFilters = function (
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

transactionSchema.statics.buildAdvancedQuery = function (filters) {
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
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchConditions }];
      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  return query;
};

transactionSchema.statics.getAdvancedTransactionStats = function (
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
        averageAmount: { $avg: '$amount' },
        minAmount: { $min: '$amount' },
        maxAmount: { $max: '$amount' },
        averageProcessingTime: { $avg: '$processingDuration' },
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
      },
    },
  ]);
};

transactionSchema.statics.getTransactionVolumeByPeriod = function (
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

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
