/**
 * User Notification Preferences Controller
 *
 * Handles all user notification preferences API endpoints:
 * - Get user notification preferences
 * - Update user notification preferences
 * - Reset user preferences to defaults
 * - Get available notification types and channels
 * - Validate preference combinations
 * - Handle preference migration
 * - Bulk preference updates
 * - Preference change notifications
 */

import UserNotificationPreferences from '../models/userNotificationPreferences.model.js';
import User from '../models/user.model.js';
import PreferencesMigrationService from '../services/notification/preferencesMigration.service.js';
import PreferencesValidationService from '../services/notification/preferencesValidation.service.js';
import NotificationPreferencesService from '../services/notification/notificationPreferences.service.js';
import {
  formatSuccessResponse,
  formatErrorResponse,
  handleControllerError,
} from '../utils/metrics/responseFormatter.util.js';

// Initialize services
const migrationService = new PreferencesMigrationService();
const validationService = new PreferencesValidationService();
const preferencesService = new NotificationPreferencesService();

/**
 * Get user notification preferences
 */
export const getUserPreferences = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check authorization - users can only access their own preferences unless admin
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

    // Validate preferences before updating
    const validation =
      await validationService.validatePreferences(preferencesData);
    if (!validation.isValid) {
      return res.status(400).json(
        formatErrorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Invalid preferences',
          details: validation.errors,
        })
      );
    }

    // Add updated by information
    preferencesData.updatedBy = req.user._id.toString();

    const preferences = await preferencesService.updatePreferences(
      userId,
      preferencesData
    );

    // Send notification about preference change if enabled
    if (preferencesData.notifyOnChange !== false) {
      await sendPreferenceChangeNotification(userId, preferencesData);
    }

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
 * Reset user preferences to defaults
 */
