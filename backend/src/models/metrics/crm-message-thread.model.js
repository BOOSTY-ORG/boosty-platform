import mongoose from 'mongoose';

const crmMessageThreadSchema = new mongoose.Schema({
  // Thread identification
  threadId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Thread type and scope
  threadType: {
    type: String,
    required: true,
    enum: ['direct', 'group'],
    default: 'direct',
    index: true
  },
  
  // Participants
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CrmContact'
    },
    role: {
      type: String,
      enum: ['agent', 'contact', 'lead'],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastReadAt: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Thread metadata
  subject: {
    type: String,
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  
  // Assignment and ownership
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Thread status
  status: {
    type: String,
    required: true,
    enum: ['active', 'archived', 'closed'],
    default: 'active',
    index: true
  },
  
  // Priority and categorization
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  // Channel information
  primaryChannel: {
    type: String,
    required: true,
    enum: ['in_app', 'email', 'sms', 'whatsapp'],
    default: 'in_app',
    index: true
  },
  
  // Related entities
  relatedEntityType: {
    type: String,
    enum: ['contact', 'lead', 'ticket', 'application', 'investor']
  },
  
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  
  // Last activity tracking
  lastMessageAt: {
    type: Date,
    index: true
  },
  
  lastActivityBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Thread statistics
  messageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  unreadCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Automation and routing
  autoAssignmentEnabled: {
    type: Boolean,
    default: false
  },
  
  assignmentRules: [{
    condition: String,
    action: String,
    priority: Number
  }],
  
  // SLA and response time tracking
  responseDeadline: {
    type: Date,
    index: true
  },
  
  firstResponseAt: {
    type: Date
  },
  
  averageResponseTime: {
    type: Number,
    default: 0
  },
  
  // Tags and categorization
  tags: [{
    type: String,
    trim: true,
    index: true
  }],
  
  // Custom fields for extensibility
  customFields: {
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
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
crmMessageThreadSchema.index({ threadId: 1 });
crmMessageThreadSchema.index({ threadType: 1, status: 1 });
crmMessageThreadSchema.index({ assignedAgent: 1, status: 1, lastMessageAt: -1 });
crmMessageThreadSchema.index({ 'participants.contactId': 1, status: 1 });
crmMessageThreadSchema.index({ 'participants.userId': 1, status: 1 });
crmMessageThreadSchema.index({ tags: 1, priority: 1, status: 1 });
crmMessageThreadSchema.index({ relatedEntityType: 1, relatedEntityId: 1 });
crmMessageThreadSchema.index({ responseDeadline: 1, status: 1 });
crmMessageThreadSchema.index({ createdAt: -1 });
crmMessageThreadSchema.index({ deleted: 1, createdAt: -1 });

// Compound indexes for common queries
crmMessageThreadSchema.index({ assignedAgent: 1, status: 1, priority: -1 });
crmMessageThreadSchema.index({ threadType: 1, status: 1, lastMessageAt: -1 });
crmMessageThreadSchema.index({ deleted: 1, status: 1, threadType: 1 });

// Text indexes for search functionality
crmMessageThreadSchema.index({
  subject: 'text',
  tags: 'text',
  'customFields.notes': 'text'
});

// Virtual fields
crmMessageThreadSchema.virtual('isOverdue').get(function() {
  if (!this.responseDeadline || this.status === 'closed') {
    return false;
  }
  return new Date() > this.responseDeadline;
});

crmMessageThreadSchema.virtual('participantCount').get(function() {
  return this.participants ? this.participants.length : 0;
});

crmMessageThreadSchema.virtual('hasUnreadMessages').get(function() {
  return this.unreadCount > 0;
});

crmMessageThreadSchema.virtual('isHighPriority').get(function() {
  return this.priority === 'high' || this.priority === 'urgent';
});

// Pre-save middleware
crmMessageThreadSchema.pre('save', function(next) {
  // Generate thread ID if not provided
  if (this.isNew && !this.threadId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.threadId = `THR_${timestamp}_${random}`;
  }
  
  // Set response deadline if priority is high or urgent and no deadline exists
  if (this.isNew && (this.priority === 'high' || this.priority === 'urgent') && !this.responseDeadline) {
    const hours = this.priority === 'urgent' ? 2 : 24;
    this.responseDeadline = new Date(Date.now() + (hours * 60 * 60 * 1000));
  }
  
  next();
});

// Instance methods
crmMessageThreadSchema.methods.addParticipant = function(userId, contactId, role) {
  // Check if participant already exists
  const existingParticipant = this.participants.find(p => 
    (userId && p.userId && p.userId.toString() === userId.toString()) ||
    (contactId && p.contactId && p.contactId.toString() === contactId.toString())
  );
  
  if (!existingParticipant) {
    this.participants.push({
      userId,
      contactId,
      role,
      joinedAt: new Date(),
      isActive: true
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

crmMessageThreadSchema.methods.removeParticipant = function(userId, contactId) {
  this.participants = this.participants.filter(p => 
    !(userId && p.userId && p.userId.toString() === userId.toString()) &&
    !(contactId && p.contactId && p.contactId.toString() === contactId.toString())
  );
  return this.save();
};

crmMessageThreadSchema.methods.markAsRead = function(userId, contactId) {
  const participant = this.participants.find(p => 
    (userId && p.userId && p.userId.toString() === userId.toString()) ||
    (contactId && p.contactId && p.contactId.toString() === contactId.toString())
  );
  
  if (participant) {
    participant.lastReadAt = new Date();
  }
  
  return this.save();
};

crmMessageThreadSchema.methods.updateMessageCount = function(increment = 1) {
  this.messageCount += increment;
  this.lastMessageAt = new Date();
  return this.save();
};

crmMessageThreadSchema.methods.assignToAgent = function(agentId) {
  this.assignedAgent = agentId;
  return this.save();
};

crmMessageThreadSchema.methods.closeThread = function() {
  this.status = 'closed';
  return this.save();
};

crmMessageThreadSchema.methods.archiveThread = function() {
  this.status = 'archived';
  return this.save();
};

crmMessageThreadSchema.methods.softDelete = function(deletedBy) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Static methods
crmMessageThreadSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, deleted: false });
};

crmMessageThreadSchema.statics.findByParticipant = function(userId, contactId, options = {}) {
  const { page = 1, limit = 20, sort = { lastMessageAt: -1 } } = options;
  const query = { deleted: false };
  
  if (userId) {
    query['participants.userId'] = userId;
  }
  
  if (contactId) {
    query['participants.contactId'] = contactId;
  }
  
  return this.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('assignedAgent', 'firstName lastName email')
    .populate('participants.userId', 'firstName lastName email')
    .populate('participants.contactId', 'firstName lastName email')
    .populate('lastActivityBy', 'firstName lastName email');
};

crmMessageThreadSchema.statics.findUnreadThreads = function(userId, contactId) {
  const query = { 
    deleted: false, 
    status: 'active',
    unreadCount: { $gt: 0 }
  };
  
  if (userId) {
    query['participants.userId'] = userId;
  }
  
  if (contactId) {
    query['participants.contactId'] = contactId;
  }
  
  return this.find(query)
    .sort({ lastMessageAt: -1 })
    .populate('assignedAgent', 'firstName lastName email')
    .populate('lastActivityBy', 'firstName lastName email');
};

crmMessageThreadSchema.statics.findOverdueThreads = function() {
  const now = new Date();
  return this.find({
    responseDeadline: { $lt: now },
    status: { $in: ['active'] },
    deleted: false
  })
  .populate('assignedAgent', 'firstName lastName email')
  .populate('participants.userId', 'firstName lastName email')
  .populate('participants.contactId', 'firstName lastName email')
  .sort({ responseDeadline: 1 });
};

crmMessageThreadSchema.statics.getAgentWorkload = function(agentId, options = {}) {
  const { status = 'active', threadType = null } = options;
  const matchStage = { 
    assignedAgent: agentId, 
    status,
    deleted: false 
  };
  
  if (threadType) {
    matchStage.threadType = threadType;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 },
        unreadTotal: { $sum: '$unreadCount' },
        avgResponseTime: { $avg: '$averageResponseTime' },
        overdueCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$responseDeadline', null] },
                  { $lt: ['$responseDeadline', new Date()] }
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

crmMessageThreadSchema.statics.getThreadStats = function(filter = {}) {
  const matchStage = { ...filter, deleted: false };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalThreads: { $sum: 1 },
        activeThreads: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        archivedThreads: {
          $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] }
        },
        closedThreads: {
          $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
        },
        directThreads: {
          $sum: { $cond: [{ $eq: ['$threadType', 'direct'] }, 1, 0] }
        },
        groupThreads: {
          $sum: { $cond: [{ $eq: ['$threadType', 'group'] }, 1, 0] }
        },
        totalMessages: { $sum: '$messageCount' },
        totalUnread: { $sum: '$unreadCount' },
        avgResponseTime: { $avg: '$averageResponseTime' },
        overdueThreads: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$responseDeadline', null] },
                  { $lt: ['$responseDeadline', new Date()] }
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
crmMessageThreadSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const CrmMessageThread = mongoose.model('CrmMessageThread', crmMessageThreadSchema);

export default CrmMessageThread;