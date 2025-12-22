/**
 * Mailgun Webhook Handler Service
 *
 * This service handles:
 * - Delivery status webhooks
 * - Processing bounce and complaint notifications
 * - Updating notification delivery status
 * - Security validation
 */

import crypto from 'crypto';
import NotificationDelivery from '../../models/notificationDelivery.model.js';
import Notification from '../../models/notification.model.js';
import {
  webhookConfig,
  developmentConfig,
} from '../../config/mailgun.config.js';
import MailgunService from './mailgun.service.js';

class MailgunWebhookService {
  constructor() {
    this.logger = this.createLogger();
    this.mailgunService = new MailgunService();
  }

  /**
   * Processes incoming webhook from Mailgun
   * @param {object} req - Express request object
   * @returns {Promise<object>} - Processing result
   */
  async processWebhook(req) {
    try {
      // Validate webhook signature
      const isValid = this.validateWebhookSignature(req);
      if (!isValid) {
        this.logger.warn('Invalid webhook signature received');
        return {
          success: false,
          message: 'Invalid webhook signature',
          status: 401,
        };
      }

      // Get webhook data
      const webhookData = this.parseWebhookData(req);

      // Process each event in the webhook
      const results = [];
      for (const eventData of webhookData) {
        try {
          const result = await this.processEvent(eventData);
          results.push(result);
        } catch (error) {
          this.logger.error('Failed to process webhook event:', error);
          results.push({
            success: false,
            event: eventData.event,
            messageId: eventData.message,
            error: error.message,
          });
        }
      }

      // Count successful and failed processing
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      this.logger.info(`Webhook processed`, {
        totalEvents: results.length,
        successful,
        failed,
      });

      return {
        success: failed === 0,
        message: `Processed ${results.length} events`,
        results,
        status: failed > 0 ? 207 : 200, // 207 Multi-Status for partial success
      };
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      return {
        success: false,
        message: 'Webhook processing failed',
        error: error.message,
        status: 500,
      };
    }
  }

