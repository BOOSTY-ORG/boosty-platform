/**
 * Notification Template Service
 *
 * This service handles template operations:
 * - Template selection and rendering
 * - Variable validation and substitution
 * - Multi-language support
 * - Template versioning
 * - A/B testing support
 * - Template management and lifecycle
 */

import NotificationTemplate from '../../models/notificationTemplate.model.js';
import Notification from '../../models/notification.model.js';
import NotificationPreferencesService from './notificationPreferences.service.js';

class NotificationTemplateService {
  constructor() {
    this.preferencesService = new NotificationPreferencesService();
    this.logger = this.createLogger();
  }

  /**
   * Get a template by ID
   * @param {string} templateId - Template ID
   * @returns {Promise<object>} - Template object
   */
  async getTemplate(templateId) {
    try {
      const template = await NotificationTemplate.findById(templateId);

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      return template;
    } catch (error) {
      this.logger.error('Failed to get template', {
        error: error.message,
        templateId,
      });
      throw new Error(`Failed to get template: ${error.message}`);
    }
  }

  /**
   * Get active templates with filtering
   * @param {object} filters - Filter options
   * @returns {Promise<Array>} - Array of templates
   */
  async getActiveTemplates(filters = {}) {
    try {
      const templates = await NotificationTemplate.findActive(filters);
      return templates;
    } catch (error) {
      this.logger.error('Failed to get active templates', {
        error: error.message,
        filters,
      });
      throw new Error(`Failed to get active templates: ${error.message}`);
    }
  }

  /**
   * Get templates by category
   * @param {string} category - Template category
   * @param {boolean} activeOnly - Get only active templates
   * @returns {Promise<Array>} - Array of templates
   */
  async getTemplatesByCategory(category, activeOnly = true) {
    try {
      const templates = await NotificationTemplate.findByCategory(
        category,
        activeOnly
      );
      return templates;
    } catch (error) {
      this.logger.error('Failed to get templates by category', {
        error: error.message,
        category,
      });
      throw new Error(`Failed to get templates by category: ${error.message}`);
    }
  }

