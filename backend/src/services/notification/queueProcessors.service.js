/**
 * Queue Processors Service
 *
 * This service contains processors for different notification channels:
 * - Email processor (Mailgun integration)
 * - SMS processor (Twilio integration)
 * - In-app notification processor
 * - Push notification processor (Firebase/FCM)
 * - Error handling and retry logic
 * - Job completion and failure callbacks
 */

import nodemailer from 'nodemailer';
import NotificationDelivery from '../../models/notificationDelivery.model.js';
import Notification from '../../models/notification.model.js';
import TwilioService from './twilio.service.js';

class QueueProcessors {
  constructor() {
    this.processors = {
      email: new EmailProcessor(),
      sms: new SMSProcessor(),
      in_app: new InAppProcessor(),
      push_notification: new PushNotificationProcessor(),
    };
  }

  /**
   * Get processor for a specific channel
   */
  getProcessor(channel) {
    return this.processors[channel];
  }

  /**
   * Process notification using appropriate channel processor
   */
  async process(job) {
    const { channel } = job.data;
    const processor = this.getProcessor(channel);

    if (!processor) {
      throw new Error(`No processor found for channel: ${channel}`);
    }

    return await processor.process(job);
  }
}

/**
 * Email Processor
 * Handles email notifications using Mailgun
 */
class EmailProcessor {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter (Mailgun)
   */
  initializeTransporter() {
    try {
      // Configure Mailgun transporter
      this.transporter = nodemailer.createTransporter({
        host: process.env.MAILGUN_HOST || 'smtp.mailgun.org',
        port: process.env.MAILGUN_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.MAILGUN_SMTP_LOGIN,
          pass: process.env.MAILGUN_SMTP_PASSWORD,
        },
      });

      console.log('Email transporter initialized');
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  /**
   * Process email notification
   */
  async process(job) {
    const { notificationId, recipient, subject, content, htmlContent } =
      job.data;

    try {
      // Validate email address
      if (!recipient.email) {
        throw new Error('Email address is required');
      }

      // Prepare email options
      const mailOptions = {
        from: process.env.MAILGUN_FROM_EMAIL || 'noreply@boosty.com',
        to: recipient.email,
        subject: subject || 'Boosty Notification',
        text: content,
        html: htmlContent || this.generateHtmlContent(content),
        headers: {
          'X-Mailgun-Tag': ['notification', `notification-${notificationId}`],
          'X-Mailgun-Variables': JSON.stringify({ notificationId }),
        },
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);

      // Update notification delivery status
      await this.updateDeliveryStatus(notificationId, 'sent', {
        externalId: result.messageId,
        provider: 'mailgun',
        providerResponse: result,
      });

      console.log(`Email sent successfully to ${recipient.email}`);

      return {
        success: true,
        externalId: result.messageId,
        provider: 'mailgun',
        providerResponse: result,
      };
    } catch (error) {
      console.error('Failed to send email:', error);

      // Update notification delivery status with error
      await this.updateDeliveryStatus(notificationId, 'failed', {
        error: {
          message: error.message,
          code: error.code,
        },
        provider: 'mailgun',
      });

      throw error;
    }
  }

  /**
   * Generate HTML content from text content
   */
  generateHtmlContent(textContent) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Boosty Notification</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
          }
          .content {
            padding: 20px;
            background-color: #f9f9f9;
          }
          .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Boosty Platform</h1>
        </div>
        <div class="content">
          <p>${textContent.replace(/\n/g, '<br>')}</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Boosty Platform. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(notificationId, status, data) {
    try {
      const delivery = await NotificationDelivery.findOne({
        notificationId,
        channel: 'email',
      });

      if (delivery) {
        if (status === 'sent') {
          await delivery.markAsSent(data.externalId, data.providerResponse);
        } else if (status === 'failed') {
          await delivery.markAsFailed(data.error, data.providerResponse);
        }
      }
    } catch (error) {
      console.error('Failed to update delivery status:', error);
    }
  }
}

/**
 * SMS Processor
 * Handles SMS notifications using Twilio
 */
class SMSProcessor {
  constructor() {
    this.twilioService = null;
    this.redisClient = null;
    this.initializeTwilio();
  }

  /**
   * Initialize Twilio service
   */
  async initializeTwilio() {
    try {
      // Initialize Redis client if available
      try {
        const Redis = require('ioredis');
        this.redisClient = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB) || 0,
        });
        console.log('Redis client initialized for SMS processor');
      } catch (redisError) {
        console.warn(
          'Redis not available for SMS processor:',
          redisError.message
        );
      }

      // Initialize Twilio service
      this.twilioService = new TwilioService(this.redisClient);
      await this.twilioService.initialize();
      console.log('Twilio service initialized');
    } catch (error) {
      console.error('Failed to initialize Twilio service:', error);
    }
  }

  /**
   * Process SMS notification
   */
  async process(job) {
    const {
      notificationId,
      recipient,
      content,
      subject,
      variables = {},
      userId,
      priority = 'medium',
    } = job.data;

    try {
      // Ensure Twilio service is initialized
      if (!this.twilioService) {
        await this.initializeTwilio();
      }

      // Validate phone number
      if (!recipient.phone) {
        throw new Error('Phone number is required');
      }

      // Send SMS using the new Twilio service
      const result = await this.twilioService.sendSMS({
        to: recipient.phone,
        content,
        variables,
        notificationId,
        userId,
        priority,
      });

      console.log(`SMS sent successfully to ${recipient.phone}`);

      return {
        success: true,
        externalId: result.messageId,
        provider: 'twilio',
        deliveryRecordId: result.deliveryRecordId,
        cost: result.cost,
      };
    } catch (error) {
      console.error('Failed to send SMS:', error);

      // The Twilio service already handles error updates
      throw error;
    }
  }

  /**
   * Get delivery statistics
   */
  async getStatistics() {
    if (!this.twilioService) {
      return { error: 'Twilio service not initialized' };
    }

    return await this.twilioService.getStatistics();
  }
}

