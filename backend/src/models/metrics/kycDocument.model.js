const mongoose = require("mongoose");

const kycDocumentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'SolarApplication' },
  documentType: { 
    type: String, 
    enum: ['government_id', 'utility_bill', 'bank_statement', 'proof_of_income', 'property_document'], 
    required: true 
  },
  documentUrl: { type: String, required: true },
  documentNumber: { type: String },
  issuingAuthority: { type: String },
  issueDate: { type: Date },
  expiryDate: { type: Date },
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'under_review', 'verified', 'rejected'], 
    default: 'pending' 
  },
  verificationScore: { type: Number }, // AI confidence score
  rejectionReason: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  aiAnalysis: {
    authenticityScore: { type: Number },
    extractedData: { type: mongoose.Schema.Types.Mixed },
    flags: [{ type: String }]
  },
  uploadedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
kycDocumentSchema.index({ userId: 1 });
kycDocumentSchema.index({ applicationId: 1 });
kycDocumentSchema.index({ documentType: 1 });
kycDocumentSchema.index({ verificationStatus: 1 });
kycDocumentSchema.index({ reviewedBy: 1 });
kycDocumentSchema.index({ uploadedAt: -1 });
kycDocumentSchema.index({ reviewedAt: -1 });
kycDocumentSchema.index({ verificationScore: -1 });

// Compound indexes for complex queries
kycDocumentSchema.index({ userId: 1, documentType: 1, verificationStatus: 1 });
kycDocumentSchema.index({ verificationStatus: 1, uploadedAt: -1 });
kycDocumentSchema.index({ applicationId: 1, documentType: 1 });

// Virtual fields for calculated metrics
kycDocumentSchema.virtual('isVerified').get(function() {
  return this.verificationStatus === 'verified';
});

kycDocumentSchema.virtual('isPending').get(function() {
  return this.verificationStatus === 'pending';
});

kycDocumentSchema.virtual('isRejected').get(function() {
  return this.verificationStatus === 'rejected';
});

kycDocumentSchema.virtual('processingTime').get(function() {
  if (this.uploadedAt && this.reviewedAt) {
    return Math.floor((this.reviewedAt - this.uploadedAt) / (1000 * 60 * 60 * 24)); // days
  }
  return null;
});

kycDocumentSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

kycDocumentSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return null;
  const now = new Date();
  const diffTime = this.expiryDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // days
});

kycDocumentSchema.virtual('hasHighConfidence').get(function() {
  return this.verificationScore && this.verificationScore >= 90;
});

kycDocumentSchema.virtual('hasFlags').get(function() {
  return this.aiAnalysis && this.aiAnalysis.flags && this.aiAnalysis.flags.length > 0;
});

// Pre-save middleware to update timestamps
kycDocumentSchema.pre('save', function(next) {
  // Set reviewed timestamp when status changes to reviewed states
  if (this.isModified('verificationStatus')) {
    if (['verified', 'rejected'].includes(this.verificationStatus) && !this.reviewedAt) {
      this.reviewedAt = new Date();
    }
  }
  
  next();
});

// Static methods for common queries
kycDocumentSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ uploadedAt: -1 });
};

kycDocumentSchema.statics.findByApplication = function(applicationId) {
  return this.find({ applicationId }).sort({ uploadedAt: -1 });
};

kycDocumentSchema.statics.findPending = function() {
  return this.find({ verificationStatus: 'pending' }).sort({ uploadedAt: 1 });
};

kycDocumentSchema.statics.findUnderReview = function() {
  return this.find({ verificationStatus: 'under_review' }).sort({ reviewedAt: 1 });
};

kycDocumentSchema.statics.getVerificationStats = async function(startDate, endDate) {
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.uploadedAt = {};
    if (startDate) matchStage.uploadedAt.$gte = startDate;
    if (endDate) matchStage.uploadedAt.$lte = endDate;
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$verificationStatus',
        count: { $sum: 1 },
        avgScore: { $avg: '$verificationScore' }
      }
    }
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = { count: stat.count, avgScore: stat.avgScore };
    return acc;
  }, {});
};

const KYCDocument = mongoose.model('KYCDocument', kycDocumentSchema);

module.exports = KYCDocument;