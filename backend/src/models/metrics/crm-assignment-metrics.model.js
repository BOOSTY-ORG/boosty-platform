import mongoose from 'mongoose';

const crmAssignmentMetricsSchema = new mongoose.Schema({
  // Assignment identification
  assignmentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Agent and entity relationship
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  entityType: {
    type: String,
    required: true,
    enum: ['contact', 'lead', 'thread', 'ticket'],
    index: true
  },
  
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  
  // Assignment details
  assignmentType: {
    type: String,
    required: true,
    enum: ['manual', 'automatic', 'round_robin', 'workload_based', 'skill_based'],
    default: 'manual',
    index: true
  },
  
  assignmentReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Assignment reason cannot exceed 500 characters']
  },
  
  // Assignment status
  status: {
    type: String,
    required: true,
    enum: ['active', 'transferred', 'completed', 'cancelled'],
    default: 'active',
    index: true
  },
  
  // Assignment timing
  assignedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Transfer information (if applicable)
  transferredFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  transferredAt: {
    type: Date
  },
  
  transferReason: {
    type: String,
    trim: true
  },
  
  // Completion information
  completedAt: {
    type: Date
  },
  
  completionReason: {
    type: String,
    enum: ['resolved', 'closed', 'timeout', 'escalated']
  },
  
  // Workload and capacity
  workloadScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  capacityUtilization: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Performance metrics
  firstResponseTime: {
    type: Number,
    min: 0
  },
  
  averageResponseTime: {
    type: Number,
    min: 0
  },
  
  resolutionTime: {
    type: Number,
    min: 0
  },
  
  satisfactionScore: {
    type: Number,
    min: 1,
    max: 5
  },
  
  // Activity tracking
  totalMessages: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalInteractions: {
    type: Number,
    default: 0,
    min: 0
  },
  
  lastActivityAt: {
    type: Date,
    index: true
  },
  
  // SLA tracking
  slaDeadline: {
    type: Date,
    index: true
  },
  
  slaMet: {
    type: Boolean,
    default: true
  },
  
  slaBreachReason: {
    type: String,
    trim: true
  },
  
  // Priority and escalation
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  escalatedAt: {
    type: Date
  },
  
  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Skills and specialization
  requiredSkills: [{
    type: String,
    trim: true
  }],
  
  agentSkills: [{
    type: String,
    trim: true
  }],
  
  skillMatchScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Tags and categorization
  tags: [{
    type: String,
    trim: true,
    index: true
  }],
  
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
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
crmAssignmentMetricsSchema.index({ assignmentId: 1 });
crmAssignmentMetricsSchema.index({ agentId: 1, status: 1, assignedAt: -1 });
crmAssignmentMetricsSchema.index({ entityType: 1, entityId: 1, status: 1 });
crmAssignmentMetricsSchema.index({ assignmentType: 1, status: 1 });
crmAssignmentMetricsSchema.index({ priority: 1, status: 1 });
crmAssignmentMetricsSchema.index({ slaDeadline: 1, status: 1 });
crmAssignmentMetricsSchema.index({ escalatedTo: 1, escalationLevel: 1 });
crmAssignmentMetricsSchema.index({ tags: 1, status: 1 });
crmAssignmentMetricsSchema.index({ createdAt: -1 });
crmAssignmentMetricsSchema.index({ deleted: 1, createdAt: -1 });

// Compound indexes for common queries
crmAssignmentMetricsSchema.index({ agentId: 1, entityType: 1, status: 1 });
crmAssignmentMetricsSchema.index({ agentId: 1, priority: 1, status: 1 });
crmAssignmentMetricsSchema.index({ entityType: 1, priority: 1, status: 1 });
crmAssignmentMetricsSchema.index({ status: 1, assignedAt: -1 });
crmAssignmentMetricsSchema.index({ deleted: 1, status: 1, agentId: 1 });

// Text indexes for search functionality
crmAssignmentMetricsSchema.index({
  assignmentReason: 'text',
  transferReason: 'text',
  slaBreachReason: 'text',
  tags: 'text'
});

// Virtual fields
crmAssignmentMetricsSchema.virtual('isOverdue').get(function() {
  if (!this.slaDeadline || this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.slaDeadline;
});

crmAssignmentMetricsSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

crmAssignmentMetricsSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

crmAssignmentMetricsSchema.virtual('isTransferred').get(function() {
  return this.status === 'transferred';
});

crmAssignmentMetricsSchema.virtual('isHighPriority').get(function() {
  return this.priority === 'high' || this.priority === 'urgent';
});

crmAssignmentMetricsSchema.virtual('assignmentDuration').get(function() {
  if (!this.assignedAt) return null;
  
  const endTime = this.completedAt || this.transferredAt || new Date();
  return endTime - this.assignedAt; // milliseconds
});

crmAssignmentMetricsSchema.virtual('isEscalated').get(function() {
  return this.escalationLevel > 0;
});

// Pre-save middleware
crmAssignmentMetricsSchema.pre('save', function(next) {
  // Generate assignment ID if not provided
  if (this.isNew && !this.assignmentId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.assignmentId = `ASM_${timestamp}_${random}`;
  }
  
  // Set SLA deadline based on priority if not provided
  if (this.isNew && !this.slaDeadline) {
    const hours = {
      'urgent': 2,
      'high': 8,
      'medium': 24,
      'low': 72
    };
    
    if (hours[this.priority]) {
      this.slaDeadline = new Date(Date.now() + (hours[this.priority] * 60 * 60 * 1000));
    }
  }
  
  // Update SLA status based on deadline
  if (this.isModified('slaDeadline') || this.isModified('status')) {
    if (this.slaDeadline && this.status === 'active') {
      this.slaMet = new Date() <= this.slaDeadline;
    }
  }
  
  // Update completion timestamp
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status === 'transferred' && !this.transferredAt) {
      this.transferredAt = new Date();
    }
  }
  
  next();
});

