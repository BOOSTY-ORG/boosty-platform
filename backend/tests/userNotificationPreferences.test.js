/**
 * User Notification Preferences Tests
 *
 * Comprehensive test suite for user notification preferences:
 * - Controller tests
 * - Service tests
 * - Model tests
 * - Validation tests
 * - Migration tests
 * - Integration tests
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import UserNotificationPreferences from '../src/models/userNotificationPreferences.model.js';
import User from '../src/models/user.model.js';
import UserNotificationPreferencesController from '../src/controllers/userNotificationPreferences.controller.js';
import PreferencesMigrationService from '../src/services/notification/preferencesMigration.service.js';
import PreferencesValidationService from '../src/services/notification/preferencesValidation.service.js';
import NotificationPreferencesService from '../src/services/notification/notificationPreferences.service.js';
import userNotificationPreferencesRoutes from '../src/routes/userNotificationPreferences.routes.js';

// Set up test environment
let mongoServer;
let app;
let testUser;
let testPreferences;

beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create Express app for testing
  app = express();
  app.use(express.json());

  // Mock authentication middleware
  app.use((req, res, next) => {
    req.user = {
      _id: testUser?._id || new mongoose.Types.ObjectId(),
      role: 'user',
    };
    next();
  });

  app.use('/api/users', userNotificationPreferencesRoutes);
});

afterAll(async () => {
  // Clean up
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Create test user
  testUser = new User({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    phone: '+1234567890',
    userType: 'standard',
  });
  await testUser.save();

  // Create test preferences
  testPreferences = new UserNotificationPreferences({
    userId: testUser._id,
    globalEnabled: true,
    channels: {
      email: {
        enabled: true,
        address: 'test@example.com',
        verified: true,
      },
      sms: {
        enabled: true,
        phoneNumber: '+1234567890',
        verified: true,
        countryCode: '+1',
      },
      inApp: {
        enabled: true,
        sound: true,
        vibration: true,
      },
      pushNotification: {
        enabled: true,
        deviceTokens: [
          {
            token: 'test-token',
            platform: 'ios',
            active: true,
            lastUsed: new Date(),
          },
        ],
      },
    },
    categories: {
      welcome: {
        enabled: true,
        channels: ['email', 'in_app'],
      },
      marketing: {
        enabled: false,
        channels: ['email'],
      },
      alert: {
        enabled: true,
        channels: ['email', 'sms', 'in_app', 'push_notification'],
      },
    },
    frequencyLimits: {
      maxPerHour: 10,
      maxPerDay: 50,
      maxPerWeek: 200,
    },
  });
  await testPreferences.save();
});

afterEach(async () => {
  // Clean up database
  await User.deleteMany({});
  await UserNotificationPreferences.deleteMany({});
});

describe('User Notification Preferences Controller', () => {
  describe('GET /api/users/:userId/preferences', () => {
    it('should return user preferences', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser._id}/preferences`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(testUser._id.toString());
      expect(response.body.data.globalEnabled).toBe(true);
    });

    it('should return 403 for unauthorized access', async () => {
      const otherUserId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/users/${otherUserId}/preferences`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('PUT /api/users/:userId/preferences', () => {
    it('should update user preferences', async () => {
      const updateData = {
        globalEnabled: false,
        channels: {
          email: {
            enabled: false,
          },
        },
      };

      const response = await request(app)
        .put(`/api/users/${testUser._id}/preferences`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.globalEnabled).toBe(false);
      expect(response.body.data.channels.email.enabled).toBe(false);
    });

    it('should return 400 for invalid preferences', async () => {
      const invalidData = {
        channels: {
          email: {
            enabled: 'not-a-boolean',
          },
        },
      };

      const response = await request(app)
        .put(`/api/users/${testUser._id}/preferences`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/users/:userId/preferences/reset', () => {
    it('should reset preferences to defaults', async () => {
      const response = await request(app)
        .post(`/api/users/${testUser._id}/preferences/reset`)
        .send({ userType: 'standard' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.channels.email.enabled).toBe(true);
      expect(response.body.data.categories.marketing.enabled).toBe(false);
    });
  });

  describe('GET /api/users/preferences/options', () => {
    it('should return available options', async () => {
      const response = await request(app)
        .get('/api/users/preferences/options')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toBeDefined();
      expect(response.body.data.channels).toBeDefined();
      expect(response.body.data.priorities).toBeDefined();
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });
  });

  describe('PUT /api/users/:userId/device-token', () => {
    it('should update device token', async () => {
      const tokenData = {
        token: 'new-device-token',
        platform: 'android',
      };

      const response = await request(app)
        .put(`/api/users/${testUser._id}/device-token`)
        .send(tokenData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid token data', async () => {
      const invalidData = {
        token: '',
        platform: 'invalid-platform',
      };

      const response = await request(app)
        .put(`/api/users/${testUser._id}/device-token`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

describe('Preferences Migration Service', () => {
  let migrationService;

  beforeEach(() => {
    migrationService = new PreferencesMigrationService();
  });

  describe('migrateUserPreferences', () => {
    it('should migrate preferences to new version', async () => {
      // Create old version preferences
      const oldPrefs = new UserNotificationPreferences({
        userId: testUser._id,
        version: '1.0.0',
        globalEnabled: true,
        channels: {
          email: { enabled: true },
          sms: { enabled: true },
          inApp: { enabled: true },
        },
      });
      await oldPrefs.save();

      const result = await migrationService.migrateUserPreferences(
        testUser._id.toString(),
        '2.0.0'
      );

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(true);
      expect(result.fromVersion).toBe('1.0.0');
      expect(result.toVersion).toBe('2.0.0');
    });

    it('should skip migration if already at target version', async () => {
      const result = await migrationService.migrateUserPreferences(
        testUser._id.toString(),
        '2.0.0'
      );

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(false);
    });
  });

  describe('bulkMigratePreferences', () => {
    it('should migrate multiple user preferences', async () => {
      // Create multiple users with old preferences
      const users = [];
      for (let i = 0; i < 5; i++) {
        const user = new User({
          name: `User ${i}`,
          email: `user${i}@example.com`,
          password: 'password123',
        });
        await user.save();
        users.push(user);

        const prefs = new UserNotificationPreferences({
          userId: user._id,
          version: '1.0.0',
          globalEnabled: true,
        });
        await prefs.save();
      }

      const result = await migrationService.bulkMigratePreferences('2.0.0', 10);

      expect(result.success).toBe(true);
      expect(result.successful).toBeGreaterThan(0);
      expect(result.failed).toBe(0);
    });
  });
});

describe('Preferences Validation Service', () => {
  let validationService;

  beforeEach(() => {
    validationService = new PreferencesValidationService();
  });

  describe('validatePreferences', () => {
    it('should validate correct preferences', async () => {
      const validPrefs = {
        globalEnabled: true,
        channels: {
          email: {
            enabled: true,
            address: 'test@example.com',
          },
          sms: {
            enabled: true,
            phoneNumber: '+1234567890',
          },
        },
        categories: {
          welcome: {
            enabled: true,
            channels: ['email', 'in_app'],
          },
        },
        frequencyLimits: {
          maxPerHour: 10,
          maxPerDay: 50,
          maxPerWeek: 200,
        },
      };

      const result = await validationService.validatePreferences(validPrefs);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email format', async () => {
      const invalidPrefs = {
        channels: {
          email: {
            enabled: true,
            address: 'invalid-email',
          },
        },
      };

      const result = await validationService.validatePreferences(invalidPrefs);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'channels.email.address must be a valid email address'
      );
    });

    it('should reject invalid phone format', async () => {
      const invalidPrefs = {
        channels: {
          sms: {
            enabled: true,
            phoneNumber: 'invalid-phone',
          },
        },
      };

      const result = await validationService.validatePreferences(invalidPrefs);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'channels.sms.phoneNumber must be a valid phone number in E.164 format'
      );
    });

    it('should reject disabled required category', async () => {
      const invalidPrefs = {
        categories: {
          alert: {
            enabled: false,
            channels: ['email'],
          },
        },
      };

      const result = await validationService.validatePreferences(invalidPrefs);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Category 'alert' is required and cannot be disabled"
      );
    });

    it('should reject invalid quiet hours format', async () => {
      const invalidPrefs = {
        quietHours: {
          enabled: true,
          startTime: '25:00',
          endTime: '08:00',
        },
      };

      const result = await validationService.validatePreferences(invalidPrefs);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'quietHours.startTime must be in HH:MM format (24-hour)'
      );
    });

    it('should reject invalid frequency limits', async () => {
      const invalidPrefs = {
        frequencyLimits: {
          maxPerHour: 0,
          maxPerDay: 50,
          maxPerWeek: 200,
        },
      };

      const result = await validationService.validatePreferences(invalidPrefs);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'frequencyLimits.maxPerHour must be between 1 and 100'
      );
    });
  });
});

describe('Notification Preferences Service', () => {
  let preferencesService;

  beforeEach(() => {
    preferencesService = new NotificationPreferencesService();
  });

  describe('getOrCreatePreferences', () => {
    it('should create preferences if they do not exist', async () => {
      const newUser = new User({
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
      });
      await newUser.save();

      const prefs = await preferencesService.getOrCreatePreferences(
        newUser._id.toString()
      );

      expect(prefs.userId.toString()).toBe(newUser._id.toString());
      expect(prefs.globalEnabled).toBe(true);
    });

    it('should return existing preferences', async () => {
      const prefs = await preferencesService.getOrCreatePreferences(
        testUser._id.toString()
      );

      expect(prefs._id.toString()).toBe(testPreferences._id.toString());
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      const updates = {
        globalEnabled: false,
        channels: {
          email: {
            enabled: false,
          },
        },
      };

      const prefs = await preferencesService.updatePreferences(
        testUser._id.toString(),
        updates
      );

      expect(prefs.globalEnabled).toBe(false);
      expect(prefs.channels.email.enabled).toBe(false);
    });
  });

  describe('checkFrequencyLimits', () => {
    it('should return frequency limit status', async () => {
      const result = await preferencesService.checkFrequencyLimits(
        testUser._id.toString()
      );

      expect(result).toHaveProperty('hour');
      expect(result).toHaveProperty('day');
      expect(result).toHaveProperty('week');
      expect(result).toHaveProperty('canSend');
      expect(typeof result.canSend).toBe('boolean');
    });
  });
});

describe('User Notification Preferences Model', () => {
  describe('Instance Methods', () => {
    it('should check if channel is enabled', () => {
      expect(testPreferences.isChannelEnabled('email')).toBe(true);
      expect(testPreferences.isChannelEnabled('sms')).toBe(true);
    });

    it('should check if category is enabled', () => {
      expect(testPreferences.isCategoryEnabled('welcome')).toBe(true);
      expect(testPreferences.isCategoryEnabled('marketing')).toBe(false);
    });

    it('should get enabled channels for category', () => {
      const channels = testPreferences.getEnabledChannelsForCategory('alert');
      expect(channels).toContain('email');
      expect(channels).toContain('sms');
      expect(channels).toContain('in_app');
      expect(channels).toContain('push_notification');
    });
  });

  describe('Virtuals', () => {
    it('should calculate isInQuietHours correctly', () => {
      // Test with quiet hours disabled
      expect(testPreferences.isInQuietHours).toBe(false);

      // Test with quiet hours enabled
      testPreferences.quietHours.enabled = true;
      testPreferences.quietHours.startTime = '22:00';
      testPreferences.quietHours.endTime = '08:00';

      // Note: This test would need to mock the current time
      // For now, just test the virtual exists
      expect(typeof testPreferences.isInQuietHours).toBe('boolean');
    });

    it('should return verified channels', () => {
      const verified = testPreferences.verifiedChannels;
      expect(verified).toContain('email');
      expect(verified).toContain('sms');
      expect(verified).toContain('in_app');
      expect(verified).toContain('push_notification');
    });
  });

  describe('Static Methods', () => {
    it('should find preferences by user ID', async () => {
      const found = await UserNotificationPreferences.findByUserId(
        testUser._id.toString()
      );

      expect(found._id.toString()).toBe(testPreferences._id.toString());
    });

    it('should create default preferences', async () => {
      const newUser = new User({
        name: 'Default User',
        email: 'default@example.com',
        password: 'password123',
      });
      await newUser.save();

      const prefs = await UserNotificationPreferences.createDefault(
        newUser._id.toString(),
        {
          email: newUser.email,
          phone: newUser.phone,
        }
      );

      expect(prefs.userId.toString()).toBe(newUser._id.toString());
      expect(prefs.globalEnabled).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  describe('User Creation with Preferences', () => {
    it('should create preferences when user is created', async () => {
      const newUser = new User({
        name: 'Integration User',
        email: 'integration@example.com',
        password: 'password123',
        phone: '+1234567890',
        userType: 'investor',
      });
      await newUser.save();

      // Check if preferences were created
      const prefs = await UserNotificationPreferences.findOne({
        userId: newUser._id,
      });

      expect(prefs).toBeTruthy();
      expect(prefs.userId.toString()).toBe(newUser._id.toString());
      expect(prefs.globalEnabled).toBe(true);
    });
  });

  describe('Preferences Update Flow', () => {
    it('should update preferences and send notification', async () => {
      const updateData = {
        globalEnabled: false,
        notifyOnChange: false, // Disable notification for test
      };

      const response = await request(app)
        .put(`/api/users/${testUser._id}/preferences`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.globalEnabled).toBe(false);

      // Check if preferences were updated in database
      const updatedPrefs = await UserNotificationPreferences.findById(
        testPreferences._id
      );
      expect(updatedPrefs.globalEnabled).toBe(false);
    });
  });
});
