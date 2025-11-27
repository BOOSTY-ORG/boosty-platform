import mongoose from 'mongoose';

const crmContactSchema = new mongoose.Schema(
  {
    // Basic contact information
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      index: true,
      validate: {
        validator: function(v) {
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please enter a valid email address'
      }
    },
    
    phone: {
      type: String,
      trim: true,
      index: true
    },
    
    // Alternative contact information
    alternateEmail: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please enter a valid alternate email address'
      }
    },
    
    alternatePhone: {
      type: String,
      trim: true
    },
    
    // Entity relationships
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investor',
      index: true
    },
    
    // Contact categorization
    contactType: {
      type: String,
      required: [true, 'Contact type is required'],
      enum: ['lead', 'prospect', 'customer', 'partner', 'vendor', 'employee', 'other'],
      default: 'lead',
      index: true
    },
    
    contactSource: {
      type: String,
      required: [true, 'Contact source is required'],
      enum: ['website', 'referral', 'social_media', 'email_campaign', 'phone', 'event', 'import', 'manual', 'other'],
      default: 'manual',
      index: true
    },
    
    sourceDetails: {
      type: String,
      trim: true,
      maxlength: [200, 'Source details cannot exceed 200 characters']
    },
    
    // Company information
    company: {
      type: String,
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [100, 'Job title cannot exceed 100 characters']
    },
    
    department: {
      type: String,
      trim: true,
      maxlength: [50, 'Department cannot exceed 50 characters']
    },
    
    // Address information
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true }
    },
    
    // Communication preferences
    preferences: {
      preferredChannel: {
        type: String,
        enum: ['email', 'phone', 'sms', 'chat', 'mail'],
        default: 'email'
      },
      
      preferredTime: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'any'],
        default: 'any'
      },
      
      timezone: {
        type: String,
        default: 'UTC'
      },
      
      language: {
        type: String,
        default: 'en'
      },
      
      frequency: {
        type: String,
        enum: ['immediate', 'daily', 'weekly', 'monthly', 'never'],
        default: 'weekly'
      }
    },
    
    // Consent and GDPR compliance
    consent: {
      marketing: {
        type: Boolean,
        default: false,
        index: true
      },
      
      marketingConsentDate: {
        type: Date
      },
      
      marketingConsentMethod: {
        type: String,
        enum: ['email', 'form', 'phone', 'in_person', 'other']
      },
      
      dataProcessing: {
        type: Boolean,
        default: false,
        index: true
      },
      
      dataProcessingConsentDate: {
        type: Date
      },
      
      cookies: {
        type: Boolean,
        default: false
      },
      
      cookiesConsentDate: {
        type: Date
      },
      
      gdprCompliant: {
        type: Boolean,
        default: true,
        index: true
      },
      
      lastConsentUpdate: {
        type: Date
      },
      
      consentWithdrawn: {
        type: Boolean,
        default: false
      },
      
      consentWithdrawnDate: {
        type: Date
      }
    },
    
    // Segmentation and tagging
    tags: [{
      type: String,
      trim: true,
      index: true
    }],
    
    segments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CrmSegment',
      index: true
    }],
    
    // Lead scoring and qualification
    leadScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true
    },
    
    qualificationStatus: {
      type: String,
      enum: ['unqualified', 'new', 'working', 'qualified', 'converted', 'lost'],
      default: 'unqualified',
      index: true
    },
    
    qualificationDate: {
      type: Date
    },
    
    // Engagement metrics
    engagement: {
      totalCommunications: {
        type: Number,
        default: 0
      },
      
      lastCommunicationDate: {
        type: Date
      },
      
      lastCommunicationType: {
        type: String,
        enum: ['email', 'phone', 'sms', 'chat', 'in_person', 'video', 'social']
      },
      
      totalOpens: {
        type: Number,
        default: 0
      },
      
      totalClicks: {
        type: Number,
        default: 0
      },
      
      lastOpenDate: {
        type: Date
      },
      
      lastClickDate: {
        type: Date
      },
      
      engagementScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      
      responseRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    },
    
    // Communication history summary
    communicationSummary: {
      totalEmails: { type: Number, default: 0 },
      totalCalls: { type: Number, default: 0 },
      totalSms: { type: Number, default: 0 },
      totalMeetings: { type: Number, default: 0 },
      lastAgentContact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      lastContactDate: { type: Date }
    },
    
    // Assignment and ownership
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    
    assignedDate: {
      type: Date
    },
    
    // Status and lifecycle
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['active', 'inactive', 'blacklisted', 'do_not_contact'],
      default: 'active',
      index: true
    },
    
    statusReason: {
      type: String,
      trim: true,
      maxlength: [200, 'Status reason cannot exceed 200 characters']
    },
    
    statusDate: {
      type: Date
    },
    
    // Notes and additional information
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    
    // Custom fields for extensibility
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Metadata
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Soft delete
    deleted: {
      type: Boolean,
      default: false,
      index: true
    },
    
    deletedAt: {
      type: Date
    },
    
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
crmContactSchema.index({ email: 1 }, { unique: true });
crmContactSchema.index({ firstName: 1, lastName: 1 });
crmContactSchema.index({ contactType: 1, status: 1 });
crmContactSchema.index({ assignedTo: 1, status: 1 });
crmContactSchema.index({ leadScore: -1 });
crmContactSchema.index({ qualificationStatus: 1 });
crmContactSchema.index({ 'engagement.lastCommunicationDate': -1 });
crmContactSchema.index({ 'consent.marketing': 1, 'consent.dataProcessing': 1 });
crmContactSchema.index({ tags: 1 });
crmContactSchema.index({ segments: 1 });
crmContactSchema.index({ createdAt: -1 });
crmContactSchema.index({ deleted: 1, createdAt: -1 });

