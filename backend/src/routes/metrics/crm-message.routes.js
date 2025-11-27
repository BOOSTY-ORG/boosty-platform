import express from "express";
import { requireAnalystRole } from "../../middleware/metrics/auth.middleware.js";
import crmMessageController from "../../controllers/metrics/crm-message.controller.js";

const router = express.Router();

// Apply message-specific middleware
router.use(requireAnalystRole);

/**
 * @swagger
 * /metrics/crm/threads:
 *   get:
 *     summary: Get paginated list of message threads
 *     description: Returns a paginated list of message threads with filtering and sorting
 *     tags: [CRM Messages]
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
 *           enum: [active, archived, closed]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by priority
 *       - in: query
 *         name: assignedAgent
 *         schema:
 *           type: string
 *         description: Filter by assigned agent
 *       - in: query
 *         name: threadType
 *         schema:
 *           type: string
 *           enum: [direct, group]
 *         description: Filter by thread type
 *       - in: query
 *         name: tags
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by tags
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [today, yesterday, last_7_days, last_30_days, this_month, last_month, this_year, last_year]
 *         description: Preset date range
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
 *         description: Message threads retrieved successfully
 */
router.get('/threads', crmMessageController.getMessageThreads);

/**
 * @swagger
 * /metrics/crm/threads:
 *   post:
 *     summary: Create a new message thread
 *     description: Creates a new message thread with participants
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participants
 *             properties:
 *               threadType:
 *                 type: string
 *                 enum: [direct, group]
 *                 default: direct
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     contactId:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [agent, contact, lead]
 *               subject:
 *                 type: string
 *               assignedAgent:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *               primaryChannel:
 *                 type: string
 *                 enum: [in_app, email, sms, whatsapp]
 *                 default: in_app
 *               relatedEntityType:
 *                 type: string
 *                 enum: [contact, lead, ticket, application, investor]
 *               relatedEntityId:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               autoAssignmentEnabled:
 *                 type: boolean
 *                 default: false
 *               responseDeadline:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Message thread created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/threads', crmMessageController.createMessageThread);

/**
 * @swagger
 * /metrics/crm/threads/{threadId}:
 *   get:
 *     summary: Get detailed message thread by ID
 *     description: Returns detailed information for a specific message thread
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Thread ID
 *     responses:
 *       200:
 *         description: Thread details retrieved successfully
 *       404:
 *         description: Thread not found
 */
router.get('/threads/:threadId', crmMessageController.getMessageThreadDetails);

/**
 * @swagger
 * /metrics/crm/threads/{threadId}:
 *   put:
 *     summary: Update message thread
 *     description: Updates an existing message thread
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Thread ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, archived, closed]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               assignedAgent:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Thread updated successfully
 *       404:
 *         description: Thread not found
 */
router.put('/threads/:threadId', crmMessageController.updateMessageThread);

/**
 * @swagger
 * /metrics/crm/threads/{threadId}:
 *   delete:
 *     summary: Delete message thread (soft delete)
 *     description: Soft deletes a message thread
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Thread ID
 *     responses:
 *       200:
 *         description: Thread deleted successfully
 *       404:
 *         description: Thread not found
 */
router.delete('/threads/:threadId', crmMessageController.deleteMessageThread);

/**
 * @swagger
 * /metrics/crm/threads/{threadId}/messages:
 *   get:
 *     summary: Get messages in a thread
 *     description: Returns paginated messages from a specific thread
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Thread ID
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
 *           default: 50
 *         description: Number of messages per page
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *         description: Get messages before this message ID (cursor pagination)
 *       - in: query
 *         name: after
 *         schema:
 *           type: string
 *         description: Get messages after this message ID (cursor pagination)
 *       - in: query
 *         name: messageType
 *         schema:
 *           type: string
 *           enum: [text, image, file, audio, video, location, contact_share, system]
 *         description: Filter by message type
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       404:
 *         description: Thread not found
 */
router.get('/threads/:threadId/messages', crmMessageController.getThreadMessages);

/**
 * @swagger
 * /metrics/crm/threads/{threadId}/messages:
 *   post:
 *     summary: Send a message in a thread
 *     description: Sends a new message in an existing thread
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Thread ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file, audio, video, location, contact_share, system]
 *                 default: text
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                     size:
 *                       type: number
 *                     url:
 *                       type: string
 *                     contentType:
 *                       type: string
 *               replyTo:
 *                 type: string
 *               deliveryChannels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [in_app, email, sms, whatsapp]
 *                 default: [in_app]
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Thread not found
 */
router.post('/threads/:threadId/messages', crmMessageController.sendMessage);

/**
 * @swagger
 * /metrics/crm/messages/{messageId}:
 *   put:
 *     summary: Update a message
 *     description: Updates an existing message (content and attachments)
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Message updated successfully
 *       400:
 *         description: Cannot edit message (system message or edit time expired)
 *       404:
 *         description: Message not found
 */
