import mongoose from 'mongoose';

const notificationTemplateSchema = new mongoose.Schema(
  {
    // Template identification
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [100, 'Template name cannot exceed 100 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // Communication configuration
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: ['email', 'sms', 'in_app', 'push_notification'],
      index: true,
    },

    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'welcome',
        'application',
        'kyc',
        'payment',
        'support',
        'marketing',
        'general',
        'alert',
        'reminder',
      ],
      index: true,
    },

    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // Content
    subject: {
      type: String,
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },

    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
    },

    htmlContent: String, // For email templates

    // Template variables
    variables: [
      {
        name: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          trim: true,
        },
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'boolean', 'select', 'object'],
          default: 'text',
        },
        required: {
          type: Boolean,
          default: false,
        },
        defaultValue: {
          type: mongoose.Schema.Types.Mixed,
        },
        options: [
          {
            label: String,
            value: mongoose.Schema.Types.Mixed,
          },
        ],
      },
    ],

    // Template settings
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Usage tracking
    usageCount: {
      type: Number,
      default: 0,
    },

    lastUsedAt: {
      type: Date,
    },

    // Versioning
    version: {
      type: String,
      default: '1.0.0',
    },

    parentTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
      index: true,
    },

    // Approval workflow
    isApproved: {
      type: Boolean,
      default: true,
    },

    approvedBy: {
      type: String,
      trim: true,
    },

    approvedAt: {
      type: Date,
    },

    // Template metadata
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Audit fields
    createdBy: {
      type: String,
      required: true,
      default: 'system',
    },

    updatedBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
notificationTemplateSchema.index({ name: 1, isActive: 1 });
notificationTemplateSchema.index({ type: 1, category: 1 });
notificationTemplateSchema.index({ category: 1, isActive: 1 });
notificationTemplateSchema.index({ createdBy: 1, createdAt: -1 });
notificationTemplateSchema.index({ tags: 1 });

// Virtuals
notificationTemplateSchema.virtual('variableNames').get(function () {
  return this.variables.map((v) => v.name);
});

notificationTemplateSchema.virtual('requiredVariables').get(function () {
  return this.variables.filter((v) => v.required);
});

notificationTemplateSchema.virtual('optionalVariables').get(function () {
  return this.variables.filter((v) => !v.required);
});

notificationTemplateSchema.virtual('isVersioned').get(function () {
  return !!this.parentTemplateId;
});

notificationTemplateSchema.virtual('hasHtmlContent').get(function () {
  return !!this.htmlContent && this.htmlContent.trim().length > 0;
});

