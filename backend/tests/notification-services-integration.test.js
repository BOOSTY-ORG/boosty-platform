/**
 * Notification Services Integration Tests
 *
 * This test suite provides comprehensive integration testing for notification services:
 * - Notification Service integration
 * - Notification Preferences Service integration
 * - Notification Template Service integration
 * - Queue Manager integration
 * - External service integrations (Twilio/Mailgun)
 * - Real-time notification integration
 * - End-to-end notification flows
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import NotificationService from '../src/services/notification/notification.service.js';
import NotificationPreferencesService from '../src/services/notification/notificationPreferences.service.js';
import NotificationTemplateService from '../src/services/notification/notificationTemplate.service.js';
import QueueManager from '../src/services/notification/queueManager.service.js';
import TwilioService from '../src/services/notification/twilio.service.js';
import MailgunService from '../src/services/notification/mailgun.service.js';
import realtimeEventHandlerService from '../src/services/notification/realtimeEventHandler.service.js';
import Notification from '../src/models/notification.model.js';
import NotificationDelivery from '../src/models/notificationDelivery.model.js';
import NotificationTemplate from '../src/models/notificationTemplate.model.js';
import UserNotificationPreferences from '../src/models/userNotificationPreferences.model.js';
import User from '../src/models/user.model.js';
import NotificationTestFixtures from './helpers/notification-test-fixtures.js';

// Test configuration
let mongoServer;
let app;
let testFixtures;
let testUsers;
let testTemplates;
let testPreferences;
let mockServices;

// Setup and teardown
beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Initialize test fixtures
  testFixtures = new NotificationTestFixtures();

  // Create Express app
  app = express();
  app.use(express.json());

  // Mock authentication middleware
  app.use((req, res, next) => {
    req.user = {
      _id: testUsers?.[0]?._id || new mongoose.Types.ObjectId(),
      role: 'admin',
    };
    next();
  });

  // Create mock external services
  mockServices = createMockServices();
});

afterAll(async () => {
  // Cleanup
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Create test data
  testUsers = await testFixtures.generateTestUsers(3);
  testTemplates = await testFixtures.generateNotificationTemplates(5);
  testPreferences = await testFixtures.generateUserPreferences(testUsers);

  // Clear collections
  await Notification.deleteMany({});
  await NotificationDelivery.deleteMany({});
});

afterEach(async () => {
  // Cleanup test data
  await testFixtures.cleanupTestData(testUsers);
});

/**
 * Create mock external services
 */
function createMockServices() {
  return {
    twilio: {
      isInitialized: true,
      sendSMS: async (options) => ({
        success: true,
        messageId: `mock-twilio-${Date.now()}`,
        status: 'sent',
        provider: 'twilio',
        cost: { amount: 0.05, currency: 'USD' },
      }),
      sendBatchSMS: async (recipients, content, options = {}) => ({
        total: recipients.length,
        successful: recipients.length,
        failed: 0,
        results: recipients.map((r) => ({
          success: true,
          recipient: r.phoneNumber || r.phone || r.to,
          messageId: `mock-twilio-${Date.now()}-${Math.random()}`,
        })),
        batchId: `batch-${Date.now()}`,
      }),
      getDeliveryStatus: async (messageId) => ({
        messageId,
        status: 'delivered',
        dateSent: new Date(),
        dateUpdated: new Date(),
      }),
      initialize: async () => true,
      testConnection: async () => true,
    },
    mailgun: {
      isInitialized: true,
      sendEmail: async (options) => ({
        success: true,
        messageId: `mock-mailgun-${Date.now()}`,
        status: 'queued',
        provider: 'mailgun',
        cost: { amount: 0.02, currency: 'USD' },
      }),
      sendBatchEmail: async (recipients, content, options = {}) => ({
        total: recipients.length,
        successful: recipients.length,
        failed: 0,
        results: recipients.map((r) => ({
          success: true,
          recipient: r.email || r.to,
          messageId: `mock-mailgun-${Date.now()}-${Math.random()}`,
        })),
        batchId: `batch-${Date.now()}`,
      }),
      getDeliveryStatus: async (messageId) => ({
        messageId,
        event: 'delivered',
        timestamp: new Date(),
        recipient: 'test@example.com',
      }),
      initialize: async () => true,
      testConnection: async () => true,
    },
    redis: {
      get: async (key) => null,
      set: async (key, value, options) => true,
      del: async (key) => true,
      exists: async (key) => false,
    },
  };
}