router.put('/messages/:messageId', crmMessageController.updateMessage);

/**
 * @swagger
 * /metrics/crm/messages/{messageId}:
 *   delete:
 *     summary: Delete a message (soft delete)
 *     description: Soft deletes a message
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       404:
 *         description: Message not found
 */
router.delete('/messages/:messageId', crmMessageController.deleteMessage);

/**
 * @swagger
 * /metrics/crm/messages/{messageId}/read:
 *   post:
 *     summary: Mark message as read
 *     description: Marks a message as read and updates thread unread count
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message marked as read successfully
 *       404:
 *         description: Message not found
 */
router.post('/messages/:messageId/read', crmMessageController.markMessageAsRead);

/**
 * @swagger
 * /metrics/crm/messages/{messageId}/reactions:
 *   post:
 *     summary: Add reaction to message
 *     description: Adds or updates a reaction to a message
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reaction
 *             properties:
 *               reaction:
 *                 type: string
 *                 description: Reaction emoji or text
 *     responses:
 *       200:
 *         description: Reaction added successfully
 *       400:
 *         description: Reaction is required
 *       404:
 *         description: Message not found
 */
router.post('/messages/:messageId/reactions', crmMessageController.addMessageReaction);

/**
 * @swagger
 * /metrics/crm/messages/{messageId}/reactions:
 *   delete:
 *     summary: Remove reaction from message
 *     description: Removes a reaction from a message
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Reaction removed successfully
 *       404:
 *         description: Message not found
 */
router.delete('/messages/:messageId/reactions', crmMessageController.removeMessageReaction);

/**
 * @swagger
 * /metrics/crm/threads/{threadId}/participants:
 *   post:
 *     summary: Add participant to thread
 *     description: Adds one or more participants to an existing thread
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Thread ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participants
 *             properties:
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     contactId:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [agent, contact, lead]
 *     responses:
 *       200:
 *         description: Participants added successfully
 *       400:
 *         description: At least one participant is required
 *       404:
 *         description: Thread not found
 */
router.post('/threads/:threadId/participants', crmMessageController.addThreadParticipant);

/**
 * @swagger
 * /metrics/crm/threads/{threadId}/participants/{participantId}:
 *   delete:
 *     summary: Remove participant from thread
 *     description: Removes a participant from a thread
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Thread ID
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Participant ID (user or contact)
 *     responses:
 *       200:
 *         description: Participant removed successfully
 *       404:
 *         description: Thread or participant not found
 */
router.delete('/threads/:threadId/participants/:participantId', crmMessageController.removeThreadParticipant);

/**
 * @swagger
 * /metrics/crm/threads/{threadId}/assign:
 *   post:
 *     summary: Assign thread to agent
 *     description: Assigns a thread to an agent and creates assignment metrics
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Thread ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentId
 *             properties:
 *               agentId:
 *                 type: string
 *               assignmentType:
 *                 type: string
 *                 enum: [manual, automatic, round_robin, workload_based, skill_based]
 *                 default: manual
 *               assignmentReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thread assigned successfully
 *       400:
 *         description: Agent ID is required
 *       404:
 *         description: Thread not found
 */
router.post('/threads/:threadId/assign', crmMessageController.assignThread);

/**
 * @swagger
 * /metrics/crm/threads/{threadId}/close:
 *   post:
 *     summary: Close thread
 *     description: Closes a thread and completes any active assignments
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Thread ID
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
 *               satisfactionScore:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Thread closed successfully
 *       400:
 *         description: Reason is required
 *       404:
 *         description: Thread not found
 */
router.post('/threads/:threadId/close', crmMessageController.closeThread);

/**
 * @swagger
 * /metrics/crm/threads/{threadId}/archive:
 *   post:
 *     summary: Archive thread
 *     description: Archives a thread (changes status to archived)
 *     tags: [CRM Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Thread ID
 *     responses:
 *       200:
 *         description: Thread archived successfully
 *       404:
 *         description: Thread not found
 */
router.post('/threads/:threadId/archive', crmMessageController.archiveThread);

/**
 * @swagger
 * /metrics/crm/messages/search:
 *   get:
 *     summary: Search messages
 *     description: Searches messages by text content with filtering options
 *     tags: [CRM Messages]
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
 *         description: Number of results per page
 *       - in: query
 *         name: threadId
 *         schema:
 *           type: string
 *         description: Filter by thread ID
 *       - in: query
 *         name: senderId
 *         schema:
 *           type: string
 *         description: Filter by sender ID
 *       - in: query
 *         name: messageType
 *         schema:
 *           type: string
 *           enum: [text, image, file, audio, video, location, contact_share, system]
 *         description: Filter by message type
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         description: Search query is required
 */
router.get('/messages/search', crmMessageController.searchMessages);

export default router;