/**
 * Mailgun Email Service
 *
 * This service handles:
 * - Email sending functionality
 * - Email validation and sanitization
 * - Template rendering with HTML support
 * - Attachment handling
 * - Delivery status tracking
 * - Error handling and retry logic
 * - Batch email sending
 * - Cost tracking
 */

import mailgunPackage from 'mailgun.js';
const { Mailgun } = mailgunPackage;
import FormData from '../../utils/form-data.js';
import fs from 'fs';
import path from 'path';
import Notification from '../../models/notification.model.js';
import NotificationDelivery from '../../models/notificationDelivery.model.js';
import mailgunConfig, {
  mailgunAccountConfig,
  emailServiceConfig,
  rateLimitConfig,
  webhookConfig,
  batchConfig,
  developmentConfig,
} from '../../config/mailgun.config.js';
import mailgunUtils from '../../utils/notification/mailgun.util.js';

class MailgunService {
  constructor(redisClient = null) {
    this.client = null;
    this.domain = null;
    this.redisClient = redisClient;
    this.isInitialized = false;
    this.logger = this.createLogger();
  }

  /**
   * Initializes the Mailgun service
   * @returns {Promise<boolean>} - Success status
   */
  async initialize() {
    try {
      // Validate configuration
      mailgunConfig.validate();

      // Initialize Mailgun client
      const mailgun = new Mailgun(FormData);
      this.client = mailgun.client({
        username: 'api',
        key: mailgunAccountConfig.apiKey,
      });
      this.domain = mailgunAccountConfig.domain;

      // Test connection
      await this.testConnection();

      this.isInitialized = true;
      this.logger.info('Mailgun service initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Mailgun service:', error);
      throw new Error(`Mailgun initialization failed: ${error.message}`);
    }
  }

  /**
   * Tests Mailgun connection
   * @returns {Promise<boolean>} - Connection status
   */
  async testConnection() {
    try {
      const domains = await this.client.domains.list();
      const domainExists = domains.items.some(
        (domain) => domain.name === this.domain
      );

      if (!domainExists) {
        throw new Error(`Domain ${this.domain} not found in Mailgun account`);
      }

      this.logger.info(`Connected to Mailgun with domain: ${this.domain}`);
      return true;
    } catch (error) {
      this.logger.error('Mailgun connection test failed:', error);
      throw new Error(`Mailgun connection failed: ${error.message}`);
    }
  }

