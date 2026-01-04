/**
 * Twilio SMS Service
 *
 * This service handles:
 * - SMS sending functionality
 * - Phone number validation
 * - Delivery status tracking
 * - Error handling and retry logic
 * - Message personalization
 * - Batch SMS sending
 * - SMS template rendering
 * - Cost tracking
 */

import twilioPackage from 'twilio';
const { Twilio } = twilioPackage;
import Notification from '../../models/notification.model.js';
import NotificationDelivery from '../../models/notificationDelivery.model.js';
import twilioConfig, {
  twilioAccountConfig,
  smsServiceConfig,
  rateLimitConfig,
  webhookConfig,
  developmentConfig,
} from '../../config/twilio.config.js';
import twilioUtils from '../../utils/notification/twilio.util.js';

class TwilioService {
  constructor(redisClient = null) {
    this.client = null;
    this.redisClient = redisClient;
    this.isInitialized = false;
    this.logger = this.createLogger();
  }

  /**
   * Initializes the Twilio service
   * @returns {Promise<boolean>} - Success status
   */
  async initialize() {
    try {
      // Validate configuration
      twilioConfig.validate();

      // Initialize Twilio client
      this.client = Twilio(
        twilioAccountConfig.accountSid,
        twilioAccountConfig.authToken
      );

      // Test connection
      await this.testConnection();

      this.isInitialized = true;
      this.logger.info('Twilio service initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Twilio service:', error);
      throw new Error(`Twilio initialization failed: ${error.message}`);
    }
  }

  /**
   * Tests Twilio connection
   * @returns {Promise<boolean>} - Connection status
   */
  async testConnection() {
    try {
      const account = await this.client.api
        .accounts(this.client.accountSid)
        .fetch();
      this.logger.info(`Connected to Twilio account: ${account.friendlyName}`);
      return true;
    } catch (error) {
      this.logger.error('Twilio connection test failed:', error);
      throw new Error(`Twilio connection failed: ${error.message}`);
    }
  }

