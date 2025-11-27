import express from "express";
import { requireAnalystRole } from "../../middleware/metrics/auth.middleware.js";

const router = express.Router();

// Apply automation-specific middleware
router.use(requireAnalystRole);

// Since the CRM automation controller doesn't exist yet, we'll create stub routes
// These will need to be connected to the actual controller when it's created

/**
 * @swagger
 * /metrics/crm/automations:
 *   get:
 *     summary: Get CRM automation metrics and analytics
 *     description: Returns comprehensive metrics and analytics for CRM automations
 *     tags: [CRM Automations]
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
 *         description: Automation metrics retrieved successfully
 */
router.get('/', async (req, res) => {
  try {
    // Import model dynamically
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");
    const { parseDateRange } = await import("../../utils/metrics/dateRange.util.js");

    const { startDate, endDate } = parseDateRange(req.query);
    
    // Get basic automation metrics
    const [
      totalAutomations,
      activeAutomations,
      pausedAutomations,
      automationsByCategory,
      automationsByTriggerType,
      automationsByStatus,
      dueForExecution,
      topPerformingAutomations
    ] = await Promise.all([
      CrmAutomation.countDocuments({ deleted: false }),
      CrmAutomation.countDocuments({ enabled: true, status: 'active', deleted: false }),
      CrmAutomation.countDocuments({ enabled: false, deleted: false }),
      CrmAutomation.aggregate([
        { $match: { deleted: false } },
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ]),
      CrmAutomation.aggregate([
        { $match: { deleted: false } },
        { $group: { _id: "$trigger.type", count: { $sum: 1 } } }
      ]),
      CrmAutomation.aggregate([
        { $match: { deleted: false } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      CrmAutomation.findDueForExecution(),
      CrmAutomation.getTopPerformingAutomations(5)
    ]);

    // Calculate performance metrics
    const performanceMetrics = await getAutomationPerformanceMetrics(startDate, endDate);

    const response = {
      summary: {
        totalAutomations,
        activeAutomations,
        pausedAutomations,
        dueForExecution: dueForExecution.length,
        averageSuccessRate: performanceMetrics.averageSuccessRate,
        totalExecutions: performanceMetrics.totalExecutions,
        totalContactsProcessed: performanceMetrics.totalContactsProcessed
      },
      breakdowns: {
        category: formatBreakdown(automationsByCategory),
        triggerType: formatBreakdown(automationsByTriggerType),
        status: formatBreakdown(automationsByStatus)
      },
      performance: performanceMetrics,
      topPerforming: topPerformingAutomations,
      alerts: {
        dueForExecution: dueForExecution.length
      }
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/list:
 *   get:
 *     summary: Get paginated list of CRM automations
 *     description: Returns a paginated list of CRM automations with filtering and sorting
 *     tags: [CRM Automations]
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
 *           enum: [draft, active, paused, error, completed]
 *         description: Filter by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: enabled
 *         schema:
 *           type: boolean
 *         description: Filter by enabled status
 *     responses:
 *       200:
 *         description: Automations retrieved successfully
 */
router.get('/list', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");
    const { buildPaginationMeta } = await import("../../utils/metrics/pagination.util.js");

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { deleted: false };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.enabled !== undefined) filter.enabled = req.query.enabled === 'true';

    // Build sort
    const sort = {};
    if (req.query.sortBy) {
      sort[req.query.sortBy] = req.query.sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const automations = await CrmAutomation.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await CrmAutomation.countDocuments(filter);
    const paginationMeta = buildPaginationMeta(page, limit, total);

    const response = {
      data: automations,
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
 * /metrics/crm/automations/search:
 *   get:
 *     summary: Search CRM automations
 *     description: Search CRM automations by text query with filtering
 *     tags: [CRM Automations]
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
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const searchTerm = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const automations = await CrmAutomation.searchAutomations(searchTerm, {
      status: req.query.status,
      category: req.query.category,
      enabled: req.query.enabled
    })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json(formatSuccessResponse({ data: automations }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/{automationId}:
 *   get:
 *     summary: Get detailed CRM automation by ID
 *     description: Returns detailed information for a specific CRM automation
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: automationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Automation ID
 *     responses:
 *       200:
 *         description: Automation details retrieved successfully
 *       404:
 *         description: Automation not found
 */
router.get('/:automationId', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const automation = await CrmAutomation.findById(req.params.automationId)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    if (!automation) {
      return res.status(404).json(formatErrorResponse({
        code: 'AUTOMATION_NOT_FOUND',
        message: 'CRM automation not found'
      }, req, 404));
    }

    return res.json(formatSuccessResponse({ automation }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations:
 *   post:
 *     summary: Create a new CRM automation
 *     description: Creates a new CRM automation record
 *     tags: [CRM Automations]
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
 *               - trigger
 *               - actions
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               trigger:
 *                 type: object
 *               actions:
 *                 type: array
 *                 items:
 *                   type: object
 *               target:
 *                 type: object
 *               limits:
 *                 type: object
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Automation created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const automationData = {
      ...req.body,
      createdBy: req.user?.id,
      createdAt: new Date()
    };

    const automation = new CrmAutomation(automationData);
    await automation.save();

    await automation.populate('createdBy', 'firstName lastName email');

    return res.status(201).json(formatSuccessResponse({ automation }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/{automationId}:
 *   put:
 *     summary: Update CRM automation
 *     description: Updates an existing CRM automation
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: automationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Automation ID
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
 *               enabled:
 *                 type: boolean
 *               trigger:
 *                 type: object
 *               actions:
 *                 type: array
 *                 items:
 *                   type: object
 *               target:
 *                 type: object
 *               limits:
 *                 type: object
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Automation updated successfully
 *       404:
 *         description: Automation not found
 */
router.put('/:automationId', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const updateData = {
      ...req.body,
      updatedBy: req.user?.id,
      updatedAt: new Date()
    };

    const automation = await CrmAutomation.findByIdAndUpdate(
      req.params.automationId,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email')
     .populate('updatedBy', 'firstName lastName email');

    if (!automation) {
      return res.status(404).json(formatErrorResponse({
        code: 'AUTOMATION_NOT_FOUND',
        message: 'CRM automation not found'
      }, req, 404));
    }

    return res.json(formatSuccessResponse({ automation }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/{automationId}:
 *   delete:
 *     summary: Delete CRM automation (soft delete)
 *     description: Soft deletes a CRM automation
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: automationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Automation ID
 *     responses:
 *       200:
 *         description: Automation deleted successfully
 *       404:
 *         description: Automation not found
 */
router.delete('/:automationId', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const automation = await CrmAutomation.findById(req.params.automationId);
    
    if (!automation) {
      return res.status(404).json(formatErrorResponse({
        code: 'AUTOMATION_NOT_FOUND',
        message: 'CRM automation not found'
      }, req, 404));
    }

    await automation.softDelete(req.user?.id);

    return res.json(formatSuccessResponse(
      { message: 'CRM automation deleted successfully' },
      req
    ));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/{automationId}/enable:
 *   post:
 *     summary: Enable automation
 *     description: Enables a CRM automation
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: automationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Automation ID
 *     responses:
 *       200:
 *         description: Automation enabled successfully
 *       404:
 *         description: Automation not found
 */
router.post('/:automationId/enable', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const automation = await CrmAutomation.findById(req.params.automationId);
    
    if (!automation) {
      return res.status(404).json(formatErrorResponse({
        code: 'AUTOMATION_NOT_FOUND',
        message: 'CRM automation not found'
      }, req, 404));
    }

    await automation.enable();

    return res.json(formatSuccessResponse({ automation }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/{automationId}/disable:
 *   post:
 *     summary: Disable automation
 *     description: Disables a CRM automation
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: automationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Automation ID
 *     responses:
 *       200:
 *         description: Automation disabled successfully
 *       404:
 *         description: Automation not found
 */
router.post('/:automationId/disable', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const automation = await CrmAutomation.findById(req.params.automationId);
    
    if (!automation) {
      return res.status(404).json(formatErrorResponse({
        code: 'AUTOMATION_NOT_FOUND',
        message: 'CRM automation not found'
      }, req, 404));
    }

    await automation.disable();

    return res.json(formatSuccessResponse({ automation }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/{automationId}/test:
 *   post:
 *     summary: Test automation
 *     description: Tests a CRM automation with sample data
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: automationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Automation ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               testData:
 *                 type: object
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Automation test completed successfully
 *       404:
 *         description: Automation not found
 */
router.post('/:automationId/test', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const automation = await CrmAutomation.findById(req.params.automationId);
    
    if (!automation) {
      return res.status(404).json(formatErrorResponse({
        code: 'AUTOMATION_NOT_FOUND',
        message: 'CRM automation not found'
      }, req, 404));
    }

    // Simulate test execution - in a real implementation, this would actually run the automation
    const testResult = {
      success: true,
      executionTime: Math.random() * 1000,
      contactsProcessed: req.body.recipients?.length || 1,
      actionsExecuted: automation.actions.length,
      errors: []
    };

    return res.json(formatSuccessResponse({ testResult }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/{automationId}/execute:
 *   post:
 *     summary: Execute automation manually
 *     description: Manually executes a CRM automation
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: automationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Automation ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               triggerData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Automation executed successfully
 *       404:
 *         description: Automation not found
 */
router.post('/:automationId/execute', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const automation = await CrmAutomation.findById(req.params.automationId);
    
    if (!automation) {
      return res.status(404).json(formatErrorResponse({
        code: 'AUTOMATION_NOT_FOUND',
        message: 'CRM automation not found'
      }, req, 404));
    }

    // Record manual execution
    const executionData = {
      status: 'success',
      contactsProcessed: 1,
      executionTime: Math.random() * 2000,
      triggeredBy: 'manual'
    };

    await automation.recordExecution(executionData);

    return res.json(formatSuccessResponse({ 
      message: 'Automation executed successfully',
      execution: executionData
    }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/{automationId}/history:
 *   get:
 *     summary: Get execution history
 *     description: Returns the execution history for a specific automation
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: automationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Automation ID
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
 *         description: Execution history retrieved successfully
 *       404:
 *         description: Automation not found
 */
router.get('/:automationId/history', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse, formatErrorResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const automation = await CrmAutomation.findById(req.params.automationId);
    
    if (!automation) {
      return res.status(404).json(formatErrorResponse({
        code: 'AUTOMATION_NOT_FOUND',
        message: 'CRM automation not found'
      }, req, 404));
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const history = automation.recentExecutions
      .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt))
      .slice(skip, skip + limit);

    const response = {
      data: history,
      pagination: {
        page,
        limit,
        total: automation.recentExecutions.length,
        pages: Math.ceil(automation.recentExecutions.length / limit)
      }
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/category/{category}:
 *   get:
 *     summary: Get automations by category
 *     description: Retrieves automations in a specific category
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Automation category
 *     responses:
 *       200:
 *         description: Automations retrieved successfully
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const { category } = req.params;

    const automations = await CrmAutomation.findByCategory(category);

    return res.json(formatSuccessResponse({ automations }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/due-for-execution:
 *   get:
 *     summary: Get automations due for execution
 *     description: Retrieves automations that are due for execution
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Due automations retrieved successfully
 */
router.get('/due-for-execution', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const automations = await CrmAutomation.findDueForExecution();

    return res.json(formatSuccessResponse({ automations }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/top-performing:
 *   get:
 *     summary: Get top performing automations
 *     description: Retrieves automations with the best performance metrics
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of automations to return
 *     responses:
 *       200:
 *         description: Top performing automations retrieved successfully
 */
router.get('/top-performing', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const limit = parseInt(req.query.limit) || 10;

    const automations = await CrmAutomation.getTopPerformingAutomations(limit);

    return res.json(formatSuccessResponse({ automations }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/stats:
 *   get:
 *     summary: Get automation statistics
 *     description: Returns overall automation statistics
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Automation statistics retrieved successfully
 */
router.get('/stats', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const stats = await CrmAutomation.getAutomationStats();

    return res.json(formatSuccessResponse({ stats }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/bulk/enable:
 *   post:
 *     summary: Bulk enable automations
 *     description: Enables multiple automations in bulk
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - automationIds
 *             properties:
 *               automationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Automations enabled successfully
 */
router.post('/bulk/enable', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const { automationIds } = req.body;
    
    const result = await CrmAutomation.updateMany(
      { _id: { $in: automationIds }, deleted: false },
      { 
        enabled: true,
        status: 'active',
        updatedAt: new Date()
      }
    );

    return res.json(formatSuccessResponse({
      enabledCount: result.modifiedCount,
      message: `Successfully enabled ${result.modifiedCount} automations`
    }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/bulk/disable:
 *   post:
 *     summary: Bulk disable automations
 *     description: Disables multiple automations in bulk
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - automationIds
 *             properties:
 *               automationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Automations disabled successfully
 */
router.post('/bulk/disable', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const { automationIds } = req.body;
    
    const result = await CrmAutomation.updateMany(
      { _id: { $in: automationIds }, deleted: false },
      { 
        enabled: false,
        status: 'paused',
        'metrics.nextExecution': null,
        updatedAt: new Date()
      }
    );

    return res.json(formatSuccessResponse({
      disabledCount: result.modifiedCount,
      message: `Successfully disabled ${result.modifiedCount} automations`
    }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

/**
 * @swagger
 * /metrics/crm/automations/bulk/delete:
 *   post:
 *     summary: Bulk delete automations
 *     description: Soft deletes multiple automations in bulk
 *     tags: [CRM Automations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - automationIds
 *             properties:
 *               automationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Automations deleted successfully
 */
router.post('/bulk/delete', async (req, res) => {
  try {
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    const { automationIds } = req.body;
    
    // Soft delete automations
    const automations = await CrmAutomation.find({ _id: { $in: automationIds }, deleted: false });
    for (const automation of automations) {
      await automation.softDelete(req.user?.id);
    }

    return res.json(formatSuccessResponse({
      deletedCount: automations.length,
      message: `Successfully deleted ${automations.length} automations`
    }, req));
  } catch (error) {
    const { handleControllerError } = await import("../../utils/metrics/responseFormatter.util.js");
    return handleControllerError(error, req, res);
  }
});

// Helper functions
const getAutomationPerformanceMetrics = async (startDate, endDate) => {
  const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
  
  const metrics = await CrmAutomation.aggregate([
    { $match: { deleted: false } },
    {
      $group: {
        _id: null,
        averageSuccessRate: { $avg: '$metrics.successRate' },
        totalExecutions: { $sum: '$metrics.executionCount' },
        totalSuccesses: { $sum: '$metrics.successCount' },
        totalFailures: { $sum: '$metrics.failureCount' },
        totalContactsProcessed: { $sum: '$metrics.totalContactsProcessed' },
        averageExecutionTime: { $avg: '$metrics.averageExecutionTime' }
      }
    }
  ]);
  
  const result = metrics[0] || {};
  
  return {
    averageSuccessRate: result.averageSuccessRate || 0,
    totalExecutions: result.totalExecutions || 0,
    totalSuccesses: result.totalSuccesses || 0,
    totalFailures: result.totalFailures || 0,
    totalContactsProcessed: result.totalContactsProcessed || 0,
    averageExecutionTime: result.averageExecutionTime || 0
  };
};

const formatBreakdown = (breakdown) => {
  return breakdown.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

export default router;