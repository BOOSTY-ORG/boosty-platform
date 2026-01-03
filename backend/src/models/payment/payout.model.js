import mongoose from 'mongoose';
import encryptionService from '../../services/encryption.service.js';
import {
  encryptDatabaseFields,
  decryptDatabaseFields,
} from '../../middleware/encryption.middleware.js';

/**
 * Payout Schema
 * Tracks ROI and payout distributions to investors
 */
const payoutSchema = new mongoose.Schema(
  {
    // Basic payout information
    payoutId: { type: String, unique: true, required: true },
    type: {
      type: String,
      enum: [
        'roi_payment',
        'profit_sharing',
        'dividend',
        'commission',
        'bonus',
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },

    // Recipient information
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientType: {
      type: String,
      enum: ['investor', 'affiliate', 'employee', 'system'],
      required: true,
    },
    recipientEmail: { type: String, required: true },
    recipientAccount: {
      accountNumber: {
        type: mongoose.Schema.Types.Mixed,
        set: function (value) {
          this._originalAccountNumber = value;
          return value;
        },
      },
      bankCode: {
        type: mongoose.Schema.Types.Mixed,
        set: function (value) {
          this._originalBankCode = value;
          return value;
        },
      },
      bankName: {
        type: mongoose.Schema.Types.Mixed,
        set: function (value) {
          this._originalBankName = value;
          return value;
        },
      },
      accountName: {
        type: mongoose.Schema.Types.Mixed,
        set: function (value) {
          this._originalAccountName = value;
          return value;
        },
      },
    },

    // Related entities
    relatedInvestment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment',
    },
    relatedTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentTransaction',
    },
    relatedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },

    // Payment gateway information
    gatewayReference: { type: String },
    gatewayTransferId: { type: String },
    gatewayRecipientCode: { type: String },
    gatewayResponse: { type: mongoose.Schema.Types.Mixed },

    // Timing information
    scheduledFor: { type: Date, required: true },
    processedAt: { type: Date },
    completedAt: { type: Date },
    failedAt: { type: Date },

    // Calculation details
    calculationBasis: {
      investmentAmount: { type: Number },
      investmentPeriod: { type: Number }, // in months
      interestRate: { type: Number }, // percentage
      roiPercentage: { type: Number }, // percentage
      profitAmount: { type: Number },
      bonusAmount: { type: Number, default: 0 },
      penaltyAmount: { type: Number, default: 0 },
    },

    // Fees and deductions
    fees: {
      processingFee: { type: Number, default: 0 },
      transferFee: { type: Number, default: 0 },
      taxWithheld: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
    },

    // Approval workflow
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },

    // Batch processing
    batchId: { type: String },
    batchStatus: {
      type: String,
      enum: [
        'individual',
        'batch_pending',
        'batch_processing',
        'batch_completed',
      ],
      default: 'individual',
    },

    // Compliance and verification
    kycVerified: { type: Boolean, default: false },
    complianceChecked: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verificationNotes: { type: String },

    // Communication
    notificationSent: { type: Boolean, default: false },
    notificationMethod: {
      type: String,
      enum: ['email', 'sms', 'push', 'in_app'],
      default: 'email',
    },
    notifiedAt: { type: Date },

    // Additional context
    description: { type: String, maxlength: 500 },
    metadata: { type: mongoose.Schema.Types.Mixed },
    tags: [String],
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    // Audit fields
    ipAddress: { type: String },
    userAgent: { type: String },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
payoutSchema.index({ payoutId: 1 });
payoutSchema.index({ recipientId: 1, status: 1 });
payoutSchema.index({ status: 1, createdAt: -1 });
payoutSchema.index({ type: 1, status: 1 });
payoutSchema.index({ scheduledFor: 1 });
payoutSchema.index({ gatewayReference: 1 });
payoutSchema.index({ batchId: 1 });
payoutSchema.index({ relatedInvestment: 1 });
payoutSchema.index({ relatedTransaction: 1 });
payoutSchema.index({ relatedProject: 1 });
payoutSchema.index({ createdAt: -1 });
payoutSchema.index({ completedAt: -1 });

// Compound indexes for complex queries
payoutSchema.index({ recipientId: 1, type: 1, status: 1 });
payoutSchema.index({ status: 1, scheduledFor: 1 });
payoutSchema.index({ batchStatus: 1, status: 1 });

