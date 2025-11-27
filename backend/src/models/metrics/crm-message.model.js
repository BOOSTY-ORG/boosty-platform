import mongoose from 'mongoose';

const crmMessageSchema = new mongoose.Schema({
  // Thread reference
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CrmMessageThread',
    required: true,
    index: true
  },
  
  // Message content
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [10000, 'Message content cannot exceed 10000 characters']
  },
  
  // Message type
  messageType: {
    type: String,
    required: true,
    enum: ['text', 'image', 'file', 'audio', 'video', 'location', 'contact_share', 'system'],
    default: 'text',
    index: true
  },
  
  // Sender information
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel',
    required: true,
    index: true
  },
  
  senderModel: {
    type: String,
    required: true,
    enum: ['User', 'CrmContact'],
    default: 'User'
  },
  
  senderRole: {
    type: String,
    required: true,
    enum: ['agent', 'contact', 'lead', 'system'],
    index: true
  },
  
  // Message status
  status: {
    type: String,
    required: true,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent',
    index: true
  },
  
  // Delivery tracking
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  deliveredAt: {
    type: Date,
    index: true
  },
  
  readAt: {
    type: Date,
    index: true
  },
  
  // Message metadata
  editedAt: {
    type: Date
  },
  
  editedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Attachments
  attachments: [{
    name: String,
    type: String,
    size: Number,
    url: String,
    contentType: String,
    thumbnailUrl: String
  }],
  
  // Reactions and engagement
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CrmContact'
    },
    reaction: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Reply information
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CrmMessage'
  },
  
  // Forward information
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CrmMessage'
  },
  
  forwardedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Message routing and delivery
  deliveryChannels: [{
    channel: {
      type: String,
      enum: ['in_app', 'email', 'sms', 'whatsapp']
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending'
    },
    sentAt: Date,
    deliveredAt: Date,
    error: String,
    externalId: String
  }],
  
  // Search and indexing
  searchableContent: {
    type: String,
    index: 'text'
  },
  
  // Analytics and metrics
  engagementScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  responseTime: {
    type: Number,
    min: 0
  },
  
  // System messages
  systemMessageType: {
    type: String,
    enum: ['thread_created', 'participant_added', 'participant_removed', 'thread_closed', 'assignment_changed', 'priority_changed']
  },
  
  systemMessageData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Custom fields
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
    refPath: 'senderModel'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
crmMessageSchema.index({ threadId: 1, sentAt: -1 });
crmMessageSchema.index({ senderId: 1, status: 1, sentAt: -1 });
crmMessageSchema.index({ senderModel: 1, senderId: 1 });
crmMessageSchema.index({ messageType: 1, sentAt: -1 });
crmMessageSchema.index({ status: 1, sentAt: -1 });
crmMessageSchema.index({ replyTo: 1 });
crmMessageSchema.index({ forwardedFrom: 1 });
crmMessageSchema.index({ searchableContent: 'text' });
crmMessageSchema.index({ deleted: 1, sentAt: -1 });

// Compound indexes for common queries
crmMessageSchema.index({ threadId: 1, status: 1, sentAt: -1 });
crmMessageSchema.index({ senderId: 1, threadId: 1, sentAt: -1 });
crmMessageSchema.index({ deleted: 1, threadId: 1, sentAt: -1 });

// Virtual fields
crmMessageSchema.virtual('isDelivered').get(function() {
  return this.status === 'delivered' || this.status === 'read';
});

crmMessageSchema.virtual('isRead').get(function() {
  return this.status === 'read';
});

crmMessageSchema.virtual('isEdited').get(function() {
  return this.editedCount > 0;
});

crmMessageSchema.virtual('hasAttachments').get(function() {
  return this.attachments && this.attachments.length > 0;
});

crmMessageSchema.virtual('attachmentCount').get(function() {
  return this.attachments ? this.attachments.length : 0;
});

crmMessageSchema.virtual('reactionCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

crmMessageSchema.virtual('deliveryStatus').get(function() {
  const channelStatus = {};
  if (this.deliveryChannels) {
    this.deliveryChannels.forEach(channel => {
      channelStatus[channel.channel] = channel.status;
    });
  }
  return channelStatus;
});

// Pre-save middleware
crmMessageSchema.pre('save', function(next) {
  // Set searchable content for text search
  if (this.isModified('content') && this.messageType === 'text') {
    this.searchableContent = this.content;
  }
  
  // Update delivery timestamps
  if (this.isModified('status')) {
    if (this.status === 'delivered' && !this.deliveredAt) {
      this.deliveredAt = new Date();
    }
    if (this.status === 'read' && !this.readAt) {
      this.readAt = new Date();
    }
  }
  
  // Update edited timestamp
  if (this.isModified('content') && !this.isNew) {
    this.editedAt = new Date();
    this.editedCount += 1;
  }
  
  next();
});

// Instance methods
crmMessageSchema.methods.markAsDelivered = function(channel = 'in_app') {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  
  // Update delivery channel status
  const deliveryChannel = this.deliveryChannels.find(dc => dc.channel === channel);
  if (deliveryChannel) {
    deliveryChannel.status = 'delivered';
    deliveryChannel.deliveredAt = new Date();
  } else {
    this.deliveryChannels.push({
      channel,
      status: 'delivered',
      deliveredAt: new Date()
    });
  }
  
  return this.save();
};

crmMessageSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  
  // Update all delivery channels to read
  this.deliveryChannels.forEach(channel => {
    if (channel.status === 'delivered') {
      channel.status = 'read';
    }
  });
  
  return this.save();
};

