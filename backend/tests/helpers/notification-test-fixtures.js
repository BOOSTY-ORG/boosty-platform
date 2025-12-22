/**
 * Notification System Test Fixtures
 *
 * This file provides test data generators and fixtures for notification system testing:
 * - User data generators
 * - Template data generators
 * - Notification data generators
 * - Preference data generators
 * - Mock data for external services
 */

import mongoose from 'mongoose';
import User from '../../src/models/user.model.js';
import NotificationTemplate from '../../src/models/notificationTemplate.model.js';
import UserNotificationPreferences from '../../src/models/userNotificationPreferences.model.js';

class NotificationTestFixtures {
  constructor() {
    this.userTypes = ['standard', 'investor', 'admin'];
    this.notificationTypes = ['email', 'sms', 'in_app', 'push_notification'];
    this.categories = [
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
    this.priorities = ['low', 'medium', 'high', 'urgent'];
  }

  /**
   * Generate test users
   * @param {number} count - Number of users to generate
   * @param {object} options - Options for user generation
   * @returns {array} - Array of user documents
   */
  async generateTestUsers(count = 5, options = {}) {
    const {
      userType = 'standard',
      includePhone = true,
      includeEmail = true,
      verified = true,
    } = options;

    const users = [];
    for (let i = 0; i < count; i++) {
      const user = new User({
        name: `Test User ${i}`,
        email: includeEmail ? `testuser${i}@example.com` : undefined,
        password: 'password123',
        phone: includePhone
          ? `+123456789${i.toString().padStart(2, '0')}`
          : undefined,
        userType: Array.isArray(userType)
          ? userType[i % userType.length]
          : userType,
        emailVerified: verified && includeEmail,
        phoneVerified: verified && includePhone,
        profile: {
          firstName: `Test${i}`,
          lastName: `User${i}`,
          dateOfBirth: new Date(1990, i % 12, (i % 28) + 1),
          address: {
            street: `${i} Test Street`,
            city: 'Test City',
            state: 'TS',
            zipCode: `${(i + 10000).toString()}`,
            country: 'Test Country',
          },
        },
        kyc: {
          status:
            i % 3 === 0 ? 'verified' : i % 3 === 1 ? 'pending' : 'not_started',
          submittedAt:
            i % 3 !== 0
              ? new Date(Date.now() - i * 24 * 60 * 60 * 1000)
              : undefined,
          verifiedAt:
            i % 3 === 0
              ? new Date(Date.now() - i * 24 * 60 * 60 * 1000)
              : undefined,
        },
        createdAt: new Date(Date.now() - i * 60 * 60 * 1000),
      });

      await user.save();
      users.push(user);
    }

    return users;
  }

  /**
   * Generate notification templates
   * @param {number} count - Number of templates to generate
   * @param {object} options - Options for template generation
   * @returns {array} - Array of template documents
   */
  async generateNotificationTemplates(count = 10, options = {}) {
    const {
      types = this.notificationTypes,
      categories = this.categories,
      priorities = this.priorities,
      includeVariables = true,
      isActive = true,
    } = options;

    const templates = [];
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const category = categories[i % categories.length];
      const priority = priorities[i % priorities.length];

      const templateData = {
        name: `Test Template ${i} - ${type} - ${category}`,
        description: `Test template for ${type} notifications in ${category} category`,
        type,
        category,
        priority,
        subject:
          type === 'email' ? `Test Subject ${i} - {{variable1}}` : undefined,
        content: `Test content ${i} for ${type} notifications. {{variable1}} {{variable2}}`,
        htmlContent:
          type === 'email'
            ? `<p>Test content ${i} for ${type} notifications. <strong>{{variable1}}</strong> {{variable2}}</p>`
            : undefined,
        variables: includeVariables
          ? [
              {
                name: 'variable1',
                description: 'First test variable',
                type: 'text',
                required: true,
                defaultValue: `default1-${i}`,
              },
              {
                name: 'variable2',
                description: 'Second test variable',
                type: 'text',
                required: false,
                defaultValue: `default2-${i}`,
              },
              {
                name: 'variable3',
                description: 'Number variable',
                type: 'number',
                required: false,
                defaultValue: i * 10,
              },
            ]
          : [],
        isActive,
        isSystem: i % 5 === 0, // Every 5th template is a system template
        isApproved: true,
        createdBy: 'test-fixture-generator',
        tags: [`test-${i}`, type, category, priority],
        metadata: {
          testIndex: i,
          generatedAt: new Date(),
        },
      };

      const template = new NotificationTemplate(templateData);
      await template.save();
      templates.push(template);
    }

    return templates;
  }

