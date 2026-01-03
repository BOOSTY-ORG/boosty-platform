import mongoose from 'mongoose';

const crmTemplateSchema = new mongoose.Schema(
  {
    // Basic template information
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [100, 'Template name cannot exceed 100 characters'],
      index: true
    },
    
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // Template categorization
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['welcome', 'onboarding', 'marketing', 'support', 'billing', 'kyc', 'payment', 'notification', 'follow_up', 'survey', 'other'],
      index: true
    },
    
    subcategory: {
      type: String,
      trim: true,
      maxlength: [50, 'Subcategory cannot exceed 50 characters']
    },
    
    // Channel and type
    channel: {
      type: String,
      required: [true, 'Channel is required'],
      enum: ['email', 'sms', 'push', 'in_app', 'chat', 'all'],
      index: true
    },
    
    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: ['marketing', 'transactional', 'notification', 'survey', 'alert'],
      index: true
    },
    
    // Template content
    subject: {
      type: String,
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    
    body: {
      type: String,
      required: [true, 'Body content is required'],
      trim: true
    },
    
    htmlBody: {
      type: String,
      trim: true
    },
    
    // Dynamic variables definition
    variables: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      type: {
        type: String,
        required: true,
        enum: ['string', 'number', 'boolean', 'date', 'url', 'email', 'phone'],
        default: 'string'
      },
      required: {
        type: Boolean,
        default: false
      },
      defaultValue: {
        type: mongoose.Schema.Types.Mixed
      },
      description: {
        type: String,
        trim: true
      },
      validation: {
        min: Number,
        max: Number,
        pattern: String,
        options: [String]
      }
    }],
    
    // Template settings
    settings: {
      trackOpens: {
        type: Boolean,
        default: true
      },
      trackClicks: {
        type: Boolean,
        default: true
      },
      unsubscribeLink: {
        type: Boolean,
        default: true
      },
      personalization: {
        type: Boolean,
        default: true
      },
      responsive: {
        type: Boolean,
        default: true
      }
    },
    
    // Version management
    version: {
      type: String,
      required: [true, 'Version is required'],
      trim: true,
      index: true
    },
    
    parentTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CrmTemplate',
      index: true
    },
    
    isLatest: {
      type: Boolean,
      default: true,
      index: true
    },
    
    // Approval workflow
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['draft', 'review', 'approved', 'rejected', 'archived'],
      default: 'draft',
      index: true
    },
    
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    approvedAt: {
      type: Date
    },
    
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    rejectedAt: {
      type: Date
    },
    
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters']
    },
    
    // A/B testing configuration
    abTesting: {
      enabled: {
        type: Boolean,
        default: false
      },
      
      variants: [{
        name: {
          type: String,
          required: true,
          trim: true
        },
        subject: {
          type: String,
          trim: true
        },
        body: {
          type: String,
          required: true,
          trim: true
        },
        htmlBody: {
          type: String,
          trim: true
        },
        trafficPercentage: {
          type: Number,
          min: 0,
          max: 100,
          default: 50
        }
      }],
      
      testDuration: {
        type: Number, // in days
        min: 1,
        max: 90,
        default: 7
      },
      
      successMetric: {
        type: String,
        enum: ['open_rate', 'click_rate', 'conversion_rate', 'response_rate'],
        default: 'open_rate'
      }
    },
    
    // Performance metrics
    metrics: {
      totalSent: {
        type: Number,
        default: 0,
        min: 0
      },
      
      totalDelivered: {
        type: Number,
        default: 0,
        min: 0
      },
      
      totalOpened: {
        type: Number,
        default: 0,
        min: 0
      },
      
      totalClicked: {
        type: Number,
        default: 0,
        min: 0
      },
      
      totalResponded: {
        type: Number,
        default: 0,
        min: 0
      },
      
      totalUnsubscribed: {
        type: Number,
        default: 0,
        min: 0
      },
      
      lastUsed: {
        type: Date
      },
      
      averageOpenRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      
      averageClickRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      
      averageResponseRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    },
    
    // Usage restrictions
    restrictions: {
      maxUsagePerDay: {
        type: Number,
        min: 1
      },
      
      maxUsagePerMonth: {
        type: Number,
        min: 1
      },
      
      allowedSegments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CrmSegment'
      }],
      
      excludedSegments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CrmSegment'
      }],
      
      allowedRoles: [{
        type: String,
        trim: true
      }]
    },
    
    // Template metadata
    tags: [{
      type: String,
      trim: true,
      index: true
    }],
    
    language: {
      type: String,
      default: 'en',
      index: true
    },
    
    locale: {
      type: String,
      default: 'en-US'
    },
    
    // Ownership and access
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
crmTemplateSchema.index({ name: 1, version: 1 }, { unique: true });
crmTemplateSchema.index({ category: 1, status: 1 });
crmTemplateSchema.index({ channel: 1, type: 1 });
crmTemplateSchema.index({ status: 1, isLatest: 1 });
crmTemplateSchema.index({ createdBy: 1, status: 1 });
crmTemplateSchema.index({ parentTemplate: 1, version: -1 });
crmTemplateSchema.index({ tags: 1 });
crmTemplateSchema.index({ language: 1 });
crmTemplateSchema.index({ 'metrics.lastUsed': -1 });
crmTemplateSchema.index({ createdAt: -1 });
crmTemplateSchema.index({ deleted: 1, createdAt: -1 });