// Compound indexes for common queries
crmContactSchema.index({ contactType: 1, leadScore: -1 });
crmContactSchema.index({ assignedTo: 1, qualificationStatus: 1 });
crmContactSchema.index({ status: 1, 'engagement.lastCommunicationDate': -1 });
crmContactSchema.index({ 'consent.marketing': 1, status: 1 });
crmContactSchema.index({ deleted: 1, status: 1, contactType: 1 });

// Text indexes for search functionality
crmContactSchema.index({
  firstName: 'text',
  lastName: 'text',
  email: 'text',
  company: 'text',
  jobTitle: 'text',
  tags: 'text',
  notes: 'text'
});

// Virtual fields
crmContactSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

crmContactSchema.virtual('isHighValueLead').get(function() {
  return this.leadScore >= 80;
});

crmContactSchema.virtual('isEngaged').get(function() {
  return this.engagement.engagementScore >= 50;
});

crmContactSchema.virtual('daysSinceLastContact').get(function() {
  if (!this.engagement.lastCommunicationDate) return null;
  const now = new Date();
  const diffTime = Math.abs(now - this.engagement.lastCommunicationDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

crmContactSchema.virtual('hasValidConsent').get(function() {
  return this.consent.dataProcessing && 
         !this.consent.consentWithdrawn && 
         this.consent.gdprCompliant;
});

// Pre-save middleware
crmContactSchema.pre('save', function(next) {
  // Update lead score based on engagement
  if (this.isModified('engagement')) {
    const { totalCommunications, totalOpens, totalClicks, responseRate } = this.engagement;
    
    // Simple lead scoring algorithm
    let score = 0;
    score += Math.min(totalCommunications * 2, 20); // Max 20 points for communications
    score += Math.min(totalOpens * 1, 15); // Max 15 points for opens
    score += Math.min(totalClicks * 3, 25); // Max 25 points for clicks
    score += Math.min(responseRate * 0.4, 20); // Max 20 points for response rate
    score += this.hasValidConsent ? 10 : 0; // 10 points for valid consent
    score += this.assignedTo ? 10 : 0; // 10 points for being assigned
    
    this.leadScore = Math.min(score, 100);
  }
  
  // Update qualification status based on lead score
  if (this.isModified('leadScore')) {
    if (this.leadScore >= 80 && this.qualificationStatus !== 'converted') {
      this.qualificationStatus = 'qualified';
      this.qualificationDate = new Date();
    } else if (this.leadScore >= 50 && this.qualificationStatus === 'unqualified') {
      this.qualificationStatus = 'working';
      this.qualificationDate = new Date();
    }
  }
  
  // Update consent timestamp
  if (this.isModified('consent.marketing') || this.isModified('consent.dataProcessing')) {
    this.consent.lastConsentUpdate = new Date();
  }
  
  // Update status date when status changes
  if (this.isModified('status')) {
    this.statusDate = new Date();
  }
  
  next();
});

// Instance methods
crmContactSchema.methods.updateEngagement = function(communicationData) {
  const { type, opened, clicked, responded } = communicationData;
  
  this.engagement.totalCommunications += 1;
  this.engagement.lastCommunicationDate = new Date();
  this.engagement.lastCommunicationType = type;
  
  if (opened) {
    this.engagement.totalOpens += 1;
    this.engagement.lastOpenDate = new Date();
  }
  
  if (clicked) {
    this.engagement.totalClicks += 1;
    this.engagement.lastClickDate = new Date();
  }
  
  // Update communication summary
  if (type === 'email') this.communicationSummary.totalEmails += 1;
  else if (type === 'phone') this.communicationSummary.totalCalls += 1;
  else if (type === 'sms') this.communicationSummary.totalSms += 1;
  else if (['in_person', 'video'].includes(type)) this.communicationSummary.totalMeetings += 1;
  
  return this.save();
};

crmContactSchema.methods.giveMarketingConsent = function(method) {
  this.consent.marketing = true;
  this.consent.marketingConsentDate = new Date();
  this.consent.marketingConsentMethod = method;
  this.consent.consentWithdrawn = false;
  this.consent.consentWithdrawnDate = undefined;
  return this.save();
};

crmContactSchema.methods.withdrawConsent = function() {
  this.consent.marketing = false;
  this.consent.dataProcessing = false;
  this.consent.consentWithdrawn = true;
  this.consent.consentWithdrawnDate = new Date();
  return this.save();
};

crmContactSchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  this.assignedDate = new Date();
  return this.save();
};

crmContactSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

crmContactSchema.methods.removeTag = function(tag) {
  const index = this.tags.indexOf(tag);
  if (index > -1) {
    this.tags.splice(index, 1);
    return this.save();
  }
  return Promise.resolve(this);
};

crmContactSchema.methods.softDelete = function(deletedBy) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Static methods
crmContactSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, deleted: false });
};