crmMessageSchema.methods.addReaction = function(userId, contactId, reaction) {
  // Check if user/contact already reacted
  const existingReaction = this.reactions.find(r => 
    (userId && r.userId && r.userId.toString() === userId.toString()) ||
    (contactId && r.contactId && r.contactId.toString() === contactId.toString())
  );
  
  if (existingReaction) {
    existingReaction.reaction = reaction;
    existingReaction.createdAt = new Date();
  } else {
    this.reactions.push({
      userId,
      contactId,
      reaction,
      createdAt: new Date()
    });
  }
  
  return this.save();
};

crmMessageSchema.methods.removeReaction = function(userId, contactId) {
  this.reactions = this.reactions.filter(r => 
    !(userId && r.userId && r.userId.toString() === userId.toString()) &&
    !(contactId && r.contactId && r.contactId.toString() === contactId.toString())
  );
  
  return this.save();
};

crmMessageSchema.methods.addAttachment = function(attachmentData) {
  this.attachments.push({
    ...attachmentData,
    name: attachmentData.name || 'attachment',
    type: attachmentData.type || 'unknown',
    size: attachmentData.size || 0
  });
  
  return this.save();
};

crmMessageSchema.methods.removeAttachment = function(attachmentIndex) {
  if (attachmentIndex >= 0 && attachmentIndex < this.attachments.length) {
    this.attachments.splice(attachmentIndex, 1);
    return this.save();
  }
  
  return Promise.resolve(this);
};

crmMessageSchema.methods.updateEngagementScore = function(score) {
  this.engagementScore = Math.max(0, Math.min(100, score));
  return this.save();
};

crmMessageSchema.methods.softDelete = function(deletedBy) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Static methods
crmMessageSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, deleted: false });
};

crmMessageSchema.statics.findByThread = function(threadId, options = {}) {
  const { 
    page = 1, 
    limit = 50, 
    before = null, 
    after = null,
    messageType = null,
    sort = { sentAt: -1 }
  } = options;
  
  const query = { threadId, deleted: false };
  
  if (before) {
    query.sentAt = { $lt: new Date(before) };
  }
  
  if (after) {
    query.sentAt = { ...query.sentAt, $gt: new Date(after) };
  }
  
  if (messageType) {
    query.messageType = messageType;
  }
  
  return this.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('senderId', 'firstName lastName email')
    .populate('replyTo', 'content messageType')
    .populate('forwardedFrom', 'content messageType');
};

crmMessageSchema.statics.findUnreadMessages = function(userId, contactId) {
  const query = { 
    status: { $ne: 'read' },
    deleted: false
  };
  
  if (userId) {
    query.senderModel = 'User';
    query.senderId = { $ne: userId };
  }
  
  if (contactId) {
    query.senderModel = 'CrmContact';
    query.senderId = { $ne: contactId };
  }
  
  return this.find(query)
    .sort({ sentAt: -1 })
    .populate('threadId', 'threadId subject')
    .populate('senderId', 'firstName lastName email');
};

crmMessageSchema.statics.searchMessages = function(searchTerm, options = {}) {
  const { 
    page = 1, 
    limit = 20,
    threadId = null,
    senderId = null,
    messageType = null
  } = options;
  
  const query = { 
    deleted: false,
    $text: { $search: searchTerm }
  };
  
  if (threadId) {
    query.threadId = threadId;
  }
  
  if (senderId) {
    query.senderId = senderId;
  }
  
  if (messageType) {
    query.messageType = messageType;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('threadId', 'threadId subject')
    .populate('senderId', 'firstName lastName email');
};

crmMessageSchema.statics.getMessageStats = function(filter = {}) {
  const matchStage = { ...filter, deleted: false };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        sentMessages: {
          $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
        },
        deliveredMessages: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        readMessages: {
          $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] }
        },
        failedMessages: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        textMessages: {
          $sum: { $cond: [{ $eq: ['$messageType', 'text'] }, 1, 0] }
        },
        imageMessages: {
          $sum: { $cond: [{ $eq: ['$messageType', 'image'] }, 1, 0] }
        },
        fileMessages: {
          $sum: { $cond: [{ $eq: ['$messageType', 'file'] }, 1, 0] }
        },
        systemMessages: {
          $sum: { $cond: [{ $eq: ['$messageType', 'system'] }, 1, 0] }
        },
        avgEngagementScore: { $avg: '$engagementScore' },
        totalReactions: { $sum: { $size: '$reactions' } },
        totalAttachments: { $sum: { $size: '$attachments' } },
        avgResponseTime: { $avg: '$responseTime' }
      }
    }
  ]);
};

// toJSON transformation
crmMessageSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const CrmMessage = mongoose.model('CrmMessage', crmMessageSchema);

export default CrmMessage;