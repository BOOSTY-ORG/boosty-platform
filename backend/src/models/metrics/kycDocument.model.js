import mongoose from 'mongoose';
import encryptionService from '../../services/encryption.service.js';
import {
  encryptDatabaseFields,
  decryptDatabaseFields,
} from '../../middleware/encryption.middleware.js';

const kycDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SolarApplication',
    },
    documentType: {
      type: String,
      enum: [
        'government_id',
        'utility_bill',
        'bank_statement',
        'proof_of_income',
        'property_document',
      ],
      required: true,
    },
    documentUrl: { type: String, required: true },
    documentNumber: {
      type: mongoose.Schema.Types.Mixed,
      set: function (value) {
        this._originalDocumentNumber = value;
        return value;
      },
    },
    issuingAuthority: {
      type: mongoose.Schema.Types.Mixed,
      set: function (value) {
        this._originalIssuingAuthority = value;
        return value;
      },
    },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    verificationStatus: {
      type: String,
      enum: ['pending', 'under_review', 'verified', 'rejected'],
      default: 'pending',
    },
    verificationScore: { type: Number }, // AI confidence score
    rejectionReason: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    aiAnalysis: {
      authenticityScore: { type: Number },
      extractedData: { type: mongoose.Schema.Types.Mixed },
      flags: [{ type: String }],
    },
    personalIdentifiers: {
      type: mongoose.Schema.Types.Mixed,
      set: function (value) {
        this._originalPersonalIdentifiers = value;
        return value;
      },
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

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
kycDocumentSchema.virtual('isVerified').get(function () {
  return this.verificationStatus === 'verified';
});

kycDocumentSchema.virtual('isPending').get(function () {
  return this.verificationStatus === 'pending';
});

kycDocumentSchema.virtual('isRejected').get(function () {
  return this.verificationStatus === 'rejected';
});

kycDocumentSchema.virtual('processingTime').get(function () {
  if (this.uploadedAt && this.reviewedAt) {
    return Math.floor(
      (this.reviewedAt - this.uploadedAt) / (1000 * 60 * 60 * 24)
    ); // days
  }
  return null;
});

kycDocumentSchema.virtual('isExpired').get(function () {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

kycDocumentSchema.virtual('daysUntilExpiry').get(function () {
  if (!this.expiryDate) return null;
  const now = new Date();
  const diffTime = this.expiryDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // days
});

kycDocumentSchema.virtual('hasHighConfidence').get(function () {
  return this.verificationScore && this.verificationScore >= 90;
});

kycDocumentSchema.virtual('hasFlags').get(function () {
  return (
    this.aiAnalysis && this.aiAnalysis.flags && this.aiAnalysis.flags.length > 0
  );
});

// Pre-save middleware for encryption
kycDocumentSchema.pre('save', encryptDatabaseFields('kycDocument'));

// Pre-save middleware to update timestamps
kycDocumentSchema.pre('save', function (next) {
  // Set reviewed timestamp when status changes to reviewed states
  if (this.isModified('verificationStatus')) {
    if (
      ['verified', 'rejected'].includes(this.verificationStatus) &&
      !this.reviewedAt
    ) {
      this.reviewedAt = new Date();
    }
  }

  next();
});

// Post-find middleware for decryption
kycDocumentSchema.post('find', decryptDatabaseFields('kycDocument'));
kycDocumentSchema.post('findOne', decryptDatabaseFields('kycDocument'));
kycDocumentSchema.post(
  'findOneAndUpdate',
  decryptDatabaseFields('kycDocument')
);

// Static methods for common queries
kycDocumentSchema.statics.findByUser = function (userId) {
  return this.find({ userId }).sort({ uploadedAt: -1 });
};

kycDocumentSchema.statics.findByApplication = function (applicationId) {
  return this.find({ applicationId }).sort({ uploadedAt: -1 });
};

kycDocumentSchema.statics.findPending = function () {
  return this.find({ verificationStatus: 'pending' }).sort({ uploadedAt: 1 });
};

kycDocumentSchema.statics.findUnderReview = function () {
  return this.find({ verificationStatus: 'under_review' }).sort({
    reviewedAt: 1,
  });
};

kycDocumentSchema.statics.getVerificationStats = async function (
  startDate,
  endDate
) {
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
        avgScore: { $avg: '$verificationScore' },
      },
    },
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = { count: stat.count, avgScore: stat.avgScore };
    return acc;
  }, {});
};