crmContactSchema.statics.findByEmail = function(email) {
  return this.findOne({ email, deleted: false });
};

crmContactSchema.statics.findHighValueLeads = function(limit = 50) {
  return this.find({ 
    contactType: 'lead', 
    leadScore: { $gte: 80 }, 
    status: 'active',
    deleted: false 
  })
  .sort({ leadScore: -1 })
  .limit(limit)
  .populate('assignedTo', 'firstName lastName email');
};

crmContactSchema.statics.findUnassignedContacts = function(contactType) {
  const filter = { assignedTo: { $exists: false }, deleted: false };
  if (contactType) {
    filter.contactType = contactType;
  }
  return this.find(filter)
    .sort({ leadScore: -1, createdAt: -1 });
};

crmContactSchema.statics.findContactsNeedingFollowUp = function(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.find({
    'engagement.lastCommunicationDate': { $lt: cutoffDate },
    status: 'active',
    deleted: false
  })
  .sort({ 'engagement.lastCommunicationDate': 1 })
  .populate('assignedTo', 'firstName lastName email');
};

crmContactSchema.statics.getContactStats = function(filter = {}) {
  const matchStage = { ...filter, deleted: false };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalContacts: { $sum: 1 },
        byType: {
          $push: {
            contactType: '$contactType',
            status: '$status',
            leadScore: '$leadScore'
          }
        },
        byStatus: {
          $push: {
            status: '$status',
            contactType: '$contactType'
          }
        },
        avgLeadScore: { $avg: '$leadScore' },
        highValueLeads: {
          $sum: {
            $cond: [
              { $gte: ['$leadScore', 80] },
              1,
              0
            ]
          }
        },
        withMarketingConsent: {
          $sum: {
            $cond: ['$consent.marketing', 1, 0]
          }
        },
        assignedContacts: {
          $sum: {
            $cond: [{ $ifNull: ['$assignedTo', false] }, 1, 0]
          }
        }
      }
    }
  ]);
};

// toJSON transformation
crmContactSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const CrmContact = mongoose.model('CrmContact', crmContactSchema);

export default CrmContact;