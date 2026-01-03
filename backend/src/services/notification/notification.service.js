/**
 * Main Notification Service
 *
 * This service provides central orchestration for all notification operations:
 * - Multi-channel sending coordination (email, SMS, in-app, push)
 * - Template rendering and personalization
 * - User preference checking and filtering
 * - Queue integration for async processing
 * - Notification scheduling and delayed sending
 * - Batch notification processing
 * - Error handling and retry coordination
 */

import crypto from 'crypto';
import Notification from '../../models/notification.model.js';
import NotificationDelivery from '../../models/notificationDelivery.model.js';
import NotificationTemplate from '../../models/notificationTemplate.model.js';
import UserNotificationPreferences from '../../models/userNotificationPreferences.model.js';
import User from '../../models/user.model.js';
import QueueUtil from '../../utils/notification/queue.util.js';
import NotificationBuilder from './notificationBuilder.service.js';
import NotificationPreferencesService from './notificationPreferences.service.js';
import NotificationTemplateService from './notificationTemplate.service.js';
import TwilioService from './twilio.service.js';
import MailgunService from './mailgun.service.js';

class NotificationService {
  constructor() {
    this.twilioService = new TwilioService();
    this.mailgunService = new MailgunService();
    this.preferencesService = new NotificationPreferencesService();
    this.templateService = new NotificationTemplateService();
    this.logger = this.createLogger();
  }

  /**
   * Send a notification to a user
   * @param {object} notificationData - Notification data
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Send result
   */
  async sendNotification(notificationData, options = {}) {
    const startTime = Date.now();
    let notification;

    try {
      this.logger.info('Starting notification send process', {
        userId: notificationData.userId,
        type: notificationData.type,
        category: notificationData.category,
      });

      // Validate notification data
      this.validateNotificationData(notificationData);

      // Get or create user preferences
      const preferences = await this.preferencesService.getOrCreatePreferences(
        notificationData.userId
      );

      // Check if notification should be sent based on preferences
      const filteredData = await this.applyUserPreferences(
        notificationData,
        preferences
      );

      if (!filteredData || filteredData.channels.length === 0) {
        this.logger.info('Notification filtered out by user preferences', {
          userId: notificationData.userId,
          originalChannels: notificationData.channels,
        });

        return {
          success: true,
          notificationId: null,
          status: 'filtered',
          message: 'Notification filtered by user preferences',
        };
      }

      // Process template if templateId is provided
      if (filteredData.templateId) {
        filteredData.content = await this.templateService.renderTemplate(
          filteredData.templateId,
          filteredData.variables || {}
        );
      }

      // Create notification record
      notification = await this.createNotificationRecord(filteredData);

      // Create delivery records for each channel
      await this.createDeliveryRecords(notification._id, filteredData);

      // Queue notification for processing
      const queueResult = await QueueUtil.createNotificationJob(
        {
          ...filteredData,
          id: notification._id,
        },
        options
      );

      // Update notification with queue information
      notification.queueJobId = queueResult.jobId;
      notification.status = 'queued';
      await notification.save();

      this.logger.info('Notification queued successfully', {
        notificationId: notification._id,
        jobId: queueResult.jobId,
        channels: filteredData.channels,
        processingTime: Date.now() - startTime,
      });

      return {
        success: true,
        notificationId: notification._id,
        jobId: queueResult.jobId,
        status: notification.status,
        channels: filteredData.channels,
      };
    } catch (error) {
      this.logger.error('Failed to send notification', {
        error: error.message,
        notificationData,
        notificationId: notification?._id,
      });

      // Update notification with error if it was created
      if (notification) {
        await notification.markAsFailed(error);
      }

      throw new Error(`Notification send failed: ${error.message}`);
    }
  }

