/**
 * Queue Utilities
 *
 * This utility provides helper functions for:
 * - Queue operations and management
 * - Job creation and scheduling
 * - Queue monitoring and health checks
 * - Performance metrics collection
 * - Rate limiting and deduplication
 */

import crypto from 'crypto';
import queueManager from '../../services/notification/queueManager.service.js';
import {
  rateLimitConfigs,
  priorityMapping,
  queueConfigs,
} from '../../config/queue.config.js';
import Notification from '../../models/notification.model.js';
import NotificationDelivery from '../../models/notificationDelivery.model.js';
import UserNotificationPreferences from '../../models/userNotificationPreferences.model.js';

class QueueUtil {
  /**
   * Create and queue a notification job
   */
  static async createNotificationJob(notificationData, options = {}) {
    try {
      // Validate notification data
      this.validateNotificationData(notificationData);

      // Check user preferences
      await this.checkUserPreferences(notificationData);

      // Apply rate limiting
      await this.applyRateLimiting(notificationData);

      // Create notification record
      const notification =
        await this.createNotificationRecord(notificationData);

      // Create delivery records for each channel
      const deliveryPromises = notificationData.channels.map((channel) =>
        this.createDeliveryRecord(notification._id, channel, notificationData)
      );
      await Promise.all(deliveryPromises);

      // Queue the notification
      const job = await queueManager.addNotificationJob(
        {
          ...notificationData,
          id: notification._id,
        },
        options
      );

      return {
        success: true,
        notificationId: notification._id,
        jobId: job.id,
        status: notification.status,
      };
    } catch (error) {
      console.error('Failed to create notification job:', error);
      throw error;
    }
  }

  /**
   * Create multiple notification jobs (bulk)
   */
  static async createBulkNotificationJobs(notificationsData, options = {}) {
    const results = [];

    for (const notificationData of notificationsData) {
      try {
        const result = await this.createNotificationJob(
          notificationData,
          options
        );
        results.push(result);
      } catch (error) {
        console.error('Failed to create bulk notification job:', error);
        results.push({
          success: false,
          error: error.message,
          notificationData,
        });
      }
    }

    return results;
  }

