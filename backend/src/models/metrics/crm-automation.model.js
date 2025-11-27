import mongoose from 'mongoose';

const crmAutomationSchema = new mongoose.Schema(
  {
    // Basic automation information
    name: {
      type: String,
      required: [true, 'Automation name is required'],
      trim: true,
      maxlength: [100, 'Automation name cannot exceed 100 characters'],
      index: true
    },
    
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // Automation categorization
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['lead_nurturing', 'customer_onboarding', 'retention', 'support', 'marketing', 'sales', 'administrative', 'other'],
      index: true
    },
    
    // Status and execution control
    enabled: {
      type: Boolean,
      default: true,
      index: true
    },
    
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['draft', 'active', 'paused', 'error', 'completed'],
      default: 'draft',
      index: true
    },
    
    // Trigger configuration
    trigger: {
      type: {
        type: String,
        required: [true, 'Trigger type is required'],
        enum: [
          'event',           // System events (user_registered, ticket_created, etc.)
          'schedule',        // Time-based triggers
          'webhook',         // External webhook triggers
          'condition',       // Condition-based triggers
          'manual'           // Manual execution
        ]
      },
      
      // Event-based trigger configuration
      event: {
        name: {
          type: String,
          trim: true
        },
        source: {
          type: String,
          trim: true
        },
        data: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
          default: {}
        }
      },
      
      // Schedule-based trigger configuration
      schedule: {
        type: {
          type: String,
          enum: ['once', 'recurring', 'cron'],
          default: 'recurring'
        },
        
        // For 'once' type
        executeAt: {
          type: Date
        },
        
        // For 'recurring' type
        interval: {
          type: String,
          enum: ['minutes', 'hours', 'days', 'weeks', 'months']
        },
        
        intervalValue: {
          type: Number,
          min: 1
        },
        
        // For 'cron' type
        cronExpression: {
          type: String,
          trim: true
        },
        
        // Timezone for schedule execution
        timezone: {
          type: String,
          default: 'UTC'
        },
        
        // Date range for execution
        startDate: {
          type: Date
        },
        
        endDate: {
          type: Date
        }
      },
      
      // Webhook trigger configuration
      webhook: {
        url: {
          type: String,
          trim: true
        },
        method: {
          type: String,
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
          default: 'POST'
        },
        headers: {
          type: Map,
          of: String,
          default: {}
        },
        authentication: {
          type: {
            type: String,
            enum: ['none', 'basic', 'bearer', 'api_key'],
            default: 'none'
          },
          username: String,
          password: String,
          token: String,
          apiKey: String
        }
      },
      
      // Condition-based trigger configuration
      conditions: [{
        field: {
          type: String,
          required: true,
          trim: true
        },
        operator: {
          type: String,
          required: true,
          enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains', 'in', 'not_in', 'exists', 'not_exists']
        },
        value: {
          type: mongoose.Schema.Types.Mixed,
          required: true
        },
        logicalOperator: {
          type: String,
          enum: ['and', 'or'],
          default: 'and'
        }
      }],
      
      // Additional trigger configuration
      config: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },
    
    // Actions to be executed
    actions: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      
      type: {
        type: String,
        required: true,
        enum: [
          'send_email',
          'send_sms',
          'send_push',
          'create_ticket',
          'update_contact',
          'assign_agent',
          'add_tag',
          'remove_tag',
          'set_field',
          'webhook',
          'wait',
          'condition',
          'sub_automation'
        ]
      },
      
      // Delay configuration
      delay: {
        type: Number,
        default: 0,
        min: 0
      },
      
      delayUnit: {
        type: String,
        enum: ['seconds', 'minutes', 'hours', 'days'],
        default: 'minutes'
      },
      
      // Action-specific configuration
      config: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
      },
      
      // Template configuration for communication actions
      templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CrmTemplate'
      },
      
      // Recipient configuration
      recipient: {
        type: {
          type: String,
          enum: ['contact', 'user', 'agent', 'custom', 'field'],
          default: 'contact'
        },
        field: String,
        value: String
      },
      
      // Error handling for this action
      onError: {
        type: String,
        enum: ['stop', 'continue', 'retry'],
        default: 'stop'
      },
      
      retryCount: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      }
    }],
    
    // Target audience/filters
    target: {
      type: {
        type: String,
        enum: ['all', 'segment', 'filter', 'custom'],
        default: 'all'
      },
      
      segmentIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CrmSegment'
      }],
      
      filters: [{
        field: {
          type: String,
          required: true,
          trim: true
        },
        operator: {
          type: String,
          required: true,
          enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains', 'in', 'not_in', 'exists', 'not_exists']
        },
        value: {
          type: mongoose.Schema.Types.Mixed,
          required: true
        },
        logicalOperator: {
          type: String,
          enum: ['and', 'or'],
          default: 'and'
        }
      }],
      
      // Custom query for advanced targeting
      customQuery: {
        type: String,
        trim: true
      }
    },
    
    // Execution limits and constraints
    limits: {
      maxExecutions: {
        type: Number,
        min: 1
      },
      
      maxExecutionsPerContact: {
        type: Number,
        min: 1
      },
      
      cooldownPeriod: {
        type: Number,
        min: 0
      },
      
      cooldownUnit: {
        type: String,
        enum: ['seconds', 'minutes', 'hours', 'days'],
        default: 'hours'
      }
    },
    
    // Performance tracking
    metrics: {
      executionCount: {
        type: Number,
        default: 0,
        min: 0
      },
      
      successCount: {
        type: Number,
        default: 0,
        min: 0
      },
      
      failureCount: {
        type: Number,
        default: 0,
        min: 0
      },
      
      lastExecuted: {
        type: Date
      },
      
      nextExecution: {
        type: Date,
        index: true
      },
      
      averageExecutionTime: {
        type: Number,
        default: 0,
        min: 0
      },
      
      totalContactsProcessed: {
        type: Number,
        default: 0,
        min: 0
      },
      
      successRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    },
    
    // Execution history (summary)
    recentExecutions: [{
      executedAt: {
        type: Date,
        required: true
      },
      
      status: {
        type: String,
        required: true,
        enum: ['success', 'failure', 'partial']
      },
      
      contactsProcessed: {
        type: Number,
        default: 0,
        min: 0
      },
      
      executionTime: {
        type: Number,
        default: 0,
        min: 0
      },
      
      error: {
        type: String,
        trim: true
      },
      
      triggeredBy: {
        type: String,
        trim: true
      }
    }],
    
    // Testing and preview
    testMode: {
      enabled: {
        type: Boolean,
        default: false
      },
      
      testRecipients: [{
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'testRecipients.modelType'
      }],
      
      testRecipientsModelType: {
        type: String,
        enum: ['CrmContact', 'User', 'Investor']
      }
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
    
    // Tags for categorization
    tags: [{
      type: String,
      trim: true,
      index: true
    }],
    
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
crmAutomationSchema.index({ name: 1 }, { unique: true });
crmAutomationSchema.index({ category: 1, status: 1 });
crmAutomationSchema.index({ enabled: 1, status: 1 });
crmAutomationSchema.index({ 'trigger.type': 1, status: 1 });
crmAutomationSchema.index({ 'metrics.nextExecution': 1, enabled: 1 });
crmAutomationSchema.index({ createdBy: 1, status: 1 });
crmAutomationSchema.index({ tags: 1 });
crmAutomationSchema.index({ createdAt: -1 });
crmAutomationSchema.index({ deleted: 1, createdAt: -1 });

// Compound indexes for common queries
crmAutomationSchema.index({ enabled: 1, status: 1, 'metrics.nextExecution': 1 });
crmAutomationSchema.index({ category: 1, enabled: 1, status: 1 });
crmAutomationSchema.index({ 'trigger.type': 1, enabled: 1, status: 1 });
crmAutomationSchema.index({ createdBy: 1, status: 1, deleted: 1 });

// Text indexes for search functionality
crmAutomationSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text'
});

