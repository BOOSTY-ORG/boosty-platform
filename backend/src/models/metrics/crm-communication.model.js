import mongoose from 'mongoose';

const crmCommunicationSchema = new mongoose.Schema(
  {
    // Link to the base communication model
    communicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Communication',
      required: [true, 'Communication ID is required'],
      index: true
    },
    
    // Entity relationships
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: ['user', 'investor', 'ticket', 'application'],
      index: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
      index: true
    },
    
    // Ticket relationship
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      index: true
    },
    
    // Agent information
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    
    // Interaction details
    interactionType: {
      type: String,
      required: [true, 'Interaction type is required'],
      enum: ['inbound', 'outbound', 'automated'],
      default: 'outbound',
      index: true
    },
    
    channel: {
      type: String,
      required: [true, 'Channel is required'],
      enum: ['email', 'phone', 'sms', 'chat', 'in-person', 'video', 'social'],
      index: true
    },
    
    direction: {
      type: String,
      required: [true, 'Direction is required'],
      enum: ['inbound', 'outbound'],
      index: true
    },
    
    // Duration for calls/chats (in seconds)
    duration: {
      type: Number,
      min: 0
    },
    
    // Sentiment analysis
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'mixed'],
      index: true
    },
    
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1
    },
    
    // Customer satisfaction
    satisfaction: {
      type: Number,
      min: 1,
      max: 5
    },
    
    // Follow-up management
    followUpRequired: {
      type: Boolean,
      default: false,
      index: true
    },
    
    followUpDate: {
      type: Date,
      index: true
    },
    
    followUpNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Follow-up notes cannot exceed 1000 characters']
    },
    
    // Internal notes and metadata
    internalNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Internal notes cannot exceed 2000 characters']
    },
    
    // Tags for categorization and filtering
    tags: [{
      type: String,
      trim: true,
      index: true
    }],
    
    // Campaign and automation tracking
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CrmCampaign',
      index: true
    },
    
    automationRule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CrmAutomation',
      index: true
    },
    
    // Response tracking
    responseRequired: {
      type: Boolean,
      default: false,
      index: true
    },
    
    responseDeadline: {
      type: Date,
      index: true
    },
    
    responseReceived: {
      type: Boolean,
      default: false
    },
    
    responseReceivedAt: {
      type: Date
    },
    
    // Financial tracking
    cost: {
      type: Number,
      default: 0,
      min: 0
    },
    
    revenue: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Enhanced delivery tracking
    deliveryAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    
    lastDeliveryAttempt: {
      type: Date
    },
    
    providerUsed: {
      type: String,
      trim: true
    },
    
    providerResponse: {
      type: mongoose.Schema.Types.Mixed
    },
    
    // Engagement metrics
    engagementScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    
    openedAt: {
      type: Date
    },
    
    clickedAt: {
      type: Date
    },
    
    // GDPR and consent management
    consentReceived: {
      type: Date
    },
    
    consentRevoked: {
      type: Date
    },
    
    gdprCompliant: {
      type: Boolean,
      default: true,
      index: true
    },
    
    marketingConsent: {
      type: Boolean,
      default: false,
      index: true
    },
    
    // Custom fields for extensibility
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Metadata for analytics
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
crmCommunicationSchema.index({ communicationId: 1 });
crmCommunicationSchema.index({ entityType: 1, entityId: 1 });
crmCommunicationSchema.index({ ticketId: 1, createdAt: -1 });
crmCommunicationSchema.index({ agentId: 1, createdAt: -1 });
crmCommunicationSchema.index({ interactionType: 1, createdAt: -1 });
crmCommunicationSchema.index({ channel: 1, createdAt: -1 });
crmCommunicationSchema.index({ direction: 1, createdAt: -1 });
crmCommunicationSchema.index({ followUpRequired: 1, followUpDate: 1 });
crmCommunicationSchema.index({ responseRequired: 1, responseDeadline: 1 });
crmCommunicationSchema.index({ campaignId: 1 });
crmCommunicationSchema.index({ automationRule: 1 });
crmCommunicationSchema.index({ tags: 1 });
crmCommunicationSchema.index({ createdAt: -1 });
crmCommunicationSchema.index({ deleted: 1, createdAt: -1 });

