const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, unique: true, required: true },
  type: { 
    type: String, 
    enum: ['investment', 'repayment', 'fee', 'refund', 'penalty'], 
    required: true 
  },
  fromEntity: { 
    type: String, 
    enum: ['investor', 'user', 'system'], 
    required: true 
  },
  toEntity: { 
    type: String, 
    enum: ['investor', 'user', 'system'], 
    required: true 
  },
  fromEntityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  toEntityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  paymentMethod: { 
    type: String, 
    enum: ['bank_transfer', 'card', 'wallet', 'auto_debit'], 
    required: true 
  },
  paymentReference: { type: String },
  relatedApplication: { type: mongoose.Schema.Types.ObjectId, ref: 'SolarApplication' },
  relatedInvestment: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment' },
  fees: {
    processingFee: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    transactionFee: { type: Number, default: 0 }
  },
  metadata: { type: mongoose.Schema.Types.Mixed },
  processedAt: { type: Date },
  completedAt: { type: Date },
  failedAt: { type: Date },
  failureReason: { type: String }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

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
transactionSchema.virtual('totalFees').get(function() {
  return (this.fees?.processingFee || 0) + 
         (this.fees?.platformFee || 0) + 
         (this.fees?.transactionFee || 0);
});

transactionSchema.virtual('netAmount').get(function() {
  if (this.type === 'investment' || this.type === 'repayment') {
    return this.amount - this.totalFees;
  }
  return this.amount;
});

transactionSchema.virtual('processingDuration').get(function() {
  if (this.processedAt && this.completedAt) {
    return this.completedAt - this.processedAt; // milliseconds
  }
  return null;
});

transactionSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

transactionSchema.virtual('isFailed').get(function() {
  return this.status === 'failed';
});

// Pre-save middleware to generate transaction ID if not provided
transactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.transactionId) {
    const count = await this.constructor.countDocuments();
    this.transactionId = `TXN${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(count + 1).padStart(6, '0')}`;
  }
  
  // Set processed timestamp when status changes to processing
  if (this.isModified('status') && this.status === 'processing' && !this.processedAt) {
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

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;