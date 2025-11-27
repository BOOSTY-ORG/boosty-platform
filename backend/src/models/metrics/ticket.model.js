import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true, required: false },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['technical', 'billing', 'general', 'feature-request'],
    required: true
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  relatedEntity: {
    entityType: { type: String },
    entityId: { type: mongoose.Schema.Types.ObjectId }
  },
  tags: [{ type: String, trim: true }],
  attachments: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number },
    mimeType: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  resolution: { type: String, trim: true },
  resolvedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Additional fields for tracking ticket lifecycle
  lastActivityAt: { type: Date, default: Date.now },
  dueDate: { type: Date },
  estimatedHours: { type: Number },
  actualHours: { type: Number, default: 0 },
  // Activity log for tracking changes
  activityLog: [{
    action: { type: String, required: true },
    description: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    changes: { type: mongoose.Schema.Types.Mixed }
  }],
  // Internal notes that are not visible to customers
  internalNotes: [{
    note: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
    isPrivate: { type: Boolean, default: true }
  }],
  // Customer satisfaction metrics
  satisfactionRating: {
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
    submittedAt: { type: Date },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  // SLA tracking
  slaDeadline: { type: Date },
  slaStatus: {
    type: String,
    enum: ['on_track', 'at_risk', 'breached'],
    default: 'on_track'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ticketSchema.index({ ticketId: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ category: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ lastActivityAt: -1 });
ticketSchema.index({ dueDate: 1 });
ticketSchema.index({ slaDeadline: 1 });

// Compound indexes for common queries
ticketSchema.index({ status: 1, priority: -1 });
ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ category: 1, status: 1 });
ticketSchema.index({ createdBy: 1, status: 1 });
ticketSchema.index({ slaStatus: 1, slaDeadline: 1 });

// Text indexes for search functionality
ticketSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
});

// Virtual fields for calculated properties
ticketSchema.virtual('isOpen').get(function() {
  return this.status === 'open' || this.status === 'in-progress';
});

ticketSchema.virtual('isResolved').get(function() {
  return this.status === 'resolved' || this.status === 'closed';
});

ticketSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate) return false;
  return new Date() > this.dueDate && this.isOpen;
});

ticketSchema.virtual('resolutionTime').get(function() {
  if (this.createdAt && this.resolvedAt) {
    return this.resolvedAt - this.createdAt; // milliseconds
  }
  return null;
});

ticketSchema.virtual('attachmentCount').get(function() {
  return this.attachments ? this.attachments.length : 0;
});

ticketSchema.virtual('noteCount').get(function() {
  return this.internalNotes ? this.internalNotes.length : 0;
});

ticketSchema.virtual('activityCount').get(function() {
  return this.activityLog ? this.activityLog.length : 0;
});

// Pre-save middleware to generate ticket ID if not provided
ticketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketId) {
    const count = await this.constructor.countDocuments();
    const categoryPrefix = this.category ? this.category.substring(0, 3).toUpperCase() : 'TKT';
    this.ticketId = `${categoryPrefix}${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(count + 1).padStart(6, '0')}`;
  }
  
  // Update last activity timestamp on any change
  if (this.isModified()) {
    this.lastActivityAt = new Date();
  }
  
  // Set resolved timestamp when status changes to resolved
  if (this.isModified('status')) {
    if ((this.status === 'resolved' || this.status === 'closed') && !this.resolvedAt) {
      this.resolvedAt = new Date();
    } else if (this.status !== 'resolved' && this.status !== 'closed') {
      // Clear resolution details if status is moved away from resolved/closed
      this.resolvedAt = undefined;
      this.resolution = undefined;
      this.resolvedBy = undefined;
    }
  }
  
  // Update SLA status based on deadline
  if (this.slaDeadline) {
    const now = new Date();
    const timeToDeadline = this.slaDeadline - now;
    const hoursToDeadline = timeToDeadline / (1000 * 60 * 60);
    
    if (hoursToDeadline < 0) {
      this.slaStatus = 'breached';
    } else if (hoursToDeadline < 24 && this.isOpen) {
      this.slaStatus = 'at_risk';
    } else {
      this.slaStatus = 'on_track';
    }
  }
  
  next();
});

// Method to add activity log entry
ticketSchema.methods.addActivityLog = function(action, description, performedBy, changes = null) {
  this.activityLog.push({
    action,
    description,
    performedBy,
    timestamp: new Date(),
    changes
  });
  return this.save();
};

// Method to add internal note
ticketSchema.methods.addInternalNote = function(note, addedBy, isPrivate = true) {
  this.internalNotes.push({
    note,
    addedBy,
    addedAt: new Date(),
    isPrivate
  });
  return this.save();
};

// Method to add attachment
ticketSchema.methods.addAttachment = function(attachmentData, uploadedBy) {
  this.attachments.push({
    ...attachmentData,
    uploadedAt: new Date(),
    uploadedBy
  });
  return this.save();
};

// Static method to find overdue tickets
ticketSchema.statics.findOverdue = function() {
  const now = new Date();
  return this.find({
    dueDate: { $lt: now },
    status: { $in: ['open', 'in-progress'] }
  });
};

// Static method to find tickets approaching SLA deadline
ticketSchema.statics.findAtRisk = function() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    slaDeadline: { $lte: tomorrow, $gt: new Date() },
    status: { $in: ['open', 'in-progress'] },
    slaStatus: { $ne: 'breached' }
  });
};

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;
