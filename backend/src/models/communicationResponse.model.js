import mongoose from 'mongoose';

const communicationResponseSchema = new mongoose.Schema(
  {
    // Reference to the original communication
    communicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Communication',
      required: [true, 'Communication ID is required'],
      index: true
    },
    
    // Response details
    type: {
      type: String,
      required: [true, 'Response type is required'],
      enum: ['reply', 'click', 'open', 'bounce', 'complaint', 'unsubscribe'],
      index: true
    },
    
    responseContent: {
      type: String,
      trim: true,
      maxlength: [2000, 'Response content cannot exceed 2000 characters']
    },
    
    // Response metadata
    source: {
      type: String,
      enum: ['email', 'sms', 'in_app', 'web', 'api'],
      default: 'email'
    },
    
    ipAddress: {
      type: String,
      trim: true
    },
    
    userAgent: {
      type: String,
      trim: true
    },
    
    // Timing information
    responseTime: {
      type: Date,
      required: true,
      index: true
    },
    
    // Response data
    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Click tracking specific
    clickUrl: {
      type: String,
      trim: true
    },
    
    clickPosition: {
      x: Number,
      y: Number
    },
    
    // Email specific
    emailHeaders: {
      messageId: String,
      inReplyTo: String,
      references: [String]
    },
    
    // SMS specific
    smsProvider: {
      type: String,
      trim: true
    },
    
    smsSid: {
      type: String,
      trim: true
    },
    
    // Response status
    isProcessed: {
      type: Boolean,
      default: false,
      index: true
    },
    
    processedAt: {
      type: Date
    },
    
    // Response categorization
    category: {
      type: String,
      enum: ['positive', 'negative', 'neutral', 'question', 'complaint', 'other'],
      default: 'neutral'
    },
    
    sentiment: {
      type: String,
      enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative'],
      default: 'neutral'
    },
    
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    // Response handling
    needsFollowUp: {
      type: Boolean,
      default: false,
      index: true
    },
    
    followUpAssignedTo: {
      type: String,
      trim: true
    },
    
    followUpCompletedAt: {
      type: Date
    },
    
    // Additional metadata
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Audit fields
    processedBy: {
      type: String,
      trim: true
    },
    
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
communicationResponseSchema.index({ communicationId: 1, responseTime: -1 });
communicationResponseSchema.index({ communicationId: 1, type: 1 });
communicationResponseSchema.index({ type: 1, responseTime: -1 });
communicationResponseSchema.index({ isProcessed: 1, needsFollowUp: 1 });
communicationResponseSchema.index({ responseTime: -1, needsFollowUp: 1 });

// Virtuals
communicationResponseSchema.virtual('isPending').get(function() {
  return !this.isProcessed;
});

communicationResponseSchema.virtual('isOverdue').get(function() {
  if (!this.needsFollowUp || this.followUpCompletedAt) {
    return false;
  }
  const followUpDeadline = new Date(this.responseTime);
  followUpDeadline.setDate(followUpDeadline.getDate() + 7); // 7 days to follow up
  return new Date() > followUpDeadline && !this.followUpCompletedAt;
});

// Instance methods
communicationResponseSchema.methods.markAsProcessed = function(processedBy, notes) {
  this.isProcessed = true;
  this.processedAt = new Date();
  if (processedBy) {
    this.processedBy = processedBy;
  }
  if (notes) {
    this.notes = notes;
  }
  return this.save();
};

communicationResponseSchema.methods.completeFollowUp = function(completedBy) {
  this.followUpCompletedAt = new Date();
  this.followUpAssignedTo = completedBy;
  return this.save();
};

communicationResponseSchema.methods.categorizeResponse = function() {
  // Auto-categorize based on content and type
  const content = (this.responseContent || '').toLowerCase();
  
  if (this.type === 'complaint') {
    this.category = 'complaint';
    this.sentiment = 'negative';
  } else if (this.type === 'unsubscribe') {
    this.category = 'negative';
    this.sentiment = 'negative';
  } else if (content.includes('thank') || content.includes('appreciate')) {
    this.category = 'positive';
    this.sentiment = 'positive';
  } else if (content.includes('question') || content.includes('?')) {
    this.category = 'question';
    this.sentiment = 'neutral';
  } else if (content.includes('issue') || content.includes('problem') || content.includes('error')) {
    this.category = 'negative';
    this.sentiment = 'negative';
  }
  
  return this.save();
};

// Static methods
communicationResponseSchema.statics.getByCommunication = function(communicationId, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = { responseTime: -1 },
    filters = {}
  } = options;

  const query = { communicationId };
  
  // Apply filters
  if (filters.type) {
    query.type = filters.type;
  }
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.isProcessed !== undefined) {
    query.isProcessed = filters.isProcessed;
  }
  if (filters.needsFollowUp !== undefined) {
    query.needsFollowUp = filters.needsFollowUp;
  }

  return this.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('communicationId', 'type subject');
};

communicationResponseSchema.statics.getPendingResponses = function(options = {}) {
  const {
    page = 1,
    limit = 20
  } = options;

  return this.find({ 
    isProcessed: false,
    needsFollowUp: true 
  })
    .sort({ responseTime: 1 }) // Oldest first
    .skip((page - 1) * limit)
    .limit(limit);
};

communicationResponseSchema.statics.getResponseStats = function(communicationId) {
  return this.aggregate([
    { $match: { communicationId } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgResponseTime: {
          $avg: {
            $subtract: ['$responseTime', '$createdAt']
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        totalResponses: { $sum: '$count' },
        responseTypes: {
          $push: {
            type: '$_id',
            count: '$count',
            percentage: {
              $multiply: [
                { $divide: ['$count', '$totalResponses'] },
                100
              ]
            }
          }
        },
        avgResponseTime: { $avg: '$avgResponseTime' },
        followUpRate: {
          $avg: {
            $cond: [
              { $eq: ['$needsFollowUp', true] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

// toJSON transformation
communicationResponseSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const CommunicationResponse = mongoose.model('CommunicationResponse', communicationResponseSchema);

export default CommunicationResponse;