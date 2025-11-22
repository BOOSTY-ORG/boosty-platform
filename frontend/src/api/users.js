import api from './index.js';

export const usersAPI = {
  // Get all users
  getUsers: async (params = {}) => {
    return api.get('/metrics/users', { params });
  },

  // Get user by ID
  getUserById: async (id) => {
    return api.get(`/metrics/users/${id}`);
  },

  // Create new user
  createUser: async (userData) => {
    return api.post('/metrics/users', userData);
  },

  // Update user
  updateUser: async (id, userData) => {
    return api.put(`/metrics/users/${id}`, userData);
  },

  // Delete user
  deleteUser: async (id) => {
    return api.delete(`/metrics/users/${id}`);
  },

  // Get user metrics
  getUserMetrics: async (params = {}) => {
    return api.get('/metrics/users/metrics', { params });
  },

  // Get user applications
  getUserApplications: async (id, params = {}) => {
    return api.get(`/metrics/users/${id}/applications`, { params });
  },

  // Create user application
  createUserApplication: async (id, applicationData) => {
    return api.post(`/metrics/users/${id}/applications`, applicationData);
  },

  // Update user application
  updateUserApplication: async (id, applicationId, applicationData) => {
    return api.put(`/metrics/users/${id}/applications/${applicationId}`, applicationData);
  },

  // Get user installations
  getUserInstallations: async (id, params = {}) => {
    return api.get(`/metrics/users/${id}/installations`, { params });
  },

  // Create user installation
  createUserInstallation: async (id, installationData) => {
    return api.post(`/metrics/users/${id}/installations`, installationData);
  },

  // Update user installation
  updateUserInstallation: async (id, installationId, installationData) => {
    return api.put(`/metrics/users/${id}/installations/${installationId}`, installationData);
  },

  // Get user statistics
  getUserStats: async (filters = {}) => {
    return api.get('/metrics/users/stats', { params: filters });
  },

  // Search users
  searchUsers: async (query, params = {}) => {
    return api.get('/metrics/users/search', {
      params: { q: query, ...params },
    });
  },

  // Advanced search users
  advancedSearchUsers: async (searchParams = {}) => {
    return api.get('/metrics/users/advanced-search', {
      params: searchParams,
    });
  },

  // Export users
  exportUsers: async (params = {}) => {
    const { format = 'csv', ...searchParams } = params;
    return api.get(`/metrics/users/export.${format}`, {
      params: searchParams,
      responseType: 'blob',
    });
  },

  // Save filter preset
  saveFilterPreset: async (presetData) => {
    return api.post('/metrics/users/filter-presets', presetData);
  },

  // Get filter presets
  getFilterPresets: async () => {
    return api.get('/metrics/users/filter-presets');
  },

  // Update filter preset
  updateFilterPreset: async (presetId, presetData) => {
    return api.put(`/metrics/users/filter-presets/${presetId}`, presetData);
  },

  // Delete filter preset
  deleteFilterPreset: async (presetId) => {
    return api.delete(`/metrics/users/filter-presets/${presetId}`);
  },

  // Save column configuration
  saveColumnConfiguration: async (configData) => {
    return api.post('/metrics/users/column-configurations', configData);
  },

  // Get column configurations
  getColumnConfigurations: async () => {
    return api.get('/metrics/users/column-configurations');
  },

  // Update column configuration
  updateColumnConfiguration: async (configId, configData) => {
    return api.put(`/metrics/users/column-configurations/${configId}`, configData);
  },

  // Delete column configuration
  deleteColumnConfiguration: async (configId) => {
    return api.delete(`/metrics/users/column-configurations/${configId}`);
  },

  // Get user activity
  getUserActivity: async (id, params = {}) => {
    return api.get(`/metrics/users/${id}/activity`, { params });
  },

  // Get user documents
  getUserDocuments: async (id, params = {}) => {
    return api.get(`/metrics/users/${id}/documents`, { params });
  },

  // Upload user document
  uploadUserDocument: async (id, formData) => {
    return api.post(`/metrics/users/${id}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  // Bulk Operations
  
  // Bulk update users
  bulkUpdateUsers: async (userIds, updateData) => {
    return api.post('/metrics/users/bulk-update', {
      userIds,
      updateData
    });
  },

  // Bulk send communication
  bulkSendCommunication: async (communicationData) => {
    return api.post('/metrics/users/bulk-communication', communicationData);
  },

  // Bulk KYC operations
  bulkVerifyKYC: async (userIds, options = {}) => {
    return api.post('/metrics/users/bulk-kyc/verify', {
      userIds,
      ...options
    });
  },

  bulkRejectKYC: async (userIds, options = {}) => {
    return api.post('/metrics/users/bulk-kyc/reject', {
      userIds,
      ...options
    });
  },

  bulkRequestDocuments: async (userIds, options = {}) => {
    return api.post('/metrics/users/bulk-kyc/request-documents', {
      userIds,
      ...options
    });
  },

  bulkFlagForReview: async (userIds, options = {}) => {
    return api.post('/metrics/users/bulk-kyc/flag-review', {
      userIds,
      ...options
    });
  },

  bulkSetRiskLevel: async (userIds, options = {}) => {
    return api.post('/metrics/users/bulk-kyc/set-risk-level', {
      userIds,
      ...options
    });
  },

  // Bulk status updates
  bulkUpdateStatus: async (userIds, status, options = {}) => {
    return api.post('/metrics/users/bulk-status-update', {
      userIds,
      status,
      ...options
    });
  },

  bulkActivateUsers: async (userIds, options = {}) => {
    return api.post('/metrics/users/bulk-activate', {
      userIds,
      ...options
    });
  },

  bulkDeactivateUsers: async (userIds, options = {}) => {
    return api.post('/metrics/users/bulk-deactivate', {
      userIds,
      ...options
    });
  },

  bulkSuspendUsers: async (userIds, options = {}) => {
    return api.post('/metrics/users/bulk-suspend', {
      userIds,
      ...options
    });
  },

  // Bulk assignment operations
  bulkAssignToTeam: async (userIds, teamData, options = {}) => {
    return api.post('/metrics/users/bulk-assign', {
      userIds,
      teamData,
      ...options
    });
  },

  // Bulk export operations
  bulkExportUsers: async (userIds, exportOptions = {}) => {
    const { format = 'csv', ...options } = exportOptions;
    return api.post(`/metrics/users/bulk-export.${format}`, {
      userIds,
      ...options
    }, {
      responseType: 'blob',
    });
  },

  // Bulk delete operations
  bulkDeleteUsers: async (userIds, options = {}) => {
    return api.post('/metrics/users/bulk-delete', {
      userIds,
      ...options
    });
  },

  // Bulk tag operations
  bulkAddTags: async (userIds, tags, options = {}) => {
    return api.post('/metrics/users/bulk-add-tags', {
      userIds,
      tags,
      ...options
    });
  },

  bulkRemoveTags: async (userIds, tags, options = {}) => {
    return api.post('/metrics/users/bulk-remove-tags', {
      userIds,
      tags,
      ...options
    });
  },

  // Bulk operation management
  getBulkOperationHistory: async () => {
    return api.get('/metrics/users/bulk-operations/history');
  },

  getOperationQueueStatus: async () => {
    return api.get('/metrics/users/bulk-operations/queue-status');
  },

  cancelBulkOperation: async (operationId) => {
    return api.post(`/metrics/users/bulk-operations/${operationId}/cancel`);
  },

  retryBulkOperation: async (operationId) => {
    return api.post(`/metrics/users/bulk-operations/${operationId}/retry`);
  },

  getBulkOperationDetails: async (operationId) => {
    return api.get(`/metrics/users/bulk-operations/${operationId}`);
  },

  // Communication endpoints
  // Get user communications
  getUserCommunications: async (userId, params = {}) => {
    return api.get(`/metrics/users/${userId}/communications`, { params });
  },

  // Create user communication
  createUserCommunication: async (userId, communicationData) => {
    return api.post(`/metrics/users/${userId}/communications`, communicationData);
  },

  // Update user communication
  updateUserCommunication: async (userId, communicationId, communicationData) => {
    return api.put(`/metrics/users/${userId}/communications/${communicationId}`, communicationData);
  },

  // Delete user communication
  deleteUserCommunication: async (userId, communicationId) => {
    return api.delete(`/metrics/users/${userId}/communications/${communicationId}`);
  },

  // Get communication statistics
  getCommunicationStats: async (userId, params = {}) => {
    return api.get(`/metrics/users/${userId}/communications/stats`, { params });
  },

  // Get communication templates
  getCommunicationTemplates: async () => {
    return api.get('/metrics/users/communication-templates');
  },

  // Create communication template
  createCommunicationTemplate: async (templateData) => {
    return api.post('/metrics/users/communication-templates', templateData);
  },

  // Update communication template
  updateCommunicationTemplate: async (templateId, templateData) => {
    return api.put(`/metrics/users/communication-templates/${templateId}`, templateData);
  },

  // Delete communication template
  deleteCommunicationTemplate: async (templateId) => {
    return api.delete(`/metrics/users/communication-templates/${templateId}`);
  },

  // Schedule communication
  scheduleCommunication: async (userId, communicationData) => {
    return api.post(`/metrics/users/${userId}/communications/schedule`, communicationData);
  },

  // Cancel scheduled communication
  cancelScheduledCommunication: async (userId, communicationId) => {
    return api.post(`/metrics/users/${userId}/communications/${communicationId}/cancel`);
  },

  // Resend communication
  resendCommunication: async (userId, communicationId) => {
    return api.post(`/metrics/users/${userId}/communications/${communicationId}/resend`);
  },

  // Get communication analytics
  getCommunicationAnalytics: async (userId, params = {}) => {
    return api.get(`/metrics/users/${userId}/communications/analytics`, { params });
  },

  // Search communications
  searchCommunications: async (userId, query, params = {}) => {
    return api.get(`/metrics/users/${userId}/communications/search`, {
      params: { q: query, ...params },
    });
  },

  // Export communications
  exportCommunications: async (userId, params = {}) => {
    const { format = 'csv', ...searchParams } = params;
    return api.get(`/metrics/users/${userId}/communications/export.${format}`, {
      params: searchParams,
      responseType: 'blob',
    });
  },

  // Bulk communication operations
  bulkScheduleCommunications: async (communicationData) => {
    return api.post('/metrics/users/bulk-communications/schedule', communicationData);
  },

  bulkCancelCommunications: async (communicationIds) => {
    return api.post('/metrics/users/bulk-communications/cancel', { communicationIds });
  },

  bulkResendCommunications: async (communicationIds) => {
    return api.post('/metrics/users/bulk-communications/resend', { communicationIds });
  },

  bulkDeleteCommunications: async (communicationIds) => {
    return api.post('/metrics/users/bulk-communications/delete', { communicationIds });
  },

  // Communication template management
  duplicateCommunicationTemplate: async (templateId) => {
    return api.post(`/metrics/users/communication-templates/${templateId}/duplicate`);
  },

  getCommunicationTemplateUsage: async (templateId) => {
    return api.get(`/metrics/users/communication-templates/${templateId}/usage`);
  },

  // Communication preferences
  getUserCommunicationPreferences: async (userId) => {
    return api.get(`/metrics/users/${userId}/communication-preferences`);
  },

  updateUserCommunicationPreferences: async (userId, preferences) => {
    return api.put(`/metrics/users/${userId}/communication-preferences`, preferences);
  },

  // Communication automation
  getCommunicationAutomations: async (userId) => {
    return api.get(`/metrics/users/${userId}/communication-automations`);
  },

  createCommunicationAutomation: async (userId, automationData) => {
    return api.post(`/metrics/users/${userId}/communication-automations`, automationData);
  },

  updateCommunicationAutomation: async (userId, automationId, automationData) => {
    return api.put(`/metrics/users/${userId}/communication-automations/${automationId}`, automationData);
  },

  deleteCommunicationAutomation: async (userId, automationId) => {
    return api.delete(`/metrics/users/${userId}/communication-automations/${automationId}`);
  },

  // Communication tracking
  trackCommunicationOpen: async (communicationId) => {
    return api.post(`/metrics/users/communications/${communicationId}/track-open`);
  },

  trackCommunicationClick: async (communicationId, clickData) => {
    return api.post(`/metrics/users/communications/${communicationId}/track-click`, clickData);
  },

  // Communication responses
  getCommunicationResponses: async (communicationId) => {
    return api.get(`/metrics/users/communications/${communicationId}/responses`);
  },

  createCommunicationResponse: async (communicationId, responseData) => {
    return api.post(`/metrics/users/communications/${communicationId}/responses`, responseData);
  },
  // Export functionality
  
  // Get export templates
  getExportTemplates: async () => {
    return api.get('/metrics/users/export/templates');
  },

  // Create export template
  createExportTemplate: async (templateData) => {
    return api.post('/metrics/users/export/templates', templateData);
  },

  // Update export template
  updateExportTemplate: async (templateId, templateData) => {
    return api.put(`/metrics/users/export/templates/${templateId}`, templateData);
  },

  // Delete export template
  deleteExportTemplate: async (templateId) => {
    return api.delete(`/metrics/users/export/templates/${templateId}`);
  },

  // Export users with advanced options
  exportUsersAdvanced: async (exportOptions) => {
    return api.post('/metrics/users/export', exportOptions, {
      responseType: 'blob',
    });
  },

  // Get export history
  getExportHistory: async (params = {}) => {
    return api.get('/metrics/users/export/history', { params });
  },

  // Get export status
  getExportStatus: async (exportId) => {
    return api.get(`/metrics/users/export/${exportId}/status`);
  },

  // Download exported file
  downloadExportFile: async (exportId) => {
    return api.get(`/metrics/users/export/${exportId}/download`, {
      responseType: 'blob',
    });
  },

  // Cancel export
  cancelExport: async (exportId) => {
    return api.post(`/metrics/users/export/${exportId}/cancel`);
  },

  // Schedule export
  scheduleExport: async (scheduleData) => {
    return api.post('/metrics/users/export/schedule', scheduleData);
  },

  // Get scheduled exports
  getScheduledExports: async (params = {}) => {
    return api.get('/metrics/users/export/scheduled', { params });
  },

  // Update scheduled export
  updateScheduledExport: async (scheduleId, scheduleData) => {
    return api.put(`/metrics/users/export/scheduled/${scheduleId}`, scheduleData);
  },

  // Delete scheduled export
  deleteScheduledExport: async (scheduleId) => {
    return api.delete(`/metrics/users/export/scheduled/${scheduleId}`);
  },

  // Get export analytics
  getExportAnalytics: async (params = {}) => {
    return api.get('/metrics/users/export/analytics', { params });
  },

  // User KYC operations
  // Get user KYC documents
  getUserKYC: async (id) => {
    try {
      const response = await api.get(`/metrics/users/${id}/kyc`);
      return response;
    } catch (error) {
      console.error('Error fetching user KYC:', error);
      throw new Error(`Failed to fetch user KYC: ${error.message || error}`);
    }
  },

  // Upload KYC document
  uploadUserKYCDocument: async (id, formData) => {
    try {
      const response = await api.post(`/metrics/users/${id}/kyc`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      console.error('Error uploading user KYC document:', error);
      throw new Error(`Failed to upload user KYC document: ${error.message || error}`);
    }
  },

  // Verify KYC document
  verifyUserKYCDocument: async (id, documentId, verificationData = {}) => {
    try {
      const response = await api.put(`/metrics/users/${id}/kyc/${documentId}/verify`, verificationData);
      return response;
    } catch (error) {
      console.error('Error verifying user KYC document:', error);
      throw new Error(`Failed to verify user KYC document: ${error.message || error}`);
    }
  },

  // Reject KYC document
  rejectUserKYCDocument: async (id, documentId, rejectionData) => {
    try {
      const response = await api.put(`/metrics/users/${id}/kyc/${documentId}/reject`, rejectionData);
      return response;
    } catch (error) {
      console.error('Error rejecting user KYC document:', error);
      throw new Error(`Failed to reject user KYC document: ${error.message || error}`);
    }
  },

  // Flag KYC document for review
  flagUserKYCDocument: async (id, documentId, flagData) => {
    try {
      const response = await api.put(`/metrics/users/${id}/kyc/${documentId}/flag`, flagData);
      return response;
    } catch (error) {
      console.error('Error flagging user KYC document:', error);
      throw new Error(`Failed to flag user KYC document: ${error.message || error}`);
    }
  },

  // Get document verification history
  getUserDocumentHistory: async (id, documentId) => {
    return api.get(`/metrics/users/${id}/kyc/${documentId}/history`);
  },

  // Compare two documents
  compareUserDocuments: async (id, documentIds) => {
    return api.post(`/metrics/users/${id}/kyc/compare`, { documentIds });
  },

  // Get KYC metrics and analytics
  getUserKYCMetrics: async (params = {}) => {
    return api.get('/metrics/users/kyc', { params });
  },

  // Get KYC performance report
  getUserKYCPerformanceReport: async (params = {}) => {
    return api.get('/metrics/users/kyc/performance', { params });
  },

  // Get KYC analytics
  getUserKYCAnalytics: async (params = {}) => {
    return api.get('/metrics/users/kyc/analytics', { params });
  },

  // Get documents expiring soon
  getUserExpiringDocuments: async (days = 30) => {
    return api.get('/metrics/users/kyc/expiring', { params: { days } });
  },

  // Get documents with flags
  getUserFlaggedDocuments: async (params = {}) => {
    return api.get('/metrics/users/kyc/flagged', { params });
  },

  // Bulk verify documents
  bulkVerifyUserDocuments: async (id, documentIds, verificationData = {}) => {
    return api.post(`/metrics/users/${id}/kyc/bulk-verify`, {
      documentIds,
      ...verificationData
    });
  },

  // Bulk reject documents
  bulkRejectUserDocuments: async (id, documentIds, rejectionData) => {
    return api.post(`/metrics/users/${id}/kyc/bulk-reject`, {
      documentIds,
      ...rejectionData
    });
  },

  // Get document AI analysis
  getUserDocumentAIAnalysis: async (id, documentId) => {
    return api.get(`/metrics/users/${id}/kyc/${documentId}/ai-analysis`);
  },

  // Re-run AI analysis on document
  rerunUserDocumentAIAnalysis: async (id, documentId) => {
    return api.post(`/metrics/users/${id}/kyc/${documentId}/rerun-analysis`);
  },

  // Get document type validation rules
  getUserDocumentTypeRules: async (documentType) => {
    return api.get(`/metrics/users/kyc/document-rules/${documentType}`);
  },

  // Validate document against type rules
  validateUserDocument: async (id, documentId, documentType) => {
    return api.post(`/metrics/users/${id}/kyc/${documentId}/validate`, { documentType });
  },

  // KYC filtering and sorting
  // Get users with KYC filters
  getUsersWithKYCFilters: async (params = {}) => {
    return api.get('/metrics/users/kyc/filtered', { params });
  },

  // Get KYC statistics
  getKYCStats: async (params = {}) => {
    return api.get('/metrics/users/kyc/stats', { params });
  },

  // Get KYC status distribution
  getKYCStatusDistribution: async (params = {}) => {
    return api.get('/metrics/users/kyc/status-distribution', { params });
  },

  // Get KYC verification trends
  getKYCVerificationTrends: async (params = {}) => {
    return api.get('/metrics/users/kyc/verification-trends', { params });
  },

  // Get KYC completion rate
  getKYCCompletionRate: async (params = {}) => {
    return api.get('/metrics/users/kyc/completion-rate', { params });
  },

  // Get KYC rejection reasons
  getKYCRejectionReasons: async (params = {}) => {
    return api.get('/metrics/users/kyc/rejection-reasons', { params });
  },
};