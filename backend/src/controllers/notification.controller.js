/**
 * Notification Controller
 *
 * Handles all notification-related API endpoints:
 * - Send notifications (single, batch, scheduled)
 * - Get user notifications with pagination and filtering
 * - Mark notifications as read/unread
 * - Get notification details
 * - Delete notifications
 * - Get notification statistics and analytics
 * - Handle notification preferences
 * - Template management endpoints
 * - Delivery tracking endpoints
 */

import Notification from '../models/notification.model.js';
import NotificationDelivery from '../models/notificationDelivery.model.js';
import NotificationTemplate from '../models/notificationTemplate.model.js';
import UserNotificationPreferences from '../models/userNotificationPreferences.model.js';
import User from '../models/user.model.js';
import NotificationService from '../services/notification/notification.service.js';
import NotificationPreferencesService from '../services/notification/notificationPreferences.service.js';
import NotificationTemplateService from '../services/notification/notificationTemplate.service.js';
import realtimeEventHandlerService from '../services/notification/realtimeEventHandler.service.js';
import {
  formatSuccessResponse,
  formatErrorResponse,
  handleControllerError,
} from '../utils/metrics/responseFormatter.util.js';

// Initialize services
const notificationService = new NotificationService();
const preferencesService = new NotificationPreferencesService();
const templateService = new NotificationTemplateService();

/**
 * Send a single notification
 */
