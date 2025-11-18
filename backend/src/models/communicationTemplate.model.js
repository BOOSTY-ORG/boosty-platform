import mongoose from 'mongoose';

const communicationTemplateSchema = new mongoose.Schema(
  {
    // Template identification
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [100, 'Template name cannot exceed 100 characters']
    },
    
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // Communication configuration
    type: {
      type: String,
      required: [true, 'Communication type is required'],
      enum: ['email', 'sms', 'in_app', 'push_notification'],
      index: true
    },
    
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['welcome', 'application', 'kyc', 'payment', 'support', 'marketing', 'general'],
      index: true
    },
    
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    
    // Content
    subject: {
      type: String,
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true
    },
    
    // Template variables
    variables: [{
      name: {
        type: String,
        required: true
      },
      description: {
        type: String,
        trim: true
      },
      type: {
        type: String,
        enum: ['text', 'number', 'date', 'boolean', 'select'],
        default: 'text'
      },
      required: {
        type: Boolean,
        default: false
      },
      defaultValue: {
        type: mongoose.Schema.Types.Mixed
      },
      options: [{
        label: String,
        value: mongoose.Schema.Types.Mixed
      }]
    }],
    
    // Template settings
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    
    isSystem: {
      type: Boolean,
      default: false,
      index: true
    },
    
    // Usage tracking
    usageCount: {
      type: Number,
      default: 0
    },
    
    lastUsedAt: {
      type: Date
    },
    
    // Versioning
    version: {
      type: String,
      default: '1.0.0'
    },
    
    parentTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunicationTemplate',
      index: true
    },
    
    // Approval workflow
    isApproved: {
      type: Boolean,
      default: true
    },
    
    approvedBy: {
      type: String,
      trim: true
    },
    
    approvedAt: {
      type: Date
    },
    
    // Template metadata
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Audit fields
    createdBy: {
      type: String,
      required: true,
      default: 'system'
    },
    
    updatedBy: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
communicationTemplateSchema.index({ name: 1, isActive: 1 });
communicationTemplateSchema.index({ type: 1, category: 1 });
communicationTemplateSchema.index({ category: 1, isActive: 1 });
communicationTemplateSchema.index({ createdBy: 1, createdAt: -1 });

// Virtuals
communicationTemplateSchema.virtual('variableNames').get(function() {
  return this.variables.map(v => v.name);
});

communicationTemplateSchema.virtual('requiredVariables').get(function() {
  return this.variables.filter(v => v.required);
});

communicationTemplateSchema.virtual('optionalVariables').get(function() {
  return this.variables.filter(v => !v.required);
});

// Instance methods
communicationTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

communicationTemplateSchema.methods.duplicate = function(newName, createdBy) {
  const duplicatedTemplate = new this.constructor({
    name: newName || `${this.name} (Copy)`,
    description: this.description,
    type: this.type,
    category: this.category,
    priority: this.priority,
    subject: this.subject,
    content: this.content,
    variables: this.variables,
    isActive: false, // Duplicated templates start as inactive
    isSystem: false,
    parentTemplateId: this._id,
    version: '1.0.0',
    createdBy: createdBy || 'system',
    tags: [...this.tags, 'duplicate']
  });
  
  return duplicatedTemplate.save();
};

communicationTemplateSchema.methods.renderContent = function(variableValues = {}) {
  let renderedContent = this.content;
  
  // Replace variables in content
  this.variables.forEach(variable => {
    const placeholder = `{{${variable.name}}}`;
    let value = variableValues[variable.name];
    
    // Use default value if no value provided
    if (value === undefined && variable.defaultValue !== undefined) {
      value = variable.defaultValue;
    }
    
    if (value !== undefined) {
      // Format value based on type
      switch (variable.type) {
        case 'date':
          value = new Date(value).toLocaleDateString();
          break;
        case 'boolean':
          value = value ? 'Yes' : 'No';
          break;
        case 'number':
          value = Number(value).toLocaleString();
          break;
        default:
          value = String(value);
      }
      
      renderedContent = renderedContent.replace(new RegExp(placeholder, 'g'), value);
    }
  });
  
  return renderedContent;
};

// Static methods
communicationTemplateSchema.statics.findActive = function(filters = {}) {
  const query = { isActive: true };
  
  if (filters.type) {
    query.type = filters.type;
  }
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { subject: { $regex: filters.search, $options: 'i' } },
      { content: { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('parentTemplateId', 'name');
};

communicationTemplateSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true })
    .sort({ name: 1 });
};

communicationTemplateSchema.statics.getPopular = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ usageCount: -1, lastUsedAt: -1 })
    .limit(limit);
};

communicationTemplateSchema.statics.getSystemTemplates = function() {
  return this.find({ isSystem: true, isActive: true })
    .sort({ name: 1 });
};

// toJSON transformation
communicationTemplateSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const CommunicationTemplate = mongoose.model('CommunicationTemplate', communicationTemplateSchema);

export default CommunicationTemplate;