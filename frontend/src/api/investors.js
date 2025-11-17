import api from './index.js';

export const investorsAPI = {
  // Get all investors with advanced filtering and sorting
  getInvestors: async (params = {}) => {
    try {
      // Handle multi-column sorting
      if (params.sort && Array.isArray(params.sort)) {
        params.sort = params.sort.map(s => `${s.field}:${s.direction}`).join(',');
      }
      
      // Handle date range filtering
      if (params.dateRange) {
        const { start, end } = params.dateRange;
        if (start) params.dateFrom = start;
        if (end) params.dateTo = end;
        delete params.dateRange;
      }
      
      // Handle investment range filtering
      if (params.investmentRange) {
        const { min, max } = params.investmentRange;
        if (min !== undefined) params.minInvestment = min;
        if (max !== undefined) params.maxInvestment = max;
        delete params.investmentRange;
      }
      
      // Add error handling wrapper
      const response = await api.get('/metrics/investors', { params });
      
      // Handle the response format from backend
      if (response.data?.data) {
        return response.data; // Return the full response with pagination
      }
      return response;
    } catch (error) {
      console.error('Error fetching investors:', error);
      throw new Error(`Failed to fetch investors: ${error.message || error}`);
    }
  },

  // Get investor by ID
  getInvestorById: async (id) => {
    return api.get(`/metrics/investors/${id}`);
  },

  // Create new investor
  createInvestor: async (investorData) => {
    try {
      const response = await api.post('/metrics/investors', investorData);
      return response;
    } catch (error) {
      console.error('Error creating investor:', error);
      throw new Error(`Failed to create investor: ${error.message || error}`);
    }
  },

  // Enhanced create investor with validation
  createInvestorWithValidation: async (investorData) => {
    // First validate the investor data
    const validationResponse = await api.post('/metrics/investors/validate', investorData);
    
    if (!validationResponse.data.isValid) {
      throw new Error(validationResponse.data.message || 'Investor data validation failed');
    }
    
    // If validation passes, create the investor
    return api.post('/metrics/investors', investorData);
  },

  // Update investor
  updateInvestor: async (id, investorData) => {
    try {
      const response = await api.put(`/metrics/investors/${id}`, investorData);
      return response;
    } catch (error) {
      console.error('Error updating investor:', error);
      throw new Error(`Failed to update investor: ${error.message || error}`);
    }
  },

  // Partial update investor
  partialUpdateInvestor: async (id, partialData) => {
    return api.patch(`/metrics/investors/${id}`, partialData);
  },

  // Delete investor
  deleteInvestor: async (id) => {
    return api.delete(`/metrics/investors/${id}`);
  },

  // Get investor metrics
  getInvestorMetrics: async (params = {}) => {
    return api.get('/metrics/investors/metrics', { params });
  },

  // Get investor KYC documents
  getInvestorKYC: async (id) => {
    try {
      const response = await api.get(`/metrics/investors/${id}/kyc`);
      return response;
    } catch (error) {
      console.error('Error fetching investor KYC:', error);
      throw new Error(`Failed to fetch investor KYC: ${error.message || error}`);
    }
  },

  // Upload KYC document
  uploadKYCDocument: async (id, formData) => {
    try {
      const response = await api.post(`/metrics/investors/${id}/kyc`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      console.error('Error uploading KYC document:', error);
      throw new Error(`Failed to upload KYC document: ${error.message || error}`);
    }
  },

  // Verify KYC document
  verifyKYCDocument: async (id, documentId, verificationData = {}) => {
    try {
      const response = await api.put(`/metrics/investors/${id}/kyc/${documentId}/verify`, verificationData);
      return response;
    } catch (error) {
      console.error('Error verifying KYC document:', error);
      throw new Error(`Failed to verify KYC document: ${error.message || error}`);
    }
  },

  // Reject KYC document
  rejectKYCDocument: async (id, documentId, rejectionData) => {
    try {
      const response = await api.put(`/metrics/investors/${id}/kyc/${documentId}/reject`, rejectionData);
      return response;
    } catch (error) {
      console.error('Error rejecting KYC document:', error);
      throw new Error(`Failed to reject KYC document: ${error.message || error}`);
    }
  },

  // Flag KYC document for review
  flagKYCDocument: async (id, documentId, flagData) => {
    return api.put(`/metrics/investors/${id}/kyc/${documentId}/flag`, flagData);
  },

  // Get document verification history
  getDocumentHistory: async (id, documentId) => {
    return api.get(`/metrics/investors/${id}/kyc/${documentId}/history`);
  },

  // Compare two documents
  compareDocuments: async (id, documentIds) => {
    return api.post(`/metrics/investors/${id}/kyc/compare`, { documentIds });
  },

  // Get KYC metrics and analytics
  getKYCMetrics: async (params = {}) => {
    return api.get('/metrics/kyc', { params });
  },

  // Get KYC performance report
  getKYCPerformanceReport: async (params = {}) => {
    return api.get('/metrics/kyc/performance', { params });
  },

  // Get KYC analytics
  getKYCAnalytics: async (params = {}) => {
    return api.get('/metrics/kyc/analytics', { params });
  },

  // Get documents expiring soon
  getExpiringDocuments: async (days = 30) => {
    return api.get('/metrics/kyc/expiring', { params: { days } });
  },

  // Get documents with flags
  getFlaggedDocuments: async (params = {}) => {
    return api.get('/metrics/kyc/flagged', { params });
  },

  // Bulk verify documents
  bulkVerifyDocuments: async (id, documentIds, verificationData = {}) => {
    return api.post(`/metrics/investors/${id}/kyc/bulk-verify`, {
      documentIds,
      ...verificationData
    });
  },

  // Bulk reject documents
  bulkRejectDocuments: async (id, documentIds, rejectionData) => {
    return api.post(`/metrics/investors/${id}/kyc/bulk-reject`, {
      documentIds,
      ...rejectionData
    });
  },

  // Get document AI analysis
  getDocumentAIAnalysis: async (id, documentId) => {
    return api.get(`/metrics/investors/${id}/kyc/${documentId}/ai-analysis`);
  },

  // Re-run AI analysis on document
  rerunAIAnalysis: async (id, documentId) => {
    return api.post(`/metrics/investors/${id}/kyc/${documentId}/rerun-analysis`);
  },

  // Get document type validation rules
  getDocumentTypeRules: async (documentType) => {
    return api.get(`/metrics/kyc/document-rules/${documentType}`);
  },

  // Validate document against type rules
  validateDocument: async (id, documentId, documentType) => {
    return api.post(`/metrics/investors/${id}/kyc/${documentId}/validate`, { documentType });
  },

  // Get investor investments
  getInvestorInvestments: async (id, params = {}) => {
    return api.get(`/metrics/investors/${id}/investments`, { params });
  },

  // Get investor transactions
  getInvestorTransactions: async (id, params = {}) => {
    return api.get(`/metrics/investors/${id}/transactions`, { params });
  },

  // Get investor performance
  getInvestorPerformance: async (id, period = '1y') => {
    return api.get(`/metrics/investors/${id}/performance`, {
      params: { period },
    });
  },

  // Get investor statistics
  getInvestorStats: async (filters = {}) => {
    return api.get('/metrics/investors/stats', { params: filters });
  },

  // Search investors with advanced filtering
  searchInvestors: async (query, params = {}) => {
    // Handle the same parameter transformations as getInvestors
    if (params.sort && Array.isArray(params.sort)) {
      params.sort = params.sort.map(s => `${s.field}:${s.direction}`).join(',');
    }
    
    if (params.dateRange) {
      const { start, end } = params.dateRange;
      if (start) params.dateFrom = start;
      if (end) params.dateTo = end;
      delete params.dateRange;
    }
    
    if (params.investmentRange) {
      const { min, max } = params.investmentRange;
      if (min !== undefined) params.minInvestment = min;
      if (max !== undefined) params.maxInvestment = max;
      delete params.investmentRange;
    }
    
    const response = await api.get('/metrics/investors/search', {
      params: { q: query, ...params },
    });
    
    // Handle response format from backend
    if (response.data?.data) {
      return response.data; // Return the full response with pagination
    }
    return response;
  },

  // Export investors data
  exportInvestors: async (params = {}) => {
    // Handle the same parameter transformations
    if (params.sort && Array.isArray(params.sort)) {
      params.sort = params.sort.map(s => `${s.field}:${s.direction}`).join(',');
    }
    
    if (params.dateRange) {
      const { start, end } = params.dateRange;
      if (start) params.dateFrom = start;
      if (end) params.dateTo = end;
      delete params.dateRange;
    }
    
    if (params.investmentRange) {
      const { min, max } = params.investmentRange;
      if (min !== undefined) params.minInvestment = min;
      if (max !== undefined) params.maxInvestment = max;
      delete params.investmentRange;
    }
    
    return api.get('/metrics/investors/export', {
      params,
      responseType: 'blob',
    });
  },

  // Get filter options for dynamic filtering
  getFilterOptions: async () => {
    return api.get('/metrics/investors/filter-options');
  },

  // Bulk Operations
  
  // Bulk update investors
  bulkUpdateInvestors: async (investorIds, updateData) => {
    return api.post('/metrics/investors/bulk-update', {
      investorIds,
      updateData
    });
  },

  // Bulk KYC operations
  bulkVerifyKYC: async (investorIds, options = {}) => {
    return api.post('/metrics/investors/bulk-kyc-verify', {
      investorIds,
      ...options
    });
  },

  bulkRejectKYC: async (investorIds, rejectionData) => {
    return api.post('/metrics/investors/bulk-kyc-reject', {
      investorIds,
      ...rejectionData
    });
  },

  bulkRequestDocuments: async (investorIds, documentData) => {
    return api.post('/metrics/investors/bulk-request-documents', {
      investorIds,
      ...documentData
    });
  },

  bulkFlagForReview: async (investorIds, reviewData) => {
    return api.post('/metrics/investors/bulk-flag-review', {
      investorIds,
      ...reviewData
    });
  },

  // Bulk communication
  bulkSendCommunication: async (communicationData) => {
    return api.post('/metrics/investors/bulk-communication', communicationData);
  },

  // Bulk export
  bulkExportInvestors: async (investorIds, format = 'xlsx') => {
    return api.post('/metrics/investors/bulk-export', {
      investorIds,
      format
    }, {
      responseType: 'blob',
    });
  },

  // Bulk assign to team members
  bulkAssignToTeam: async (investorIds, teamData) => {
    return api.post('/metrics/investors/bulk-assign', {
      investorIds,
      ...teamData
    });
  },

  // Bulk delete investors
  bulkDeleteInvestors: async (investorIds) => {
    return api.post('/metrics/investors/bulk-delete', {
      investorIds
    });
  },

  // Get bulk operation status
  getBulkOperationStatus: async (operationId) => {
    return api.get(`/metrics/investors/bulk-operations/${operationId}`);
  },

  // Get bulk operation history
  getBulkOperationHistory: async (params = {}) => {
    return api.get('/metrics/investors/bulk-operations', { params });
  },

  // Cancel bulk operation
  cancelBulkOperation: async (operationId) => {
    return api.post(`/metrics/investors/bulk-operations/${operationId}/cancel`);
  },

  // Retry failed bulk operation
  retryBulkOperation: async (operationId) => {
    return api.post(`/metrics/investors/bulk-operations/${operationId}/retry`);
  },

  // Get operation queue status
  getOperationQueueStatus: async () => {
    return api.get('/metrics/investors/bulk-operations/queue-status');
  },

  // Export functionality
  
  // Get export templates
  getExportTemplates: async () => {
    return api.get('/metrics/investors/export/templates');
  },

  // Create export template
  createExportTemplate: async (templateData) => {
    return api.post('/metrics/investors/export/templates', templateData);
  },

  // Update export template
  updateExportTemplate: async (templateId, templateData) => {
    return api.put(`/metrics/investors/export/templates/${templateId}`, templateData);
  },

  // Delete export template
  deleteExportTemplate: async (templateId) => {
    return api.delete(`/metrics/investors/export/templates/${templateId}`);
  },

  // Export investors with advanced options
  exportInvestorsAdvanced: async (exportOptions) => {
    return api.post('/metrics/investors/export', exportOptions, {
      responseType: 'blob',
    });
  },

  // Get export history
  getExportHistory: async (params = {}) => {
    return api.get('/metrics/investors/export/history', { params });
  },

  // Get export status
  getExportStatus: async (exportId) => {
    return api.get(`/metrics/investors/export/${exportId}/status`);
  },

  // Download exported file
  downloadExportFile: async (exportId) => {
    return api.get(`/metrics/investors/export/${exportId}/download`, {
      responseType: 'blob',
    });
  },

  // Cancel export
  cancelExport: async (exportId) => {
    return api.post(`/metrics/investors/export/${exportId}/cancel`);
  },

  // Schedule export
  scheduleExport: async (scheduleData) => {
    return api.post('/metrics/investors/export/schedule', scheduleData);
  },

  // Get scheduled exports
  getScheduledExports: async (params = {}) => {
    return api.get('/metrics/investors/export/scheduled', { params });
  },

  // Update scheduled export
  updateScheduledExport: async (scheduleId, scheduleData) => {
    return api.put(`/metrics/investors/export/scheduled/${scheduleId}`, scheduleData);
  },

  // Delete scheduled export
  deleteScheduledExport: async (scheduleId) => {
    return api.delete(`/metrics/investors/export/scheduled/${scheduleId}`);
  },

  // Get export queue status
  getExportQueueStatus: async () => {
    return api.get('/metrics/investors/export/queue-status');
  },

  // Get export analytics
  getExportAnalytics: async (params = {}) => {
    return api.get('/metrics/investors/export/analytics', { params });
  },

  // Performance Analytics
  
  // Get investor performance analytics
  getInvestorPerformanceAnalytics: async (id, params = {}) => {
    return api.get(`/metrics/investors/${id}/performance-analytics`, { params });
  },

  // Get portfolio analysis data
  getPortfolioAnalysis: async (id, params = {}) => {
    return api.get(`/metrics/investors/${id}/portfolio-analysis`, { params });
  },

  // Get risk assessment data
  getRiskAssessment: async (id, params = {}) => {
    return api.get(`/metrics/investors/${id}/risk-assessment`, { params });
  },

  // Get investment timeline data
  getInvestmentTimeline: async (id, params = {}) => {
    return api.get(`/metrics/investors/${id}/investment-timeline`, { params });
  },

  // Get financial summary data
  getFinancialSummary: async (id, params = {}) => {
    return api.get(`/metrics/investors/${id}/financial-summary`, { params });
  },

  // Get benchmark comparison data
  getBenchmarkComparison: async (id, params = {}) => {
    return api.get(`/metrics/investors/${id}/benchmark-comparison`, { params });
  },

  // Get historical performance data
  getHistoricalPerformance: async (id, params = {}) => {
    return api.get(`/metrics/investors/${id}/historical-performance`, { params });
  },

  // Get performance predictions and forecasts
  getPerformanceForecast: async (id, params = {}) => {
    return api.get(`/metrics/investors/${id}/performance-forecast`, { params });
  },

  // Export investor analytics report
  exportInvestorAnalytics: async (id, params = {}) => {
    return api.get(`/metrics/investors/${id}/analytics-export`, {
      params,
      responseType: 'blob',
    });
  },

  // Investor validation
  validateInvestorData: async (investorData) => {
    return api.post('/metrics/investors/validate', investorData);
  },

  // Check for duplicate investors
  checkDuplicateInvestor: async (email, phone, excludeId = null) => {
    const params = { email, phone };
    if (excludeId) {
      params.excludeId = excludeId;
    }
    return api.get('/metrics/investors/check-duplicate', { params });
  },

  // Investor onboarding workflow
  initiateOnboarding: async (investorData) => {
    return api.post('/metrics/investors/onboarding/initiate', investorData);
  },

  completeOnboarding: async (investorId, onboardingData) => {
    return api.post(`/metrics/investors/${investorId}/onboarding/complete`, onboardingData);
  },

  getOnboardingStatus: async (investorId) => {
    return api.get(`/metrics/investors/${investorId}/onboarding/status`);
  },

  // Save investor draft
  saveInvestorDraft: async (draftData) => {
    return api.post('/metrics/investors/draft', draftData);
  },

  getInvestorDraft: async (draftId) => {
    return api.get(`/metrics/investors/draft/${draftId}`);
  },

  updateInvestorDraft: async (draftId, draftData) => {
    return api.put(`/metrics/investors/draft/${draftId}`, draftData);
  },

  deleteInvestorDraft: async (draftId) => {
    return api.delete(`/metrics/investors/draft/${draftId}`);
  },

  // Investor document management
  uploadInvestorDocument: async (investorId, documentType, formData) => {
    return api.post(`/metrics/investors/${investorId}/documents/${documentType}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getInvestorDocuments: async (investorId) => {
    return api.get(`/metrics/investors/${investorId}/documents`);
  },

  deleteInvestorDocument: async (investorId, documentId) => {
    return api.delete(`/metrics/investors/${investorId}/documents/${documentId}`);
  },

  // Investor templates
  getInvestorTemplates: async () => {
    return api.get('/metrics/investors/templates');
  },

  applyInvestorTemplate: async (templateId, investorData) => {
    return api.post(`/metrics/investors/templates/${templateId}/apply`, { investorData });
  },

  // Investor quick actions
  quickCreateInvestor: async (basicData) => {
    return api.post('/metrics/investors/quick-create', basicData);
  },

  duplicateInvestor: async (investorId, modifications = {}) => {
    return api.post(`/metrics/investors/${investorId}/duplicate`, modifications);
  },

  // Investor analytics and insights
  getInvestorInsights: async (investorId) => {
    return api.get(`/metrics/investors/${investorId}/insights`);
  },

  getInvestorRecommendations: async (investorId) => {
    return api.get(`/metrics/investors/${investorId}/recommendations`);
  },

  // Investor communication
  sendInvestorWelcomeEmail: async (investorId) => {
    return api.post(`/metrics/investors/${investorId}/communication/welcome`);
  },

  sendInvestorOnboardingReminder: async (investorId) => {
    return api.post(`/metrics/investors/${investorId}/communication/onboarding-reminder`);
  },

  // Investor status management
  approveInvestor: async (investorId, approvalData = {}) => {
    return api.post(`/metrics/investors/${investorId}/approve`, approvalData);
  },

  rejectInvestor: async (investorId, rejectionData) => {
    return api.post(`/metrics/investors/${investorId}/reject`, rejectionData);
  },

  suspendInvestor: async (investorId, reason) => {
    return api.post(`/metrics/investors/${investorId}/suspend`, { reason });
  },

  reactivateInvestor: async (investorId) => {
    return api.post(`/metrics/investors/${investorId}/reactivate`);
  },
};