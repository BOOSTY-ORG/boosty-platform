/**
 * Notification Routes
 *
 * Defines all notification-related API endpoints:
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

import { Router } from 'express';
import notificationController from '../controllers/notification.controller.js';
import {
  authenticateNotificationRequest,
  requireNotificationAccess,
  requirePreferencesAccess,
  requireTemplateManagement,
  requireAnalyticsAccess,
  canSendToUser,
  sendNotificationRateLimit,
  bulkOperationRateLimit,
  templateOperationRateLimit,
} from '../middleware/notification/notificationAuth.middleware.js';
import {
  validateNotificationCreation,
  validateBatchNotification,
  validateNotificationStatusUpdate,
  validatePreferencesUpdate,
  validateTemplateOperation,
  validateTemplateTest,
  validateNotificationQuery,
  validateTemplateQuery,
} from '../middleware/notification/notificationValidation.middleware.js';

const router = Router();

/**
 * Notification Management Routes
 */

// Send notification
router.post(
  '/send',
  authenticateNotificationRequest,
  sendNotificationRateLimit,
  canSendToUser,
  validateNotificationCreation,
  notificationController.sendNotification
);

// Send batch notifications
router.post(
  '/batch',
  authenticateNotificationRequest,
  bulkOperationRateLimit,
  validateBatchNotification,
  notificationController.sendBatchNotifications
);

// Get user notifications
router.get(
  '/users/:userId',
  authenticateNotificationRequest,
  validateNotificationQuery,
  notificationController.getUserNotifications
);

// Get notification details
router.get(
  '/:id',
  authenticateNotificationRequest,
  requireNotificationAccess,
  notificationController.getNotification
);

// Mark notification as read
router.put(
  '/:id/read',
  authenticateNotificationRequest,
  requireNotificationAccess,
  validateNotificationStatusUpdate,
  notificationController.markAsRead
);

// Mark notification as unread
router.put(
  '/:id/unread',
  authenticateNotificationRequest,
  requireNotificationAccess,
  notificationController.markAsUnread
);

// Delete notification
router.delete(
  '/:id',
  authenticateNotificationRequest,
  requireNotificationAccess,
  notificationController.deleteNotification
);

// Get notification statistics
router.get(
  '/stats',
  authenticateNotificationRequest,
  notificationController.getNotificationStats
);

// Get notification analytics
router.get(
  '/analytics',
  authenticateNotificationRequest,
  requireAnalyticsAccess,
  notificationController.getNotificationAnalytics
);

// Get delivery tracking
router.get(
  '/:id/delivery',
  authenticateNotificationRequest,
  requireNotificationAccess,
  notificationController.getDeliveryTracking
);

/**
 * User Preferences Routes
 */

// Get user preferences
router.get(
  '/preferences/:userId',
  authenticateNotificationRequest,
  requirePreferencesAccess,
  notificationController.getUserPreferences
);

// Update user preferences
router.put(
  '/preferences/:userId',
  authenticateNotificationRequest,
  requirePreferencesAccess,
  validatePreferencesUpdate,
  notificationController.updateUserPreferences
);

/**
 * Template Management Routes
 */

// Get templates
router.get(
  '/templates',
  authenticateNotificationRequest,
  validateTemplateQuery,
  notificationController.getTemplates
);

// Create template
router.post(
  '/templates',
  authenticateNotificationRequest,
  requireTemplateManagement,
  templateOperationRateLimit,
  validateTemplateOperation,
  notificationController.createTemplate
);

// Update template
router.put(
  '/templates/:id',
  authenticateNotificationRequest,
  requireTemplateManagement,
  templateOperationRateLimit,
  validateTemplateOperation,
  notificationController.updateTemplate
);

// Delete template
router.delete(
  '/templates/:id',
  authenticateNotificationRequest,
  requireTemplateManagement,
  templateOperationRateLimit,
  notificationController.deleteTemplate
);

// Test template
router.post(
  '/templates/:id/test',
  authenticateNotificationRequest,
  requireTemplateManagement,
  validateTemplateTest,
  notificationController.testTemplate
);

export default router;
