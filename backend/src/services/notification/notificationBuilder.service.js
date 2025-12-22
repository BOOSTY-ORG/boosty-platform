/**
 * Notification Builder Service
 *
 * This service provides a fluent interface for building notifications:
 * - Template selection and variable substitution
 * - Channel-specific content adaptation
 * - Recipient resolution and validation
 * - Priority and scheduling configuration
 * - Multi-language support
 * - Content personalization
 */

import NotificationTemplate from '../../models/notificationTemplate.model.js';
import User from '../../models/user.model.js';
import UserNotificationPreferences from '../../models/userNotificationPreferences.model.js';
import NotificationPreferencesService from './notificationPreferences.service.js';
import NotificationTemplateService from './notificationTemplate.service.js';

class NotificationBuilder {
  constructor() {
    this.preferencesService = new NotificationPreferencesService();
    this.templateService = new NotificationTemplateService();
    this.reset();
  }

  /**
   * Reset builder to initial state
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  reset() {
    this.data = {
      userId: null,
      type: null,
      channels: [],
      recipient: {},
      subject: null,
      content: null,
      htmlContent: null,
      category: null,
      priority: 'medium',
      templateId: null,
      variables: {},
      scheduledAt: null,
      metadata: {},
      sentBy: 'system',
      source: 'manual',
      batchId: null,
      language: 'en',
    };

    this.errors = [];
    this.warnings = [];

    return this;
  }

  /**
   * Set the user ID for the notification
   * @param {string} userId - User ID
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  toUser(userId) {
    this.data.userId = userId;
    return this;
  }

  /**
   * Set the notification type
   * @param {string} type - Notification type (email, sms, in_app, push_notification)
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  ofType(type) {
    const validTypes = ['email', 'sms', 'in_app', 'push_notification'];

    if (!validTypes.includes(type)) {
      this.errors.push(`Invalid notification type: ${type}`);
    } else {
      this.data.type = type;
    }

    return this;
  }

  /**
   * Set the notification channels
   * @param {array} channels - Array of channels
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  viaChannels(channels) {
    const validChannels = ['email', 'sms', 'in_app', 'push_notification'];
    const invalidChannels = channels.filter(
      (ch) => !validChannels.includes(ch)
    );

    if (invalidChannels.length > 0) {
      this.errors.push(`Invalid channels: ${invalidChannels.join(', ')}`);
    } else {
      this.data.channels = [...channels];
    }

    return this;
  }

  /**
   * Add a single channel
   * @param {string} channel - Channel to add
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  viaChannel(channel) {
    if (!this.data.channels.includes(channel)) {
      this.data.channels.push(channel);
    }
    return this;
  }

  /**
   * Set the notification recipient
   * @param {object} recipient - Recipient information
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  to(recipient) {
    this.data.recipient = { ...recipient };
    return this;
  }

  /**
   * Set the notification subject
   * @param {string} subject - Notification subject
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  withSubject(subject) {
    this.data.subject = subject;
    return this;
  }

  /**
   * Set the notification content
   * @param {string} content - Text content
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  withContent(content) {
    this.data.content = content;
    return this;
  }

  /**
   * Set the HTML content for email notifications
   * @param {string} htmlContent - HTML content
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  withHtmlContent(htmlContent) {
    this.data.htmlContent = htmlContent;
    return this;
  }

  /**
   * Set the notification category
   * @param {string} category - Notification category
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  inCategory(category) {
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

    if (!validCategories.includes(category)) {
      this.errors.push(`Invalid category: ${category}`);
    } else {
      this.data.category = category;
    }

    return this;
  }

  /**
   * Set the notification priority
   * @param {string} priority - Notification priority (low, medium, high, urgent)
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  withPriority(priority) {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];

    if (!validPriorities.includes(priority)) {
      this.errors.push(`Invalid priority: ${priority}`);
    } else {
      this.data.priority = priority;
    }

    return this;
  }

  /**
   * Set the template to use
   * @param {string} templateId - Template ID
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  usingTemplate(templateId) {
    this.data.templateId = templateId;
    return this;
  }

  /**
   * Set template variables
   * @param {object} variables - Template variables
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  withVariables(variables) {
    this.data.variables = { ...this.data.variables, ...variables };
    return this;
  }

  /**
   * Add a single template variable
   * @param {string} name - Variable name
   * @param {*} value - Variable value
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  withVariable(name, value) {
    this.data.variables[name] = value;
    return this;
  }

  /**
   * Schedule the notification for future delivery
   * @param {Date} scheduledAt - When to send the notification
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  scheduleFor(scheduledAt) {
    if (!(scheduledAt instanceof Date) || scheduledAt <= new Date()) {
      this.errors.push('Scheduled time must be a future Date');
    } else {
      this.data.scheduledAt = scheduledAt;
    }

    return this;
  }

  /**
   * Set metadata for the notification
   * @param {object} metadata - Metadata object
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  withMetadata(metadata) {
    this.data.metadata = { ...this.data.metadata, ...metadata };
    return this;
  }

  /**
   * Set who is sending the notification
   * @param {string} sentBy - Sender identifier
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  sentBy(sentBy) {
    this.data.sentBy = sentBy;
    return this;
  }

  /**
   * Set the notification source
   * @param {string} source - Source (manual, automated, bulk, template, trigger)
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  fromSource(source) {
    const validSources = ['manual', 'automated', 'bulk', 'template', 'trigger'];

    if (!validSources.includes(source)) {
      this.errors.push(`Invalid source: ${source}`);
    } else {
      this.data.source = source;
    }

    return this;
  }

  /**
   * Set the batch ID for bulk operations
   * @param {string} batchId - Batch ID
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  inBatch(batchId) {
    this.data.batchId = batchId;
    return this;
  }

  /**
   * Set the language for the notification
   * @param {string} language - Language code
   * @returns {NotificationBuilder} - Builder instance for chaining
   */
  inLanguage(language) {
    this.data.language = language;
    return this;
  }

