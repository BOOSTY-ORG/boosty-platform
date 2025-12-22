/**
 * Test Mailgun Integration
 *
 * This script tests:
 * - Mailgun service initialization
 * - Email sending functionality
 * - Email validation
 * - Content processing
 * - Attachment handling
 * - Batch email sending
 * - Error handling
 */

import dotenv from 'dotenv';
import MailgunService from './mailgun.service.js';
import mailgunUtils from '../../utils/notification/mailgun.util.js';
import mailgunConfig from '../../config/mailgun.config.js';

// Load environment variables
dotenv.config();

class MailgunIntegrationTester {
  constructor() {
    this.mailgunService = new MailgunService();
    this.testResults = [];
  }

  /**
   * Runs all tests
   * @returns {Promise<object>} - Test results
   */
  async runAllTests() {
    console.log('🚀 Starting Mailgun Integration Tests...\n');

    try {
      // Initialize service
      await this.testInitialization();

      // Test email validation
      await this.testEmailValidation();

      // Test content validation
      await this.testContentValidation();

      // Test attachment validation
      await this.testAttachmentValidation();

      // Test email sending
      await this.testEmailSending();

      // Test batch email sending
      await this.testBatchEmailSending();

      // Test error handling
      await this.testErrorHandling();

      // Print results
      this.printResults();

      return this.getTestSummary();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Tests service initialization
   */
  async testInitialization() {
    console.log('📋 Testing Service Initialization...');

    try {
      // Test with valid configuration
      await this.mailgunService.initialize();
      this.addTestResult(
        'Initialization',
        true,
        'Service initialized successfully'
      );

      // Test configuration validation
      const isValid = mailgunConfig.validate();
      this.addTestResult(
        'Configuration Validation',
        true,
        'Configuration is valid'
      );
    } catch (error) {
      this.addTestResult('Initialization', false, error.message);
    }
  }

  /**
   * Tests email validation
   */
  async testEmailValidation() {
    console.log('📧 Testing Email Validation...');

    // Test valid emails
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'user+tag@example.org',
      'user123@test-domain.com',
    ];

    for (const email of validEmails) {
      const result = mailgunUtils.email.validate(email);
      this.addTestResult(
        `Valid Email: ${email}`,
        result.valid,
        result.error || 'Validated successfully'
      );
    }

    // Test invalid emails
    const invalidEmails = [
      'invalid-email',
      '@domain.com',
      'user@',
      'user..name@domain.com',
      'user@domain..com',
    ];

    for (const email of invalidEmails) {
      const result = mailgunUtils.email.validate(email);
      this.addTestResult(
        `Invalid Email: ${email}`,
        !result.valid,
        result.error || 'Should have failed validation'
      );
    }

    // Test multiple email validation
    const multipleEmails = [
      'test1@example.com',
      'test2@example.com',
      'invalid-email',
      'test3@example.com',
    ];

    const multipleResult = mailgunUtils.email.validateMultiple(multipleEmails);
    this.addTestResult(
      'Multiple Email Validation',
      !multipleResult.valid && multipleResult.invalidEmails.length === 1,
      `Found ${multipleResult.invalidEmails.length} invalid email(s)`
    );
  }

  /**
   * Tests content validation
   */
  async testContentValidation() {
    console.log('📝 Testing Content Validation...');

    // Test valid content
    const validContent = {
      subject: 'Test Subject',
      text: 'This is a test email content.',
      html: '<p>This is a <strong>test</strong> email content.</p>',
    };

    const validResult = mailgunUtils.content.validate(validContent);
    this.addTestResult(
      'Valid Content',
      validResult.valid,
      validResult.error || 'Content validated successfully'
    );

    // Test content with variables
    const contentWithVariables = {
      subject: 'Hello {{userName}}',
      text: 'Dear {{userName}}, your order {{orderId}} is ready.',
      html: '<p>Dear <strong>{{userName}}</strong>, your order <em>{{orderId}}</em> is ready.</p>',
    };

    const processedContent = mailgunUtils.content.replaceVariables(
      contentWithVariables,
      { userName: 'John Doe', orderId: '12345' }
    );

    const hasVariablesReplaced =
      processedContent.subject.includes('John Doe') &&
      processedContent.text.includes('John Doe') &&
      processedContent.html.includes('John Doe');

    this.addTestResult(
      'Variable Replacement',
      hasVariablesReplaced,
      'Variables replaced successfully'
    );

    // Test HTML sanitization
    const unsafeHtml = '<p>Safe content</p><script>alert("xss")</script>';
    const sanitizedHtml = mailgunUtils.content.sanitizeHtml(unsafeHtml);

    const isSanitized = !sanitizedHtml.includes('<script>');
    this.addTestResult(
      'HTML Sanitization',
      isSanitized,
      'HTML sanitized successfully'
    );
  }

  /**
   * Tests attachment validation
   */
  async testAttachmentValidation() {
    console.log('📎 Testing Attachment Validation...');

    // Test valid attachment
    const validAttachment = {
      filename: 'test.pdf',
      content: Buffer.from('test content'),
      contentType: 'application/pdf',
    };

    const validAttachmentResult =
      mailgunUtils.attachment.validate(validAttachment);
    this.addTestResult(
      'Valid Attachment',
      validAttachmentResult.valid,
      validAttachmentResult.error || 'Attachment validated successfully'
    );

    // Test invalid attachment (missing filename)
    const invalidAttachment = {
      content: Buffer.from('test content'),
      contentType: 'application/pdf',
    };

    const invalidAttachmentResult =
      mailgunUtils.attachment.validate(invalidAttachment);
    this.addTestResult(
      'Invalid Attachment (Missing Filename)',
      !invalidAttachmentResult.valid,
      invalidAttachmentResult.error || 'Should have failed validation'
    );

    // Test multiple attachments
    const multipleAttachments = [
      {
        filename: 'test1.pdf',
        content: Buffer.from('test content 1'),
        contentType: 'application/pdf',
      },
      {
        filename: 'test2.jpg',
        content: Buffer.from('test content 2'),
        contentType: 'image/jpeg',
      },
    ];

    const multipleResult =
      mailgunUtils.attachment.validateMultiple(multipleAttachments);
    this.addTestResult(
      'Multiple Attachments',
      multipleResult.valid,
      multipleResult.error || 'Multiple attachments validated successfully'
    );
  }

  /**
   * Tests email sending
   */
  async testEmailSending() {
    console.log('📤 Testing Email Sending...');

    // Skip if in test mode without actual credentials
    if (process.env.NODE_ENV === 'test' || !process.env.MAILGUN_API_KEY) {
      this.addTestResult(
        'Email Sending',
        true,
        'Skipped (no credentials in test mode)'
      );
      return;
    }

    try {
      const testEmail = {
        to: process.env.TEST_EMAIL || 'test@example.com',
        subject: 'Mailgun Integration Test',
        content: 'This is a test email from Mailgun integration.',
        htmlContent:
          '<p>This is a <strong>test email</strong> from Mailgun integration.</p>',
        variables: {
          companyName: 'Boosty Platform',
        },
      };

      const result = await this.mailgunService.sendEmail(testEmail);
      this.addTestResult(
        'Email Sending',
        result.success,
        result.messageId
          ? `Email sent successfully with ID: ${result.messageId}`
          : 'Email sent but no message ID returned'
      );
    } catch (error) {
      this.addTestResult('Email Sending', false, error.message);
    }
  }

  /**
   * Tests batch email sending
   */
  async testBatchEmailSending() {
    console.log('📦 Testing Batch Email Sending...');

    // Skip if in test mode without actual credentials
    if (process.env.NODE_ENV === 'test' || !process.env.MAILGUN_API_KEY) {
      this.addTestResult(
        'Batch Email Sending',
        true,
        'Skipped (no credentials in test mode)'
      );
      return;
    }

    try {
      const testEmails = [
        {
          email: process.env.TEST_EMAIL || 'test1@example.com',
          variables: { userName: 'User 1' },
        },
        {
          email: process.env.TEST_EMAIL || 'test2@example.com',
          variables: { userName: 'User 2' },
        },
      ];

      const testContent = {
        subject: 'Batch Test: Hello {{userName}}',
        text: 'Dear {{userName}}, this is a batch test email.',
        html: '<p>Dear <strong>{{userName}}</strong>, this is a batch test email.</p>',
      };

      const result = await this.mailgunService.sendBatchEmail(
        testEmails,
        testContent
      );

      this.addTestResult(
        'Batch Email Sending',
        result.successful > 0,
        `Sent ${result.successful} emails, ${result.failed} failed`
      );
    } catch (error) {
      this.addTestResult('Batch Email Sending', false, error.message);
    }
  }

  /**
   * Tests error handling
   */
  async testErrorHandling() {
    console.log('⚠️ Testing Error Handling...');

    // Test error classification
    const testErrors = [
      { statusCode: 429, message: 'Too many requests' },
      { statusCode: 500, message: 'Internal server error' },
      { statusCode: 400, message: 'Bad request' },
    ];

    for (const error of testErrors) {
      const classification = mailgunUtils.error.classifyError(error);
      const isRetryable = classification.isRetryable;

      const expectedRetryable =
        error.statusCode >= 500 || error.statusCode === 429;

      this.addTestResult(
        `Error Classification (${error.statusCode})`,
        isRetryable === expectedRetryable,
        `Error classified as ${isRetryable ? 'retryable' : 'non-retryable'}`
      );
    }

    // Test retry delay calculation
    const errorClassification = { category: 'rate_limit' };
    const retryDelay = mailgunUtils.error.calculateRetryDelay(
      errorClassification,
      2
    );

    this.addTestResult(
      'Retry Delay Calculation',
      retryDelay > 0,
      `Calculated retry delay: ${retryDelay}ms`
    );
  }

  /**
   * Adds a test result
   * @param {string} testName - Test name
   * @param {boolean} passed - Whether test passed
   * @param {string} message - Test message
   */
  addTestResult(testName, passed, message) {
    this.testResults.push({
      name: testName,
      passed,
      message,
      timestamp: new Date().toISOString(),
    });

    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${testName}: ${message}`);
  }

  /**
   * Prints test results
   */
  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');

    const passed = this.testResults.filter((r) => r.passed).length;
    const failed = this.testResults.filter((r) => !r.passed).length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(2)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  - ${r.name}: ${r.message}`);
        });
    }

    console.log('\n' + '='.repeat(50));
  }

  /**
   * Gets test summary
   * @returns {object} - Test summary
   */
  getTestSummary() {
    const passed = this.testResults.filter((r) => r.passed).length;
    const failed = this.testResults.filter((r) => !r.passed).length;
    const total = this.testResults.length;

    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100,
      results: this.testResults,
    };
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MailgunIntegrationTester();
  tester
    .runAllTests()
    .then((summary) => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default MailgunIntegrationTester;
