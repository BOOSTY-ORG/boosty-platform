import { crmAPI } from '../api/crm.js';

/**
 * CRM Service Module
 * Provides a service layer for CRM operations with data transformation,
 * validation, caching, and error handling.
 * 
 * @namespace crmService
 */

// Cache configuration
const CACHE_CONFIG = {
  TTL: 5 * 60 * 1000, // 5 minutes
  MAX_SIZE: 100, // Maximum cached items
};

// Simple in-memory cache
const cache = new Map();

/**
 * Cache utility functions
 */
const cacheUtils = {
  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {*} Cached item or null
   */
  get: (key) => {
    const item = cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }
    
    return item.data;
  },
  
  /**
   * Set item in cache
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   */
  set: (key, data) => {
    // Implement LRU if cache is full
    if (cache.size >= CACHE_CONFIG.MAX_SIZE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(key, {
      data,
      expiry: Date.now() + CACHE_CONFIG.TTL
    });
  },
  
  /**
   * Clear cache
   * @param {string} pattern - Optional pattern to match keys
   */
  clear: (pattern = null) => {
    if (!pattern) {
      cache.clear();
      return;
    }
    
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  }
};

/**
 * Error handling utility
 */
const errorHandler = {
  /**
   * Handle API errors with user-friendly messages
   * @param {Error} error - Error object
   * @param {string} operation - Operation that failed
   * @returns {Error} Formatted error
   */
  handle: (error, operation) => {
    console.error(`CRM Service Error in ${operation}:`, error);
    
    // Extract meaningful error message
    let message = 'An unexpected error occurred';
    
    if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    
    // Add context to common errors
    if (error.response?.status === 401) {
      message = 'Your session has expired. Please log in again.';
    } else if (error.response?.status === 403) {
      message = 'You do not have permission to perform this action.';
    } else if (error.response?.status === 404) {
      message = 'The requested resource was not found.';
    } else if (error.response?.status >= 500) {
      message = 'Server error. Please try again later.';
    }
    
    const formattedError = new Error(message);
    formattedError.originalError = error;
    formattedError.operation = operation;
    formattedError.status = error.response?.status;
    
    return formattedError;
  },
  
  /**
   * Retry logic for failed requests
   * @param {Function} fn - Function to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} delay - Delay between retries in ms
   * @returns {Promise} Result of function
   */
  retry: async (fn, maxRetries = 3, delay = 1000) => {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (i === maxRetries) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
    
    throw lastError;
  }
};

/**
 * Data validation utilities
 */
const validators = {
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid email
   */
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  /**
   * Validate phone number format
   * @param {string} phone - Phone number to validate
   * @returns {boolean} Is valid phone
   */
  isValidPhone: (phone) => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  },
  
  /**
   * Validate required fields
   * @param {Object} data - Data to validate
   * @param {string[]} requiredFields - Required field names
   * @throws {Error} If validation fails
   */
  validateRequired: (data, requiredFields) => {
    const missing = requiredFields.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }
};

/**
 * Data transformation utilities
 */
