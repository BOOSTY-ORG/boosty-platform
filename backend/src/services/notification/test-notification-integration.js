/**
 * Notification Services Integration Test
 *
 * This test verifies that all notification services work together:
 * - Notification Service
 * - Notification Builder Service
 * - Notification Preferences Service
 * - Notification Template Service
 */

import mongoose from 'mongoose';
import NotificationService from './notification.service.js';
import NotificationBuilder from './notificationBuilder.service.js';
import NotificationPreferencesService from './notificationPreferences.service.js';
import NotificationTemplateService from './notificationTemplate.service.js';
import User from '../../models/user.model.js';
import NotificationTemplate from '../../models/notificationTemplate.model.js';

// Test configuration
const TEST_USER_ID = '507f1f77bcf86cd799439011'; // Example ObjectId
const TEST_TEMPLATE_ID = '507f1f77bcf86cd799439012'; // Example ObjectId

class NotificationIntegrationTest {
  constructor() {
    this.notificationService = new NotificationService();
    this.preferencesService = new NotificationPreferencesService();
    this.templateService = new NotificationTemplateService();
    this.logger = this.createLogger();
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    this.logger.info('Starting notification services integration tests');

    try {
      // Connect to MongoDB
      await this.connectToDatabase();

      // Run tests
      await this.testNotificationBuilder();
      await this.testNotificationPreferences();
      await this.testNotificationTemplate();
      await this.testNotificationService();
      await this.testEndToEndFlow();

      this.logger.info('All integration tests completed successfully');
    } catch (error) {
      this.logger.error('Integration tests failed', error);
      throw error;
    } finally {
      // Disconnect from MongoDB
      await this.disconnectFromDatabase();
    }
  }

  /**
   * Test Notification Builder Service
   */
  async testNotificationBuilder() {
    this.logger.info('Testing Notification Builder Service');

    // Test basic builder functionality
    const builder = NotificationBuilder.create()
      .toUser(TEST_USER_ID)
      .ofType('email')
      .viaChannel('email')
      .inCategory('welcome')
      .withPriority('medium')
      .withSubject('Welcome to Boosty')
      .withContent('Thank you for joining Boosty Platform!')
      .withVariable('userName', 'John Doe');

    const buildResult = await builder.build();

    if (!buildResult.isValid) {
      throw new Error(
        `Builder validation failed: ${buildResult.errors.join(', ')}`
      );
    }

    this.logger.info('✓ Notification Builder test passed');
  }

  /**
   * Test Notification Preferences Service
   */
  async testNotificationPreferences() {
    this.logger.info('Testing Notification Preferences Service');

    // Test creating default preferences
    const preferences = await this.preferencesService.createDefaultPreferences(
      TEST_USER_ID,
      {
        email: 'test@example.com',
        phone: '+1234567890',
      }
    );

    if (!preferences || !preferences.userId) {
      throw new Error('Failed to create default preferences');
    }

    // Test updating preferences
    const updatedPreferences = await this.preferencesService.updatePreferences(
      TEST_USER_ID,
      {
        globalEnabled: false,
        channels: {
          email: { enabled: false },
        },
      }
    );

    if (updatedPreferences.globalEnabled !== false) {
      throw new Error('Failed to update preferences');
    }

    // Test checking enabled channels
    const enabledChannels =
      await this.preferencesService.getEnabledChannelsForCategory(
        TEST_USER_ID,
        'welcome'
      );

    if (!Array.isArray(enabledChannels)) {
      throw new Error('Failed to get enabled channels');
    }

    this.logger.info('✓ Notification Preferences test passed');
  }

  /**
   * Test Notification Template Service
   */
  async testNotificationTemplate() {
    this.logger.info('Testing Notification Template Service');

    // Create a test template
    const templateData = {
      name: 'Test Welcome Template',
      description: 'Template for testing welcome notifications',
      type: 'email',
      category: 'welcome',
      priority: 'medium',
      subject: 'Welcome to Boosty, {{userName}}!',
      content: 'Hello {{userName}}, thank you for joining our platform.',
      htmlContent:
        '<p>Hello {{userName}}, thank you for joining our platform.</p>',
      variables: [
        {
          name: 'userName',
          description: "User's full name",
          type: 'text',
          required: true,
        },
      ],
      isActive: true,
      createdBy: 'integration-test',
    };

    const template = await this.templateService.createTemplate(templateData);

    if (!template || !template._id) {
      throw new Error('Failed to create template');
    }

    // Test rendering template
    const rendered = await this.templateService.renderTemplate(template._id, {
      userName: 'Jane Doe',
    });

    if (!rendered.content || !rendered.content.includes('Jane Doe')) {
      throw new Error('Failed to render template');
    }

    // Test template validation
    const validation = this.templateService.validateTemplateData(templateData);
    if (!validation.isValid) {
      throw new Error(
        `Template validation failed: ${validation.errors.join(', ')}`
      );
    }

    // Clean up - delete test template
    await this.templateService.deleteTemplate(template._id);

    this.logger.info('✓ Notification Template test passed');
  }