// Compound indexes for common queries
crmTemplateSchema.index({ category: 1, channel: 1, status: 1 });
crmTemplateSchema.index({ status: 1, isLatest: 1, deleted: 1 });
crmTemplateSchema.index({ createdBy: 1, status: 1, deleted: 1 });
crmTemplateSchema.index({ type: 1, category: 1, isLatest: 1 });

// Text indexes for search functionality
crmTemplateSchema.index({
  name: 'text',
  description: 'text',
  subject: 'text',
  body: 'text',
  tags: 'text'
});

// Virtual fields
crmTemplateSchema.virtual('openRate').get(function() {
  if (this.metrics.totalDelivered === 0) return 0;
  return (this.metrics.totalOpened / this.metrics.totalDelivered) * 100;
});

crmTemplateSchema.virtual('clickRate').get(function() {
  if (this.metrics.totalOpened === 0) return 0;
  return (this.metrics.totalClicked / this.metrics.totalOpened) * 100;
});

crmTemplateSchema.virtual('responseRate').get(function() {
  if (this.metrics.totalDelivered === 0) return 0;
  return (this.metrics.totalResponded / this.metrics.totalDelivered) * 100;
});

crmTemplateSchema.virtual('deliveryRate').get(function() {
  if (this.metrics.totalSent === 0) return 0;
  return (this.metrics.totalDelivered / this.metrics.totalSent) * 100;
});

crmTemplateSchema.virtual('isActive').get(function() {
  return this.status === 'approved' && this.isLatest && !this.deleted;
});

// Pre-save middleware
crmTemplateSchema.pre('save', function(next) {
  // Update isLatest flag for version management
  if (this.isModified('version') || this.isNew) {
    // If this is a new version, mark older versions as not latest
    if (this.parentTemplate) {
      this.constructor.updateMany(
        { 
          parentTemplate: this.parentTemplate, 
          _id: { $ne: this._id } 
        },
        { isLatest: false }
      ).exec();
    }
  }
  
  // Calculate performance metrics
  if (this.isModified('metrics')) {
    const { totalSent, totalDelivered, totalOpened, totalClicked, totalResponded } = this.metrics;
    
    if (totalDelivered > 0) {
      this.metrics.averageOpenRate = (totalOpened / totalDelivered) * 100;
      this.metrics.averageResponseRate = (totalResponded / totalDelivered) * 100;
    }
    
    if (totalOpened > 0) {
      this.metrics.averageClickRate = (totalClicked / totalOpened) * 100;
    }
  }
  
  next();
});

