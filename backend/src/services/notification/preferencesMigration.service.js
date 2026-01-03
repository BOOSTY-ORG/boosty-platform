/**
 * Preferences Migration Service
 *
 * Handles migration of user notification preferences:
 * - Migrate existing users to new preference system
 * - Handle preference version updates
 * - Create default preferences for new users
 * - Validate preference data integrity
 * - Handle preference conflicts
 * - Bulk migration operations
 * - Rollback capabilities
 */

import UserNotificationPreferences from '../../models/userNotificationPreferences.model.js';
import User from '../../models/user.model.js';
import PreferencesValidationService from './preferencesValidation.service.js';
import NotificationPreferencesService from './notificationPreferences.service.js';

class PreferencesMigrationService {
  constructor() {
    this.currentVersion = '2.0.0';
    this.validationService = new PreferencesValidationService();
    this.preferencesService = new NotificationPreferencesService();
    this.logger = this.createLogger();

    // Migration strategies for different versions
    this.migrationStrategies = {
      '1.0.0': this.migrateFromV1_0_0.bind(this),
      '1.1.0': this.migrateFromV1_1_0.bind(this),
      '1.2.0': this.migrateFromV1_2_0.bind(this),
    };
  }

  /**
   * Migrate a single user's preferences
   * @param {string} userId - User ID
   * @param {string} targetVersion - Target version
   * @param {boolean} force - Force migration even if already at target version
   * @returns {Promise<object>} - Migration result
   */
  async migrateUserPreferences(
    userId,
    targetVersion = this.currentVersion,
    force = false
  ) {
    try {
      this.logger.info('Starting user preference migration', {
        userId,
        targetVersion,
      });

      // Get user information
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Get existing preferences
      let preferences = await UserNotificationPreferences.findOne({ userId });
      const currentVersion = preferences?.version || '1.0.0';

      // Check if migration is needed
      if (!force && currentVersion === targetVersion) {
        return {
          success: true,
          message: 'Preferences already at target version',
          userId,
          fromVersion: currentVersion,
          toVersion: targetVersion,
          migrated: false,
        };
      }

      // Create backup before migration
      const backup = preferences ? preferences.toObject() : null;

      try {
        // If no preferences exist, create default ones
        if (!preferences) {
          preferences = await this.createDefaultPreferencesForUser(
            user,
            targetVersion
          );
        } else {
          // Migrate existing preferences
          preferences = await this.executeMigration(
            preferences,
            currentVersion,
            targetVersion,
            user
          );
        }

        // Validate migrated preferences
        const validation = await this.validationService.validatePreferences(
          preferences.toObject()
        );

        if (!validation.isValid) {
          throw new Error(
            `Migrated preferences failed validation: ${validation.errors.join(', ')}`
          );
        }

        // Update version
        preferences.version = targetVersion;
        preferences.lastMigratedAt = new Date();
        await preferences.save();

        this.logger.info('User preference migration completed', {
          userId,
          fromVersion: currentVersion,
          toVersion: targetVersion,
        });

        return {
          success: true,
          message: 'Preferences migrated successfully',
          userId,
          fromVersion: currentVersion,
          toVersion: targetVersion,
          migrated: true,
          backup,
        };
      } catch (migrationError) {
        // Rollback if migration failed
        this.logger.error('Migration failed, attempting rollback', {
          userId,
          error: migrationError.message,
        });

        if (backup) {
          try {
            await UserNotificationPreferences.findOneAndUpdate(
              { userId },
              backup,
              { upsert: true }
            );
            this.logger.info('Rollback successful', { userId });
          } catch (rollbackError) {
            this.logger.error('Rollback failed', {
              userId,
              error: rollbackError.message,
            });
          }
        }

        throw migrationError;
      }
    } catch (error) {
      this.logger.error('Failed to migrate user preferences', {
        error: error.message,
        userId,
        targetVersion,
      });
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  /**
   * Bulk migrate user preferences
   * @param {string} targetVersion - Target version
   * @param {number} batchSize - Batch size for processing
   * @param {boolean} force - Force migration even if already at target version
   * @returns {Promise<object>} - Bulk migration result
   */
  async bulkMigratePreferences(
    targetVersion = this.currentVersion,
    batchSize = 100,
    force = false
  ) {
    try {
      this.logger.info('Starting bulk preference migration', {
        targetVersion,
        batchSize,
      });

      const startTime = new Date();
      let processed = 0;
      let successful = 0;
      let failed = 0;
      const errors = [];

      // Get all users that need migration
      const usersNeedingMigration = await this.getUsersNeedingMigration(
        targetVersion,
        batchSize
      );

      this.logger.info('Found users needing migration', {
        count: usersNeedingMigration.length,
      });

      // Process in batches
      for (let i = 0; i < usersNeedingMigration.length; i += batchSize) {
        const batch = usersNeedingMigration.slice(i, i + batchSize);

        this.logger.info('Processing migration batch', {
          batchNumber: Math.floor(i / batchSize) + 1,
          batchSize: batch.length,
        });

        // Process batch concurrently with limited concurrency
        const batchPromises = batch.map(async (user) => {
          try {
            const result = await this.migrateUserPreferences(
              user._id.toString(),
              targetVersion,
              force
            );

            if (result.success) {
              successful++;
            } else {
              failed++;
              errors.push({
                userId: user._id.toString(),
                error: result.message,
              });
            }

            processed++;
            return result;
          } catch (error) {
            failed++;
            errors.push({
              userId: user._id.toString(),
              error: error.message,
            });
            processed++;
            return { success: false, error: error.message };
          }
        });

        // Wait for batch to complete
        await Promise.allSettled(batchPromises);

        // Add delay between batches to prevent overwhelming the system
        if (i + batchSize < usersNeedingMigration.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      const endTime = new Date();
      const duration = endTime - startTime;

      this.logger.info('Bulk migration completed', {
        totalProcessed: processed,
        successful,
        failed,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        message: 'Bulk migration completed',
        totalProcessed: processed,
        successful,
        failed,
        duration,
        errors,
        targetVersion,
      };
    } catch (error) {
      this.logger.error('Bulk migration failed', {
        error: error.message,
        targetVersion,
      });
      throw new Error(`Bulk migration failed: ${error.message}`);
    }
  }

  /**
   * Execute migration strategy
   * @param {object} preferences - Existing preferences
   * @param {string} fromVersion - Current version
   * @param {string} toVersion - Target version
   * @param {object} user - User object
   * @returns {Promise<object>} - Migrated preferences
   */
  async executeMigration(preferences, fromVersion, toVersion, user) {
    // Apply migration strategies in sequence
    const versions = this.getMigrationPath(fromVersion, toVersion);

    for (const version of versions) {
      const strategy = this.migrationStrategies[version];
      if (strategy) {
        preferences = await strategy(preferences, user);
      }
    }

    return preferences;
  }

  /**
   * Get migration path from current to target version
   * @param {string} fromVersion - Current version
   * @param {string} toVersion - Target version
   * @returns {Array} - Array of versions to migrate through
   */
  getMigrationPath(fromVersion, toVersion) {
    const path = [];
    const versionOrder = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];

    const fromIndex = versionOrder.indexOf(fromVersion);
    const toIndex = versionOrder.indexOf(toVersion);

    if (fromIndex === -1 || toIndex === -1) {
      throw new Error(
        `Invalid version in migration path: ${fromVersion} -> ${toVersion}`
      );
    }

    for (let i = fromIndex; i < toIndex; i++) {
      path.push(versionOrder[i]);
    }

    return path;
  }

  /**
   * Migrate from version 1.0.0
   * @param {object} preferences - Existing preferences
   * @param {object} user - User object
   * @returns {Promise<object>} - Migrated preferences
   */
  async migrateFromV1_0_0(preferences, user) {
    // Add new fields introduced in 1.1.0
    if (!preferences.frequencyLimits) {
      preferences.frequencyLimits = {
        maxPerHour: 10,
        maxPerDay: 50,
        maxPerWeek: 200,
      };
    }

    if (!preferences.quietHours) {
      preferences.quietHours = {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
      };
    }

    // Ensure all categories exist
    const defaultCategories =
      this.preferencesService.getDefaultPreferences().categories;
    preferences.categories = {
      ...defaultCategories,
      ...preferences.categories,
    };

    return preferences;
  }

  /**
   * Migrate from version 1.1.0
   * @param {object} preferences - Existing preferences
   * @param {object} user - User object
   * @returns {Promise<object>} - Migrated preferences
   */
  async migrateFromV1_1_0(preferences, user) {
    // Add device token management for push notifications
    if (!preferences.channels.pushNotification.deviceTokens) {
      preferences.channels.pushNotification.deviceTokens = [];
    }

    // Add notification analytics fields
    if (!preferences.notificationStats) {
      preferences.notificationStats = {
        totalReceived: 0,
        totalRead: 0,
        lastReceivedAt: null,
        preferredChannel: 'email',
      };
    }

    return preferences;
  }

  /**
   * Migrate from version 1.2.0
   * @param {object} preferences - Existing preferences
   * @param {object} user - User object
   * @returns {Promise<object>} - Migrated preferences
   */
  async migrateFromV1_2_0(preferences, user) {
    // Add preference inheritance and conflict resolution
    if (!preferences.inheritance) {
      preferences.inheritance = {
        enabled: true,
        inheritFromGlobal: true,
        inheritFromCategory: true,
      };
    }

    // Add preference version tracking
    preferences.version = '2.0.0';
    preferences.lastMigratedAt = new Date();

    return preferences;
  }

  /**
   * Create default preferences for a user
   * @param {object} user - User object
   * @param {string} version - Target version
   * @returns {Promise<object>} - Created preferences
   */
  async createDefaultPreferencesForUser(user, version = this.currentVersion) {
    try {
      const userType = this.determineUserType(user);

      const defaultOptions = {
        email: user.email,
        phone: user.phone,
        userType,
      };

      const preferences =
        await this.preferencesService.createDefaultPreferences(
          user._id.toString(),
          defaultOptions
        );

      preferences.version = version;
      preferences.lastMigratedAt = new Date();
      await preferences.save();

      return preferences;
    } catch (error) {
      this.logger.error('Failed to create default preferences', {
        error: error.message,
        userId: user._id,
      });
      throw error;
    }
  }

  /**
   * Determine user type based on user data
   * @param {object} user - User object
   * @returns {string} - User type
   */
  determineUserType(user) {
    // Simple logic to determine user type - can be enhanced
    if (user.role === 'admin') {
      return 'admin';
    } else if (user.applications && user.applications.length > 0) {
      return 'investor';
    } else {
      return 'standard';
    }
  }

  /**
   * Get users that need migration
   * @param {string} targetVersion - Target version
   * @param {number} limit - Limit number of users
   * @returns {Promise<Array>} - Array of users
   */
  async getUsersNeedingMigration(targetVersion, limit = 100) {
    try {
      // Get users without preferences or with older version
      const usersWithoutPrefs = await User.find({
        _id: {
          $nin: await UserNotificationPreferences.distinct('userId'),
        },
      })
        .limit(limit)
        .select('_id email phone role applications');

      const usersWithOldVersion = await UserNotificationPreferences.find({
        $or: [
          { version: { $lt: targetVersion } },
          { version: { $exists: false } },
        ],
      })
        .populate('userId', '_id email phone role applications')
        .limit(limit)
        .then((prefs) => prefs.map((p) => p.userId));

      return [...usersWithoutPrefs, ...usersWithOldVersion].slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to get users needing migration', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Validate preference data integrity
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Validation result
   */
  async validatePreferenceIntegrity(userId) {
    try {
      const preferences = await UserNotificationPreferences.findOne({ userId });

      if (!preferences) {
        return {
          valid: false,
          errors: ['Preferences not found'],
        };
      }

      const validation = await this.validationService.validatePreferences(
        preferences.toObject()
      );

      // Check for orphaned references
      const user = await User.findById(userId);
      if (!user) {
        validation.errors.push('Referenced user does not exist');
        validation.isValid = false;
      }

      // Check for data consistency
      if (preferences.channels.email.enabled && !user.email) {
        validation.warnings.push('Email channel enabled but user has no email');
      }

      if (preferences.channels.sms.enabled && !user.phone) {
        validation.warnings.push('SMS channel enabled but user has no phone');
      }

      return validation;
    } catch (error) {
      this.logger.error('Failed to validate preference integrity', {
        error: error.message,
        userId,
      });
      return {
        valid: false,
        errors: [`Validation failed: ${error.message}`],
      };
    }
  }

  /**
   * Handle preference conflicts
   * @param {string} userId - User ID
   * @param {object} newPreferences - New preferences
   * @returns {Promise<object>} - Resolved preferences
   */
  async handlePreferenceConflicts(userId, newPreferences) {
    try {
      const existing = await UserNotificationPreferences.findOne({ userId });

      if (!existing) {
        return newPreferences;
      }

      // Conflict resolution strategies
      const resolved = { ...existing.toObject() };

      // For each field in new preferences, resolve conflicts
      for (const [key, value] of Object.entries(newPreferences)) {
        if (key === 'version' || key === '_id' || key === 'userId') {
          continue; // Skip system fields
        }

        if (typeof value === 'object' && value !== null) {
          // Merge objects
          resolved[key] = { ...resolved[key], ...value };
        } else {
          // Replace primitives
          resolved[key] = value;
        }
      }

      // Validate resolved preferences
      const validation =
        await this.validationService.validatePreferences(resolved);

      if (!validation.isValid) {
        throw new Error(
          `Resolved preferences failed validation: ${validation.errors.join(', ')}`
        );
      }

      return resolved;
    } catch (error) {
      this.logger.error('Failed to handle preference conflicts', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Create a logger instance
   * @returns {object} - Logger instance
   */
  createLogger() {
    return {
      info: (message, data = {}) => {
        console.log(`[PreferencesMigrationService] INFO: ${message}`, data);
      },
      warn: (message, data = {}) => {
        console.warn(`[PreferencesMigrationService] WARN: ${message}`, data);
      },
      error: (message, error) => {
        console.error(`[PreferencesMigrationService] ERROR: ${message}`, error);
      },
    };
  }
}

export default PreferencesMigrationService;
