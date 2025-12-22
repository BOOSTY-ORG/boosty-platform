/**
 * Twilio Webhook Handler Service
 *
 * This service handles:
 * - Delivery status webhooks from Twilio
 * - Updating notification delivery status
 * - Processing bounce and complaint notifications
 * - Security validation for webhooks
 */

import crypto from 'crypto';
import NotificationDelivery from '../../models/notificationDelivery.model.js';
import Notification from '../../models/notification.model.js';
import {
  webhookConfig,
  developmentConfig,
} from '../../config/twilio.config.js';
import twilioUtils from '../../utils/notification/twilio.util.js';

class TwilioWebhookService {
  constructor() {
    this.logger = this.createLogger();
  }

  /**
   * Validates incoming webhook request
   * @param {object} req - Express request object
   * @param {string} body - Request body as string
   * @returns {boolean} - Validation result
   */
  validateWebhook(req, body) {
    try {
      // Get Twilio signature from headers
      const signature = req.headers['x-twilio-signature'];
      if (!signature) {
        this.logger.warn('Missing Twilio signature header');
        return false;
      }

      // Get the URL that Twilio called
      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

      // Validate signature
      const isValid = this.validateTwilioSignature(
        url,
        body,
        signature,
        webhookConfig.webhookAuthToken
      );

      if (!isValid) {
        this.logger.warn('Invalid Twilio signature', {
          url,
          signature,
        });
        return false;
      }

      // Check IP whitelist if configured
      if (webhookConfig.allowedIps.length > 0) {
        const clientIp = req.ip || req.connection.remoteAddress;
        if (!webhookConfig.allowedIps.includes(clientIp)) {
          this.logger.warn('Unauthorized IP address', { clientIp });
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Webhook validation error:', error);
      return false;
    }
  }

  /**
   * Validates Twilio request signature
   * @param {string} url - The URL Twilio called
   * @param {string} body - The raw request body
   * @param {string} signature - The Twilio signature
   * @param {string} authToken - The Twilio auth token
   * @returns {boolean} - Whether the signature is valid
   */
  validateTwilioSignature(url, body, signature, authToken) {
    try {
      // Create the signing string
      const signingString = `${url}${body}`;

      // Compute the expected signature
      const expectedSignature = crypto
        .createHmac('sha1', authToken)
        .update(signingString, 'utf8')
        .digest('base64');

      // Compare signatures (using constant-time comparison)
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      this.logger.error('Signature validation error:', error);
      return false;
    }
  }

  /**
   * Handles delivery status webhook
   * @param {object} payload - Webhook payload from Twilio
   * @returns {Promise<object>} - Processing result
   */
  async handleDeliveryStatus(payload) {
    try {
      const {
        MessageSid: messageId,
        MessageStatus: status,
        ErrorCode: errorCode,
        ErrorMessage: errorMessage,
        To: recipient,
        From: sender,
        ApiVersion: apiVersion,
      } = payload;

      this.logger.info(`Processing delivery status webhook`, {
        messageId,
        status,
        errorCode,
        recipient,
      });

      // Find the delivery record
      const deliveryRecord = await NotificationDelivery.findOne({
        externalId: messageId,
        provider: 'twilio',
      });

      if (!deliveryRecord) {
        this.logger.warn(`Delivery record not found for message: ${messageId}`);
        return {
          success: false,
          error: 'Delivery record not found',
          messageId,
        };
      }

      // Prepare message data for status update
      const messageData = {
        sid: messageId,
        status: status.toLowerCase(),
        errorCode,
        errorMessage,
        to: recipient,
        from: sender,
        dateUpdated: new Date(),
      };

      // Update delivery record status
      await this.updateDeliveryStatus(deliveryRecord, messageData);

      // Update notification status if needed
      if (deliveryRecord.notificationId) {
        await this.updateNotificationStatus(
          deliveryRecord.notificationId,
          status.toLowerCase(),
          {
            channel: 'sms',
            externalId: messageId,
            error: errorCode
              ? {
                  code: errorCode,
                  message: errorMessage,
                }
              : null,
          }
        );
      }

      // Handle special cases
      if (status.toLowerCase() === 'undelivered') {
        await this.handleUndeliveredMessage(deliveryRecord, payload);
      } else if (status.toLowerCase() === 'failed') {
        await this.handleFailedMessage(deliveryRecord, payload);
      }

      this.logger.info(`Delivery status updated successfully`, {
        messageId,
        status,
        deliveryRecordId: deliveryRecord._id,
      });

      return {
        success: true,
        messageId,
        status,
        deliveryRecordId: deliveryRecord._id,
      };
    } catch (error) {
      this.logger.error('Failed to handle delivery status webhook:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handles inbound message webhook
   * @param {object} payload - Webhook payload from Twilio
   * @returns {Promise<object>} - Processing result
   */
  async handleInboundMessage(payload) {
    try {
      const {
        MessageSid: messageId,
        From: sender,
        To: recipient,
        Body: body,
        NumMedia: numMedia,
      } = payload;

      this.logger.info(`Processing inbound message`, {
        messageId,
        sender,
        recipient,
        bodyLength: body ? body.length : 0,
        numMedia,
      });

      // Find if this is a reply to an existing message
      const deliveryRecord = await NotificationDelivery.findOne({
        recipient: sender,
        channel: 'sms',
        provider: 'twilio',
      }).sort({ createdAt: -1 });

      // Store inbound message for analytics
      const inboundData = {
        messageId,
        sender,
        recipient,
        body,
        numMedia: parseInt(numMedia) || 0,
        timestamp: new Date(),
        isReply: !!deliveryRecord,
        replyToMessageId: deliveryRecord?.externalId,
        replyToNotificationId: deliveryRecord?.notificationId,
      };

      // Process based on content
      if (body) {
        const processedBody = body.toLowerCase().trim();

        // Check for unsubscribe commands
        if (this.isUnsubscribeCommand(processedBody)) {
          await this.handleUnsubscribe(sender, deliveryRecord);
        }
        // Check for help commands
        else if (this.isHelpCommand(processedBody)) {
          await this.handleHelpRequest(sender, deliveryRecord);
        }
        // Check for stop commands
        else if (this.isStopCommand(processedBody)) {
          await this.handleStopRequest(sender, deliveryRecord);
        }
        // Regular reply
        else {
          await this.handleRegularReply(inboundData, deliveryRecord);
        }
      }

      this.logger.info(`Inbound message processed successfully`, {
        messageId,
        sender,
      });

      return {
        success: true,
        messageId,
        processedAs: inboundData.isReply ? 'reply' : 'new_message',
      };
    } catch (error) {
      this.logger.error('Failed to handle inbound message:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handles undelivered messages
   * @param {object} deliveryRecord - Delivery record
   * @param {object} payload - Twilio payload
   * @returns {Promise<void>}
   */
  async handleUndeliveredMessage(deliveryRecord, payload) {
    try {
      const { ErrorCode: errorCode, ErrorMessage: errorMessage } = payload;

      // Determine bounce type
      let bounceType = 'soft';
      if (errorCode === '30007') {
        bounceType = 'hard'; // Carrier violation
      } else if (errorCode === '30008') {
        bounceType = 'hard'; // Frequency limit
      }

      // Update delivery record as bounced
      await deliveryRecord.markAsBounced(
        bounceType,
        errorMessage || 'Message undelivered',
        payload
      );

      // Update notification status
      if (deliveryRecord.notificationId) {
        await this.updateNotificationStatus(
          deliveryRecord.notificationId,
          'failed',
          {
            channel: 'sms',
            externalId: deliveryRecord.externalId,
            error: {
              code: errorCode,
              message: errorMessage,
              bounceType,
            },
          }
        );
      }

      this.logger.info(`Message marked as undelivered`, {
        messageId: deliveryRecord.externalId,
        bounceType,
        errorCode,
      });
    } catch (error) {
      this.logger.error('Failed to handle undelivered message:', error);
    }
  }

  /**
   * Handles failed messages
   * @param {object} deliveryRecord - Delivery record
   * @param {object} payload - Twilio payload
   * @returns {Promise<void>}
   */
  async handleFailedMessage(deliveryRecord, payload) {
    try {
      const { ErrorCode: errorCode, ErrorMessage: errorMessage } = payload;

      // Classify error
      const errorClassification = twilioUtils.error.classifyError({
        code: errorCode,
        message: errorMessage,
      });

      // Update delivery record
      await deliveryRecord.markAsFailed(
        {
          code: errorCode,
          message: errorMessage,
          category: errorClassification.category,
          isRetryable: errorClassification.isRetryable,
        },
        payload
      );

      // Update notification status
      if (deliveryRecord.notificationId) {
        await this.updateNotificationStatus(
          deliveryRecord.notificationId,
          'failed',
          {
            channel: 'sms',
            externalId: deliveryRecord.externalId,
            error: {
              code: errorCode,
              message: errorMessage,
              category: errorClassification.category,
              isRetryable: errorClassification.isRetryable,
            },
          }
        );
      }

      this.logger.info(`Message marked as failed`, {
        messageId: deliveryRecord.externalId,
        errorCode,
        isRetryable: errorClassification.isRetryable,
      });
    } catch (error) {
      this.logger.error('Failed to handle failed message:', error);
    }
  }

  /**
   * Handles unsubscribe requests
   * @param {string} phoneNumber - Phone number to unsubscribe
   * @param {object} deliveryRecord - Related delivery record
   * @returns {Promise<void>}
   */
  async handleUnsubscribe(phoneNumber, deliveryRecord) {
    try {
      // Mark delivery record as unsubscribed
      await deliveryRecord.markAsUnsubscribed({
        reason: 'User unsubscribed via SMS',
        timestamp: new Date(),
      });

      // Update user notification preferences if we have user info
      if (deliveryRecord.notificationId) {
        const notification = await Notification.findById(
          deliveryRecord.notificationId
        );
        if (notification && notification.userId) {
          // This would integrate with user preferences service
          // For now, just log the action
          this.logger.info(`User unsubscribed from SMS notifications`, {
            userId: notification.userId,
            phoneNumber,
          });
        }
      }

      this.logger.info(`Unsubscribe request processed`, {
        phoneNumber,
        messageId: deliveryRecord?.externalId,
      });
    } catch (error) {
      this.logger.error('Failed to handle unsubscribe request:', error);
    }
  }

  /**
   * Handles help requests
   * @param {string} phoneNumber - Phone number requesting help
   * @param {object} deliveryRecord - Related delivery record
   * @returns {Promise<void>}
   */
  async handleHelpRequest(phoneNumber, deliveryRecord) {
    try {
      this.logger.info(`Help request received`, {
        phoneNumber,
        messageId: deliveryRecord?.externalId,
      });

      // This would typically trigger sending a help message
      // Implementation depends on business requirements
    } catch (error) {
      this.logger.error('Failed to handle help request:', error);
    }
  }

  /**
   * Handles stop requests
   * @param {string} phoneNumber - Phone number requesting stop
   * @param {object} deliveryRecord - Related delivery record
   * @returns {Promise<void>}
   */
  async handleStopRequest(phoneNumber, deliveryRecord) {
    try {
      // Mark delivery record as unsubscribed
      await deliveryRecord.markAsUnsubscribed({
        reason: 'User stopped messages via SMS',
        timestamp: new Date(),
      });

      this.logger.info(`Stop request processed`, {
        phoneNumber,
        messageId: deliveryRecord?.externalId,
      });
    } catch (error) {
      this.logger.error('Failed to handle stop request:', error);
    }
  }

  /**
   * Handles regular replies
   * @param {object} inboundData - Inbound message data
   * @param {object} deliveryRecord - Related delivery record
   * @returns {Promise<void>}
   */
  async handleRegularReply(inboundData, deliveryRecord) {
    try {
      // Add click tracking if this is a reply
      if (deliveryRecord) {
        await deliveryRecord.addClick({
          timestamp: inboundData.timestamp,
          url: 'sms_reply',
          userAgent: 'twilio_webhook',
          ipAddress: inboundData.sender,
          referer: deliveryRecord.externalId,
        });
      }

      this.logger.info(`Regular reply processed`, {
        messageId: inboundData.messageId,
        sender: inboundData.sender,
        replyToMessageId: deliveryRecord?.externalId,
      });
    } catch (error) {
      this.logger.error('Failed to handle regular reply:', error);
    }
  }

  /**
   * Updates delivery status
   * @param {object} deliveryRecord - Delivery record to update
   * @param {object} messageData - Message data from webhook
   * @returns {Promise<void>}
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
          break;

        case 'undelivered':
          await deliveryRecord.markAsBounced(
            'soft',
            messageData.errorMessage || 'Message undelivered',
            messageData
          );
          break;

        case 'failed':
          await deliveryRecord.markAsFailed(
            {
              code: messageData.errorCode,
              message: messageData.errorMessage,
            },
            messageData
          );
          break;

        default:
          this.logger.warn(`Unknown delivery status: ${status}`, {
            messageId: messageData.sid,
          });
      }
    } catch (error) {
      this.logger.error('Failed to update delivery status:', error);
      throw error;
    }
  }

  /**
   * Updates notification status
   * @param {string} notificationId - Notification ID
   * @param {string} status - New status
   * @param {object} data - Additional data
   * @returns {Promise<void>}
   */
  async updateNotificationStatus(notificationId, status, data = {}) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        this.logger.warn(`Notification not found: ${notificationId}`);
        return;
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
    } catch (error) {
      this.logger.error('Failed to update notification status:', error);
      throw error;
    }
  }

  /**
   * Checks if message is an unsubscribe command
   * @param {string} body - Message body (lowercase)
   * @returns {boolean} - Whether it's an unsubscribe command
   */
  isUnsubscribeCommand(body) {
    const unsubscribeCommands = [
      'unsubscribe',
      'stop',
      'stopall',
      'cancel',
      'end',
      'quit',
    ];
    return unsubscribeCommands.includes(body);
  }

  /**
   * Checks if message is a help command
   * @param {string} body - Message body (lowercase)
   * @returns {boolean} - Whether it's a help command
   */
  isHelpCommand(body) {
    const helpCommands = ['help', 'info', 'support'];
    return helpCommands.includes(body);
  }

  /**
   * Checks if message is a stop command
   * @param {string} body - Message body (lowercase)
   * @returns {boolean} - Whether it's a stop command
   */
  isStopCommand(body) {
    const stopCommands = ['stop', 'stopall'];
    return stopCommands.includes(body);
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
          `[TwilioWebhookService] INFO: ${message}`,
          developmentConfig.logging.includeRequestBody ? data : {}
        );
      },
      warn: (message, data = {}) => {
        console.warn(
          `[TwilioWebhookService] WARN: ${message}`,
          developmentConfig.logging.includeRequestBody ? data : {}
        );
      },
      error: (message, error) => {
        console.error(
          `[TwilioWebhookService] ERROR: ${message}`,
          developmentConfig.logging.includeRequestBody ? error : error.message
        );
      },
    };
  }

  /**
   * Gets webhook statistics
   * @returns {Promise<object>} - Webhook statistics
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
        webhookEndpoint: webhookConfig.statusCallback,
        ...stats[0], // Get first (and only) result from aggregation
      };
    } catch (error) {
      this.logger.error('Failed to get webhook statistics:', error);
      return {
        provider: 'twilio',
        channel: 'sms',
        webhookEndpoint: webhookConfig.statusCallback,
        error: error.message,
      };
    }
  }
}

export default TwilioWebhookService;