  /**
   * Send notifications to multiple users (bulk)
   * @param {array} notificationsData - Array of notification data
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Bulk send result
   */
  async sendBulkNotifications(notificationsData, options = {}) {
    const startTime = Date.now();
    const batchId = this.generateBatchId();
    const results = {
      total: notificationsData.length,
      successful: 0,
      failed: 0,
      filtered: 0,
      results: [],
      batchId,
    };

    this.logger.info('Starting bulk notification send', {
      totalNotifications: notificationsData.length,
      batchId,
    });

    // Process notifications in batches to avoid overwhelming the system
    const batchSize = options.batchSize || 50;
    const delayBetweenBatches = options.delayBetweenBatches || 1000;

    for (let i = 0; i < notificationsData.length; i += batchSize) {
      const batch = notificationsData.slice(i, i + batchSize);
      const batchPromises = batch.map(async (notificationData, index) => {
        try {
          // Add batch ID to notification data
          const dataWithBatch = {
            ...notificationData,
            batchId,
            source: 'bulk',
          };

          const result = await this.sendNotification(dataWithBatch, options);

          if (result.status === 'filtered') {
            results.filtered++;
          } else {
            results.successful++;
          }

          return {
            success: true,
            index: i + index,
            notificationId: result.notificationId,
            status: result.status,
          };
        } catch (error) {
          results.failed++;
          return {
            success: false,
            index: i + index,
            error: error.message,
            notificationData,
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      // Process batch results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
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
      if (i + batchSize < notificationsData.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenBatches)
        );
      }
    }

    this.logger.info('Bulk notification send completed', {
      batchId,
      successful: results.successful,
      failed: results.failed,
      filtered: results.filtered,
      total: results.total,
      processingTime: Date.now() - startTime,
    });

    return results;
  }

  /**
   * Schedule a notification for future delivery
   * @param {object} notificationData - Notification data
   * @param {Date} scheduledAt - When to send the notification
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Schedule result
   */
  async scheduleNotification(notificationData, scheduledAt, options = {}) {
    try {
      if (!scheduledAt || scheduledAt <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      this.logger.info('Scheduling notification', {
        userId: notificationData.userId,
        scheduledAt,
        type: notificationData.type,
      });

      // Add scheduling information
      const scheduledData = {
        ...notificationData,
        scheduledAt,
        source: 'scheduled',
      };

      // Create notification record
      const notification = await this.createNotificationRecord(scheduledData);

      // Create delivery records
      await this.createDeliveryRecords(notification._id, scheduledData);

      // Schedule in queue
      const queueResult = await QueueUtil.scheduleNotification(
        scheduledData,
        scheduledAt,
        options
      );

      // Update notification with queue information
      notification.queueJobId = queueResult.jobId;
      notification.status = 'pending';
      await notification.save();

      this.logger.info('Notification scheduled successfully', {
        notificationId: notification._id,
        jobId: queueResult.jobId,
        scheduledAt,
      });

      return {
        success: true,
        notificationId: notification._id,
        jobId: queueResult.jobId,
        scheduledAt,
        status: 'scheduled',
      };
    } catch (error) {
      this.logger.error('Failed to schedule notification', {
        error: error.message,
        notificationData,
        scheduledAt,
      });
      throw new Error(`Notification scheduling failed: ${error.message}`);
    }
  }

  /**
   * Send a notification using a template
   * @param {string} templateId - Template ID
   * @param {string} userId - User ID
   * @param {object} variables - Template variables
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Send result
   */
  async sendTemplateNotification(
    templateId,
    userId,
    variables = {},
    options = {}
  ) {
    try {
      // Get template
      const template = await NotificationTemplate.findById(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      if (!template.isActive) {
        throw new Error(`Template is not active: ${templateId}`);
      }

      // Get user information
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Get user preferences
      const preferences =
        await this.preferencesService.getOrCreatePreferences(userId);

      // Determine enabled channels for this category
      const enabledChannels = preferences.getEnabledChannelsForCategory(
        template.category
      );

      if (enabledChannels.length === 0) {
        this.logger.info('No enabled channels for template notification', {
          userId,
          templateId,
          category: template.category,
        });

        return {
          success: true,
          notificationId: null,
          status: 'filtered',
          message: 'No enabled channels for this notification category',
        };
      }

      // Render template
      const renderedContent = await this.templateService.renderTemplate(
        templateId,
        variables
      );

      // Build notification data
      const notificationData = {
        userId,
        type: template.type,
        channels: enabledChannels,
        recipient: {
          email: user.email,
          phone: user.phone,
        },
        subject: renderedContent.subject,
        content: renderedContent.content,
        htmlContent: renderedContent.htmlContent,
        category: template.category,
        priority: template.priority,
        templateId,
        variables,
        source: 'template',
        ...options,
      };

      // Send notification
      return await this.sendNotification(notificationData, options);
    } catch (error) {
      this.logger.error('Failed to send template notification', {
        error: error.message,
        templateId,
        userId,
      });
      throw new Error(`Template notification failed: ${error.message}`);
    }
  }

  /**
   * Mark a notification as read
   * @param {string} notificationId - Notification ID
   * @param {array} channels - Channels to mark as read
   * @returns {Promise<object>} - Result
   */
  async markAsRead(notificationId, channels = []) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      // Mark notification as read
      await notification.markAsRead();

      // Mark specific channels as read if provided
      if (channels.length > 0) {
        for (const channel of channels) {
          const delivery = await NotificationDelivery.findOne({
            notificationId,
            channel,
          });

          if (delivery) {
            await delivery.markAsRead();
          }
        }
      }

      this.logger.info('Notification marked as read', {
        notificationId,
        channels,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to mark notification as read', {
        error: error.message,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<object>} - Result
   */
  async cancelNotification(notificationId) {
    try {
      const result = await QueueUtil.cancelNotification(notificationId);
      this.logger.info('Notification cancelled', {
        notificationId,
      });
      return result;
    } catch (error) {
      this.logger.error('Failed to cancel notification', {
        error: error.message,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {object} options - Query options
   * @returns {Promise<object>} - Notifications and pagination info
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        status,
        category,
        priority,
        dateRange,
      } = options;

      const notifications = await Notification.getByUser(userId, {
        page,
        limit,
        sort: { createdAt: -1 },
        filters: {
          type,
          status,
          category,
          priority,
          dateRange,
        },
      });

      // Get total count for pagination
      const totalCount = await Notification.countDocuments({
        userId,
        ...(type && { type }),
        ...(status && { status }),
        ...(category && { category }),
        ...(priority && { priority }),
        ...(dateRange && {
          createdAt: {
            $gte: new Date(dateRange.start),
            $lte: new Date(dateRange.end),
          },
        }),
      });

      return {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page * limit < totalCount,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get user notifications', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get notification details
   * @param {string} notificationId - Notification ID
   * @returns {Promise<object>} - Notification details
   */
  async getNotification(notificationId) {
    try {
      const notification = await Notification.findById(notificationId)
        .populate('templateId', 'name description')
        .populate('userId', 'name email');

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Get delivery records
      const deliveries = await NotificationDelivery.find({
        notificationId,
      }).sort({ createdAt: -1 });

      return {
        notification,
        deliveries,
      };
    } catch (error) {
      this.logger.error('Failed to get notification', {
        error: error.message,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Validate notification data
   * @param {object} data - Notification data
   */
  validateNotificationData(data) {
    const required = ['userId', 'type', 'content', 'category'];
    const missing = required.filter((field) => !data[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate channels
    if (!data.channels || data.channels.length === 0) {
      throw new Error('At least one channel is required');
    }

    const validChannels = ['email', 'sms', 'in_app', 'push_notification'];
    const invalidChannels = data.channels.filter(
      (ch) => !validChannels.includes(ch)
    );

    if (invalidChannels.length > 0) {
      throw new Error(`Invalid channels: ${invalidChannels.join(', ')}`);
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (data.priority && !validPriorities.includes(data.priority)) {
      throw new Error(`Invalid priority: ${data.priority}`);
    }

    // Validate category
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
    if (!validCategories.includes(data.category)) {
      throw new Error(`Invalid category: ${data.category}`);
    }
  }

  /**
   * Apply user preferences to notification data
   * @param {object} notificationData - Notification data
   * @param {object} preferences - User preferences
   * @returns {Promise<object>} - Filtered notification data
   */
  async applyUserPreferences(notificationData, preferences) {
    // Check global enabled status
    if (!preferences.globalEnabled) {
      return null;
    }

    // Check quiet hours
    if (preferences.isInQuietHours && notificationData.priority !== 'urgent') {
      return null;
    }

    // Check category preferences
    if (!preferences.isCategoryEnabled(notificationData.category)) {
      return null;
    }

    // Get enabled channels for this category
    const enabledChannels = preferences.getEnabledChannelsForCategory(
      notificationData.category
    );

    // Filter channels based on user preferences
    const filteredChannels = notificationData.channels.filter((channel) => {
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

    if (filteredChannels.length === 0) {
      return null;
    }

    return {
      ...notificationData,
      channels: filteredChannels,
    };
  }

  /**
   * Create notification record
   * @param {object} data - Notification data
   * @returns {Promise<object>} - Created notification
   */
  async createNotificationRecord(data) {
    const notification = new Notification({
      userId: data.userId,
      type: data.type,
      channels: data.channels,
      recipient: data.recipient,
      subject: data.subject,
      content: data.content,
      htmlContent: data.htmlContent,
      category: data.category,
      priority: data.priority || 'medium',
      templateId: data.templateId,
      variables: data.variables || {},
      scheduledAt: data.scheduledAt,
      metadata: data.metadata || {},
      sentBy: data.sentBy || 'system',
      source: data.source || 'manual',
      batchId: data.batchId,
    });

    return await notification.save();
  }

  /**
   * Create delivery records for each channel
   * @param {string} notificationId - Notification ID
   * @param {object} notificationData - Notification data
   */
  async createDeliveryRecords(notificationId, notificationData) {
    const deliveryPromises = notificationData.channels.map((channel) => {
      const delivery = new NotificationDelivery({
        notificationId,
        channel,
        provider: this.getProviderForChannel(channel),
        status: 'pending',
        attempts: 0,
        maxAttempts: 3, // Default value
      });

      return delivery.save();
    });

    await Promise.all(deliveryPromises);
  }

  /**
   * Get provider for a channel
   * @param {string} channel - Channel name
   * @returns {string} - Provider name
   */
  getProviderForChannel(channel) {
    const providers = {
      email: 'mailgun',
      sms: 'twilio',
      in_app: 'in_app',
      push_notification: 'fcm',
    };

    return providers[channel];
  }

  /**
   * Generate a unique batch ID
   * @returns {string} - Batch ID
   */
  generateBatchId() {
    return `batch_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Create a logger instance
   * @returns {object} - Logger instance
   */
  createLogger() {
    return {
      info: (message, data = {}) => {
        console.log(`[NotificationService] INFO: ${message}`, data);
      },
      warn: (message, data = {}) => {
        console.warn(`[NotificationService] WARN: ${message}`, data);
      },
      error: (message, error) => {
        console.error(`[NotificationService] ERROR: ${message}`, error);
      },
    };
  }
}

export default NotificationService;
