import express from "express";
import { requireAnalystRole } from "../../middleware/metrics/auth.middleware.js";
import crmAssignmentMetricsController from "../../controllers/metrics/crm-assignment-metrics.controller.js";

const router = express.Router();

// Apply assignment metrics-specific middleware
router.use(requireAnalystRole);

/**
 * @swagger
 * /metrics/crm/assignments:
 *   get:
 *     summary: Get comprehensive assignment metrics and analytics
 *     description: Returns detailed metrics and analytics for CRM assignments
 *     tags: [CRM Assignment Metrics]
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
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: string
 *         description: Filter by agent ID
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [contact, lead, thread, ticket]
 *         description: Filter by entity type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, transferred, completed, cancelled]
 *         description: Filter by assignment status
 *       - in: query
 *         name: assignmentType
 *         schema:
 *           type: string
 *           enum: [manual, automatic, round_robin, workload_based, skill_based]
 *         description: Filter by assignment type
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by priority
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [agent, entityType, status, priority, assignmentType]
 *         description: Group results by field
 *     responses:
 *       200:
 *         description: Assignment metrics retrieved successfully
 */
router.get('/', crmAssignmentMetricsController.getAssignmentMetrics);

/**
 * @swagger
 * /metrics/crm/assignments/list:
 *   get:
 *     summary: Get paginated list of assignments
 *     description: Returns a paginated list of assignments with filtering and sorting
 *     tags: [CRM Assignment Metrics]
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
 *         name: agentId
 *         schema:
 *           type: string
 *         description: Filter by agent ID
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [contact, lead, thread, ticket]
 *         description: Filter by entity type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, transferred, completed, cancelled]
 *         description: Filter by assignment status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by priority
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [today, yesterday, last_7_days, last_30_days, this_month, last_month, this_year, last_year]
 *         description: Preset date range
 *     responses:
 *       200:
 *         description: Assignments retrieved successfully
 */
router.get('/list', crmAssignmentMetricsController.getAssignmentList);

/**
 * @swagger
 * /metrics/crm/assignments:
 *   post:
 *     summary: Create a new assignment
 *     description: Creates a new assignment for an entity to an agent
 *     tags: [CRM Assignment Metrics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentId
 *               - entityType
 *               - entityId
 *             properties:
 *               agentId:
 *                 type: string
 *               entityType:
 *                 type: string
 *                 enum: [contact, lead, thread, ticket]
 *               entityId:
 *                 type: string
 *               assignmentType:
 *                 type: string
 *                 enum: [manual, automatic, round_robin, workload_based, skill_based]
 *                 default: manual
 *               assignmentReason:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *               requiredSkills:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               customFields:
 *                 type: object
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         description: Invalid input data or assignment already exists
 */
router.post('/', crmAssignmentMetricsController.createAssignment);

/**
 * @swagger
 * /metrics/crm/assignments/{assignmentId}:
 *   get:
 *     summary: Get detailed assignment by ID
 *     description: Returns detailed information for a specific assignment
 *     tags: [CRM Assignment Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: Assignment details retrieved successfully
 *       404:
 *         description: Assignment not found
 */
router.get('/:assignmentId', crmAssignmentMetricsController.getAssignmentDetails);

/**
 * @swagger
 * /metrics/crm/assignments/{assignmentId}:
 *   put:
 *     summary: Update assignment
 *     description: Updates an existing assignment
 *     tags: [CRM Assignment Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               workloadScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               capacityUtilization:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               firstResponseTime:
 *                 type: number
 *               averageResponseTime:
 *                 type: number
 *               resolutionTime:
 *                 type: number
 *               satisfactionScore:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               totalMessages:
 *                 type: number
 *               totalInteractions:
 *                 type: number
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               customFields:
 *                 type: object
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *       404:
 *         description: Assignment not found
 */
router.put('/:assignmentId', crmAssignmentMetricsController.updateAssignment);

/**
 * @swagger
 * /metrics/crm/assignments/{assignmentId}:
 *   delete:
 *     summary: Delete assignment (soft delete)
 *     description: Soft deletes an assignment
 *     tags: [CRM Assignment Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: Assignment deleted successfully
 *       404:
 *         description: Assignment not found
 */