// Virtual fields for calculated metrics
payoutSchema.virtual('totalFees').get(function () {
  return (
    (this.fees?.processingFee || 0) +
    (this.fees?.transferFee || 0) +
    (this.fees?.taxWithheld || 0) +
    (this.fees?.platformFee || 0)
  );
});

payoutSchema.virtual('netAmount').get(function () {
  return this.amount - this.totalFees;
});

payoutSchema.virtual('isPending').get(function () {
  return this.status === 'pending';
});

payoutSchema.virtual('isCompleted').get(function () {
  return this.status === 'completed';
});

payoutSchema.virtual('isFailed').get(function () {
  return this.status === 'failed';
});

payoutSchema.virtual('canProcess').get(function () {
  return (
    this.status === 'pending' &&
    this.approvalStatus === 'approved' &&
    new Date() >= this.scheduledFor
  );
});

payoutSchema.virtual('daysSinceScheduled').get(function () {
  if (!this.scheduledFor) return null;
  return Math.floor((new Date() - this.scheduledFor) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware for encryption
payoutSchema.pre('save', encryptDatabaseFields('payout'));

// Pre-save middleware
payoutSchema.pre('save', async function (next) {
  // Generate payout ID if not provided
  if (this.isNew && !this.payoutId) {
    const count = await this.constructor.countDocuments();
    this.payoutId = `PAY${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(count + 1).padStart(6, '0')}`;
  }

  // Set timestamps based on status changes
  if (this.isModified('status')) {
    const now = new Date();

    switch (this.status) {
      case 'processing':
        if (!this.processedAt) this.processedAt = now;
        break;
      case 'completed':
        if (!this.completedAt) this.completedAt = now;
        break;
      case 'failed':
        if (!this.failedAt) this.failedAt = now;
        break;
    }
  }

  // Auto-approve low amounts
  if (this.isNew && this.amount <= 10000 && this.approvalStatus === 'pending') {
    this.approvalStatus = 'approved';
    this.approvedAt = new Date();
  }

  next();
});

// Post-find middleware for decryption
payoutSchema.post('find', decryptDatabaseFields('payout'));
payoutSchema.post('findOne', decryptDatabaseFields('payout'));
payoutSchema.post('findOneAndUpdate', decryptDatabaseFields('payout'));

// Post-save middleware for notifications and batch processing
payoutSchema.post('save', async function (doc) {
  // Send notification when status changes to completed
  if (
    doc.isModified('status') &&
    doc.status === 'completed' &&
    !doc.notificationSent
  ) {
    // Send payout notification logic would go here
    // await sendPayoutNotification(doc);
  }

  // Add to batch processing queue
  if (doc.batchStatus === 'batch_pending') {
    // Add to batch processing logic would go here
    // await addToBatch(doc);
  }
});

// Static methods for common queries
payoutSchema.statics.findByPayoutId = function (payoutId) {
  return this.findOne({ payoutId });
};

payoutSchema.statics.findByRecipient = function (recipientId, options = {}) {
  const { page = 1, limit = 20, status, type } = options;
  const filter = { recipientId };

  if (status) filter.status = status;
  if (type) filter.type = type;

  const skip = (page - 1) * limit;

  return this.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
};

payoutSchema.statics.findPendingPayouts = function () {
  return this.find({
    status: 'pending',
    approvalStatus: 'approved',
    scheduledFor: { $lte: new Date() },
  });
};

payoutSchema.statics.findBatchPayouts = function (batchId) {
  return this.find({ batchId });
};

payoutSchema.statics.getPayoutStats = function (filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalPayouts: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$totalFees' },
        netAmount: { $sum: '$netAmount' },
        completedPayouts: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        failedPayouts: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
        pendingPayouts: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
        },
        averageAmount: { $avg: '$amount' },
      },
    },
  ]);
};