  /**
   * Sends an SMS message
   * @param {object} options - SMS options
   * @returns {Promise<object>} - Send result
   */
  async sendSMS(options) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      to,
      content,
      from = twilioAccountConfig.fromNumber,
      variables = {},
      notificationId,
      userId,
      priority = 'medium',
    } = options;

    try {
      // Validate and format phone number
      const phoneValidation = twilioUtils.phone.validateAndFormat(to);
      if (!phoneValidation.valid) {
        throw new Error(`Invalid phone number: ${phoneValidation.error}`);
      }

      // Check if number is mobile
      if (!twilioUtils.phone.isMobileNumber(phoneValidation.formatted)) {
        throw new Error('Phone number is not a mobile number');
      }

      // Validate and sanitize content
      const contentValidation = twilioUtils.content.validate(content);
      if (!contentValidation.valid) {
        throw new Error(`Invalid content: ${contentValidation.error}`);
      }

      // Process content with variables
      const processedContent = twilioUtils.content.replaceVariables(
        contentValidation.sanitized,
        variables
      );

      // Check rate limits
      const rateLimitResult = await this.checkRateLimits(
        phoneValidation.formatted,
        priority
      );
      if (!rateLimitResult.allowed) {
        throw new Error(
          `Rate limit exceeded. Try again at ${rateLimitResult.resetTime}`
        );
      }

      // Estimate cost
      const costEstimate = twilioUtils.cost.estimateCost(
        phoneValidation.formatted,
        processedContent
      );

      // Create notification delivery record
      const deliveryRecord = await this.createDeliveryRecord({
        notificationId,
        channel: 'sms',
        provider: 'twilio',
        recipient: phoneValidation.formatted,
        content: processedContent,
        costEstimate,
      });

      // Prepare message options
      const messageOptions = {
        body: processedContent,
        from: from || twilioAccountConfig.fromNumber,
        to: phoneValidation.formatted,
        statusCallback: webhookConfig.statusCallback,
      };

      // Add messaging service SID if available
      if (twilioAccountConfig.messagingServiceSid) {
        messageOptions.messagingServiceSid =
          twilioAccountConfig.messagingServiceSid;
      }

      this.logger.info(`Sending SMS to ${phoneValidation.formatted}`, {
        notificationId,
        contentLength: processedContent.length,
        segments:
          twilioUtils.content.countCharacters(processedContent).segments,
      });

      // Send message
      const message = await this.client.messages.create(messageOptions);

      // Update delivery record with response
      await deliveryRecord.markAsSent(message.sid, {
        to: message.to,
        from: message.from,
        body: message.body,
        status: message.status,
        dateCreated: message.dateCreated,
        price: message.price,
        currency: message.currency,
        numSegments: message.numSegments,
      });

      // Calculate actual cost
      const actualCost = twilioUtils.cost.calculateActualCost(message);
      if (actualCost && smsServiceConfig.enableCostTracking) {
        await deliveryRecord.setCost(actualCost.amount, actualCost.currency);
      }

      // Update notification status if notificationId is provided
      if (notificationId) {
        await this.updateNotificationStatus(notificationId, 'sent', {
          channel: 'sms',
          externalId: message.sid,
        });
      }

      this.logger.info(`SMS sent successfully`, {
        messageId: message.sid,
        status: message.status,
        to: message.to,
      });

      return {
        success: true,
        messageId: message.sid,
        status: message.status,
        provider: 'twilio',
        cost: actualCost,
        deliveryRecordId: deliveryRecord._id,
      };
    } catch (error) {
      this.logger.error('SMS sending failed:', error);

      // Update delivery record with error if it exists
      if (notificationId) {
        await this.handleSendError(notificationId, error, to);
      }

      throw new Error(`SMS sending failed: ${error.message}`);
    }
  }

  /**
   * Sends SMS messages in batch
   * @param {array} recipients - Array of recipient objects
   * @param {string} content - SMS content
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Batch send result
   */
  async sendBatchSMS(recipients, content, options = {}) {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Recipients must be a non-empty array');
    }

    const {
      variables = {},
      notificationId,
      userId,
      priority = 'low',
      batchSize = 10,
      delayBetweenBatches = 1000, // 1 second
    } = options;

    const results = {
      total: recipients.length,
      successful: 0,
      failed: 0,
      results: [],
      batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.logger.info(`Starting batch SMS send`, {
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

          const result = await this.sendSMS({
            to: recipient.phoneNumber || recipient.phone || recipient.to,
            content,
            variables: recipientVariables,
            notificationId,
            userId,
            priority,
          });

          return {
            success: true,
            recipient: recipient.phoneNumber || recipient.phone || recipient.to,
            messageId: result.messageId,
            result,
          };
        } catch (error) {
          return {
            success: false,
            recipient: recipient.phoneNumber || recipient.phone || recipient.to,
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

    this.logger.info(`Batch SMS send completed`, {
      batchId: results.batchId,
      successful: results.successful,
      failed: results.failed,
      total: results.total,
    });

    return results;
  }

  /**
   * Gets delivery status for a message
   * @param {string} messageId - Twilio message ID
   * @returns {Promise<object>} - Delivery status
   */
  async getDeliveryStatus(messageId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const message = await this.client.messages(messageId).fetch();

      // Update delivery record
      const deliveryRecord = await NotificationDelivery.findOne({
        externalId: messageId,
        provider: 'twilio',
      });

      if (deliveryRecord) {
        await this.updateDeliveryStatus(deliveryRecord, message);
      }

      return {
        messageId: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        price: message.price,
        currency: message.currency,
        numSegments: message.numSegments,
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
   * Updates delivery status based on Twilio webhook or API response
   * @param {object} deliveryRecord - Delivery record to update
   * @param {object} messageData - Twilio message data
   * @returns {Promise<object>} - Updated delivery record
   */
  async updateDeliveryStatus(deliveryRecord, messageData) {
    try {
      const status = messageData.status;

      switch (status) {
        case 'queued':
          // Already marked as queued when created
          break;

        case 'sent':
          await deliveryRecord.markAsSent(messageData.sid, messageData);
          break;

        case 'delivered':
          await deliveryRecord.markAsDelivered(messageData);

          // Update notification status if needed
          if (deliveryRecord.notificationId) {
            await this.updateNotificationStatus(
              deliveryRecord.notificationId,
              'delivered',
              {
                channel: 'sms',
                externalId: messageData.sid,
              }
            );
          }
          break;

        case 'undelivered':
        case 'failed':
          await deliveryRecord.markAsFailed(
            {
              code: messageData.errorCode,
              message: messageData.errorMessage,
              details: messageData,
            },
            messageData
          );

          // Update notification status if needed
          if (deliveryRecord.notificationId) {
            await this.updateNotificationStatus(
              deliveryRecord.notificationId,
              'failed',
              {
                channel: 'sms',
                externalId: messageData.sid,
                error: {
                  code: messageData.errorCode,
                  message: messageData.errorMessage,
                },
              }
            );
          }
          break;

        default:
          this.logger.warn(`Unknown status: ${status}`, {
            messageId: messageData.sid,
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
   * Checks rate limits for a phone number
   * @param {string} phoneNumber - Phone number
   * @param {string} priority - Message priority
   * @returns {Promise<object>} - Rate limit check result
   */
  async checkRateLimits(phoneNumber, priority) {
    if (!this.redisClient) {
      return { allowed: true, remaining: Infinity, resetTime: null };
    }

    try {
      // Check all rate limits
      const checks = await Promise.all([
        twilioUtils.rateLimit.checkLimit(
          phoneNumber,
          rateLimitConfig.perSecond,
          this.redisClient
        ),
        twilioUtils.rateLimit.checkLimit(
          phoneNumber,
          rateLimitConfig.perMinute,
          this.redisClient
        ),
        twilioUtils.rateLimit.checkLimit(
          phoneNumber,
          rateLimitConfig.perHour,
          this.redisClient
        ),
        twilioUtils.rateLimit.checkLimit(
          phoneNumber,
          rateLimitConfig.perDay,
          this.redisClient
        ),
      ]);

      // Find the most restrictive limit
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
   * @param {string} phoneNumber - Phone number
   * @returns {Promise<void>}
   */
  async handleSendError(notificationId, error, phoneNumber) {
    try {
      const errorClassification = twilioUtils.error.classifyError(error);

      // Find delivery record
      const deliveryRecord = await NotificationDelivery.findOne({
        notificationId,
        recipient: phoneNumber,
        channel: 'sms',
        provider: 'twilio',
      });

      if (deliveryRecord) {
        await deliveryRecord.markAsFailed({
          code: errorClassification.code,
          message: errorClassification.message,
          details: error,
        });
      }

      // Update notification status
      await this.updateNotificationStatus(notificationId, 'failed', {
        channel: 'sms',
        error: {
          code: errorClassification.code,
          message: errorClassification.message,
          isRetryable: errorClassification.isRetryable,
        },
      });

      // Log error for monitoring
      this.logger.error('SMS send error handled', {
        notificationId,
        phoneNumber,
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
          `[TwilioService] INFO: ${message}`,
          developmentConfig.logging.includeRequestBody ? data : {}
        );
      },
      warn: (message, data = {}) => {
        console.warn(
          `[TwilioService] WARN: ${message}`,
          developmentConfig.logging.includeRequestBody ? data : {}
        );
      },
      error: (message, error) => {
        console.error(
          `[TwilioService] ERROR: ${message}`,
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
        channel: 'sms',
        provider: 'twilio',
      });

      return {
        provider: 'twilio',
        channel: 'sms',
        isInitialized: this.isInitialized,
        ...stats[0], // Get first (and only) result from aggregation
      };
    } catch (error) {
      this.logger.error('Failed to get statistics:', error);
      return {
        provider: 'twilio',
        channel: 'sms',
        isInitialized: this.isInitialized,
        error: error.message,
      };
    }
  }
}

export default TwilioService;
