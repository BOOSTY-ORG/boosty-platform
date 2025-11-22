import ScheduledExport from '../models/scheduledExport.model.js';
import ExportTemplate from '../models/exportTemplate.model.js';
import ExportHistory from '../models/exportHistory.model.js';
import { formatSuccessResponse, formatErrorResponse, formatPaginatedResponse } from '../utils/metrics/responseFormatter.util.js';
import { buildPagination, buildPaginationMeta } from '../utils/metrics/pagination.util.js';

// Get all scheduled exports for a user
const getScheduledExports = async (req, res) => {
  try {
    const pagination = buildPagination(req.query.page, req.query.limit);
    const { search, frequency, isActive } = req.query;
    
    // Build filter
    const filter = { createdBy: req.auth._id };
    
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex }
      ];
    }
    
    if (frequency) {
      filter.frequency = frequency;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    // Get total count
    const total = await ScheduledExport.countDocuments(filter);
    
    // Get scheduled exports with pagination
    const scheduledExports = await ScheduledExport.find(filter)
      .populate('template', 'name format')
      .populate('createdBy', 'name email')
      .sort({ nextRun: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit);
    
    const paginationMeta = buildPaginationMeta(pagination.page, pagination.limit, total);
    
    res.json(formatPaginatedResponse(scheduledExports, paginationMeta, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Get a specific scheduled export
const getScheduledExport = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    const scheduledExport = await ScheduledExport.findOne({
      _id: scheduleId,
      createdBy: req.auth._id
    })
    .populate('template', 'name format')
    .populate('createdBy', 'name email')
    .populate('exportHistory', 'exportId status createdAt completedAt fileSize');
    
    if (!scheduledExport) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Scheduled export not found'
      }, req, 404));
    }
    
    res.json(formatSuccessResponse(scheduledExport, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Create a new scheduled export
const createScheduledExport = async (req, res) => {
  try {
    const {
      name,
      description,
      format,
      frequency,
      cronExpression,
      fields,
      includeRelated,
      filters,
      sortBy,
      template,
      notifications,
      retention
    } = req.body;
    
    // Validate required fields
    if (!name || !format || !frequency) {
      return res.status(400).json(formatErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Name, format, and frequency are required'
      }, req, 400));
    }
    
    // Validate fields or template
    if ((!fields || !Array.isArray(fields) || fields.length === 0) && !template) {
      return res.status(400).json(formatErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Either fields or template is required'
      }, req, 400));
    }
    
    // Validate cron expression for custom frequency
    if (frequency === 'custom' && !cronExpression) {
      return res.status(400).json(formatErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Cron expression is required for custom frequency'
      }, req, 400));
    }
    
    // Check if scheduled export name already exists for this user
    const existingSchedule = await ScheduledExport.findOne({
      name,
      createdBy: req.auth._id
    });
    
    if (existingSchedule) {
      return res.status(400).json(formatErrorResponse({
        code: 'DUPLICATE_NAME',
        message: 'Scheduled export with this name already exists'
      }, req, 400));
    }
    
    // Get fields from template if template is provided
    let templateFields = fields;
    if (template) {
      const templateDoc = await ExportTemplate.findById(template);
      if (!templateDoc) {
        return res.status(400).json(formatErrorResponse({
          code: 'INVALID_TEMPLATE',
          message: 'Template not found'
        }, req, 400));
      }
      templateFields = templateDoc.fields;
    }
    
    const scheduledExport = new ScheduledExport({
      name,
      description,
      format,
      frequency,
      cronExpression,
      fields: templateFields,
      includeRelated: includeRelated || {},
      filters: filters || {},
      sortBy: sortBy || { field: 'createdAt', order: 'desc' },
      template,
      notifications: notifications || {},
      retention: retention || { keepCount: 10, keepDays: 30 },
      createdBy: req.auth._id
    });
    
    // Calculate next run time
    scheduledExport.calculateNextRun();
    
    await scheduledExport.save();
    await scheduledExport.populate('template', 'name format');
    await scheduledExport.populate('createdBy', 'name email');
    
    res.status(201).json(formatSuccessResponse(scheduledExport, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Update a scheduled export
const updateScheduledExport = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const updateData = req.body;
    
    // Find scheduled export and ensure user owns it
    const scheduledExport = await ScheduledExport.findOne({
      _id: scheduleId,
      createdBy: req.auth._id
    });
    
    if (!scheduledExport) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Scheduled export not found or access denied'
      }, req, 404));
    }
    
    // Check if name is being changed and if it conflicts with existing schedule
    if (updateData.name && updateData.name !== scheduledExport.name) {
      const existingSchedule = await ScheduledExport.findOne({
        name: updateData.name,
        createdBy: req.auth._id,
        _id: { $ne: scheduleId }
      });
      
      if (existingSchedule) {
        return res.status(400).json(formatErrorResponse({
          code: 'DUPLICATE_NAME',
          message: 'Scheduled export with this name already exists'
        }, req, 400));
      }
    }
    
    // Validate cron expression if frequency is being changed to custom
    if (updateData.frequency === 'custom' && !updateData.cronExpression) {
      return res.status(400).json(formatErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Cron expression is required for custom frequency'
      }, req, 400));
    }
    
    // Update scheduled export
    Object.assign(scheduledExport, updateData);
    
    // Recalculate next run time if frequency changed
    if (updateData.frequency || updateData.cronExpression) {
      scheduledExport.calculateNextRun();
    }
    
    await scheduledExport.save();
    await scheduledExport.populate('template', 'name format');
    await scheduledExport.populate('createdBy', 'name email');
    
    res.json(formatSuccessResponse(scheduledExport, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Delete a scheduled export
const deleteScheduledExport = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    const scheduledExport = await ScheduledExport.findOne({
      _id: scheduleId,
      createdBy: req.auth._id
    });
    
    if (!scheduledExport) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Scheduled export not found or access denied'
      }, req, 404));
    }
    
    await ScheduledExport.deleteOne({ _id: scheduleId });
    
    res.json(formatSuccessResponse({
      scheduleId,
      message: 'Scheduled export deleted successfully'
    }, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Enable/disable a scheduled export
const toggleScheduledExport = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json(formatErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'isActive must be a boolean'
      }, req, 400));
    }
    
    const scheduledExport = await ScheduledExport.findOne({
      _id: scheduleId,
      createdBy: req.auth._id
    });
    
    if (!scheduledExport) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Scheduled export not found or access denied'
      }, req, 404));
    }
    
    scheduledExport.isActive = isActive;
    
    // If activating, recalculate next run time
    if (isActive) {
      scheduledExport.calculateNextRun();
    }
    
    await scheduledExport.save();
    await scheduledExport.populate('template', 'name format');
    
    res.json(formatSuccessResponse(scheduledExport, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Run a scheduled export manually
const runScheduledExport = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    const scheduledExport = await ScheduledExport.findOne({
      _id: scheduleId,
      createdBy: req.auth._id
    }).populate('template');
    
    if (!scheduledExport) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Scheduled export not found or access denied'
      }, req, 404));
    }
    
    // Create export history record
    const ExportHistory = require('../models/exportHistory.model.js').default;
    const { v4: uuidv4 } = require('uuid');
    
    const exportHistory = new ExportHistory({
      exportId: uuidv4(),
      filename: `${scheduledExport.name}_${new Date().toISOString().replace(/[:.]/g, '-')}.${scheduledExport.format}`,
      format: scheduledExport.format,
      fields: scheduledExport.fields.map(f => f.name),
      includeRelated: scheduledExport.includeRelated,
      filters: scheduledExport.filters,
      template: scheduledExport.template?._id,
      scheduledExport: scheduledExport._id,
      createdBy: req.auth._id
    });
    
    await exportHistory.save();
    
    // Start export process asynchronously
    const { processExport } = require('../controllers/export.controller.js');
    processExport(exportHistory._id, req.auth._id).catch(error => {
      console.error('Manual scheduled export failed:', error);
    });
    
    res.json(formatSuccessResponse({
      exportId: exportHistory.exportId,
      scheduleId,
      message: 'Scheduled export started manually'
    }, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Get recent exports for a scheduled export
const getScheduledExportHistory = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const pagination = buildPagination(req.query.page, req.query.limit);
    
    // Verify user owns the scheduled export
    const scheduledExport = await ScheduledExport.findOne({
      _id: scheduleId,
      createdBy: req.auth._id
    });
    
    if (!scheduledExport) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Scheduled export not found or access denied'
      }, req, 404));
    }
    
    // Get export history
    const total = await ExportHistory.countDocuments({ scheduledExport: scheduleId });
    
    const exports = await ExportHistory.find({ scheduledExport: scheduleId })
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit);
    
    const paginationMeta = buildPaginationMeta(pagination.page, pagination.limit, total);
    
    res.json(formatPaginatedResponse(exports, paginationMeta, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Get scheduled export statistics
const getScheduledExportStats = async (req, res) => {
  try {
    const statistics = await ScheduledExport.getStatistics(req.auth._id);
    
    const totalSchedules = await ScheduledExport.countDocuments({ createdBy: req.auth._id });
    const activeSchedules = await ScheduledExport.countDocuments({ 
      createdBy: req.auth._id,
      isActive: true 
    });
    const dueSchedules = await ScheduledExport.countDocuments({
      createdBy: req.auth._id,
      isActive: true,
      nextRun: { $lte: new Date() }
    });
    
    const stats = {
      totalSchedules,
      activeSchedules,
      dueSchedules,
      frequencyStats: statistics
    };
    
    res.json(formatSuccessResponse(stats, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

export default {
  getScheduledExports,
  getScheduledExport,
  createScheduledExport,
  updateScheduledExport,
  deleteScheduledExport,
  toggleScheduledExport,
  runScheduledExport,
  getScheduledExportHistory,
  getScheduledExportStats
};