const transformers = {
  /**
   * Transform contact data for API
   * @param {Object} contact - Contact data
   * @returns {Object} Transformed contact data
   */
  transformContactForAPI: (contact) => {
    const transformed = { ...contact };
    
    // Format names
    if (transformed.firstName) {
      transformed.firstName = transformed.firstName.trim().charAt(0).toUpperCase() + 
                            transformed.firstName.trim().slice(1).toLowerCase();
    }
    
    if (transformed.lastName) {
      transformed.lastName = transformed.lastName.trim().charAt(0).toUpperCase() + 
                           transformed.lastName.trim().slice(1).toLowerCase();
    }
    
    // Format email
    if (transformed.email) {
      transformed.email = transformed.email.toLowerCase().trim();
    }
    
    // Format phone
    if (transformed.phone) {
      transformed.phone = transformed.phone.replace(/\s+/g, ' ').trim();
    }
    
    // Ensure arrays
    if (transformed.tags && !Array.isArray(transformed.tags)) {
      transformed.tags = [transformed.tags];
    }
    
    return transformed;
  },
  
  /**
   * Transform contact data from API
   * @param {Object} contact - Contact data from API
   * @returns {Object} Transformed contact data
   */
  transformContactFromAPI: (contact) => {
    const transformed = { ...contact };
    
    // Format date fields
    if (transformed.createdAt) {
      transformed.createdAt = new Date(transformed.createdAt);
    }
    
    if (transformed.updatedAt) {
      transformed.updatedAt = new Date(transformed.updatedAt);
    }
    
    if (transformed.lastContactDate) {
      transformed.lastContactDate = new Date(transformed.lastContactDate);
    }
    
    // Ensure arrays
    if (!transformed.tags) {
      transformed.tags = [];
    }
    
    // Add computed fields
    transformed.fullName = `${transformed.firstName || ''} ${transformed.lastName || ''}`.trim();
    transformed.displayName = transformed.fullName || transformed.email || 'Unknown';
    
    return transformed;
  },
  
  /**
   * Transform communication data for API
   * @param {Object} communication - Communication data
   * @returns {Object} Transformed communication data
   */
  transformCommunicationForAPI: (communication) => {
    const transformed = { ...communication };
    
    // Set defaults
    if (!transformed.direction) {
      transformed.direction = 'outbound';
    }
    
    if (!transformed.status) {
      transformed.status = 'pending';
    }
    
    // Format content
    if (transformed.content) {
      transformed.content = transformed.content.trim();
    }
    
    return transformed;
  },
  
  /**
   * Transform communication data from API
   * @param {Object} communication - Communication data from API
   * @returns {Object} Transformed communication data
   */
  transformCommunicationFromAPI: (communication) => {
    const transformed = { ...communication };
    
    // Format date fields
    if (transformed.createdAt) {
      transformed.createdAt = new Date(transformed.createdAt);
    }
    
    if (transformed.updatedAt) {
      transformed.updatedAt = new Date(transformed.updatedAt);
    }
    
    if (transformed.scheduledFor) {
      transformed.scheduledFor = new Date(transformed.scheduledFor);
    }
    
    if (transformed.responseExpectedBy) {
      transformed.responseExpectedBy = new Date(transformed.responseExpectedBy);
    }
    
    return transformed;
  },
  
  /**
   * Transform template data for API
   * @param {Object} template - Template data
   * @returns {Object} Transformed template data
   */
  transformTemplateForAPI: (template) => {
    const transformed = { ...template };
    
    // Set defaults
    if (!transformed.status) {
      transformed.status = 'draft';
    }
    
    if (!transformed.version) {
      transformed.version = '1.0.0';
    }
    
    // Ensure arrays
    if (transformed.variables && !Array.isArray(transformed.variables)) {
      transformed.variables = [];
    }
    
    if (transformed.tags && !Array.isArray(transformed.tags)) {
      transformed.tags = [transformed.tags];
    }
    
    return transformed;
  },
  
  /**
   * Transform automation data for API
   * @param {Object} automation - Automation data
   * @returns {Object} Transformed automation data
   */
  transformAutomationForAPI: (automation) => {
    const transformed = { ...automation };
    
    // Set defaults
    if (!transformed.status) {
      transformed.status = 'draft';
    }
    
    if (transformed.enabled === undefined) {
      transformed.enabled = false;
    }
    
    // Ensure arrays
    if (!Array.isArray(transformed.actions)) {
      transformed.actions = [];
    }
    
    if (transformed.tags && !Array.isArray(transformed.tags)) {
      transformed.tags = [transformed.tags];
    }
    
    return transformed;
  }
};

/**
 * Analytics and metrics helpers
 */
const analytics = {
  /**
   * Calculate engagement score for contact
   * @param {Object} contact - Contact data
   * @returns {number} Engagement score (0-100)
   */
  calculateEngagementScore: (contact) => {
    let score = 0;
    
    // Base score for having contact info
    if (contact.email) score += 10;
    if (contact.phone) score += 10;
    
    // Score for interactions
    if (contact.metrics?.totalCommunications) {
      score += Math.min(contact.metrics.totalCommunications * 2, 30);
    }
    
    // Score for recent activity
    if (contact.lastContactDate) {
      const daysSinceContact = (Date.now() - contact.lastContactDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceContact < 7) score += 20;
      else if (daysSinceContact < 30) score += 15;
      else if (daysSinceContact < 90) score += 10;
    }
    
    // Score for engagement metrics
    if (contact.engagement) {
      if (contact.engagement.opened) score += 10;
      if (contact.engagement.clicked) score += 10;
      if (contact.engagement.responded) score += 10;
    }
    
    return Math.min(score, 100);
  },
  
  /**
   * Calculate lead score for contact
   * @param {Object} contact - Contact data
   * @returns {number} Lead score (0-100)
   */
  calculateLeadScore: (contact) => {
    let score = 0;
    
    // Score for contact type
    if (contact.contactType === 'lead') score += 20;
    else if (contact.contactType === 'prospect') score += 15;
    else if (contact.contactType === 'customer') score += 10;
    
    // Score for source
    if (contact.contactSource === 'referral') score += 15;
    else if (contact.contactSource === 'website') score += 10;
    else if (contact.contactSource === 'social') score += 5;
    
    // Score for company info
    if (contact.company) score += 10;
    if (contact.jobTitle) score += 5;
    
    // Score for engagement
    score += analytics.calculateEngagementScore(contact) * 0.3;
    
    return Math.min(score, 100);
  }
};

