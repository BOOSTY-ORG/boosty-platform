import api from './index.js';

/**
 * CRM API module for managing contacts, communications, templates, and automation
 * @namespace crmAPI
 */

export const crmAPI = {
  // === CRM OVERVIEW ===
  
  /**
   * Get CRM system overview and metrics
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} CRM overview data
   */
  getCRMOverview: async (params = {}) => {
    return api.get('/metrics/crm', { params });
  },

  /**
   * Check CRM system health
   * @returns {Promise<Object>} Health status
   */
  getCRMHealth: async () => {
    return api.get('/metrics/crm/health');
  },

  // === COMMUNICATIONS ===

  /**
   * Get CRM communication metrics and analytics
   * @param {Object} params - Query parameters for filtering
   * @param {string} params.startDate - Start date for filtering
   * @param {string} params.endDate - End date for filtering
   * @param {string} params.dateRange - Preset date range (today, yesterday, last_7_days, etc.)
   * @returns {Promise<Object>} Communication metrics
   */
  getCommunicationMetrics: async (params = {}) => {
    return api.get('/metrics/crm/communications', { params });
  },

  /**
   * Get paginated list of CRM communications
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20)
   * @param {string} params.sortBy - Field to sort by
   * @param {string} params.sortOrder - Sort order (asc/desc)
   * @param {string} params.status - Filter by status
   * @param {string} params.channel - Filter by channel
   * @param {string} params.direction - Filter by direction (inbound/outbound)
   * @returns {Promise<Object>} Paginated communications list
   */
  getCommunicationsList: async (params = {}) => {
    return api.get('/metrics/crm/communications/list', { params });
  },

  /**
   * Search CRM communications by text query
   * @param {string} query - Search query
   * @param {Object} params - Additional query parameters
   * @returns {Promise<Object>} Search results
   */
  searchCommunications: async (query, params = {}) => {
    return api.get('/metrics/crm/communications/search', {
      params: { q: query, ...params },
    });
  },

  /**
   * Get detailed CRM communication by ID
   * @param {string} communicationId - Communication ID
   * @returns {Promise<Object>} Communication details
   */
  getCommunicationById: async (communicationId) => {
    return api.get(`/metrics/crm/communications/${communicationId}`);
  },

  /**
   * Create a new CRM communication
   * @param {Object} communicationData - Communication data
   * @param {string} communicationData.communicationId - Unique communication ID
   * @param {string} communicationData.entityType - Entity type (contact, investor, etc.)
   * @param {string} communicationData.entityId - Entity ID
   * @param {string} communicationData.interactionType - Type of interaction
   * @param {string} communicationData.channel - Communication channel
   * @param {string} communicationData.direction - Direction (inbound/outbound)
   * @param {string} communicationData.content - Communication content
   * @param {string} communicationData.agentId - Agent ID
   * @returns {Promise<Object>} Created communication
   */
  createCommunication: async (communicationData) => {
    return api.post('/metrics/crm/communications', communicationData);
  },

  /**
   * Update CRM communication
   * @param {string} communicationId - Communication ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated communication
   */
  updateCommunication: async (communicationId, updateData) => {
    return api.put(`/metrics/crm/communications/${communicationId}`, updateData);
  },

  /**
   * Delete CRM communication (soft delete)
   * @param {string} communicationId - Communication ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  deleteCommunication: async (communicationId) => {
    return api.delete(`/metrics/crm/communications/${communicationId}`);
  },

  /**
   * Mark response as received for a communication
   * @param {string} communicationId - Communication ID
   * @param {Object} responseData - Response data
   * @returns {Promise<Object>} Updated communication
   */
  markResponseReceived: async (communicationId, responseData) => {
    return api.post(`/metrics/crm/communications/${communicationId}/response-received`, responseData);
  },

  /**
   * Add follow-up to communication
   * @param {string} communicationId - Communication ID
   * @param {Object} followUpData - Follow-up data
   * @param {string} followUpData.followUpDate - Follow-up date
   * @param {string} followUpData.notes - Follow-up notes
   * @returns {Promise<Object>} Updated communication
   */
  addFollowUp: async (communicationId, followUpData) => {
    return api.post(`/metrics/crm/communications/${communicationId}/follow-up`, followUpData);
  },

  /**
   * Complete follow-up for communication
   * @param {string} communicationId - Communication ID
   * @returns {Promise<Object>} Updated communication
   */
  completeFollowUp: async (communicationId) => {
    return api.post(`/metrics/crm/communications/${communicationId}/follow-up/complete`);
  },

  /**
   * Get communications by entity
   * @param {string} entityType - Entity type (contact, investor, etc.)
   * @param {string} entityId - Entity ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Entity communications
   */
  getCommunicationsByEntity: async (entityType, entityId, params = {}) => {
    return api.get(`/metrics/crm/communications/entity/${entityType}/${entityId}`, { params });
  },

  /**
   * Get overdue responses
   * @returns {Promise<Object>} Overdue responses
   */
  getOverdueResponses: async () => {
    return api.get('/metrics/crm/communications/overdue/responses');
  },

  /**
   * Get overdue follow-ups
   * @returns {Promise<Object>} Overdue follow-ups
   */
  getOverdueFollowUps: async () => {
    return api.get('/metrics/crm/communications/overdue/follow-ups');
  },

  /**
   * Get agent workload metrics
   * @param {string} agentId - Agent ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Agent workload metrics
   */
  getAgentWorkload: async (agentId, params = {}) => {
    return api.get(`/metrics/crm/communications/agent/${agentId}/workload`, { params });
  },

  /**
   * Bulk update communications
   * @param {string[]} communicationIds - Communication IDs
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Bulk update result
   */
  bulkUpdateCommunications: async (communicationIds, updateData) => {
    return api.post('/metrics/crm/communications/bulk/update', {
      communicationIds,
      updateData
    });
  },

  /**
   * Bulk delete communications
   * @param {string[]} communicationIds - Communication IDs
   * @returns {Promise<Object>} Bulk delete result
   */
  bulkDeleteCommunications: async (communicationIds) => {
    return api.post('/metrics/crm/communications/bulk/delete', { communicationIds });
  },

  // === CONTACTS ===

  /**
   * Get CRM contact metrics and analytics
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise<Object>} Contact metrics
   */
  getContactMetrics: async (params = {}) => {
    return api.get('/metrics/crm/contacts', { params });
  },

  /**
   * Get paginated list of CRM contacts
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated contacts list
   */
  getContactsList: async (params = {}) => {
    return api.get('/metrics/crm/contacts/list', { params });
  },

  /**
   * Search CRM contacts by text query
   * @param {string} query - Search query
   * @param {Object} params - Additional query parameters
   * @returns {Promise<Object>} Search results
   */
  searchContacts: async (query, params = {}) => {
    return api.get('/metrics/crm/contacts/search', {
      params: { q: query, ...params },
    });
  },

  /**
   * Get detailed CRM contact by ID
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>} Contact details
   */
  getContactById: async (contactId) => {
    return api.get(`/metrics/crm/contacts/${contactId}`);
  },

  /**
   * Create a new CRM contact
   * @param {Object} contactData - Contact data
   * @param {string} contactData.firstName - First name
   * @param {string} contactData.lastName - Last name
   * @param {string} contactData.email - Email address
   * @returns {Promise<Object>} Created contact
   */
  createContact: async (contactData) => {
    return api.post('/metrics/crm/contacts', contactData);
  },

  /**
   * Update CRM contact
   * @param {string} contactId - Contact ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated contact
   */
  updateContact: async (contactId, updateData) => {
    return api.put(`/metrics/crm/contacts/${contactId}`, updateData);
  },

  /**
   * Delete CRM contact (soft delete)
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  deleteContact: async (contactId) => {
    return api.delete(`/metrics/crm/contacts/${contactId}`);
  },

  /**
   * Update contact engagement metrics
   * @param {string} contactId - Contact ID
   * @param {Object} engagementData - Engagement data
   * @returns {Promise<Object>} Updated contact
   */
  updateContactEngagement: async (contactId, engagementData) => {
    return api.put(`/metrics/crm/contacts/${contactId}/engagement`, engagementData);
  },

  /**
   * Give marketing consent to contact
   * @param {string} contactId - Contact ID
   * @param {Object} consentData - Consent data
   * @returns {Promise<Object>} Updated contact
   */
  giveMarketingConsent: async (contactId, consentData) => {
    return api.post(`/metrics/crm/contacts/${contactId}/consent/marketing`, consentData);
  },

  /**
   * Withdraw consent from contact
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>} Updated contact
   */
  withdrawConsent: async (contactId) => {
    return api.post(`/metrics/crm/contacts/${contactId}/consent/withdraw`);
  },

  /**
   * Assign contact to user
   * @param {string} contactId - Contact ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated contact
   */
  assignContact: async (contactId, userId) => {
    return api.post(`/metrics/crm/contacts/${contactId}/assign`, { userId });
  },

  /**
   * Add tag to contact
   * @param {string} contactId - Contact ID
   * @param {string} tag - Tag to add
   * @returns {Promise<Object>} Updated contact
   */
  addContactTag: async (contactId, tag) => {
    return api.post(`/metrics/crm/contacts/${contactId}/tags`, { tag });
  },

  /**
   * Remove tag from contact
   * @param {string} contactId - Contact ID
   * @param {string} tag - Tag to remove
   * @returns {Promise<Object>} Updated contact
   */
  removeContactTag: async (contactId, tag) => {
    return api.delete(`/metrics/crm/contacts/${contactId}/tags`, { data: { tag } });
  },

  /**
   * Find contact by email
   * @param {string} email - Email address
   * @returns {Promise<Object>} Contact data
   */
  findContactByEmail: async (email) => {
    return api.get(`/metrics/crm/contacts/email/${email}`);
  },

  /**
   * Get high value leads
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} High value leads
   */
  getHighValueLeads: async (params = {}) => {
    return api.get('/metrics/crm/contacts/high-value-leads', { params });
  },

  /**
   * Get unassigned contacts
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Unassigned contacts
   */
  getUnassignedContacts: async (params = {}) => {
    return api.get('/metrics/crm/contacts/unassigned', { params });
  },

  /**
   * Get contacts needing follow-up
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Contacts needing follow-up
   */
  getContactsNeedingFollowUp: async (params = {}) => {
    return api.get('/metrics/crm/contacts/follow-up-needed', { params });
  },

  /**
   * Get contact statistics
   * @returns {Promise<Object>} Contact statistics
   */
  getContactStats: async () => {
    return api.get('/metrics/crm/contacts/stats');
  },

  /**
   * Import contacts in bulk
   * @param {Object[]} contacts - Array of contact objects
   * @returns {Promise<Object>} Import result
   */
  importContacts: async (contacts) => {
    return api.post('/metrics/crm/contacts/import', { contacts });
  },

  /**
   * Export contacts
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Export result
   */
  exportContacts: async (params = {}) => {
    return api.get('/metrics/crm/contacts/export', { params });
  },

  /**
   * Find duplicate contacts
   * @returns {Promise<Object>} Duplicate contacts
   */
  findDuplicateContacts: async () => {
    return api.get('/metrics/crm/contacts/duplicates');
  },

  /**
   * Merge duplicate contacts
   * @param {string} primaryContactId - Primary contact ID
   * @param {string[]} duplicateContactIds - Duplicate contact IDs
   * @returns {Promise<Object>} Merge result
   */
  mergeDuplicateContacts: async (primaryContactId, duplicateContactIds) => {
    return api.post('/metrics/crm/contacts/merge', {
      primaryContactId,
      duplicateContactIds
    });
  },

  /**
   * Bulk update contacts
   * @param {string[]} contactIds - Contact IDs
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Bulk update result
   */
  bulkUpdateContacts: async (contactIds, updateData) => {
    return api.post('/metrics/crm/contacts/bulk/update', {
      contactIds,
      updateData
    });
  },

  /**
   * Bulk assign contacts
   * @param {string[]} contactIds - Contact IDs
   * @param {string} userId - User ID to assign to
   * @returns {Promise<Object>} Bulk assign result
   */
  bulkAssignContacts: async (contactIds, userId) => {
    return api.post('/metrics/crm/contacts/bulk/assign', {
      contactIds,
      userId
    });
  },

  /**
   * Bulk delete contacts
   * @param {string[]} contactIds - Contact IDs
   * @returns {Promise<Object>} Bulk delete result
   */
  bulkDeleteContacts: async (contactIds) => {
    return api.post('/metrics/crm/contacts/bulk/delete', { contactIds });
  },

  // === TEMPLATES ===

  /**
   * Get CRM template metrics and analytics
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise<Object>} Template metrics
   */
  getTemplateMetrics: async (params = {}) => {
    return api.get('/metrics/crm/templates', { params });
  },

  /**
   * Get paginated list of CRM templates
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated templates list
   */
  getTemplatesList: async (params = {}) => {
    return api.get('/metrics/crm/templates/list', { params });
  },

  /**
   * Search CRM templates by text query
   * @param {string} query - Search query
   * @param {Object} params - Additional query parameters
   * @returns {Promise<Object>} Search results
   */
  searchTemplates: async (query, params = {}) => {
    return api.get('/metrics/crm/templates/search', {
      params: { q: query, ...params },
    });
  },

  /**
   * Get detailed CRM template by ID
   * @param {string} templateId - Template ID
   * @returns {Promise<Object>} Template details
   */
  getTemplateById: async (templateId) => {
    return api.get(`/metrics/crm/templates/${templateId}`);
  },

  /**
   * Create a new CRM template
   * @param {Object} templateData - Template data
   * @param {string} templateData.name - Template name
   * @param {string} templateData.category - Template category
   * @param {string} templateData.channel - Template channel
   * @param {string} templateData.type - Template type
   * @param {string} templateData.body - Template body
   * @param {string} templateData.version - Template version
   * @returns {Promise<Object>} Created template
   */
  createTemplate: async (templateData) => {
    return api.post('/metrics/crm/templates', templateData);
  },

  /**
   * Update CRM template
   * @param {string} templateId - Template ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated template
   */
  updateTemplate: async (templateId, updateData) => {
    return api.put(`/metrics/crm/templates/${templateId}`, updateData);
  },

  /**
   * Delete CRM template (soft delete)
   * @param {string} templateId - Template ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  deleteTemplate: async (templateId) => {
    return api.delete(`/metrics/crm/templates/${templateId}`);
  },

  /**
   * Approve template
   * @param {string} templateId - Template ID
   * @returns {Promise<Object>} Updated template
   */
  approveTemplate: async (templateId) => {
    return api.post(`/metrics/crm/templates/${templateId}/approve`);
  },

  /**
   * Reject template
   * @param {string} templateId - Template ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Updated template
   */
  rejectTemplate: async (templateId, reason) => {
    return api.post(`/metrics/crm/templates/${templateId}/reject`, { reason });
  },

  /**
   * Create new version of template
   * @param {string} templateId - Template ID
   * @param {string} version - New version
   * @returns {Promise<Object>} New template version
   */
  createTemplateVersion: async (templateId, version) => {
    return api.post(`/metrics/crm/templates/${templateId}/version`, { version });
  },

  /**
   * Get template preview
   * @param {string} templateId - Template ID
   * @returns {Promise<Object>} Template preview
   */
  getTemplatePreview: async (templateId) => {
    return api.get(`/metrics/crm/templates/${templateId}/preview`);
  },

  /**
   * Get templates by category
   * @param {string} category - Template category
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Templates in category
   */
  getTemplatesByCategory: async (category, params = {}) => {
    return api.get(`/metrics/crm/templates/category/${category}`, { params });
  },

  /**
   * Get top performing templates
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Top performing templates
   */
  getTopPerformingTemplates: async (params = {}) => {
    return api.get('/metrics/crm/templates/top-performing', { params });
  },

  /**
   * Get template statistics
   * @returns {Promise<Object>} Template statistics
   */
  getTemplateStats: async () => {
    return api.get('/metrics/crm/templates/stats');
  },

  // === AUTOMATIONS ===

  /**
   * Get CRM automation metrics and analytics
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise<Object>} Automation metrics
   */
  getAutomationMetrics: async (params = {}) => {
    return api.get('/metrics/crm/automations', { params });
  },

  /**
   * Get paginated list of CRM automations
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated automations list
   */
  getAutomationsList: async (params = {}) => {
    return api.get('/metrics/crm/automations/list', { params });
  },

  /**
   * Search CRM automations by text query
   * @param {string} query - Search query
   * @param {Object} params - Additional query parameters
   * @returns {Promise<Object>} Search results
   */
  searchAutomations: async (query, params = {}) => {
    return api.get('/metrics/crm/automations/search', {
      params: { q: query, ...params },
    });
  },

  /**
   * Get detailed CRM automation by ID
   * @param {string} automationId - Automation ID
   * @returns {Promise<Object>} Automation details
   */
  getAutomationById: async (automationId) => {
    return api.get(`/metrics/crm/automations/${automationId}`);
  },

  /**
   * Create a new CRM automation
   * @param {Object} automationData - Automation data
   * @param {string} automationData.name - Automation name
   * @param {string} automationData.category - Automation category
   * @param {Object} automationData.trigger - Trigger configuration
   * @param {Object[]} automationData.actions - Actions to execute
   * @returns {Promise<Object>} Created automation
   */
  createAutomation: async (automationData) => {
    return api.post('/metrics/crm/automations', automationData);
  },

  /**
   * Update CRM automation
   * @param {string} automationId - Automation ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated automation
   */
  updateAutomation: async (automationId, updateData) => {
    return api.put(`/metrics/crm/automations/${automationId}`, updateData);
  },

  /**
   * Delete CRM automation (soft delete)
   * @param {string} automationId - Automation ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  deleteAutomation: async (automationId) => {
    return api.delete(`/metrics/crm/automations/${automationId}`);
  },

  /**
   * Enable automation
   * @param {string} automationId - Automation ID
   * @returns {Promise<Object>} Updated automation
   */
  enableAutomation: async (automationId) => {
    return api.post(`/metrics/crm/automations/${automationId}/enable`);
  },

  /**
   * Disable automation
   * @param {string} automationId - Automation ID
   * @returns {Promise<Object>} Updated automation
   */
  disableAutomation: async (automationId) => {
    return api.post(`/metrics/crm/automations/${automationId}/disable`);
  },

  /**
   * Test automation with sample data
   * @param {string} automationId - Automation ID
   * @param {Object} testData - Test data
   * @returns {Promise<Object>} Test result
   */
  testAutomation: async (automationId, testData) => {
    return api.post(`/metrics/crm/automations/${automationId}/test`, testData);
  },

  /**
   * Execute automation manually
   * @param {string} automationId - Automation ID
   * @param {Object} triggerData - Trigger data
   * @returns {Promise<Object>} Execution result
   */
  executeAutomation: async (automationId, triggerData) => {
    return api.post(`/metrics/crm/automations/${automationId}/execute`, triggerData);
  },

  /**
   * Get automation execution history
   * @param {string} automationId - Automation ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Execution history
   */
  getAutomationHistory: async (automationId, params = {}) => {
    return api.get(`/metrics/crm/automations/${automationId}/history`, { params });
  },

  /**
   * Get automations by category
   * @param {string} category - Automation category
   * @returns {Promise<Object>} Automations in category
   */
  getAutomationsByCategory: async (category) => {
    return api.get(`/metrics/crm/automations/category/${category}`);
  },

  /**
   * Get automations due for execution
   * @returns {Promise<Object>} Due automations
   */
  getAutomationsDueForExecution: async () => {
    return api.get('/metrics/crm/automations/due-for-execution');
  },

  /**
   * Get top performing automations
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Top performing automations
   */
  getTopPerformingAutomations: async (params = {}) => {
    return api.get('/metrics/crm/automations/top-performing', { params });
  },

  /**
   * Get automation statistics
   * @returns {Promise<Object>} Automation statistics
   */
  getAutomationStats: async () => {
    return api.get('/metrics/crm/automations/stats');
  },

  /**
   * Bulk enable automations
   * @param {string[]} automationIds - Automation IDs
   * @returns {Promise<Object>} Bulk enable result
   */
  bulkEnableAutomations: async (automationIds) => {
    return api.post('/metrics/crm/automations/bulk/enable', { automationIds });
  },

  /**
   * Bulk disable automations
   * @param {string[]} automationIds - Automation IDs
   * @returns {Promise<Object>} Bulk disable result
   */
  bulkDisableAutomations: async (automationIds) => {
    return api.post('/metrics/crm/automations/bulk/disable', { automationIds });
  },

  /**
   * Bulk delete automations
   * @param {string[]} automationIds - Automation IDs
   * @returns {Promise<Object>} Bulk delete result
   */
  bulkDeleteAutomations: async (automationIds) => {
    return api.post('/metrics/crm/automations/bulk/delete', { automationIds });
  },

  // === DIRECT MESSAGING ===

  // Message Thread Functions

  /**
   * Get message threads with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20)
   * @param {string} params.sortBy - Field to sort by
   * @param {string} params.sortOrder - Sort order (asc/desc)
   * @param {string} params.status - Filter by status (active, archived, closed)
   * @param {string} params.priority - Filter by priority (low, medium, high, urgent)
   * @param {string} params.assignedAgent - Filter by assigned agent
   * @param {string} params.threadType - Filter by thread type (direct, group)
   * @param {string[]} params.tags - Filter by tags
   * @param {string} params.dateRange - Preset date range
   * @param {string} params.startDate - Start date for filtering
   * @param {string} params.endDate - End date for filtering
   * @returns {Promise<Object>} Paginated message threads list
   */
  getMessageThreads: async (params = {}) => {
    return api.get('/metrics/crm/threads', { params });
  },

  /**
   * Get a specific message thread
   * @param {string} threadId - Thread ID
   * @returns {Promise<Object>} Thread details
   */
  getMessageThread: async (threadId) => {
    return api.get(`/metrics/crm/threads/${threadId}`);
  },

  /**
   * Create a new message thread
   * @param {Object} threadData - Thread data
   * @param {string} threadData.threadType - Thread type (direct, group)
   * @param {Object[]} threadData.participants - Array of participants
   * @param {string} threadData.subject - Thread subject
   * @param {string} threadData.assignedAgent - Assigned agent ID
   * @param {string} threadData.priority - Priority level
   * @param {string} threadData.primaryChannel - Primary communication channel
   * @param {string} threadData.relatedEntityType - Related entity type
   * @param {string} threadData.relatedEntityId - Related entity ID
   * @param {string[]} threadData.tags - Thread tags
   * @param {boolean} threadData.autoAssignmentEnabled - Auto-assignment enabled
   * @param {string} threadData.responseDeadline - Response deadline
   * @returns {Promise<Object>} Created thread
   */
  createMessageThread: async (threadData) => {
    return api.post('/metrics/crm/threads', threadData);
  },

  /**
   * Update message thread details
   * @param {string} threadId - Thread ID
   * @param {Object} updateData - Update data
   * @param {string} updateData.subject - Thread subject
   * @param {string} updateData.status - Thread status
   * @param {string} updateData.priority - Priority level
   * @param {string} updateData.assignedAgent - Assigned agent ID
   * @param {string[]} updateData.tags - Thread tags
   * @returns {Promise<Object>} Updated thread
   */
  updateMessageThread: async (threadId, updateData) => {
    return api.put(`/metrics/crm/threads/${threadId}`, updateData);
  },

  /**
   * Close a message thread
   * @param {string} threadId - Thread ID
   * @param {Object} closeData - Close data
   * @param {string} closeData.reason - Close reason
   * @param {number} closeData.satisfactionScore - Satisfaction score (1-5)
   * @returns {Promise<Object>} Updated thread
   */
  closeMessageThread: async (threadId, closeData) => {
    return api.post(`/metrics/crm/threads/${threadId}/close`, closeData);
  },

  /**
   * Archive a message thread
   * @param {string} threadId - Thread ID
   * @returns {Promise<Object>} Updated thread
   */
  archiveMessageThread: async (threadId) => {
    return api.post(`/metrics/crm/threads/${threadId}/archive`);
  },

  /**
   * Add participant to thread
   * @param {string} threadId - Thread ID
   * @param {Object} participantData - Participant data
   * @param {Object[]} participantData.participants - Array of participants
   * @returns {Promise<Object>} Updated thread
   */
  addThreadParticipant: async (threadId, participantData) => {
    return api.post(`/metrics/crm/threads/${threadId}/participants`, participantData);
  },

  /**
   * Remove participant from thread
   * @param {string} threadId - Thread ID
   * @param {string} participantId - Participant ID
   * @returns {Promise<Object>} Updated thread
   */
  removeThreadParticipant: async (threadId, participantId) => {
    return api.delete(`/metrics/crm/threads/${threadId}/participants/${participantId}`);
  },

  // Message Functions

  /**
   * Get messages in a thread
   * @param {string} threadId - Thread ID
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Messages per page (default: 50)
   * @param {string} params.before - Get messages before this message ID
   * @param {string} params.after - Get messages after this message ID
   * @param {string} params.messageType - Filter by message type
   * @returns {Promise<Object>} Paginated messages list
   */
  getThreadMessages: async (threadId, params = {}) => {
    return api.get(`/metrics/crm/threads/${threadId}/messages`, { params });
  },

  /**
   * Send a new message
   * @param {Object} messageData - Message data
   * @param {string} messageData.threadId - Thread ID
   * @param {string} messageData.content - Message content
   * @param {string} messageData.messageType - Message type
   * @param {Object[]} messageData.attachments - Message attachments
   * @param {string} messageData.replyTo - Reply to message ID
   * @param {string[]} messageData.deliveryChannels - Delivery channels
   * @returns {Promise<Object>} Sent message
   */
  sendMessage: async (messageData) => {
    return api.post(`/metrics/crm/threads/${messageData.threadId}/messages`, messageData);
  },

  /**
   * Update a message
   * @param {string} messageId - Message ID
   * @param {Object} updateData - Update data
   * @param {string} updateData.content - Updated content
   * @param {Object[]} updateData.attachments - Updated attachments
   * @returns {Promise<Object>} Updated message
   */
  updateMessage: async (messageId, updateData) => {
    return api.put(`/metrics/crm/messages/${messageId}`, updateData);
  },

  /**
   * Delete a message
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  deleteMessage: async (messageId) => {
    return api.delete(`/metrics/crm/messages/${messageId}`);
  },

  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Updated message
   */
  markMessageAsRead: async (messageId) => {
    return api.post(`/metrics/crm/messages/${messageId}/read`);
  },

  /**
   * Mark all messages in thread as read
   * @param {string} threadId - Thread ID
   * @returns {Promise<Object>} Updated thread
   */
  markThreadAsRead: async (threadId) => {
    // This would typically be implemented as a bulk operation
    // For now, we'll use a placeholder implementation
    return api.post(`/metrics/crm/threads/${threadId}/read-all`);
  },

  /**
   * Search messages
   * @param {string} searchQuery - Search query
   * @param {Object} filters - Search filters
   * @param {string} filters.threadId - Filter by thread ID
   * @param {string} filters.senderId - Filter by sender ID
   * @param {string} filters.messageType - Filter by message type
   * @param {number} filters.page - Page number
   * @param {number} filters.limit - Results per page
   * @returns {Promise<Object>} Search results
   */
  searchMessages: async (searchQuery, filters = {}) => {
    return api.get('/metrics/crm/messages/search', {
      params: { q: searchQuery, ...filters },
    });
  },

  /**
   * Add reaction to message
   * @param {string} messageId - Message ID
   * @param {string} reaction - Reaction emoji or text
   * @returns {Promise<Object>} Updated message
   */
  addMessageReaction: async (messageId, reaction) => {
    return api.post(`/metrics/crm/messages/${messageId}/reactions`, { reaction });
  },

  /**
   * Remove reaction from message
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Updated message
   */
  removeMessageReaction: async (messageId) => {
    return api.delete(`/metrics/crm/messages/${messageId}/reactions`);
  },

  // Assignment Functions

  /**
   * Get assignments
   * @param {Object} filters - Query parameters
   * @param {number} filters.page - Page number (default: 1)
   * @param {number} filters.limit - Items per page (default: 20)
   * @param {string} filters.sortBy - Field to sort by
   * @param {string} filters.sortOrder - Sort order (asc/desc)
   * @param {string} filters.agentId - Filter by agent ID
   * @param {string} filters.entityType - Filter by entity type
   * @param {string} filters.status - Filter by status
   * @param {string} filters.assignmentType - Filter by assignment type
   * @param {string} filters.priority - Filter by priority
   * @param {string} filters.dateRange - Preset date range
   * @returns {Promise<Object>} Paginated assignments list
   */
  getAssignments: async (filters = {}) => {
    return api.get('/metrics/crm/assignments/list', { params: filters });
  },

  /**
   * Get specific assignment details
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<Object>} Assignment details
   */
  getAssignment: async (assignmentId) => {
    return api.get(`/metrics/crm/assignments/${assignmentId}`);
  },

  /**
   * Create new assignment
   * @param {Object} assignmentData - Assignment data
   * @param {string} assignmentData.agentId - Agent ID
   * @param {string} assignmentData.entityType - Entity type
   * @param {string} assignmentData.entityId - Entity ID
   * @param {string} assignmentData.assignmentType - Assignment type
   * @param {string} assignmentData.assignmentReason - Assignment reason
   * @param {string} assignmentData.priority - Priority level
   * @param {string[]} assignmentData.requiredSkills - Required skills
   * @param {string[]} assignmentData.tags - Assignment tags
   * @param {Object} assignmentData.customFields - Custom fields
   * @returns {Promise<Object>} Created assignment
   */
  createAssignment: async (assignmentData) => {
    return api.post('/metrics/crm/assignments', assignmentData);
  },

  /**
   * Update assignment
   * @param {string} assignmentId - Assignment ID
   * @param {Object} updateData - Update data
   * @param {string} updateData.priority - Priority level
   * @param {number} updateData.workloadScore - Workload score
   * @param {number} updateData.capacityUtilization - Capacity utilization
   * @param {number} updateData.firstResponseTime - First response time
   * @param {number} updateData.averageResponseTime - Average response time
   * @param {number} updateData.resolutionTime - Resolution time
   * @param {number} updateData.satisfactionScore - Satisfaction score
   * @param {number} updateData.totalMessages - Total messages
   * @param {number} updateData.totalInteractions - Total interactions
   * @param {string[]} updateData.tags - Assignment tags
   * @param {Object} updateData.customFields - Custom fields
   * @returns {Promise<Object>} Updated assignment
   */
  updateAssignment: async (assignmentId, updateData) => {
    return api.put(`/metrics/crm/assignments/${assignmentId}`, updateData);
  },

  /**
   * Transfer assignment to another agent
   * @param {string} assignmentId - Assignment ID
   * @param {Object} transferData - Transfer data
   * @param {string} transferData.toAgentId - Target agent ID
   * @param {string} transferData.reason - Transfer reason
   * @param {string} transferData.priority - New priority level
   * @returns {Promise<Object>} Updated assignment
   */
  transferAssignment: async (assignmentId, transferData) => {
    return api.post(`/metrics/crm/assignments/${assignmentId}/transfer`, transferData);
  },

  /**
   * Escalate assignment
   * @param {string} assignmentId - Assignment ID
   * @param {Object} escalationData - Escalation data
   * @param {string} escalationData.toAgentId - Target agent ID
   * @param {number} escalationData.level - Escalation level
   * @returns {Promise<Object>} Updated assignment
   */
  escalateAssignment: async (assignmentId, escalationData) => {
    return api.post(`/metrics/crm/assignments/${assignmentId}/escalate`, escalationData);
  },

  /**
   * Complete assignment
   * @param {string} assignmentId - Assignment ID
   * @param {Object} completionData - Completion data
   * @param {string} completionData.completionReason - Completion reason
   * @param {number} completionData.satisfactionScore - Satisfaction score
   * @param {string} completionData.notes - Completion notes
   * @returns {Promise<Object>} Updated assignment
   */
  completeAssignment: async (assignmentId, completionData) => {
    return api.post(`/metrics/crm/assignments/${assignmentId}/complete`, completionData);
  },

  /**
   * Delete assignment
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  deleteAssignment: async (assignmentId) => {
    return api.delete(`/metrics/crm/assignments/${assignmentId}`);
  },

  /**
   * Assign thread to agent
   * @param {string} threadId - Thread ID
   * @param {Object} assignmentData - Assignment data
   * @param {string} assignmentData.agentId - Agent ID
   * @param {string} assignmentData.assignmentType - Assignment type
   * @param {string} assignmentData.assignmentReason - Assignment reason
   * @returns {Promise<Object>} Updated thread
   */
  assignThread: async (threadId, assignmentData) => {
    return api.post(`/metrics/crm/threads/${threadId}/assign`, assignmentData);
  },

  /**
   * Get assignments by agent
   * @param {string} agentId - Agent ID
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.status - Filter by status
   * @param {string} params.entityType - Filter by entity type
   * @param {string} params.sortBy - Field to sort by
   * @param {string} params.sortOrder - Sort order
   * @returns {Promise<Object>} Agent assignments
   */
  getAgentAssignments: async (agentId, params = {}) => {
    return api.get(`/metrics/crm/assignments/agent/${agentId}`, { params });
  },

  /**
   * Get overdue assignments
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @returns {Promise<Object>} Overdue assignments
   */
  getOverdueAssignments: async (params = {}) => {
    return api.get('/metrics/crm/assignments/overdue', { params });
  },

  // Assignment Metrics Functions

  /**
   * Get comprehensive assignment metrics
   * @param {Object} filters - Query parameters
   * @param {string} filters.startDate - Start date for filtering
   * @param {string} filters.endDate - End date for filtering
   * @param {string} filters.dateRange - Preset date range
   * @param {string} filters.agentId - Filter by agent ID
   * @param {string} filters.entityType - Filter by entity type
   * @param {string} filters.status - Filter by status
   * @param {string} filters.assignmentType - Filter by assignment type
   * @param {string} filters.priority - Filter by priority
   * @param {string} filters.groupBy - Group results by field
   * @returns {Promise<Object>} Assignment metrics
   */
  getAssignmentMetrics: async (filters = {}) => {
    return api.get('/metrics/crm/assignments', { params: filters });
  },

  /**
   * Get agent workload metrics
   * @param {string} agentId - Agent ID
   * @param {Object} filters - Query parameters
   * @param {string} filters.startDate - Start date for filtering
   * @param {string} filters.endDate - End date for filtering
   * @param {string} filters.dateRange - Preset date range
   * @returns {Promise<Object>} Agent workload metrics
   */
  getAgentWorkload: async (agentId, filters = {}) => {
    return api.get(`/metrics/crm/assignments/agent/${agentId}/workload`, { params: filters });
  },

  /**
   * Get assignment performance analytics
   * @param {Object} filters - Query parameters
   * @param {string} filters.startDate - Start date for filtering
   * @param {string} filters.endDate - End date for filtering
   * @param {string} filters.dateRange - Preset date range
   * @param {string} filters.agentId - Filter by agent ID
   * @param {string} filters.groupBy - Group results by field
   * @returns {Promise<Object>} Assignment performance analytics
   */
  getAssignmentPerformance: async (filters = {}) => {
    // This would typically be a specific endpoint for performance analytics
    // For now, we'll use the main metrics endpoint with specific filters
    return api.get('/metrics/crm/assignments/performance', { params: filters });
  },

  /**
   * Get SLA compliance metrics
   * @param {Object} filters - Query parameters
   * @param {string} filters.startDate - Start date for filtering
   * @param {string} filters.endDate - End date for filtering
   * @param {string} filters.dateRange - Preset date range
   * @param {string} filters.agentId - Filter by agent ID
   * @param {string} filters.teamId - Filter by team ID
   * @returns {Promise<Object>} SLA compliance metrics
   */
  getSLACompliance: async (filters = {}) => {
    // This would typically be a specific endpoint for SLA compliance
    // For now, we'll use a placeholder endpoint
    return api.get('/metrics/crm/assignments/sla-compliance', { params: filters });
  },

  /**
   * Update assignment metrics
   * @param {string} assignmentId - Assignment ID
   * @param {Object} metricsData - Metrics data
   * @param {number} metricsData.firstResponseTime - First response time
   * @param {number} metricsData.averageResponseTime - Average response time
   * @param {number} metricsData.resolutionTime - Resolution time
   * @param {number} metricsData.totalMessages - Total messages
   * @param {number} metricsData.totalInteractions - Total interactions
   * @param {number} metricsData.workloadScore - Workload score
   * @param {number} metricsData.capacityUtilization - Capacity utilization
   * @returns {Promise<Object>} Updated assignment
   */
  updateAssignmentMetrics: async (assignmentId, metricsData) => {
    return api.put(`/metrics/crm/assignments/${assignmentId}/metrics`, metricsData);
  },

  // WebSocket Support Structure (Placeholder Functions)

  /**
   * Subscribe to message updates for a thread
   * @param {string} threadId - Thread ID
   * @param {Function} callback - Callback function for message updates
   * @returns {Object} Subscription object with unsubscribe method
   */
  subscribeToMessages: (threadId, callback) => {
    // Placeholder for WebSocket implementation
    // In a real implementation, this would establish a WebSocket connection
    // and handle real-time message updates
    console.log(`Subscribing to messages for thread ${threadId}`);
    
    return {
      unsubscribe: () => {
        console.log(`Unsubscribing from messages for thread ${threadId}`);
      }
    };
  },

  /**
   * Unsubscribe from message updates for a thread
   * @param {string} threadId - Thread ID
   */
  unsubscribeFromMessages: (threadId) => {
    // Placeholder for WebSocket implementation
    console.log(`Unsubscribing from messages for thread ${threadId}`);
  },

  /**
   * Subscribe to assignment updates
   * @param {Function} callback - Callback function for assignment updates
   * @returns {Object} Subscription object with unsubscribe method
   */
  subscribeToAssignments: (callback) => {
    // Placeholder for WebSocket implementation
    console.log('Subscribing to assignment updates');
    
    return {
      unsubscribe: () => {
        console.log('Unsubscribing from assignment updates');
      }
    };
  },

  /**
   * Send typing indicator to a thread
   * @param {string} threadId - Thread ID
   * @param {boolean} isTyping - Whether user is typing
   * @returns {Promise<Object>} Typing indicator status
   */
  sendTypingIndicator: async (threadId, isTyping) => {
    // Placeholder for WebSocket implementation
    // In a real implementation, this would send a typing indicator
    // via WebSocket to other participants in the thread
    console.log(`Sending typing indicator for thread ${threadId}: ${isTyping}`);
    
    return Promise.resolve({
      success: true,
      threadId,
      isTyping,
      timestamp: new Date().toISOString()
    });
  },
};