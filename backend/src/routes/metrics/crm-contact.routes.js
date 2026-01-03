import express from "express";
import { requireAnalystRole } from "../../middleware/metrics/auth.middleware.js";
import crmContactController from "../../controllers/metrics/crm-contact.controller.js";

const router = express.Router();

// Apply contact-specific middleware
router.use(requireAnalystRole);

/**
 * @swagger
 * /metrics/crm/contacts:
 *   get:
 *     summary: Get CRM contact metrics and analytics
 *     description: Returns comprehensive metrics and analytics for CRM contacts
 *     tags: [CRM Contacts]
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
 *         description: Contact metrics retrieved successfully
 */
router.get('/', crmContactController.getCrmContactMetrics);

/**
 * @swagger
 * /metrics/crm/contacts/list:
 *   get:
 *     summary: Get paginated list of CRM contacts
 *     description: Returns a paginated list of CRM contacts with filtering and sorting
 *     tags: [CRM Contacts]
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
 *         name: contactType
 *         schema:
 *           type: string
 *         description: Filter by contact type
 *       - in: query
 *         name: contactSource
 *         schema:
 *           type: string
 *         description: Filter by contact source
 *     responses:
 *       200:
 *         description: Contacts retrieved successfully
 */
router.get('/list', crmContactController.getCrmContactList);

/**
 * @swagger
 * /metrics/crm/contacts/search:
 *   get:
 *     summary: Search CRM contacts
 *     description: Search CRM contacts by text query with filtering
 *     tags: [CRM Contacts]
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
router.get('/search', crmContactController.searchCrmContacts);

/**
 * @swagger
 * /metrics/crm/contacts/{contactId}:
 *   get:
 *     summary: Get detailed CRM contact by ID
 *     description: Returns detailed information for a specific CRM contact
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact details retrieved successfully
 *       404:
 *         description: Contact not found
 */
router.get('/:contactId', crmContactController.getCrmContactDetails);

/**
 * @swagger
 * /metrics/crm/contacts:
 *   post:
 *     summary: Create a new CRM contact
 *     description: Creates a new CRM contact record
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               contactType:
 *                 type: string
 *               contactSource:
 *                 type: string
 *               company:
 *                 type: string
 *               jobTitle:
 *                 type: string
 *               address:
 *                 type: object
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Contact created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', crmContactController.createCrmContact);

/**
 * @swagger
 * /metrics/crm/contacts/{contactId}:
 *   put:
 *     summary: Update CRM contact
 *     description: Updates an existing CRM contact
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               company:
 *                 type: string
 *               jobTitle:
 *                 type: string
 *               status:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Contact updated successfully
 *       404:
 *         description: Contact not found
 */
router.put('/:contactId', crmContactController.updateCrmContact);

/**
 * @swagger
 * /metrics/crm/contacts/{contactId}:
 *   delete:
 *     summary: Delete CRM contact (soft delete)
 *     description: Soft deletes a CRM contact
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact deleted successfully
 *       404:
 *         description: Contact not found
 */
router.delete('/:contactId', crmContactController.deleteCrmContact);

/**
 * @swagger
 * /metrics/crm/contacts/{contactId}/engagement:
 *   put:
 *     summary: Update contact engagement
 *     description: Updates engagement metrics for a contact
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               opened:
 *                 type: boolean
 *               clicked:
 *                 type: boolean
 *               responded:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Engagement updated successfully
 *       404:
 *         description: Contact not found
 */
router.put('/:contactId/engagement', crmContactController.updateContactEngagement);

/**
 * @swagger
 * /metrics/crm/contacts/{contactId}/consent/marketing:
 *   post:
 *     summary: Give marketing consent
 *     description: Records marketing consent for a contact
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method:
 *                 type: string
 *     responses:
 *       200:
 *         description: Consent recorded successfully
 *       404:
 *         description: Contact not found
 */
router.post('/:contactId/consent/marketing', crmContactController.giveMarketingConsent);

/**
 * @swagger
 * /metrics/crm/contacts/{contactId}/consent/withdraw:
 *   post:
 *     summary: Withdraw consent
 *     description: Withdraws all consent for a contact
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Consent withdrawn successfully
 *       404:
 *         description: Contact not found
 */
router.post('/:contactId/consent/withdraw', crmContactController.withdrawConsent);

/**
 * @swagger
 * /metrics/crm/contacts/{contactId}/assign:
 *   post:
 *     summary: Assign contact to user
 *     description: Assigns a contact to a specific user
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact assigned successfully
 *       404:
 *         description: Contact not found
 */
router.post('/:contactId/assign', crmContactController.assignContact);

/**
 * @swagger
 * /metrics/crm/contacts/{contactId}/tags:
 *   post:
 *     summary: Add tag to contact
 *     description: Adds a tag to a contact
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tag
 *             properties:
 *               tag:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tag added successfully
 *       404:
 *         description: Contact not found
 */
