import express from "express";
import { requireAnalystRole } from "../../middleware/metrics/auth.middleware.js";
import crmCommunicationController from "../../controllers/metrics/crm-communication.controller.js";

const router = express.Router();

// Apply communication-specific middleware
router.use(requireAnalystRole);

/**
 * @swagger
 * /metrics/crm/communications:
 *   get:
 *     summary: Get CRM communication metrics and analytics
 *     description: Returns comprehensive metrics and analytics for CRM communications
 *     tags: [CRM Communications]
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
 *         description: Communication metrics retrieved successfully
 */
router.get('/', crmCommunicationController.getCrmCommunicationMetrics);

/**
 * @swagger
 * /metrics/crm/communications/list:
 *   get:
 *     summary: Get paginated list of CRM communications
 *     description: Returns a paginated list of CRM communications with filtering and sorting
 *     tags: [CRM Communications]
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
 *         description: Filter by status
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *         description: Filter by communication channel
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [inbound, outbound]
 *         description: Filter by communication direction
 *     responses:
 *       200:
 *         description: Communications retrieved successfully
 */
router.get('/list', crmCommunicationController.getCrmCommunicationList);

/**
 * @swagger
 * /metrics/crm/communications/search:
 *   get:
 *     summary: Search CRM communications
 *     description: Search CRM communications by text query with filtering
 *     tags: [CRM Communications]
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
router.get('/search', crmCommunicationController.searchCrmCommunications);

/**
 * @swagger
 * /metrics/crm/communications/{communicationId}:
 *   get:
 *     summary: Get detailed CRM communication by ID
 *     description: Returns detailed information for a specific CRM communication
 *     tags: [CRM Communications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Communication ID
 *     responses:
 *       200:
 *         description: Communication details retrieved successfully
 *       404:
 *         description: Communication not found
 */
router.get('/:communicationId', crmCommunicationController.getCrmCommunicationDetails);

/**
 * @swagger
 * /metrics/crm/communications:
 *   post:
 *     summary: Create a new CRM communication
 *     description: Creates a new CRM communication record
 *     tags: [CRM Communications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               communicationId:
 *                 type: string
 *               entityType:
 *                 type: string
 *               entityId:
 *                 type: string
 *               interactionType:
 *                 type: string
 *               channel:
 *                 type: string
 *               direction:
 *                 type: string
 *               content:
 *                 type: string
 *               agentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Communication created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', crmCommunicationController.createCrmCommunication);

/**
 * @swagger
 * /metrics/crm/communications/{communicationId}:
 *   put:
 *     summary: Update CRM communication
 *     description: Updates an existing CRM communication
 *     tags: [CRM Communications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Communication ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *               followUpRequired:
 *                 type: boolean
 *               followUpDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Communication updated successfully
 *       404:
 *         description: Communication not found
 */
router.put('/:communicationId', crmCommunicationController.updateCrmCommunication);

/**
 * @swagger
 * /metrics/crm/communications/{communicationId}:
 *   delete:
 *     summary: Delete CRM communication (soft delete)
 *     description: Soft deletes a CRM communication
 *     tags: [CRM Communications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Communication ID
 *     responses:
 *       200:
 *         description: Communication deleted successfully
 *       404:
 *         description: Communication not found
 */
router.delete('/:communicationId', crmCommunicationController.deleteCrmCommunication);

/**
 * @swagger
 * /metrics/crm/communications/{communicationId}/response-received:
 *   post:
 *     summary: Mark response as received
 *     description: Marks a communication as having received a response
 *     tags: [CRM Communications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Communication ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               responseDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Response marked as received
 *       404:
 *         description: Communication not found
 */
router.post('/:communicationId/response-received', crmCommunicationController.markResponseReceived);

/**
 * @swagger
 * /metrics/crm/communications/{communicationId}/follow-up:
 *   post:
 *     summary: Add follow-up to communication
 *     description: Adds a follow-up reminder to a communication
 *     tags: [CRM Communications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Communication ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - followUpDate
 *             properties:
 *               followUpDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Follow-up added successfully
 *       404:
 *         description: Communication not found
 */
router.post('/:communicationId/follow-up', crmCommunicationController.addFollowUp);

/**
 * @swagger
 * /metrics/crm/communications/{communicationId}/follow-up/complete:
 *   post:
 *     summary: Complete follow-up
 *     description: Marks a follow-up as completed
 *     tags: [CRM Communications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Communication ID
 *     responses:
 *       200:
 *         description: Follow-up completed successfully
 *       404:
 *         description: Communication not found
 */
router.post('/:communicationId/follow-up/complete', crmCommunicationController.completeFollowUp);

/**
 * @swagger
 * /metrics/crm/communications/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Get communications by entity
 *     description: Retrieves all communications for a specific entity
 *     tags: [CRM Communications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *         description: Entity type (contact, investor, etc.)
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Entity ID
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
 *         description: Communications retrieved successfully
 */
router.get('/entity/:entityType/:entityId', crmCommunicationController.getCommunicationsByEntity);

/**
 * @swagger
 * /metrics/crm/communications/overdue/responses:
 *   get:
 *     summary: Get overdue responses
 *     description: Retrieves all communications with overdue responses
 *     tags: [CRM Communications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue responses retrieved successfully
 */
router.get('/overdue/responses', crmCommunicationController.getOverdueResponses);

/**
 * @swagger
 * /metrics/crm/communications/overdue/follow-ups:
 *   get:
 *     summary: Get overdue follow-ups
 *     description: Retrieves all communications with overdue follow-ups
 *     tags: [CRM Communications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue follow-ups retrieved successfully
 */
router.get('/overdue/follow-ups', crmCommunicationController.getOverdueFollowUps);

/**
 * @swagger
 * /metrics/crm/communications/agent/{agentId}/workload:
 *   get:
 *     summary: Get agent workload metrics
 *     description: Returns workload metrics for a specific agent
 *     tags: [CRM Communications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
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
 *     responses:
 *       200:
 *         description: Agent workload metrics retrieved successfully
 */
router.get('/agent/:agentId/workload', crmCommunicationController.getAgentWorkload);

/**
 * @swagger
 * /metrics/crm/communications/bulk/update:
 *   post:
 *     summary: Bulk update communications
 *     description: Updates multiple communications in bulk
 *     tags: [CRM Communications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - communicationIds
 *               - updateData
 *             properties:
 *               communicationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               updateData:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                   assignedTo:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: Communications updated successfully
 */
router.post('/bulk/update', crmCommunicationController.bulkUpdateCommunications);

/**
 * @swagger
 * /metrics/crm/communications/bulk/delete:
 *   post:
 *     summary: Bulk delete communications
 *     description: Soft deletes multiple communications in bulk
 *     tags: [CRM Communications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - communicationIds
 *             properties:
 *               communicationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Communications deleted successfully
 */
router.post('/bulk/delete', crmCommunicationController.bulkDeleteCommunications);

export default router;