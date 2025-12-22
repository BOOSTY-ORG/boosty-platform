/**
 * Notification Preferences Service
 *
 * This service manages user notification preferences:
 * - User preference management
 * - Default preferences for new users
 * - Preference validation and normalization
 * - Channel availability checking
 * - Frequency control enforcement
 * - Quiet hours handling
 * - Preference updates and synchronization
 */

import UserNotificationPreferences from '../../models/userNotificationPreferences.model.js';
import User from '../../models/user.model.js';
import NotificationDelivery from '../../models/notificationDelivery.model.js';

class NotificationPreferencesService {
  constructor() {
    this.defaultPreferences = this.getDefaultPreferences();
    this.logger = this.createLogger();
  }

  /**
   * Get or create user preferences
   * @param {string} userId - User ID
   * @param {object} options - Options for preference creation
   * @returns {Promise<object>} - User preferences
   */
  async getOrCreatePreferences(userId, options = {}) {
    try {
      let preferences = await UserNotificationPreferences.findOne({ userId });

      if (!preferences) {
        this.logger.info('Creating default preferences for user', { userId });
        preferences = await this.createDefaultPreferences(userId, options);
      }

      return preferences;
    } catch (error) {
      this.logger.error('Failed to get or create preferences', {
        error: error.message,
        userId,
      });
      throw new Error(`Failed to get preferences: ${error.message}`);
    }
  }

  /**
   * Get user preferences
   * @param {string} userId - User ID
   * @returns {Promise<object>} - User preferences
   */
  async getPreferences(userId) {
    try {
      const preferences = await UserNotificationPreferences.findOne({ userId });

      if (!preferences) {
        throw new Error('Preferences not found for user');
      }

      return preferences;
    } catch (error) {
      this.logger.error('Failed to get preferences', {
        error: error.message,
        userId,
      });
      throw new Error(`Failed to get preferences: ${error.message}`);
    }
  }