// Static methods for encryption-aware queries
kycDocumentSchema.statics.findByDocumentNumber = async function (
  documentNumber
) {
  try {
    const encryptedDocumentNumber = await encryptionService.encryptField(
      documentNumber,
      'kycDocument',
      'documentNumber'
    );
    return this.find({ documentNumber: encryptedDocumentNumber });
  } catch (error) {
    console.error(
      'Error finding documents by encrypted document number:',
      error
    );
    throw error;
  }
};

kycDocumentSchema.statics.findByIssuingAuthority = async function (
  issuingAuthority
) {
  try {
    const encryptedIssuingAuthority = await encryptionService.encryptField(
      issuingAuthority,
      'kycDocument',
      'issuingAuthority'
    );
    return this.find({ issuingAuthority: encryptedIssuingAuthority });
  } catch (error) {
    console.error(
      'Error finding documents by encrypted issuing authority:',
      error
    );
    throw error;
  }
};

// Instance methods for working with encrypted data
kycDocumentSchema.methods.getDecryptedDocumentNumber = async function () {
  try {
    if (this.documentNumber?.encrypted) {
      return await encryptionService.decryptField(
        this.documentNumber,
        'kycDocument',
        'documentNumber'
      );
    }
    return this.documentNumber;
  } catch (error) {
    console.error('Error decrypting document number:', error);
    return null;
  }
};

kycDocumentSchema.methods.getDecryptedIssuingAuthority = async function () {
  try {
    if (this.issuingAuthority?.encrypted) {
      return await encryptionService.decryptField(
        this.issuingAuthority,
        'kycDocument',
        'issuingAuthority'
      );
    }
    return this.issuingAuthority;
  } catch (error) {
    console.error('Error decrypting issuing authority:', error);
    return null;
  }
};

kycDocumentSchema.methods.getDecryptedPersonalIdentifiers = async function () {
  try {
    if (this.personalIdentifiers?.encrypted) {
      return await encryptionService.decryptField(
        this.personalIdentifiers,
        'kycDocument',
        'personalIdentifiers'
      );
    }
    return this.personalIdentifiers;
  } catch (error) {
    console.error('Error decrypting personal identifiers:', error);
    return null;
  }
};

// Validation for encrypted fields
kycDocumentSchema.pre('validate', async function (next) {
  try {
    // Validate document number using original value if provided
    if (this._originalDocumentNumber && this._originalDocumentNumber.trim()) {
      if (this._originalDocumentNumber.trim().length < 5) {
        this.invalidate(
          'documentNumber',
          'Document number must be at least 5 characters long.'
        );
      }
    }

    // Validate issuing authority using original value if provided
    if (
      this._originalIssuingAuthority &&
      this._originalIssuingAuthority.trim()
    ) {
      if (this._originalIssuingAuthority.trim().length < 3) {
        this.invalidate(
          'issuingAuthority',
          'Issuing authority must be at least 3 characters long.'
        );
      }
    }

    // Validate personal identifiers using original value if provided
    if (
      this._originalPersonalIdentifiers &&
      typeof this._originalPersonalIdentifiers === 'object'
    ) {
      // Basic validation for personal identifiers object
      if (Object.keys(this._originalPersonalIdentifiers).length === 0) {
        this.invalidate(
          'personalIdentifiers',
          'Personal identifiers cannot be empty.'
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

const KYCDocument = mongoose.model('KYCDocument', kycDocumentSchema);

export default KYCDocument;