// Virtual fields
crmAutomationSchema.virtual('isActive').get(function() {
  return this.enabled && this.status === 'active' && !this.deleted;
});

crmAutomationSchema.virtual('successRate').get(function() {
  if (this.metrics.executionCount === 0) return 0;
  return (this.metrics.successCount / this.metrics.executionCount) * 100;
});

crmAutomationSchema.virtual('isDueForExecution').get(function() {
  if (!this.isActive) return false;
  if (!this.metrics.nextExecution) return false;
  return new Date() >= this.metrics.nextExecution;
});

crmAutomationSchema.virtual('hasExecutionLimits').get(function() {
  return !!(this.limits.maxExecutions || 
            this.limits.maxExecutionsPerContact || 
            this.limits.cooldownPeriod);
});

// Pre-save middleware
crmAutomationSchema.pre('save', function(next) {
  // Calculate success rate
  if (this.isModified('metrics.executionCount') || this.isModified('metrics.successCount')) {
    if (this.metrics.executionCount > 0) {
      this.metrics.successRate = (this.metrics.successCount / this.metrics.executionCount) * 100;
    }
  }
  
  // Set next execution time for schedule-based triggers
  if (this.isNew || this.isModified('trigger.schedule')) {
    if (this.trigger.type === 'schedule' && this.enabled) {
      this.calculateNextExecution();
    }
  }
  
  // Limit recent executions array size
  if (this.recentExecutions && this.recentExecutions.length > 50) {
    this.recentExecutions = this.recentExecutions.slice(-50);
  }
  
  next();
});

