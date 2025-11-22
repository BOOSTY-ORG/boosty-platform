const mongoose = require("mongoose");

const investorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Made optional for admin creation
  investorType: {
    type: String,
    enum: ['individual', 'institutional', 'corporate'],
    required: true
  },
  // Add fields from frontend form
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  nationality: { type: String, required: true },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  annualIncome: { type: Number, required: true },
  netWorth: { type: Number, required: true },
  investmentAmount: { type: Number, required: true },
  investmentFrequency: {
    type: String,
    enum: ['one-time', 'monthly', 'quarterly', 'annually'],
    required: true
  },
  sourceOfFunds: { type: String, required: true },
  taxIdentification: { type: String, required: true },
  investmentPreferences: {
    riskTolerance: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
      default: 'moderate'
    },
    investmentGoals: [{ type: String }],
    investmentDuration: {
      type: String,
      enum: ['short_term', 'medium_term', 'long_term'],
      required: true
    },
    preferredSectors: [{ type: String }],
    expectedReturn: { type: Number },
    minAmount: { type: Number, default: 0 },
    maxAmount: { type: Number },
    preferredRegions: [{ type: String }],
    preferredTerms: [{ type: String }]
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
  // KYC specific fields
  kycStatus: {
    type: String,
    enum: ['not_submitted', 'pending', 'under_review', 'verified', 'rejected'],
    default: 'not_submitted'
  },
  kycDeclaration: { type: Boolean, default: false },
  consentToDataProcessing: { type: Boolean, default: false },
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
investorSchema.index({ email: 1 });
investorSchema.index({ investorType: 1 });
investorSchema.index({ riskProfile: 1 });
investorSchema.index({ verificationStatus: 1 });
investorSchema.index({ kycStatus: 1 });
investorSchema.index({ isActive: 1 });
investorSchema.index({ createdAt: -1 });
investorSchema.index({ totalInvested: -1 });

// Compound indexes for common queries
investorSchema.index({ userId: 1, isActive: 1 });
investorSchema.index({ kycStatus: 1, isActive: 1 });
investorSchema.index({ investorType: 1, isActive: 1 });

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

module.exports = Investor;