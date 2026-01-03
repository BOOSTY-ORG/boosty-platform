import express from "express";
import { requireMetricsAuth, requireManagerRole } from "../../middleware/metrics/auth.middleware.js";
import { validateDateRange, validatePagination, validateSorting } from "../../middleware/metrics/validation.middleware.js";
import { standardRateLimit } from "../../middleware/metrics/rateLimit.middleware.js";
import { smartCache } from "../../middleware/metrics/caching.middleware.js";
import { applyQueryBuilder } from "../../middleware/metrics/queryBuilder.middleware.js";

// Import CRM sub-routes
import communicationRoutes from "./crm-communication.routes.js";
import contactRoutes from "./crm-contact.routes.js";
import templateRoutes from "./crm-template.routes.js";
import automationRoutes from "./crm-automation.routes.js";
import messageRoutes from "./crm-message.routes.js";
import assignmentMetricsRoutes from "./crm-assignment-metrics.routes.js";
import ticketRoutes from "./ticket.routes.js";

// Import comprehensive CRM metrics controller
import { getCrmMetrics, getCrmMetricsByCategory, getCrmRealtimeMetrics } from "../../controllers/metrics/crm.controller.js";

const router = express.Router();

// Apply common middleware to all CRM routes
router.use(requireMetricsAuth);
router.use(requireManagerRole); // CRM requires manager-level access
router.use(validateDateRange);
router.use(validatePagination);
router.use(validateSorting);
router.use(standardRateLimit);
router.use(smartCache);
router.use(applyQueryBuilder);

/**
 * @swagger
 * /metrics/crm:
 *   get:
 *     summary: Get CRM system overview
 *     description: Returns an overview of the CRM system including key metrics and status
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CRM overview data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalContacts:
 *                           type: number
 *                         totalCommunications:
 *                           type: number
 *                         activeAutomations:
 *                           type: number
 *                         approvedTemplates:
 *                           type: number
 *                     modules:
 *                       type: object
 *                       properties:
 *                         communications:
 *                           type: object
 *                           properties:
 *                             endpoint:
 *                               type: string
 *                             description:
 *                               type: string
 *                         contacts:
 *                           type: object
 *                           properties:
 *                             endpoint:
 *                               type: string
 *                             description:
 *                               type: string
 *                         templates:
 *                           type: object
 *                           properties:
 *                             endpoint:
 *                               type: string
 *                             description:
 *                               type: string
 *                         automations:
 *                           type: object
 *                           properties:
 *                             endpoint:
 *                               type: string
 *                             description:
 *                               type: string
 */
