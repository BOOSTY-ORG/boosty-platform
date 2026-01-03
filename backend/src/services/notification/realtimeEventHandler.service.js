/**
 * Real-time Event Handler Service
 *
 * This service processes real-time notification events:
 * - Process real-time notification events
 * - Transform notifications for real-time delivery
 * - Handle user preferences for real-time updates
 * - Event filtering and prioritization
 * - Integration with notification models
 */

import Notification from '../../models/notification.model.js';
import UserNotificationPreferences from '../../models/userNotificationPreferences.model.js';
import socketIOService from './socketio.service.js';
import sseService from './sse.service.js';

class RealtimeEventHandlerService {
  constructor() {
    this.eventQueue = [];
    this.isProcessing = false;
    this.logger = this.createLogger();
    this.priorityWeights = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
  }

  /**
   * Create a logger instance
   * @returns {object} - Logger instance
   */
  createLogger() {
    return {
      info: (message, data = {}) => {
        console.log(`[RealtimeEventHandler] INFO: ${message}`, data);
      },
      warn: (message, data = {}) => {
        console.warn(`[RealtimeEventHandler] WARN: ${message}`, data);
      },
      error: (message, error) => {
        console.error(`[RealtimeEventHandler] ERROR: ${message}`, error);
      },
    };
  }