// Instance methods
crmAssignmentMetricsSchema.methods.transfer = function(toAgentId, reason) {
  this.status = 'transferred';
  this.transferredAt = new Date();
  this.transferredFrom = this.agentId;
  this.agentId = toAgentId;
  this.transferReason = reason;
  return this.save();
};

crmAssignmentMetricsSchema.methods.complete = function(completionReason, satisfactionScore = null) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.completionReason = completionReason;
  
  if (satisfactionScore !== null) {
    this.satisfactionScore = satisfactionScore;
  }
  
  return this.save();
};

crmAssignmentMetricsSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

crmAssignmentMetricsSchema.methods.escalate = function(toAgentId, level = null) {
  this.escalatedAt = new Date();
  this.escalatedTo = toAgentId;
  
  if (level !== null) {
    this.escalationLevel = Math.min(5, Math.max(0, level));
  } else {
    this.escalationLevel += 1;
  }
  
  return this.save();
};

crmAssignmentMetricsSchema.methods.updateWorkload = function(score, utilization = null) {
  this.workloadScore = Math.max(0, Math.min(100, score));
  
  if (utilization !== null) {
    this.capacityUtilization = Math.max(0, Math.min(100, utilization));
  }
  
  return this.save();
};

crmAssignmentMetricsSchema.methods.updateMetrics = function(metrics) {
  const {
    firstResponseTime,
    averageResponseTime,
    resolutionTime,
    totalMessages,
    totalInteractions
  } = metrics;
  
  if (firstResponseTime !== undefined) {
    this.firstResponseTime = firstResponseTime;
  }
  
  if (averageResponseTime !== undefined) {
    this.averageResponseTime = averageResponseTime;
  }
  
  if (resolutionTime !== undefined) {
    this.resolutionTime = resolutionTime;
  }
  
  if (totalMessages !== undefined) {
    this.totalMessages = totalMessages;
  }
  
  if (totalInteractions !== undefined) {
    this.totalInteractions = totalInteractions;
  }
  
  this.lastActivityAt = new Date();
  return this.save();
};

crmAssignmentMetricsSchema.methods.updateSkillMatch = function(requiredSkills, agentSkills) {
  this.requiredSkills = requiredSkills || [];
  this.agentSkills = agentSkills || [];
  
  // Calculate skill match score
  if (this.requiredSkills.length > 0) {
    const matchingSkills = this.requiredSkills.filter(skill => 
      this.agentSkills.includes(skill)
    );
    this.skillMatchScore = (matchingSkills.length / this.requiredSkills.length) * 100;
  } else {
    this.skillMatchScore = 100; // No specific skills required
  }
  
  return this.save();
};

crmAssignmentMetricsSchema.methods.softDelete = function(deletedBy) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Static methods
crmAssignmentMetricsSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, deleted: false });
};

crmAssignmentMetricsSchema.statics.findByAgent = function(agentId, options = {}) {
  const { 
    page = 1, 
    limit = 20, 
    status = null,
    entityType = null,
    sort = { assignedAt: -1 }
  } = options;
  
  const query = { agentId, deleted: false };
  
  if (status) {
    query.status = status;
  }
  
  if (entityType) {
    query.entityType = entityType;
  }
  
  return this.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('agentId', 'firstName lastName email')
    .populate('assignedBy', 'firstName lastName email')
    .populate('transferredFrom', 'firstName lastName email')
    .populate('escalatedTo', 'firstName lastName email');
};

