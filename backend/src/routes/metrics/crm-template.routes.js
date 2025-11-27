import express from "express";
import { requireAnalystRole } from "../../middleware/metrics/auth.middleware.js";

const router = express.Router();

// Apply template-specific middleware
router.use(requireAnalystRole);

// Since the CRM template controller doesn't exist yet, we'll create stub routes
// These will need to be connected to the actual controller when it's created

/**
 * @swagger
 * /metrics/crm/templates:
 *   get:
 *     summary: Get CRM template metrics and analytics
 *     description: Returns comprehensive metrics and analytics for CRM templates
 *     tags: [CRM Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [today, yesterday, last_7_days, last_30_days, this_month, last_month, this_year, last_year]
 *         description: Preset date range
 *     responses:
 *       200:
 *         description: Template metrics retrieved successfully
 */
router.get('/', async (req, res) => {
  try {
    // Import model dynamically
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");
    const { parseDateRange } = await import("../../utils/metrics/dateRange.util.js");

    const { startDate, endDate } = parseDateRange(req.query);
    
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

    const response = {
      summary: {
        totalTemplates,
        approvedTemplates,
        draftTemplates,
        templatesWithABTesting,
        averageOpenRate: performanceMetrics.averageOpenRate,
        averageClickRate: performanceMetrics.averageClickRate,
        totalUsage: performanceMetrics.totalUsage
      },
      breakdowns: {
        category: formatBreakdown(templatesByCategory),
        channel: formatBreakdown(templatesByChannel),
        type: formatBreakdown(templatesByType)
      },
      performance: performanceMetrics,
      topPerforming: topPerformingTemplates
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/templates/list:
 *   get:
 *     summary: Get paginated list of CRM templates
 *     description: Returns a paginated list of CRM templates with filtering and sorting
 *     tags: [CRM Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, review, approved, rejected, archived]
 *         description: Filter by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *           enum: [email, sms, push, in_app, chat, all]
 *         description: Filter by channel
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [marketing, transactional, notification, survey, alert]
 *         description: Filter by type
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
router.get('/list', async (req, res) => {
  try {
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");
    const { buildPaginationMeta } = await import("../../utils/metrics/pagination.util.js");

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { deleted: false };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.channel) filter.channel = req.query.channel;
    if (req.query.type) filter.type = req.query.type;

    // Build sort
    const sort = {};
    if (req.query.sortBy) {
      sort[req.query.sortBy] = req.query.sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const templates = await CrmTemplate.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await CrmTemplate.countDocuments(filter);
    const paginationMeta = buildPaginationMeta(page, limit, total);

    const response = {
      data: templates,
      pagination: paginationMeta
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/templates/search:
 *   get:
 *     summary: Search CRM templates
 *     description: Search CRM templates by text query with filtering
 *     tags: [CRM Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 */
router.get('/search', async (req, res) => {
  try {
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const searchTerm = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const templates = await CrmTemplate.searchTemplates(searchTerm, {
      status: req.query.status,
      category: req.query.category,
      channel: req.query.channel
    })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json(formatSuccessResponse({ data: templates }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/templates/{templateId}:
 *   get:
 *     summary: Get detailed CRM template by ID
 *     description: Returns detailed information for a specific CRM template
 *     tags: [CRM Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template details retrieved successfully
 *       404:
 *         description: Template not found
 */
router.get('/:templateId', async (req, res) => {
  try {
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const template = await CrmTemplate.findById(req.params.templateId)
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

    return res.json(formatSuccessResponse({ template }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/templates:
 *   post:
 *     summary: Create a new CRM template
 *     description: Creates a new CRM template record
 *     tags: [CRM Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - channel
 *               - type
 *               - body
 *               - version
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               subcategory:
 *                 type: string
 *               channel:
 *                 type: string
 *               type:
 *                 type: string
 *               subject:
 *                 type: string
 *               body:
 *                 type: string
 *               htmlBody:
 *                 type: string
 *               variables:
 *                 type: array
 *                 items:
 *                   type: object
 *               settings:
 *                 type: object
 *               version:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Template created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', async (req, res) => {
  try {
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const templateData = {
      ...req.body,
      createdBy: req.user?.id,
      createdAt: new Date()
    };

    const template = new CrmTemplate(templateData);
    await template.save();

    await template.populate('createdBy', 'firstName lastName email');

    return res.status(201).json(formatSuccessResponse({ template }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/templates/{templateId}:
 *   put:
 *     summary: Update CRM template
 *     description: Updates an existing CRM template
 *     tags: [CRM Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               subject:
 *                 type: string
 *               body:
 *                 type: string
 *               htmlBody:
 *                 type: string
 *               settings:
 *                 type: object
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       404:
 *         description: Template not found
 */
router.put('/:templateId', async (req, res) => {
  try {
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const updateData = {
      ...req.body,
      updatedBy: req.user?.id,
      updatedAt: new Date()
    };

    const template = await CrmTemplate.findByIdAndUpdate(
      req.params.templateId,
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

    return res.json(formatSuccessResponse({ template }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/templates/{templateId}:
 *   delete:
 *     summary: Delete CRM template (soft delete)
 *     description: Soft deletes a CRM template
 *     tags: [CRM Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       404:
 *         description: Template not found
 */
router.delete('/:templateId', async (req, res) => {
  try {
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const template = await CrmTemplate.findById(req.params.templateId);
    
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
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/templates/{templateId}/approve:
 *   post:
 *     summary: Approve template
 *     description: Approves a template for use
 *     tags: [CRM Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template approved successfully
 *       404:
 *         description: Template not found
 */
router.post('/:templateId/approve', async (req, res) => {
  try {
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const template = await CrmTemplate.findById(req.params.templateId);
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'CRM template not found'
      }, req, 404));
    }

    await template.approve(req.user?.id);
    await template.populate('approvedBy', 'firstName lastName email');

    return res.json(formatSuccessResponse({ template }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/templates/{templateId}/reject:
 *   post:
 *     summary: Reject template
 *     description: Rejects a template with a reason
 *     tags: [CRM Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Template rejected successfully
 *       404:
 *         description: Template not found
 */
router.post('/:templateId/reject', async (req, res) => {
  try {
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const { reason } = req.body;
    
    const template = await CrmTemplate.findById(req.params.templateId);
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'CRM template not found'
      }, req, 404));
    }

    await template.reject(req.user?.id, reason);
    await template.populate('rejectedBy', 'firstName lastName email');

    return res.json(formatSuccessResponse({ template }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/templates/{templateId}/version:
 *   post:
 *     summary: Create new version
 *     description: Creates a new version of an existing template
 *     tags: [CRM Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - version
 *             properties:
 *               version:
 *                 type: string
 *     responses:
 *       200:
 *         description: New version created successfully
 *       404:
 *         description: Template not found
 */
router.post('/:templateId/version', async (req, res) => {
  try {
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const { version } = req.body;
    
    const template = await CrmTemplate.findById(req.params.templateId);
    
    if (!template) {
      return res.status(404).json(formatErrorResponse({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'CRM template not found'
      }, req, 404));
    }

    const newVersion = await template.createVersion(version, req.user?.id);
    await newVersion.populate('createdBy', 'firstName lastName email');

    return res.json(formatSuccessResponse({ template: newVersion }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/templates/{templateId}/preview:
 *   get:
 *     summary: Preview template
 *     description: Returns a preview of the template with sample data
 *     tags: [CRM Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template preview generated successfully
 *       404:
 *         description: Template not found
 */
router.get('/:templateId/preview', async (req, res) => {
  try {
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const template = await CrmTemplate.findById(req.params.templateId);
    
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
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/templates/category/{category}:
 *   get:
 *     summary: Get templates by category
 *     description: Retrieves templates in a specific category
 *     tags: [CRM Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Template category
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *         description: Filter by channel
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const { category } = req.params;
    const { channel } = req.query;

    const templates = await CrmTemplate.findByCategory(category, channel);

    return res.json(formatSuccessResponse({ templates }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/templates/top-performing:
 *   get:
 *     summary: Get top performing templates
 *     description: Retrieves templates with the best performance metrics
 *     tags: [CRM Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of templates to return
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [openRate, clickRate, conversionRate, responseRate]
 *           default: openRate
 *         description: Performance metric to sort by
 *     responses:
 *       200:
 *         description: Top performing templates retrieved successfully
 */
router.get('/top-performing', async (req, res) => {
  try {
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const limit = parseInt(req.query.limit) || 10;
    const metric = req.query.metric || 'openRate';

    const templates = await CrmTemplate.getTopPerformingTemplates(limit, metric);

    return res.json(formatSuccessResponse({ templates }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/templates/stats:
 *   get:
 *     summary: Get template statistics
 *     description: Returns overall template statistics
 *     tags: [CRM Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Template statistics retrieved successfully
 */
router.get('/stats', async (req, res) => {
  try {
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const stats = await CrmTemplate.getTemplateStats();

    return res.json(formatSuccessResponse({ stats }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

// Helper functions
const getTemplatePerformanceMetrics = async (startDate, endDate) => {
  const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
  
  const metrics = await CrmTemplate.aggregate([
    { $match: { deleted: false } },
    {
      $group: {
        _id: null,
        averageOpenRate: { $avg: '$metrics.averageOpenRate' },
        averageClickRate: { $avg: '$metrics.averageClickRate' },
        totalUsage: { $sum: '$metrics.totalSent' },
        totalDelivered: { $sum: '$metrics.totalDelivered' },
        totalOpened: { $sum: '$metrics.totalOpened' },
        totalClicked: { $sum: '$metrics.totalClicked' }
      }
    }
  ]);
  
  const result = metrics[0] || {};
  
  return {
    averageOpenRate: result.averageOpenRate || 0,
    averageClickRate: result.averageClickRate || 0,
    totalUsage: result.totalUsage || 0,
    totalDelivered: result.totalDelivered || 0,
    totalOpened: result.totalOpened || 0,
    totalClicked: result.totalClicked || 0
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

  const preview = {
    subject: template.subject ? template.subject.replace(/\{\{(\w+)\}\}/g, (match, key) => sampleData[key] || match) : template.subject,
    body: template.body ? template.body.replace(/\{\{(\w+)\}\}/g, (match, key) => sampleData[key] || match) : template.body,
    htmlBody: template.htmlBody ? template.htmlBody.replace(/\{\{(\w+)\}\}/g, (match, key) => sampleData[key] || match) : template.htmlBody
  };

  return preview;
};

export default router;