  /**
   * Create a new template
   * @param {object} templateData - Template data
   * @returns {Promise<object>} - Created template
   */
  async createTemplate(templateData) {
    try {
      // Validate template data
      const validation = this.validateTemplateData(templateData);
      if (!validation.isValid) {
        throw new Error(
          `Invalid template data: ${validation.errors.join(', ')}`
        );
      }

      // Create template
      const template = new NotificationTemplate({
        name: templateData.name,
        description: templateData.description,
        type: templateData.type,
        category: templateData.category,
        priority: templateData.priority || 'medium',
        subject: templateData.subject,
        content: templateData.content,
        htmlContent: templateData.htmlContent,
        variables: templateData.variables || [],
        isActive:
          templateData.isActive !== undefined ? templateData.isActive : true,
        isSystem: templateData.isSystem || false,
        tags: templateData.tags || [],
        metadata: templateData.metadata || {},
        createdBy: templateData.createdBy || 'system',
      });

      await template.save();

      this.logger.info('Template created successfully', {
        templateId: template._id,
        name: template.name,
        type: template.type,
        category: template.category,
      });

      return template;
    } catch (error) {
      this.logger.error('Failed to create template', {
        error: error.message,
        templateData,
      });
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Update an existing template
   * @param {string} templateId - Template ID
   * @param {object} updateData - Data to update
   * @returns {Promise<object>} - Updated template
   */
  async updateTemplate(templateId, updateData) {
    try {
      const template = await NotificationTemplate.findById(templateId);

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Validate update data
      const validation = this.validateTemplateData(updateData, true);
      if (!validation.isValid) {
        throw new Error(`Invalid update data: ${validation.errors.join(', ')}`);
      }

      // Update template
      Object.keys(updateData).forEach((key) => {
        if (key !== 'id' && key !== '_id') {
          template[key] = updateData[key];
        }
      });

      template.updatedBy = updateData.updatedBy || 'system';
      template.lastUpdated = new Date();

      await template.save();

      this.logger.info('Template updated successfully', {
        templateId: template._id,
        name: template.name,
        updatedFields: Object.keys(updateData),
      });

      return template;
    } catch (error) {
      this.logger.error('Failed to update template', {
        error: error.message,
        templateId,
      });
      throw new Error(`Failed to update template: ${error.message}`);
    }
  }

  /**
   * Delete a template
   * @param {string} templateId - Template ID
   * @returns {Promise<object>} - Result
   */
  async deleteTemplate(templateId) {
    try {
      const template = await NotificationTemplate.findById(templateId);

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      if (template.isSystem) {
        throw new Error('Cannot delete system template');
      }

      // Check if template is in use
      const usageCount = await Notification.countDocuments({
        templateId,
        status: { $in: ['pending', 'queued', 'processing'] },
      });

      if (usageCount > 0) {
        throw new Error(
          `Cannot delete template in use (${usageCount} pending notifications)`
        );
      }

      await NotificationTemplate.findByIdAndDelete(templateId);

      this.logger.info('Template deleted successfully', {
        templateId,
        name: template.name,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to delete template', {
        error: error.message,
        templateId,
      });
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }

  /**
   * Render a template with variables
   * @param {string} templateId - Template ID
   * @param {object} variables - Variables for substitution
   * @param {string} language - Language code
   * @returns {Promise<object>} - Rendered content
   */
  async renderTemplate(templateId, variables = {}, language = 'en') {
    try {
      // Get template
      const template = await this.getTemplate(templateId);

      if (!template.isActive) {
        throw new Error(`Template is not active: ${templateId}`);
      }

      // Validate variables
      const validation = template.validateVariables(variables);
      if (!validation.isValid) {
        throw new Error(
          `Template variables validation failed: ${validation.errors.join(', ')}`
        );
      }

      // Render template
      const rendered = template.renderContent(variables);

      // Update usage statistics
      await template.incrementUsage();

      this.logger.info('Template rendered successfully', {
        templateId,
        name: template.name,
        variableCount: Object.keys(variables).length,
      });

      return {
        templateId,
        name: template.name,
        type: template.type,
        category: template.category,
        priority: template.priority,
        subject: rendered.subject,
        content: rendered.content,
        htmlContent: rendered.htmlContent,
        variables: template.variables,
        language,
      };
    } catch (error) {
      this.logger.error('Failed to render template', {
        error: error.message,
        templateId,
      });
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  /**
   * Test a template with variables
   * @param {string} templateId - Template ID
   * @param {object} variables - Variables for substitution
   * @returns {Promise<object>} - Test result
   */
  async testTemplate(templateId, variables = {}) {
    try {
      // Get template
      const template = await this.getTemplate(templateId);

      // Validate variables
      const validation = template.validateVariables(variables);

      // Render template
      const rendered = template.renderContent(variables);

      return {
        template: {
          id: template._id,
          name: template.name,
          type: template.type,
          category: template.category,
        },
        originalContent: template.content,
        originalSubject: template.subject,
        originalHtmlContent: template.htmlContent,
        renderedContent: rendered.content,
        renderedSubject: rendered.subject,
        renderedHtmlContent: rendered.htmlContent,
        variables: template.variables,
        providedVariables: variables,
        validation,
      };
    } catch (error) {
      this.logger.error('Failed to test template', {
        error: error.message,
        templateId,
      });
      throw new Error(`Failed to test template: ${error.message}`);
    }
  }

  /**
   * Duplicate a template
   * @param {string} templateId - Template ID to duplicate
   * @param {string} newName - New template name
   * @param {string} createdBy - Creator
   * @returns {Promise<object>} - Duplicated template
   */
  async duplicateTemplate(templateId, newName, createdBy) {
    try {
      const template = await this.getTemplate(templateId);

      const duplicatedTemplate = await template.duplicate(newName, createdBy);

      this.logger.info('Template duplicated successfully', {
        originalTemplateId: templateId,
        newTemplateId: duplicatedTemplate._id,
        newName,
      });

      return duplicatedTemplate;
    } catch (error) {
      this.logger.error('Failed to duplicate template', {
        error: error.message,
        templateId,
      });
      throw new Error(`Failed to duplicate template: ${error.message}`);
    }
  }

  /**
   * Create a new version of a template
   * @param {string} templateId - Template ID
   * @param {string} version - New version number
   * @param {string} updatedBy - Updater
   * @returns {Promise<object>} - New version template
   */
  async createTemplateVersion(templateId, version, updatedBy) {
    try {
      const template = await this.getTemplate(templateId);

      const versionedTemplate = await template.createVersion(
        version,
        updatedBy
      );

      this.logger.info('Template version created successfully', {
        parentTemplateId: templateId,
        newTemplateId: versionedTemplate._id,
        version,
      });

      return versionedTemplate;
    } catch (error) {
      this.logger.error('Failed to create template version', {
        error: error.message,
        templateId,
      });
      throw new Error(`Failed to create template version: ${error.message}`);
    }
  }

  /**
   * Get template versions
   * @param {string} parentTemplateId - Parent template ID
   * @returns {Promise<Array>} - Array of template versions
   */
  async getTemplateVersions(parentTemplateId) {
    try {
      const versions = await NotificationTemplate.getVersions(parentTemplateId);
      return versions;
    } catch (error) {
      this.logger.error('Failed to get template versions', {
        error: error.message,
        parentTemplateId,
      });
      throw new Error(`Failed to get template versions: ${error.message}`);
    }
  }

  /**
   * Approve a template
   * @param {string} templateId - Template ID
   * @param {string} approvedBy - Approver
   * @returns {Promise<object>} - Result
   */
  async approveTemplate(templateId, approvedBy) {
    try {
      const template = await this.getTemplate(templateId);

      await template.approve(approvedBy);

      this.logger.info('Template approved successfully', {
        templateId,
        name: template.name,
        approvedBy,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to approve template', {
        error: error.message,
        templateId,
      });
      throw new Error(`Failed to approve template: ${error.message}`);
    }
  }

  /**
   * Deactivate a template
   * @param {string} templateId - Template ID
   * @returns {Promise<object>} - Result
   */
  async deactivateTemplate(templateId) {
    try {
      const template = await this.getTemplate(templateId);

      await template.deactivate();

      this.logger.info('Template deactivated successfully', {
        templateId,
        name: template.name,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to deactivate template', {
        error: error.message,
        templateId,
      });
      throw new Error(`Failed to deactivate template: ${error.message}`);
    }
  }

  /**
   * Activate a template
   * @param {string} templateId - Template ID
   * @returns {Promise<object>} - Result
   */
  async activateTemplate(templateId) {
    try {
      const template = await this.getTemplate(templateId);

      await template.activate();

      this.logger.info('Template activated successfully', {
        templateId,
        name: template.name,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to activate template', {
        error: error.message,
        templateId,
      });
      throw new Error(`Failed to activate template: ${error.message}`);
    }
  }

  /**
   * Get popular templates
   * @param {number} limit - Number of templates to return
   * @returns {Promise<Array>} - Array of popular templates
   */
  async getPopularTemplates(limit = 10) {
    try {
      const templates = await NotificationTemplate.getPopular(limit);
      return templates;
    } catch (error) {
      this.logger.error('Failed to get popular templates', {
        error: error.message,
        limit,
      });
      throw new Error(`Failed to get popular templates: ${error.message}`);
    }
  }

  /**
   * Get system templates
   * @returns {Promise<Array>} - Array of system templates
   */
  async getSystemTemplates() {
    try {
      const templates = await NotificationTemplate.getSystemTemplates();
      return templates;
    } catch (error) {
      this.logger.error('Failed to get system templates', {
        error: error.message,
      });
      throw new Error(`Failed to get system templates: ${error.message}`);
    }
  }

  /**
   * Search templates
   * @param {string} searchTerm - Search term
   * @param {object} options - Search options
   * @returns {Promise<Array>} - Array of matching templates
   */
  async searchTemplates(searchTerm, options = {}) {
    try {
      const templates = await NotificationTemplate.search(searchTerm, options);
      return templates;
    } catch (error) {
      this.logger.error('Failed to search templates', {
        error: error.message,
        searchTerm,
        options,
      });
      throw new Error(`Failed to search templates: ${error.message}`);
    }
  }

  /**
   * Get templates by tag
   * @param {string} tag - Tag to search for
   * @returns {Promise<Array>} - Array of templates with the tag
   */
  async getTemplatesByTag(tag) {
    try {
      const templates = await NotificationTemplate.findByTag(tag);
      return templates;
    } catch (error) {
      this.logger.error('Failed to get templates by tag', {
        error: error.message,
        tag,
      });
      throw new Error(`Failed to get templates by tag: ${error.message}`);
    }
  }

  /**
   * Validate template data
   * @param {object} templateData - Template data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {object} - Validation result
   */
  validateTemplateData(templateData, isUpdate = false) {
    const errors = [];
    const warnings = [];

    // Check required fields for create
    if (!isUpdate) {
      const required = ['name', 'type', 'category', 'content'];
      const missing = required.filter((field) => !templateData[field]);

      if (missing.length > 0) {
        errors.push(`Missing required fields: ${missing.join(', ')}`);
      }
    }

    // Validate type
    if (templateData.type) {
      const validTypes = ['email', 'sms', 'in_app', 'push_notification'];
      if (!validTypes.includes(templateData.type)) {
        errors.push(`Invalid type: ${templateData.type}`);
      }
    }

    // Validate category
    if (templateData.category) {
      const validCategories = [
        'welcome',
        'application',
        'kyc',
        'payment',
        'support',
        'marketing',
        'general',
        'alert',
        'reminder',
      ];
      if (!validCategories.includes(templateData.category)) {
        errors.push(`Invalid category: ${templateData.category}`);
      }
    }

    // Validate priority
    if (templateData.priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(templateData.priority)) {
        errors.push(`Invalid priority: ${templateData.priority}`);
      }
    }

    // Validate variables
    if (templateData.variables && Array.isArray(templateData.variables)) {
      templateData.variables.forEach((variable, index) => {
        if (!variable.name) {
          errors.push(`Variable at index ${index} missing name`);
        }

        if (variable.type) {
          const validTypes = [
            'text',
            'number',
            'date',
            'boolean',
            'select',
            'object',
          ];
          if (!validTypes.includes(variable.type)) {
            errors.push(
              `Variable ${variable.name} has invalid type: ${variable.type}`
            );
          }
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get template statistics
   * @param {object} options - Statistics options
   * @returns {Promise<object>} - Template statistics
   */
  async getTemplateStatistics(options = {}) {
    try {
      const { dateRange, category, type } = options;

      // Get template usage statistics
      const pipeline = [
        {
          $group: {
            _id: null,
            totalTemplates: { $sum: 1 },
            activeTemplates: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
            },
            systemTemplates: {
              $sum: { $cond: [{ $eq: ['$isSystem', true] }, 1, 0] },
            },
            totalUsage: { $sum: '$usageCount' },
            avgUsage: { $avg: '$usageCount' },
            byType: {
              $push: {
                type: '$type',
                usage: '$usageCount',
              },
            },
            byCategory: {
              $push: {
                category: '$category',
                usage: '$usageCount',
              },
            },
          },
        },
      ];

      // Add date range filter if provided
      if (dateRange) {
        pipeline.unshift({
          $match: {
            createdAt: {
              $gte: new Date(dateRange.start),
              $lte: new Date(dateRange.end),
            },
          },
        });
      }

      // Add category filter if provided
      if (category) {
        pipeline.unshift({
          $match: { category },
        });
      }

      // Add type filter if provided
      if (type) {
        pipeline.unshift({
          $match: { type },
        });
      }

      const [stats] = await NotificationTemplate.aggregate(pipeline);

      return stats || {
        totalTemplates: 0,
        activeTemplates: 0,
        systemTemplates: 0,
        totalUsage: 0,
        avgUsage: 0,
        byType: [],
        byCategory: [],
      };
    } catch (error) {
      this.logger.error('Failed to get template statistics', {
        error: error.message,
        options,
      });
      throw new Error(`Failed to get template statistics: ${error.message}`);
    }
  }

  /**
   * Create a logger instance
   * @returns {object} - Logger instance
   */
  createLogger() {
    return {
      info: (message, data = {}) => {
        console.log(`[NotificationTemplateService] INFO: ${message}`, data);
      },
      warn: (message, data = {}) => {
        console.warn(`[NotificationTemplateService] WARN: ${message}`, data);
      },
      error: (message, error) => {
        console.error(`[NotificationTemplateService] ERROR: ${message}`, error);
      },
    };
  }
}

export default NotificationTemplateService;