// Instance methods
notificationTemplateSchema.methods.incrementUsage = function () {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

notificationTemplateSchema.methods.duplicate = function (newName, createdBy) {
  const duplicatedTemplate = new this.constructor({
    name: newName || `${this.name} (Copy)`,
    description: this.description,
    type: this.type,
    category: this.category,
    priority: this.priority,
    subject: this.subject,
    content: this.content,
    htmlContent: this.htmlContent,
    variables: this.variables,
    isActive: false, // Duplicated templates start as inactive
    isSystem: false,
    parentTemplateId: this._id,
    version: '1.0.0',
    createdBy: createdBy || 'system',
    tags: [...this.tags, 'duplicate'],
  });

  return duplicatedTemplate.save();
};

notificationTemplateSchema.methods.createVersion = function (
  version,
  updatedBy
) {
  const versionedTemplate = new this.constructor({
    name: this.name,
    description: this.description,
    type: this.type,
    category: this.category,
    priority: this.priority,
    subject: this.subject,
    content: this.content,
    htmlContent: this.htmlContent,
    variables: this.variables,
    isActive: this.isActive,
    isSystem: this.isSystem,
    parentTemplateId: this.parentTemplateId || this._id,
    version,
    isApproved: false, // New versions need approval
    createdBy: updatedBy || 'system',
    tags: [...this.tags],
  });

  return versionedTemplate.save();
};

notificationTemplateSchema.methods.renderContent = function (
  variableValues = {}
) {
  let renderedContent = this.content;
  let renderedSubject = this.subject;
  let renderedHtmlContent = this.htmlContent;

  // Validate required variables
  const missingRequired = this.requiredVariables.filter(
    (variable) =>
      !Object.prototype.hasOwnProperty.call(variableValues, variable.name)
  );

  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required variables: ${missingRequired.map((v) => v.name).join(', ')}`
    );
  }

  // Replace variables in content
  this.variables.forEach((variable) => {
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
        case 'select': {
          const option = variable.options.find((opt) => opt.value === value);
          value = option ? option.label : String(value);
          break;
        }
        case 'object':
          value = JSON.stringify(value);
          break;
        default:
          value = String(value);
      }

      const regex = new RegExp(
        placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'g'
      );

      if (renderedContent) {
        renderedContent = renderedContent.replace(regex, value);
      }
      if (renderedSubject) {
        renderedSubject = renderedSubject.replace(regex, value);
      }
      if (renderedHtmlContent) {
        renderedHtmlContent = renderedHtmlContent.replace(regex, value);
      }
    }
  });

  return {
    content: renderedContent,
    subject: renderedSubject,
    htmlContent: renderedHtmlContent,
  };
};

notificationTemplateSchema.methods.validateVariables = function (
  variableValues = {}
) {
  const errors = [];
  const warnings = [];

  this.variables.forEach((variable) => {
    const hasValue = Object.prototype.hasOwnProperty.call(
      variableValues,
      variable.name
    );
    const value = variableValues[variable.name];

    // Check required variables
    if (variable.required && !hasValue) {
      errors.push(`Required variable '${variable.name}' is missing`);
      return;
    }

    // Skip validation if value doesn't exist and is not required
    if (!hasValue && !variable.required) {
      return;
    }

    // Type validation
    switch (variable.type) {
      case 'number':
        if (isNaN(Number(value))) {
          errors.push(`Variable '${variable.name}' must be a number`);
        }
        break;
      case 'date':
        if (isNaN(Date.parse(value))) {
          errors.push(`Variable '${variable.name}' must be a valid date`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          warnings.push(
            `Variable '${variable.name}' should be a boolean, got ${typeof value}`
          );
        }
        break;
      case 'select': {
        const validOptions = variable.options.map((opt) => opt.value);
        if (!validOptions.includes(value)) {
          errors.push(
            `Variable '${variable.name}' must be one of: ${validOptions.join(', ')}`
          );
        }
        break;
      }
    }
  });

  // Check for unused variables
  const usedVariables = Object.keys(variableValues);
  const templateVariables = this.variableNames;
  const unusedVariables = usedVariables.filter(
    (v) => !templateVariables.includes(v)
  );

  if (unusedVariables.length > 0) {
    warnings.push(`Unused variables: ${unusedVariables.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

notificationTemplateSchema.methods.approve = function (approvedBy) {
  this.isApproved = true;
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

notificationTemplateSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

notificationTemplateSchema.methods.activate = function () {
  this.isActive = true;
  return this.save();
};

// Static methods
notificationTemplateSchema.statics.findActive = function (filters = {}) {
  const query = { isActive: true, isApproved: true };

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { subject: { $regex: filters.search, $options: 'i' } },
      { content: { $regex: filters.search, $options: 'i' } },
      { tags: { $in: [new RegExp(filters.search, 'i')] } },
    ];
  }

  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('parentTemplateId', 'name version');
};

notificationTemplateSchema.statics.findByCategory = function (
  category,
  activeOnly = true
) {
  const query = { category };
  if (activeOnly) {
    query.isActive = true;
    query.isApproved = true;
  }

  return this.find(query).sort({ name: 1 });
};

notificationTemplateSchema.statics.getPopular = function (limit = 10) {
  return this.find({ isActive: true, isApproved: true })
    .sort({ usageCount: -1, lastUsedAt: -1 })
    .limit(limit);
};

notificationTemplateSchema.statics.getSystemTemplates = function () {
  return this.find({ isSystem: true, isActive: true, isApproved: true }).sort({
    name: 1,
  });
};

notificationTemplateSchema.statics.getVersions = function (parentTemplateId) {
  return this.find({ parentTemplateId })
    .sort({ createdAt: -1 })
    .populate('parentTemplateId', 'name');
};

notificationTemplateSchema.statics.findByTag = function (tag) {
  return this.find({
    tags: tag,
    isActive: true,
    isApproved: true,
  }).sort({ name: 1 });
};

notificationTemplateSchema.statics.search = function (
  searchTerm,
  options = {}
) {
  const { type, category, limit = 20, page = 1 } = options;

  const query = {
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { subject: { $regex: searchTerm, $options: 'i' } },
      { content: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } },
    ],
  };

  if (type) {
    query.type = type;
  }

  if (category) {
    query.category = category;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// toJSON transformation
notificationTemplateSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const NotificationTemplate = mongoose.model(
  'NotificationTemplate',
  notificationTemplateSchema
);

export default NotificationTemplate;