export const sendNotification = async (req, res) => {
  try {
    const {
      userId,
      type,
      channels,
      recipient,
      subject,
      content,
      htmlContent,
      category,
      priority,
      templateId,
      variables,
      scheduledAt,
      metadata,
    } = req.body;

    // Prepare notification data
    const notificationData = {
      userId,
      type,
      channels,
      recipient,
      subject,
      content,
      htmlContent,
      category,
      priority,
      templateId,
      variables,
      scheduledAt,
      metadata,
      sentBy: req.user?.id || 'system',
    };

    let result;

    // Handle scheduled notifications
    if (scheduledAt) {
      result = await notificationService.scheduleNotification(
        notificationData,
        new Date(scheduledAt)
      );
    } else {
      result = await notificationService.sendNotification(notificationData);
    }

    // Process for real-time delivery if notification was created successfully
    if (result.success && result.notificationId) {
      try {
        await realtimeEventHandlerService.processNotification(
          result.notificationId
        );
      } catch (error) {
        console.warn(
          'Failed to process notification for real-time delivery:',
          error.message
        );
      }
    }

    return res.status(201).json(
      formatSuccessResponse(result, req, {
        message: scheduledAt
          ? 'Notification scheduled successfully'
          : 'Notification sent successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Send batch notifications
 */
export const sendBatchNotifications = async (req, res) => {
  try {
    const { notifications, options = {} } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json(
        formatErrorResponse({
          code: 'INVALID_BATCH_REQUEST',
          message: 'Notifications must be a non-empty array',
        })
      );
    }

    const result = await notificationService.sendBulkNotifications(
      notifications,
      options
    );

    return res.status(201).json(
      formatSuccessResponse(result, req, {
        message: 'Batch notifications processed successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get user notifications with pagination and filtering
 */
export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 20,
      type,
      status,
      category,
      priority,
      dateRange,
    } = req.query;

    // Parse pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Parse date range if provided
    let parsedDateRange;
    if (dateRange) {
      try {
        parsedDateRange = JSON.parse(dateRange);
      } catch (e) {
        return res.status(400).json(
          formatErrorResponse({
            code: 'INVALID_DATE_RANGE',
            message: 'Date range must be a valid JSON object',
          })
        );
      }
    }

    const options = {
      page: pageNum,
      limit: limitNum,
      type,
      status,
      category,
      priority,
      dateRange: parsedDateRange,
    };

    const result = await notificationService.getUserNotifications(
      userId,
      options
    );

    return res.json(formatSuccessResponse(result, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get notification details
 */
export const getNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await notificationService.getNotification(id);

    return res.json(formatSuccessResponse(result, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { channels = [] } = req.body;

    await notificationService.markAsRead(id, channels);

    return res.json(
      formatSuccessResponse({ id, status: 'read' }, req, {
        message: 'Notification marked as read',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Mark notification as unread
 */
export const markAsUnread = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json(
        formatErrorResponse({
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found',
        })
      );
    }

    notification.status = 'delivered';
    notification.readAt = undefined;
    await notification.save();

    return res.json(
      formatSuccessResponse({ id, status: 'delivered' }, req, {
        message: 'Notification marked as unread',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json(
        formatErrorResponse({
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found',
        })
      );
    }

    // Check authorization - users can only delete their own notifications
    if (
      req.user.role !== 'admin' &&
      notification.userId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json(
        formatErrorResponse({
          code: 'ACCESS_DENIED',
          message: 'You can only delete your own notifications',
        })
      );
    }

    // Cancel scheduled notifications if applicable
    if (notification.status === 'pending' || notification.status === 'queued') {
      await notificationService.cancelNotification(id);
    }

    // Soft delete by marking as cancelled
    notification.status = 'cancelled';
    await notification.save();

    return res.json(
      formatSuccessResponse({ id }, req, {
        message: 'Notification deleted successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get notification statistics
 */
export const getNotificationStats = async (req, res) => {
  try {
    const { userId } = req.query;
    const { dateRange, category, type } = req.query;

    // Parse date range if provided
    let parsedDateRange;
    if (dateRange) {
      try {
        parsedDateRange = JSON.parse(dateRange);
      } catch (e) {
        return res.status(400).json(
          formatErrorResponse({
            code: 'INVALID_DATE_RANGE',
            message: 'Date range must be a valid JSON object',
          })
        );
      }
    }

    const options = {
      dateRange: parsedDateRange,
      category,
      type,
    };

    let targetUserId = userId;

    // If not admin, only show stats for own notifications
    if (req.user.role !== 'admin') {
      targetUserId = req.user._id.toString();
    }

    const stats = await Notification.getStats(targetUserId, options);

    return res.json(formatSuccessResponse(stats[0] || {}, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get user notification preferences
 */
export const getUserPreferences = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check authorization
    if (req.user.role !== 'admin' && userId !== req.user._id.toString()) {
      return res.status(403).json(
        formatErrorResponse({
          code: 'ACCESS_DENIED',
          message: 'You can only access your own preferences',
        })
      );
    }

    const preferences = await preferencesService.getPreferences(userId);

    return res.json(formatSuccessResponse(preferences, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Update user notification preferences
 */
export const updateUserPreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const preferencesData = req.body;

    // Check authorization
    if (req.user.role !== 'admin' && userId !== req.user._id.toString()) {
      return res.status(403).json(
        formatErrorResponse({
          code: 'ACCESS_DENIED',
          message: 'You can only update your own preferences',
        })
      );
    }

    const preferences = await preferencesService.updatePreferences(
      userId,
      preferencesData
    );

    return res.json(
      formatSuccessResponse(preferences, req, {
        message: 'Preferences updated successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get notification templates
 */
export const getTemplates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      search,
      isActive,
    } = req.query;

    // Parse pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Parse isActive parameter
    let parsedIsActive;
    if (isActive !== undefined) {
      parsedIsActive = isActive === 'true';
    }

    const filters = {
      type,
      category,
      search,
      isActive: parsedIsActive,
    };

    const templates = await templateService.getTemplates(filters, {
      page: pageNum,
      limit: limitNum,
    });

    return res.json(formatSuccessResponse(templates, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Create notification template
 */
export const createTemplate = async (req, res) => {
  try {
    const templateData = {
      ...req.body,
      createdBy: req.user?.id || 'system',
    };

    const template = await templateService.createTemplate(templateData);

    return res.status(201).json(
      formatSuccessResponse(template, req, {
        message: 'Template created successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Update notification template
 */
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedBy: req.user?.id || 'system',
    };

    const template = await templateService.updateTemplate(id, updateData);

    return res.json(
      formatSuccessResponse(template, req, {
        message: 'Template updated successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Delete notification template
 */
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    await templateService.deleteTemplate(id);

    return res.json(
      formatSuccessResponse({ id }, req, {
        message: 'Template deleted successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Test notification template
 */
export const testTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    const result = await templateService.testTemplate(id, variables);

    return res.json(
      formatSuccessResponse(result, req, {
        message: 'Template tested successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get delivery tracking information
 */
export const getDeliveryTracking = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const deliveries = await NotificationDelivery.find({ notificationId })
      .sort({ createdAt: -1 })
      .populate('notificationId', 'subject content type');

    return res.json(formatSuccessResponse(deliveries, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get notification analytics
 */
export const getNotificationAnalytics = async (req, res) => {
  try {
    const { dateRange, category, type, userId } = req.query;

    // Parse date range if provided
    let parsedDateRange;
    if (dateRange) {
      try {
        parsedDateRange = JSON.parse(dateRange);
      } catch (e) {
        return res.status(400).json(
          formatErrorResponse({
            code: 'INVALID_DATE_RANGE',
            message: 'Date range must be a valid JSON object',
          })
        );
      }
    }

    const options = {
      dateRange: parsedDateRange,
      category,
      type,
    };

    let targetUserId = userId;

    // If not admin, only show analytics for own notifications
    if (req.user.role !== 'admin') {
      targetUserId = req.user._id.toString();
    }

    // Get notification stats
    const notificationStats = await Notification.getStats(
      targetUserId,
      options
    );

    // Get delivery stats
    const deliveryStats = await NotificationDelivery.getDeliveryStats({
      ...options,
      notificationId: undefined, // Get all delivery stats
    });

    // Get engagement metrics
    const engagementMetrics = await NotificationDelivery.getEngagementMetrics({
      ...options,
      notificationId: undefined, // Get all engagement metrics
    });

    const analytics = {
      summary: notificationStats[0] || {},
      delivery: deliveryStats[0] || {},
      engagement: engagementMetrics[0] || {},
    };

    return res.json(formatSuccessResponse(analytics, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Handle Twilio webhook
 */
export const handleTwilioWebhook = async (req, res) => {
  try {
    const { MessageSid, MessageStatus, ErrorCode } = req.body;

    // Find the delivery record
    const delivery = await NotificationDelivery.findOne({
      externalId: MessageSid,
      provider: 'twilio',
    });

    if (!delivery) {
      return res.status(404).json(
        formatErrorResponse({
          code: 'DELIVERY_NOT_FOUND',
          message: 'Delivery record not found for this message',
        })
      );
    }

    // Update delivery status based on webhook
    switch (MessageStatus) {
      case 'sent':
        await delivery.markAsSent();
        break;
      case 'delivered':
        await delivery.markAsDelivered();
        break;
      case 'failed':
      case 'undelivered':
        await delivery.markAsFailed({
          code: ErrorCode || 'UNKNOWN_ERROR',
          message: `Twilio status: ${MessageStatus}`,
        });
        break;
      default:
        console.warn(`Unhandled Twilio status: ${MessageStatus}`);
    }

    // Update parent notification status if needed
    await updateParentNotificationStatus(delivery.notificationId);

    // Respond to Twilio with empty response
    res.type('text/xml');
    res.send('<Response></Response>');
  } catch (error) {
    console.error('Twilio webhook error:', error);
    res.status(500).send('<Response></Response>');
  }
};

/**
 * Handle Mailgun webhook
 */
export const handleMailgunWebhook = async (req, res) => {
  try {
    const event = req.body['event-data'];

    if (!event) {
      return res.status(400).json(
        formatErrorResponse({
          code: 'INVALID_WEBHOOK',
          message: 'Invalid Mailgun webhook format',
        })
      );
    }

    const { event: eventType, message } = event;

    // Find the delivery record
    const delivery = await NotificationDelivery.findOne({
      externalId: message?.headers?.['message-id'],
      provider: 'mailgun',
    });

    if (!delivery) {
      return res.status(404).json(
        formatErrorResponse({
          code: 'DELIVERY_NOT_FOUND',
          message: 'Delivery record not found for this message',
        })
      );
    }

    // Update delivery status based on webhook
    switch (eventType) {
      case 'accepted':
      case 'queued':
        await delivery.markAsQueued(event);
        break;
      case 'delivered':
        await delivery.markAsDelivered(event);
        break;
      case 'opened':
        await delivery.markAsRead(event);
        break;
      case 'clicked':
        await delivery.addClick({
          url: event?.url,
          userAgent: event?.['user-agent'],
          ipAddress: event?.ip,
        });
        break;
      case 'failed':
      case 'bounced':
        await delivery.markAsBounced(
          event?.['bounce-type'] || 'unknown',
          event?.['bounce-error'] || 'Unknown bounce error',
          event
        );
        break;
      case 'complained':
        await delivery.markAsComplained(
          event?.['complaint-type'] || 'spam',
          event
        );
        break;
      case 'unsubscribed':
        await delivery.markAsUnsubscribed(event);
        break;
      default:
        console.warn(`Unhandled Mailgun event: ${eventType}`);
    }

    // Update parent notification status if needed
    await updateParentNotificationStatus(delivery.notificationId);

    return res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Mailgun webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

/**
 * Helper function to update parent notification status
 */
const updateParentNotificationStatus = async (notificationId) => {
  try {
    const deliveries = await NotificationDelivery.find({ notificationId });
    const notification = await Notification.findById(notificationId);

    if (!notification) return;

    // Determine overall status based on delivery statuses
    const hasFailed = deliveries.some(
      (d) => d.status === 'failed' || d.status === 'bounced'
    );
    const hasDelivered = deliveries.some((d) => d.status === 'delivered');
    const hasRead = deliveries.some((d) => d.status === 'read');
    const allSent = deliveries.every(
      (d) =>
        d.status === 'sent' || d.status === 'delivered' || d.status === 'read'
    );

    if (hasRead) {
      notification.status = 'read';
    } else if (hasDelivered) {
      notification.status = 'delivered';
    } else if (allSent) {
      notification.status = 'sent';
    } else if (hasFailed) {
      notification.status = 'failed';
    }

    await notification.save();
  } catch (error) {
    console.error('Error updating parent notification status:', error);
  }
};

export default {
  sendNotification,
  sendBatchNotifications,
  getUserNotifications,
  getNotification,
  markAsRead,
  markAsUnread,
  deleteNotification,
  getNotificationStats,
  getUserPreferences,
  updateUserPreferences,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  testTemplate,
  getDeliveryTracking,
  getNotificationAnalytics,
  handleTwilioWebhook,
  handleMailgunWebhook,
};