  /**
   * Generate user notification preferences
   * @param {array} users - Array of user documents
   * @param {object} options - Options for preference generation
   * @returns {array} - Array of preference documents
   */
  async generateUserPreferences(users, options = {}) {
    const {
      globalEnabled = true,
      enableAllChannels = true,
      enableAllCategories = true,
      includeQuietHours = false,
      includeFrequencyLimits = true,
      includeDeviceTokens = true,
    } = options;

    const preferences = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      const channels = {
        email: {
          enabled: enableAllChannels || i % 2 === 0,
          address: user.email,
          verified: user.emailVerified || false,
        },
        sms: {
          enabled: (enableAllChannels || i % 2 === 0) && user.phone,
          phoneNumber: user.phone,
          verified: user.phoneVerified || false,
          countryCode: '+1',
        },
        inApp: {
          enabled: enableAllChannels || true,
          sound: i % 2 === 0,
          vibration: i % 2 === 1,
        },
        pushNotification: {
          enabled: (enableAllChannels || i % 2 === 0) && includeDeviceTokens,
          deviceTokens: includeDeviceTokens
            ? [
                {
                  token: `device-token-${i}`,
                  platform: i % 2 === 0 ? 'ios' : 'android',
                  active: true,
                  lastUsed: new Date(Date.now() - i * 60 * 60 * 1000),
                },
              ]
            : [],
        },
      };

      const categories = {};
      for (const category of this.categories) {
        categories[category] = {
          enabled:
            enableAllCategories || (i % 3 !== 0 && category !== 'marketing'),
          channels: this.getChannelsForCategory(category, channels),
        };
      }

      const preferenceData = {
        userId: user._id,
        globalEnabled,
        channels,
        categories,
        frequencyLimits: includeFrequencyLimits
          ? {
              maxPerHour: 10 + (i % 5),
              maxPerDay: 50 + i * 10,
              maxPerWeek: 200 + i * 50,
            }
          : undefined,
        quietHours: includeQuietHours
          ? {
              enabled: i % 3 === 0,
              startTime: '22:00',
              endTime: '08:00',
              timezone: 'UTC',
            }
          : {
              enabled: false,
              startTime: '22:00',
              endTime: '08:00',
              timezone: 'UTC',
            },
        version: '2.0.0',
        lastMigratedAt: new Date(),
        inheritance: {
          enabled: true,
          inheritFromGlobal: true,
          inheritFromCategory: true,
        },
        notificationStats: {
          totalReceived: i * 5,
          totalRead: i * 3,
          lastReceivedAt: new Date(Date.now() - i * 60 * 60 * 1000),
          preferredChannel:
            this.notificationTypes[i % this.notificationTypes.length],
        },
      };

      const preference = new UserNotificationPreferences(preferenceData);
      await preference.save();
      preferences.push(preference);
    }