  /**
   * Sends an email
   * @param {object} options - Email options
   * @returns {Promise<object>} - Send result
   */
  async sendEmail(options) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      to,
      subject,
      content,
      htmlContent,
      from = emailServiceConfig.defaultFrom,
      replyTo = emailServiceConfig.defaultReplyTo,
      attachments = [],
      variables = {},
      notificationId,
      userId,
      priority = 'medium',
    } = options;

    try {
      // Validate and format email addresses
      const emailValidation = mailgunUtils.email.validateMultiple(to);
      if (!emailValidation.valid) {
        throw new Error(`Invalid email addresses: ${emailValidation.error}`);
      }

      // Validate and process content
      const contentValidation = mailgunUtils.content.validate({
        subject,
        text: content,
        html: htmlContent,
      });
      if (!contentValidation.valid) {
        throw new Error(`Invalid content: ${contentValidation.error}`);
      }

      // Process content with variables
      const processedContent = mailgunUtils.content.replaceVariables(
        contentValidation.sanitized,
        variables
      );

      // Validate attachments
      const attachmentValidation =
        mailgunUtils.attachment.validateMultiple(attachments);
      if (!attachmentValidation.valid) {
        throw new Error(`Invalid attachments: ${attachmentValidation.error}`);
      }

      // Check rate limits
      for (const email of emailValidation.validEmails) {
        const rateLimitResult = await this.checkRateLimits(email, priority);
        if (!rateLimitResult.allowed) {
          throw new Error(
            `Rate limit exceeded for ${email}. Try again at ${rateLimitResult.resetTime}`
          );
        }
      }

      // Estimate cost
      const costEstimate = mailgunUtils.cost.estimateCost(
        emailValidation.validEmails[0],
        processedContent,
        attachmentValidation.validAttachments
      );

      // Create notification delivery record
      const deliveryRecord = await this.createDeliveryRecord({
        notificationId,
        channel: 'email',
        provider: 'mailgun',
        recipient: emailValidation.validEmails.join(', '),
        subject: processedContent.subject,
        content: processedContent.text || processedContent.html,
        costEstimate,
      });

      // Prepare message data
      const messageData = {
        from,
        to: emailValidation.validEmails.join(', '),
        subject: processedContent.subject,
        text: processedContent.text,
        html: processedContent.html,
        'h:Reply-To': replyTo,
        'o:tracking': emailServiceConfig.enableDeliveryTracking ? 'yes' : 'no',
        'o:tracking-clicks': emailServiceConfig.enableClickTracking
          ? 'htmlonly'
          : 'no',
        'o:tracking-opens': emailServiceConfig.enableOpenTracking
          ? 'yes'
          : 'no',
      };

      // Add attachments
      if (attachmentValidation.validAttachments.length > 0) {
        messageData.attachment = attachmentValidation.validAttachments.map(
          mailgunUtils.attachment.prepare
        );
      }

      // Add custom variables
      if (notificationId) {
        messageData['v:notification_id'] = notificationId;
      }
      if (userId) {
        messageData['v:user_id'] = userId;
      }

      this.logger.info(
        `Sending email to ${emailValidation.validEmails.join(', ')}`,
        {
          notificationId,
          subject: processedContent.subject,
          hasHtml: !!processedContent.html,
          hasAttachments: attachmentValidation.validAttachments.length > 0,
        }
      );

      // Send message
      const response = await this.client.messages.create(
        this.domain,
        messageData
      );

      // Update delivery record with response
      await deliveryRecord.markAsSent(response.id, {
        to: response.to,
        from: response.from,
        subject: response.subject,
        message: response.message,
      });

      // Calculate actual cost (Mailgun doesn't return cost in API response)
      const actualCost = costEstimate;
      if (actualCost && emailServiceConfig.enableCostTracking) {
        await deliveryRecord.setCost(actualCost.totalCost, actualCost.currency);
      }

      // Update notification status if notificationId is provided
      if (notificationId) {
        await this.updateNotificationStatus(notificationId, 'sent', {
          channel: 'email',
          externalId: response.id,
        });
      }

      this.logger.info(`Email sent successfully`, {
        messageId: response.id,
        status: response.message,
        to: response.to,
      });

      return {
        success: true,
        messageId: response.id,
        status: 'queued',
        provider: 'mailgun',
        cost: actualCost,
        deliveryRecordId: deliveryRecord._id,
      };
    } catch (error) {
      this.logger.error('Email sending failed:', error);

      // Update delivery record with error if it exists
      if (notificationId) {
        await this.handleSendError(notificationId, error, to);
      }

      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Sends emails in batch
   * @param {array} recipients - Array of recipient objects
   * @param {object} content - Email content
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Batch send result
   */
  async sendBatchEmail(recipients, content, options = {}) {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Recipients must be a non-empty array');
    }

    const {
      variables = {},
      notificationId,
      userId,
      priority = 'low',
      batchSize = batchConfig.batchSize,
      delayBetweenBatches = batchConfig.delayBetweenBatches,
    } = options;

    const results = {
      total: recipients.length,
      successful: 0,
      failed: 0,
      results: [],
      batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.logger.info(`Starting batch email send`, {
      totalRecipients: recipients.length,
      batchId: results.batchId,
    });

    // Process recipients in batches
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchPromises = batch.map(async (recipient) => {
        try {
          const recipientVariables = {
            ...variables,
            ...(recipient.variables || {}),
          };

          const result = await this.sendEmail({
            to: recipient.email || recipient.to,
            subject: recipient.subject || content.subject,
            content: recipient.content || content.text,
            htmlContent: recipient.htmlContent || content.html,
            variables: recipientVariables,
            notificationId,
            userId,
            priority,
            attachments: recipient.attachments || content.attachments || [],
          });

          return {
            success: true,
            recipient: recipient.email || recipient.to,
            messageId: result.messageId,
            result,
          };
        } catch (error) {
          return {
            success: false,
            recipient: recipient.email || recipient.to,
            error: error.message,
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      // Process batch results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.successful++;
          } else {
            results.failed++;
          }
          results.results.push(result.value);
        } else {
          results.failed++;
          results.results.push({
            success: false,
            error: result.reason.message,
          });
        }
      });

      // Delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenBatches)
        );
      }
    }

    this.logger.info(`Batch email send completed`, {
      batchId: results.batchId,
      successful: results.successful,
      failed: results.failed,
      total: results.total,
    });

    return results;
  }

  /**
   * Gets delivery status for a message
   * @param {string} messageId - Mailgun message ID
   * @returns {Promise<object>} - Delivery status
   */
  async getDeliveryStatus(messageId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const events = await this.client.events.get(this.domain, {
        limit: 1,
        message: messageId,
      });

      if (events.items.length === 0) {
        throw new Error('No events found for message');
      }

      const event = events.items[0];

      // Update delivery record
      const deliveryRecord = await NotificationDelivery.findOne({
        externalId: messageId,
        provider: 'mailgun',
      });

      if (deliveryRecord) {
        await this.updateDeliveryStatus(deliveryRecord, event);
      }

      return {
        messageId: event.message,
        event: event.event,
        timestamp: new Date(event.timestamp * 1000),
        recipient: event.recipient,
        severity: event.severity,
        tags: event.tags,
        deliveryStatus: event.deliveryStatus,
        transport: event.transport,
      };
    } catch (error) {
      this.logger.error('Failed to get delivery status:', error);
      throw new Error(`Failed to get delivery status: ${error.message}`);
    }
  }

  /**
   * Creates a notification delivery record
   * @param {object} data - Delivery record data
   * @returns {Promise<object>} - Created delivery record
   */
  async createDeliveryRecord(data) {
    try {
      const deliveryRecord = new NotificationDelivery({
        notificationId: data.notificationId,
        channel: data.channel,
        provider: data.provider,
        externalId: null, // Will be set after sending
        status: 'pending',
        recipient: data.recipient,
        cost: data.costEstimate,
        metadata: {
          subject: data.subject,
          content: data.content,
          originalContent: data.content,
        },
      });

      await deliveryRecord.markAsQueued();
      return deliveryRecord;
    } catch (error) {
      this.logger.error('Failed to create delivery record:', error);
      throw new Error(`Failed to create delivery record: ${error.message}`);
    }
  }

  /**
   * Updates delivery status based on Mailgun webhook or API response
   * @param {object} deliveryRecord - Delivery record to update
   * @param {object} eventData - Mailgun event data
   * @returns {Promise<object>} - Updated delivery record
   */
  async updateDeliveryStatus(deliveryRecord, eventData) {
    try {
      const event = eventData.event;

      switch (event) {
        case 'accepted':
          await deliveryRecord.markAsQueued();
          break;

        case 'rejected':
          await deliveryRecord.markAsFailed(
            {
              code: eventData.rejection?.reason || 'rejected',
              message: eventData.rejection?.description || 'Message rejected',
              details: eventData,
            },
            eventData
          );
          break;

        case 'delivered':
          await deliveryRecord.markAsDelivered(eventData);

          // Update notification status if needed
          if (deliveryRecord.notificationId) {
            await this.updateNotificationStatus(
              deliveryRecord.notificationId,
              'delivered',
              {
                channel: 'email',
                externalId: eventData.message,
              }
            );
          }
          break;

        case 'opened':
          await deliveryRecord.markAsRead(eventData);
          break;

        case 'clicked':
          await deliveryRecord.recordClick({
            timestamp: new Date(eventData.timestamp * 1000),
            url: eventData.url,
            userAgent: eventData.userAgent,
            ipAddress: eventData.ip,
          });
          break;

        case 'bounced':
        case 'failed':
          await deliveryRecord.markAsFailed(
            {
              code: eventData.reason || 'bounced',
              message: eventData.description || 'Message bounced',
              details: eventData,
            },
            eventData
          );

          // Update notification status if needed
          if (deliveryRecord.notificationId) {
            await this.updateNotificationStatus(
              deliveryRecord.notificationId,
              'failed',
              {
                channel: 'email',
                externalId: eventData.message,
                error: {
                  code: eventData.reason || 'bounced',
                  message: eventData.description || 'Message bounced',
                },
              }
            );
          }
          break;

        case 'complained':
          await deliveryRecord.markAsFailed(
            {
              code: 'complained',
              message: 'Recipient marked as spam',
              details: eventData,
            },
            eventData
          );
          break;

        case 'unsubscribed':
          await deliveryRecord.markAsFailed(
            {
              code: 'unsubscribed',
              message: 'Recipient unsubscribed',
              details: eventData,
            },
            eventData
          );
          break;

        default:
          this.logger.warn(`Unknown event: ${event}`, {
            messageId: eventData.message,
          });
      }

      return deliveryRecord;
    } catch (error) {
      this.logger.error('Failed to update delivery status:', error);
      throw new Error(`Failed to update delivery status: ${error.message}`);
    }
  }

  /**
   * Updates notification status
   * @param {string} notificationId - Notification ID
   * @param {string} status - New status
   * @param {object} data - Additional data
   * @returns {Promise<object>} - Updated notification
   */
  async updateNotificationStatus(notificationId, status, data = {}) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        this.logger.warn(`Notification not found: ${notificationId}`);
        return null;
      }

      switch (status) {
        case 'sent':
          await notification.markAsSent(data.channel, data.externalId);
          break;
        case 'delivered':
          await notification.markAsDelivered(data.channel, data.externalId);
          break;
        case 'failed':
          await notification.markAsFailed(data.error, data.channel);
          break;
        default:
          this.logger.warn(`Unknown notification status: ${status}`);
      }

      return notification;
    } catch (error) {
      this.logger.error('Failed to update notification status:', error);
      throw new Error(`Failed to update notification status: ${error.message}`);
    }
  }

  /**
   * Checks rate limits for an email address
   * @param {string} email - Email address
   * @param {string} priority - Message priority
   * @returns {Promise<object>} - Rate limit check result
   */
  async checkRateLimits(email, priority) {
    if (!this.redisClient) {
      return { allowed: true, remaining: Infinity, resetTime: null };
    }

    try {
      // Check all rate limits
      const checks = await Promise.all([
        mailgunUtils.rateLimit.checkLimit(
          email,
          rateLimitConfig.perSecond,
          this.redisClient
        ),
        mailgunUtils.rateLimit.checkLimit(
          email,
          rateLimitConfig.perMinute,
          this.redisClient
        ),
        mailgunUtils.rateLimit.checkLimit(
          email,
          rateLimitConfig.perHour,
          this.redisClient
        ),
        mailgunUtils.rateLimit.checkLimit(
          email,
          rateLimitConfig.perDay,
          this.redisClient
        ),
      ]);

      // Find most restrictive limit
      const mostRestrictive = checks.reduce((most, current) => {
        if (!current.allowed && most.allowed) {
          return current;
        }
        if (current.allowed && !most.allowed) {
          return most;
        }
        return current.remaining < most.remaining ? current : most;
      });

      return mostRestrictive;
    } catch (error) {
      this.logger.error('Rate limit check failed:', error);
      // Allow request if rate limiting fails
      return { allowed: true, remaining: Infinity, resetTime: null };
    }
  }

  /**
   * Handles send errors
   * @param {string} notificationId - Notification ID
   * @param {object} error - Error object
   * @param {string|array} emailAddresses - Email addresses
   * @returns {Promise<void>}
   */
  async handleSendError(notificationId, error, emailAddresses) {
    try {
      const errorClassification = mailgunUtils.error.classifyError(error);
      const emails = Array.isArray(emailAddresses)
        ? emailAddresses
        : [emailAddresses];

      for (const email of emails) {
        // Find delivery record
        const deliveryRecord = await NotificationDelivery.findOne({
          notificationId,
          recipient: email,
          channel: 'email',
          provider: 'mailgun',
        });

        if (deliveryRecord) {
          await deliveryRecord.markAsFailed({
            code: errorClassification.code,
            message: errorClassification.message,
            details: error,
          });
        }
      }

      // Update notification status
      await this.updateNotificationStatus(notificationId, 'failed', {
        channel: 'email',
        error: {
          code: errorClassification.code,
          message: errorClassification.message,
          isRetryable: errorClassification.isRetryable,
        },
      });

      // Log error for monitoring
      this.logger.error('Email send error handled', {
        notificationId,
        emailAddresses,
        errorCode: errorClassification.code,
        errorMessage: errorClassification.message,
        isRetryable: errorClassification.isRetryable,
      });
    } catch (handleError) {
      this.logger.error('Failed to handle send error:', handleError);
    }
  }

  /**
   * Creates a logger instance
   * @returns {object} - Logger instance
   */
  createLogger() {
    if (!developmentConfig.logging.enabled) {
      return {
        info: () => {},
        warn: () => {},
        error: () => {},
      };
    }

    return {
      info: (message, data = {}) => {
        console.log(
          `[MailgunService] INFO: ${message}`,
          developmentConfig.logging.includeRequestBody ? data : {}
        );
      },
      warn: (message, data = {}) => {
        console.warn(
          `[MailgunService] WARN: ${message}`,
          developmentConfig.logging.includeRequestBody ? data : {}
        );
      },
      error: (message, error) => {
        console.error(
          `[MailgunService] ERROR: ${message}`,
          developmentConfig.logging.includeRequestBody ? error : error.message
        );
      },
    };
  }

  /**
   * Gets service statistics
   * @returns {Promise<object>} - Service statistics
   */
  async getStatistics() {
    try {
      const stats = await NotificationDelivery.getDeliveryStats({
        channel: 'email',
        provider: 'mailgun',
      });

      return {
        provider: 'mailgun',
        channel: 'email',
        isInitialized: this.isInitialized,
        domain: this.domain,
        ...stats[0], // Get first (and only) result from aggregation
      };
    } catch (error) {
      this.logger.error('Failed to get statistics:', error);
      return {
        provider: 'mailgun',
        channel: 'email',
        isInitialized: this.isInitialized,
        domain: this.domain,
        error: error.message,
      };
    }
  }
}

export default MailgunService;