  /**
   * Process notification for real-time delivery
   * @param {string} notificationId - Notification ID
   * @param {object} options - Processing options
   */
  async processNotification(notificationId, options = {}) {
    try {
      this.logger.info('Processing notification for real-time delivery', {
        notificationId,
        options,
      });

      // Get notification from database
      const notification = await Notification.findById(notificationId)
        .populate('userId', 'name email')
        .populate('templateId', 'name category');

      if (!notification) {
        this.logger.error('Notification not found', { notificationId });
        return { success: false, error: 'Notification not found' };
      }

      // Check if notification should be sent in real-time
      const shouldProcess = await this.shouldProcessNotification(notification, options);
      if (!shouldProcess) {
        this.logger.info('Notification filtered out for real-time processing', {
          notificationId,
          reason: shouldProcess.reason,
        });
        return { success: false, filtered: true, reason: shouldProcess.reason };
      }

      // Transform notification for real-time delivery
      const transformedNotification = this.transformNotification(notification, options);

      // Determine delivery method
      const deliveryMethod = await this.determineDeliveryMethod(notification.userId, options);

      // Send notification based on delivery method
      let result;
      switch (deliveryMethod) {
        case 'websocket':
          result = await this.sendViaWebSocket(notification.userId, transformedNotification);
          break;
        case 'sse':
          result = await this.sendViaSSE(notification.userId, transformedNotification);
          break;
        case 'both':
          result = await this.sendViaBoth(notification.userId, transformedNotification);
          break;
        default:
          result = { success: false, error: 'No suitable delivery method' };
      }

      // Update notification with real-time delivery status
      await this.updateNotificationDeliveryStatus(notificationId, result);

      this.logger.info('Real-time notification processing completed', {
        notificationId,
        deliveryMethod,
        result,
      });

      return {
        success: true,
        notificationId,
        deliveryMethod,
        result,
      };
    } catch (error) {
      this.logger.error('Failed to process notification for real-time delivery', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process multiple notifications for real-time delivery
   * @param {array} notificationIds - Array of notification IDs
   * @param {object} options - Processing options
   */
  async processBatchNotifications(notificationIds, options = {}) {
    const results = {
      total: notificationIds.length,
      processed: 0,
      failed: 0,
      filtered: 0,
      details: [],
    };

    // Sort notifications by priority
    const sortedNotifications = await this.sortNotificationsByPriority(notificationIds);

    for (const notificationId of sortedNotifications) {
      try {
        const result = await this.processNotification(notificationId, options);
        
        if (result.success) {
          results.processed++;
        } else if (result.filtered) {
          results.filtered++;
        } else {
          results.failed++;
        }

        results.details.push({
          notificationId,
          result,
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          notificationId,
          error: error.message,
        });
      }
    }

    this.logger.info('Batch real-time notification processing completed', {
      total: results.total,
      processed: results.processed,
      failed: results.failed,
      filtered: results.filtered,
    });

    return results;
  }

  /**
   * Check if notification should be processed for real-time delivery
   * @param {object} notification - Notification object
   * @param {object} options - Processing options
   * @returns {boolean|object} - Should process or reason object
   */
  async shouldProcessNotification(notification, options) {
    // Check if notification is already processed
    if (notification.status === 'sent' || notification.status === 'delivered') {
      return { reason: 'Notification already processed' };
    }

    // Check if notification has real-time channels
    const hasRealtimeChannels = notification.channels.some(channel =>
      ['in_app', 'push_notification'].includes(channel)
    );

    if (!hasRealtimeChannels) {
      return { reason: 'No real-time channels specified' };
    }

    // Check user preferences
    const preferences = await UserNotificationPreferences.findOne({ 
      userId: notification.userId 
    });

    if (preferences && !preferences.globalEnabled) {
      return { reason: 'Real-time notifications disabled by user' };
    }

    // Check quiet hours
    if (preferences?.quietHours?.enabled && notification.priority !== 'urgent') {
      const now = new Date();
      const userTime = this.getUserTime(now, preferences.quietHours.timezone);
      
      if (this.isInQuietHours(userTime, preferences.quietHours)) {
        return { reason: 'Quiet hours active' };
      }
    }

    // Check category preferences
    if (preferences?.categories?.[notification.category]?.enabled === false) {
      return { reason: 'Category disabled by user' };
    }

    // Check if any real-time channels are enabled for this category
    const categoryPref = preferences?.categories?.[notification.category];
    if (categoryPref) {
      const hasEnabledRealtimeChannels = categoryPref.channels?.some(channel =>
        ['in_app', 'push_notification'].includes(channel)
      );

      if (!hasEnabledRealtimeChannels) {
        return { reason: 'No real-time channels enabled for this category' };
      }
    }

    return true;
  }

  /**
   * Transform notification for real-time delivery
   * @param {object} notification - Notification object
   * @param {object} options - Transformation options
   * @returns {object} - Transformed notification
   */
  transformNotification(notification, options = {}) {
    const transformed = {
      id: notification._id,
      type: notification.type,
      category: notification.category,
      priority: notification.priority,
      subject: notification.subject,
      content: notification.content,
      htmlContent: notification.htmlContent,
      channels: notification.channels,
      status: notification.status,
      createdAt: notification.createdAt,
      variables: notification.variables || {},
      metadata: notification.metadata || {},
    };

    // Add user information if available
    if (notification.userId) {
      transformed.user = {
        id: notification.userId._id,
        name: notification.userId.name,
        email: notification.userId.email,
      };
    }

    // Add template information if available
    if (notification.templateId) {
      transformed.template = {
        id: notification.templateId._id,
        name: notification.templateId.name,
        category: notification.templateId.category,
      };
    }

    // Add real-time specific fields
    transformed.realtime = {
      delivered: false,
      deliveredAt: null,
      read: false,
      readAt: null,
      actions: this.getAvailableActions(notification),
    };

    // Add custom transformations from options
    if (options.transformations) {
      Object.assign(transformed, options.transformations);
    }

    return transformed;
  }

  /**
   * Get available actions for notification
   * @param {object} notification - Notification object
   * @returns {array} - Available actions
   */
  getAvailableActions(notification) {
    const actions = ['mark_read', 'dismiss'];

    // Add category-specific actions
    switch (notification.category) {
      case 'application':
        actions.push('view_application', 'edit_application');
        break;
      case 'kyc':
        actions.push('complete_kyc', 'view_kyc');
        break;
      case 'payment':
        actions.push('view_payment', 'download_receipt');
        break;
      case 'support':
        actions.push('reply', 'view_ticket');
        break;
      default:
        actions.push('view_details');
    }

    // Add priority-specific actions
    if (notification.priority === 'urgent') {
      actions.unshift('urgent_acknowledge');
    }

    return actions;
  }

  /**
   * Determine delivery method for user
   * @param {string} userId - User ID
   * @param {object} options - Delivery options
   * @returns {string} - Delivery method
   */
  async determineDeliveryMethod(userId, options = {}) {
    // If specific method is requested, use it
    if (options.deliveryMethod) {
      return options.deliveryMethod;
    }

    // Check user preferences for delivery method
    const preferences = await UserNotificationPreferences.findOne({ userId });
    
    if (preferences) {
      const inAppEnabled = preferences.channels?.inApp?.enabled;
      const pushEnabled = preferences.channels?.pushNotification?.enabled;

      if (inAppEnabled && pushEnabled) {
        return 'both';
      } else if (inAppEnabled) {
        return 'sse'; // SSE is better for in-app notifications
      } else if (pushEnabled) {
        return 'websocket'; // WebSocket is better for push notifications
      }
    }

    // Default to both if no preferences
    return 'both';
  }

  /**
   * Send notification via WebSocket
   * @param {string} userId - User ID
   * @param {object} notification - Transformed notification
   * @returns {object} - Send result
   */
  async sendViaWebSocket(userId, notification) {
    try {
      const result = await socketIOService.sendToUser(userId, notification);
      return {
        method: 'websocket',
        success: result,
        sent: result ? 1 : 0,
      };
    } catch (error) {
      this.logger.error('Failed to send via WebSocket', error);
      return {
        method: 'websocket',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send notification via SSE
   * @param {string} userId - User ID
   * @param {object} notification - Transformed notification
   * @returns {object} - Send result
   */
  async sendViaSSE(userId, notification) {
    try {
      const result = await sseService.sendToUser(userId, notification);
      return {
        method: 'sse',
        success: result,
        sent: result ? 1 : 0,
      };
    } catch (error) {
      this.logger.error('Failed to send via SSE', error);
      return {
        method: 'sse',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send notification via both WebSocket and SSE
   * @param {string} userId - User ID
   * @param {object} notification - Transformed notification
   * @returns {object} - Combined send result
   */
  async sendViaBoth(userId, notification) {
    const [websocketResult, sseResult] = await Promise.allSettled([
      this.sendViaWebSocket(userId, notification),
      this.sendViaSSE(userId, notification),
    ]);

    const wsSuccess = websocketResult.status === 'fulfilled' ? websocketResult.value.success : false;
    const sseSuccess = sseResult.status === 'fulfilled' ? sseResult.value.success : false;

    return {
      method: 'both',
      success: wsSuccess || sseSuccess,
      websocket: websocketResult.status === 'fulfilled' ? websocketResult.value : { success: false, error: websocketResult.reason.message },
      sse: sseResult.status === 'fulfilled' ? sseResult.value : { success: false, error: sseResult.reason.message },
      sent: (wsSuccess ? 1 : 0) + (sseSuccess ? 1 : 0),
    };
  }

  /**
   * Update notification delivery status
   * @param {string} notificationId - Notification ID
   * @param {object} result - Delivery result
   */
  async updateNotificationDeliveryStatus(notificationId, result) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return;
      }

      // Update delivery status for real-time channels
      const realtimeChannels = ['in_app', 'push_notification'];
      let updated = false;

      for (const channel of realtimeChannels) {
        if (notification.channels.includes(channel)) {
          const channelStatus = notification.deliveryStatus.find(
            ds => ds.channel === channel
          );

          if (channelStatus) {
            if (result.success) {
              channelStatus.status = 'sent';
              channelStatus.sentAt = new Date();
            } else {
              channelStatus.status = 'failed';
              channelStatus.error = result.error;
            }
            updated = true;
          }
        }
      }

      if (updated) {
        await notification.save();
        this.logger.info('Notification delivery status updated', {
          notificationId,
          result,
        });
      }
    } catch (error) {
      this.logger.error('Failed to update notification delivery status', error);
    }
  }

  /**
   * Sort notifications by priority
   * @param {array} notificationIds - Array of notification IDs
   * @returns {array} - Sorted notification IDs
   */
  async sortNotificationsByPriority(notificationIds) {
    try {
      const notifications = await Notification.find({
        _id: { $in: notificationIds },
      }).select('_id priority');

      // Sort by priority weight
      notifications.sort((a, b) => {
        const weightA = this.priorityWeights[a.priority] || 0;
        const weightB = this.priorityWeights[b.priority] || 0;
        return weightB - weightA; // Higher priority first
      });

      return notifications.map(n => n._id.toString());
    } catch (error) {
      this.logger.error('Failed to sort notifications by priority', error);
      return notificationIds; // Return original order on error
    }
  }

  /**
   * Handle notification action
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @param {string} action - Action name
   * @param {object} payload - Action payload
   */
  async handleNotificationAction(notificationId, userId, action, payload = {}) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      // Verify user owns the notification
      if (notification.userId.toString() !== userId) {
        throw new Error('Access denied');
      }

      // Process action
      let result;
      switch (action) {
        case 'mark_read':
          result = await this.markAsRead(notification, userId);
          break;
        case 'dismiss':
          result = await this.dismissNotification(notification, userId);
          break;
        case 'urgent_acknowledge':
          result = await this.acknowledgeUrgent(notification, userId);
          break;
        default:
          result = await this.handleCustomAction(notification, userId, action, payload);
      }

      this.logger.info('Notification action processed', {
        notificationId,
        userId,
        action,
        result,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to handle notification action', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {object} notification - Notification object
   * @param {string} userId - User ID
   */
  async markAsRead(notification, userId) {
    await notification.markAsRead(['in_app']);
    
    // Send real-time update
    const transformed = this.transformNotification(notification);
    await this.broadcastUpdate(userId, 'notification_read', {
      notificationId: notification._id,
      readAt: new Date(),
    });

    return { success: true, action: 'marked_as_read' };
  }

  /**
   * Dismiss notification
   * @param {object} notification - Notification object
   * @param {string} userId - User ID
   */
  async dismissNotification(notification, userId) {
    // Add dismiss metadata
    notification.metadata = notification.metadata || new Map();
    notification.metadata.set('dismissed', true);
    notification.metadata.set('dismissedAt', new Date());
    notification.metadata.set('dismissedBy', userId);
    
    await notification.save();

    // Send real-time update
    await this.broadcastUpdate(userId, 'notification_dismissed', {
      notificationId: notification._id,
      dismissedAt: new Date(),
    });

    return { success: true, action: 'dismissed' };
  }

  /**
   * Acknowledge urgent notification
   * @param {object} notification - Notification object
   * @param {string} userId - User ID
   */
  async acknowledgeUrgent(notification, userId) {
    // Add acknowledgment metadata
    notification.metadata = notification.metadata || new Map();
    notification.metadata.set('urgentAcknowledged', true);
    notification.metadata.set('acknowledgedAt', new Date());
    notification.metadata.set('acknowledgedBy', userId);
    
    await notification.save();

    // Send real-time update
    await this.broadcastUpdate(userId, 'urgent_acknowledged', {
      notificationId: notification._id,
      acknowledgedAt: new Date(),
    });

    return { success: true, action: 'urgent_acknowledged' };
  }

  /**
   * Handle custom notification action
   * @param {object} notification - Notification object
   * @param {string} userId - User ID
   * @param {string} action - Action name
   * @param {object} payload - Action payload
   */
  async handleCustomAction(notification, userId, action, payload) {
    // Add action to metadata
    notification.metadata = notification.metadata || new Map();
    const actions = notification.metadata.get('actions') || [];
    
    actions.push({
      action,
      payload,
      userId,
      timestamp: new Date(),
    });
    
    notification.metadata.set('actions', actions);
    await notification.save();

    // Send real-time update
    await this.broadcastUpdate(userId, 'notification_action', {
      notificationId: notification._id,
      action,
      payload,
      timestamp: new Date(),
    });

    return { success: true, action, payload };
  }

  /**
   * Broadcast update to user's real-time connections
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  async broadcastUpdate(userId, event, data) {
    try {
      // Send via WebSocket
      await socketIOService.sendToUser(userId, {
        type: 'update',
        event,
        data,
        timestamp: new Date().toISOString(),
      });

      // Send via SSE
      await sseService.sendToUser(userId, {
        type: 'update',
        event,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to broadcast update', error);
    }
  }

  /**
   * Get user time in their timezone
   * @param {Date} date - Date object
   * @param {string} timezone - User timezone
   * @returns {Date} - Date in user timezone
   */
  getUserTime(date, timezone = 'UTC') {
    return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  }

  /**
   * Check if current time is in quiet hours
   * @param {Date} userTime - User's current time
   * @param {object} quietHours - Quiet hours configuration
   * @returns {boolean} - Is in quiet hours
   */
  isInQuietHours(userTime, quietHours) {
    const currentTime = userTime.getHours() * 60 + userTime.getMinutes();
    
    const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      // Same day range (e.g., 22:00 - 08:00)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight range (e.g., 22:00 - 08:00 next day)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Get service statistics
   * @returns {object} - Service statistics
   */
  getStats() {
    return {
      eventQueueSize: this.eventQueue.length,
      isProcessing: this.isProcessing,
      priorityWeights: this.priorityWeights,
    };
  }
}

// Create singleton instance
const realtimeEventHandlerService = new RealtimeEventHandlerService();

export default realtimeEventHandlerService;