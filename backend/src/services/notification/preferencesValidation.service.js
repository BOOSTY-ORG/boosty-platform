/**
 * Preferences Validation Service
 *
 * Validates user notification preferences:
 * - Validate preference combinations
 * - Check for logical conflicts
 * - Ensure at least one channel is enabled
 * - Validate quiet hours and timezone settings
 * - Validate frequency limits
 * - Check for circular dependencies
 * - Validate channel availability
 * - Ensure compliance with notification best practices
 */

class PreferencesValidationService {
  constructor() {
    this.logger = this.createLogger();

    // Valid notification channels
    this.validChannels = ['email', 'sms', 'in_app', 'push_notification'];

    // Valid notification categories
    this.validCategories = [
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

    // Valid priorities
    this.validPriorities = ['low', 'medium', 'high', 'urgent'];

    // Required categories (cannot be disabled)
    this.requiredCategories = ['alert'];

    // Timezone list (simplified - in production use a comprehensive list)
    this.validTimezones = [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney',
      'Africa/Lagos',
    ];
  }

  /**
   * Validate preferences data
   * @param {object} preferencesData - Preferences to validate
   * @returns {Promise<object>} - Validation result
   */
  async validatePreferences(preferencesData) {
    try {
      const errors = [];
      const warnings = [];

      // Validate global settings
      this.validateGlobalSettings(preferencesData, errors, warnings);

      // Validate quiet hours
      this.validateQuietHours(preferencesData, errors, warnings);

      // Validate channel preferences
      this.validateChannelPreferences(preferencesData, errors, warnings);

      // Validate category preferences
      this.validateCategoryPreferences(preferencesData, errors, warnings);

      // Validate frequency limits
      this.validateFrequencyLimits(preferencesData, errors, warnings);

      // Validate logical consistency
      await this.validateLogicalConsistency(preferencesData, errors, warnings);

      // Validate compliance
      this.validateCompliance(preferencesData, errors, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error('Preferences validation failed', {
        error: error.message,
      });
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Validate global settings
   * @param {object} preferences - Preferences data
   * @param {Array} errors - Errors array
   * @param {Array} warnings - Warnings array
   */
  validateGlobalSettings(preferences, errors, warnings) {
    if (
      preferences.globalEnabled !== undefined &&
      typeof preferences.globalEnabled !== 'boolean'
    ) {
      errors.push('globalEnabled must be a boolean value');
    }

    // Check if all notifications are disabled
    if (preferences.globalEnabled === false) {
      warnings.push(
        'All notifications are disabled. You may miss important updates.'
      );
    }
  }

  /**
   * Validate quiet hours settings
   * @param {object} preferences - Preferences data
   * @param {Array} errors - Errors array
   * @param {Array} warnings - Warnings array
   */
  validateQuietHours(preferences, errors, warnings) {
    if (!preferences.quietHours) return;

    const { quietHours } = preferences;

    if (
      quietHours.enabled !== undefined &&
      typeof quietHours.enabled !== 'boolean'
    ) {
      errors.push('quietHours.enabled must be a boolean value');
    }

    if (quietHours.startTime !== undefined) {
      if (typeof quietHours.startTime !== 'string') {
        errors.push('quietHours.startTime must be a string');
      } else if (
        !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(quietHours.startTime)
      ) {
        errors.push('quietHours.startTime must be in HH:MM format (24-hour)');
      }
    }

    if (quietHours.endTime !== undefined) {
      if (typeof quietHours.endTime !== 'string') {
        errors.push('quietHours.endTime must be a string');
      } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(quietHours.endTime)) {
        errors.push('quietHours.endTime must be in HH:MM format (24-hour)');
      }
    }

    if (quietHours.timezone !== undefined) {
      if (typeof quietHours.timezone !== 'string') {
        errors.push('quietHours.timezone must be a string');
      } else if (!this.validTimezones.includes(quietHours.timezone)) {
        warnings.push(
          `Unknown timezone: ${quietHours.timezone}. Using UTC as fallback.`
        );
      }
    }

    // Validate time range logic
    if (quietHours.startTime && quietHours.endTime && quietHours.enabled) {
      const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
      const [endHour, endMin] = quietHours.endTime.split(':').map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (startMinutes === endMinutes) {
        warnings.push(
          'Quiet hours start and end time are the same. Quiet hours will be active 24/7.'
        );
      }
    }
  }

  /**
   * Validate channel preferences
   * @param {object} preferences - Preferences data
   * @param {Array} errors - Errors array
   * @param {Array} warnings - Warnings array
   */
  validateChannelPreferences(preferences, errors, warnings) {
    if (!preferences.channels) return;

    const { channels } = preferences;

    // Check for valid channels
    for (const channelName of Object.keys(channels)) {
      if (!this.validChannels.includes(channelName)) {
        errors.push(
          `Invalid channel: ${channelName}. Valid channels: ${this.validChannels.join(', ')}`
        );
      }
    }

    // Validate email channel
    if (channels.email) {
      if (
        channels.email.enabled !== undefined &&
        typeof channels.email.enabled !== 'boolean'
      ) {
        errors.push('channels.email.enabled must be a boolean value');
      }

      if (channels.email.address !== undefined) {
        if (typeof channels.email.address !== 'string') {
          errors.push('channels.email.address must be a string');
        } else if (
          channels.email.address &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(channels.email.address)
        ) {
          errors.push('channels.email.address must be a valid email address');
        }
      }

      if (
        channels.email.verified !== undefined &&
        typeof channels.email.verified !== 'boolean'
      ) {
        errors.push('channels.email.verified must be a boolean value');
      }

      if (
        channels.email.enabled &&
        channels.email.address &&
        !channels.email.verified
      ) {
        warnings.push(
          'Email channel is enabled but address is not verified. Emails may not be delivered.'
        );
      }
    }

    // Validate SMS channel
    if (channels.sms) {
      if (
        channels.sms.enabled !== undefined &&
        typeof channels.sms.enabled !== 'boolean'
      ) {
        errors.push('channels.sms.enabled must be a boolean value');
      }

      if (channels.sms.phoneNumber !== undefined) {
        if (typeof channels.sms.phoneNumber !== 'string') {
          errors.push('channels.sms.phoneNumber must be a string');
        } else if (
          channels.sms.phoneNumber &&
          !/^\+?[1-9]\d{1,14}$/.test(channels.sms.phoneNumber)
        ) {
          errors.push(
            'channels.sms.phoneNumber must be a valid phone number in E.164 format'
          );
        }
      }

      if (
        channels.sms.verified !== undefined &&
        typeof channels.sms.verified !== 'boolean'
      ) {
        errors.push('channels.sms.verified must be a boolean value');
      }

      if (channels.sms.countryCode !== undefined) {
        if (typeof channels.sms.countryCode !== 'string') {
          errors.push('channels.sms.countryCode must be a string');
        } else if (
          channels.sms.countryCode &&
          !/^\+\d{1,3}$/.test(channels.sms.countryCode)
        ) {
          errors.push(
            'channels.sms.countryCode must be a valid country code (e.g., +1, +44)'
          );
        }
      }

      if (
        channels.sms.enabled &&
        channels.sms.phoneNumber &&
        !channels.sms.verified
      ) {
        warnings.push(
          'SMS channel is enabled but phone number is not verified. SMS may not be delivered.'
        );
      }
    }

    // Validate in-app channel
    if (channels.inApp) {
      if (
        channels.inApp.enabled !== undefined &&
        typeof channels.inApp.enabled !== 'boolean'
      ) {
        errors.push('channels.inApp.enabled must be a boolean value');
      }

      if (
        channels.inApp.sound !== undefined &&
        typeof channels.inApp.sound !== 'boolean'
      ) {
        errors.push('channels.inApp.sound must be a boolean value');
      }

      if (
        channels.inApp.vibration !== undefined &&
        typeof channels.inApp.vibration !== 'boolean'
      ) {
        errors.push('channels.inApp.vibration must be a boolean value');
      }
    }

    // Validate push notification channel
    if (channels.pushNotification) {
      if (
        channels.pushNotification.enabled !== undefined &&
        typeof channels.pushNotification.enabled !== 'boolean'
      ) {
        errors.push(
          'channels.pushNotification.enabled must be a boolean value'
        );
      }

      if (channels.pushNotification.deviceTokens !== undefined) {
        if (!Array.isArray(channels.pushNotification.deviceTokens)) {
          errors.push(
            'channels.pushNotification.deviceTokens must be an array'
          );
        } else {
          channels.pushNotification.deviceTokens.forEach((token, index) => {
            if (!token.token || typeof token.token !== 'string') {
              errors.push(
                `Device token at index ${index} must have a valid token string`
              );
            }

            if (
              token.platform &&
              !['ios', 'android', 'web'].includes(token.platform)
            ) {
              errors.push(
                `Device token at index ${index} has invalid platform. Must be ios, android, or web`
              );
            }

            if (
              token.active !== undefined &&
              typeof token.active !== 'boolean'
            ) {
              errors.push(
                `Device token at index ${index} active flag must be a boolean`
              );
            }
          });
        }
      }

      if (
        channels.pushNotification.enabled &&
        (!channels.pushNotification.deviceTokens ||
          channels.pushNotification.deviceTokens.length === 0)
      ) {
        warnings.push(
          'Push notification channel is enabled but no device tokens are registered.'
        );
      }
    }
  }

  /**
   * Validate category preferences
   * @param {object} preferences - Preferences data
   * @param {Array} errors - Errors array
   * @param {Array} warnings - Warnings array
   */
  validateCategoryPreferences(preferences, errors, warnings) {
    if (!preferences.categories) return;

    const { categories } = preferences;

    // Check for valid categories
    for (const categoryName of Object.keys(categories)) {
      if (!this.validCategories.includes(categoryName)) {
        errors.push(
          `Invalid category: ${categoryName}. Valid categories: ${this.validCategories.join(', ')}`
        );
      }
    }

    // Validate each category
    for (const [categoryName, category] of Object.entries(categories)) {
      if (
        category.enabled !== undefined &&
        typeof category.enabled !== 'boolean'
      ) {
        errors.push(
          `categories.${categoryName}.enabled must be a boolean value`
        );
      }

      // Check if required category is disabled
      if (
        this.requiredCategories.includes(categoryName) &&
        category.enabled === false
      ) {
        errors.push(
          `Category '${categoryName}' is required and cannot be disabled`
        );
      }

      if (category.channels !== undefined) {
        if (!Array.isArray(category.channels)) {
          errors.push(`categories.${categoryName}.channels must be an array`);
        } else {
          // Check for valid channels in category
          for (const channel of category.channels) {
            if (!this.validChannels.includes(channel)) {
              errors.push(
                `Invalid channel '${channel}' in category '${categoryName}'. Valid channels: ${this.validChannels.join(', ')}`
              );
            }
          }

          // Check if category has at least one channel
          if (
            category.enabled &&
            (!category.channels || category.channels.length === 0)
          ) {
            errors.push(
              `Category '${categoryName}' is enabled but has no channels specified`
            );
          }
        }
      }
    }
  }

  /**
   * Validate frequency limits
   * @param {object} preferences - Preferences data
   * @param {Array} errors - Errors array
   * @param {Array} warnings - Warnings array
   */
  validateFrequencyLimits(preferences, errors, warnings) {
    if (!preferences.frequencyLimits) return;

    const { frequencyLimits } = preferences;

    if (frequencyLimits.maxPerHour !== undefined) {
      if (typeof frequencyLimits.maxPerHour !== 'number') {
        errors.push('frequencyLimits.maxPerHour must be a number');
      } else if (
        frequencyLimits.maxPerHour < 1 ||
        frequencyLimits.maxPerHour > 100
      ) {
        errors.push('frequencyLimits.maxPerHour must be between 1 and 100');
      } else if (frequencyLimits.maxPerHour < 5) {
        warnings.push(
          'Very low hourly limit may prevent important notifications from being delivered.'
        );
      }
    }

    if (frequencyLimits.maxPerDay !== undefined) {
      if (typeof frequencyLimits.maxPerDay !== 'number') {
        errors.push('frequencyLimits.maxPerDay must be a number');
      } else if (
        frequencyLimits.maxPerDay < 1 ||
        frequencyLimits.maxPerDay > 1000
      ) {
        errors.push('frequencyLimits.maxPerDay must be between 1 and 1000');
      } else if (frequencyLimits.maxPerDay < 20) {
        warnings.push(
          'Very low daily limit may prevent important notifications from being delivered.'
        );
      }
    }

    if (frequencyLimits.maxPerWeek !== undefined) {
      if (typeof frequencyLimits.maxPerWeek !== 'number') {
        errors.push('frequencyLimits.maxPerWeek must be a number');
      } else if (
        frequencyLimits.maxPerWeek < 1 ||
        frequencyLimits.maxPerWeek > 5000
      ) {
        errors.push('frequencyLimits.maxPerWeek must be between 1 and 5000');
      } else if (frequencyLimits.maxPerWeek < 50) {
        warnings.push(
          'Very low weekly limit may prevent important notifications from being delivered.'
        );
      }
    }

    // Validate logical consistency between limits
    if (
      frequencyLimits.maxPerHour &&
      frequencyLimits.maxPerDay &&
      frequencyLimits.maxPerHour > frequencyLimits.maxPerDay
    ) {
      errors.push('maxPerHour cannot be greater than maxPerDay');
    }

    if (
      frequencyLimits.maxPerDay &&
      frequencyLimits.maxPerWeek &&
      frequencyLimits.maxPerDay > frequencyLimits.maxPerWeek
    ) {
      errors.push('maxPerDay cannot be greater than maxPerWeek');
    }
  }

  /**
   * Validate logical consistency
   * @param {object} preferences - Preferences data
   * @param {Array} errors - Errors array
   * @param {Array} warnings - Warnings array
   */
  async validateLogicalConsistency(preferences, errors, warnings) {
    // Check if at least one channel is enabled
    const enabledChannels = this.getEnabledChannels(preferences);
    if (enabledChannels.length === 0) {
      errors.push('At least one notification channel must be enabled');
    }

    // Check if all categories are disabled
    const enabledCategories = this.getEnabledCategories(preferences);
    if (enabledCategories.length === 0) {
      warnings.push(
        'All notification categories are disabled. You will not receive any notifications.'
      );
    }

    // Check for category-channel consistency
    this.validateCategoryChannelConsistency(preferences, errors, warnings);

    // Check for quiet hours conflicts
    this.validateQuietHoursConsistency(preferences, errors, warnings);
  }

  /**
   * Validate category-channel consistency
   * @param {object} preferences - Preferences data
   * @param {Array} errors - Errors array
   * @param {Array} warnings - Warnings array
   */
  validateCategoryChannelConsistency(preferences, errors, warnings) {
    if (!preferences.categories || !preferences.channels) return;

    const enabledChannels = this.getEnabledChannels(preferences);

    for (const [categoryName, category] of Object.entries(
      preferences.categories
    )) {
      if (category.enabled && category.channels) {
        for (const channel of category.channels) {
          if (!enabledChannels.includes(channel)) {
            errors.push(
              `Category '${categoryName}' uses channel '${channel}' which is disabled`
            );
          }
        }
      }
    }
  }

  /**
   * Validate quiet hours consistency
   * @param {object} preferences - Preferences data
   * @param {Array} errors - Errors array
   * @param {Array} warnings - Warnings array
   */
  validateQuietHoursConsistency(preferences, errors, warnings) {
    if (!preferences.quietHours || !preferences.quietHours.enabled) return;

    const enabledCategories = this.getEnabledCategories(preferences);
    const hasUrgentCategories = enabledCategories.some((cat) =>
      ['alert', 'payment', 'security'].includes(cat)
    );

    if (hasUrgentCategories) {
      warnings.push(
        'Quiet hours are enabled but you have urgent categories enabled. Important notifications may be delayed.'
      );
    }
  }

  /**
   * Validate compliance with best practices
   * @param {object} preferences - Preferences data
   * @param {Array} errors - Errors array
   * @param {Array} warnings - Warnings array
   */
  validateCompliance(preferences, errors, warnings) {
    // Check for marketing compliance
    if (
      preferences.categories &&
      preferences.categories.marketing &&
      preferences.categories.marketing.enabled
    ) {
      if (
        !preferences.categories.marketing.channels ||
        preferences.categories.marketing.channels.length === 0
      ) {
        errors.push(
          'Marketing category is enabled but has no channels specified'
        );
      }

      const marketingChannels = preferences.categories.marketing.channels || [];
      if (
        marketingChannels.includes('sms') &&
        (!preferences.channels.sms || !preferences.channels.sms.verified)
      ) {
        errors.push('SMS marketing requires verified phone number');
      }

      if (
        marketingChannels.includes('email') &&
        (!preferences.channels.email || !preferences.channels.email.verified)
      ) {
        errors.push('Email marketing requires verified email address');
      }
    }

    // Check for security best practices
    if (preferences.categories && preferences.categories.alert) {
      if (
        !preferences.categories.alert.channels ||
        preferences.categories.alert.channels.length === 0
      ) {
        errors.push('Alert category must have at least one channel enabled');
      }

      const alertChannels = preferences.categories.alert.channels || [];
      const hasReliableChannel = alertChannels.some((channel) =>
        ['email', 'sms'].includes(channel)
      );

      if (!hasReliableChannel) {
        warnings.push(
          'Alert category should include at least one reliable channel (email or SMS)'
        );
      }
    }
  }

  /**
   * Get enabled channels from preferences
   * @param {object} preferences - Preferences data
   * @returns {Array} - Array of enabled channels
   */
  getEnabledChannels(preferences) {
    if (!preferences.channels) return [];

    return Object.entries(preferences.channels)
      .filter(([_, channel]) => channel.enabled)
      .map(([name, _]) => name);
  }

  /**
   * Get enabled categories from preferences
   * @param {object} preferences - Preferences data
   * @returns {Array} - Array of enabled categories
   */
  getEnabledCategories(preferences) {
    if (!preferences.categories) return [];

    return Object.entries(preferences.categories)
      .filter(([_, category]) => category.enabled)
      .map(([name, _]) => name);
  }

  /**
   * Create a logger instance
   * @returns {object} - Logger instance
   */
  createLogger() {
    return {
      info: (message, data = {}) => {
        console.log(`[PreferencesValidationService] INFO: ${message}`, data);
      },
      warn: (message, data = {}) => {
        console.warn(`[PreferencesValidationService] WARN: ${message}`, data);
      },
      error: (message, error) => {
        console.error(
          `[PreferencesValidationService] ERROR: ${message}`,
          error
        );
      },
    };
  }
}

export default PreferencesValidationService;