/**
 * In-App Processor
 * Handles in-app notifications
 */
class InAppProcessor {
  /**
   * Process in-app notification
   */
  async process(job) {
    const { notificationId, userId, subject, content } = job.data;

    try {
      // For in-app notifications, we just mark them as delivered
      // The actual delivery happens when the user checks their notifications

      // Update notification delivery status
      await this.updateDeliveryStatus(notificationId, 'delivered', {
        provider: 'in_app',
        providerResponse: { delivered: true, timestamp: new Date() },
      });

      console.log(`In-app notification delivered for user ${userId}`);

      return {
        success: true,
        provider: 'in_app',
        providerResponse: { delivered: true, timestamp: new Date() },
      };
    } catch (error) {
      console.error('Failed to deliver in-app notification:', error);

      // Update notification delivery status with error
      await this.updateDeliveryStatus(notificationId, 'failed', {
        error: {
          message: error.message,
          code: error.code,
        },
        provider: 'in_app',
      });

      throw error;
    }
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(notificationId, status, data) {
    try {
      const delivery = await NotificationDelivery.findOne({
        notificationId,
        channel: 'in_app',
      });

      if (delivery) {
        if (status === 'delivered') {
          await delivery.markAsDelivered(data.providerResponse);
        } else if (status === 'failed') {
          await delivery.markAsFailed(data.error, data.providerResponse);
        }
      }
    } catch (error) {
      console.error('Failed to update delivery status:', error);
    }
  }
}

/**
 * Push Notification Processor
 * Handles push notifications using Firebase Cloud Messaging
 */
class PushNotificationProcessor {
  constructor() {
    this.fcm = null;
    this.initializeFCM();
  }

  /**
   * Initialize Firebase Cloud Messaging
   */
  initializeFCM() {
    try {
      const admin = require('firebase-admin');
      const serviceAccount = {
        projectId: process.env.FCM_PROJECT_ID,
        clientEmail: process.env.FCM_CLIENT_EMAIL,
        privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.fcm = admin.messaging();
      console.log('FCM initialized');
    } catch (error) {
      console.error('Failed to initialize FCM:', error);
    }
  }

  /**
   * Process push notification
   */
  async process(job) {
    const { notificationId, recipient, subject, content, userId } = job.data;

    try {
      // Get device tokens for user
      const deviceTokens = await this.getDeviceTokens(userId);

      if (!deviceTokens || deviceTokens.length === 0) {
        throw new Error('No device tokens found for user');
      }

      // Prepare notification message
      const message = {
        notification: {
          title: subject || 'Boosty Notification',
          body: content,
          sound: 'default',
        },
        data: {
          notificationId,
          type: 'notification',
        },
        tokens: deviceTokens,
        priority: 'high',
        timeToLive: 2419200, // 28 days in seconds
      };

      // Send push notification
      const result = await this.fcm.sendMulticast(message);

      // Update notification delivery status
      await this.updateDeliveryStatus(notificationId, 'sent', {
        externalId: result.multicastId,
        provider: 'fcm',
        providerResponse: result,
      });

      console.log(`Push notification sent to ${deviceTokens.length} devices`);

      return {
        success: true,
        externalId: result.multicastId,
        provider: 'fcm',
        providerResponse: result,
      };
    } catch (error) {
      console.error('Failed to send push notification:', error);

      // Update notification delivery status with error
      await this.updateDeliveryStatus(notificationId, 'failed', {
        error: {
          message: error.message,
          code: error.code,
        },
        provider: 'fcm',
      });

      throw error;
    }
  }

  /**
   * Get device tokens for a user
   */
  async getDeviceTokens(userId) {
    try {
      const UserNotificationPreferences =
        require('../../models/userNotificationPreferences.model.js').default;
      const preferences = await UserNotificationPreferences.findOne({ userId });

      if (!preferences || !preferences.channels.pushNotification.enabled) {
        return [];
      }

      return preferences.activeDeviceTokens || [];
    } catch (error) {
      console.error('Failed to get device tokens:', error);
      return [];
    }
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(notificationId, status, data) {
    try {
      const delivery = await NotificationDelivery.findOne({
        notificationId,
        channel: 'push_notification',
      });

      if (delivery) {
        if (status === 'sent') {
          await delivery.markAsSent(data.externalId, data.providerResponse);
        } else if (status === 'failed') {
          await delivery.markAsFailed(data.error, data.providerResponse);
        }
      }
    } catch (error) {
      console.error('Failed to update delivery status:', error);
    }
  }
}

// Create and export singleton instance
const queueProcessors = new QueueProcessors();

export default queueProcessors;
