import mongoose from 'mongoose';

const exportTemplateSchema = new mongoose.Schema(
  {
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
    format: {
      type: String,
      required: [true, 'Export format is required'],
      enum: ['csv', 'excel', 'pdf', 'json'],
      default: 'csv'
    },
    fields: [{
      name: {
        type: String,
        required: true
      },
      label: {
        type: String,
        required: true
      },
      order: {
        type: Number,
        default: 0
      },
      width: {
        type: Number,
        default: 100
      }
    }],
    includeRelated: {
      applications: {
        type: Boolean,
        default: false
      },
      installations: {
        type: Boolean,
        default: false
      },
      communications: {
        type: Boolean,
        default: false
      },
      documents: {
        type: Boolean,
        default: false
      }
    },
    filters: {
      status: [String],
      dateRange: {
        startDate: Date,
        endDate: Date
      },
      customFilters: mongoose.Schema.Types.Mixed
    },
    sortBy: {
      field: {
        type: String,
        default: 'createdAt'
      },
      order: {
        type: String,
        enum: ['asc', 'desc'],
        default: 'desc'
      }
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    usageCount: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better performance
exportTemplateSchema.index({ createdBy: 1 });
exportTemplateSchema.index({ name: 1, createdBy: 1 });
exportTemplateSchema.index({ isDefault: 1 });
exportTemplateSchema.index({ isPublic: 1 });
exportTemplateSchema.index({ format: 1 });

// Pre-save middleware to ensure only one default template per user
exportTemplateSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { createdBy: this.createdBy, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Instance method to increment usage count
exportTemplateSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Static method to get user's default template
exportTemplateSchema.statics.getDefaultTemplate = async function(userId) {
  return this.findOne({ createdBy: userId, isDefault: true });
};

// Static method to get public templates
exportTemplateSchema.statics.getPublicTemplates = function() {
  return this.find({ isPublic: true }).sort({ name: 1 });
};

const ExportTemplate = mongoose.model('ExportTemplate', exportTemplateSchema);

export default ExportTemplate;