router.post('/:contactId/tags', crmContactController.addContactTag);

/**
 * @swagger
 * /metrics/crm/contacts/{contactId}/tags:
 *   delete:
 *     summary: Remove tag from contact
 *     description: Removes a tag from a contact
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tag
 *             properties:
 *               tag:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tag removed successfully
 *       404:
 *         description: Contact not found
 */
router.delete('/:contactId/tags', crmContactController.removeContactTag);

/**
 * @swagger
 * /metrics/crm/contacts/email/{email}:
 *   get:
 *     summary: Find contact by email
 *     description: Finds a contact by their email address
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Email address
 *     responses:
 *       200:
 *         description: Contact found successfully
 *       404:
 *         description: Contact not found
 */
router.get('/email/:email', crmContactController.findContactByEmail);

/**
 * @swagger
 * /metrics/crm/contacts/high-value-leads:
 *   get:
 *     summary: Get high value leads
 *     description: Retrieves contacts with high lead scores
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of leads to return
 *     responses:
 *       200:
 *         description: High value leads retrieved successfully
 */
router.get('/high-value-leads', crmContactController.getHighValueLeads);

/**
 * @swagger
 * /metrics/crm/contacts/unassigned:
 *   get:
 *     summary: Get unassigned contacts
 *     description: Retrieves contacts that are not assigned to any user
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: contactType
 *         schema:
 *           type: string
 *         description: Filter by contact type
 *     responses:
 *       200:
 *         description: Unassigned contacts retrieved successfully
 */
router.get('/unassigned', crmContactController.getUnassignedContacts);

/**
 * @swagger
 * /metrics/crm/contacts/follow-up-needed:
 *   get:
 *     summary: Get contacts needing follow-up
 *     description: Retrieves contacts that need follow-up based on last contact date
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days since last contact
 *     responses:
 *       200:
 *         description: Contacts needing follow-up retrieved successfully
 */
router.get('/follow-up-needed', crmContactController.getContactsNeedingFollowUp);

/**
 * @swagger
 * /metrics/crm/contacts/stats:
 *   get:
 *     summary: Get contact statistics
 *     description: Returns overall contact statistics
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contact statistics retrieved successfully
 */
router.get('/stats', crmContactController.getContactStats);

/**
 * @swagger
 * /metrics/crm/contacts/import:
 *   post:
 *     summary: Import contacts
 *     description: Imports multiple contacts in bulk
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contacts
 *             properties:
 *               contacts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *     responses:
 *       200:
 *         description: Contacts imported successfully
 */
router.post('/import', crmContactController.importContacts);

/**
 * @swagger
 * /metrics/crm/contacts/export:
 *   get:
 *     summary: Export contacts
 *     description: Exports contacts in specified format
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Export format
 *     responses:
 *       200:
 *         description: Contacts exported successfully
 */
router.get('/export', crmContactController.exportContacts);

/**
 * @swagger
 * /metrics/crm/contacts/duplicates:
 *   get:
 *     summary: Find duplicate contacts
 *     description: Finds potential duplicate contacts based on email and name
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Duplicate contacts found successfully
 */
router.get('/duplicates', crmContactController.findDuplicateContacts);

/**
 * @swagger
 * /metrics/crm/contacts/merge:
 *   post:
 *     summary: Merge duplicate contacts
 *     description: Merges duplicate contacts into a primary contact
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - primaryContactId
 *               - duplicateContactIds
 *             properties:
 *               primaryContactId:
 *                 type: string
 *               duplicateContactIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Contacts merged successfully
 */
router.post('/merge', crmContactController.mergeDuplicateContacts);

/**
 * @swagger
 * /metrics/crm/contacts/bulk/update:
 *   post:
 *     summary: Bulk update contacts
 *     description: Updates multiple contacts in bulk
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactIds
 *               - updateData
 *             properties:
 *               contactIds:
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
 *         description: Contacts updated successfully
 */
router.post('/bulk/update', crmContactController.bulkUpdateContacts);

/**
 * @swagger
 * /metrics/crm/contacts/bulk/assign:
 *   post:
 *     summary: Bulk assign contacts
 *     description: Assigns multiple contacts to a user in bulk
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactIds
 *               - userId
 *             properties:
 *               contactIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contacts assigned successfully
 */
router.post('/bulk/assign', crmContactController.bulkAssignContacts);

/**
 * @swagger
 * /metrics/crm/contacts/bulk/delete:
 *   post:
 *     summary: Bulk delete contacts
 *     description: Soft deletes multiple contacts in bulk
 *     tags: [CRM Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactIds
 *             properties:
 *               contactIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Contacts deleted successfully
 */
router.post('/bulk/delete', crmContactController.bulkDeleteContacts);

export default router;