// Instance methods
crmAutomationSchema.methods.calculateNextExecution = function() {
  if (this.trigger.type !== 'schedule') return;
  
  const now = new Date();
  const { schedule } = this.trigger;
  
  if (schedule.type === 'once' && schedule.executeAt) {
    this.metrics.nextExecution = schedule.executeAt;
  } else if (schedule.type === 'recurring') {
    const lastExecution = this.metrics.lastExecuted || now;
    const intervalMs = this.getIntervalInMilliseconds(schedule.interval, schedule.intervalValue);
    
    let nextExecution = new Date(lastExecution.getTime() + intervalMs);
    
    // Respect start and end dates
    if (schedule.startDate && nextExecution < schedule.startDate) {
      nextExecution = schedule.startDate;
    }
    
    if (schedule.endDate && nextExecution > schedule.endDate) {
      this.metrics.nextExecution = null;
      return;
    }
    
    this.metrics.nextExecution = nextExecution;
  } else if (schedule.type === 'cron' && schedule.cronExpression) {
    // Note: In a real implementation, you would use a cron library like node-cron
    // For now, we'll just set it to the next day as a placeholder
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.metrics.nextExecution = tomorrow;
  }
};

crmAutomationSchema.methods.getIntervalInMilliseconds = function(interval, value) {
  const multipliers = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000
  };
  
  return (multipliers[interval] || multipliers.minutes) * (value || 1);
};

crmAutomationSchema.methods.enable = function() {
  this.enabled = true;
  this.status = 'active';
  this.calculateNextExecution();
  return this.save();
};

crmAutomationSchema.methods.disable = function() {
  this.enabled = false;
  this.status = 'paused';
  this.metrics.nextExecution = null;
  return this.save();
};