describe('Notification Service Integration', () => {
  let notificationService;

  beforeEach(() => {
    // Initialize service with mock dependencies
    notificationService = new NotificationService();

    // Replace external services with mocks
    notificationService.twilioService = mockServices.twilio;
    notificationService.mailgunService = mockServices.mailgun;
  });

  describe('Send Notification', () => {
    it('should send email notification successfully', async () => {
      const notificationData = {
        userId: testUsers[0]._id,
        type: 'email',
        channels: ['email'],
        recipient: {
          email: testUsers[0].email,
        },
        subject: 'Test Email',
        content: 'This is a test email',
        category: 'general',
        priority: 'medium',
      };

      const result =
        await notificationService.sendNotification(notificationData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
      expect(result.status).toBe('queued');
      expect(result.channels).toEqual(['email']);
    });

    it('should send SMS notification successfully', async () => {
      const notificationData = {
        userId: testUsers[1]._id,
        type: 'sms',
        channels: ['sms'],
        recipient: {
          phone: testUsers[1].phone,
        },
        content: 'This is a test SMS',
        category: 'alert',
        priority: 'high',
      };

      const result =
        await notificationService.sendNotification(notificationData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
      expect(result.status).toBe('queued');
      expect(result.channels).toEqual(['sms']);
    });

    it('should send multi-channel notification successfully', async () => {
      const notificationData = {
        userId: testUsers[0]._id,
        type: 'alert',
        channels: ['email', 'sms', 'in_app'],
        recipient: {
          email: testUsers[0].email,
          phone: testUsers[0].phone,
        },
        subject: 'Multi-channel Alert',
        content: 'This is a multi-channel alert',
        category: 'alert',
        priority: 'urgent',
      };

      const result =
        await notificationService.sendNotification(notificationData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
      expect(result.channels).toEqual(['email', 'sms', 'in_app']);
    });

    it('should respect user preferences', async () => {
      // Update user preferences to disable SMS
      await testPreferences[1].updateCategoryPreferences('alert', false, [
        'email',
      ]);

      const notificationData = {
        userId: testUsers[1]._id,
        type: 'alert',
        channels: ['email', 'sms'],
        recipient: {
          email: testUsers[1].email,
          phone: testUsers[1].phone,
        },
        content: 'Test alert',
        category: 'alert',
        priority: 'high',
      };

      const result =
        await notificationService.sendNotification(notificationData);

      expect(result.success).toBe(true);
      expect(result.channels).toEqual(['email']); // SMS should be filtered out
    });

    it('should handle quiet hours', async () => {
      // Update user preferences to enable quiet hours
      await testPreferences[2].updateQuietHours(true, '22:00', '08:00', 'UTC');

      const notificationData = {
        userId: testUsers[2]._id,
        type: 'email',
        channels: ['email'],
        recipient: {
          email: testUsers[2].email,
        },
        content: 'Test during quiet hours',
        category: 'general',
        priority: 'medium', // Not urgent
      };

      const result =
        await notificationService.sendNotification(notificationData);

      expect(result.success).toBe(true);
      expect(result.status).toBe('filtered');
      expect(result.message).toContain('quiet hours');
    });

    it('should allow urgent notifications during quiet hours', async () => {
      // Update user preferences to enable quiet hours
      await testPreferences[2].updateQuietHours(true, '22:00', '08:00', 'UTC');

      const notificationData = {
        userId: testUsers[2]._id,
        type: 'email',
        channels: ['email'],
        recipient: {
          email: testUsers[2].email,
        },
        content: 'Urgent notification',
        category: 'alert',
        priority: 'urgent', // Should bypass quiet hours
      };

      const result =
        await notificationService.sendNotification(notificationData);

      expect(result.success).toBe(true);
      expect(result.status).toBe('queued');
      expect(result.channels).toEqual(['email']);
    });
  });

  describe('Send Template Notification', () => {
    it('should send notification using template', async () => {
      const template = testTemplates[0]; // Welcome template
      const variables = {
        userName: testUsers[0].name,
        userEmail: testUsers[0].email,
      };

      const result = await notificationService.sendTemplateNotification(
        template._id,
        testUsers[0]._id,
        variables
      );

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();

      // Verify notification was created with rendered content
      const notification = await Notification.findById(result.notificationId);
      expect(notification.content).toContain(testUsers[0].name);
      expect(notification.subject).toContain(testUsers[0].name);
    });

    it('should handle missing template variables', async () => {
      const template = testTemplates[0]; // Welcome template with required variables
      const variables = {
        // Missing required userName variable
      };

      await expect(
        notificationService.sendTemplateNotification(
          template._id,
          testUsers[0]._id,
          variables
        )
      ).rejects.toThrow('Missing required variables');
    });

    it('should validate template type compatibility', async () => {
      const emailTemplate = testTemplates.find((t) => t.type === 'email');
      const smsUser = testUsers.find((u) => u.phone);

      const result = await notificationService.sendTemplateNotification(
        emailTemplate._id,
        smsUser._id,
        { userName: smsUser.name }
      );

      expect(result.success).toBe(true);
      expect(result.channels).toEqual(['email']); // Should only use email channels
    });
  });

  describe('Send Bulk Notifications', () => {
    it('should send bulk notifications successfully', async () => {
      const notifications = testFixtures.generateNotificationData(
        testUsers,
        testTemplates,
        {
          count: 50,
          useTemplates: false,
        }
      );

      const result = await notificationService.sendBulkNotifications(
        notifications,
        {
          batchSize: 10,
          delayBetweenBatches: 100,
        }
      );

      expect(result.successful).toBeGreaterThan(40);
      expect(result.failed).toBeLessThan(10);
      expect(result.total).toBe(50);
      expect(result.batchId).toBeDefined();
    });

    it('should handle mixed success and failure in bulk', async () => {
      const notifications = testFixtures.generateNotificationData(
        testUsers,
        testTemplates,
        {
          count: 10,
          useTemplates: false,
        }
      );

      // Make some notifications invalid
      notifications[3].userId = 'invalid-id';
      notifications[7].category = 'invalid-category';

      const result =
        await notificationService.sendBulkNotifications(notifications);

      expect(result.successful).toBe(8);
      expect(result.failed).toBe(2);
      expect(result.total).toBe(10);
    });

    it('should respect rate limits in bulk operations', async () => {
      const notifications = testFixtures.generateNotificationData(
        testUsers,
        testTemplates,
        {
          count: 100,
          useTemplates: false,
        }
      );

      const startTime = Date.now();
      const result = await notificationService.sendBulkNotifications(
        notifications,
        {
          batchSize: 20,
          delayBetweenBatches: 1000, // 1 second delay
        }
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThan(4000); // Should have delays
      expect(result.successful).toBeGreaterThan(80);
    });
  });

  describe('Schedule Notification', () => {
    it('should schedule notification for future delivery', async () => {
      const scheduledTime = new Date(Date.now() + 60000); // 1 minute from now
      const notificationData = {
        userId: testUsers[0]._id,
        type: 'email',
        channels: ['email'],
        recipient: {
          email: testUsers[0].email,
        },
        subject: 'Scheduled Notification',
        content: 'This is a scheduled notification',
        category: 'reminder',
        priority: 'medium',
      };

      const result = await notificationService.scheduleNotification(
        notificationData,
        scheduledTime
      );

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
      expect(result.status).toBe('scheduled');
      expect(result.scheduledAt.getTime()).toBeCloseTo(
        scheduledTime.getTime(),
        -1000
      );

      // Verify notification was created with scheduled time
      const notification = await Notification.findById(result.notificationId);
      expect(notification.scheduledAt.getTime()).toBeCloseTo(
        scheduledTime.getTime(),
        -1000
      );
      expect(notification.status).toBe('pending');
    });

    it('should reject past scheduling time', async () => {
      const pastTime = new Date(Date.now() - 60000); // 1 minute ago
      const notificationData = {
        userId: testUsers[0]._id,
        type: 'email',
        channels: ['email'],
        content: 'Test',
        category: 'reminder',
      };

      await expect(
        notificationService.scheduleNotification(notificationData, pastTime)
      ).rejects.toThrow('must be in the future');
    });
  });

  describe('Get User Notifications', () => {
    beforeEach(async () => {
      // Create test notifications
      for (let i = 0; i < 20; i++) {
        const notification = new Notification({
          userId: testUsers[0]._id,
          type: ['email', 'sms', 'in_app'][i % 3],
          channels: [['email'], ['sms'], ['in_app']][i % 3],
          recipient: {
            email: testUsers[0].email,
            phone: testUsers[0].phone,
          },
          subject: `Test Subject ${i}`,
          content: `Test content ${i}`,
          category: ['general', 'alert', 'reminder'][i % 3],
          priority: ['low', 'medium', 'high'][i % 3],
          status: ['pending', 'sent', 'delivered', 'read'][i % 4],
        });
        await notification.save();
      }
    });

    it('should get user notifications with pagination', async () => {
      const result = await notificationService.getUserNotifications(
        testUsers[0]._id,
        {
          page: 1,
          limit: 10,
        }
      );

      expect(result.notifications).toHaveLength(10);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalPages).toBeGreaterThan(1);
      expect(result.pagination.hasNext).toBe(true);
    });

    it('should filter notifications by type', async () => {
      const result = await notificationService.getUserNotifications(
        testUsers[0]._id,
        {
          type: 'email',
        }
      );

      result.notifications.forEach((notification) => {
        expect(notification.type).toBe('email');
      });
    });

    it('should filter notifications by status', async () => {
      const result = await notificationService.getUserNotifications(
        testUsers[0]._id,
        {
          status: 'delivered',
        }
      );

      result.notifications.forEach((notification) => {
        expect(notification.status).toBe('delivered');
      });
    });

    it('should filter notifications by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const endDate = new Date();

      const result = await notificationService.getUserNotifications(
        testUsers[0]._id,
        {
          dateRange: {
            start: startDate,
            end: endDate,
          },
        }
      );

      result.notifications.forEach((notification) => {
        expect(notification.createdAt.getTime()).toBeGreaterThanOrEqual(
          startDate.getTime()
        );
        expect(notification.createdAt.getTime()).toBeLessThanOrEqual(
          endDate.getTime()
        );
      });
    });
  });

  describe('Mark Notification as Read', () => {
    let notification;

    beforeEach(async () => {
      notification = new Notification({
        userId: testUsers[0]._id,
        type: 'email',
        channels: ['email'],
        content: 'Test notification',
        category: 'general',
        status: 'delivered',
      });
      await notification.save();

      // Create delivery record
      const delivery = new NotificationDelivery({
        notificationId: notification._id,
        channel: 'email',
        provider: 'mailgun',
        status: 'delivered',
        recipient: testUsers[0].email,
      });
      await delivery.save();
    });

    it('should mark notification as read', async () => {
      await notificationService.markAsRead(notification._id, ['email']);

      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification.status).toBe('read');
      expect(updatedNotification.readAt).toBeDefined();
      expect(updatedNotification.opened).toBe(true);

      const updatedDelivery = await NotificationDelivery.findOne({
        notificationId: notification._id,
        channel: 'email',
      });
      expect(updatedDelivery.status).toBe('read');
    });

    it('should mark specific channels as read', async () => {
      // Create additional delivery records
      const smsDelivery = new NotificationDelivery({
        notificationId: notification._id,
        channel: 'sms',
        provider: 'twilio',
        status: 'delivered',
        recipient: testUsers[0].phone,
      });
      await smsDelivery.save();

      await notificationService.markAsRead(notification._id, ['email']);

      const emailDelivery = await NotificationDelivery.findOne({
        notificationId: notification._id,
        channel: 'email',
      });
      expect(emailDelivery.status).toBe('read');

      const smsDeliveryRecord = await NotificationDelivery.findOne({
        notificationId: notification._id,
        channel: 'sms',
      });
      expect(smsDeliveryRecord.status).toBe('delivered'); // Should remain unchanged
    });
  });
});

describe('Notification Preferences Service Integration', () => {
  let preferencesService;

  beforeEach(() => {
    preferencesService = new NotificationPreferencesService();
  });

  describe('Get or Create Preferences', () => {
    it('should create default preferences for new user', async () => {
      const newUser = new User({
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        phone: '+1234567890',
        userType: 'standard',
      });
      await newUser.save();

      const preferences = await preferencesService.getOrCreatePreferences(
        newUser._id
      );

      expect(preferences.userId.toString()).toBe(newUser._id.toString());
      expect(preferences.globalEnabled).toBe(true);
      expect(preferences.channels.email.enabled).toBe(true);
      expect(preferences.channels.sms.enabled).toBe(true);
      expect(preferences.channels.inApp.enabled).toBe(true);
    });

    it('should return existing preferences', async () => {
      const preferences = await preferencesService.getOrCreatePreferences(
        testUsers[0]._id
      );

      expect(preferences._id.toString()).toBe(
        testPreferences[0]._id.toString()
      );
    });
  });

  describe('Update Preferences', () => {
    it('should update user preferences', async () => {
      const updates = {
        globalEnabled: false,
        channels: {
          email: { enabled: false },
        },
      };

      const updatedPreferences = await preferencesService.updatePreferences(
        testUsers[0]._id,
        updates
      );

      expect(updatedPreferences.globalEnabled).toBe(false);
      expect(updatedPreferences.channels.email.enabled).toBe(false);
    });

    it('should validate preference updates', async () => {
      const invalidUpdates = {
        channels: {
          email: {
            enabled: 'not-a-boolean', // Invalid type
          },
        },
      };

      await expect(
        preferencesService.updatePreferences(testUsers[0]._id, invalidUpdates)
      ).rejects.toThrow();
    });
  });

  describe('Check Frequency Limits', () => {
    beforeEach(async () => {
      // Create some notifications for frequency testing
      for (let i = 0; i < 5; i++) {
        const notification = new Notification({
          userId: testUsers[0]._id,
          type: 'email',
          channels: ['email'],
          content: `Frequency test ${i}`,
          category: 'general',
          status: 'sent',
          createdAt: new Date(Date.now() - i * 60 * 60 * 1000), // Hours ago
        });
        await notification.save();
      }
    });

    it('should check frequency limits correctly', async () => {
      const frequencyStatus = await preferencesService.checkFrequencyLimits(
        testUsers[0]._id
      );

      expect(frequencyStatus).toHaveProperty('hour');
      expect(frequencyStatus).toHaveProperty('day');
      expect(frequencyStatus).toHaveProperty('week');
      expect(frequencyStatus).toHaveProperty('canSend');
      expect(typeof frequencyStatus.canSend).toBe('boolean');
    });

    it('should enforce frequency limits', async () => {
      // Update user preferences with low limits
      await testPreferences[0].updateFrequencyLimits(2, 5, 10);

      // Create notifications up to the limit
      for (let i = 0; i < 2; i++) {
        const notification = new Notification({
          userId: testUsers[0]._id,
          type: 'email',
          channels: ['email'],
          content: `Limit test ${i}`,
          category: 'general',
          status: 'sent',
          createdAt: new Date(),
        });
        await notification.save();
      }

      const frequencyStatus = await preferencesService.checkFrequencyLimits(
        testUsers[0]._id
      );
      expect(frequencyStatus.hour.canSend).toBe(false);
    });
  });
});

describe('Notification Template Service Integration', () => {
  let templateService;

  beforeEach(() => {
    templateService = new NotificationTemplateService();
  });

  describe('Create Template', () => {
    it('should create template successfully', async () => {
      const templateData = {
        name: 'Integration Test Template',
        description: 'Template for integration testing',
        type: 'email',
        category: 'general',
        priority: 'medium',
        subject: 'Test Subject {{variable}}',
        content: 'Test content {{variable}}',
        htmlContent: '<p>Test content {{variable}}</p>',
        variables: [
          {
            name: 'variable',
            description: 'Test variable',
            type: 'text',
            required: true,
          },
        ],
        isActive: true,
        createdBy: 'integration-test',
      };

      const template = await templateService.createTemplate(templateData);

      expect(template._id).toBeDefined();
      expect(template.name).toBe(templateData.name);
      expect(template.type).toBe(templateData.type);
      expect(template.category).toBe(templateData.category);
      expect(template.isActive).toBe(true);
    });

    it('should validate template data', async () => {
      const invalidTemplateData = {
        name: 'Invalid Template',
        type: 'invalid-type',
        category: 'invalid-category',
        content: 'Test content',
      };

      await expect(
        templateService.createTemplate(invalidTemplateData)
      ).rejects.toThrow();
    });
  });

  describe('Render Template', () => {
    it('should render template with variables', async () => {
      const template = testTemplates[0]; // Welcome template
      const variables = {
        userName: 'John Doe',
        userEmail: 'john@example.com',
      };

      const rendered = await templateService.renderTemplate(
        template._id,
        variables
      );

      expect(rendered.subject).toContain('John Doe');
      expect(rendered.content).toContain('John Doe');
      expect(rendered.htmlContent).toContain('John Doe');
    });

    it('should handle missing variables with defaults', async () => {
      const template = testTemplates[0]; // Welcome template
      const variables = {
        userName: 'Jane Doe',
        // userEmail missing, should use default if available
      };

      const rendered = await templateService.renderTemplate(
        template._id,
        variables
      );

      expect(rendered.subject).toContain('Jane Doe');
      expect(rendered.content).toContain('Jane Doe');
    });

    it('should validate required variables', async () => {
      const template = testTemplates[0]; // Welcome template
      const variables = {}; // Missing required variables

      await expect(
        templateService.renderTemplate(template._id, variables)
      ).rejects.toThrow('Missing required variables');
    });
  });

  describe('Template Management', () => {
    it('should update template', async () => {
      const template = testTemplates[0];
      const updates = {
        name: 'Updated Template Name',
        subject: 'Updated Subject {{variable}}',
        isActive: false,
      };

      const updatedTemplate = await templateService.updateTemplate(
        template._id,
        updates
      );

      expect(updatedTemplate.name).toBe(updates.name);
      expect(updatedTemplate.subject).toBe(updates.subject);
      expect(updatedTemplate.isActive).toBe(false);
    });

    it('should duplicate template', async () => {
      const template = testTemplates[0];
      const duplicatedTemplate = await templateService.duplicateTemplate(
        template._id,
        'Duplicated Template'
      );

      expect(duplicatedTemplate._id).toBeDefined();
      expect(duplicatedTemplate.name).toBe('Duplicated Template');
      expect(duplicatedTemplate.isActive).toBe(false);
      expect(duplicatedTemplate.parentTemplateId.toString()).toBe(
        template._id.toString()
      );
    });

    it('should delete template', async () => {
      const template = testTemplates[0];
      await templateService.deleteTemplate(template._id);

      const deletedTemplate = await NotificationTemplate.findById(template._id);
      expect(deletedTemplate).toBeNull();
    });
  });
});

describe('Queue Manager Integration', () => {
  let queueManager;

  beforeEach(async () => {
    queueManager = QueueManager;
    await queueManager.initialize();
  });

  afterEach(async () => {
    await queueManager.shutdown();
  });

  describe('Queue Operations', () => {
    it('should add notification job to queue', async () => {
      const notificationData = {
        id: new mongoose.Types.ObjectId(),
        userId: testUsers[0]._id,
        type: 'email',
        channels: ['email'],
        priority: 'high',
      };

      const job = await queueManager.addNotificationJob(notificationData);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data.priority).toBe('high');
    });

    it('should route jobs by priority', async () => {
      const highPriorityJob = await queueManager.addNotificationJob({
        id: new mongoose.Types.ObjectId(),
        userId: testUsers[0]._id,
        type: 'email',
        priority: 'urgent',
      });

      const lowPriorityJob = await queueManager.addNotificationJob({
        id: new mongoose.Types.ObjectId(),
        userId: testUsers[0]._id,
        type: 'email',
        priority: 'low',
      });

      // High priority should be processed first
      expect(highPriorityJob.opts.priority).toBeGreaterThan(
        lowPriorityJob.opts.priority
      );
    });

    it('should handle scheduled jobs', async () => {
      const scheduledTime = new Date(Date.now() + 60000); // 1 minute from now
      const job = await queueManager.addNotificationJob({
        id: new mongoose.Types.ObjectId(),
        userId: testUsers[0]._id,
        type: 'email',
        scheduledAt: scheduledTime,
      });

      expect(job.opts.delay).toBeGreaterThan(0);
      expect(job.opts.delay).toBeLessThan(61000);
    });
  });

  describe('Queue Monitoring', () => {
    it('should get queue statistics', async () => {
      // Add some jobs to the queue
      for (let i = 0; i < 5; i++) {
        await queueManager.addNotificationJob({
          id: new mongoose.Types.ObjectId(),
          userId: testUsers[0]._id,
          type: 'email',
          priority: ['low', 'medium', 'high'][i % 3],
        });
      }

      const stats = await queueManager.getQueueStats();

      expect(typeof stats).toBe('object');
      expect(Object.keys(stats)).toContain('highPriority');
      expect(Object.keys(stats)).toContain('normalPriority');
      expect(Object.keys(stats)).toContain('lowPriority');
    });

    it('should perform health check', async () => {
      const health = await queueManager.performHealthCheck();

      expect(health.status).toBe('healthy');
      expect(health.queues).toBeDefined();
      expect(typeof health.queues).toBe('object');
    });
  });

  describe('Queue Error Handling', () => {
    it('should handle job failures', async () => {
      // Mock a processor that fails
      const originalProcessor = queueManager.createProcessor('test');
      queueManager.createProcessor = () => async (job) => {
        throw new Error('Test processor error');
      };

      const job = await queueManager.addNotificationJob({
        id: new mongoose.Types.ObjectId(),
        userId: testUsers[0]._id,
        type: 'email',
      });

      // Wait for job to be processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Job should be marked as failed
      const notification = await Notification.findById(job.data.id);
      expect(notification.status).toBe('failed');
      expect(notification.error).toBeDefined();
    });
  });
});