    return preferences;
  }

  /**
   * Get appropriate channels for a category
   * @param {string} category - Notification category
   * @param {object} channels - Available channels
   * @returns {array} - Array of channel names
   */
  getChannelsForCategory(category, channels) {
    const categoryChannels = {
      welcome: ['email', 'in_app'],
      application: ['email', 'sms', 'in_app'],
      kyc: ['email', 'sms', 'in_app'],
      payment: ['email', 'sms', 'in_app'],
      support: ['email', 'in_app'],
      marketing: ['email'],
      general: ['email', 'in_app'],
      alert: ['email', 'sms', 'in_app', 'push_notification'],
      reminder: ['email', 'sms', 'in_app'],
    };

    const availableChannels = Object.keys(channels).filter(
      (channel) => channels[channel].enabled
    );
    return categoryChannels[category] || availableChannels;
  }

  /**
   * Generate notification data
   * @param {array} users - Array of user documents
   * @param {array} templates - Array of template documents
   * @param {object} options - Options for notification generation
   * @returns {array} - Array of notification data objects
   */
  generateNotificationData(users, templates, options = {}) {
    const {
      count = 20,
      types = this.notificationTypes,
      categories = this.categories,
      priorities = this.priorities,
      useTemplates = true,
      includeVariables = true,
    } = options;

    const notifications = [];
    for (let i = 0; i < count; i++) {
      const user = users[i % users.length];
      const type = types[i % types.length];
      const category = categories[i % categories.length];
      const priority = priorities[i % priorities.length];
      const template = useTemplates ? templates[i % templates.length] : null;

      const notificationData = {
        userId: user._id,
        type,
        channels: this.getChannelsForType(type),
        recipient: {
          email: user.email,
          phone: user.phone,
          deviceId: `device-${i}`,
        },
        category,
        priority,
        sentBy: 'test-fixture-generator',
        source: 'test',
        metadata: {
          testIndex: i,
          generatedAt: new Date(),
        },
      };

      if (
        template &&
        template.type === type &&
        template.category === category
      ) {
        notificationData.templateId = template._id;
        notificationData.variables = includeVariables
          ? this.generateVariables(template.variables, i)
          : {};
      } else {
        notificationData.subject =
          type === 'email' ? `Test Subject ${i}` : undefined;
        notificationData.content = `Test content ${i} for ${type} notification`;
        notificationData.htmlContent =
          type === 'email'
            ? `<p>Test content ${i} for ${type} notification</p>`
            : undefined;
      }

      notifications.push(notificationData);
    }

    return notifications;
  }

  /**
   * Get channels for a notification type
   * @param {string} type - Notification type
   * @returns {array} - Array of channel names
   */
  getChannelsForType(type) {
    const typeChannels = {
      email: ['email'],
      sms: ['sms'],
      in_app: ['in_app'],
      push_notification: ['push_notification'],
    };

    return typeChannels[type] || ['email'];
  }

  /**
   * Generate variables for template
   * @param {array} variableDefinitions - Template variable definitions
   * @param {number} index - Index for generating unique values
   * @returns {object} - Generated variables object
   */
  generateVariables(variableDefinitions, index) {
    const variables = {};

    for (const variable of variableDefinitions) {
      switch (variable.type) {
        case 'text':
          variables[variable.name] = `${variable.name}-value-${index}`;
          break;
        case 'number':
          variables[variable.name] = (index + 1) * 10;
          break;
        case 'date':
          variables[variable.name] = new Date(
            Date.now() - index * 24 * 60 * 60 * 1000
          );
          break;
        case 'boolean':
          variables[variable.name] = index % 2 === 0;
          break;
        case 'select':
          variables[variable.name] =
            variable.options && variable.options.length > 0
              ? variable.options[index % variable.options.length].value
              : `option-${index}`;
          break;
        case 'object':
          variables[variable.name] = {
            key1: `value1-${index}`,
            key2: `value2-${index}`,
          };
          break;
        default:
          variables[variable.name] = `default-value-${index}`;
      }
    }

    return variables;
  }

  /**
   * Generate bulk notification data
   * @param {array} users - Array of user documents
   * @param {object} template - Template document
   * @param {number} batchSize - Size of batch
   * @returns {array} - Array of notification data objects
   */
  generateBulkNotificationData(users, template, batchSize = 100) {
    const notifications = [];

    for (let i = 0; i < batchSize; i++) {
      const user = users[i % users.length];

      const notificationData = {
        userId: user._id,
        type: template.type,
        channels: this.getChannelsForType(template.type),
        recipient: {
          email: user.email,
          phone: user.phone,
        },
        category: template.category,
        priority: template.priority,
        templateId: template._id,
        variables: this.generateVariables(template.variables, i),
        sentBy: 'bulk-test-generator',
        source: 'bulk',
        batchId: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      notifications.push(notificationData);
    }

    return notifications;
  }

  /**
   * Generate webhook data
   * @param {string} provider - Provider name ('twilio' or 'mailgun')
   * @param {string} eventType - Event type
   * @param {object} options - Additional options
   * @returns {object} - Webhook data object
   */
  generateWebhookData(provider, eventType, options = {}) {
    const messageId =
      options.messageId ||
      `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (provider === 'twilio') {
      return {
        MessageSid: messageId,
        MessageStatus: eventType,
        From: options.from || '+1234567890',
        To: options.to || '+0987654321',
        Body: options.body || 'Test message',
        ErrorCode: options.errorCode,
        ErrorMessage: options.errorMessage,
      };
    } else if (provider === 'mailgun') {
      const baseEventData = {
        'event-data': {
          event: eventType,
          timestamp: Math.floor(Date.now() / 1000),
          id: messageId,
          message: {
            headers: {
              'message-id': `<${messageId}@mailgun.example.com>`,
            },
            recipients: options.recipients || ['test@example.com'],
            subject: options.subject || 'Test subject',
            from: options.from || 'test@mailgun.example.com',
          },
          recipient: options.recipient || 'test@example.com',
          tags: options.tags || ['test'],
        },
      };

      // Add event-specific data
      switch (eventType) {
        case 'delivered':
          baseEventData['event-data'].deliveryStatus = 'success';
          break;
        case 'opened':
          baseEventData['event-data'].userAgent =
            options.userAgent || 'Test Browser';
          baseEventData['event-data'].ip = options.ip || '127.0.0.1';
          break;
        case 'clicked':
          baseEventData['event-data'].url =
            options.url || 'https://example.com/click';
          baseEventData['event-data'].userAgent =
            options.userAgent || 'Test Browser';
          baseEventData['event-data'].ip = options.ip || '127.0.0.1';
          break;
        case 'bounced':
          baseEventData['event-data']['bounce-type'] =
            options.bounceType || 'hard';
          baseEventData['event-data']['bounce-error'] =
            options.bounceError || 'Bounced';
          break;
        case 'complained':
          baseEventData['event-data']['complaint-type'] =
            options.complaintType || 'spam';
          break;
      }

      return baseEventData;
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  /**
   * Generate performance test data
   * @param {object} options - Options for performance test data
   * @returns {object} - Performance test data
   */
  generatePerformanceTestData(options = {}) {
    const {
      userCount = 100,
      templateCount = 20,
      notificationCount = 1000,
      concurrentUsers = 50,
    } = options;

    return {
      userCount,
      templateCount,
      notificationCount,
      concurrentUsers,
      estimatedDuration: notificationCount * 100, // 100ms per notification
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      cpuThreshold: 80, // 80%
    };
  }

  /**
   * Generate error scenarios
   * @returns {array} - Array of error scenarios
   */
  generateErrorScenarios() {
    return [
      {
        name: 'Invalid user ID',
        data: {
          userId: 'invalid-id',
          type: 'email',
          channels: ['email'],
          content: 'Test',
          category: 'general',
        },
        expectedError: 'Invalid user ID',
      },
      {
        name: 'Missing required fields',
        data: {
          userId: new mongoose.Types.ObjectId(),
          // Missing type, content, category
        },
        expectedError: 'Missing required fields',
      },
      {
        name: 'Invalid channels',
        data: {
          userId: new mongoose.Types.ObjectId(),
          type: 'email',
          channels: ['invalid-channel'],
          content: 'Test',
          category: 'general',
        },
        expectedError: 'Invalid channels',
      },
      {
        name: 'Invalid category',
        data: {
          userId: new mongoose.Types.ObjectId(),
          type: 'email',
          channels: ['email'],
          content: 'Test',
          category: 'invalid-category',
        },
        expectedError: 'Invalid category',
      },
      {
        name: 'Invalid priority',
        data: {
          userId: new mongoose.Types.ObjectId(),
          type: 'email',
          channels: ['email'],
          content: 'Test',
          category: 'general',
          priority: 'invalid-priority',
        },
        expectedError: 'Invalid priority',
      },
      {
        name: 'Template not found',
        data: {
          userId: new mongoose.Types.ObjectId(),
          type: 'email',
          channels: ['email'],
          templateId: new mongoose.Types.ObjectId(),
          category: 'general',
        },
        expectedError: 'Template not found',
      },
      {
        name: 'Missing template variables',
        data: {
          userId: new mongoose.Types.ObjectId(),
          type: 'email',
          channels: ['email'],
          templateId: new mongoose.Types.ObjectId(),
          variables: {}, // Missing required variables
          category: 'general',
        },
        expectedError: 'Missing required variables',
      },
    ];
  }

  /**
   * Clean up all test data
   * @param {array} users - Array of user documents to clean up
   */
  async cleanupTestData(users = []) {
    try {
      // Delete all test data
      await Promise.all([
        UserNotificationPreferences.deleteMany({}),
        NotificationDelivery.deleteMany({}),
        Notification.deleteMany({}),
        NotificationTemplate.deleteMany({}),
        User.deleteMany({ _id: { $in: users.map((u) => u._id) } }),
      ]);

      console.log('✅ Test data cleaned up successfully');
    } catch (error) {
      console.error('❌ Error cleaning up test data:', error);
      throw error;
    }
  }
}

export default NotificationTestFixtures;