crmAutomationSchema.methods.recordExecution = function(executionData) {
  const { status, contactsProcessed = 0, executionTime = 0, error, triggeredBy } = executionData;
  
  this.metrics.executionCount += 1;
  this.metrics.lastExecuted = new Date();
  this.metrics.totalContactsProcessed += contactsProcessed;
  
  if (status === 'success') {
    this.metrics.successCount += 1;
  } else {
    this.metrics.failureCount += 1;
  }
  
  // Update average execution time
  const totalExecutionTime = this.metrics.averageExecutionTime * (this.metrics.executionCount - 1) + executionTime;
  this.metrics.averageExecutionTime = totalExecutionTime / this.metrics.executionCount;
  
  // Add to recent executions
  this.recentExecutions.push({
    executedAt: new Date(),
    status,
    contactsProcessed,
    executionTime,
    error,
    triggeredBy
  });
  
  // Calculate next execution for schedule-based triggers
  if (this.trigger.type === 'schedule') {
    this.calculateNextExecution();
  }
  
  return this.save();
};

crmAutomationSchema.methods.canExecuteForContact = function(contactId, lastExecutionDate) {
  if (!this.hasExecutionLimits) return true;
  
  const now = new Date();
  
  // Check max executions per contact
  if (this.limits.maxExecutionsPerContact) {
    // In a real implementation, you would query the execution history for this contact
    // For now, we'll use a simplified check
    if (lastExecutionDate) {
      const cooldownMs = this.getIntervalInMilliseconds(
        this.limits.cooldownUnit || 'hours',
        this.limits.cooldownPeriod || 24
      );
      
      if (now.getTime() - lastExecutionDate.getTime() < cooldownMs) {
        return false;
      }
    }
  }
  
  return true;
};

crmAutomationSchema.methods.softDelete = function(deletedBy) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.enabled = false;
  this.status = 'completed';
  return this.save();
};

// Static methods
crmAutomationSchema.statics.findActive = function(filter = {}) {
  return this.find({ 
    ...filter, 
    enabled: true, 
    status: 'active', 
    deleted: false 
  });
};

crmAutomationSchema.statics.findDueForExecution = function() {
  const now = new Date();
  return this.find({
    enabled: true,
    status: 'active',
    deleted: false,
    'metrics.nextExecution': { $lte: now }
  })
  .sort({ 'metrics.nextExecution': 1 });
};

crmAutomationSchema.statics.findByCategory = function(category) {
  return this.find({ 
    category, 
    deleted: false 
  })
  .sort({ createdAt: -1 });
};

crmAutomationSchema.statics.getAutomationStats = function(filter = {}) {
  const matchStage = { ...filter, deleted: false };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalAutomations: { $sum: 1 },
        byCategory: {
          $push: {
            category: '$category',
            status: '$status',
            enabled: '$enabled'
          }
        },
        byStatus: {
          $push: {
            status: '$status',
            category: '$category'
          }
        },
        byTriggerType: {
          $push: {
            triggerType: '$trigger.type',
            status: '$status'
          }
        },
        enabledAutomations: {
          $sum: { $cond: ['$enabled', 1, 0] }
        },
        activeAutomations: {
          $sum: {
            $cond: [
              { $and: ['$enabled', { $eq: ['$status', 'active']}] },
              1,
              0
            ]
          }
        },
        totalExecutions: { $sum: '$metrics.executionCount' },
        totalSuccesses: { $sum: '$metrics.successCount' },
        totalFailures: { $sum: '$metrics.failureCount' },
        totalContactsProcessed: { $sum: '$metrics.totalContactsProcessed' },
        avgSuccessRate: { $avg: '$metrics.successRate' }
      }
    }
  ]);
};

crmAutomationSchema.statics.getTopPerformingAutomations = function(limit = 10) {
  return this.find({
    deleted: false,
    'metrics.executionCount': { $gte: 5 } // Minimum executions to be considered
  })
  .sort({ 'metrics.successRate': -1, 'metrics.executionCount': -1 })
  .limit(limit)
  .populate('createdBy', 'firstName lastName email');
};

crmAutomationSchema.statics.searchAutomations = function(searchTerm, filters = {}) {
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
crmAutomationSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const CrmAutomation = mongoose.model('CrmAutomation', crmAutomationSchema);

export default CrmAutomation;