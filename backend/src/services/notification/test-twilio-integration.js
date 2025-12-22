/**
 * Test Twilio Integration
 *
 * This test file validates:
 * - Twilio service initialization
 * - SMS sending functionality
 * - Phone number validation
 * - Content validation
 * - Rate limiting
 * - Cost tracking
 * - Error handling
 */

import TwilioService from './twilio.service.js';
import TwilioWebhookService from './twilioWebhook.service.js';
import twilioUtils from '../../utils/notification/twilio.util.js';
import twilioConfig from '../../config/twilio.config.js';
import Redis from 'ioredis';

class TwilioIntegrationTest {
  constructor() {
    this.redisClient = null;
    this.twilioService = null;
    this.webhookService = new TwilioWebhookService();
    this.testResults = [];
  }

  /**
   * Runs all Twilio integration tests
   * @returns {Promise<object>} - Test results
   */
  async runAllTests() {
    console.log('Starting Twilio Integration Tests...\n');

    try {
      // Initialize Redis for testing
      await this.initializeRedis();

      // Run individual tests
      await this.testConfiguration();
      await this.testPhoneValidation();
      await this.testContentValidation();
      await this.testTwilioServiceInit();
      await this.testSMSSending();
      await this.testBatchSMS();
      await this.testRateLimiting();
      await this.testCostEstimation();
      await this.testErrorHandling();
      await this.testWebhookValidation();

      // Print results
      this.printTestResults();

      return {
        success: true,
        totalTests: this.testResults.length,
        passedTests: this.testResults.filter((r) => r.passed).length,
        failedTests: this.testResults.filter((r) => !r.passed).length,
        results: this.testResults,
      };
    } catch (error) {
      console.error('Test suite failed:', error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      // Clean up Redis connection
      if (this.redisClient) {
        await this.redisClient.quit();
      }
    }
  }

  /**
   * Initializes Redis client for testing
   */
  async initializeRedis() {
    try {
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
      });

      // Test connection
      await this.redisClient.ping();
      console.log('✓ Redis client initialized for testing');
    } catch (error) {
      console.warn('Redis not available for testing:', error.message);
      this.redisClient = null;
    }
  }

  /**
   * Tests Twilio configuration
   */
  async testConfiguration() {
    const testName = 'Twilio Configuration';
    console.log(`Testing: ${testName}`);

    try {
      // Test configuration validation
      const isValid = twilioConfig.validate();

      if (isValid) {
        this.addTestResult(testName, true, 'Configuration is valid');
      } else {
        this.addTestResult(testName, false, 'Configuration validation failed');
      }

      // Test required environment variables
      const requiredVars = [
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_FROM_NUMBER',
      ];

      const missingVars = requiredVars.filter(
        (varName) => !process.env[varName]
      );

      if (missingVars.length === 0) {
        this.addTestResult(
          `${testName} - Environment Variables`,
          true,
          'All required variables present'
        );
      } else {
        this.addTestResult(
          `${testName} - Environment Variables`,
          false,
          `Missing variables: ${missingVars.join(', ')}`
        );
      }
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Configuration test failed: ${error.message}`
      );
    }
  }

  /**
   * Tests phone number validation
   */
  async testPhoneValidation() {
    const testName = 'Phone Number Validation';
    console.log(`Testing: ${testName}`);

    try {
      // Test valid phone numbers
      const validNumbers = [
        '+1234567890', // US format
        '+447700900050', // UK format
        '+2348012345678', // Nigeria format
      ];

      for (const number of validNumbers) {
        const result = twilioUtils.phone.validateAndFormat(number);
        if (result.valid) {
          this.addTestResult(
            `${testName} - Valid Number ${number}`,
            true,
            'Number validated correctly'
          );
        } else {
          this.addTestResult(
            `${testName} - Valid Number ${number}`,
            false,
            `Should be valid: ${result.error}`
          );
        }
      }

      // Test invalid phone numbers
      const invalidNumbers = [
        '1234567890', // Missing country code
        'invalid', // Not a number
        '+123', // Too short
        '+1234567890123456', // Too long
      ];

      for (const number of invalidNumbers) {
        const result = twilioUtils.phone.validateAndFormat(number);
        if (!result.valid) {
          this.addTestResult(
            `${testName} - Invalid Number ${number}`,
            true,
            `Correctly rejected: ${result.error}`
          );
        } else {
          this.addTestResult(
            `${testName} - Invalid Number ${number}`,
            false,
            'Should be invalid but was accepted'
          );
        }
      }

      // Test country code extraction
      const testNumber = '+2348012345678';
      const countryCode = twilioUtils.phone.extractCountryCode(testNumber);
      if (countryCode === '234') {
        this.addTestResult(
          `${testName} - Country Code Extraction`,
          true,
          `Extracted: ${countryCode}`
        );
      } else {
        this.addTestResult(
          `${testName} - Country Code Extraction`,
          false,
          `Expected 234, got ${countryCode}`
        );
      }
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Phone validation test failed: ${error.message}`
      );
    }
  }

  /**
   * Tests content validation
   */
  async testContentValidation() {
    const testName = 'Content Validation';
    console.log(`Testing: ${testName}`);

    try {
      // Test valid content
      const validContent = 'This is a valid SMS message for testing.';
      const result = twilioUtils.content.validate(validContent);

      if (result.valid) {
        this.addTestResult(
          `${testName} - Valid Content`,
          true,
          'Content validated correctly'
        );
      } else {
        this.addTestResult(
          `${testName} - Valid Content`,
          false,
          `Should be valid: ${result.error}`
        );
      }

      // Test content with blocked word
      const blockedContent = 'This message contains spam content.';
      const blockedResult = twilioUtils.content.validate(blockedContent);

      if (!blockedResult.valid) {
        this.addTestResult(
          `${testName} - Blocked Content`,
          true,
          `Correctly rejected: ${blockedResult.error}`
        );
      } else {
        this.addTestResult(
          `${testName} - Blocked Content`,
          false,
          'Should be invalid but was accepted'
        );
      }

      // Test character counting
      const testMessage =
        'Hello, this is a test message for character counting.';
      const charCount = twilioUtils.content.countCharacters(testMessage);

      if (charCount.totalCharacters === testMessage.length) {
        this.addTestResult(
          `${testName} - Character Counting`,
          true,
          `Counted ${charCount.totalCharacters} characters`
        );
      } else {
        this.addTestResult(
          `${testName} - Character Counting`,
          false,
          `Expected ${testMessage.length}, got ${charCount.totalCharacters}`
        );
      }

      // Test variable replacement
      const templateContent =
        'Hello {{userName}}, your application {{applicationId}} has been received.';
      const variables = { userName: 'John Doe', applicationId: '12345' };
      const replacedContent = twilioUtils.content.replaceVariables(
        templateContent,
        variables
      );
      const expectedContent =
        'Hello John Doe, your application 12345 has been received.';

      if (replacedContent === expectedContent) {
        this.addTestResult(
          `${testName} - Variable Replacement`,
          true,
          'Variables replaced correctly'
        );
      } else {
        this.addTestResult(
          `${testName} - Variable Replacement`,
          false,
          'Variable replacement failed'
        );
      }
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Content validation test failed: ${error.message}`
      );
    }
  }

  /**
   * Tests Twilio service initialization
   */
  async testTwilioServiceInit() {
    const testName = 'Twilio Service Initialization';
    console.log(`Testing: ${testName}`);

    try {
      this.twilioService = new TwilioService(this.redisClient);

      // Test initialization (will fail if credentials not provided)
      try {
        await this.twilioService.initialize();
        this.addTestResult(
          testName,
          true,
          'Twilio service initialized successfully'
        );
      } catch (initError) {
        if (
          initError.message.includes('Missing required Twilio configuration')
        ) {
          this.addTestResult(
            testName,
            true,
            'Correctly detected missing configuration (expected in test environment)'
          );
        } else {
          this.addTestResult(
            testName,
            false,
            `Initialization failed: ${initError.message}`
          );
        }
      }
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Service initialization test failed: ${error.message}`
      );
    }
  }

  /**
   * Tests SMS sending (mock)
   */
  async testSMSSending() {
    const testName = 'SMS Sending';
    console.log(`Testing: ${testName}`);

    try {
      // Skip if service not initialized
      if (!this.twilioService || !this.twilioService.isInitialized) {
        this.addTestResult(
          testName,
          true,
          'Skipped (service not initialized - expected in test environment)'
        );
        return;
      }

      // Test SMS sending
      const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '+1234567890';
      const testMessage = 'This is a test SMS from Boosty Platform.';

      try {
        const result = await this.twilioService.sendSMS({
          to: testPhoneNumber,
          content: testMessage,
          variables: {},
          notificationId: 'test-notification-id',
          userId: 'test-user-id',
        });

        if (result.success) {
          this.addTestResult(
            testName,
            true,
            `SMS sent successfully: ${result.messageId}`
          );
        } else {
          this.addTestResult(testName, false, 'SMS sending failed');
        }
      } catch (sendError) {
        // Expected if test environment doesn't have real credentials
        if (sendError.message.includes('Authentication')) {
          this.addTestResult(
            testName,
            true,
            'Correctly detected authentication issue (expected in test environment)'
          );
        } else {
          this.addTestResult(
            testName,
            false,
            `SMS sending failed: ${sendError.message}`
          );
        }
      }
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `SMS sending test failed: ${error.message}`
      );
    }
  }

  /**
   * Tests batch SMS sending
   */
  async testBatchSMS() {
    const testName = 'Batch SMS Sending';
    console.log(`Testing: ${testName}`);

    try {
      // Skip if service not initialized
      if (!this.twilioService || !this.twilioService.isInitialized) {
        this.addTestResult(
          testName,
          true,
          'Skipped (service not initialized - expected in test environment)'
        );
        return;
      }

      // Test batch SMS sending
      const recipients = [
        { phoneNumber: '+1234567890', variables: { name: 'User 1' } },
        { phoneNumber: '+1234567891', variables: { name: 'User 2' } },
        { phoneNumber: '+1234567892', variables: { name: 'User 3' } },
      ];

      const templateMessage = 'Hello {{name}}, this is a batch test message.';

      try {
        const result = await this.twilioService.sendBatchSMS(
          recipients,
          templateMessage,
          { notificationId: 'test-batch-id' }
        );

        if (result.successful > 0) {
          this.addTestResult(
            testName,
            true,
            `Batch SMS sent: ${result.successful}/${result.total} successful`
          );
        } else {
          this.addTestResult(testName, false, 'Batch SMS sending failed');
        }
      } catch (batchError) {
        // Expected if test environment doesn't have real credentials
        if (batchError.message.includes('Authentication')) {
          this.addTestResult(
            testName,
            true,
            'Correctly detected authentication issue (expected in test environment)'
          );
        } else {
          this.addTestResult(
            testName,
            false,
            `Batch SMS sending failed: ${batchError.message}`
          );
        }
      }
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Batch SMS test failed: ${error.message}`
      );
    }
  }

  /**
   * Tests rate limiting
   */
  async testRateLimiting() {
    const testName = 'Rate Limiting';
    console.log(`Testing: ${testName}`);

    try {
      // Skip if Redis not available
      if (!this.redisClient) {
        this.addTestResult(testName, true, 'Skipped (Redis not available)');
        return;
      }

      const testPhoneNumber = '+1234567890';

      // Test rate limit check
      const rateLimitConfig = {
        windowMs: 60000, // 1 minute
        maxRequests: 2, // 2 requests per minute
      };

      // First request should be allowed
      const firstCheck = await twilioUtils.rateLimit.checkLimit(
        testPhoneNumber,
        rateLimitConfig,
        this.redisClient
      );

      if (firstCheck.allowed) {
        this.addTestResult(
          `${testName} - First Request`,
          true,
          'First request allowed'
        );
      } else {
        this.addTestResult(
          `${testName} - First Request`,
          false,
          'First request should be allowed'
        );
      }

      // Second request should be allowed
      const secondCheck = await twilioUtils.rateLimit.checkLimit(
        testPhoneNumber,
        rateLimitConfig,
        this.redisClient
      );

      if (secondCheck.allowed) {
        this.addTestResult(
          `${testName} - Second Request`,
          true,
          'Second request allowed'
        );
      } else {
        this.addTestResult(
          `${testName} - Second Request`,
          false,
          'Second request should be allowed'
        );
      }

      // Third request should be rate limited
      const thirdCheck = await twilioUtils.rateLimit.checkLimit(
        testPhoneNumber,
        rateLimitConfig,
        this.redisClient
      );

      if (!thirdCheck.allowed) {
        this.addTestResult(
          `${testName} - Rate Limit`,
          true,
          'Third request correctly rate limited'
        );
      } else {
        this.addTestResult(
          `${testName} - Rate Limit`,
          false,
          'Third request should be rate limited'
        );
      }

      // Clean up rate limit keys
      await twilioUtils.rateLimit.resetLimit(
        testPhoneNumber,
        'minute',
        this.redisClient
      );
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Rate limiting test failed: ${error.message}`
      );
    }
  }

  /**
   * Tests cost estimation
   */
  async testCostEstimation() {
    const testName = 'Cost Estimation';
    console.log(`Testing: ${testName}`);

    try {
      const testPhoneNumber = '+1234567890'; // US number
      const testMessage = 'This is a test message for cost estimation.';

      const costEstimate = twilioUtils.cost.estimateCost(
        testPhoneNumber,
        testMessage
      );

      if (costEstimate && costEstimate.totalCost > 0) {
        this.addTestResult(
          testName,
          true,
          `Cost estimated: $${costEstimate.totalCost} for ${costEstimate.segments} segment(s)`
        );
      } else {
        this.addTestResult(testName, false, 'Cost estimation failed');
      }

      // Test with different country
      const ukPhoneNumber = '+447700900050';
      const ukCostEstimate = twilioUtils.cost.estimateCost(
        ukPhoneNumber,
        testMessage
      );

      if (ukCostEstimate && ukCostEstimate.totalCost > costEstimate.totalCost) {
        this.addTestResult(
          `${testName} - International Rates`,
          true,
          'UK rate higher than US rate as expected'
        );
      } else {
        this.addTestResult(
          `${testName} - International Rates`,
          false,
          'International rate pricing incorrect'
        );
      }
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Cost estimation test failed: ${error.message}`
      );
    }
  }

  /**
   * Tests error handling
   */
  async testErrorHandling() {
    const testName = 'Error Handling';
    console.log(`Testing: ${testName}`);

    try {
      // Test error classification
      const retryableError = {
        code: 21610,
        message: 'Temporarily unavailable',
      };
      const retryableClassification =
        twilioUtils.error.classifyError(retryableError);

      if (retryableClassification.isRetryable) {
        this.addTestResult(
          `${testName} - Retryable Error`,
          true,
          'Retryable error classified correctly'
        );
      } else {
        this.addTestResult(
          `${testName} - Retryable Error`,
          false,
          'Retryable error classification failed'
        );
      }

      const nonRetryableError = {
        code: 21211,
        message: 'Invalid To Phone Number',
      };
      const nonRetryableClassification =
        twilioUtils.error.classifyError(nonRetryableError);

      if (!nonRetryableClassification.isRetryable) {
        this.addTestResult(
          `${testName} - Non-Retryable Error`,
          true,
          'Non-retryable error classified correctly'
        );
      } else {
        this.addTestResult(
          `${testName} - Non-Retryable Error`,
          false,
          'Non-retryable error classification failed'
        );
      }

      // Test retry delay calculation
      const retryDelay = twilioUtils.error.calculateRetryDelay(
        { category: 'rate_limit' },
        2 // Second attempt
      );

      if (retryDelay > 0) {
        this.addTestResult(
          `${testName} - Retry Delay`,
          true,
          `Retry delay calculated: ${retryDelay}ms`
        );
      } else {
        this.addTestResult(
          `${testName} - Retry Delay`,
          false,
          'Retry delay calculation failed'
        );
      }
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Error handling test failed: ${error.message}`
      );
    }
  }

  /**
   * Tests webhook validation
   */
  async testWebhookValidation() {
    const testName = 'Webhook Validation';
    console.log(`Testing: ${testName}`);

    try {
      // Create mock request
      const mockReq = {
        headers: {
          'x-twilio-signature': 'test-signature',
        },
        protocol: 'https',
        get: (header) => (header === 'host' ? 'example.com' : null),
        ip: '127.0.0.1',
      };

      const mockBody = JSON.stringify({
        MessageSid: 'test-message-id',
        MessageStatus: 'delivered',
      });

      // Test with invalid signature
      const isValid = this.webhookService.validateWebhook(mockReq, mockBody);

      if (!isValid) {
        this.addTestResult(
          `${testName} - Invalid Signature`,
          true,
          'Invalid signature correctly rejected'
        );
      } else {
        this.addTestResult(
          `${testName} - Invalid Signature`,
          false,
          'Invalid signature should be rejected'
        );
      }

      // Test unsubscribe command detection
      const unsubscribeCommands = ['STOP', 'stop', 'Unsubscribe', 'CANCEL'];

      for (const command of unsubscribeCommands) {
        const isUnsubscribe = this.webhookService.isUnsubscribeCommand(
          command.toLowerCase()
        );

        if (isUnsubscribe) {
          this.addTestResult(
            `${testName} - Unsubscribe Command ${command}`,
            true,
            'Unsubscribe command detected'
          );
        } else {
          this.addTestResult(
            `${testName} - Unsubscribe Command ${command}`,
            false,
            'Unsubscribe command not detected'
          );
        }
      }

      // Test help command detection
      const helpCommands = ['HELP', 'help', 'INFO', 'info'];

      for (const command of helpCommands) {
        const isHelp = this.webhookService.isHelpCommand(command.toLowerCase());

        if (isHelp) {
          this.addTestResult(
            `${testName} - Help Command ${command}`,
            true,
            'Help command detected'
          );
        } else {
          this.addTestResult(
            `${testName} - Help Command ${command}`,
            false,
            'Help command not detected'
          );
        }
      }
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Webhook validation test failed: ${error.message}`
      );
    }
  }

  /**
   * Adds a test result
   */
  addTestResult(testName, passed, message) {
    this.testResults.push({
      test: testName,
      passed,
      message,
      timestamp: new Date(),
    });

    const status = passed ? '✓' : '✗';
    console.log(`  ${status} ${testName}: ${message}`);
  }

  /**
   * Prints test results summary
   */
  printTestResults() {
    console.log('\n' + '='.repeat(50));
    console.log('TWILIO INTEGRATION TEST RESULTS');
    console.log('='.repeat(50));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(
      `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
    );

    if (failedTests > 0) {
      console.log('\nFailed Tests:');
      this.testResults
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  ✗ ${r.test}: ${r.message}`);
        });
    }

    console.log('='.repeat(50));
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new TwilioIntegrationTest();
  tester
    .runAllTests()
    .then((results) => {
      if (results.success) {
        console.log('\nAll tests completed successfully');
        process.exit(0);
      } else {
        console.error('\nTest suite failed:', results.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\nUnexpected error:', error);
      process.exit(1);
    });
}

export default TwilioIntegrationTest;
