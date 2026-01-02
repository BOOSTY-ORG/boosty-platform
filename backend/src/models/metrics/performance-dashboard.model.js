/**
 * Performance Dashboard Model
 *
 * This model defines the schema for storing dashboard configurations including:
 * - Dashboard layout and widgets
 * - User preferences and permissions
 * - Dashboard sharing and collaboration
 * - Dashboard templates and versions
 */

import mongoose from 'mongoose';

const performanceDashboardSchema = new mongoose.Schema(
  {
    // Dashboard identification
    dashboardId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // Dashboard classification
    type: {
      type: String,
      required: true,
      enum: ['overview', 'system', 'api', 'database', 'custom'],
      default: 'custom',
      index: true,
    },
    category: {
      type: String,
      enum: ['operations', 'development', 'business', 'infrastructure'],
      default: 'operations',
    },

    // Dashboard ownership
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },

    // Dashboard layout
    layout: {
      type: String,
      enum: ['grid', 'flex', 'tabs'],
      default: 'grid',
    },
    columns: {
      type: Number,
      min: 1,
      max: 12,
      default: 12,
    },
    rows: {
      type: Number,
      min: 1,
      default: 8,
    },

    // Dashboard widgets
    widgets: [
      {
        id: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true,
          enum: [
            'metric',
            'chart',
            'table',
            'alert',
            'text',
            'image',
            'heatmap',
            'gauge',
            'progress',
            'list',
            'custom',
          ],
        },
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
        },

        // Widget position and size
        position: {
          x: { type: Number, default: 0, min: 0 },
          y: { type: Number, default: 0, min: 0 },
          width: { type: Number, default: 4, min: 1, max: 12 },
          height: { type: Number, default: 3, min: 1 },
        },

        // Widget configuration
        config: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },

        // Widget data source
        dataSource: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },

        // Widget refresh settings
        refreshInterval: {
          type: Number, // Refresh interval in seconds
          default: 30,
          min: 5,
        },
        autoRefresh: {
          type: Boolean,
          default: true,
        },

        // Widget permissions
        permissions: {
          view: {
            type: [String],
            default: ['admin', 'manager', 'analyst'],
          },
          edit: {
            type: [String],
            default: ['admin', 'manager'],
          },
          configure: {
            type: [String],
            default: ['admin'],
          },
        },

        // Widget state
        visible: {
          type: Boolean,
          default: true,
        },
        collapsed: {
          type: Boolean,
          default: false,
        },

        // Widget styling
        styling: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],

    // Dashboard filters
    filters: {
      timeRange: {
        type: String,
        enum: ['1h', '6h', '24h', '7d', '30d'],
        default: '24h',
      },
      environment: {
        type: String,
        enum: ['production', 'staging', 'development', 'all'],
        default: 'production',
      },
      tags: [
        {
          type: String,
        },
      ],
      customFilters: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },

    // Dashboard sharing
    isPublic: {
      type: Boolean,
      default: false,
    },
    isTemplate: {
      type: Boolean,
      default: false,
    },
    sharedWith: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        permission: {
          type: String,
          enum: ['view', 'edit', 'admin'],
          default: 'view',
        },
        sharedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Dashboard settings
    settings: {
      autoRefresh: {
        type: Boolean,
        default: true,
      },
      refreshInterval: {
        type: Number, // Global refresh interval in seconds
        default: 30,
        min: 5,
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto',
      },
      density: {
        type: String,
        enum: ['compact', 'normal', 'comfortable'],
        default: 'normal',
      },
      showGrid: {
        type: Boolean,
        default: true,
      },
      snapToGrid: {
        type: Boolean,
        default: true,
      },
    },

    // Dashboard metadata
    tags: [
      {
        type: String,
        index: true,
      },
    ],
    version: {
      type: Number,
      default: 1,
    },
    parentDashboard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PerformanceDashboard',
    },

    // Dashboard usage statistics
    lastAccessed: {
      type: Date,
      default: Date.now,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    favoriteCount: {
      type: Number,
      default: 0,
    },

    // Dashboard status
    isActive: {
      type: Boolean,
      default: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
    },

    // Dashboard validation
    validation: {
      isValid: {
        type: Boolean,
        default: true,
      },
      errors: [
        {
          type: String,
        },
      ],
      warnings: [
        {
          type: String,
        },
      ],
      lastValidated: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    // Collection options
    collection: 'performance_dashboards',
    timestamps: true,

    // Indexes for efficient querying
    index: [
      { owner: 1, isActive: 1 },
      { type: 1, isPublic: 1, isActive: 1 },
      { tags: 1, isActive: 1 },
      { isTemplate: 1, type: 1 },
      { sharedWith: 1, isActive: 1 },
      { lastAccessed: -1 },
      { accessCount: -1 },
      { favoriteCount: -1 },
      { name: 'text', description: 'text' }, // For text search
      { category: 1, isActive: 1 },
      { team: 1, isActive: 1 },
    ],
  }
);

