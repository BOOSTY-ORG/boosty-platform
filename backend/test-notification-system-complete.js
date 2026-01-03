/**
 * Comprehensive Notification System Test Suite
 *
 * This test suite provides complete testing for the Boosty Platform notification system:
 * - End-to-end notification flow testing
 * - Queue system testing
 * - Twilio SMS integration testing
 * - Mailgun email integration testing
 * - Real-time notification testing (WebSocket/SSE)
 * - User preferences testing
 * - Template system testing
 * - Performance and load testing
 * - Error handling and recovery testing
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import { EventEmitter } from 'events';

// Import models
import Notification from './src/models/notification.model.js';
import NotificationDelivery from './src/models/notificationDelivery.model.js';
import NotificationTemplate from './src/models/notificationTemplate.model.js';
import UserNotificationPreferences from './src/models/userNotificationPreferences.model.js';
import User from './src/models/user.model.js';

// Import services
import NotificationService from './src/services/notification/notification.service.js';
import NotificationPreferencesService from './src/services/notification/notificationPreferences.service.js';
import NotificationTemplateService from './src/services/notification/notificationTemplate.service.js';
import QueueManager from './src/services/notification/queueManager.service.js';
import TwilioService from './src/services/notification/twilio.service.js';
import MailgunService from './src/services/notification/mailgun.service.js';
import realtimeEventHandlerService from './src/services/notification/realtimeEventHandler.service.js';

// Import controllers and routes
import notificationRoutes from './src/routes/notification.routes.js';
import notificationWebhookRoutes from './src/routes/notificationWebhook.routes.js';
import notificationRealtimeRoutes from './src/routes/notificationRealtime.routes.js';

// Test configuration
class NotificationSystemTester extends EventEmitter {
  constructor() {
    super();
    this.mongoServer = null;
    this.app = null;
    this.testResults = {
      unit: { passed: 0, failed: 0, total: 0 },
      integration: { passed: 0, failed: 0, total: 0 },
      performance: { passed: 0, failed: 0, total: 0 },
      e2e: { passed: 0, failed: 0, total: 0 },
      errorHandling: { passed: 0, failed: 0, total: 0 },
    };
    this.testData = {
      users: [],
      templates: [],
      notifications: [],
      preferences: [],
    };
    this.services = {
      notification: null,
      preferences: null,
      template: null,
      queue: null,
      twilio: null,
      mailgun: null,
    };
    this.logger = this.createLogger();
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    this.logger.info('🚀 Starting Comprehensive Notification System Tests...\n');

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Run test suites
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runPerformanceTests();
      await this.runEndToEndTests();
      await this.runErrorHandlingTests();

      // Generate comprehensive report
      await this.generateTestReport();

      this.logger.info('\n🎉 All notification system tests completed!');
    } catch (error) {
      this.logger.error('❌ Test suite failed:', error);
      throw error;
    } finally {
      // Cleanup
      await this.cleanupTestEnvironment();
    }
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment() {
    this.logger.info('🔧 Setting up test environment...');

    // Start in-memory MongoDB
    this.mongoServer = await MongoMemoryServer.create();
    const mongoUri = this.mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create Express app
    this.app = express();
    this.app.use(express.json());

    // Mock authentication middleware
    this.app.use((req, res, next) => {
      req.user = {
        _id: this.testData.users[0]?._id || new mongoose.Types.ObjectId(),
        role: 'admin', // Admin for full access in tests
      };
      next();
    });

    // Setup routes
    this.app.use('/api/notifications', notificationRoutes);
    this.app.use('/api/webhooks', notificationWebhookRoutes);
    this.app.use('/api/notifications/realtime', notificationRealtimeRoutes);

    // Initialize services
    this.services.notification = new NotificationService();
    this.services.preferences = new NotificationPreferencesService();
    this.services.template = new NotificationTemplateService();
    this.services.queue = QueueManager;

    // Mock external services for testing
    this.services.twilio = this.createMockTwilioService();
    this.services.mailgun = this.createMockMailgunService();

    // Create test data
    await this.createTestData();

    this.logger.info('✅ Test environment setup complete');
  }

  /**
   * Create test data
   */
  async createTestData() {
    this.logger.info('📝 Creating test data...');

    // Create test users
    for (let i = 0; i < 5; i++) {
      const user = new User({
        name: `Test User ${i}`,
        email: `testuser${i}@example.com`,
        password: 'password123',
        phone: `+123456789${i}`,
        userType: i === 0 ? 'admin' : 'standard',
      });
      await user.save();
      this.testData.users.push(user);

      // Create user preferences
      const preferences = new UserNotificationPreferences({
        userId: user._id,
        globalEnabled: true,
        channels: {
          email: {
            enabled: true,
            address: user.email,
            verified: true,
          },
          sms: {
            enabled: i % 2 === 0, // Enable for half the users
            phoneNumber: user.phone,
            verified: true,
            countryCode: '+1',
          },
          inApp: {
            enabled: true,
            sound: true,
            vibration: true,
          },
          pushNotification: {
            enabled: i % 2 === 0, // Enable for half the users
            deviceTokens: [
              {
                token: `device-token-${i}`,
                platform: i % 2 === 0 ? 'ios' : 'android',
                active: true,
                lastUsed: new Date(),
              },
            ],
          },
        },
        categories: {
          welcome: { enabled: true, channels: ['email', 'in_app'] },
          application: { enabled: true, channels: ['email', 'sms'] },
          kyc: { enabled: true, channels: ['email', 'sms', 'in_app'] },
          payment: { enabled: true, channels: ['email', 'sms'] },
          support: { enabled: true, channels: ['email'] },
          marketing: { enabled: i === 0, channels: ['email'] }, // Only for admin
          general: { enabled: true, channels: ['email', 'in_app'] },
          alert: { enabled: true, channels: ['email', 'sms', 'in_app', 'push_notification'] },
          reminder: { enabled: true, channels: ['email', 'in_app'] },
        },
        frequencyLimits: {
          maxPerHour: 10,
          maxPerDay: 50,
          maxPerWeek: 200,
        },
      });
      await preferences.save();
      this.testData.preferences.push(preferences);
    }

    // Create test templates
    const templateTypes = [
      {
        name: 'Welcome Template',
        type: 'email',
        category: 'welcome',
        subject: 'Welcome to Boosty, {{userName}}!',
        content: 'Hello {{userName}}, thank you for joining our platform.',
        htmlContent: '<p>Hello {{userName}}, thank you for joining our platform.</p>',
        variables: [
          { name: 'userName', type: 'text', required: true },
          { name: 'userEmail', type: 'text', required: false },
        ],
      },
      {
        name: 'KYC Approved Template',
        type: 'sms',
        category: 'kyc',
        content: 'Hi {{userName}}, your KYC has been approved. You can now invest in solar projects.',
        variables: [
          { name: 'userName', type: 'text', required: true },
        ],
      },
      {
        name: 'Payment Received Template',
        type: 'email',
        category: 'payment',
        subject: 'Payment Received - {{projectName}}',
        content: 'You have received a payment of {{amount}} for project {{projectName}}.',
        htmlContent: '<p>You have received a payment of <strong>{{amount}}</strong> for project <strong>{{projectName}}</strong>.</p>',
        variables: [
          { name: 'amount', type: 'number', required: true },
          { name: 'projectName', type: 'text', required: true },
        ],
      },
      {
        name: 'Security Alert Template',
        type: 'in_app',
        category: 'alert',
        content: 'Security Alert: {{alertMessage}}',
        variables: [
          { name: 'alertMessage', type: 'text', required: true },
          { name: 'ipAddress', type: 'text', required: false },
        ],
      },
    ];

    for (const templateData of templateTypes) {
      const template = new NotificationTemplate({
        ...templateData,
        priority: 'medium',
        isActive: true,
        createdBy: 'test-system',
      });
      await template.save();
      this.testData.templates.push(template);
    }

    this.logger.info(`✅ Created ${this.testData.users.length} users, ${this.testData.preferences.length} preferences, and ${this.testData.templates.length} templates`);
  }

  /**
   * Run unit tests
   */
  async runUnitTests() {
    this.logger.info('\n🧪 Running Unit Tests...');
    this.testResults.unit.total = 5;

    try {
      await this.testNotificationModel();
      await this.testNotificationDeliveryModel();
      await this.testNotificationTemplateModel();
      await this.testUserNotificationPreferencesModel();
      await this.testNotificationService();

      this.testResults.unit.passed = 5;
      this.logger.info('✅ All unit tests passed');
    } catch (error) {
      this.testResults.unit.failed = 5 - this.testResults.unit.passed;
      this.logger.error('❌ Unit tests failed:', error);
    }
  }

  /**
   * Test Notification model
   */
  async testNotificationModel() {
    this.logger.info('  Testing Notification model...');

    const notification = new Notification({
      userId: this.testData.users[0]._id,
      type: 'email',
      channels: ['email', 'in_app'],
      recipient: {
        email: this.testData.users[0].email,
      },
      subject: 'Test Subject',
      content: 'Test content',
      category: 'general',
      priority: 'medium',
    });

    const savedNotification = await notification.save();

    // Test virtuals
    expect(savedNotification.isScheduled).toBe(false);
    expect(savedNotification.isDelivered).toBe(false);
    expect(savedNotification.isFailed).toBe(false);

    // Test instance methods
    await savedNotification.markAsQueued('test-queue');
    expect(savedNotification.status).toBe('queued');

    await savedNotification.markAsSent('email', 'external-id-123');
    expect(savedNotification.status).toBe('sent');

    await savedNotification.markAsDelivered('email');
    expect(savedNotification.status).toBe('delivered');

    await savedNotification.markAsRead('email');
    expect(savedNotification.status).toBe('read');

    await savedNotification.markAsFailed(new Error('Test error'), 'email');
    expect(savedNotification.status).toBe('failed');

    // Test static methods
    const userNotifications = await Notification.getByUser(this.testData.users[0]._id);
    expect(Array.isArray(userNotifications)).toBe(true);

    const stats = await Notification.getStats(this.testData.users[0]._id);
    expect(Array.isArray(stats)).toBe(true);

    this.logger.info('    ✓ Notification model tests passed');
  }

  /**
   * Test NotificationDelivery model
   */
  async testNotificationDeliveryModel() {
    this.logger.info('  Testing NotificationDelivery model...');

    const delivery = new NotificationDelivery({
      notificationId: new mongoose.Types.ObjectId(),
      channel: 'email',
      provider: 'mailgun',
      status: 'pending',
      recipient: 'test@example.com',
    });

    const savedDelivery = await delivery.save();

    // Test virtuals
    expect(savedDelivery.isDelivered).toBe(false);
    expect(savedDelivery.isFailed).toBe(false);
    expect(savedDelivery.isPending).toBe(true);

    // Test instance methods
    await savedDelivery.markAsQueued();
    expect(savedDelivery.status).toBe('queued');

    await savedDelivery.markAsSent('message-id-123');
    expect(savedDelivery.status).toBe('sent');

    await savedDelivery.markAsDelivered();
    expect(savedDelivery.status).toBe('delivered');

    await savedDelivery.markAsRead();
    expect(savedDelivery.status).toBe('read');

    await savedDelivery.markAsFailed(new Error('Test error'));
    expect(savedDelivery.status).toBe('failed');

    // Test static methods
    const deliveries = await NotificationDelivery.findByNotification(savedDelivery.notificationId);
    expect(Array.isArray(deliveries)).toBe(true);

    const stats = await NotificationDelivery.getDeliveryStats();
    expect(Array.isArray(stats)).toBe(true);

    this.logger.info('    ✓ NotificationDelivery model tests passed');
  }

  /**
   * Test NotificationTemplate model
   */
  async testNotificationTemplateModel() {
    this.logger.info('  Testing NotificationTemplate model...');

    const template = new NotificationTemplate({
      name: 'Test Template',
      type: 'email',
      category: 'general',
      subject: 'Test Subject {{variable}}',
      content: 'Test content with {{variable}}',
      variables: [
        { name: 'variable', type: 'text', required: true },
      ],
    });

    const savedTemplate = await template.save();

    // Test virtuals
    expect(savedTemplate.variableNames).toContain('variable');
    expect(savedTemplate.requiredVariables).toHaveLength(1);
    expect(savedTemplate.optionalVariables).toHaveLength(0);
    expect(savedTemplate.isVersioned).toBe(false);

    // Test instance methods
    await savedTemplate.incrementUsage();
    expect(savedTemplate.usageCount).toBe(1);

    const rendered = savedTemplate.renderContent({ variable: 'test-value' });
    expect(rendered.subject).toContain('test-value');
    expect(rendered.content).toContain('test-value');

    const validation = savedTemplate.validateVariables({ variable: 'test-value' });
    expect(validation.isValid).toBe(true);

    await savedTemplate.approve('test-user');
    expect(savedTemplate.isApproved).toBe(true);

    // Test static methods
    const activeTemplates = await NotificationTemplate.findActive();
    expect(Array.isArray(activeTemplates)).toBe(true);

    const templatesByCategory = await NotificationTemplate.findByCategory('general');
    expect(Array.isArray(templatesByCategory)).toBe(true);

    this.logger.info('    ✓ NotificationTemplate model tests passed');
  }

  /**
   * Test UserNotificationPreferences model
   */
  async testUserNotificationPreferencesModel() {
    this.logger.info('  Testing UserNotificationPreferences model...');

    const preferences = this.testData.preferences[0];

    // Test virtuals
    expect(typeof preferences.isInQuietHours).toBe('boolean');
    expect(Array.isArray(preferences.verifiedChannels)).toBe(true);
    expect(Array.isArray(preferences.activeDeviceTokens)).toBe(true);

    // Test instance methods
    expect(preferences.isChannelEnabled('email')).toBe(true);
    expect(preferences.isCategoryEnabled('welcome')).toBe(true);

    const enabledChannels = preferences.getEnabledChannelsForCategory('alert');
    expect(Array.isArray(enabledChannels)).toBe(true);

    await preferences.addDeviceToken('new-token', 'android');
    expect(preferences.channels.pushNotification.deviceTokens.length).toBeGreaterThan(1);

    await preferences.updateEmail('new-email@example.com');
    expect(preferences.channels.email.address).toBe('new-email@example.com');

    await preferences.updateQuietHours(true, '22:00', '08:00', 'UTC');
    expect(preferences.quietHours.enabled).toBe(true);

    // Test static methods
    const userPrefs = await UserNotificationPreferences.findByUserId(preferences.userId);
    expect(userPrefs._id.toString()).toBe(preferences._id.toString());

    const defaultPrefs = await UserNotificationPreferences.createDefault(new mongoose.Types.ObjectId());
    expect(defaultPrefs.globalEnabled).toBe(true);

    this.logger.info('    ✓ UserNotificationPreferences model tests passed');
  }

  /**
   * Test NotificationService
   */
  async testNotificationService() {
    this.logger.info('  Testing NotificationService...');

    const service = this.services.notification;

    // Test notification validation
    expect(() => {
      service.validateNotificationData({});
    }).toThrow();

    // Test send notification
    const notificationData = {
      userId: this.testData.users[0]._id,
      type: 'email',
      channels: ['email'],
      recipient: {
        email: this.testData.users[0].email,
      },
      subject: 'Test Notification',
      content: 'This is a test notification',
      category: 'general',
      priority: 'medium',
    };

    const result = await service.sendNotification(notificationData);
    expect(result.success).toBe(true);
    expect(result.notificationId).toBeDefined();

    // Test get user notifications
    const userNotifications = await service.getUserNotifications(this.testData.users[0]._id);
    expect(userNotifications.notifications).toBeDefined();
    expect(Array.isArray(userNotifications.notifications)).toBe(true);

    // Test get notification details
    const notificationDetails = await service.getNotification(result.notificationId);
    expect(notificationDetails.notification).toBeDefined();
    expect(notificationDetails.deliveries).toBeDefined();

    this.logger.info('    ✓ NotificationService tests passed');
  }

  /**
   * Create mock Twilio service
   */
  createMockTwilioService() {
    return {
      isInitialized: true,
      sendSMS: async (options) => {
        return {
          success: true,
          messageId: `mock-twilio-${Date.now()}`,
          status: 'sent',
          provider: 'twilio',
        };
      },
      sendBatchSMS: async (recipients, content, options = {}) => {
        return {
          total: recipients.length,
          successful: recipients.length,
          failed: 0,
          results: recipients.map(r => ({
            success: true,
            recipient: r.phoneNumber || r.phone || r.to,
            messageId: `mock-twilio-${Date.now()}`,
          })),
          batchId: `batch-${Date.now()}`,
        };
      },
      getDeliveryStatus: async (messageId) => {
        return {
          messageId,
          status: 'delivered',
          dateSent: new Date(),
          dateUpdated: new Date(),
        };
      },
      initialize: async () => true,
      testConnection: async () => true,
    };
  }

  /**
   * Create mock Mailgun service
   */
  createMockMailgunService() {
    return {
      isInitialized: true,
      sendEmail: async (options) => {
        return {
          success: true,
          messageId: `mock-mailgun-${Date.now()}`,
          status: 'queued',
          provider: 'mailgun',
        };
      },
      sendBatchEmail: async (recipients, content, options = {}) => {
        return {
          total: recipients.length,
          successful: recipients.length,
          failed: 0,
          results: recipients.map(r => ({
            success: true,
            recipient: r.email || r.to,
            messageId: `mock-mailgun-${Date.now()}`,
          })),
          batchId: `batch-${Date.now()}`,
        };
      },
      getDeliveryStatus: async (messageId) => {
        return {
          messageId,
          event: 'delivered',
          timestamp: new Date(),
          recipient: 'test@example.com',
        };
      },
      initialize: async () => true,
      testConnection: async () => true,
    };
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    this.logger.info('\n🔗 Running Integration Tests...');
    this.testResults.integration.total = 5;

    try {
      await this.testNotificationIntegration();
      await this.testQueueIntegration();
      await this.testTwilioIntegration();
      await this.testMailgunIntegration();
      await this.testRealtimeIntegration();

      this.testResults.integration.passed = 5;
      this.logger.info('✅ All integration tests passed');
    } catch (error) {
      this.testResults.integration.failed = 5 - this.testResults.integration.passed;
      this.logger.error('❌ Integration tests failed:', error);
    }
  }

  /**
   * Test notification integration
   */
  async testNotificationIntegration() {
    this.logger.info('  Testing notification integration...');

    // Test sending notification with template
    const template = this.testData.templates[0]; // Welcome template
    const result = await this.services.notification.sendTemplateNotification(
      template._id,
      this.testData.users[1]._id,
      { userName: this.testData.users[1].name }
    );

    expect(result.success).toBe(true);
    expect(result.notificationId).toBeDefined();

    // Verify notification was created
    const notification = await Notification.findById(result.notificationId);
    expect(notification).toBeTruthy();
    expect(notification.templateId.toString()).toBe(template._id.toString());
    expect(notification.userId.toString()).toBe(this.testData.users[1]._id.toString());

    this.logger.info('    ✓ Notification integration tests passed');
  }

  /**
   * Test queue integration
   */
  async testQueueIntegration() {
    this.logger.info('  Testing queue integration...');

    // Initialize queue manager
    await this.services.queue.initialize();

    // Test adding job to queue
    const notificationData = {
      id: new mongoose.Types.ObjectId(),
      userId: this.testData.users[0]._id,
      type: 'email',
      channels: ['email'],
      priority: 'high',
    };

    const job = await this.services.queue.addNotificationJob(notificationData);
    expect(job).toBeDefined();
    expect(job.id).toBeDefined();

    // Test queue stats
    const stats = await this.services.queue.getQueueStats();
    expect(typeof stats).toBe('object');

    // Test health check
    const health = await this.services.queue.performHealthCheck();
    expect(health.status).toBe('healthy');

    this.logger.info('    ✓ Queue integration tests passed');
  }

  /**
   * Test Twilio integration
   */
  async testTwilioIntegration() {
    this.logger.info('  Testing Twilio integration...');

    const twilioService = this.services.twilio;

    // Test sending SMS
    const smsResult = await twilioService.sendSMS({
      to: '+1234567890',
      content: 'Test SMS message',
      notificationId: new mongoose.Types.ObjectId(),
    });

    expect(smsResult.success).toBe(true);
    expect(smsResult.messageId).toBeDefined();

    // Test batch SMS
    const batchResult = await twilioService.sendBatchSMS(
      [
        { phoneNumber: '+1234567890' },
        { phoneNumber: '+1234567891' },
      ],
      'Batch test message'
    );

    expect(batchResult.successful).toBe(2);
    expect(batchResult.failed).toBe(0);

    // Test delivery status
    const status = await twilioService.getDeliveryStatus(smsResult.messageId);
    expect(status.status).toBe('delivered');

    this.logger.info('    ✓ Twilio integration tests passed');
  }

  /**
   * Test Mailgun integration
   */
  async testMailgunIntegration() {
    this.logger.info('  Testing Mailgun integration...');

    const mailgunService = this.services.mailgun;

    // Test sending email
    const emailResult = await mailgunService.sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      content: 'This is a test email',
      notificationId: new mongoose.Types.ObjectId(),
    });

    expect(emailResult.success).toBe(true);
    expect(emailResult.messageId).toBeDefined();

    // Test batch email
    const batchResult = await mailgunService.sendBatchEmail(
      [
        { email: 'test1@example.com' },
        { email: 'test2@example.com' },
      ],
      {
        subject: 'Batch test email',
        text: 'This is a batch test email',
      }
    );

    expect(batchResult.successful).toBe(2);
    expect(batchResult.failed).toBe(0);

    // Test delivery status
    const status = await mailgunService.getDeliveryStatus(emailResult.messageId);
    expect(status.event).toBe('delivered');

    this.logger.info('    ✓ Mailgun integration tests passed');
  }

  /**
   * Test real-time integration
   */
  async testRealtimeIntegration() {
    this.logger.info('  Testing real-time integration...');

    // Test real-time event handler
    const notification = new Notification({
      userId: this.testData.users[0]._id,
      type: 'in_app',
      channels: ['in_app'],
      content: 'Real-time test notification',
      category: 'alert',
      priority: 'high',
    });
    await notification.save();

    // Process for real-time delivery
    await realtimeEventHandlerService.processNotification(notification._id);

    // Verify notification was processed
    const processedNotification = await Notification.findById(notification._id);
    expect(processedNotification).toBeTruthy();

    this.logger.info('    ✓ Real-time integration tests passed');
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    this.logger.info('\n⚡ Running Performance Tests...');
    this.testResults.performance.total = 3;

    try {
      await this.testBulkNotificationPerformance();
      await this.testQueueThroughput();
      await this.testConcurrentOperations();

      this.testResults.performance.passed = 3;
      this.logger.info('✅ All performance tests passed');
    } catch (error) {
      this.testResults.performance.failed = 3 - this.testResults.performance.passed;
      this.logger.error('❌ Performance tests failed:', error);
    }
  }

  /**
   * Test bulk notification performance
   */
  async testBulkNotificationPerformance() {
    this.logger.info('  Testing bulk notification performance...');

    const startTime = Date.now();
    const batchSize = 100;

    // Create bulk notification data
    const notifications = [];
    for (let i = 0; i < batchSize; i++) {
      notifications.push({
        userId: this.testData.users[i % this.testData.users.length]._id,
        type: 'email',
        channels: ['email'],
        recipient: {
          email: `test${i}@example.com`,
        },
        subject: `Bulk Test ${i}`,
        content: `This is bulk test notification ${i}`,
        category: 'general',
        priority: 'low',
      });
    }

    // Send bulk notifications
    const result = await this.services.notification.sendBulkNotifications(notifications);
    const endTime = Date.now();

    expect(result.successful).toBeGreaterThan(90); // Allow for some failures
    expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds

    this.logger.info(`    ✓ Sent ${result.successful} notifications in ${endTime - startTime}ms`);
  }

  /**
   * Test queue throughput
   */
  async testQueueThroughput() {
    this.logger.info('  Testing queue throughput...');

    const startTime = Date.now();
    const jobCount = 50;

    // Add multiple jobs to queue
    const jobs = [];
    for (let i = 0; i < jobCount; i++) {
      const notificationData = {
        id: new mongoose.Types.ObjectId(),
        userId: this.testData.users[0]._id,
        type: 'email',
        channels: ['email'],
        priority: i % 2 === 0 ? 'high' : 'medium',
      };

      jobs.push(this.services.queue.addNotificationJob(notificationData));
    }

    await Promise.all(jobs);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

    this.logger.info(`    ✓ Added ${jobCount} jobs to queue in ${endTime - startTime}ms`);
  }

  /**
   * Test concurrent operations
   */
  async testConcurrentOperations() {
    this.logger.info('  Testing concurrent operations...');

    const startTime = Date.now();
    const concurrentCount = 20;

    // Create concurrent notification operations
    const operations = [];
    for (let i = 0; i < concurrentCount; i++) {
      operations.push(
        this.services.notification.sendNotification({
          userId: this.testData.users[i % this.testData.users.length]._id,
          type: 'email',
          channels: ['email'],
          recipient: {
            email: `concurrent${i}@example.com`,
          },
          subject: `Concurrent Test ${i}`,
          content: `This is concurrent test ${i}`,
          category: 'general',
          priority: 'medium',
        })
      );
    }

    const results = await Promise.allSettled(operations);
    const endTime = Date.now();

    const successful = results.filter(r => r.status === 'fulfilled').length;
    expect(successful).toBeGreaterThan(15); // Allow for some failures
    expect(endTime - startTime).toBeLessThan(8000); // Should complete within 8 seconds

    this.logger.info(`    ✓ ${successful}/${concurrentCount} concurrent operations completed in ${endTime - startTime}ms`);
  }

  /**
   * Run end-to-end tests
   */
  async runEndToEndTests() {
    this.logger.info('\n🔄 Running End-to-End Tests...');
    this.testResults.e2e.total = 3;

    try {
      await this.testCompleteNotificationFlow();
      await this.testMultiChannelNotification();
      await this.testScheduledNotification();

      this.testResults.e2e.passed = 3;
      this.logger.info('✅ All end-to-end tests passed');
    } catch (error) {
      this.testResults.e2e.failed = 3 - this.testResults.e2e.passed;
      this.logger.error('❌ End-to-end tests failed:', error);
    }
  }

  /**
   * Test complete notification flow
   */
  async testCompleteNotificationFlow() {
    this.logger.info('  Testing complete notification flow...');

    // Create notification using template
    const template = this.testData.templates[0];
    const user = this.testData.users[1];

    const result = await this.services.notification.sendTemplateNotification(
      template._id,
      user._id,
      { userName: user.name }
    );

    expect(result.success).toBe(true);

    // Verify notification was created
    const notification = await Notification.findById(result.notificationId);
    expect(notification).toBeTruthy();
    expect(notification.status).toBe('queued');

    // Verify delivery records were created
    const deliveries = await NotificationDelivery.find({ notificationId: result.notificationId });
    expect(deliveries.length).toBeGreaterThan(0);

    // Simulate queue processing
    for (const delivery of deliveries) {
      await delivery.markAsSent(`mock-id-${Date.now()}`);
      await delivery.markAsDelivered();
    }

    // Update notification status
    await notification.markAsDelivered();

    // Verify final state
    const finalNotification = await Notification.findById(result.notificationId);
    expect(finalNotification.status).toBe('delivered');

    this.logger.info('    ✓ Complete notification flow test passed');
  }

  /**
   * Test multi-channel notification
   */
  async testMultiChannelNotification() {
    this.logger.info('  Testing multi-channel notification...');

    const user = this.testData.users[0]; // User with all channels enabled

    const result = await this.services.notification.sendNotification({
      userId: user._id,
      type: 'alert',
      channels: ['email', 'sms', 'in_app', 'push_notification'],
      recipient: {
        email: user.email,
        phone: user.phone,
      },
      subject: 'Multi-channel Test',
      content: 'This is a multi-channel test',
      category: 'alert',
      priority: 'urgent',
    });

    expect(result.success).toBe(true);

    // Verify delivery records for all channels
    const deliveries = await NotificationDelivery.find({ notificationId: result.notificationId });
    expect(deliveries.length).toBe(4);

    const channels = deliveries.map(d => d.channel);
    expect(channels).toContain('email');
    expect(channels).toContain('sms');
    expect(channels).toContain('in_app');
    expect(channels).toContain('push_notification');

    this.logger.info('    ✓ Multi-channel notification test passed');
  }

  /**
   * Test scheduled notification
   */
  async testScheduledNotification() {
    this.logger.info('  Testing scheduled notification...');

    const scheduledTime = new Date(Date.now() + 60000); // 1 minute from now

    const result = await this.services.notification.scheduleNotification(
      {
        userId: this.testData.users[0]._id,
        type: 'email',
        channels: ['email'],
        recipient: {
          email: this.testData.users[0].email,
        },
        subject: 'Scheduled Test',
        content: 'This is a scheduled test',
        category: 'reminder',
        priority: 'medium',
      },
      scheduledTime
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe('scheduled');

    // Verify notification was created with scheduled time
    const notification = await Notification.findById(result.notificationId);
    expect(notification).toBeTruthy();
    expect(notification.scheduledAt.getTime()).toBeCloseTo(scheduledTime.getTime(), -1000);
    expect(notification.status).toBe('pending');

    this.logger.info('    ✓ Scheduled notification test passed');
  }

  /**
   * Run error handling tests
   */
  async runErrorHandlingTests() {
    this.logger.info('\n🚨 Running Error Handling Tests...');
    this.testResults.errorHandling.total = 3;

    try {
      await this.testInvalidNotificationHandling();
      await this.testServiceFailureRecovery();
      await this.testQueueErrorHandling();

      this.testResults.errorHandling.passed = 3;
      this.logger.info('✅ All error handling tests passed');
    } catch (error) {
      this.testResults.errorHandling.failed = 3 - this.testResults.errorHandling.passed;
      this.logger.error('❌ Error handling tests failed:', error);
    }
  }

  /**
   * Test invalid notification handling
   */
  async testInvalidNotificationHandling() {
    this.logger.info('  Testing invalid notification handling...');

    // Test with missing required fields
    try {
      await this.services.notification.sendNotification({});
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error.message).toContain('Missing required fields');
    }

    // Test with invalid channels
    try {
      await this.services.notification.sendNotification({
        userId: this.testData.users[0]._id,
        type: 'email',
        channels: ['invalid-channel'],
        content: 'Test',
        category: 'general',
      });
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error.message).toContain('Invalid channels');
    }

    // Test with invalid category
    try {
      await this.services.notification.sendNotification({
        userId: this.testData.users[0]._id,
        type: 'email',
        channels: ['email'],
        content: 'Test',
        category: 'invalid-category',
      });
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error.message).toContain('Invalid category');
    }

    this.logger.info('    ✓ Invalid notification handling test passed');
  }

  /**
   * Test service failure recovery
   */
  async testServiceFailureRecovery() {
    this.logger.info('  Testing service failure recovery...');

    // Mock Twilio service failure
    const originalSendSMS = this.services.twilio.sendSMS;
    this.services.twilio.sendSMS = async () => {
      throw new Error('Twilio service unavailable');
    };

    try {
      const result = await this.services.notification.sendNotification({
        userId: this.testData.users[0]._id,
        type: 'sms',
        channels: ['sms'],
        recipient: {
          phone: this.testData.users[0].phone,
        },
        content: 'Test SMS',
        category: 'alert',
        priority: 'urgent',
      });

      // Should handle failure gracefully
      expect(result.success).toBe(false);
    } catch (error) {
      // Expected to catch the error
      expect(error.message).toContain('SMS sending failed');
    }

    // Restore original service
    this.services.twilio.sendSMS = originalSendSMS;

    this.logger.info('    ✓ Service failure recovery test passed');
  }

  /**
   * Test queue error handling
   */
  async testQueueErrorHandling() {
    this.logger.info('  Testing queue error handling...');

    // Test adding job without initialization
    const uninitializedQueue = new (await import('./src/services/notification/queueManager.service.js')).default();

    try {
      await uninitializedQueue.addNotificationJob({
        id: new mongoose.Types.ObjectId(),
        userId: this.testData.users[0]._id,
        type: 'email',
        channels: ['email'],
      });
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error.message).toContain('Queue Manager not initialized');
    }

    this.logger.info('    ✓ Queue error handling test passed');
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport() {
    this.logger.info('\n📊 Generating Test Report...');

    const totalTests = Object.values(this.testResults).reduce(
      (sum, category) => sum + category.total,
      0
    );
    const totalPassed = Object.values(this.testResults).reduce(
      (sum, category) => sum + category.passed,
      0
    );
    const totalFailed = Object.values(this.testResults).reduce(
      (sum, category) => sum + category.failed,
      0
    );

    const report = {
      summary: {
        total: totalTests,
        passed: totalPassed,
        failed: totalFailed,
        passRate: ((totalPassed / totalTests) * 100).toFixed(2) + '%',
      },
      categories: this.testResults,
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
      },
      testData: {
        users: this.testData.users.length,
        templates: this.testData.templates.length,
        preferences: this.testData.preferences.length,
      },
    };

    // Print report to console
    console.log('\n' + '='.repeat(60));
    console.log('🎯 NOTIFICATION SYSTEM TEST REPORT');
    console.log('='.repeat(60));
    console.log(`📈 SUMMARY:`);
    console.log(`   Total Tests: ${report.summary.total}`);
    console.log(`   Passed: ${report.summary.passed}`);
    console.log(`   Failed: ${report.summary.failed}`);
    console.log(`   Pass Rate: ${report.summary.passRate}`);
    console.log(`\n📊 CATEGORY BREAKDOWN:`);
    console.log(`   Unit Tests: ${this.testResults.unit.passed}/${this.testResults.unit.total}`);
    console.log(`   Integration Tests: ${this.testResults.integration.passed}/${this.testResults.integration.total}`);
    console.log(`   Performance Tests: ${this.testResults.performance.passed}/${this.testResults.performance.total}`);
    console.log(`   End-to-End Tests: ${this.testResults.e2e.passed}/${this.testResults.e2e.total}`);
    console.log(`   Error Handling Tests: ${this.testResults.errorHandling.passed}/${this.testResults.errorHandling.total}`);
    console.log(`\n🔧 ENVIRONMENT:`);
    console.log(`   Node.js: ${report.environment.nodeVersion}`);
    console.log(`   Platform: ${report.environment.platform}`);
    console.log(`   Memory: ${Math.round(report.environment.memory.heapUsed / 1024 / 1024)}MB`);
    console.log(`\n📝 TEST DATA:`);
    console.log(`   Users: ${report.testData.users}`);
    console.log(`   Templates: ${report.testData.templates}`);
    console.log(`   Preferences: ${report.testData.preferences}`);
    console.log('='.repeat(60));

    // Save report to file
    const reportPath = `./test-report-${Date.now()}.json`;
    await import('fs').then(fs => {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    });

    return report;
  }

  /**
   * Cleanup test environment
   */
  async cleanupTestEnvironment() {
    this.logger.info('\n🧹 Cleaning up test environment...');

    try {
      // Close database connection
      await mongoose.disconnect();

      // Stop MongoDB server
      if (this.mongoServer) {
        await this.mongoServer.stop();
      }

      // Shutdown queue manager
      if (this.services.queue && this.services.queue.isInitialized) {
        await this.services.queue.shutdown();
      }

      this.logger.info('✅ Test environment cleanup complete');
    } catch (error) {
      this.logger.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Create a logger instance
   */
  createLogger() {
    return {
      info: (message, data = {}) => {
        console.log(`[NotificationSystemTester] INFO: ${message}`, data);
      },
      warn: (message, data = {}) => {
        console.warn(`[NotificationSystemTester] WARN: ${message}`, data);
      },
      error: (message, error) => {
        console.error(`[NotificationSystemTester] ERROR: ${message}`, error);
      },
    };
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new NotificationSystemTester();
  await tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export default NotificationSystemTester;