  /**
   * Validates webhook signature
   * @param {object} req - Express request object
   * @returns {boolean} - Validation result
   */
  validateWebhookSignature(req) {
    try {
      // Get signature from headers
      const signature = req.headers['x-mailgun-signature'];
      const timestamp = req.headers['x-mailgun-timestamp'];
      const token = req.headers['x-mailgun-token'];

      if (!signature || !timestamp || !token) {
        this.logger.warn('Missing webhook signature headers');
        return false;
      }

      // Check if timestamp is recent (within 15 minutes)
      const now = Math.floor(Date.now() / 1000);
      const timestampInt = parseInt(timestamp);
      if (Math.abs(now - timestampInt) > 900) {
        this.logger.warn('Webhook timestamp is too old');
        return false;
      }

      // If webhook signing key is not configured, skip validation in development
      if (
        !webhookConfig.webhookSigningKey &&
        process.env.NODE_ENV !== 'production'
      ) {
        this.logger.warn(
          'Webhook signing key not configured, skipping validation'
        );
        return true;
      }

      // Construct the signed data string
      const signedData = `${timestamp}${token}`;

      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', webhookConfig.webhookSigningKey)
        .update(signedData)
        .digest('hex');

      // Compare signatures
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        this.logger.warn('Webhook signature validation failed', {
          received: signature,
          expected: expectedSignature,
        });
      }

      return isValid;
    } catch (error) {
      this.logger.error('Webhook signature validation error:', error);
      return false;
    }
  }

  /**
   * Parses webhook data from request
   * @param {object} req - Express request object
   * @returns {array} - Array of event data
   */
  parseWebhookData(req) {
    try {
      // Mailgun sends different formats based on the webhook type
      let eventData;

      if (req.body && req.body['event-data']) {
        // Single event format
        eventData = [req.body['event-data']];
      } else if (req.body && Array.isArray(req.body)) {
        // Multiple events format
        eventData = req.body;
      } else if (req.body && req.body.signature && req.body.eventData) {
        // Batch format
        eventData = Array.isArray(req.body.eventData)
          ? req.body.eventData
          : [req.body.eventData];
      } else {
        // Direct event format
        eventData = [req.body];
      }

      return eventData.filter((event) => event && event.event);
    } catch (error) {
      this.logger.error('Failed to parse webhook data:', error);
      return [];
    }
  }

  /**
   * Processes a single webhook event
   * @param {object} eventData - Event data from Mailgun
   * @returns {Promise<object>} - Processing result
   */
  async processEvent(eventData) {
    const { event, message, recipient } = eventData;

    if (!event || !message) {
      return {
        success: false,
        error: 'Missing required event data',
      };
    }

    // Find delivery record
    const deliveryRecord = await NotificationDelivery.findOne({
      externalId: message,
      provider: 'mailgun',
    });

    if (!deliveryRecord) {
      this.logger.warn(`Delivery record not found for message: ${message}`);
      return {
        success: false,
        error: 'Delivery record not found',
        messageId: message,
      };
    }

    // Update delivery record based on event type
    try {
      await this.updateDeliveryRecord(deliveryRecord, eventData);

      // Update parent notification if needed
      if (deliveryRecord.notificationId) {
        await this.updateNotificationStatus(
          deliveryRecord.notificationId,
          eventData
        );
      }

      // Handle special cases
      await this.handleSpecialCases(eventData, deliveryRecord);

      return {
        success: true,
        event,
        messageId: message,
        recipient,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update delivery record for event ${event}:`,
        error
      );
      return {
        success: false,
        event,
        messageId: message,
        error: error.message,
      };
    }
  }

  /**
   * Updates delivery record based on event
   * @param {object} deliveryRecord - Delivery record to update
   * @param {object} eventData - Event data from Mailgun
   * @returns {Promise<object>} - Updated delivery record
   */
  async updateDeliveryRecord(deliveryRecord, eventData) {
    const { event } = eventData;

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
          referer: eventData.referer,
        });
        break;

      case 'bounced':
        await deliveryRecord.markAsFailed(
          {
            code: 'bounced',
            message: `Message bounced: ${eventData.reason || 'Unknown reason'}`,
            details: eventData,
            bounceType: this.classifyBounce(eventData),
          },
          eventData
        );
        break;

      case 'failed':
        await deliveryRecord.markAsFailed(
          {
            code: eventData.reason || 'failed',
            message: eventData.description || 'Message delivery failed',
            details: eventData,
          },
          eventData
        );
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
        this.logger.warn(`Unknown event type: ${event}`, {
          messageId: eventData.message,
        });
    }

    return deliveryRecord;
  }

  /**
   * Updates notification status based on event
   * @param {string} notificationId - Notification ID
   * @param {object} eventData - Event data from Mailgun
   * @returns {Promise<object>} - Updated notification
   */
  async updateNotificationStatus(notificationId, eventData) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return null;
      }

      const { event } = eventData;

      switch (event) {
        case 'delivered':
          await notification.markAsDelivered('email', eventData.message);
          break;

        case 'bounced':
        case 'failed':
        case 'complained':
        case 'unsubscribed':
          await notification.markAsFailed(
            {
              code: eventData.reason || event,
              message: eventData.description || `Email ${event}`,
            },
            'email'
          );
          break;
      }

      return notification;
    } catch (error) {
      this.logger.error('Failed to update notification status:', error);
      throw error;
    }
  }

  /**
   * Handles special cases for certain events
   * @param {object} eventData - Event data from Mailgun
   * @param {object} deliveryRecord - Delivery record
   * @returns {Promise<void>}
   */
  async handleSpecialCases(eventData, deliveryRecord) {
    const { event } = eventData;

    switch (event) {
      case 'bounced':
        // Handle bounced emails - could update user preferences
        await this.handleBouncedEmail(eventData, deliveryRecord);
        break;

      case 'complained':
        // Handle spam complaints - could update user preferences
        await this.handleSpamComplaint(eventData, deliveryRecord);
        break;

      case 'unsubscribed':
        // Handle unsubscribe - could update user preferences
        await this.handleUnsubscribe(eventData, deliveryRecord);
        break;
    }
  }

  /**
   * Handles bounced email
   * @param {object} eventData - Event data from Mailgun
   * @param {object} deliveryRecord - Delivery record
   * @returns {Promise<void>}
   */
  async handleBouncedEmail(eventData, deliveryRecord) {
    try {
      const bounceType = this.classifyBounce(eventData);

      this.logger.info(`Email bounced`, {
        messageId: eventData.message,
        recipient: eventData.recipient,
        bounceType,
        reason: eventData.reason,
        code: eventData.code,
      });

      // Here you could:
      // 1. Update user notification preferences
      // 2. Add email to suppression list
      // 3. Send alert to administrators
      // 4. Create a task for customer service follow-up

      // For now, just log the bounce
    } catch (error) {
      this.logger.error('Failed to handle bounced email:', error);
    }
  }

  /**
   * Handles spam complaint
   * @param {object} eventData - Event data from Mailgun
   * @param {object} deliveryRecord - Delivery record
   * @returns {Promise<void>}
   */
  async handleSpamComplaint(eventData, deliveryRecord) {
    try {
      this.logger.warn(`Spam complaint received`, {
        messageId: eventData.message,
        recipient: eventData.recipient,
        userAgent: eventData.userAgent,
        ipAddress: eventData.ip,
      });

      // Here you could:
      // 1. Immediately disable email notifications for this user
      // 2. Add email to suppression list
      // 3. Send alert to administrators
      // 4. Create a task for customer service follow-up

      // For now, just log the complaint
    } catch (error) {
      this.logger.error('Failed to handle spam complaint:', error);
    }
  }

  /**
   * Handles unsubscribe
   * @param {object} eventData - Event data from Mailgun
   * @param {object} deliveryRecord - Delivery record
   * @returns {Promise<void>}
   */
  async handleUnsubscribe(eventData, deliveryRecord) {
    try {
      this.logger.info(`Unsubscribe received`, {
        messageId: eventData.message,
        recipient: eventData.recipient,
        userAgent: eventData.userAgent,
        ipAddress: eventData.ip,
      });

      // Here you could:
      // 1. Update user notification preferences
      // 2. Add email to suppression list for marketing emails
      // 3. Send confirmation email
      // 4. Log unsubscribe reason if available

      // For now, just log the unsubscribe
    } catch (error) {
      this.logger.error('Failed to handle unsubscribe:', error);
    }
  }

  /**
   * Classifies bounce type
   * @param {object} eventData - Event data from Mailgun
   * @returns {string} - Bounce type
   */
  classifyBounce(eventData) {
    const { code, reason } = eventData;

    // Hard bounces (permanent failures)
    if (code >= 500 || code === 550 || code === 551) {
      return 'hard';
    }

    // Soft bounces (temporary failures)
    if (code >= 400 && code < 500) {
      return 'soft';
    }

    // Transient bounces
    if (reason && reason.toLowerCase().includes('transient')) {
      return 'transient';
    }

    // Default to hard bounce for unknown codes
    return 'hard';
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
          `[MailgunWebhookService] INFO: ${message}`,
          developmentConfig.logging.includeRequestBody ? data : {}
        );
      },
      warn: (message, data = {}) => {
        console.warn(
          `[MailgunWebhookService] WARN: ${message}`,
          developmentConfig.logging.includeRequestBody ? data : {}
        );
      },
      error: (message, error) => {
        console.error(
          `[MailgunWebhookService] ERROR: ${message}`,
          developmentConfig.logging.includeRequestBody ? error : error.message
        );
      },
    };
  }
}

export default MailgunWebhookService;