/**
 * CRM Service object with all methods
 */
export const crmService = {
  // === OVERVIEW ===
  
  /**
   * Get CRM overview with caching
   * @param {Object} params - Query parameters
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<Object>} CRM overview
   */
  async getOverview(params = {}, useCache = true) {
    const cacheKey = `crm-overview-${JSON.stringify(params)}`;
    
    if (useCache) {
      const cached = cacheUtils.get(cacheKey);
      if (cached) return cached;
    }
    
    try {
      const response = await errorHandler.retry(() => crmAPI.getCRMOverview(params));
      const overview = response.data || response;
      
      if (useCache) {
        cacheUtils.set(cacheKey, overview);
      }
      
      return overview;
    } catch (error) {
      throw errorHandler.handle(error, 'getOverview');
    }
  },
  
  // === CONTACTS ===
  
  /**
   * Get contacts with validation and transformation
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Transformed contacts list
   */
  async getContacts(params = {}) {
    try {
      const response = await errorHandler.retry(() => crmAPI.getContactsList(params));
      const contacts = response.data?.data || response.data || response;
      
      // Transform each contact
      const transformedContacts = Array.isArray(contacts) 
        ? contacts.map(transformers.transformContactFromAPI)
        : transformers.transformContactFromAPI(contacts);
      
      return {
        ...response,
        data: {
          ...response.data,
          data: transformedContacts
        }
      };
    } catch (error) {
      throw errorHandler.handle(error, 'getContacts');
    }
  },
  
  /**
   * Create contact with validation
   * @param {Object} contactData - Contact data
   * @returns {Promise<Object>} Created contact
   */
  async createContact(contactData) {
    try {
      // Validate required fields
      validators.validateRequired(contactData, ['firstName', 'lastName', 'email']);
      
      // Validate email format
      if (!validators.isValidEmail(contactData.email)) {
        throw new Error('Invalid email format');
      }
      
      // Validate phone if provided
      if (contactData.phone && !validators.isValidPhone(contactData.phone)) {
        throw new Error('Invalid phone number format');
      }
      
      // Transform data
      const transformedData = transformers.transformContactForAPI(contactData);
      
      // Clear contact cache
      cacheUtils.clear('contacts');
      
      const response = await crmAPI.createContact(transformedData);
      return transformers.transformContactFromAPI(response.data || response);
    } catch (error) {
      throw errorHandler.handle(error, 'createContact');
    }
  },
  
  /**
   * Update contact with validation
   * @param {string} contactId - Contact ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated contact
   */
  async updateContact(contactId, updateData) {
    try {
      // Validate email if provided
      if (updateData.email && !validators.isValidEmail(updateData.email)) {
        throw new Error('Invalid email format');
      }
      
      // Validate phone if provided
      if (updateData.phone && !validators.isValidPhone(updateData.phone)) {
        throw new Error('Invalid phone number format');
      }
      
      // Transform data
      const transformedData = transformers.transformContactForAPI(updateData);
      
      // Clear contact cache
      cacheUtils.clear('contacts');
      cacheUtils.clear(`contact-${contactId}`);
      
      const response = await crmAPI.updateContact(contactId, transformedData);
      return transformers.transformContactFromAPI(response.data || response);
    } catch (error) {
      throw errorHandler.handle(error, 'updateContact');
    }
  },
  
  /**
   * Get contact by ID with caching and transformation
   * @param {string} contactId - Contact ID
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<Object>} Contact details
   */
  async getContactById(contactId, useCache = true) {
    const cacheKey = `contact-${contactId}`;
    
    if (useCache) {
      const cached = cacheUtils.get(cacheKey);
      if (cached) return cached;
    }
    
    try {
      const response = await crmAPI.getContactById(contactId);
      const contact = transformers.transformContactFromAPI(response.data || response);
      
      // Add computed scores
      contact.engagementScore = analytics.calculateEngagementScore(contact);
      contact.leadScore = analytics.calculateLeadScore(contact);
      
      if (useCache) {
        cacheUtils.set(cacheKey, contact);
      }
      
      return contact;
    } catch (error) {
      throw errorHandler.handle(error, 'getContactById');
    }
  },
  
  /**
   * Bulk assign contacts to user
   * @param {string[]} contactIds - Contact IDs
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Bulk assign result
   */
  async bulkAssignContacts(contactIds, userId) {
    try {
      if (!contactIds.length || !userId) {
        throw new Error('Contact IDs and user ID are required');
      }
      
      // Clear contact cache
      cacheUtils.clear('contacts');
      contactIds.forEach(id => cacheUtils.clear(`contact-${id}`));
      
      return await crmAPI.bulkAssignContacts(contactIds, userId);
    } catch (error) {
      throw errorHandler.handle(error, 'bulkAssignContacts');
    }
  },
  
  // === COMMUNICATIONS ===
  
  /**
   * Get communications with transformation
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Transformed communications list
   */
  async getCommunications(params = {}) {
    try {
      const response = await errorHandler.retry(() => crmAPI.getCommunicationsList(params));
      const communications = response.data?.data || response.data || response;
      
      // Transform each communication
      const transformedCommunications = Array.isArray(communications) 
        ? communications.map(transformers.transformCommunicationFromAPI)
        : transformers.transformCommunicationFromAPI(communications);
      
      return {
        ...response,
        data: {
          ...response.data,
          data: transformedCommunications
        }
      };
    } catch (error) {
      throw errorHandler.handle(error, 'getCommunications');
    }
  },
  
  /**
   * Create communication with validation
   * @param {Object} communicationData - Communication data
   * @returns {Promise<Object>} Created communication
   */
  async createCommunication(communicationData) {
    try {
      // Validate required fields
      validators.validateRequired(communicationData, [
        'entityType', 'entityId', 'interactionType', 'channel', 'content'
      ]);
      
      // Transform data
      const transformedData = transformers.transformCommunicationForAPI(communicationData);
      
      // Clear communication cache
      cacheUtils.clear('communications');
      
      const response = await crmAPI.createCommunication(transformedData);
      return transformers.transformCommunicationFromAPI(response.data || response);
    } catch (error) {
      throw errorHandler.handle(error, 'createCommunication');
    }
  },
  
  /**
   * Get overdue communications
   * @returns {Promise<Object>} Overdue communications
   */
  async getOverdueCommunications() {
    try {
      const [overdueResponses, overdueFollowUps] = await Promise.all([
        crmAPI.getOverdueResponses(),
        crmAPI.getOverdueFollowUps()
      ]);
      
      return {
        responses: overdueResponses.data?.data || overdueResponses.data || [],
        followUps: overdueFollowUps.data?.data || overdueFollowUps.data || []
      };
    } catch (error) {
      throw errorHandler.handle(error, 'getOverdueCommunications');
    }
  },
  
  // === TEMPLATES ===
  
  /**
   * Get templates with transformation
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Transformed templates list
   */
  async getTemplates(params = {}) {
    try {
      const response = await errorHandler.retry(() => crmAPI.getTemplatesList(params));
      return response;
    } catch (error) {
      throw errorHandler.handle(error, 'getTemplates');
    }
  },
  
  /**
   * Create template with validation
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>} Created template
   */
  async createTemplate(templateData) {
    try {
      // Validate required fields
      validators.validateRequired(templateData, [
        'name', 'category', 'channel', 'type', 'body', 'version'
      ]);
      
      // Transform data
      const transformedData = transformers.transformTemplateForAPI(templateData);
      
      // Clear template cache
      cacheUtils.clear('templates');
      
      return await crmAPI.createTemplate(transformedData);
    } catch (error) {
      throw errorHandler.handle(error, 'createTemplate');
    }
  },
  
  // === AUTOMATIONS ===
  
  /**
   * Get automations with transformation
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Transformed automations list
   */
  async getAutomations(params = {}) {
    try {
      const response = await errorHandler.retry(() => crmAPI.getAutomationsList(params));
      return response;
    } catch (error) {
      throw errorHandler.handle(error, 'getAutomations');
    }
  },
  
  /**
   * Create automation with validation
   * @param {Object} automationData - Automation data
   * @returns {Promise<Object>} Created automation
   */
  async createAutomation(automationData) {
    try {
      // Validate required fields
      validators.validateRequired(automationData, [
        'name', 'category', 'trigger', 'actions'
      ]);
      
      // Transform data
      const transformedData = transformers.transformAutomationForAPI(automationData);
      
      // Clear automation cache
      cacheUtils.clear('automations');
      
      return await crmAPI.createAutomation(transformedData);
    } catch (error) {
      throw errorHandler.handle(error, 'createAutomation');
    }
  },
  
  /**
   * Test automation
   * @param {string} automationId - Automation ID
   * @param {Object} testData - Test data
   * @returns {Promise<Object>} Test result
   */
  async testAutomation(automationId, testData = {}) {
    try {
      return await crmAPI.testAutomation(automationId, testData);
    } catch (error) {
      throw errorHandler.handle(error, 'testAutomation');
    }
  },
  
  // === UTILITIES ===
  
  /**
   * Clear all CRM cache
   */
  clearCache() {
    cacheUtils.clear();
  },
  
  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      size: cache.size,
      maxSize: CACHE_CONFIG.MAX_SIZE,
      ttl: CACHE_CONFIG.TTL
    };
  }
};

export default crmService;