// Static methods for common queries
performanceDashboardSchema.statics = {
  /**
   * Find dashboards by owner with pagination
   */
  findByOwner: function (
    ownerId,
    includeArchived = false,
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;
    const query = {
      owner: ownerId,
      isActive: true,
    };

    if (!includeArchived) {
      query.isArchived = false;
    }

    return this.find(query)
      .populate('owner', 'name email')
      .populate('team', 'name')
      .sort({ lastAccessed: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  /**
   * Find public dashboards with pagination
   */
  findPublic: function (type = null, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const query = {
      isPublic: true,
      isActive: true,
      isArchived: false,
    };

    if (type) {
      query.type = type;
    }

    return this.find(query)
      .populate('owner', 'name email')
      .sort({ favoriteCount: -1, accessCount: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  /**
   * Find shared dashboards for user with pagination
   */
  findSharedForUser: function (userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.find({
      'sharedWith.user': userId,
      isActive: true,
      isArchived: false,
    })
      .populate('owner', 'name email')
      .populate('sharedWith.user', 'name email')
      .sort({ lastAccessed: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  /**
   * Find template dashboards
   */
  findTemplates: function (type = null) {
    const query = {
      isTemplate: true,
      isActive: true,
      isArchived: false,
    };

    if (type) {
      query.type = type;
    }

    return this.find(query)
      .populate('owner', 'name email')
      .sort({ favoriteCount: -1, accessCount: -1 });
  },

  /**
   * Search dashboards with optimized text search
   */
  search: function (searchTerm, userId = null, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // Use $text for more efficient text search if index exists
    const query = {
      isActive: true,
      isArchived: false,
    };

    if (searchTerm) {
      query.$text = { $search: searchTerm };
    }

    if (userId) {
      query.$and = [
        {
          $or: [
            { owner: userId },
            { isPublic: true },
            { 'sharedWith.user': userId },
          ],
        },
      ];
    }

    return this.find(query, { score: { $meta: 'textScore' } })
      .populate('owner', 'name email')
      .sort({
        score: { $meta: 'textScore' },
        favoriteCount: -1,
        accessCount: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  /**
   * Get dashboard statistics with optimized aggregation
   */
  getStatistics: function (ownerId = null) {
    const matchStage = {
      isActive: true,
      isArchived: false,
    };

    if (ownerId) {
      matchStage.owner = ownerId;
    }

    return this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          public: { $sum: { $cond: ['$isPublic', 1, 0] } },
          templates: { $sum: { $cond: ['$isTemplate', 1, 0] } },
          shared: {
            $sum: { $cond: [{ $gt: [{ $size: '$sharedWith' }, 0] }, 1, 0] },
          },
          types: { $addToSet: '$type' },
          categories: { $addToSet: '$category' },
          totalWidgets: { $sum: { $size: '$widgets' } },
          totalAccesses: { $sum: '$accessCount' },
          totalFavorites: { $sum: '$favoriteCount' },
        },
      },
      {
        $lookup: {
          from: 'performance_dashboards',
          let: { matchStage },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$isActive', '$$matchStage.isActive'] },
                    { $eq: ['$isArchived', '$$matchStage.isArchived'] },
                    ownerId
                      ? { $eq: ['$owner', '$$matchStage.owner'] }
                      : { $ne: [null, null] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$type',
                count: { $sum: 1 },
              },
            },
          ],
          as: 'typeStats',
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          public: 1,
          templates: 1,
          shared: 1,
          totalWidgets: 1,
          totalAccesses: 1,
          totalFavorites: 1,
          typeStats: {
            $arrayToObject: {
              $map: {
                input: '$typeStats',
                as: 'stat',
                in: {
                  k: '$$stat._id',
                  v: '$$stat.count',
                },
              },
            },
          },
          categoryStats: {
            $arrayToObject: {
              $map: {
                input: '$categories',
                as: 'category',
                in: {
                  k: '$$category',
                  v: {
                    $let: {
                      vars: {
                        categoryCount: {
                          $size: {
                            $filter: {
                              input: '$typeStats',
                              cond: { $eq: ['$$this._id', '$$category'] },
                            },
                          },
                        },
                      },
                      in: { $ifNull: ['$$categoryCount', 0] },
                    },
                  },
                },
              },
            },
          },
          avgWidgetsPerDashboard: { $divide: ['$totalWidgets', '$total'] },
          avgAccessesPerDashboard: { $divide: ['$totalAccesses', '$total'] },
        },
      },
    ]).allowDiskUse(true);
  },

  /**
   * Find most popular dashboards
   */
  findMostPopular: function (limit = 10) {
    return this.find({
      isActive: true,
      isArchived: false,
      $or: [{ isPublic: true }, { isTemplate: true }],
    })
      .populate('owner', 'name email')
      .sort({ favoriteCount: -1, accessCount: -1 })
      .limit(limit);
  },

  /**
   * Create dashboard from template
   */
  createFromTemplate: function (templateId, ownerId, customizations = {}) {
    return this.findById(templateId).then((template) => {
      if (!template) {
        throw new Error('Template not found');
      }

      const dashboard = new this({
        name: customizations.name || `${template.name} (Copy)`,
        description: customizations.description || template.description,
        type: template.type,
        category: template.category,
        owner: ownerId,
        layout: template.layout,
        columns: template.columns,
        rows: template.rows,
        widgets: template.widgets,
        filters: template.filters,
        settings: template.settings,
        tags: template.tags,
        parentDashboard: template._id,
      });

      return dashboard.save();
    });
  },
};

// Instance methods
performanceDashboardSchema.methods = {
  /**
   * Add widget to dashboard
   */
  addWidget: function (widgetData) {
    // Check if widget with same ID already exists
    const existingWidget = this.widgets.find((w) => w.id === widgetData.id);
    if (existingWidget) {
      throw new Error(`Widget with ID ${widgetData.id} already exists`);
    }

    this.widgets.push(widgetData);
    return this.save();
  },

  /**
   * Update widget in dashboard
   */
  updateWidget: function (widgetId, updateData) {
    const widgetIndex = this.widgets.findIndex((w) => w.id === widgetId);
    if (widgetIndex === -1) {
      throw new Error(`Widget with ID ${widgetId} not found`);
    }

    Object.assign(this.widgets[widgetIndex], updateData);
    return this.save();
  },

  /**
   * Remove widget from dashboard
   */
  removeWidget: function (widgetId) {
    this.widgets = this.widgets.filter((w) => w.id !== widgetId);
    return this.save();
  },

  /**
   * Share dashboard with user
   */
  shareWithUser: function (userId, permission = 'view') {
    // Check if already shared
    const existingShare = this.sharedWith.find(
      (s) => s.user.toString() === userId.toString()
    );

    if (existingShare) {
      existingShare.permission = permission;
      existingShare.sharedAt = new Date();
    } else {
      this.sharedWith.push({
        user: userId,
        permission,
        sharedAt: new Date(),
      });
    }

    return this.save();
  },

  /**
   * Unshare dashboard with user
   */
  unshareWithUser: function (userId) {
    this.sharedWith = this.sharedWith.filter(
      (s) => s.user.toString() !== userId.toString()
    );
    return this.save();
  },

  /**
   * Increment access count
   */
  incrementAccess: function () {
    this.accessCount += 1;
    this.lastAccessed = new Date();
    return this.save();
  },

  /**
   * Toggle favorite status
   */
  toggleFavorite: function (userId, isFavorite) {
    if (isFavorite) {
      this.favoriteCount += 1;
    } else {
      this.favoriteCount = Math.max(0, this.favoriteCount - 1);
    }
    return this.save();
  },

  /**
   * Archive dashboard
   */
  archive: function () {
    this.isArchived = true;
    this.isActive = false;
    return this.save();
  },

  /**
   * Restore dashboard
   */
  restore: function () {
    this.isArchived = false;
    this.isActive = true;
    return this.save();
  },

  /**
   * Validate dashboard configuration
   */
  validate: function () {
    const errors = [];
    const warnings = [];

    // Check for duplicate widget IDs
    const widgetIds = this.widgets.map((w) => w.id);
    const duplicateIds = widgetIds.filter(
      (id, index) => widgetIds.indexOf(id) !== index
    );

    if (duplicateIds.length > 0) {
      errors.push(`Duplicate widget IDs: ${duplicateIds.join(', ')}`);
    }

    // Check for widget position conflicts
    const positions = this.widgets.map(
      (w) => `${w.position.x}-${w.position.y}`
    );
    const duplicatePositions = positions.filter(
      (pos, index) => positions.indexOf(pos) !== index
    );

    if (duplicatePositions.length > 0) {
      warnings.push(
        `Overlapping widget positions: ${duplicatePositions.join(', ')}`
      );
    }

    // Check if widgets are within bounds
    this.widgets.forEach((widget) => {
      if (widget.position.x + widget.position.width > this.columns) {
        warnings.push(`Widget ${widget.id} exceeds column boundary`);
      }

      if (widget.position.y + widget.position.height > this.rows) {
        warnings.push(`Widget ${widget.id} exceeds row boundary`);
      }
    });

    this.validation = {
      isValid: errors.length === 0,
      errors,
      warnings,
      lastValidated: new Date(),
    };

    return this.validation;
  },

  /**
   * Clone dashboard
   */
  clone: function (newOwnerId, customizations = {}) {
    const clonedDashboard = new this.constructor({
      name: customizations.name || `${this.name} (Clone)`,
      description: customizations.description || this.description,
      type: this.type,
      category: this.category,
      owner: newOwnerId,
      layout: this.layout,
      columns: this.columns,
      rows: this.rows,
      widgets: this.widgets.map((widget) => ({
        ...widget.toObject(),
        id: `${widget.id}-clone-${Date.now()}`,
      })),
      filters: this.filters,
      settings: this.settings,
      tags: this.tags,
      parentDashboard: this._id,
    });

    return clonedDashboard.save();
  },
};

// Virtual fields
performanceDashboardSchema.virtual('widgetCount').get(function () {
  return this.widgets.length;
});

performanceDashboardSchema.virtual('sharedUserCount').get(function () {
  return this.sharedWith.length;
});

performanceDashboardSchema.virtual('isShared').get(function () {
  return this.sharedWith.length > 0 || this.isPublic;
});

// Pre-save middleware
performanceDashboardSchema.pre('save', function (next) {
  // Ensure dashboardId is set
  if (!this.dashboardId) {
    this.dashboardId = `${this.owner}-${this.type}-${Date.now()}`;
  }

  // Validate dashboard before saving
  if (this.isNew || this.isModified('widgets')) {
    const validation = this.validate();
    if (!validation.isValid) {
      return next(
        new Error(
          `Dashboard validation failed: ${validation.errors.join(', ')}`
        )
      );
    }
  }

  next();
});

// Post-save middleware
performanceDashboardSchema.post('save', function (doc) {
  // Log when public dashboard is created
  if (doc.isPublic && doc.isNew) {
    console.log(`Public dashboard created: ${doc.name} by ${doc.owner}`);
  }
});

const PerformanceDashboard = mongoose.model(
  'PerformanceDashboard',
  performanceDashboardSchema
);

export default PerformanceDashboard;