  /**
   * Test Notification Service
   */
  async testNotificationService() {
    this.logger.info('Testing Notification Service');

    // Test creating a notification
    const notificationData = {
      userId: TEST_USER_ID,
      type: 'email',
      channels: ['email'],
      recipient: {
        email: 'test@example.com',
      },
      subject: 'Test Notification',
      content: 'This is a test notification from the integration test.',
      category: 'general',
      priority: 'low',
      sentBy: 'integration-test',
    };

    const result =
      await this.notificationService.sendNotification(notificationData);

    if (!result.success) {
      throw new Error('Failed to send notification');
    }

    // Test getting user notifications
    const userNotifications =
      await this.notificationService.getUserNotifications(TEST_USER_ID, {
        limit: 5,
      });

    if (
      !userNotifications.notifications ||
      !Array.isArray(userNotifications.notifications)
    ) {
      throw new Error('Failed to get user notifications');
    }

    // Test getting notification details
    if (result.notificationId) {
      const notificationDetails =
        await this.notificationService.getNotification(result.notificationId);

      if (!notificationDetails.notification) {
        throw new Error('Failed to get notification details');
      }
    }

    this.logger.info('✓ Notification Service test passed');
  }

  /**
   * Test end-to-end flow
   */
  async testEndToEndFlow() {
    this.logger.info('Testing end-to-end notification flow');

    // Create a test template
    const template = await this.templateService.createTemplate({
      name: 'E2E Test Template',
      type: 'email',
      category: 'alert',
      priority: 'high',
      subject: 'Alert: {{alertType}}',
      content: 'You have a new {{alertType}}: {{message}}',
      variables: [
        { name: 'alertType', type: 'text', required: true },
        { name: 'message', type: 'text', required: true },
      ],
      isActive: true,
      createdBy: 'e2e-test',
    });

    // Create user preferences
    await this.preferencesService.createDefaultPreferences(TEST_USER_ID, {
      email: 'e2e-test@example.com',
    });

    // Use builder to create notification
    const builder = NotificationBuilder.create()
      .toUser(TEST_USER_ID)
      .usingTemplate(template._id)
      .withVariables({
        alertType: 'Security Alert',
        message: 'Unusual login activity detected',
      })
      .withPriority('high');

    const buildResult = await builder.build();

    if (!buildResult.isValid) {
      throw new Error(
        `E2E builder validation failed: ${buildResult.errors.join(', ')}`
      );
    }

    // Send notification using the service
    const sendResult = await this.notificationService.sendNotification(
      buildResult.data
    );

    if (!sendResult.success) {
      throw new Error('E2E notification send failed');
    }

    // Verify notification was created
    const notification = await this.notificationService.getNotification(
      sendResult.notificationId
    );

    if (
      !notification.notification ||
      notification.notification.status !== 'queued'
    ) {
      throw new Error('E2E notification not properly queued');
    }

    // Clean up - delete test template
    await this.templateService.deleteTemplate(template._id);

    this.logger.info('✓ End-to-end flow test passed');
  }

  /**
   * Connect to MongoDB
   */
  async connectToDatabase() {
    try {
      const mongoUri =
        process.env.MONGODB_URI || 'mongodb://localhost:27017/boosty-test';
      await mongoose.connect(mongoUri);
      this.logger.info('Connected to MongoDB');
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnectFromDatabase() {
    try {
      await mongoose.disconnect();
      this.logger.info('Disconnected from MongoDB');
    } catch (error) {
      this.logger.error('Failed to disconnect from MongoDB', error);
    }
  }

  /**
   * Create a logger instance
   */
  createLogger() {
    return {
      info: (message, data = {}) => {
        console.log(`[NotificationIntegrationTest] INFO: ${message}`, data);
      },
      warn: (message, data = {}) => {
        console.warn(`[NotificationIntegrationTest] WARN: ${message}`, data);
      },
      error: (message, error) => {
        console.error(`[NotificationIntegrationTest] ERROR: ${message}`, error);
      },
    };
  }
}

// Run tests if this file is executed directly
if (process.argv[1] === 'run') {
  const test = new NotificationIntegrationTest();
  test.runAllTests().catch((error) => {
    console.error('Integration tests failed:', error);
    process.exit(1);
  });
}

export default NotificationIntegrationTest;
