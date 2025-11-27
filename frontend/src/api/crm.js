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
};