router.get('/', async (req, res) => {
  try {
    // Import models dynamically to avoid circular dependencies
    const { default: CrmContact } = await import("../../models/metrics/crm-contact.model.js");
    const { default: CrmCommunication } = await import("../../models/metrics/crm-communication.model.js");
    const { default: CrmTemplate } = await import("../../models/metrics/crm-template.model.js");
    const { default: CrmAutomation } = await import("../../models/metrics/crm-automation.model.js");
    const { formatSuccessResponse } = await import("../../utils/metrics/responseFormatter.util.js");

    // Get basic CRM metrics
    const [
      totalContacts,
      totalCommunications,
      activeAutomations,
      approvedTemplates
    ] = await Promise.all([
      CrmContact.countDocuments({ deleted: false }),
      CrmCommunication.countDocuments({ deleted: false }),
      CrmAutomation.countDocuments({ enabled: true, status: 'active', deleted: false }),
      CrmTemplate.countDocuments({ status: 'approved', isLatest: true, deleted: false })
    ]);

    const response = {
      summary: {
        totalContacts,
        totalCommunications,
        activeAutomations,
        approvedTemplates
      },
      modules: {
        communications: {
          endpoint: '/metrics/crm/communications',
          description: 'CRM communications management and analytics'
        },
        contacts: {
          endpoint: '/metrics/crm/contacts',
          description: 'CRM contacts management and segmentation'
        },
        templates: {
          endpoint: '/metrics/crm/templates',
          description: 'CRM templates management and A/B testing'
        },
        automations: {
          endpoint: '/metrics/crm/automations',
          description: 'CRM automation rules and workflows'
        },
        tickets: {
          endpoint: '/metrics/crm/tickets',
          description: 'CRM tickets management and tracking'
        },
        messages: {
          endpoint: '/metrics/crm/threads',
          description: 'CRM message threads and conversations'
        },
        assignments: {
          endpoint: '/metrics/crm/assignments',
          description: 'CRM assignment metrics and workload distribution'
        }
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
 * /metrics/crm/health:
 *   get:
 *     summary: CRM health check
 *     description: Health check endpoint for CRM module
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CRM service health status
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'crm-api',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    modules: {
      communications: 'active',
      contacts: 'active',
      templates: 'active',
      automations: 'active',
      tickets: 'active',
      messages: 'active',
      assignments: 'active'
    }
  });
});

/**
 * @swagger
 * /metrics/crm/metrics:
 *   get:
 *     summary: Get comprehensive CRM metrics
 *     description: Returns a unified view of all CRM metrics including contacts, communications, assignments, messages, templates, and automations
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering metrics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering metrics
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: string
 *         description: Filter metrics by specific agent ID
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *         description: Filter metrics by specific team ID
 *       - in: query
 *         name: includePagination
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include pagination metadata in response
 *     responses:
 *       200:
 *         description: Comprehensive CRM metrics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       description: Summary of all CRM metrics
 *                     breakdowns:
 *                       type: object
 *                       description: Detailed breakdowns by category
 *                     trends:
 *                       type: object
 *                       description: Trend data over time
 *                     performance:
 *                       type: object
 *                       description: Performance and financial metrics
 *                     alerts:
 *                       type: object
 *                       description: System alerts and notifications
 *                     filters:
 *                       type: object
 *                       description: Applied filters
 */
router.get('/metrics', getCrmMetrics);

/**
 * @swagger
 * /metrics/crm/metrics/{category}:
 *   get:
 *     summary: Get CRM metrics by specific category
 *     description: Returns detailed metrics for a specific CRM category
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [contacts, communications, assignments, messages, templates, automations]
 *         description: CRM category to get metrics for
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering metrics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering metrics
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: string
 *         description: Filter metrics by specific agent ID
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *         description: Filter metrics by specific team ID
 *     responses:
 *       200:
 *         description: Category-specific CRM metrics data
 *       400:
 *         description: Invalid category provided
 */
router.get('/metrics/:category', getCrmMetricsByCategory);

/**
 * @swagger
 * /metrics/crm/metrics/realtime:
 *   get:
 *     summary: Get real-time CRM metrics
 *     description: Returns real-time CRM metrics for dashboard display
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time CRM metrics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of the metrics snapshot
 *                     last24Hours:
 *                       type: object
 *                       description: Metrics from the last 24 hours
 *                     lastHour:
 *                       type: object
 *                       description: Metrics from the last hour
 *                     current:
 *                       type: object
 *                       description: Current active items
 *                     alerts:
 *                       type: object
 *                       description: System alerts
 */
router.get('/metrics/realtime', getCrmRealtimeMetrics);

// Mount CRM sub-routes with error handling
try {
  router.use('/communications', communicationRoutes);
  router.use('/contacts', contactRoutes);
  router.use('/templates', templateRoutes);
  router.use('/automations', automationRoutes);
  router.use('/tickets', ticketRoutes);
  router.use('/threads', messageRoutes);
  router.use('/assignments', assignmentMetricsRoutes);
} catch (error) {
  console.error('Error mounting CRM routes:', error);
  // Add error handling middleware for CRM route registration failures
  router.use((err, req, res, next) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'CRM route registration error',
        message: 'There was an error registering CRM routes',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    next();
  });
}

export default router;