  /**
   * Update user preferences
   * @param {string} userId - User ID
   * @param {object} preferencesData - Preferences to update
   * @returns {Promise<object>} - Updated preferences
   */
  async updatePreferences(userId, preferencesData) {
    try {
      let preferences = await UserNotificationPreferences.findOne({ userId });

      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }

      // Validate preferences
      const validation = this.validatePreferences(preferencesData);
      if (!validation.isValid) {
        throw new Error(`Invalid preferences: ${validation.errors.join(', ')}`);
      }

      // Update global settings
      if (preferencesData.globalEnabled !== undefined) {
        preferences.globalEnabled = preferencesData.globalEnabled;
      }

      // Update quiet hours
      if (preferencesData.quietHours) {
        await this.updateQuietHours(preferences, preferencesData.quietHours);
      }

      // Update channel preferences
      if (preferencesData.channels) {
        await this.updateChannelPreferences(
          preferences,
          preferencesData.channels
        );
      }

      // Update category preferences
      if (preferencesData.categories) {
        await this.updateCategoryPreferences(
          preferences,
          preferencesData.categories
        );
      }

      // Update frequency limits
      if (preferencesData.frequencyLimits) {
        await this.updateFrequencyLimits(
          preferences,
          preferencesData.frequencyLimits
        );
      }

      preferences.lastUpdated = new Date();
      preferences.updatedBy = preferencesData.updatedBy || 'user';

      await preferences.save();

      this.logger.info('Preferences updated successfully', {
        userId,
        updatedFields: Object.keys(preferencesData),
      });

      return preferences;
    } catch (error) {
      this.logger.error('Failed to update preferences', {
        error: error.message,
        userId,
      });
      throw new Error(`Failed to update preferences: ${error.message}`);
    }
  }

  /**
   * Create default preferences for a new user
   * @param {string} userId - User ID
   * @param {object} options - Options for preference creation
   * @returns {Promise<object>} - Created preferences
   */
  async createDefaultPreferences(userId, options = {}) {
    try {
      const {
        email,
        phone,
        countryCode = '+1',
        userType = 'standard',
      } = options;

      // Get user type-specific defaults
      const userDefaults = this.getUserTypeDefaults(userType);

      const preferences = new UserNotificationPreferences({
        userId,
        globalEnabled: true,
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC',
        },
        channels: {
          email: {
            enabled: userDefaults.channels.email.enabled,
            address: email || null,
            verified: false,
          },
          sms: {
            enabled: userDefaults.channels.sms.enabled,
            phoneNumber: phone || null,
            verified: false,
            countryCode,
          },
          inApp: {
            enabled: userDefaults.channels.inApp.enabled,
            sound: userDefaults.channels.inApp.sound,
            vibration: userDefaults.channels.inApp.vibration,
          },
          pushNotification: {
            enabled: userDefaults.channels.pushNotification.enabled,
            deviceTokens: [],
          },
        },
        categories: userDefaults.categories,
        frequencyLimits: userDefaults.frequencyLimits,
        lastUpdated: new Date(),
        updatedBy: 'system',
        version: '2.0.0',
      });

      await preferences.save();

      this.logger.info('Default preferences created', { userId, userType });
      return preferences;
    } catch (error) {
      this.logger.error('Failed to create default preferences', {
        error: error.message,
        userId,
      });
      throw new Error(`Failed to create preferences: ${error.message}`);
    }
  }

  /**
   * Check if a channel is enabled for a user
   * @param {string} userId - User ID
   * @param {string} channel - Channel to check
   * @returns {Promise<boolean>} - Whether channel is enabled
   */
  async isChannelEnabled(userId, channel) {
    try {
      const preferences = await this.getOrCreatePreferences(userId);
      return preferences.isChannelEnabled(channel);
    } catch (error) {
      this.logger.error('Failed to check channel enabled status', {
        error: error.message,
        userId,
        channel,
      });
      return false;
    }
  }

  /**
   * Check if a category is enabled for a user
   * @param {string} userId - User ID
   * @param {string} category - Category to check
   * @returns {Promise<boolean>} - Whether category is enabled
   */
  async isCategoryEnabled(userId, category) {
    try {
      const preferences = await this.getOrCreatePreferences(userId);
      return preferences.isCategoryEnabled(category);
    } catch (error) {
      this.logger.error('Failed to check category enabled status', {
        error: error.message,
        userId,
        category,
      });
      return false;
    }
  }

  /**
   * Get enabled channels for a category
   * @param {string} userId - User ID
   * @param {string} category - Category
   * @returns {Promise<Array>} - Array of enabled channels
   */
  async getEnabledChannelsForCategory(userId, category) {
    try {
      const preferences = await this.getOrCreatePreferences(userId);
      return preferences.getEnabledChannelsForCategory(category);
    } catch (error) {
      this.logger.error('Failed to get enabled channels for category', {
        error: error.message,
        userId,
        category,
      });
      return [];
    }
  }

  /**
   * Check if user is in quiet hours
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Whether user is in quiet hours
   */
  async isInQuietHours(userId) {
    try {
      const preferences = await this.getOrCreatePreferences(userId);
      return preferences.isInQuietHours;
    } catch (error) {
      this.logger.error('Failed to check quiet hours', {
        error: error.message,
        userId,
      });
      return false;
    }
  }

  /**
   * Check frequency limits for a user
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Frequency limit status
   */
  async checkFrequencyLimits(userId) {
    try {
      const preferences = await this.getOrCreatePreferences(userId);
      const { maxPerHour, maxPerDay, maxPerWeek } = preferences.frequencyLimits;

      // Get current notification counts
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [countHour, countDay, countWeek] = await Promise.all([
        this.getNotificationCount(userId, oneHourAgo, now),
        this.getNotificationCount(userId, oneDayAgo, now),
        this.getNotificationCount(userId, oneWeekAgo, now),
      ]);

      return {
        hour: {
          current: countHour,
          max: maxPerHour,
          exceeded: countHour >= maxPerHour,
        },
        day: {
          current: countDay,
          max: maxPerDay,
          exceeded: countDay >= maxPerDay,
        },
        week: {
          current: countWeek,
          max: maxPerWeek,
          exceeded: countWeek >= maxPerWeek,
        },
        canSend:
          countHour < maxPerHour &&
          countDay < maxPerDay &&
          countWeek < maxPerWeek,
      };
    } catch (error) {
      this.logger.error('Failed to check frequency limits', {
        error: error.message,
        userId,
      });
      return {
        hour: { current: 0, max: 10, exceeded: false },
        day: { current: 0, max: 50, exceeded: false },
        week: { current: 0, max: 200, exceeded: false },
        canSend: true,
      };
    }
  }

  /**
   * Add or update device token for push notifications
   * @param {string} userId - User ID
   * @param {string} token - Device token
   * @param {string} platform - Platform (ios, android, web)
   * @returns {Promise<object>} - Result
   */
  async addDeviceToken(userId, token, platform) {
    try {
      const preferences = await this.getOrCreatePreferences(userId);
      await preferences.addDeviceToken(token, platform);

      this.logger.info('Device token added', {
        userId,
        platform,
        tokenLength: token.length,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to add device token', {
        error: error.message,
        userId,
      });
      throw new Error(`Failed to add device token: ${error.message}`);
    }
  }

  /**
   * Remove device token
   * @param {string} userId - User ID
   * @param {string} token - Device token to remove
   * @returns {Promise<object>} - Result
   */
  async removeDeviceToken(userId, token) {
    try {
      const preferences = await this.getOrCreatePreferences(userId);
      await preferences.removeDeviceToken(token);

      this.logger.info('Device token removed', {
        userId,
        tokenLength: token.length,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to remove device token', {
        error: error.message,
        userId,
      });
      throw new Error(`Failed to remove device token: ${error.message}`);
    }
  }

  /**
   * Update email address and verification status
   * @param {string} userId - User ID
   * @param {string} email - Email address
   * @param {boolean} verified - Verification status
   * @returns {Promise<object>} - Result
   */
  async updateEmail(userId, email, verified = false) {
    try {
      const preferences = await this.getOrCreatePreferences(userId);
      await preferences.updateEmail(email, verified);

      this.logger.info('Email updated', {
        userId,
        email,
        verified,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to update email', {
        error: error.message,
        userId,
      });
      throw new Error(`Failed to update email: ${error.message}`);
    }
  }

  /**
   * Update phone number and verification status
   * @param {string} userId - User ID
   * @param {string} phone - Phone number
   * @param {boolean} verified - Verification status
   * @returns {Promise<object>} - Result
   */
  async updatePhone(userId, phone, verified = false) {
    try {
      const preferences = await this.getOrCreatePreferences(userId);
      await preferences.updatePhone(phone, verified);

      this.logger.info('Phone updated', {
        userId,
        phone,
        verified,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to update phone', {
        error: error.message,
        userId,
      });
      throw new Error(`Failed to update phone: ${error.message}`);
    }
  }

  /**
   * Update quiet hours settings
   * @param {object} preferences - Preferences object
   * @param {object} quietHours - Quiet hours settings
   */
  async updateQuietHours(preferences, quietHours) {
    const { enabled, startTime, endTime, timezone } = quietHours;

    preferences.quietHours.enabled =
      enabled !== undefined ? enabled : preferences.quietHours.enabled;

    if (startTime !== undefined) {
      // Validate time format
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
        throw new Error('Invalid start time format. Use HH:MM format.');
      }
      preferences.quietHours.startTime = startTime;
    }

    if (endTime !== undefined) {
      // Validate time format
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
        throw new Error('Invalid end time format. Use HH:MM format.');
      }
      preferences.quietHours.endTime = endTime;
    }

    if (timezone !== undefined) {
      preferences.quietHours.timezone = timezone;
    }
  }

  /**
   * Update channel preferences
   * @param {object} preferences - Preferences object
   * @param {object} channels - Channel preferences
   */
  async updateChannelPreferences(preferences, channels) {
    for (const [channel, channelPrefs] of Object.entries(channels)) {
      if (preferences.channels[channel]) {
        Object.assign(preferences.channels[channel], channelPrefs);
      }
    }
  }

  /**
   * Update category preferences
   * @param {object} preferences - Preferences object
   * @param {object} categories - Category preferences
   */
  async updateCategoryPreferences(preferences, categories) {
    for (const [category, categoryPrefs] of Object.entries(categories)) {
      if (preferences.categories[category]) {
        await preferences.updateCategoryPreferences(
          category,
          categoryPrefs.enabled,
          categoryPrefs.channels
        );
      }
    }
  }

  /**
   * Update frequency limits
   * @param {object} preferences - Preferences object
   * @param {object} frequencyLimits - Frequency limits
   */
  async updateFrequencyLimits(preferences, frequencyLimits) {
    await preferences.updateFrequencyLimits(
      frequencyLimits.maxPerHour,
      frequencyLimits.maxPerDay,
      frequencyLimits.maxPerWeek
    );
  }

  /**
   * Validate preferences data
   * @param {object} preferencesData - Preferences to validate
   * @returns {object} - Validation result
   */
  validatePreferences(preferencesData) {
    const errors = [];
    const warnings = [];

    // Validate quiet hours
    if (preferencesData.quietHours) {
      const { startTime, endTime } = preferencesData.quietHours;

      if (startTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
        errors.push('Invalid quiet hours start time format. Use HH:MM format.');
      }

      if (endTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
        errors.push('Invalid quiet hours end time format. Use HH:MM format.');
      }
    }

    // Validate frequency limits
    if (preferencesData.frequencyLimits) {
      const { maxPerHour, maxPerDay, maxPerWeek } =
        preferencesData.frequencyLimits;

      if (maxPerHour !== undefined && (maxPerHour < 1 || maxPerHour > 100)) {
        errors.push('maxPerHour must be between 1 and 100');
      }

      if (maxPerDay !== undefined && (maxPerDay < 1 || maxPerDay > 1000)) {
        errors.push('maxPerDay must be between 1 and 1000');
      }

      if (maxPerWeek !== undefined && (maxPerWeek < 1 || maxPerWeek > 5000)) {
        errors.push('maxPerWeek must be between 1 and 5000');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get notification count for a user within a time range
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} - Notification count
   */
  async getNotificationCount(userId, startDate, endDate) {
    try {
      return await NotificationDelivery.countDocuments({
        notificationId: { $in: await this.getNotificationIds(userId) },
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ['sent', 'delivered', 'read'] },
      });
    } catch (error) {
      this.logger.error('Failed to get notification count', {
        error: error.message,
        userId,
      });
      return 0;
    }
  }

  /**
   * Get notification IDs for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of notification IDs
   */
  async getNotificationIds(userId) {
    try {
      const notifications = await NotificationDelivery.find({
        notificationId: { $exists: true },
      }).distinct('notificationId');

      // Get notifications for this user
      const userNotifications = await Notification.find({
        _id: { $in: notifications },
        userId,
      }).distinct('_id');

      return userNotifications;
    } catch (error) {
      this.logger.error('Failed to get notification IDs', {
        error: error.message,
        userId,
      });
      return [];
    }
  }

  /**
   * Get default preferences structure
   * @returns {object} - Default preferences
   */
  getDefaultPreferences() {
    return this.getUserTypeDefaults('standard');
  }

  /**
   * Get default preferences based on user type
   * @param {string} userType - User type (standard, investor, admin, business)
   * @returns {object} - Default preferences for user type
   */
  getUserTypeDefaults(userType) {
    const baseDefaults = {
      globalEnabled: true,
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
      },
      channels: {
        email: {
          enabled: true,
          verified: false,
        },
        sms: {
          enabled: true,
          verified: false,
          countryCode: '+1',
        },
        inApp: {
          enabled: true,
          sound: true,
          vibration: true,
        },
        pushNotification: {
          enabled: true,
          deviceTokens: [],
        },
      },
      categories: {
        welcome: {
          enabled: true,
          channels: ['email', 'in_app'],
        },
        application: {
          enabled: true,
          channels: ['email', 'sms', 'in_app'],
        },
        kyc: {
          enabled: true,
          channels: ['email', 'sms', 'in_app'],
        },
        payment: {
          enabled: true,
          channels: ['email', 'sms', 'in_app'],
        },
        support: {
          enabled: true,
          channels: ['email', 'sms', 'in_app'],
        },
        marketing: {
          enabled: false,
          channels: ['email'],
        },
        general: {
          enabled: true,
          channels: ['email', 'in_app'],
        },
        alert: {
          enabled: true,
          channels: ['email', 'sms', 'in_app', 'push_notification'],
        },
        reminder: {
          enabled: true,
          channels: ['email', 'sms', 'in_app'],
        },
      },
      frequencyLimits: {
        maxPerHour: 10,
        maxPerDay: 50,
        maxPerWeek: 200,
      },
    };

    // Customize based on user type
    switch (userType) {
      case 'admin':
        return {
          ...baseDefaults,
          channels: {
            ...baseDefaults.channels,
            email: {
              ...baseDefaults.channels.email,
              enabled: true,
            },
            sms: {
              ...baseDefaults.channels.sms,
              enabled: true,
            },
            pushNotification: {
              ...baseDefaults.channels.pushNotification,
              enabled: true,
            },
          },
          categories: {
            ...baseDefaults.categories,
            alert: {
              ...baseDefaults.categories.alert,
              channels: ['email', 'sms', 'in_app', 'push_notification'],
            },
            support: {
              ...baseDefaults.categories.support,
              channels: ['email', 'sms', 'in_app', 'push_notification'],
            },
          },
          frequencyLimits: {
            maxPerHour: 20,
            maxPerDay: 100,
            maxPerWeek: 500,
          },
        };

      case 'investor':
        return {
          ...baseDefaults,
          channels: {
            ...baseDefaults.channels,
            email: {
              ...baseDefaults.channels.email,
              enabled: true,
            },
            sms: {
              ...baseDefaults.channels.sms,
              enabled: true,
            },
            pushNotification: {
              ...baseDefaults.channels.pushNotification,
              enabled: true,
            },
          },
          categories: {
            ...baseDefaults.categories,
            payment: {
              ...baseDefaults.categories.payment,
              channels: ['email', 'sms', 'in_app', 'push_notification'],
            },
            application: {
              ...baseDefaults.categories.application,
              channels: ['email', 'sms', 'in_app', 'push_notification'],
            },
            kyc: {
              ...baseDefaults.categories.kyc,
              channels: ['email', 'sms', 'in_app', 'push_notification'],
            },
            reminder: {
              ...baseDefaults.categories.reminder,
              channels: ['email', 'sms', 'in_app', 'push_notification'],
            },
          },
          frequencyLimits: {
            maxPerHour: 15,
            maxPerDay: 75,
            maxPerWeek: 300,
          },
        };

      case 'business':
        return {
          ...baseDefaults,
          channels: {
            ...baseDefaults.channels,
            email: {
              ...baseDefaults.channels.email,
              enabled: true,
            },
            sms: {
              ...baseDefaults.channels.sms,
              enabled: true,
            },
          },
          categories: {
            ...baseDefaults.categories,
            marketing: {
              ...baseDefaults.categories.marketing,
              enabled: true,
              channels: ['email'],
            },
            support: {
              ...baseDefaults.categories.support,
              channels: ['email', 'sms'],
            },
          },
          frequencyLimits: {
            maxPerHour: 12,
            maxPerDay: 60,
            maxPerWeek: 250,
          },
        };

      case 'standard':
      default:
        return baseDefaults;
    }
  }

  /**
   * Create a logger instance
   * @returns {object} - Logger instance
   */
  createLogger() {
    return {
      info: (message, data = {}) => {
        console.log(`[NotificationPreferencesService] INFO: ${message}`, data);
      },
      warn: (message, data = {}) => {
        console.warn(`[NotificationPreferencesService] WARN: ${message}`, data);
      },
      error: (message, error) => {
        console.error(
          `[NotificationPreferencesService] ERROR: ${message}`,
          error
        );
      },
    };
  }
}

export default NotificationPreferencesService;