  /**
   * Schedule a notification for future delivery
   */
  static async scheduleNotification(
    notificationData,
    scheduledAt,
    options = {}
  ) {
    if (!scheduledAt || scheduledAt <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    return await this.createNotificationJob(
      {
        ...notificationData,
        scheduledAt,
      },
      options
    );
  }

  /**
   * Validate notification data
   */
  static validateNotificationData(data) {
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

    // Validate recipient information
    if (data.channels.includes('email') && !data.recipient?.email) {
      throw new Error('Email address is required for email channel');
    }

    if (data.channels.includes('sms') && !data.recipient?.phone) {
      throw new Error('Phone number is required for SMS channel');
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
   * Check user preferences
   */
  static async checkUserPreferences(notificationData) {
    try {
      const { userId, channels, category } = notificationData;
      const preferences = await UserNotificationPreferences.findOne({ userId });

      if (!preferences) {
        // Create default preferences if none exist
        await UserNotificationPreferences.createDefault(userId, {
          email: notificationData.recipient?.email,
          phone: notificationData.recipient?.phone,
        });
        return;
      }

      // Check global enabled status
      if (!preferences.globalEnabled) {
        throw new Error('Notifications are disabled for this user');
      }

      // Check quiet hours
      if (
        preferences.isInQuietHours &&
        notificationData.priority !== 'urgent'
      ) {
        throw new Error('Notifications are not allowed during quiet hours');
      }

      // Check category preferences
      if (!preferences.isCategoryEnabled(category)) {
        throw new Error(`${category} notifications are disabled for this user`);
      }

      // Get enabled channels for this category
      const enabledChannels =
        preferences.getEnabledChannelsForCategory(category);

      // Filter channels based on user preferences
      notificationData.channels = channels.filter((channel) => {
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

      if (notificationData.channels.length === 0) {
        throw new Error('No enabled channels available for this notification');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Apply rate limiting
   */
  static async applyRateLimiting(notificationData) {
    try {
      const { userId, channels } = notificationData;

      for (const channel of channels) {
        const rateLimitConfig = rateLimitConfigs[channel];
        if (!rateLimitConfig) {
          continue;
        }

        // Check rate limit for this user/channel
        const key = rateLimitConfig.keyGenerator({
          ...notificationData,
          userId,
          channel,
        });

        const isAllowed = await this.checkRateLimit(
          key,
          rateLimitConfig.maxRequests,
          rateLimitConfig.windowMs
        );

        if (!isAllowed) {
          throw new Error(`Rate limit exceeded for ${channel} notifications`);
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check rate limit using Redis
   */
  static async checkRateLimit(key, maxRequests, windowMs) {
    try {
      // This would use Redis for distributed rate limiting
      // For now, we'll use a simple in-memory approach
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get existing requests from Redis (or memory)
      const existingRequests = await this.getRateLimitRequests(
        key,
        windowStart
      );

      if (existingRequests.length >= maxRequests) {
        return false;
      }

      // Add current request
      await this.addRateLimitRequest(key, now);
      return true;
    } catch (error) {
      console.error('Failed to check rate limit:', error);
      return true; // Allow on error
    }
  }

  /**
   * Get rate limit requests from storage
   */
  static async getRateLimitRequests(key, windowStart) {
    // This would use Redis in production
    // For now, return empty array
    return [];
  }

  /**
   * Add rate limit request to storage
   */
  static async addRateLimitRequest(key, timestamp) {
    // This would use Redis in production
    // For now, do nothing
  }

  /**
   * Create notification record
   */
  static async createNotificationRecord(data) {
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
   * Create delivery record
   */
  static async createDeliveryRecord(notificationId, channel, notificationData) {
    const delivery = new NotificationDelivery({
      notificationId,
      channel,
      provider: this.getProviderForChannel(channel),
      status: 'pending',
      attempts: 0,
      maxAttempts:
        queueConfigs[this.getQueueNameByPriority(notificationData.priority)]
          ?.maxRetries || 3,
    });

    return await delivery.save();
  }

  /**
   * Get provider for a channel
   */
  static getProviderForChannel(channel) {
    const providers = {
      email: 'mailgun',
      sms: 'twilio',
      in_app: 'in_app',
      push_notification: 'fcm',
    };

    return providers[channel];
  }

  /**
   * Get queue name by priority
   */
  static getQueueNameByPriority(priority) {
    const priorityMap = {
      urgent: 'highPriority',
      high: 'highPriority',
      medium: 'normalPriority',
      low: 'lowPriority',
    };

    return priorityMap[priority] || 'normalPriority';
  }

  /**
   * Generate deduplication key
   */
  static generateDeduplicationKey(data) {
    const { type, userId, channel, content } = data;
    const hash = crypto
      .createHash('md5')
      .update(`${type}:${userId}:${channel}:${content}`)
      .digest('hex');

    return `dedup:${hash}`;
  }

  /**
   * Check for duplicate notifications
   */
  static async checkForDuplicate(data, ttl = 3600000) {
    // 1 hour default TTL
    try {
      const dedupKey = this.generateDeduplicationKey(data);

      // Check if duplicate exists in Redis
      const exists = await this.checkDeduplicationKey(dedupKey);

      if (exists) {
        throw new Error('Duplicate notification detected');
      }

      // Set deduplication key
      await this.setDeduplicationKey(dedupKey, ttl);
    } catch (error) {
      if (error.message === 'Duplicate notification detected') {
        throw error;
      }
      console.error('Failed to check for duplicate:', error);
    }
  }

  /**
   * Check deduplication key
   */
  static async checkDeduplicationKey(key) {
    // This would use Redis in production
    return false;
  }

  /**
   * Set deduplication key
   */
  static async setDeduplicationKey(key, ttl) {
    // This would use Redis in production
  }

  /**
   * Get queue metrics
   */
  static async getQueueMetrics() {
    try {
      const queueStats = await queueManager.getQueueStats();
      const metrics = {
        queues: queueStats,
        timestamp: new Date(),
      };

      // Add calculated metrics
      for (const [queueName, stats] of Object.entries(queueStats)) {
        if (stats.waiting !== undefined) {
          stats.totalJobs =
            stats.waiting + stats.active + stats.completed + stats.failed;
          stats.successRate =
            stats.totalJobs > 0
              ? ((stats.completed / stats.totalJobs) * 100).toFixed(2)
              : 0;
          stats.failureRate =
            stats.totalJobs > 0
              ? ((stats.failed / stats.totalJobs) * 100).toFixed(2)
              : 0;
        }
      }

      return metrics;
    } catch (error) {
      console.error('Failed to get queue metrics:', error);
      throw error;
    }
  }

  /**
   * Get notification analytics
   */
  static async getNotificationAnalytics(options = {}) {
    try {
      const { dateRange, category, type, userId } = options;

      // Get notification stats
      const notificationStats = await Notification.getStats(userId, {
        dateRange,
        category,
        type,
      });

      // Get delivery stats
      const deliveryStats = await NotificationDelivery.getDeliveryStats({
        dateRange,
      });

      // Get engagement metrics
      const engagementMetrics = await NotificationDelivery.getEngagementMetrics(
        {
          dateRange,
        }
      );

      return {
        notifications: notificationStats[0] || {},
        deliveries: deliveryStats[0] || {},
        engagement: engagementMetrics[0] || {},
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to get notification analytics:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  static async cancelNotification(notificationId) {
    try {
      const notification = await Notification.findById(notificationId);

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (
        notification.status !== 'pending' &&
        notification.status !== 'queued'
      ) {
        throw new Error('Cannot cancel notification that is already processed');
      }

      // Update notification status
      notification.status = 'cancelled';
      await notification.save();

      // Cancel queue job if it exists
      if (notification.queueJobId && notification.queueName) {
        const queue = queueManager.queues[notification.queueName];
        if (queue) {
          const job = await queue.instance.getJob(notification.queueJobId);
          if (job) {
            await job.remove();
          }
        }
      }

      return {
        success: true,
        message: 'Notification cancelled successfully',
      };
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      throw error;
    }
  }

  /**
   * Retry failed notifications
   */
  static async retryFailedNotifications(options = {}) {
    try {
      const { limit = 100, dateRange } = options;

      // Get failed notifications that can be retried
      const failedNotifications = await Notification.find({
        status: 'failed',
        retryCount: { $lt: 3 },
        nextRetryAt: { $lte: new Date() },
        ...(dateRange && {
          createdAt: {
            $gte: new Date(dateRange.start),
            $lte: new Date(dateRange.end),
          },
        }),
      })
        .limit(limit)
        .sort({ nextRetryAt: 1 });

      const retryResults = [];

      for (const notification of failedNotifications) {
        try {
          // Reset notification status
          notification.status = 'pending';
          notification.error = null;
          await notification.save();

          // Re-queue the notification
          const job = await queueManager.addNotificationJob({
            id: notification._id,
            userId: notification.userId,
            type: notification.type,
            channels: notification.channels,
            recipient: notification.recipient,
            subject: notification.subject,
            content: notification.content,
            htmlContent: notification.htmlContent,
            category: notification.category,
            priority: notification.priority,
            templateId: notification.templateId,
            variables: notification.variables,
            scheduledAt: notification.scheduledAt,
            metadata: notification.metadata,
          });

          retryResults.push({
            success: true,
            notificationId: notification._id,
            jobId: job.id,
          });
        } catch (error) {
          retryResults.push({
            success: false,
            notificationId: notification._id,
            error: error.message,
          });
        }
      }

      return retryResults;
    } catch (error) {
      console.error('Failed to retry failed notifications:', error);
      throw error;
    }
  }

  /**
   * Clean up old notifications and delivery records
   */
  static async cleanupOldRecords(retentionDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Clean old notifications
      const notificationResult = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $in: ['delivered', 'read', 'cancelled'] },
      });

      // Clean old delivery records
      const deliveryResult = await NotificationDelivery.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $in: ['delivered', 'read', 'bounced', 'complained'] },
      });

      console.log(
        `Cleanup completed: ${notificationResult.deletedCount} notifications, ${deliveryResult.deletedCount} delivery records`
      );

      return {
        notificationsDeleted: notificationResult.deletedCount,
        deliveriesDeleted: deliveryResult.deletedCount,
        cutoffDate,
      };
    } catch (error) {
      console.error('Failed to cleanup old records:', error);
      throw error;
    }
  }
}

export default QueueUtil;
