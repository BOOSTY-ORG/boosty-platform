import mongoose from "mongoose";

const investorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  investorType: { 
    type: String, 
    enum: ['individual', 'institutional', 'corporate'], 
    required: true 
  },
  totalInvested: { type: Number, default: 0 },
  availableFunds: { type: Number, default: 0 },
  expectedReturns: { type: Number, default: 0 },
  actualReturns: { type: Number, default: 0 },
  riskProfile: { 
    type: String, 
    enum: ['conservative', 'moderate', 'aggressive'], 
    default: 'moderate' 
  },
  investmentPreferences: {
    minAmount: { type: Number, default: 0 },
    maxAmount: { type: Number },
    preferredRegions: [{ type: String }],
    preferredTerms: [{ type: String }]
  },
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending' 
  },
  verificationDocuments: [{
    type: { type: String },
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  bankAccounts: [{
    bankName: { type: String },
    accountNumber: { type: String },
    accountName: { type: String },
    isDefault: { type: Boolean, default: false }
  }],
  performance: {
    totalInvestments: { type: Number, default: 0 },
    activeInvestments: { type: Number, default: 0 },
    completedInvestments: { type: Number, default: 0 },
    averageROI: { type: Number, default: 0 },
    onTimePaymentRate: { type: Number, default: 0 },
    defaultRate: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  joinedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
investorSchema.index({ userId: 1 });
investorSchema.index({ investorType: 1 });
investorSchema.index({ riskProfile: 1 });
investorSchema.index({ verificationStatus: 1 });
investorSchema.index({ isActive: 1 });
investorSchema.index({ createdAt: -1 });
investorSchema.index({ totalInvested: -1 });

// Virtual fields for calculated metrics
investorSchema.virtual('roi').get(function() {
  return this.totalInvested > 0 ? (this.actualReturns / this.totalInvested) * 100 : 0;
});

investorSchema.virtual('totalValue').get(function() {
  return this.totalInvested + this.actualReturns;
});

// Pre-save middleware to update performance metrics
investorSchema.pre('save', function(next) {
  if (this.isModified('totalInvested') || this.isModified('actualReturns')) {
    this.performance.averageROI = this.roi;
  }
  next();
});

const Investor = mongoose.model('Investor', investorSchema);

export default Investor;