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
      messages: 'active',
      assignments: 'active'
    }
  });
});

// Mount CRM sub-routes
router.use('/communications', communicationRoutes);
router.use('/contacts', contactRoutes);
router.use('/templates', templateRoutes);
router.use('/automations', automationRoutes);
router.use('/threads', messageRoutes);
router.use('/assignments', assignmentMetricsRoutes);

export default router;