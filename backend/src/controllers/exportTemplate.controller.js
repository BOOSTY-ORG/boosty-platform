import ExportTemplate from '../models/exportTemplate.model.js';
import { formatSuccessResponse, formatErrorResponse, formatPaginatedResponse } from '../utils/metrics/responseFormatter.util.js';
import { buildPagination, buildPaginationMeta } from '../utils/metrics/pagination.util.js';

// Get all export templates for a user
const getExportTemplates = async (req, res) => {
  try {
    const pagination = buildPagination(req.query.page, req.query.limit);
    const { search, format, isPublic } = req.query;
    
    // Build filter
    const filter = {};
    
    // Get user's templates and public templates
    const templates = await ExportTemplate.find({
      $or: [
        { createdBy: req.auth._id },
        { isPublic: true }
      ]
    })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
    
    // Apply client-side filtering for more complex queries
    let filteredTemplates = templates;
    
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filteredTemplates = templates.filter(template => 
        template.name.match(searchRegex) || 
        template.description?.match(searchRegex)
      );
    }
    
    if (format) {
      filteredTemplates = filteredTemplates.filter(template => template.format === format);
    }
    
    if (isPublic !== undefined) {
      const isPublicBool = isPublic === 'true';
      filteredTemplates = filteredTemplates.filter(template => 
        template.isPublic === isPublicBool
      );
    }
    
    // Apply pagination
    const total = filteredTemplates.length;
    const startIndex = pagination.skip;
    const endIndex = startIndex + pagination.limit;
    const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex);
    
    const paginationMeta = buildPaginationMeta(pagination.page, pagination.limit, total);
    
    res.json(formatPaginatedResponse(paginatedTemplates, paginationMeta, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Get a specific export template
const getExportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = await ExportTemplate.findOne({
      _id: templateId,
      $or: [
        { createdBy: req.auth._id },
        { isPublic: true }
      ]
    }).populate('createdBy', 'name email');
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Export template not found'
      }, req, 404));
    }
    
    res.json(formatSuccessResponse(template, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Create a new export template
const createExportTemplate = async (req, res) => {
  try {
    const {
      name,
      description,
      format,
      fields,
      includeRelated,
      filters,
      sortBy,
      isDefault,
      isPublic
    } = req.body;
    
    // Validate required fields
    if (!name || !format || !fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json(formatErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Name, format, and fields are required'
      }, req, 400));
    }
    
    // Check if template name already exists for this user
    const existingTemplate = await ExportTemplate.findOne({
      name,
      createdBy: req.auth._id
    });
    
    if (existingTemplate) {
      return res.status(400).json(formatErrorResponse({
        code: 'DUPLICATE_NAME',
        message: 'Template with this name already exists'
      }, req, 400));
    }
    
    const template = new ExportTemplate({
      name,
      description,
      format,
      fields,
      includeRelated: includeRelated || {},
      filters: filters || {},
      sortBy: sortBy || { field: 'createdAt', order: 'desc' },
      isDefault: isDefault || false,
      isPublic: isPublic || false,
      createdBy: req.auth._id
    });
    
    await template.save();
    await template.populate('createdBy', 'name email');
    
    res.status(201).json(formatSuccessResponse(template, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Update an export template
const updateExportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const updateData = req.body;
    
    // Find template and ensure user owns it
    const template = await ExportTemplate.findOne({
      _id: templateId,
      createdBy: req.auth._id
    });
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Export template not found or access denied'
      }, req, 404));
    }
    
    // Check if name is being changed and if it conflicts with existing template
    if (updateData.name && updateData.name !== template.name) {
      const existingTemplate = await ExportTemplate.findOne({
        name: updateData.name,
        createdBy: req.auth._id,
        _id: { $ne: templateId }
      });
      
      if (existingTemplate) {
        return res.status(400).json(formatErrorResponse({
          code: 'DUPLICATE_NAME',
          message: 'Template with this name already exists'
        }, req, 400));
      }
    }
    
    // Update template
    Object.assign(template, updateData);
    await template.save();
    await template.populate('createdBy', 'name email');
    
    res.json(formatSuccessResponse(template, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Delete an export template
const deleteExportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = await ExportTemplate.findOne({
      _id: templateId,
      createdBy: req.auth._id
    });
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Export template not found or access denied'
      }, req, 404));
    }
    
    await ExportTemplate.deleteOne({ _id: templateId });
    
    res.json(formatSuccessResponse({
      templateId,
      message: 'Export template deleted successfully'
    }, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Duplicate an export template
const duplicateExportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name } = req.body;
    
    const originalTemplate = await ExportTemplate.findOne({
      _id: templateId,
      $or: [
        { createdBy: req.auth._id },
        { isPublic: true }
      ]
    });
    
    if (!originalTemplate) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Export template not found'
      }, req, 404));
    }
    
    // Check if new name already exists
    const existingTemplate = await ExportTemplate.findOne({
      name: name || `${originalTemplate.name} (Copy)`,
      createdBy: req.auth._id
    });
    
    if (existingTemplate) {
      return res.status(400).json(formatErrorResponse({
        code: 'DUPLICATE_NAME',
        message: 'Template with this name already exists'
      }, req, 400));
    }
    
    // Create duplicate
    const duplicateTemplate = new ExportTemplate({
      name: name || `${originalTemplate.name} (Copy)`,
      description: originalTemplate.description,
      format: originalTemplate.format,
      fields: originalTemplate.fields,
      includeRelated: originalTemplate.includeRelated,
      filters: originalTemplate.filters,
      sortBy: originalTemplate.sortBy,
      isDefault: false, // Don't make duplicates default
      isPublic: false, // Don't make duplicates public
      createdBy: req.auth._id
    });
    
    await duplicateTemplate.save();
    await duplicateTemplate.populate('createdBy', 'name email');
    
    res.status(201).json(formatSuccessResponse(duplicateTemplate, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Set template as default
const setDefaultTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = await ExportTemplate.findOne({
      _id: templateId,
      createdBy: req.auth._id
    });
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'Export template not found or access denied'
      }, req, 404));
    }
    
    // Set as default (pre-save middleware will handle unsetting other defaults)
    template.isDefault = true;
    await template.save();
    await template.populate('createdBy', 'name email');
    
    res.json(formatSuccessResponse(template, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Get user's default template
const getDefaultTemplate = async (req, res) => {
  try {
    const template = await ExportTemplate.getDefaultTemplate(req.auth._id);
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'NOT_FOUND',
        message: 'No default template found'
      }, req, 404));
    }
    
    await template.populate('createdBy', 'name email');
    
    res.json(formatSuccessResponse(template, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Get public templates
const getPublicTemplates = async (req, res) => {
  try {
    const templates = await ExportTemplate.getPublicTemplates()
      .populate('createdBy', 'name email');
    
    res.json(formatSuccessResponse(templates, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

// Get template usage statistics
const getTemplateStats = async (req, res) => {
  try {
    const stats = await ExportTemplate.aggregate([
      { $match: { createdBy: req.auth._id } },
      {
        $group: {
          _id: '$format',
          count: { $sum: 1 },
          totalUsage: { $sum: '$usageCount' },
          avgUsage: { $avg: '$usageCount' }
        }
      }
    ]);
    
    const totalTemplates = await ExportTemplate.countDocuments({ createdBy: req.auth._id });
    const publicTemplates = await ExportTemplate.countDocuments({ 
      createdBy: req.auth._id, 
      isPublic: true 
    });
    const defaultTemplates = await ExportTemplate.countDocuments({ 
      createdBy: req.auth._id, 
      isDefault: true 
    });
    
    const statistics = {
      totalTemplates,
      publicTemplates,
      defaultTemplates,
      formatStats: stats
    };
    
    res.json(formatSuccessResponse(statistics, req));
    
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
};

export default {
  getExportTemplates,
  getExportTemplate,
  createExportTemplate,
  updateExportTemplate,
  deleteExportTemplate,
  duplicateExportTemplate,
  setDefaultTemplate,
  getDefaultTemplate,
  getPublicTemplates,
  getTemplateStats
};