// Compound indexes for common queries
crmCommunicationSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
crmCommunicationSchema.index({ agentId: 1, interactionType: 1, createdAt: -1 });
crmCommunicationSchema.index({ ticketId: 1, direction: 1, createdAt: -1 });
crmCommunicationSchema.index({ campaignId: 1, responseRequired: 1 });
crmCommunicationSchema.index({ followUpRequired: 1, followUpDate: 1, deleted: 1 });

// Text indexes for search functionality
crmCommunicationSchema.index({
  internalNotes: 'text',
  tags: 'text',
  'metadata.subject': 'text'
});

// Virtual fields
crmCommunicationSchema.virtual('isOverdue').get(function() {
  if (!this.responseRequired || !this.responseDeadline || this.responseReceived) {
    return false;
  }
  return new Date() > this.responseDeadline;
});

crmCommunicationSchema.virtual('isFollowUpOverdue').get(function() {
  if (!this.followUpRequired || !this.followUpDate) {
    return false;
  }
  return new Date() > this.followUpDate;
});

crmCommunicationSchema.virtual('responseTime').get(function() {
  if (this.createdAt && this.responseReceivedAt) {
    return this.responseReceivedAt - this.createdAt; // milliseconds
  }
  return null;
});

// Pre-save middleware
crmCommunicationSchema.pre('save', function(next) {
  // Set response received timestamp when response is marked as received
  if (this.isModified('responseReceived') && this.responseReceived && !this.responseReceivedAt) {
    this.responseReceivedAt = new Date();
  }
  
  // Update follow-up status if follow-up date is in the past
  if (this.followUpRequired && this.followUpDate && new Date() > this.followUpDate) {
    // Could trigger notification here
  }
  
  next();
});

// Instance methods
crmCommunicationSchema.methods.markResponseReceived = function() {
  this.responseReceived = true;
  this.responseReceivedAt = new Date();
  return this.save();
};

crmCommunicationSchema.methods.addFollowUp = function(followUpDate, notes = '') {
  this.followUpRequired = true;
  this.followUpDate = followUpDate;
  if (notes) {
    this.followUpNotes = notes;
  }
  return this.save();
};

crmCommunicationSchema.methods.completeFollowUp = function() {
  this.followUpRequired = false;
  this.followUpDate = undefined;
  this.followUpNotes = '';
  return this.save();
};

crmCommunicationSchema.methods.softDelete = function(deletedBy) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Static methods
crmCommunicationSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, deleted: false });
};

crmCommunicationSchema.statics.findByEntity = function(entityType, entityId, options = {}) {
  const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
  
  return this.find({ entityType, entityId, deleted: false })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('communicationId')
    .populate('agentId', 'firstName lastName email')
    .populate('ticketId', 'ticketId title status');
};

crmCommunicationSchema.statics.findOverdueResponses = function() {
  const now = new Date();
  return this.find({
    responseRequired: true,
    responseReceived: false,
    responseDeadline: { $lt: now },
    deleted: false
  })
  .populate('communicationId')
  .populate('entityId')
  .populate('agentId', 'firstName lastName email');
};

crmCommunicationSchema.statics.findOverdueFollowUps = function() {
  const now = new Date();
  return this.find({
    followUpRequired: true,
    followUpDate: { $lt: now },
    deleted: false
  })
  .populate('communicationId')
  .populate('entityId')
  .populate('agentId', 'firstName lastName email');
};

crmCommunicationSchema.statics.getAgentWorkload = function(agentId, dateRange) {
  const matchStage = { agentId, deleted: false };
  
  if (dateRange) {
    const { start, end } = dateRange;
    matchStage.createdAt = {};
    if (start) matchStage.createdAt.$gte = new Date(start);
    if (end) matchStage.createdAt.$lte = new Date(end);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$interactionType',
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
        totalCost: { $sum: '$cost' },
        totalRevenue: { $sum: '$revenue' },
        avgSatisfaction: { $avg: '$satisfaction' },
        overdueResponses: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$responseRequired', true] },
                  { $eq: ['$responseReceived', false] },
                  { $lt: ['$responseDeadline', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        },
        overdueFollowUps: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$followUpRequired', true] },
                  { $lt: ['$followUpDate', new Date()] }
                ]
              },
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
crmCommunicationSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const CrmCommunication = mongoose.model('CrmCommunication', crmCommunicationSchema);

export default CrmCommunication;