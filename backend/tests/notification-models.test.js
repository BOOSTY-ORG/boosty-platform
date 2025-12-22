/**
 * Notification Models Unit Tests
 *
 * This test suite provides comprehensive unit testing for all notification models:
 * - Notification model tests
 * - NotificationDelivery model tests
 * - NotificationTemplate model tests
 * - UserNotificationPreferences model tests
 * - Model relationships and validations
 * - Model methods and virtuals
 * - Model static methods
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Notification from '../src/models/notification.model.js';
import NotificationDelivery from '../src/models/notificationDelivery.model.js';
import NotificationTemplate from '../src/models/notificationTemplate.model.js';
import UserNotificationPreferences from '../src/models/userNotificationPreferences.model.js';
import User from '../src/models/user.model.js';

// Test configuration
let mongoServer;
let testUser;

// Setup and teardown
beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create test user
  testUser = new User({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    phone: '+1234567890',
    userType: 'standard',
  });
  await testUser.save();
});

afterAll(async () => {
  // Cleanup
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear collections before each test
  await Notification.deleteMany({});
  await NotificationDelivery.deleteMany({});
  await NotificationTemplate.deleteMany({});
  await UserNotificationPreferences.deleteMany({});
});

describe('Notification Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid notification', async () => {
      const notification = new Notification({
        userId: testUser._id,
        type: 'email',
        channels: ['email', 'in_app'],
        recipient: {
          email: testUser.email,
          phone: testUser.phone,
        },
        subject: 'Test Subject',
        content: 'Test content',
        category: 'general',
        priority: 'medium',
      });

      const savedNotification = await notification.save();
      expect(savedNotification._id).toBeDefined();
      expect(savedNotification.userId.toString()).toBe(testUser._id.toString());
      expect(savedNotification.type).toBe('email');
      expect(savedNotification.channels).toEqual(['email', 'in_app']);
      expect(savedNotification.subject).toBe('Test Subject');
      expect(savedNotification.content).toBe('Test content');
      expect(savedNotification.category).toBe('general');
      expect(savedNotification.priority).toBe('medium');
      expect(savedNotification.status).toBe('pending');
    });

    it('should require userId', async () => {
      const notification = new Notification({
        type: 'email',
        channels: ['email'],
        content: 'Test content',
        category: 'general',
      });

      await expect(notification.save()).rejects.toThrow();
    });

    it('should require type', async () => {
      const notification = new Notification({
        userId: testUser._id,
        channels: ['email'],
        content: 'Test content',
        category: 'general',
      });

      await expect(notification.save()).rejects.toThrow();
    });

    it('should require content', async () => {
      const notification = new Notification({
        userId: testUser._id,
        type: 'email',
        channels: ['email'],
        category: 'general',
      });

      await expect(notification.save()).rejects.toThrow();
    });

    it('should require category', async () => {
      const notification = new Notification({
        userId: testUser._id,
        type: 'email',
        channels: ['email'],
        content: 'Test content',
      });

      await expect(notification.save()).rejects.toThrow();
    });

    it('should validate enum values', async () => {
      const invalidNotification = new Notification({
        userId: testUser._id,
        type: 'invalid-type',
        channels: ['invalid-channel'],
        content: 'Test content',
        category: 'invalid-category',
        priority: 'invalid-priority',
      });

      await expect(invalidNotification.save()).rejects.toThrow();
    });
  });

  describe('Virtuals', () => {
    let notification;

    beforeEach(async () => {
      notification = new Notification({
        userId: testUser._id,
        type: 'email',
        channels: ['email'],
        content: 'Test content',
        category: 'general',
        priority: 'medium',
      });
      await notification.save();
    });

    it('should calculate isScheduled correctly', () => {
      // Test with no scheduled time
      expect(notification.isScheduled).toBe(false);

      // Test with past scheduled time
      notification.scheduledAt = new Date(Date.now() - 60000);
      expect(notification.isScheduled).toBe(false);

      // Test with future scheduled time
      notification.scheduledAt = new Date(Date.now() + 60000);
      expect(notification.isScheduled).toBe(true);
    });

    it('should calculate isDelivered correctly', () => {
      notification.status = 'sent';
      expect(notification.isDelivered).toBe(false);

      notification.status = 'delivered';
      expect(notification.isDelivered).toBe(true);

      notification.status = 'read';
      expect(notification.isDelivered).toBe(true);

      notification.status = 'failed';
      expect(notification.isDelivered).toBe(false);
    });

    it('should calculate isFailed correctly', () => {
      notification.status = 'sent';
      expect(notification.isFailed).toBe(false);

      notification.status = 'failed';
      expect(notification.isFailed).toBe(true);
    });

    it('should calculate deliveryTime correctly', () => {
      notification.sentAt = new Date('2023-01-01T10:00:00Z');
      notification.deliveredAt = new Date('2023-01-01T10:05:00Z');
      expect(notification.deliveryTime).toBe(5 * 60 * 1000); // 5 minutes

      // Test with missing timestamps
      notification.sentAt = null;
      expect(notification.deliveryTime).toBe(null);
    });

    it('should calculate canRetry correctly', () => {
      notification.status = 'failed';
      notification.retryCount = 2;
      notification.maxRetries = 3;
      expect(notification.canRetry).toBe(true);

      notification.retryCount = 3;
      expect(notification.canRetry).toBe(false);

      notification.status = 'sent';
      expect(notification.canRetry).toBe(false);
    });
  });

  describe('Instance Methods', () => {
    let notification;

    beforeEach(async () => {
      notification = new Notification({
        userId: testUser._id,
        type: 'email',
        channels: ['email', 'sms'],
        content: 'Test content',
        category: 'general',
        priority: 'medium',
      });
      await notification.save();
    });

    it('should markAsQueued correctly', async () => {
      await notification.markAsQueued('test-queue');
      expect(notification.status).toBe('queued');
      expect(notification.queueName).toBe('test-queue');
    });

    it('should markAsProcessing correctly', async () => {
      await notification.markAsProcessing();
      expect(notification.status).toBe('processing');
    });

    it('should markAsSent correctly', async () => {
      await notification.markAsSent('email', 'external-id-123');
      expect(notification.status).toBe('sent');
      expect(notification.sentAt).toBeDefined();

      const emailDelivery = notification.deliveryStatus.find(
        (d) => d.channel === 'email'
      );
      expect(emailDelivery.status).toBe('sent');
      expect(emailDelivery.externalId).toBe('external-id-123');
    });

    it('should markAsDelivered correctly', async () => {
      await notification.markAsDelivered('email', 'external-id-123');
      expect(notification.status).toBe('delivered');
      expect(notification.deliveredAt).toBeDefined();

      const emailDelivery = notification.deliveryStatus.find(
        (d) => d.channel === 'email'
      );
      expect(emailDelivery.status).toBe('delivered');
      expect(emailDelivery.externalId).toBe('external-id-123');
    });

    it('should markAsRead correctly', async () => {
      await notification.markAsRead('email');
      expect(notification.status).toBe('read');
      expect(notification.readAt).toBeDefined();
      expect(notification.opened).toBe(true);
      expect(notification.openedAt).toBeDefined();

      const emailDelivery = notification.deliveryStatus.find(
        (d) => d.channel === 'email'
      );
      expect(emailDelivery.status).toBe('read');
    });

    it('should markAsFailed correctly', async () => {
      const error = new Error('Test error');
      await notification.markAsFailed(error, 'email');
      expect(notification.status).toBe('failed');
      expect(notification.error).toBeDefined();
      expect(notification.lastRetryAt).toBeDefined();
      expect(notification.retryCount).toBe(1);

      const emailDelivery = notification.deliveryStatus.find(
        (d) => d.channel === 'email'
      );
      expect(emailDelivery.status).toBe('failed');
      expect(emailDelivery.error).toBeDefined();
    });

    it('should addClick correctly', async () => {
      const clickData = {
        url: 'https://example.com/click',
        userAgent: 'Test Browser',
        ipAddress: '127.0.0.1',
      };

      await notification.addClick(clickData);
      expect(notification.clicks).toBe(1);
      expect(notification.clickTracking).toHaveLength(1);
      expect(notification.clickTracking[0]).toMatchObject(clickData);
    });

    it('should scheduleRetry correctly', async () => {
      await notification.scheduleRetry(60000); // 1 minute
      expect(notification.nextRetryAt).toBeDefined();
      expect(notification.nextRetryAt.getTime()).toBeCloseTo(
        Date.now() + 60000,
        -1000
      );
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test notifications
      for (let i = 0; i < 10; i++) {
        const notification = new Notification({
          userId: testUser._id,
          type: i % 2 === 0 ? 'email' : 'sms',
          channels: [i % 2 === 0 ? 'email' : 'sms'],
          content: `Test content ${i}`,
          category: ['general', 'alert', 'reminder'][i % 3],
          priority: ['low', 'medium', 'high'][i % 3],
          status: ['pending', 'sent', 'delivered', 'read', 'failed'][i % 5],
        });
        await notification.save();
      }
    });

    it('should getByUser with pagination', async () => {
      const result = await Notification.getByUser(testUser._id, {
        page: 1,
        limit: 5,
      });

      expect(result).toHaveLength(5);
      expect(result[0].userId.toString()).toBe(testUser._id.toString());
    });

    it('should getByUser with filters', async () => {
      const result = await Notification.getByUser(testUser._id, {
        filters: {
          type: 'email',
          status: 'sent',
          category: 'general',
          priority: 'medium',
        },
      });

      result.forEach((notification) => {
        expect(notification.type).toBe('email');
        expect(notification.status).toBe('sent');
        expect(notification.category).toBe('general');
        expect(notification.priority).toBe('medium');
      });
    });

    it('should getPendingNotifications', async () => {
      const pendingNotifications = await Notification.getPendingNotifications();
      expect(Array.isArray(pendingNotifications)).toBe(true);

      pendingNotifications.forEach((notification) => {
        expect(['pending', 'queued']).toContain(notification.status);
      });
    });

    it('should getRetryableNotifications', async () => {
      // Create a failed notification with retry count < 3
      const failedNotification = new Notification({
        userId: testUser._id,
        type: 'email',
        channels: ['email'],
        content: 'Failed notification',
        category: 'general',
        priority: 'medium',
        status: 'failed',
        retryCount: 1,
        nextRetryAt: new Date(),
      });
      await failedNotification.save();

      const retryableNotifications =
        await Notification.getRetryableNotifications();
      expect(Array.isArray(retryableNotifications)).toBe(true);

      const foundNotification = retryableNotifications.find(
        (n) => n._id.toString() === failedNotification._id.toString()
      );
      expect(foundNotification).toBeDefined();
    });

    it('should getStats', async () => {
      const stats = await Notification.getStats(testUser._id);
      expect(Array.isArray(stats)).toBe(true);
      expect(stats[0]).toHaveProperty('totalSent');
      expect(stats[0]).toHaveProperty('totalDelivered');
      expect(stats[0]).toHaveProperty('totalRead');
      expect(stats[0]).toHaveProperty('totalFailed');
      expect(stats[0]).toHaveProperty('totalPending');
      expect(stats[0]).toHaveProperty('deliveryRate');
      expect(stats[0]).toHaveProperty('readRate');
    });
  });
});

describe('NotificationDelivery Model', () => {
  let notification;

  beforeEach(async () => {
    notification = new Notification({
      userId: testUser._id,
      type: 'email',
      channels: ['email'],
      content: 'Test content',
      category: 'general',
      priority: 'medium',
    });
    await notification.save();
  });

  describe('Schema Validation', () => {
    it('should create a valid delivery record', async () => {
      const delivery = new NotificationDelivery({
        notificationId: notification._id,
        channel: 'email',
        provider: 'mailgun',
        status: 'pending',
        recipient: 'test@example.com',
      });

      const savedDelivery = await delivery.save();
      expect(savedDelivery._id).toBeDefined();
      expect(savedDelivery.notificationId.toString()).toBe(
        notification._id.toString()
      );
      expect(savedDelivery.channel).toBe('email');
      expect(savedDelivery.provider).toBe('mailgun');
      expect(savedDelivery.status).toBe('pending');
      expect(savedDelivery.recipient).toBe('test@example.com');
    });

    it('should require notificationId', async () => {
      const delivery = new NotificationDelivery({
        channel: 'email',
        provider: 'mailgun',
        status: 'pending',
      });

      await expect(delivery.save()).rejects.toThrow();
    });

    it('should validate enum values', async () => {
      const invalidDelivery = new NotificationDelivery({
        notificationId: notification._id,
        channel: 'invalid-channel',
        provider: 'invalid-provider',
        status: 'invalid-status',
      });

      await expect(invalidDelivery.save()).rejects.toThrow();
    });
  });

  describe('Virtuals', () => {
    let delivery;

    beforeEach(async () => {
      delivery = new NotificationDelivery({
        notificationId: notification._id,
        channel: 'email',
        provider: 'mailgun',
        status: 'pending',
        recipient: 'test@example.com',
      });
      await delivery.save();
    });

    it('should calculate isDelivered correctly', () => {
      delivery.status = 'sent';
      expect(delivery.isDelivered).toBe(false);

      delivery.status = 'delivered';
      expect(delivery.isDelivered).toBe(true);

      delivery.status = 'read';
      expect(delivery.isDelivered).toBe(true);

      delivery.status = 'failed';
      expect(delivery.isDelivered).toBe(false);
    });

    it('should calculate isFailed correctly', () => {
      delivery.status = 'sent';
      expect(delivery.isFailed).toBe(false);

      delivery.status = 'failed';
      expect(delivery.isFailed).toBe(true);

      delivery.status = 'bounced';
      expect(delivery.isFailed).toBe(true);
    });

    it('should calculate isPending correctly', () => {
      delivery.status = 'pending';
      expect(delivery.isPending).toBe(true);

      delivery.status = 'queued';
      expect(delivery.isPending).toBe(true);

      delivery.status = 'sent';
      expect(delivery.isPending).toBe(false);
    });

    it('should calculate deliveryTime correctly', () => {
      delivery.sentAt = new Date('2023-01-01T10:00:00Z');
      delivery.deliveredAt = new Date('2023-01-01T10:05:00Z');
      expect(delivery.deliveryTime).toBe(5 * 60 * 1000); // 5 minutes

      // Test with missing timestamps
      delivery.sentAt = null;
      expect(delivery.deliveryTime).toBe(null);
    });

    it('should calculate canRetry correctly', () => {
      delivery.status = 'failed';
      delivery.attempts = 2;
      delivery.maxAttempts = 3;
      expect(delivery.canRetry).toBe(true);

      delivery.attempts = 3;
      expect(delivery.canRetry).toBe(false);

      delivery.status = 'sent';
      expect(delivery.canRetry).toBe(false);
    });

    it('should calculate hasEngagement correctly', () => {
      delivery.opened = false;
      delivery.clicks = 0;
      expect(delivery.hasEngagement).toBe(false);

      delivery.opened = true;
      expect(delivery.hasEngagement).toBe(true);

      delivery.opened = false;
      delivery.clicks = 1;
      expect(delivery.hasEngagement).toBe(true);
    });
  });

  describe('Instance Methods', () => {
    let delivery;

    beforeEach(async () => {
      delivery = new NotificationDelivery({
        notificationId: notification._id,
        channel: 'email',
        provider: 'mailgun',
        status: 'pending',
        recipient: 'test@example.com',
      });
      await delivery.save();
    });

    it('should markAsQueued correctly', async () => {
      const providerResponse = { queued: true };
      await delivery.markAsQueued(providerResponse);
      expect(delivery.status).toBe('queued');
      expect(delivery.queuedAt).toBeDefined();
      expect(delivery.attempts).toBe(1);
      expect(delivery.providerResponse.get('queued')).toEqual(providerResponse);
    });

    it('should markAsSent correctly', async () => {
      const externalId = 'message-id-123';
      const providerResponse = { sent: true };
      await delivery.markAsSent(externalId, providerResponse);
      expect(delivery.status).toBe('sent');
      expect(delivery.sentAt).toBeDefined();
      expect(delivery.externalId).toBe(externalId);
      expect(delivery.providerResponse.get('sent')).toEqual(providerResponse);
    });

    it('should markAsDelivered correctly', async () => {
      const providerResponse = { delivered: true };
      await delivery.markAsDelivered(providerResponse);
      expect(delivery.status).toBe('delivered');
      expect(delivery.deliveredAt).toBeDefined();
      expect(delivery.providerResponse.get('delivered')).toEqual(
        providerResponse
      );
    });

    it('should markAsRead correctly', async () => {
      const providerResponse = { read: true };
      await delivery.markAsRead(providerResponse);
      expect(delivery.status).toBe('read');
      expect(delivery.readAt).toBeDefined();
      expect(delivery.opened).toBe(true);
      expect(delivery.openedAt).toBeDefined();
      expect(delivery.providerResponse.get('read')).toEqual(providerResponse);
    });

    it('should markAsFailed correctly', async () => {
      const error = {
        code: 'ERROR_CODE',
        message: 'Test error',
        details: { error: 'details' },
      };
      const providerResponse = { failed: true };
      await delivery.markAsFailed(error, providerResponse);
      expect(delivery.status).toBe('failed');
      expect(delivery.failedAt).toBeDefined();
      expect(delivery.attempts).toBe(1);
      expect(delivery.error).toEqual(error);
      expect(delivery.providerResponse.get('failed')).toEqual(providerResponse);
    });

    it('should addClick correctly', async () => {
      const clickData = {
        timestamp: new Date(),
        url: 'https://example.com/click',
        userAgent: 'Test Browser',
        ipAddress: '127.0.0.1',
        referer: 'https://example.com',
      };

      await delivery.addClick(clickData);
      expect(delivery.clicks).toBe(1);
      expect(delivery.clickTracking).toHaveLength(1);
      expect(delivery.clickTracking[0]).toMatchObject(clickData);
    });

    it('should setCost correctly', async () => {
      await delivery.setCost(0.05, 'USD');
      expect(delivery.cost.amount).toBe(0.05);
      expect(delivery.cost.currency).toBe('USD');
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test delivery records
      for (let i = 0; i < 10; i++) {
        const delivery = new NotificationDelivery({
          notificationId: notification._id,
          channel: ['email', 'sms', 'in_app'][i % 3],
          provider: ['mailgun', 'twilio', 'in_app'][i % 3],
          status: ['pending', 'sent', 'delivered', 'read', 'failed'][i % 5],
          recipient: `test${i}@example.com`,
        });
        await delivery.save();
      }
    });

    it('should findByNotification', async () => {
      const deliveries = await NotificationDelivery.findByNotification(
        notification._id
      );
      expect(Array.isArray(deliveries)).toBe(true);
      expect(deliveries.length).toBe(10);

      deliveries.forEach((delivery) => {
        expect(delivery.notificationId.toString()).toBe(
          notification._id.toString()
        );
      });
    });

    it('should findByChannel', async () => {
      const emailDeliveries = await NotificationDelivery.findByChannel(
        'email',
        {
          limit: 5,
        }
      );
      expect(Array.isArray(emailDeliveries)).toBe(true);
      expect(emailDeliveries.length).toBeLessThanOrEqual(5);

      emailDeliveries.forEach((delivery) => {
        expect(delivery.channel).toBe('email');
      });
    });

    it('should findByProvider', async () => {
      const mailgunDeliveries = await NotificationDelivery.findByProvider(
        'mailgun',
        {
          limit: 5,
        }
      );
      expect(Array.isArray(mailgunDeliveries)).toBe(true);
      expect(mailgunDeliveries.length).toBeLessThanOrEqual(5);

      mailgunDeliveries.forEach((delivery) => {
        expect(delivery.provider).toBe('mailgun');
      });
    });

    it('should getDeliveryStats', async () => {
      const stats = await NotificationDelivery.getDeliveryStats();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats[0]).toHaveProperty('totalDeliveries');
      expect(stats[0]).toHaveProperty('successfulDeliveries');
      expect(stats[0]).toHaveProperty('failedDeliveries');
      expect(stats[0]).toHaveProperty('pendingDeliveries');
      expect(stats[0]).toHaveProperty('readDeliveries');
      expect(stats[0]).toHaveProperty('totalClicks');
      expect(stats[0]).toHaveProperty('successRate');
      expect(stats[0]).toHaveProperty('failureRate');
      expect(stats[0]).toHaveProperty('readRate');
    });

    it('should getEngagementMetrics', async () => {
      const metrics = await NotificationDelivery.getEngagementMetrics();
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics[0]).toHaveProperty('totalDelivered');
      expect(metrics[0]).toHaveProperty('totalOpened');
      expect(metrics[0]).toHaveProperty('totalClicks');
      expect(metrics[0]).toHaveProperty('openRate');
      expect(metrics[0]).toHaveProperty('clickRate');
      expect(metrics[0]).toHaveProperty('uniqueClickCount');
    });
  });
});

describe('NotificationTemplate Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid template', async () => {
      const template = new NotificationTemplate({
        name: 'Test Template',
        description: 'Test template description',
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
            defaultValue: 'default-value',
          },
        ],
        isActive: true,
        createdBy: 'test-user',
      });

      const savedTemplate = await template.save();
      expect(savedTemplate._id).toBeDefined();
      expect(savedTemplate.name).toBe('Test Template');
      expect(savedTemplate.type).toBe('email');
      expect(savedTemplate.category).toBe('general');
      expect(savedTemplate.priority).toBe('medium');
      expect(savedTemplate.isActive).toBe(true);
    });

    it('should require name', async () => {
      const template = new NotificationTemplate({
        type: 'email',
        category: 'general',
        content: 'Test content',
      });

      await expect(template.save()).rejects.toThrow();
    });

    it('should validate enum values', async () => {
      const invalidTemplate = new NotificationTemplate({
        name: 'Invalid Template',
        type: 'invalid-type',
        category: 'invalid-category',
        priority: 'invalid-priority',
        content: 'Test content',
      });

      await expect(invalidTemplate.save()).rejects.toThrow();
    });
  });

  describe('Virtuals', () => {
    let template;

    beforeEach(async () => {
      template = new NotificationTemplate({
        name: 'Test Template',
        type: 'email',
        category: 'general',
        priority: 'medium',
        content: 'Test content {{var1}} {{var2}} {{var3}}',
        variables: [
          { name: 'var1', type: 'text', required: true },
          { name: 'var2', type: 'text', required: false },
          { name: 'var3', type: 'number', required: false },
        ],
        isActive: true,
        createdBy: 'test-user',
      });
      await template.save();
    });

    it('should calculate variableNames correctly', () => {
      expect(template.variableNames).toEqual(['var1', 'var2', 'var3']);
    });

    it('should calculate requiredVariables correctly', () => {
      expect(template.requiredVariables).toHaveLength(1);
      expect(template.requiredVariables[0].name).toBe('var1');
    });

    it('should calculate optionalVariables correctly', () => {
      expect(template.optionalVariables).toHaveLength(2);
      expect(template.optionalVariables.map((v) => v.name)).toEqual([
        'var2',
        'var3',
      ]);
    });

    it('should calculate isVersioned correctly', () => {
      expect(template.isVersioned).toBe(false);

      template.parentTemplateId = new mongoose.Types.ObjectId();
      expect(template.isVersioned).toBe(true);
    });

    it('should calculate hasHtmlContent correctly', () => {
      template.htmlContent = '<p>Test content</p>';
      expect(template.hasHtmlContent).toBe(true);

      template.htmlContent = '';
      expect(template.hasHtmlContent).toBe(false);

      template.htmlContent = null;
      expect(template.hasHtmlContent).toBe(false);
    });
  });

  describe('Instance Methods', () => {
    let template;

    beforeEach(async () => {
      template = new NotificationTemplate({
        name: 'Test Template',
        type: 'email',
        category: 'general',
        priority: 'medium',
        subject: 'Test Subject {{var1}} {{var2}}',
        content: 'Test content {{var1}} {{var2}} {{var3}}',
        htmlContent: '<p>Test content {{var1}} {{var2}} {{var3}}</p>',
        variables: [
          {
            name: 'var1',
            description: 'First variable',
            type: 'text',
            required: true,
          },
          {
            name: 'var2',
            description: 'Second variable',
            type: 'text',
            required: false,
            defaultValue: 'default-var2',
          },
          {
            name: 'var3',
            description: 'Third variable',
            type: 'number',
            required: false,
            defaultValue: 42,
          },
        ],
        isActive: true,
        createdBy: 'test-user',
      });
      await template.save();
    });

    it('should incrementUsage correctly', async () => {
      const initialUsage = template.usageCount;
      await template.incrementUsage();
      expect(template.usageCount).toBe(initialUsage + 1);
      expect(template.lastUsedAt).toBeDefined();
    });

    it('should duplicate correctly', async () => {
      const duplicatedTemplate = await template.duplicate(
        'Duplicated Template'
      );
      expect(duplicatedTemplate._id).toBeDefined();
      expect(duplicatedTemplate.name).toBe('Duplicated Template');
      expect(duplicatedTemplate.isActive).toBe(false);
      expect(duplicatedTemplate.isSystem).toBe(false);
      expect(duplicatedTemplate.parentTemplateId.toString()).toBe(
        template._id.toString()
      );
      expect(duplicatedTemplate.version).toBe('1.0.0');
      expect(duplicatedTemplate.tags).toContain('duplicate');
    });

    it('should createVersion correctly', async () => {
      const versionedTemplate = await template.createVersion(
        '2.0.0',
        'test-user'
      );
      expect(versionedTemplate._id).toBeDefined();
      expect(versionedTemplate.name).toBe(template.name);
      expect(versionedTemplate.version).toBe('2.0.0');
      expect(versionedTemplate.isApproved).toBe(false);
      expect(versionedTemplate.parentTemplateId.toString()).toBe(
        template._id.toString()
      );
    });

    it('should renderContent correctly', async () => {
      const variables = {
        var1: 'value1',
        var2: 'value2',
        var3: 123,
      };

      const rendered = template.renderContent(variables);
      expect(rendered.subject).toBe('Test Subject value1 value2');
      expect(rendered.content).toBe('Test content value1 value2 123');
      expect(rendered.htmlContent).toBe(
        '<p>Test content value1 value2 123</p>'
      );
    });

    it('should renderContent with default values', async () => {
      const variables = {
        var1: 'value1',
        // var2 and var3 not provided, should use defaults
      };

      const rendered = template.renderContent(variables);
      expect(rendered.subject).toBe('Test Subject value1 default-var2');
      expect(rendered.content).toBe('Test content value1 default-var2 42');
    });

    it('should validateVariables correctly', async () => {
      const validVariables = {
        var1: 'value1',
        var2: 'value2',
        var3: 123,
      };

      const validResult = template.validateVariables(validVariables);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Test with missing required variable
      const invalidVariables = {
        var2: 'value2',
        var3: 123,
        // var1 is missing and required
      };

      const invalidResult = template.validateVariables(invalidVariables);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain(
        "Required variable 'var1' is missing"
      );
    });

    it('should approve correctly', async () => {
      await template.approve('admin-user');
      expect(template.isApproved).toBe(true);
      expect(template.approvedBy).toBe('admin-user');
      expect(template.approvedAt).toBeDefined();
    });

    it('should deactivate correctly', async () => {
      await template.deactivate();
      expect(template.isActive).toBe(false);
    });

    it('should activate correctly', async () => {
      template.isActive = false;
      await template.activate();
      expect(template.isActive).toBe(true);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test templates
      for (let i = 0; i < 10; i++) {
        const template = new NotificationTemplate({
          name: `Test Template ${i}`,
          type: ['email', 'sms', 'in_app'][i % 3],
          category: ['general', 'alert', 'reminder'][i % 3],
          priority: ['low', 'medium', 'high'][i % 3],
          content: `Test content ${i}`,
          isActive: i % 3 !== 0, // Every 3rd template is inactive
          isApproved: i % 4 !== 0, // Every 4th template is not approved
          createdBy: 'test-user',
        });
        await template.save();
      }
    });

    it('should findActive correctly', async () => {
      const activeTemplates = await NotificationTemplate.findActive();
      expect(Array.isArray(activeTemplates)).toBe(true);

      activeTemplates.forEach((template) => {
        expect(template.isActive).toBe(true);
        expect(template.isApproved).toBe(true);
      });
    });

    it('should findByCategory correctly', async () => {
      const generalTemplates =
        await NotificationTemplate.findByCategory('general');
      expect(Array.isArray(generalTemplates)).toBe(true);

      generalTemplates.forEach((template) => {
        expect(template.category).toBe('general');
      });
    });

    it('should getPopular correctly', async () => {
      // Update usage counts
      const templates = await NotificationTemplate.find({});
      for (let i = 0; i < Math.min(5, templates.length); i++) {
        templates[i].usageCount = (5 - i) * 10;
        templates[i].lastUsedAt = new Date(
          Date.now() - i * 24 * 60 * 60 * 1000
        );
        await templates[i].save();
      }

      const popularTemplates = await NotificationTemplate.getPopular(5);
      expect(Array.isArray(popularTemplates)).toBe(true);
      expect(popularTemplates.length).toBeLessThanOrEqual(5);

      // Should be sorted by usage count and last used date
      for (let i = 0; i < popularTemplates.length - 1; i++) {
        expect(popularTemplates[i].usageCount).toBeGreaterThanOrEqual(
          popularTemplates[i + 1].usageCount
        );
      }
    });

    it('should getSystemTemplates correctly', async () => {
      // Create a system template
      const systemTemplate = new NotificationTemplate({
        name: 'System Template',
        type: 'email',
        category: 'general',
        content: 'System content',
        isActive: true,
        isSystem: true,
        createdBy: 'system',
      });
      await systemTemplate.save();

      const systemTemplates = await NotificationTemplate.getSystemTemplates();
      expect(Array.isArray(systemTemplates)).toBe(true);

      systemTemplates.forEach((template) => {
        expect(template.isSystem).toBe(true);
        expect(template.isActive).toBe(true);
        expect(template.isApproved).toBe(true);
      });
    });

    it('should search correctly', async () => {
      const searchResults = await NotificationTemplate.search('Template', {
        type: 'email',
        category: 'general',
        limit: 5,
      });
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeLessThanOrEqual(5);

      searchResults.forEach((template) => {
        expect(template.type).toBe('email');
        expect(template.category).toBe('general');
        expect(
          template.name.includes('Template') ||
            template.description.includes('Template') ||
            template.subject.includes('Template') ||
            template.content.includes('Template')
        ).toBe(true);
      });
    });
  });
});

describe('UserNotificationPreferences Model', () => {
  describe('Schema Validation', () => {
    it('should create valid preferences', async () => {
      const preferences = new UserNotificationPreferences({
        userId: testUser._id,
        globalEnabled: true,
        channels: {
          email: {
            enabled: true,
            address: testUser.email,
            verified: true,
          },
          sms: {
            enabled: true,
            phoneNumber: testUser.phone,
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
                token: 'device-token',
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
        },
        frequencyLimits: {
          maxPerHour: 10,
          maxPerDay: 50,
          maxPerWeek: 200,
        },
      });

      const savedPreferences = await preferences.save();
      expect(savedPreferences._id).toBeDefined();
      expect(savedPreferences.userId.toString()).toBe(testUser._id.toString());
      expect(savedPreferences.globalEnabled).toBe(true);
      expect(savedPreferences.channels.email.enabled).toBe(true);
      expect(savedPreferences.categories.welcome.enabled).toBe(true);
      expect(savedPreferences.categories.marketing.enabled).toBe(false);
    });

    it('should require userId', async () => {
      const preferences = new UserNotificationPreferences({
        globalEnabled: true,
        channels: {
          email: { enabled: true },
        },
      });

      await expect(preferences.save()).rejects.toThrow();
    });

    it('should validate time format for quiet hours', async () => {
      const preferences = new UserNotificationPreferences({
        userId: testUser._id,
        globalEnabled: true,
        quietHours: {
          enabled: true,
          startTime: '25:00', // Invalid time
          endTime: '08:00',
        },
      });

      await expect(preferences.save()).rejects.toThrow();
    });
  });

  describe('Virtuals', () => {
    let preferences;

    beforeEach(async () => {
      preferences = new UserNotificationPreferences({
        userId: testUser._id,
        globalEnabled: true,
        channels: {
          email: {
            enabled: true,
            address: testUser.email,
            verified: true,
          },
          sms: {
            enabled: true,
            phoneNumber: testUser.phone,
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
                token: 'device-token',
                platform: 'ios',
                active: true,
                lastUsed: new Date(),
              },
              {
                token: 'inactive-token',
                platform: 'android',
                active: false,
                lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            ],
          },
        },
        categories: {
          welcome: {
            enabled: true,
            channels: ['email', 'in_app'],
          },
        },
      });
      await preferences.save();
    });

    it('should calculate verifiedChannels correctly', () => {
      const verifiedChannels = preferences.verifiedChannels;
      expect(verifiedChannels).toContain('email');
      expect(verifiedChannels).toContain('sms');
      expect(verifiedChannels).toContain('in_app');
      expect(verifiedChannels).toContain('push_notification');
    });

    it('should calculate activeDeviceTokens correctly', () => {
      const activeTokens = preferences.activeDeviceTokens;
      expect(activeTokens).toHaveLength(1);
      expect(activeTokens[0].token).toBe('device-token');
      expect(activeTokens[0].active).toBe(true);
    });
  });

  describe('Instance Methods', () => {
    let preferences;

    beforeEach(async () => {
      preferences = new UserNotificationPreferences({
        userId: testUser._id,
        globalEnabled: true,
        channels: {
          email: {
            enabled: true,
            address: testUser.email,
            verified: true,
          },
          sms: {
            enabled: true,
            phoneNumber: testUser.phone,
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
                token: 'device-token',
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
        },
      });
      await preferences.save();
    });

    it('should check isChannelEnabled correctly', () => {
      expect(preferences.isChannelEnabled('email')).toBe(true);
      expect(preferences.isChannelEnabled('sms')).toBe(true);
      expect(preferences.isChannelEnabled('in_app')).toBe(true);
      expect(preferences.isChannelEnabled('push_notification')).toBe(true);
    });

    it('should check isCategoryEnabled correctly', () => {
      expect(preferences.isCategoryEnabled('welcome')).toBe(true);
      expect(preferences.isCategoryEnabled('marketing')).toBe(false);
    });

    it('should getEnabledChannelsForCategory correctly', () => {
      const welcomeChannels =
        preferences.getEnabledChannelsForCategory('welcome');
      expect(welcomeChannels).toEqual(['email', 'in_app']);

      const marketingChannels =
        preferences.getEnabledChannelsForCategory('marketing');
      expect(marketingChannels).toEqual([]);
    });

    it('should addDeviceToken correctly', async () => {
      const initialTokenCount =
        preferences.channels.pushNotification.deviceTokens.length;
      await preferences.addDeviceToken('new-token', 'android');
      expect(preferences.channels.pushNotification.deviceTokens.length).toBe(
        initialTokenCount + 1
      );

      const newToken = preferences.channels.pushNotification.deviceTokens.find(
        (t) => t.token === 'new-token'
      );
      expect(newToken.platform).toBe('android');
      expect(newToken.active).toBe(true);
    });

    it('should removeDeviceToken correctly', async () => {
      await preferences.addDeviceToken('temp-token', 'android');
      const initialTokenCount =
        preferences.channels.pushNotification.deviceTokens.length;

      await preferences.removeDeviceToken('temp-token');
      expect(preferences.channels.pushNotification.deviceTokens.length).toBe(
        initialTokenCount - 1
      );

      const removedToken =
        preferences.channels.pushNotification.deviceTokens.find(
          (t) => t.token === 'temp-token'
        );
      expect(removedToken).toBeUndefined();
    });

    it('should deactivateDeviceToken correctly', async () => {
      await preferences.addDeviceToken('temp-token', 'android');

      await preferences.deactivateDeviceToken('temp-token');
      const deactivatedToken =
        preferences.channels.pushNotification.deviceTokens.find(
          (t) => t.token === 'temp-token'
        );
      expect(deactivatedToken.active).toBe(false);
    });

    it('should updateEmail correctly', async () => {
      await preferences.updateEmail('new-email@example.com', true);
      expect(preferences.channels.email.address).toBe('new-email@example.com');
      expect(preferences.channels.email.verified).toBe(true);
    });

    it('should updatePhone correctly', async () => {
      await preferences.updatePhone('+0987654321', true);
      expect(preferences.channels.sms.phoneNumber).toBe('+0987654321');
      expect(preferences.channels.sms.verified).toBe(true);
    });

    it('should updateQuietHours correctly', async () => {
      await preferences.updateQuietHours(true, '22:00', '06:00', 'EST');
      expect(preferences.quietHours.enabled).toBe(true);
      expect(preferences.quietHours.startTime).toBe('22:00');
      expect(preferences.quietHours.endTime).toBe('06:00');
      expect(preferences.quietHours.timezone).toBe('EST');
    });

    it('should updateCategoryPreferences correctly', async () => {
      await preferences.updateCategoryPreferences('marketing', true, [
        'email',
        'sms',
      ]);
      expect(preferences.categories.marketing.enabled).toBe(true);
      expect(preferences.categories.marketing.channels).toEqual([
        'email',
        'sms',
      ]);
    });

    it('should updateFrequencyLimits correctly', async () => {
      await preferences.updateFrequencyLimits(20, 100, 500);
      expect(preferences.frequencyLimits.maxPerHour).toBe(20);
      expect(preferences.frequencyLimits.maxPerDay).toBe(100);
      expect(preferences.frequencyLimits.maxPerWeek).toBe(500);
    });
  });

  describe('Static Methods', () => {
    it('should findByUserId correctly', async () => {
      const preferences = new UserNotificationPreferences({
        userId: testUser._id,
        globalEnabled: true,
        channels: {
          email: { enabled: true },
        },
      });
      await preferences.save();

      const foundPreferences = await UserNotificationPreferences.findByUserId(
        testUser._id
      );
      expect(foundPreferences._id.toString()).toBe(preferences._id.toString());
    });

    it('should createDefault correctly', async () => {
      const newUser = new User({
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        phone: '+1234567899',
        userType: 'standard',
      });
      await newUser.save();

      const defaultPreferences =
        await UserNotificationPreferences.createDefault(newUser._id, {
          email: newUser.email,
          phone: newUser.phone,
        });

      expect(defaultPreferences.userId.toString()).toBe(newUser._id.toString());
      expect(defaultPreferences.globalEnabled).toBe(true);
      expect(defaultPreferences.channels.email.enabled).toBe(true);
      expect(defaultPreferences.channels.email.address).toBe(newUser.email);
      expect(defaultPreferences.channels.sms.enabled).toBe(true);
      expect(defaultPreferences.channels.sms.phoneNumber).toBe(newUser.phone);
    });

    it('should findUsersWithChannelEnabled correctly', async () => {
      // Create users with different channel preferences
      const users = await User.create([
        {
          name: 'User 1',
          email: 'user1@example.com',
          password: 'password123',
          phone: '+1234567891',
          userType: 'standard',
        },
        {
          name: 'User 2',
          email: 'user2@example.com',
          password: 'password123',
          phone: '+1234567892',
          userType: 'standard',
        },
      ]);

      // Create preferences for users
      await UserNotificationPreferences.createMany([
        {
          userId: users[0]._id,
          globalEnabled: true,
          channels: {
            email: { enabled: true, address: users[0].email, verified: true },
            sms: { enabled: true, phoneNumber: users[0].phone, verified: true },
          },
        },
        {
          userId: users[1]._id,
          globalEnabled: true,
          channels: {
            email: { enabled: false, address: users[1].email, verified: true },
            sms: { enabled: true, phoneNumber: users[1].phone, verified: true },
          },
        },
      ]);

      const emailUsers =
        await UserNotificationPreferences.findUsersWithChannelEnabled('email');
      expect(emailUsers.length).toBe(1);
      expect(emailUsers[0].userId.toString()).toBe(users[0]._id.toString());

      const smsUsers =
        await UserNotificationPreferences.findUsersWithChannelEnabled('sms');
      expect(smsUsers.length).toBe(2);
    });

    it('should findUsersForCategory correctly', async () => {
      // Create users with different category preferences
      const users = await User.create([
        {
          name: 'User 3',
          email: 'user3@example.com',
          password: 'password123',
          phone: '+1234567893',
          userType: 'standard',
        },
        {
          name: 'User 4',
          email: 'user4@example.com',
          password: 'password123',
          phone: '+1234567894',
          userType: 'standard',
        },
      ]);

      // Create preferences for users
      await UserNotificationPreferences.createMany([
        {
          userId: users[0]._id,
          globalEnabled: true,
          categories: {
            welcome: { enabled: true, channels: ['email'] },
            marketing: { enabled: false, channels: ['email'] },
          },
        },
        {
          userId: users[1]._id,
          globalEnabled: true,
          categories: {
            welcome: { enabled: false, channels: ['email'] },
            marketing: { enabled: true, channels: ['email'] },
          },
        },
      ]);

      const welcomeUsers =
        await UserNotificationPreferences.findUsersForCategory('welcome');
      expect(welcomeUsers.length).toBe(1);
      expect(welcomeUsers[0].userId.toString()).toBe(users[0]._id.toString());

      const marketingUsers =
        await UserNotificationPreferences.findUsersForCategory('marketing');
      expect(marketingUsers.length).toBe(1);
      expect(marketingUsers[0].userId.toString()).toBe(users[1]._id.toString());
    });
  });
});