crmAssignmentMetricsSchema.statics.findOverdueAssignments = function() {
  const now = new Date();
  return this.find({
    slaDeadline: { $lt: now },
    status: { $in: ['active'] },
    deleted: false
  })
  .populate('agentId', 'firstName lastName email')
  .populate('assignedBy', 'firstName lastName email')
  .sort({ slaDeadline: 1 });
};

crmAssignmentMetricsSchema.statics.getAgentWorkload = function(agentId, dateRange = null) {
  const matchStage = { agentId, deleted: false };
  
  if (dateRange) {
    const { start, end } = dateRange;
    matchStage.assignedAt = {};
    if (start) matchStage.assignedAt.$gte = new Date(start);
    if (end) matchStage.assignedAt.$lte = new Date(end);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgWorkloadScore: { $avg: '$workloadScore' },
        avgCapacityUtilization: { $avg: '$capacityUtilization' },
        avgFirstResponseTime: { $avg: '$firstResponseTime' },
        avgResolutionTime: { $avg: '$resolutionTime' },
        avgSatisfactionScore: { $avg: '$satisfactionScore' },
        overdueCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$slaDeadline', null] },
                  { $lt: ['$slaDeadline', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        },
        escalatedCount: {
          $sum: {
            $cond: [{ $gt: ['$escalationLevel', 0] }, 1, 0]
          }
        }
      }
    }
  ]);
};

crmAssignmentMetricsSchema.statics.getAssignmentStats = function(filter = {}) {
  const matchStage = { ...filter, deleted: false };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalAssignments: { $sum: 1 },
        activeAssignments: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        completedAssignments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        transferredAssignments: {
          $sum: { $cond: [{ $eq: ['$status', 'transferred'] }, 1, 0] }
        },
        cancelledAssignments: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        avgFirstResponseTime: { $avg: '$firstResponseTime' },
        avgResolutionTime: { $avg: '$resolutionTime' },
        avgSatisfactionScore: { $avg: '$satisfactionScore' },
        avgWorkloadScore: { $avg: '$workloadScore' },
        avgCapacityUtilization: { $avg: '$capacityUtilization' },
        overdueAssignments: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$slaDeadline', null] },
                  { $lt: ['$slaDeadline', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        },
        escalatedAssignments: {
          $sum: {
            $cond: [{ $gt: ['$escalationLevel', 0] }, 1, 0]
          }
        },
        byEntityType: {
          $push: {
            entityType: '$entityType',
            status: '$status',
            priority: '$priority'
          }
        },
        byPriority: {
          $push: {
            priority: '$priority',
            status: '$status'
          }
        },
        byAssignmentType: {
          $push: {
            assignmentType: '$assignmentType',
            status: '$status'
          }
        }
      }
    }
  ]);
};

crmAssignmentMetricsSchema.statics.getAgentPerformanceMetrics = function(agentId, dateRange = null) {
  const matchStage = { agentId, deleted: false };
  
  if (dateRange) {
    const { start, end } = dateRange;
    matchStage.assignedAt = {};
    if (start) matchStage.assignedAt.$gte = new Date(start);
    if (end) matchStage.assignedAt.$lte = new Date(end);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          entityType: '$entityType',
          priority: '$priority'
        },
        count: { $sum: 1 },
        avgFirstResponseTime: { $avg: '$firstResponseTime' },
        avgResolutionTime: { $avg: '$resolutionTime' },
        avgSatisfactionScore: { $avg: '$satisfactionScore' },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        overdueCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$slaDeadline', null] },
                  { $lt: ['$slaDeadline', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id.entityType',
        metrics: {
          $push: {
            priority: '$_id.priority',
            count: '$count',
            avgFirstResponseTime: '$avgFirstResponseTime',
            avgResolutionTime: '$avgResolutionTime',
            avgSatisfactionScore: '$avgSatisfactionScore',
            completedCount: '$completedCount',
            overdueCount: '$overdueCount'
          }
        },
        totalCount: { $sum: '$count' },
        totalCompleted: { $sum: '$completedCount' },
        totalOverdue: { $sum: '$overdueCount' },
        avgFirstResponseTime: { $avg: '$avgFirstResponseTime' },
        avgResolutionTime: { $avg: '$avgResolutionTime' },
        avgSatisfactionScore: { $avg: '$avgSatisfactionScore' }
      }
    }
  ]);
};

// toJSON transformation
crmAssignmentMetricsSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const CrmAssignmentMetrics = mongoose.model('CrmAssignmentMetrics', crmAssignmentMetricsSchema);

export default CrmAssignmentMetrics;