  /**
   * Build the notification data with validation
   * @returns {object} - Built notification data
   */
  async build() {
    // Clear previous errors and warnings
    this.errors = [];
    this.warnings = [];

    // Validate required fields
    this.validateRequiredFields();

    // Resolve recipient information if userId is provided
    if (this.data.userId && Object.keys(this.data.recipient).length === 0) {
      await this.resolveRecipient();
    }

    // Process template if templateId is provided
    if (this.data.templateId) {
      await this.processTemplate();
    }

    // Adapt content for channels
    this.adaptContentForChannels();

    // Validate against user preferences
    await this.validateAgainstPreferences();

    // Return result with any errors or warnings
    return {
      data: this.data,
      errors: this.errors,
      warnings: this.warnings,
      isValid: this.errors.length === 0,
    };
  }

  /**
   * Validate required fields
   */
  validateRequiredFields() {
    const required = ['userId', 'type', 'content', 'category'];
    const missing = required.filter((field) => !this.data[field]);

    if (missing.length > 0) {
      this.errors.push(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate channels
    if (!this.data.channels || this.data.channels.length === 0) {
      this.errors.push('At least one channel is required');
    }
  }

  /**
   * Resolve recipient information from user data
   */
  async resolveRecipient() {
    try {
      const user = await User.findById(this.data.userId);
      if (!user) {
        this.errors.push(`User not found: ${this.data.userId}`);
        return;
      }

      this.data.recipient = {
        email: user.email,
        phone: user.phone,
      };

      // Add user information to variables
      this.data.variables.userName = user.name;
      this.data.variables.userEmail = user.email;
      this.data.variables.userId = user._id.toString();
    } catch (error) {
      this.errors.push(`Failed to resolve recipient: ${error.message}`);
    }
  }

  /**
   * Process template and render content
   */
  async processTemplate() {
    try {
      // Get template
      const template = await NotificationTemplate.findById(
        this.data.templateId
      );
      if (!template) {
        this.errors.push(`Template not found: ${this.data.templateId}`);
        return;
      }

      if (!template.isActive) {
        this.errors.push(`Template is not active: ${this.data.templateId}`);
        return;
      }

      // Validate template variables
      const validation = template.validateVariables(this.data.variables);
      if (!validation.isValid) {
        this.errors.push(...validation.errors);
      }

      if (validation.warnings.length > 0) {
        this.warnings.push(...validation.warnings);
      }

      // Render template
      const rendered = template.renderContent(this.data.variables);

      // Set content from template if not explicitly set
      if (!this.data.subject) {
        this.data.subject = rendered.subject;
      }
      if (!this.data.content) {
        this.data.content = rendered.content;
      }
      if (!this.data.htmlContent) {
        this.data.htmlContent = rendered.htmlContent;
      }

      // Set type, category, and priority from template if not explicitly set
      if (!this.data.type) {
        this.data.type = template.type;
      }
      if (!this.data.category) {
        this.data.category = template.category;
      }
      if (this.data.priority === 'medium') {
        // Only use template priority if default
        this.data.priority = template.priority;
      }
    } catch (error) {
      this.errors.push(`Failed to process template: ${error.message}`);
    }
  }

  /**
   * Adapt content for different channels
   */
  adaptContentForChannels() {
    // No adaptation needed for in_app and push_notification
    if (this.data.channels.includes('sms')) {
      // Truncate content for SMS if too long
      if (this.data.content && this.data.content.length > 1600) {
        this.warnings.push('Content truncated for SMS (max 1600 characters)');
        this.data.smsContent = this.data.content.substring(0, 1597) + '...';
      } else {
        this.data.smsContent = this.data.content;
      }
    }

    if (this.data.channels.includes('email')) {
      // Ensure HTML content exists for email
      if (!this.data.htmlContent && this.data.content) {
        this.warnings.push(
          'HTML content generated from text content for email'
        );
        this.data.htmlContent = `<p>${this.data.content.replace(/\n/g, '<br>')}</p>`;
      }
    }
  }

  /**
   * Validate against user preferences
   */
  async validateAgainstPreferences() {
    if (!this.data.userId) {
      return;
    }

    try {
      const preferences = await this.preferencesService.getOrCreatePreferences(
        this.data.userId
      );

      // Check global enabled status
      if (!preferences.globalEnabled) {
        this.warnings.push('Notifications are disabled for this user');
        return;
      }

      // Check quiet hours
      if (preferences.isInQuietHours && this.data.priority !== 'urgent') {
        this.warnings.push('Notifications are not allowed during quiet hours');
        return;
      }

      // Check category preferences
      if (!preferences.isCategoryEnabled(this.data.category)) {
        this.warnings.push(
          `${this.data.category} notifications are disabled for this user`
        );
        return;
      }

      // Get enabled channels for this category
      const enabledChannels = preferences.getEnabledChannelsForCategory(
        this.data.category
      );

      // Filter channels based on user preferences
      const validChannels = this.data.channels.filter((channel) => {
        if (!enabledChannels.includes(channel)) {
          return false;
        }

        // Check channel-specific preferences
        if (
          channel === 'email' &&
          (!preferences.channels.email.enabled ||
            !preferences.channels.email.verified)
        ) {
          return false;
        }

        if (
          channel === 'sms' &&
          (!preferences.channels.sms.enabled ||
            !preferences.channels.sms.verified)
        ) {
          return false;
        }

        if (
          channel === 'push_notification' &&
          (!preferences.channels.pushNotification.enabled ||
            preferences.activeDeviceTokens.length === 0)
        ) {
          return false;
        }

        return true;
      });

      if (validChannels.length === 0) {
        this.warnings.push(
          'No enabled channels available for this notification'
        );
      } else if (validChannels.length < this.data.channels.length) {
        const filteredChannels = this.data.channels.filter(
          (ch) => !validChannels.includes(ch)
        );
        this.warnings.push(
          `Channels filtered by preferences: ${filteredChannels.join(', ')}`
        );
        this.data.channels = validChannels;
      }
    } catch (error) {
      this.warnings.push(`Failed to validate preferences: ${error.message}`);
    }
  }

  /**
   * Create a new builder instance
   * @returns {NotificationBuilder} - New builder instance
   */
  static create() {
    return new NotificationBuilder();
  }

  /**
   * Create a builder from existing notification data
   * @param {object} notificationData - Existing notification data
   * @returns {NotificationBuilder} - Builder instance with data pre-populated
   */
  static from(notificationData) {
    const builder = new NotificationBuilder();
    builder.data = { ...notificationData };
    return builder;
  }
}

export default NotificationBuilder;