export const resetUserPreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.body;

    // Check authorization
    if (req.user.role !== 'admin' && userId !== req.user._id.toString()) {
      return res.status(403).json(
        formatErrorResponse({
          code: 'ACCESS_DENIED',
          message: 'You can only reset your own preferences',
        })
      );
    }

    // Get user information to determine appropriate defaults
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(
        formatErrorResponse({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        })
      );
    }

    // Delete existing preferences
    await UserNotificationPreferences.deleteOne({ userId });

    // Create new default preferences
    const defaultOptions = {
      email: user.email,
      phone: user.phone,
      userType: userType || 'standard',
    };

    const preferences = await preferencesService.createDefaultPreferences(
      userId,
      defaultOptions
    );

    return res.json(
      formatSuccessResponse(preferences, req, {
        message: 'Preferences reset to defaults successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get available notification types and channels
 */
export const getAvailableOptions = async (req, res) => {
  try {
    const options = {
      categories: [
        {
          name: 'welcome',
          description: 'Welcome messages for new users',
          defaultChannels: ['email', 'in_app'],
          required: false,
        },
        {
          name: 'application',
          description: 'Solar application status updates',
          defaultChannels: ['email', 'sms', 'in_app'],
          required: false,
        },
        {
          name: 'kyc',
          description: 'KYC verification notifications',
          defaultChannels: ['email', 'sms', 'in_app'],
          required: false,
        },
        {
          name: 'payment',
          description: 'Payment and transaction notifications',
          defaultChannels: ['email', 'sms', 'in_app'],
          required: false,
        },
        {
          name: 'support',
          description: 'Customer support communications',
          defaultChannels: ['email', 'sms', 'in_app'],
          required: false,
        },
        {
          name: 'marketing',
          description: 'Marketing and promotional messages',
          defaultChannels: ['email'],
          required: false,
        },
        {
          name: 'general',
          description: 'General platform announcements',
          defaultChannels: ['email', 'in_app'],
          required: false,
        },
        {
          name: 'alert',
          description: 'System alerts and security notifications',
          defaultChannels: ['email', 'sms', 'in_app', 'push_notification'],
          required: true, // Alerts cannot be disabled
        },
        {
          name: 'reminder',
          description: 'Payment and appointment reminders',
          defaultChannels: ['email', 'sms', 'in_app'],
          required: false,
        },
      ],
      channels: [
        {
          name: 'email',
          description: 'Email notifications',
          requiresVerification: true,
          icon: 'email',
        },
        {
          name: 'sms',
          description: 'SMS text messages',
          requiresVerification: true,
          icon: 'sms',
        },
        {
          name: 'in_app',
          description: 'In-app notifications',
          requiresVerification: false,
          icon: 'notifications',
        },
        {
          name: 'push_notification',
          description: 'Push notifications to mobile devices',
          requiresVerification: false,
          icon: 'mobile',
        },
      ],
      priorities: [
        {
          name: 'low',
          description: 'Low priority notifications',
          color: 'gray',
        },
        {
          name: 'medium',
          description: 'Medium priority notifications',
          color: 'blue',
        },
        {
          name: 'high',
          description: 'High priority notifications',
          color: 'orange',
        },
        {
          name: 'urgent',
          description: 'Urgent notifications',
          color: 'red',
        },
      ],
      frequencyLimits: {
        maxPerHour: {
          min: 1,
          max: 100,
          default: 10,
        },
        maxPerDay: {
          min: 1,
          max: 1000,
          default: 50,
        },
        maxPerWeek: {
          min: 1,
          max: 5000,
          default: 200,
        },
      },
    };

    return res.json(formatSuccessResponse(options, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Validate preference combinations
 */
export const validatePreferences = async (req, res) => {
  try {
    const preferencesData = req.body;

    const validation =
      await validationService.validatePreferences(preferencesData);

    return res.json(formatSuccessResponse(validation, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Migrate user preferences
 */
export const migratePreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const { targetVersion, force } = req.body;

    // Check authorization - only admins can migrate preferences
    if (req.user.role !== 'admin') {
      return res.status(403).json(
        formatErrorResponse({
          code: 'ACCESS_DENIED',
          message: 'Only administrators can migrate preferences',
        })
      );
    }

    const result = await migrationService.migrateUserPreferences(
      userId,
      targetVersion,
      force
    );

    return res.json(
      formatSuccessResponse(result, req, {
        message: 'Preferences migrated successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Bulk migrate user preferences
 */
export const bulkMigratePreferences = async (req, res) => {
  try {
    const { targetVersion, batchSize = 100, force } = req.body;

    // Check authorization - only admins can bulk migrate
    if (req.user.role !== 'admin') {
      return res.status(403).json(
        formatErrorResponse({
          code: 'ACCESS_DENIED',
          message: 'Only administrators can bulk migrate preferences',
        })
      );
    }

    const result = await migrationService.bulkMigratePreferences(
      targetVersion,
      batchSize,
      force
    );

    return res.json(
      formatSuccessResponse(result, req, {
        message: 'Bulk migration completed successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get preference statistics
 */
export const getPreferenceStats = async (req, res) => {
  try {
    const { dateRange, category, channel } = req.query;

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

    const stats = await UserNotificationPreferences.getStats({
      dateRange: parsedDateRange,
      category,
      channel,
    });

    return res.json(formatSuccessResponse(stats, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Update device token for push notifications
 */
export const updateDeviceToken = async (req, res) => {
  try {
    const { userId } = req.params;
    const { token, platform } = req.body;

    // Check authorization
    if (req.user.role !== 'admin' && userId !== req.user._id.toString()) {
      return res.status(403).json(
        formatErrorResponse({
          code: 'ACCESS_DENIED',
          message: 'You can only update your own device tokens',
        })
      );
    }

    const result = await preferencesService.addDeviceToken(
      userId,
      token,
      platform
    );

    return res.json(
      formatSuccessResponse(result, req, {
        message: 'Device token updated successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Remove device token
 */
export const removeDeviceToken = async (req, res) => {
  try {
    const { userId } = req.params;
    const { token } = req.body;

    // Check authorization
    if (req.user.role !== 'admin' && userId !== req.user._id.toString()) {
      return res.status(403).json(
        formatErrorResponse({
          code: 'ACCESS_DENIED',
          message: 'You can only remove your own device tokens',
        })
      );
    }

    const result = await preferencesService.removeDeviceToken(userId, token);

    return res.json(
      formatSuccessResponse(result, req, {
        message: 'Device token removed successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Verify email address
 */
export const verifyEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { email } = req.body;

    // Check authorization
    if (req.user.role !== 'admin' && userId !== req.user._id.toString()) {
      return res.status(403).json(
        formatErrorResponse({
          code: 'ACCESS_DENIED',
          message: 'You can only verify your own email',
        })
      );
    }

    const result = await preferencesService.updateEmail(userId, email, true);

    return res.json(
      formatSuccessResponse(result, req, {
        message: 'Email verified successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Verify phone number
 */
export const verifyPhone = async (req, res) => {
  try {
    const { userId } = req.params;
    const { phone } = req.body;

    // Check authorization
    if (req.user.role !== 'admin' && userId !== req.user._id.toString()) {
      return res.status(403).json(
        formatErrorResponse({
          code: 'ACCESS_DENIED',
          message: 'You can only verify your own phone number',
        })
      );
    }

    const result = await preferencesService.updatePhone(userId, phone, true);

    return res.json(
      formatSuccessResponse(result, req, {
        message: 'Phone number verified successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Send notification about preference change
 */
const sendPreferenceChangeNotification = async (userId, changes) => {
  try {
    // Only send if user has in-app notifications enabled
    const inAppEnabled = await preferencesService.isChannelEnabled(
      userId,
      'in_app'
    );
    if (!inAppEnabled) return;

    const notificationData = {
      userId,
      type: 'in_app',
      channels: ['in_app'],
      subject: 'Notification Preferences Updated',
      content: 'Your notification preferences have been updated successfully.',
      category: 'general',
      priority: 'low',
      metadata: {
        preferenceChanges: Object.keys(changes),
        updatedAt: new Date().toISOString(),
      },
    };

    // Import notification service dynamically to avoid circular dependency
    const { default: NotificationService } = await import(
      '../services/notification/notification.service.js'
    );
    const notificationService = new NotificationService();

    await notificationService.sendNotification(notificationData);
  } catch (error) {
    console.error('Failed to send preference change notification:', error);
    // Don't throw error - preference update should still succeed
  }
};

export default {
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,
  getAvailableOptions,
  validatePreferences,
  migratePreferences,
  bulkMigratePreferences,
  getPreferenceStats,
  updateDeviceToken,
  removeDeviceToken,
  verifyEmail,
  verifyPhone,
};