payoutSchema.statics.getPayoutTypeStats = function (filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' },
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

payoutSchema.statics.getDailyPayoutStats = function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        completedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$completedAt',
          },
        },
        totalPayouts: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$totalFees' },
        netAmount: { $sum: '$netAmount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

payoutSchema.statics.createBatch = function (payoutIds, batchId) {
  return this.updateMany(
    { _id: { $in: payoutIds } },
    {
      batchId,
      batchStatus: 'batch_pending',
    }
  );
};

payoutSchema.statics.processBatch = function (batchId) {
  return this.updateMany(
    { batchId },
    {
      batchStatus: 'batch_processing',
      status: 'processing',
    }
  );
};

payoutSchema.statics.completeBatch = function (batchId) {
  return this.updateMany(
    { batchId },
    {
      batchStatus: 'batch_completed',
      status: 'completed',
      completedAt: new Date(),
    }
  );
};

// Static methods for encryption-aware queries
payoutSchema.statics.findByAccountNumber = async function (accountNumber) {
  try {
    const encryptedAccountNumber = await encryptionService.encryptField(
      accountNumber,
      'payout',
      'recipientAccount.accountNumber'
    );
    return this.find({
      'recipientAccount.accountNumber': encryptedAccountNumber,
    });
  } catch (error) {
    console.error('Error finding payouts by encrypted account number:', error);
    throw error;
  }
};

payoutSchema.statics.findByBankName = async function (bankName) {
  try {
    const encryptedBankName = await encryptionService.encryptField(
      bankName,
      'payout',
      'recipientAccount.bankName'
    );
    return this.find({ 'recipientAccount.bankName': encryptedBankName });
  } catch (error) {
    console.error('Error finding payouts by encrypted bank name:', error);
    throw error;
  }
};

// Instance methods for working with encrypted data
payoutSchema.methods.getDecryptedAccountNumber = async function () {
  try {
    if (this.recipientAccount?.accountNumber?.encrypted) {
      return await encryptionService.decryptField(
        this.recipientAccount.accountNumber,
        'payout',
        'recipientAccount.accountNumber'
      );
    }
    return this.recipientAccount?.accountNumber;
  } catch (error) {
    console.error('Error decrypting account number:', error);
    return null;
  }
};

payoutSchema.methods.getDecryptedBankCode = async function () {
  try {
    if (this.recipientAccount?.bankCode?.encrypted) {
      return await encryptionService.decryptField(
        this.recipientAccount.bankCode,
        'payout',
        'recipientAccount.bankCode'
      );
    }
    return this.recipientAccount?.bankCode;
  } catch (error) {
    console.error('Error decrypting bank code:', error);
    return null;
  }
};

payoutSchema.methods.getDecryptedBankName = async function () {
  try {
    if (this.recipientAccount?.bankName?.encrypted) {
      return await encryptionService.decryptField(
        this.recipientAccount.bankName,
        'payout',
        'recipientAccount.bankName'
      );
    }
    return this.recipientAccount?.bankName;
  } catch (error) {
    console.error('Error decrypting bank name:', error);
    return null;
  }
};

payoutSchema.methods.getDecryptedAccountName = async function () {
  try {
    if (this.recipientAccount?.accountName?.encrypted) {
      return await encryptionService.decryptField(
        this.recipientAccount.accountName,
        'payout',
        'recipientAccount.accountName'
      );
    }
    return this.recipientAccount?.accountName;
  } catch (error) {
    console.error('Error decrypting account name:', error);
    return null;
  }
};

// Validation for encrypted fields
payoutSchema.pre('validate', async function (next) {
  try {
    // Validate account number using original value if provided
    if (this._originalAccountNumber && this._originalAccountNumber.trim()) {
      const accountNumberRegex = /^\d{10,}$/;
      if (!accountNumberRegex.test(this._originalAccountNumber.trim())) {
        this.invalidate(
          'recipientAccount.accountNumber',
          'Account number must be at least 10 digits.'
        );
      }
    }

    // Validate bank code using original value if provided
    if (this._originalBankCode && this._originalBankCode.trim()) {
      if (this._originalBankCode.trim().length < 3) {
        this.invalidate(
          'recipientAccount.bankCode',
          'Bank code must be at least 3 characters long.'
        );
      }
    }

    // Validate bank name using original value if provided
    if (this._originalBankName && this._originalBankName.trim()) {
      if (this._originalBankName.trim().length < 2) {
        this.invalidate(
          'recipientAccount.bankName',
          'Bank name must be at least 2 characters long.'
        );
      }
    }

    // Validate account name using original value if provided
    if (this._originalAccountName && this._originalAccountName.trim()) {
      if (this._originalAccountName.trim().length < 3) {
        this.invalidate(
          'recipientAccount.accountName',
          'Account name must be at least 3 characters long.'
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

const Payout = mongoose.model('Payout', payoutSchema);

export default Payout;