// Instance methods
crmTemplateSchema.methods.approve = function(approvedBy) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

crmTemplateSchema.methods.reject = function(rejectedBy, reason) {
  this.status = 'rejected';
  this.rejectedBy = rejectedBy;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

crmTemplateSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

crmTemplateSchema.methods.createVersion = function(version, updatedBy) {
  const newVersion = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    version,
    parentTemplate: this._id,
    isLatest: true,
    status: 'draft',
    createdBy: this.createdBy,
    updatedBy,
    metrics: {
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalResponded: 0,
      totalUnsubscribed: 0,
      averageOpenRate: 0,
      averageClickRate: 0,
      averageResponseRate: 0
    }
  });
  
  // Mark current version as not latest
  this.isLatest = false;
  this.save();
  
  return newVersion.save();
};

crmTemplateSchema.methods.updateMetrics = function(metricsData) {
  const { sent, delivered, opened, clicked, responded, unsubscribed } = metricsData;
  
  if (sent) this.metrics.totalSent += sent;
  if (delivered) this.metrics.totalDelivered += delivered;
  if (opened) this.metrics.totalOpened += opened;
  if (clicked) this.metrics.totalClicked += clicked;
  if (responded) this.metrics.totalResponded += responded;
  if (unsubscribed) this.metrics.totalUnsubscribed += unsubscribed;
  
  this.metrics.lastUsed = new Date();
  
  return this.save();
};

crmTemplateSchema.methods.softDelete = function(deletedBy) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Static methods
crmTemplateSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, status: 'approved', isLatest: true, deleted: false });
};

crmTemplateSchema.statics.findByCategory = function(category, channel) {
  const filter = { 
    category, 
    status: 'approved', 
    isLatest: true, 
    deleted: false 
  };
  
  if (channel) {
    filter.channel = channel;
  }
  
  return this.find(filter)
    .sort({ 'metrics.averageOpenRate': -1 });
};

crmTemplateSchema.statics.findLatestVersions = function(parentTemplateId) {
  return this.find({ 
    parentTemplate: parentTemplateId, 
    deleted: false 
  })
  .sort({ version: -1 });
};

crmTemplateSchema.statics.getTemplateStats = function(filter = {}) {
  const matchStage = { ...filter, deleted: false };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalTemplates: { $sum: 1 },
        byCategory: {
          $push: {
            category: '$category',
            status: '$status',
            metrics: '$metrics'
          }
        },
        byChannel: {
          $push: {
            channel: '$channel',
            status: '$status'
          }
        },
        byStatus: {
          $push: {
            status: '$status',
            category: '$category'
          }
        },
        avgOpenRate: { $avg: '$metrics.averageOpenRate' },
        avgClickRate: { $avg: '$metrics.averageClickRate' },
        totalSent: { $sum: '$metrics.totalSent' },
        totalDelivered: { $sum: '$metrics.totalDelivered' },
        totalOpened: { $sum: '$metrics.totalOpened' },
        totalClicked: { $sum: '$metrics.totalClicked' }
      }
    }
  ]);
};

crmTemplateSchema.statics.getTopPerformingTemplates = function(limit = 10, metric = 'openRate') {
  const sortField = `metrics.average${metric.charAt(0).toUpperCase() + metric.slice(1)}Rate`;
  
  return this.find({
    status: 'approved',
    isLatest: true,
    deleted: false,
    'metrics.totalSent': { $gte: 10 } // Minimum usage to be considered
  })
  .sort({ [sortField]: -1 })
  .limit(limit)
  .populate('createdBy', 'firstName lastName email');
};

crmTemplateSchema.statics.searchTemplates = function(searchTerm, filters = {}) {
  const query = {
    ...filters,
    deleted: false,
    $text: { $search: searchTerm }
  };
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .populate('createdBy', 'firstName lastName email');
};

// toJSON transformation
crmTemplateSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const CrmTemplate = mongoose.model('CrmTemplate', crmTemplateSchema);

export default CrmTemplate;