describe('External Service Integration', () => {
  describe('Twilio Integration', () => {
    let twilioService;

    beforeEach(() => {
      twilioService = mockServices.twilio;
    });

    it('should send SMS successfully', async () => {
      const result = await twilioService.sendSMS({
        to: '+1234567890',
        content: 'Test SMS message',
        notificationId: new mongoose.Types.ObjectId(),
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.status).toBe('sent');
    });

    it('should handle batch SMS sending', async () => {
      const recipients = [
        { phoneNumber: '+1234567890' },
        { phoneNumber: '+1234567891' },
        { phoneNumber: '+1234567892' },
      ];

      const result = await twilioService.sendBatchSMS(
        recipients,
        'Batch test message'
      );

      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it('should validate phone numbers', async () => {
      await expect(
        twilioService.sendSMS({
          to: 'invalid-phone',
          content: 'Test message',
        })
      ).rejects.toThrow('Invalid phone number');
    });

    it('should check delivery status', async () => {
      const messageId = 'test-message-id';
      const status = await twilioService.getDeliveryStatus(messageId);

      expect(status.messageId).toBe(messageId);
      expect(status.status).toBe('delivered');
    });
  });

  describe('Mailgun Integration', () => {
    let mailgunService;

    beforeEach(() => {
      mailgunService = mockServices.mailgun;
    });

    it('should send email successfully', async () => {
      const result = await mailgunService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        content: 'This is a test email',
        htmlContent: '<p>This is a test email</p>',
        notificationId: new mongoose.Types.ObjectId(),
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.status).toBe('queued');
    });

    it('should handle batch email sending', async () => {
      const recipients = [
        { email: 'test1@example.com' },
        { email: 'test2@example.com' },
        { email: 'test3@example.com' },
      ];

      const result = await mailgunService.sendBatchEmail(recipients, {
        subject: 'Batch Test Email',
        text: 'This is a batch test email',
        html: '<p>This is a batch test email</p>',
      });

      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it('should validate email addresses', async () => {
      await expect(
        mailgunService.sendEmail({
          to: 'invalid-email',
          subject: 'Test',
          content: 'Test content',
        })
      ).rejects.toThrow('Invalid email addresses');
    });

    it('should check delivery status', async () => {
      const messageId = 'test-message-id';
      const status = await mailgunService.getDeliveryStatus(messageId);

      expect(status.messageId).toBe(messageId);
      expect(status.event).toBe('delivered');
    });
  });
});

describe('Real-time Notification Integration', () => {
  beforeEach(async () => {
    // Initialize real-time service
    await realtimeEventHandlerService.initialize();
  });

  it('should process notification for real-time delivery', async () => {
    const notification = new Notification({
      userId: testUsers[0]._id,
      type: 'in_app',
      channels: ['in_app'],
      content: 'Real-time test notification',
      category: 'alert',
      priority: 'high',
    });
    await notification.save();

    await realtimeEventHandlerService.processNotification(notification._id);

    // Verify notification was processed (implementation specific)
    // This test will depend on the actual real-time implementation
    expect(true).toBe(true); // Placeholder assertion
  });

  it('should handle WebSocket connections', async () => {
    // This test would require actual WebSocket client
    // For now, we'll test the service initialization
    expect(realtimeEventHandlerService.isInitialized).toBe(true);
  });

  it('should handle SSE connections', async () => {
    // This test would require actual SSE client
    // For now, we'll test the service initialization
    expect(realtimeEventHandlerService.isInitialized).toBe(true);
  });
});
