/**
 * Notification System Service
 *
 * This service integrates all notification queue components:
 * - Initializes the complete notification system
 * - Provides high-level API for sending notifications
 * - Manages system lifecycle
 * - Handles system-wide operations
 */

import queueManager from './queueManager.service.js';
import queueWorkers from './queueWorkers.service.js';
import queueProcessors from './queueProcessors.service.js';
import QueueUtil from '../../utils/notification/queue.util.js';
import Notification from '../../models/notification.model.js';
import UserNotificationPreferences from '../../models/userNotificationPreferences.model.js';
import TwilioService from './twilio.service.js';
import MailgunService from './mailgun.service.js';
import MailgunWebhookService from './mailgunWebhook.service.js';

class NotificationSystem {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
    this.twilioService = new TwilioService();
    this.mailgunService = new MailgunService();
    this.mailgunWebhookService = new MailgunWebhookService();
  }

  /**
   * Initialize the complete notification system
   */
  async initialize() {
    if (this.isInitialized) {
      return this.initializationPromise;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  /**
   * Internal initialization method
   */
  async _doInitialize() {
    try {
      console.log('Initializing Notification System...');

      // Initialize queue manager
      await queueManager.initialize();

      // Initialize queue workers
      await queueWorkers.initialize();

      // Initialize communication services
      try {
        await this.twilioService.initialize();
        console.log('Twilio service initialized');
      } catch (error) {
        console.warn('Failed to initialize Twilio service:', error.message);
      }

      try {
        await this.mailgunService.initialize();
        console.log('Mailgun service initialized');
      } catch (error) {
        console.warn('Failed to initialize Mailgun service:', error.message);
      }

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('Notification System initialized successfully');

      return true;
    } catch (error) {
      console.error('Failed to initialize Notification System:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for system-wide monitoring
   */
  setupEventListeners() {
    // Queue manager events
    queueManager.on('job:completed', (data) => {
      console.log(`Job completed: ${data.job.id} in queue ${data.queue}`);
    });

    queueManager.on('job:failed', (data) => {
      console.error(`Job failed: ${data.job.id} in queue ${data.queue}`);
    });

    queueManager.on('metrics:collected', (data) => {
      console.log('Queue metrics collected:', data);
    });

    queueManager.on('health:check', (data) => {
      if (data.status === 'unhealthy') {
        console.warn('Queue system unhealthy:', data);
      }
    });

    // Queue workers events
    queueWorkers.on('health:check', (data) => {
      if (data.status === 'unhealthy') {
        console.warn('Worker system unhealthy:', data);
      }
    });

    queueWorkers.on('scaling:up', (data) => {
      console.log(
        `Scaling up workers for ${data.queueName}: ${data.from} -> ${data.to}`
      );
    });

    queueWorkers.on('scaling:down', (data) => {
      console.log(
        `Scaling down workers for ${data.queueName}: ${data.from} -> ${data.to}`
      );
    });
  }

  /**
   * Send a notification
   */
  async sendNotification(notificationData, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Use queue utility to create and queue notification
      const result = await QueueUtil.createNotificationJob(
        notificationData,
        options
      );

      console.log(`Notification queued: ${result.notificationId}`);
      return result;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send multiple notifications (bulk)
   */
  async sendBulkNotifications(notificationsData, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const results = await QueueUtil.createBulkNotificationJobs(
        notificationsData,
        options
      );

      console.log(
        `Bulk notifications queued: ${results.filter((r) => r.success).length}/${results.length}`
      );
      return results;
    } catch (error) {
      console.error('Failed to send bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Schedule a notification for future delivery
   */
  async scheduleNotification(notificationData, scheduledAt, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const result = await QueueUtil.scheduleNotification(
        notificationData,
        scheduledAt,
        options
      );

      console.log(
        `Notification scheduled: ${result.notificationId} for ${scheduledAt}`
      );
      return result;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  /**
   * Get notification by ID
   */
  async getNotification(notificationId) {
    try {
      const notification = await Notification.findById(notificationId)
        .populate('templateId', 'name description')
        .populate('userId', 'name email');

      if (!notification) {
        throw new Error('Notification not found');
      }

      return notification;
    } catch (error) {
      console.error('Failed to get notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
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
      console.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
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
        const NotificationDelivery =
          require('../../models/notificationDelivery.model.js').default;

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

      console.log(`Notification marked as read: ${notificationId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId) {
    try {
      const result = await QueueUtil.cancelNotification(notificationId);
      console.log(`Notification cancelled: ${notificationId}`);
      return result;
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId) {
    try {
      let preferences = await UserNotificationPreferences.findOne({ userId });

      if (!preferences) {
        // Create default preferences
        preferences = await UserNotificationPreferences.createDefault(userId);
      }

      return preferences;
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId, preferencesData) {
    try {
      let preferences = await UserNotificationPreferences.findOne({ userId });

      if (!preferences) {
        preferences = await UserNotificationPreferences.createDefault(userId);
      }

      // Update preferences
      if (preferencesData.globalEnabled !== undefined) {
        preferences.globalEnabled = preferencesData.globalEnabled;
      }

      if (preferencesData.quietHours) {
        await preferences.updateQuietHours(
          preferencesData.quietHours.enabled,
          preferencesData.quietHours.startTime,
          preferencesData.quietHours.endTime,
          preferencesData.quietHours.timezone
        );
      }

      if (preferencesData.channels) {
        // Update channel preferences
        for (const [channel, channelPrefs] of Object.entries(
          preferencesData.channels
        )) {
          if (preferences.channels[channel]) {
            Object.assign(preferences.channels[channel], channelPrefs);
          }
        }
        preferences.lastUpdated = new Date();
      }

      if (preferencesData.categories) {
        // Update category preferences
        for (const [category, categoryPrefs] of Object.entries(
          preferencesData.categories
        )) {
          if (preferences.categories[category]) {
            await preferences.updateCategoryPreferences(
              category,
              categoryPrefs.enabled,
              categoryPrefs.channels
            );
          }
        }
      }

      if (preferencesData.frequencyLimits) {
        await preferences.updateFrequencyLimits(
          preferencesData.frequencyLimits.maxPerHour,
          preferencesData.frequencyLimits.maxPerDay,
          preferencesData.frequencyLimits.maxPerWeek
        );
      }

      await preferences.save();
      console.log(`User preferences updated: ${userId}`);
      return preferences;
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw error;
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics() {
    try {
      // Get queue metrics
      const queueMetrics = await QueueUtil.getQueueMetrics();

      // Get worker metrics
      const workerMetrics = queueWorkers.getWorkerMetrics();

      // Get notification analytics
      const analytics = await QueueUtil.getNotificationAnalytics();

      return {
        queues: queueMetrics,
        workers: workerMetrics,
        analytics,
        system: {
          isInitialized: this.isInitialized,
          uptime:
            Date.now() - this.initializationPromise?._settledValue ||
            Date.now(),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to get system metrics:', error);
      throw error;
    }
  }

  /**
   * Perform system health check
   */
  async healthCheck() {
    try {
      // Check queue health
      const queueHealth = await queueManager.performHealthCheck();

      // Check worker health
      const workerHealth = await queueWorkers.performHealthCheck();

      // Overall system health
      const systemHealth = {
        status: 'healthy',
        components: {
          queues: queueHealth,
          workers: workerHealth,
        },
        timestamp: new Date(),
      };

      if (
        queueHealth.status === 'unhealthy' ||
        workerHealth.status === 'unhealthy'
      ) {
        systemHealth.status = 'unhealthy';
      }

      return systemHealth;
    } catch (error) {
      console.error('Failed to perform health check:', error);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(options = {}) {
    try {
      const results = await QueueUtil.retryFailedNotifications(options);
      console.log(
        `Retried ${results.filter((r) => r.success).length} failed notifications`
      );
      return results;
    } catch (error) {
      console.error('Failed to retry notifications:', error);
      throw error;
    }
  }

  /**
   * Clean up old records
   */
  async cleanup(retentionDays = 90) {
    try {
      const result = await QueueUtil.cleanupOldRecords(retentionDays);
      console.log(
        `Cleanup completed: ${result.notificationsDeleted} notifications, ${result.deliveriesDeleted} deliveries`
      );
      return result;
    } catch (error) {
      console.error('Failed to cleanup old records:', error);
      throw error;
    }
  }

  /**
   * Send an email notification directly (bypassing queue)
   */
  async sendEmail(emailData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const result = await this.mailgunService.sendEmail(emailData);
      console.log(`Email sent directly: ${result.messageId}`);
      return result;
    } catch (error) {
      console.error('Failed to send email directly:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification directly (bypassing queue)
   */
  async sendSMS(smsData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const result = await this.twilioService.sendSMS(smsData);
      console.log(`SMS sent directly: ${result.messageId}`);
      return result;
    } catch (error) {
      console.error('Failed to send SMS directly:', error);
      throw error;
    }
  }

  /**
   * Process Mailgun webhook
   */
  async processMailgunWebhook(req) {
    try {
      const result = await this.mailgunWebhookService.processWebhook(req);
      console.log('Mailgun webhook processed:', result.success);
      return result;
    } catch (error) {
      console.error('Failed to process Mailgun webhook:', error);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  async getServiceStatistics() {
    try {
      const twilioStats = await this.twilioService.getStatistics();
      const mailgunStats = await this.mailgunService.getStatistics();

      return {
        twilio: twilioStats,
        mailgun: mailgunStats,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to get service statistics:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (!this.isInitialized) {
      return;
    }

    console.log('Shutting down Notification System...');

    try {
      // Shutdown queue workers first
      await queueWorkers.shutdown();

      // Shutdown queue manager
      await queueManager.shutdown();

      this.isInitialized = false;
      console.log('Notification System shutdown complete');
    } catch (error) {
      console.error('Error during Notification System shutdown:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const notificationSystem = new NotificationSystem();

export default notificationSystem;
