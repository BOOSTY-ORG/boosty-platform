import { v4 as uuidv4 } from 'uuid';
import User from '../models/user.model.js';
import ExportTemplate from '../models/exportTemplate.model.js';
import ExportHistory from '../models/exportHistory.model.js';
import ScheduledExport from '../models/scheduledExport.model.js';
import { exportUserData, getFileInfo, deleteExportFile } from '../utils/export.util.js';
import { formatSuccessResponse, formatErrorResponse, formatPaginatedResponse } from '../utils/metrics/responseFormatter.util.js';
import { buildPagination, buildPaginationMeta } from '../utils/metrics/pagination.util.js';
import { getErrorMessage } from '../helpers/dbErrorHandler.js';

// Create a new export
const createExport = async (req, res) => {
  try {
    const { format, fields, includeRelated, filters, templateId, customFilename } = req.body;
    
    // Validate required fields
    if (!format || !fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json(formatErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Format and fields are required'
      }, req, 400));
    }
    
    // Generate unique export ID
    const exportId = uuidv4();
    
    // Create export history record
    const exportHistory = new ExportHistory({
      exportId,
      filename: customFilename || `users_export_${exportId}.${format}`,
      format,
      fields,
      includeRelated: includeRelated || {},
      filters: filters || {},
      template: templateId,
      createdBy: req.auth._id
    });
    
    await exportHistory.save();
    
    // Update template usage count if template is used
    if (templateId) {
      await ExportTemplate.findByIdAndUpdate(templateId, { $inc: { usageCount: 1 } });
    }
    
    // Start export process asynchronously
    processExport(exportHistory._id, req.auth._id).catch(error => {
      console.error('Export processing failed:', error);
    });
    
    res.status(201).json(formatSuccessResponse({
      exportId,
      status: 'pending',
      message: 'Export started successfully'
    }, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Process export asynchronously
const processExport = async (exportHistoryId, userId) => {
  try {
    const exportHistory = await ExportHistory.findById(exportHistoryId);
    if (!exportHistory) {
      throw new Error('Export history not found');
    }
    
    // Update status to processing
    exportHistory.status = 'processing';
    await exportHistory.save();
    
    // Build query based on filters
    let query = User.find();
    
    if (exportHistory.filters) {
      if (exportHistory.filters.status && exportHistory.filters.status.length > 0) {
        query = query.where('status').in(exportHistory.filters.status);
      }
      
      if (exportHistory.filters.dateRange) {
        const { startDate, endDate } = exportHistory.filters.dateRange;
        if (startDate) {
          query = query.where('createdAt').gte(new Date(startDate));
        }
        if (endDate) {
          query = query.where('createdAt').lte(new Date(endDate));
        }
      }
      
      if (exportHistory.filters.search) {
        const searchRegex = new RegExp(exportHistory.filters.search, 'i');
        query = query.or([
          { name: searchRegex },
          { email: searchRegex }
        ]);
      }
    }
    
    // Get total count for progress tracking
    const totalCount = await User.countDocuments(query.getFilter());
    exportHistory.totalRecords = totalCount;
    await exportHistory.save();
    
    // Fetch users with related data
    const users = await query
      .populate('applications')
      .populate('installations')
      .populate('communications')
      .populate('documents')
      .lean();
    
    // Process export data
    const exportResult = await exportUserData(
      users,
      exportHistory.format,
      exportHistory.fields,
      exportHistory.includeRelated,
      exportHistory.filename
    );
    
    // Update export history with results
    await exportHistory.complete(
      exportResult.path,
      exportResult.size,
      {
        processingTime: Date.now() - exportHistory.createdAt.getTime(),
        averageRecordSize: exportResult.size / users.length
      }
    );
    
    // Clean up old exports
    await ExportHistory.cleanupExpired();
    
  } catch (error) {
    console.error('Export processing error:', error);
    
    const exportHistory = await ExportHistory.findById(exportHistoryId);
    if (exportHistory) {
      await exportHistory.fail(error);
    }
  }
};

// Get export status
const getExportStatus = async (req, res) => {
  try {
    const { exportId } = req.params;
    
    const exportHistory = await ExportHistory.findOne({ exportId, createdBy: req.auth._id });
    if (!exportHistory) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Export not found'
      }, req, 404));
    }
    
    res.json(formatSuccessResponse(exportHistory, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Download export file
const downloadExport = async (req, res) => {
  try {
    const { exportId } = req.params;
    
    const exportHistory = await ExportHistory.findOne({ exportId, createdBy: req.auth._id });
    if (!exportHistory) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Export not found'
      }, req, 404));
    }
    
    if (!exportHistory.isDownloadable) {
      return res.status(400).json(formatErrorResponse({
        code: 'NOT_AVAILABLE',
        message: 'Export is not available for download'
      }, req, 400));
    }
    
    const fileInfo = await getFileInfo(exportHistory.filename);
    
    // Mark as downloaded
    await exportHistory.markAsDownloaded();
    
    // Set download headers
    res.setHeader('Content-Type', getContentType(exportHistory.format));
    res.setHeader('Content-Disposition', `attachment; filename="${exportHistory.filename}"`);
    res.setHeader('Content-Length', fileInfo.size);
    
    // Stream file
    const fileStream = require('fs').createReadStream(fileInfo.path);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json(formatErrorResponse(error, req, 500));
      }
    });
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Cancel export
const cancelExport = async (req, res) => {
  try {
    const { exportId } = req.params;
    
    const exportHistory = await ExportHistory.findOne({ 
      exportId, 
      createdBy: req.auth._id,
      status: { $in: ['pending', 'processing'] }
    });
    
    if (!exportHistory) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Export not found or cannot be cancelled'
      }, req, 404));
    }
    
    exportHistory.status = 'cancelled';
    await exportHistory.save();
    
    res.json(formatSuccessResponse({
      exportId,
      status: 'cancelled',
      message: 'Export cancelled successfully'
    }, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Get export history
const getExportHistory = async (req, res) => {
  try {
    const pagination = buildPagination(req.query.page, req.query.limit);
    const { status, format, startDate, endDate } = req.query;
    
    // Build filter
    const filter = { createdBy: req.auth._id };
    
    if (status) {
      filter.status = status;
    }
    
    if (format) {
      filter.format = format;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Get total count
    const total = await ExportHistory.countDocuments(filter);
    
    // Get export history with pagination
    const exports = await ExportHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('template', 'name format')
      .populate('scheduledExport', 'name frequency');
    
    const paginationMeta = buildPaginationMeta(pagination.page, pagination.limit, total);
    
    res.json(formatPaginatedResponse(exports, paginationMeta, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Delete export
const deleteExport = async (req, res) => {
  try {
    const { exportId } = req.params;
    
    const exportHistory = await ExportHistory.findOne({ exportId, createdBy: req.auth._id });
    if (!exportHistory) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Export not found'
      }, req, 404));
    }
    
    // Delete file if it exists
    if (exportHistory.filePath) {
      try {
        await deleteExportFile(exportHistory.filename);
      } catch (error) {
        console.error('Failed to delete export file:', error);
      }
    }
    
    // Delete export history record
    await ExportHistory.deleteOne({ _id: exportHistory._id });
    
    res.json(formatSuccessResponse({
      exportId,
      message: 'Export deleted successfully'
    }, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Get export analytics
const getExportAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateRange = {};
    if (startDate) {
      dateRange.startDate = new Date(startDate);
    }
    if (endDate) {
      dateRange.endDate = new Date(endDate);
    }
    
    const statistics = await ExportHistory.getStatistics(req.auth._id, dateRange);
    
    // Get additional analytics
    const totalExports = await ExportHistory.countDocuments({ createdBy: req.auth._id });
    const activeExports = await ExportHistory.countDocuments({ 
      createdBy: req.auth._id,
      status: { $in: ['pending', 'processing'] }
    });
    const completedExports = await ExportHistory.countDocuments({ 
      createdBy: req.auth._id,
      status: 'completed'
    });
    
    const analytics = {
      totalExports,
      activeExports,
      completedExports,
      statistics,
      formatDistribution: await ExportHistory.aggregate([
        { $match: { createdBy: req.auth._id } },
        { $group: { _id: '$format', count: { $sum: 1 } } }
      ])
    };
    
    res.json(formatSuccessResponse(analytics, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Helper function to get content type
const getContentType = (format) => {
  const contentTypes = {
    csv: 'text/csv',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf',
    json: 'application/json'
  };
  
  return contentTypes[format.toLowerCase()] || 'application/octet-stream';
};

export {
  createExport,
  getExportStatus,
  downloadExport,
  cancelExport,
  getExportHistory,
  deleteExport,
  getExportAnalytics,
  processExport
};