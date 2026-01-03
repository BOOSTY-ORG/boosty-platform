import CrmTemplate from "../../models/metrics/crm-template.model.js";
import { formatSuccessResponse, formatErrorResponse, handleControllerError } from "../../utils/metrics/responseFormatter.util.js";
import { parseDateRange } from "../../utils/metrics/dateRange.util.js";
import { buildQuery } from "../../middleware/metrics/queryBuilder.middleware.js";
import { buildPaginationMeta } from "../../utils/metrics/pagination.util.js";

/**
 * Get CRM template metrics and analytics
 */
export const getCrmTemplateMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    
    // Get basic template metrics
    const [
      totalTemplates,
      approvedTemplates,
      draftTemplates,
      templatesByCategory,
      templatesByChannel,
      templatesByType,
      templatesWithABTesting,
      topPerformingTemplates
    ] = await Promise.all([
      CrmTemplate.countDocuments({ deleted: false }),
      CrmTemplate.countDocuments({ status: 'approved', deleted: false }),
      CrmTemplate.countDocuments({ status: 'draft', deleted: false }),
      CrmTemplate.aggregate([
        { $match: { deleted: false } },
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ]),
      CrmTemplate.aggregate([
        { $match: { deleted: false } },
        { $group: { _id: "$channel", count: { $sum: 1 } } }
      ]),
      CrmTemplate.aggregate([
        { $match: { deleted: false } },
        { $group: { _id: "$type", count: { $sum: 1 } } }
      ]),
      CrmTemplate.countDocuments({ 'abTesting.enabled': true, deleted: false }),
      CrmTemplate.getTopPerformingTemplates(5)
    ]);

    // Calculate performance metrics
    const performanceMetrics = await getTemplatePerformanceMetrics(startDate, endDate);
    
    // Calculate A/B testing metrics
    const abTestingMetrics = await getABTestingMetrics(query);
    
    // Calculate usage metrics
    const usageMetrics = await getUsageMetrics(query, startDate, endDate);

    const response = {
      summary: {
        totalTemplates,
        approvedTemplates,
        draftTemplates,
        templatesWithABTesting,
        averageOpenRate: performanceMetrics.averageOpenRate,
        averageClickRate: performanceMetrics.averageClickRate,
        totalUsage: usageMetrics.totalUsage,
        averageEngagementScore: performanceMetrics.averageEngagementScore
      },
      breakdowns: {
        category: formatBreakdown(templatesByCategory),
        channel: formatBreakdown(templatesByChannel),
        type: formatBreakdown(templatesByType)
      },
      performance: {
        ...performanceMetrics,
        ...usageMetrics,
        ...abTestingMetrics
      },
      topPerforming: topPerformingTemplates,
      trends: await getTemplateTrends(startDate, endDate)
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get detailed CRM template by ID
 */
export const getCrmTemplateDetails = async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = await CrmTemplate.findById(templateId)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('rejectedBy', 'firstName lastName email')
      .populate('parentTemplate', 'name version');
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'CRM template not found'
      }, req, 404));
    }
    
    // Get version history if this is not the first version
    let versionHistory = [];
    if (template.parentTemplate) {
      versionHistory = await CrmTemplate.findLatestVersions(template.parentTemplate);
    }
    
    const response = {
      template: {
        id: template._id,
        name: template.name,
        description: template.description,
        category: template.category,
        subcategory: template.subcategory,
        channel: template.channel,
        type: template.type,
        subject: template.subject,
        body: template.body,
        htmlBody: template.htmlBody,
        variables: template.variables,
        settings: template.settings,
        version: template.version,
        parentTemplate: template.parentTemplate,
        isLatest: template.isLatest,
        status: template.status,
        approvedBy: template.approvedBy,
        approvedAt: template.approvedAt,
        rejectedBy: template.rejectedBy,
        rejectedAt: template.rejectedAt,
        rejectionReason: template.rejectionReason,
        abTesting: template.abTesting,
        metrics: template.metrics,
        restrictions: template.restrictions,
        tags: template.tags,
        language: template.locale,
        createdBy: template.createdBy,
        updatedBy: template.updatedBy,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      },
      virtuals: {
        openRate: template.openRate,
        clickRate: template.clickRate,
        responseRate: template.responseRate,
        deliveryRate: template.deliveryRate,
        isActive: template.isActive
      },
      versionHistory
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get paginated list of CRM templates
 */
export const getCrmTemplateList = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    const paginationOptions = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      skip: (parseInt(req.query.page) || 1 - 1) * (parseInt(req.query.limit) || 20)
    };
    
    // Use query builder sort options if available
    const sortOptions = req.queryBuilder?.sort || { createdAt: -1 };
    
    const templates = await CrmTemplate.findActive(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .sort(sortOptions)
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await CrmTemplate.countDocuments({ ...query, deleted: false });
    const paginationMeta = buildPaginationMeta(paginationOptions.page, paginationOptions.limit, total);
    
    const response = {
      data: templates.map(template => ({
        id: template._id,
        name: template.name,
        description: template.description,
        category: template.category,
        channel: template.channel,
        type: template.type,
        version: template.version,
        status: template.status,
        isLatest: template.isLatest,
        createdBy: template.createdBy,
        approvedBy: template.approvedBy,
        tags: template.tags,
        metrics: template.metrics,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        openRate: template.openRate,
        clickRate: template.clickRate,
        isActive: template.isActive
      })),
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Search CRM templates
 */
export const searchCrmTemplates = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    const paginationOptions = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      skip: (parseInt(req.query.page) || 1 - 1) * (parseInt(req.query.limit) || 20)
    };
    
    // Add search term to query if provided
    if (req.query.q) {
      query.$text = { $search: req.query.q };
    }
    
    const templates = await CrmTemplate.findActive(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .sort(req.queryBuilder.sort || { createdAt: -1 })
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await CrmTemplate.countDocuments({ ...query, deleted: false });
    const paginationMeta = buildPaginationMeta(paginationOptions.page, paginationOptions.limit, total);
    
    const response = {
      data: templates.map(template => ({
        id: template._id,
        name: template.name,
        description: template.description,
        category: template.category,
        channel: template.channel,
        type: template.type,
        version: template.version,
        status: template.status,
        createdBy: template.createdBy,
        tags: template.tags,
        metrics: template.metrics,
        createdAt: template.createdAt,
        openRate: template.openRate,
        clickRate: template.clickRate
      })),
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Create a new CRM template
 */
export const createCrmTemplate = async (req, res) => {
  try {
    const templateData = {
      ...req.body,
      createdBy: req.user?.id || req.body.createdBy,
      createdAt: new Date()
    };

    const template = new CrmTemplate(templateData);
    await template.save();

    // Populate references for response
    await template.populate('createdBy', 'firstName lastName email');

    return res.status(201).json(formatSuccessResponse(template, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Update CRM template
 */
export const updateCrmTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const updateData = {
      ...req.body,
      updatedBy: req.user?.id,
      updatedAt: new Date()
    };

    const template = await CrmTemplate.findByIdAndUpdate(
      templateId,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email')
     .populate('updatedBy', 'firstName lastName email');

    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'CRM template not found'
      }, req, 404));
    }

    return res.json(formatSuccessResponse(template, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Delete CRM template (soft delete)
 */
export const deleteCrmTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = await CrmTemplate.findById(templateId);
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'CRM template not found'
      }, req, 404));
    }

    await template.softDelete(req.user?.id);

    return res.json(formatSuccessResponse(
      { message: 'CRM template deleted successfully' },
      req
    ));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Approve template
 */
export const approveTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = await CrmTemplate.findById(templateId);
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'CRM template not found'
      }, req, 404));
    }

    await template.approve(req.user?.id);
    await template.populate('approvedBy', 'firstName lastName email');

    return res.json(formatSuccessResponse(template, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Reject template
 */
export const rejectTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { reason } = req.body;
    
    const template = await CrmTemplate.findById(templateId);
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'CRM template not found'
      }, req, 404));
    }

    await template.reject(req.user?.id, reason);
    await template.populate('rejectedBy', 'firstName lastName email');

    return res.json(formatSuccessResponse(template, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Create new version of template
 */
export const createTemplateVersion = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { version } = req.body;
    
    const template = await CrmTemplate.findById(templateId);
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'CRM template not found'
      }, req, 404));
    }

    const newVersion = await template.createVersion(version, req.user?.id);
    await newVersion.populate('createdBy', 'firstName lastName email');

    return res.json(formatSuccessResponse(newVersion, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Preview template with sample data
 */
export const previewTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = await CrmTemplate.findById(templateId);
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'CRM template not found'
      }, req, 404));
    }

    // Generate preview with sample data
    const preview = generateTemplatePreview(template);

    return res.json(formatSuccessResponse({ preview }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get templates by category
 */
export const getTemplatesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { channel } = req.query;

    const templates = await CrmTemplate.findByCategory(category, channel);

    return res.json(formatSuccessResponse({ templates }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get top performing templates
 */
export const getTopPerformingTemplates = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const metric = req.query.metric || 'openRate';

    const templates = await CrmTemplate.getTopPerformingTemplates(limit, metric);

    return res.json(formatSuccessResponse({ templates }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Update template metrics
 */
export const updateTemplateMetrics = async (req, res) => {
  try {
    const { templateId } = req.params;
    const metricsData = req.body;
    
    const template = await CrmTemplate.findById(templateId);
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'CRM template not found'
      }, req, 404));
    }

    await template.updateMetrics(metricsData);

    return res.json(formatSuccessResponse(template, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get template statistics
 */
export const getTemplateStats = async (req, res) => {
  try {
    const stats = await CrmTemplate.getTemplateStats();
    
    return res.json(formatSuccessResponse({ stats }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Test A/B variant
 */
export const testABVariant = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { variantIndex, testData } = req.body;
    
    const template = await CrmTemplate.findById(templateId);
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'CRM template not found'
      }, req, 404));
    }

    if (!template.abTesting.enabled) {
      return res.status(400).json(formatErrorResponse({
        code: 'AB_TESTING_NOT_ENABLED',
        message: 'A/B testing is not enabled for this template'
      }, req, 400));
    }

    const variant = template.abTesting.variants[variantIndex];
    if (!variant) {
      return res.status(404).json(formatErrorResponse({
        code: 'VARIANT_NOT_FOUND',
        message: 'A/B test variant not found'
      }, req, 404));
    }

    // Generate preview for the variant
    const preview = generateVariantPreview(variant, testData);

    return res.json(formatSuccessResponse({ 
      variant: variantIndex,
      preview
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Bulk operations
export const bulkUpdateTemplates = async (req, res) => {
  try {
    const { templateIds, updateData } = req.body;
    
    const result = await CrmTemplate.updateMany(
      { _id: { $in: templateIds }, deleted: false },
      { ...updateData, updatedAt: new Date() }
    );

    return res.json(formatSuccessResponse({
      updatedCount: result.modifiedCount,
      message: `Successfully updated ${result.modifiedCount} templates`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const bulkDeleteTemplates = async (req, res) => {
  try {
    const { templateIds } = req.body;
    
    // Soft delete templates
    const templates = await CrmTemplate.find({ _id: { $in: templateIds }, deleted: false });
    for (const template of templates) {
      await template.softDelete(req.user?.id);
    }

    return res.json(formatSuccessResponse({
      deletedCount: templates.length,
      message: `Successfully deleted ${templates.length} templates`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const bulkApproveTemplates = async (req, res) => {
  try {
    const { templateIds } = req.body;
    
    const templates = await CrmTemplate.find({ _id: { $in: templateIds }, deleted: false });
    const results = [];
    
    for (const template of templates) {
      try {
        await template.approve(req.user?.id);
        results.push({ id: template._id, status: 'approved' });
      } catch (error) {
        results.push({ id: template._id, status: 'error', error: error.message });
      }
    }

    return res.json(formatSuccessResponse({
      results,
      approvedCount: results.filter(r => r.status === 'approved').length,
      message: `Successfully approved ${results.filter(r => r.status === 'approved').length} templates`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper functions
const getTemplatePerformanceMetrics = async (query, startDate, endDate) => {
  const metrics = await CrmTemplate.aggregate([
    { $match: { deleted: false } },
    {
      $group: {
        _id: null,
        averageOpenRate: { $avg: '$metrics.averageOpenRate' },
        averageClickRate: { $avg: '$metrics.averageClickRate' },
        averageResponseRate: { $avg: '$metrics.averageResponseRate' },
        totalUsage: { $sum: '$metrics.totalSent' },
        totalDelivered: { $sum: '$metrics.totalDelivered' },
        totalOpened: { $sum: '$metrics.totalOpened' },
        totalClicked: { $sum: '$metrics.totalClicked' },
        totalResponded: { $sum: '$metrics.totalResponded' },
        averageEngagementScore: { 
          $avg: { 
            $multiply: [
              { $divide: ['$metrics.totalOpened', '$metrics.totalDelivered'] },
              { $divide: ['$metrics.totalClicked', '$metrics.totalOpened'] }
            ]
          }
        }
      }
    }
  ]);
  
  const result = metrics[0] || {};
  
  return {
    averageOpenRate: result.averageOpenRate || 0,
    averageClickRate: result.averageClickRate || 0,
    averageResponseRate: result.averageResponseRate || 0,
    totalUsage: result.totalUsage || 0,
    totalDelivered: result.totalDelivered || 0,
    totalOpened: result.totalOpened || 0,
    totalClicked: result.totalClicked || 0,
    totalResponded: result.totalResponded || 0,
    averageEngagementScore: result.averageEngagementScore || 0
  };
};

const getABTestingMetrics = async (query) => {
  const metrics = await CrmTemplate.aggregate([
    { $match: { ...query, 'abTesting.enabled': true, deleted: false } },
    {
      $group: {
        _id: null,
        totalABTests: { $sum: 1 },
        averageTestDuration: { $avg: '$abTesting.testDuration' },
        variantsCount: { $sum: { $size: '$abTesting.variants' } }
      }
    }
  ]);
  
  const result = metrics[0] || {};
  
  return {
    totalABTests: result.totalABTests || 0,
    averageTestDuration: result.averageTestDuration || 0,
    averageVariantsPerTest: result.totalABTests > 0 ? (result.variantsCount / result.totalABTests) : 0
  };
};

const getUsageMetrics = async (query, startDate, endDate) => {
  const metrics = await CrmTemplate.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalUsage: { $sum: '$metrics.totalSent' },
        uniqueTemplatesUsed: { $sum: { $cond: [{ $gt: ['$metrics.totalSent', 0] }, 1, 0] } },
        averageUsagePerTemplate: { $avg: '$metrics.totalSent' }
      }
    }
  ]);
  
  const result = metrics[0] || {};
  
  return {
    totalUsage: result.totalUsage || 0,
    uniqueTemplatesUsed: result.uniqueTemplatesUsed || 0,
    averageUsagePerTemplate: result.averageUsagePerTemplate || 0
  };
};

const getTemplateTrends = async (startDate, endDate) => {
  // Get monthly template usage trends
  const monthlyUsage = await CrmTemplate.aggregate([
    {
      $match: {
        'metrics.lastUsed': { $gte: startDate, $lte: endDate },
        deleted: false
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$metrics.lastUsed" },
          month: { $month: "$metrics.lastUsed" }
        },
        totalUsage: { $sum: '$metrics.totalSent' },
        templatesUsed: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
  
  return {
    usage: monthlyUsage.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      totalUsage: item.totalUsage,
      templatesUsed: item.templatesUsed
    }))
  };
};

const formatBreakdown = (breakdown) => {
  return breakdown.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

const generateTemplatePreview = (template) => {
  // Simple preview generation - in a real implementation, this would be more sophisticated
  const sampleData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    company: 'Example Corp',
    date: new Date().toLocaleDateString()
  };

  const replaceVariables = (text) => {
    if (!text) return text;
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => sampleData[key] || match);
  };

  return {
    subject: replaceVariables(template.subject),
    body: replaceVariables(template.body),
    htmlBody: replaceVariables(template.htmlBody)
  };
};

const generateVariantPreview = (variant, testData) => {
  const data = testData || {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    company: 'Example Corp',
    date: new Date().toLocaleDateString()
  };

  const replaceVariables = (text) => {
    if (!text) return text;
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
  };

  return {
    subject: replaceVariables(variant.subject),
    body: replaceVariables(variant.body),
    htmlBody: replaceVariables(variant.htmlBody)
  };
};

export default {
  getCrmTemplateMetrics,
  getCrmTemplateDetails,
  getCrmTemplateList,
  searchCrmTemplates,
  createCrmTemplate,
  updateCrmTemplate,
  deleteCrmTemplate,
  approveTemplate,
  rejectTemplate,
  createTemplateVersion,
  previewTemplate,
  getTemplatesByCategory,
  getTopPerformingTemplates,
  updateTemplateMetrics,
  getTemplateStats,
  testABVariant,
  bulkUpdateTemplates,
  bulkDeleteTemplates,
  bulkApproveTemplates
};