import CommunicationTemplate from '../models/communicationTemplate.model.js';

/**
 * Get all communication templates
 */
export const getCommunicationTemplates = async (req, res) => {
  try {
    const { page = 1, limit = 20, filters = {} } = req.query;

    const templates = await CommunicationTemplate.findActive(filters)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('parentTemplateId', 'name description');

    const totalCount = await CommunicationTemplate.countDocuments({ isActive: true, ...filters });
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: templates,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching communication templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
};

/**
 * Get communication template by ID
 */
export const getCommunicationTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await CommunicationTemplate.findById(id)
      .populate('parentTemplateId', 'name description');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching communication template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
      error: error.message
    });
  }
};

/**
 * Create new communication template
 */
export const createCommunicationTemplate = async (req, res) => {
  try {
    const templateData = {
      ...req.body,
      createdBy: req.user?.id || 'system',
      updatedBy: req.user?.id || 'system'
    };

    const template = new CommunicationTemplate(templateData);
    await template.save();

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating communication template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message
    });
  }
};

/**
 * Update communication template
 */
export const updateCommunicationTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedBy: req.user?.id || 'system'
    };

    const template = await CommunicationTemplate.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating communication template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message
    });
  }
};

/**
 * Delete communication template
 */
export const deleteCommunicationTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await CommunicationTemplate.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check if template is being used by other communications
    const communicationsUsingTemplate = await Communication.countDocuments({ templateId: id });
    if (communicationsUsingTemplate > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete template that is in use'
      });
    }

    await CommunicationTemplate.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting communication template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message
    });
  }
};

/**
 * Duplicate communication template
 */
export const duplicateCommunicationTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const originalTemplate = await CommunicationTemplate.findById(id);
    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const duplicatedTemplate = await originalTemplate.duplicate(
      name,
      req.user?.id || 'system'
    );

    res.status(201).json({
      success: true,
      data: duplicatedTemplate,
      message: 'Template duplicated successfully'
    });
  } catch (error) {
    console.error('Error duplicating communication template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate template',
      error: error.message
    });
  }
};

/**
 * Get template usage statistics
 */
export const getCommunicationTemplateUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange } = req.query;

    const template = await CommunicationTemplate.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const usageStats = await Communication.aggregate([
      {
        $match: {
          templateId: template._id,
          ...(dateRange && {
            createdAt: {
              $gte: new Date(dateRange.start),
              $lte: new Date(dateRange.end)
            }
          })
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          usageCount: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
      },
      {
        $group: {
          _id: null,
          totalUsage: { $sum: '$usageCount' },
          totalUniqueUsers: { $sum: { $size: '$uniqueUsers' } },
          avgDailyUsage: { $avg: '$usageCount' },
          monthlyUsage: []
        }
      },
      {
        $project: {
          monthlyUsage: {
            $map: {
              input: '$$ROOT',
              as: 'monthly',
              in: {
                year: '$_id.year',
                month: '$_id.month',
                usage: '$usageCount',
                uniqueUsers: { $size: '$uniqueUsers' }
              }
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        template,
        usageStats: usageStats[0]?.monthlyUsage || []
      }
    });
  } catch (error) {
    console.error('Error fetching template usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template usage',
      error: error.message
    });
  }
};

/**
 * Get popular templates
 */
export const getPopularTemplates = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const templates = await CommunicationTemplate.getPopular(parseInt(limit));

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching popular templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular templates',
      error: error.message
    });
  }
};

/**
 * Get system templates
 */
export const getSystemTemplates = async (req, res) => {
  try {
    const templates = await CommunicationTemplate.getSystemTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching system templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system templates',
      error: error.message
    });
  }
};

/**
 * Get templates by category
 */
export const getTemplatesByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const templates = await CommunicationTemplate.findByCategory(category);

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates by category',
      error: error.message
    });
  }
};

/**
 * Bulk update templates
 */
export const bulkUpdateTemplates = async (req, res) => {
  try {
    const { templateIds, updateData } = req.body;

    const result = await CommunicationTemplate.updateMany(
      { _id: { $in: templateIds } },
      {
        ...updateData,
        updatedBy: req.user?.id || 'system'
      }
    );

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      },
      message: `Updated ${result.modifiedCount} templates successfully`
    });
  } catch (error) {
    console.error('Error bulk updating templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update templates',
      error: error.message
    });
  }
};

/**
 * Test template rendering
 */
export const testTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    const template = await CommunicationTemplate.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const renderedContent = template.renderContent(variables);
    const renderedSubject = template.subject ? 
      template.renderContent({ ...variables, subject: template.subject }) : 
      null;

    res.json({
      success: true,
      data: {
        originalContent: template.content,
        originalSubject: template.subject,
        renderedContent,
        renderedSubject,
        variables: template.variables
      }
    });
  } catch (error) {
    console.error('Error testing template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test template',
      error: error.message
    });
  }
};