router.delete('/:assignmentId', crmAssignmentMetricsController.deleteAssignment);

/**
 * @swagger
 * /metrics/crm/assignments/{assignmentId}/transfer:
 *   post:
 *     summary: Transfer assignment to another agent
 *     description: Transfers an assignment from one agent to another
 *     tags: [CRM Assignment Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toAgentId
 *             properties:
 *               toAgentId:
 *                 type: string
 *               reason:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *     responses:
 *       200:
 *         description: Assignment transferred successfully
 *       400:
 *         description: Target agent ID is required
 *       404:
 *         description: Assignment not found
 */
router.post('/:assignmentId/transfer', crmAssignmentMetricsController.transferAssignment);

/**
 * @swagger
 * /metrics/crm/assignments/{assignmentId}/complete:
 *   post:
 *     summary: Complete assignment
 *     description: Marks an assignment as completed
 *     tags: [CRM Assignment Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - completionReason
 *             properties:
 *               completionReason:
 *                 type: string
 *                 enum: [resolved, closed, timeout, escalated]
 *               satisfactionScore:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Assignment completed successfully
 *       400:
 *         description: Completion reason is required
 *       404:
 *         description: Assignment not found
 */
router.post('/:assignmentId/complete', crmAssignmentMetricsController.completeAssignment);

/**
 * @swagger
 * /metrics/crm/assignments/{assignmentId}/escalate:
 *   post:
 *     summary: Escalate assignment
 *     description: Escalates an assignment to a higher level or different agent
 *     tags: [CRM Assignment Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               toAgentId:
 *                 type: string
 *               level:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Assignment escalated successfully
 *       404:
 *         description: Assignment not found
 */
router.post('/:assignmentId/escalate', crmAssignmentMetricsController.escalateAssignment);

/**
 * @swagger
 * /metrics/crm/assignments/{assignmentId}/metrics:
 *   put:
 *     summary: Update assignment metrics
 *     description: Updates performance and workload metrics for an assignment
 *     tags: [CRM Assignment Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstResponseTime:
 *                 type: number
 *               averageResponseTime:
 *                 type: number
 *               resolutionTime:
 *                 type: number
 *               totalMessages:
 *                 type: number
 *               totalInteractions:
 *                 type: number
 *               workloadScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               capacityUtilization:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Assignment metrics updated successfully
 *       404:
 *         description: Assignment not found
 */
router.put('/:assignmentId/metrics', crmAssignmentMetricsController.updateAssignmentMetrics);

/**
 * @swagger
 * /metrics/crm/assignments/agent/{agentId}:
 *   get:
 *     summary: Get assignments by agent
 *     description: Retrieves all assignments for a specific agent
 *     tags: [CRM Assignment Metrics]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, transferred, completed, cancelled]
 *         description: Filter by assignment status
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [contact, lead, thread, ticket]
 *         description: Filter by entity type
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: assignedAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Agent assignments retrieved successfully
 */
router.get('/agent/:agentId', crmAssignmentMetricsController.getAgentAssignments);

/**
 * @swagger
 * /metrics/crm/assignments/agent/{agentId}/workload:
 *   get:
 *     summary: Get agent workload metrics
 *     description: Returns detailed workload metrics for a specific agent
 *     tags: [CRM Assignment Metrics]
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
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [today, yesterday, last_7_days, last_30_days, this_month, last_month, this_year, last_year]
 *         description: Preset date range
 *     responses:
 *       200:
 *         description: Agent workload metrics retrieved successfully
 */
router.get('/agent/:agentId/workload', crmAssignmentMetricsController.getAgentWorkload);

/**
 * @swagger
 * /metrics/crm/assignments/overdue:
 *   get:
 *     summary: Get overdue assignments
 *     description: Retrieves all assignments that have missed their SLA deadline
 *     tags: [CRM Assignment Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Overdue assignments retrieved successfully
 */
router.get('/overdue', crmAssignmentMetricsController.getOverdueAssignments);

export default router;