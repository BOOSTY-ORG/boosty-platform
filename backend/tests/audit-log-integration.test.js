/**
 * Integration Tests for Audit Logging System
 *
 * This test suite covers audit log service, middleware, and integration
 * with role management and encryption systems.
 */

import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import auditLogService from '../src/services/auditLog.service.js';
import {
  auditLogMiddleware,
  logUserAction,
  logSensitiveOperation,
  logCrudOperation,
} from '../src/middleware/auditLog.middleware.js';
import AuditLog from '../src/models/auditLog.model.js';
import User from '../src/models/user.model.js';
import encryptionService from '../src/services/encryption.service.js';

// Mock dependencies
jest.mock('../src/helpers/logger.js');
jest.mock('../src/services/encryption.service.js');

// Test app setup
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Apply audit middleware globally
  app.use(auditLogMiddleware);

  // Test endpoints
  app.get('/api/test', (req, res) => {
    res.json({ message: 'Test endpoint', timestamp: new Date() });
  });

  app.post('/api/login', logUserAction('LOGIN', 'AUTH'), (req, res) => {
    res.json({ success: true, message: 'Login successful' });
  });

  app.post(
    '/api/sensitive-data',
    logSensitiveOperation('DATA_ACCESS'),
    (req, res) => {
      res.json({ success: true, data: 'Sensitive information' });
    }
  );

  app.post('/api/users', logCrudOperation('user'), (req, res) => {
    res.json({ success: true, userId: 'new-user-id' });
  });

  app.get('/api/audit-logs', async (req, res) => {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      action: req.query.action,
      category: req.query.category,
    };

    const result = await auditLogService.getLogs(filters, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    });

    res.json({ success: true, data: result });
  });

  return app;
};

describe('Audit Logging System Integration Tests', () => {
  let testApp;
  let testUser;

  beforeAll(async () => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.AUDIT_LOG_ENABLED = 'true';
    process.env.AUDIT_LOG_LEVEL = 'INFO';

    // Connect to test database
    const mongoUri =
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/boosty-test';
    await mongoose.connect(mongoUri);
    testApp = createTestApp();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await AuditLog.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await AuditLog.deleteMany({});

    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      status: 'active',
    });
    await testUser.save();
  });

  describe('Audit Log Middleware', () => {
    test('should add correlation ID to requests', async () => {
      const response = await request(testApp).get('/api/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-correlation-id']).toBeDefined();

      // Check that audit log was created
      const logs = await AuditLog.find({ action: 'ACCESS' });
      expect(logs).toHaveLength(1);
      expect(logs[0].correlationId).toBe(response.headers['x-correlation-id']);
    });

    test('should use existing correlation ID from headers', async () => {
      const correlationId = 'test-correlation-id-123';

      const response = await request(testApp)
        .get('/api/test')
        .set('X-Correlation-ID', correlationId);

      expect(response.status).toBe(200);
      expect(response.headers['x-correlation-id']).toBe(correlationId);

      const logs = await AuditLog.find({ correlationId });
      expect(logs).toHaveLength(1);
    });

    test('should log request details correctly', async () => {
      const response = await request(testApp)
        .post('/api/test')
        .send({ testData: 'example' })
        .set('User-Agent', 'Test-Agent/1.0')
        .set('X-Forwarded-For', '192.168.1.100');

      expect(response.status).toBe(200);

      const logs = await AuditLog.find({ action: 'CREATE' });
      expect(logs).toHaveLength(1);

      const log = logs[0];
      expect(log.method).toBe('POST');
      expect(log.endpoint).toBe('/api/test');
      expect(log.httpStatus).toBe(200);
      expect(log.userAgent).toBe('Test-Agent/1.0');
      expect(log.ipAddress).toBe('192.168.1.0'); // Should be anonymized
    });
  });

  describe('User Action Logging', () => {
    test('should log user login actions', async () => {
      const response = await request(testApp)
        .post('/api/login')
        .send({ email: 'test@example.com', password: 'password' });

      expect(response.status).toBe(200);

      const logs = await AuditLog.find({ action: 'LOGIN' });
      expect(logs).toHaveLength(1);

      const log = logs[0];
      expect(log.action).toBe('LOGIN');
      expect(log.category).toBe('AUTHENTICATION');
      expect(log.resource).toBe('AUTH');
      expect(log.outcome).toBe('SUCCESS');
      expect(log.severity).toBe('INFO');
    });

    test('should log sensitive data operations', async () => {
      const response = await request(testApp)
        .post('/api/sensitive-data')
        .send({ accessReason: 'Business requirement' });

      expect(response.status).toBe(200);

      const logs = await AuditLog.find({ action: 'DATA_ACCESS' });
      expect(logs).toHaveLength(1);

      const log = logs[0];
      expect(log.action).toBe('DATA_ACCESS');
      expect(log.category).toBe('SECURITY');
      expect(log.severity).toBe('SECURITY');
      expect(log.outcome).toBe('SUCCESS');
    });

    test('should log CRUD operations', async () => {
      const response = await request(testApp)
        .post('/api/users')
        .send({ name: 'New User', email: 'newuser@example.com' });

      expect(response.status).toBe(200);

      const logs = await AuditLog.find({ action: 'CREATE' });
      expect(logs).toHaveLength(1);

      const log = logs[0];
      expect(log.action).toBe('CREATE');
      expect(log.category).toBe('DATA_OPERATIONS');
      expect(log.resource).toBe('USER');
      expect(log.resourceType).toBe('user');
      expect(log.outcome).toBe('SUCCESS');
    });
  });

  describe('Audit Log Service', () => {
    test('should create audit log entries with required fields', async () => {
      const logData = {
        action: 'TEST_ACTION',
        category: 'SYSTEM',
        message: 'Test audit log entry',
        userId: testUser._id,
        userRole: testUser.role,
        userName: testUser.name,
        userEmail: testUser.email,
        outcome: 'SUCCESS',
        severity: 'INFO',
      };

      const result = await auditLogService.log(logData);

      expect(result).toBeDefined();
      expect(result.action).toBe(logData.action);
      expect(result.category).toBe(logData.category);
      expect(result.message).toBe(logData.message);
      expect(result.userId).toEqual(testUser._id);
      expect(result.userRole).toBe(testUser.role);
    });

    test('should anonymize IP addresses', async () => {
      const logData = {
        action: 'TEST_ACTION',
        category: 'SYSTEM',
        message: 'Test with IP',
        ipAddress: '192.168.1.123',
      };

      const result = await auditLogService.log(logData);

      expect(result.ipAddress).toBe('192.168.1.0'); // Last octet should be zeroed
    });

    test('should handle different severity levels', async () => {
      const severities = [
        'DEBUG',
        'INFO',
        'WARN',
        'ERROR',
        'SECURITY',
        'COMPLIANCE',
      ];

      for (const severity of severities) {
        const logData = {
          action: 'TEST_ACTION',
          category: 'SYSTEM',
          message: `Test ${severity} level`,
          severity,
        };

        const result = await auditLogService.log(logData);
        expect(result.severity).toBe(severity);
      }

      const logs = await AuditLog.find({ action: 'TEST_ACTION' });
      expect(logs).toHaveLength(severities.length);
    });

    test('should filter logs by criteria', async () => {
      // Create test logs
      await auditLogService.log({
        action: 'LOGIN',
        category: 'AUTHENTICATION',
        message: 'User login',
        severity: 'INFO',
      });

      await auditLogService.log({
        action: 'LOGOUT',
        category: 'AUTHENTICATION',
        message: 'User logout',
        severity: 'INFO',
      });

      await auditLogService.log({
        action: 'DATA_ACCESS',
        category: 'SECURITY',
        message: 'Sensitive data access',
        severity: 'SECURITY',
      });

      // Test filtering
      const authLogs = await auditLogService.getLogs(
        { category: 'AUTHENTICATION' },
        { page: 1, limit: 10 }
      );

      expect(authLogs.logs).toHaveLength(2);
      expect(authLogs.pagination.total).toBe(2);

      const securityLogs = await auditLogService.getLogs(
        { category: 'SECURITY' },
        { page: 1, limit: 10 }
      );

      expect(securityLogs.logs).toHaveLength(1);
      expect(securityLogs.pagination.total).toBe(1);
    });

    test('should paginate results correctly', async () => {
      // Create multiple logs
      for (let i = 0; i < 25; i++) {
        await auditLogService.log({
          action: `TEST_ACTION_${i}`,
          category: 'SYSTEM',
          message: `Test log ${i}`,
          severity: 'INFO',
        });
      }

      // Test pagination
      const page1 = await auditLogService.getLogs({}, { page: 1, limit: 10 });

      expect(page1.logs).toHaveLength(10);
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.pages).toBe(3);

      const page2 = await auditLogService.getLogs({}, { page: 2, limit: 10 });

      expect(page2.logs).toHaveLength(10);
      expect(page2.pagination.page).toBe(2);

      const page3 = await auditLogService.getLogs({}, { page: 3, limit: 10 });

      expect(page3.logs).toHaveLength(5);
      expect(page3.pagination.page).toBe(3);
    });
  });

  describe('Security Event Detection', () => {
    test('should identify high risk events', async () => {
      const securityLog = await auditLogService.log({
        action: 'UNAUTHORIZED_ACCESS',
        category: 'SECURITY',
        message: 'Unauthorized access attempt',
        severity: 'SECURITY',
        outcome: 'FAILURE',
      });

      expect(securityLog.isHighRisk()).toBe(true);

      const normalLog = await auditLogService.log({
        action: 'LOGIN',
        category: 'AUTHENTICATION',
        message: 'User login',
        severity: 'INFO',
        outcome: 'SUCCESS',
      });

      expect(normalLog.isHighRisk).toBe(false);
    });

    test('should identify compliance events', async () => {
      const complianceLog = await auditLogService.log({
        action: 'DATA_EXPORT',
        category: 'SECURITY',
        message: 'PII data export',
        severity: 'COMPLIANCE',
        complianceFlags: { gdpr: true },
      });

      expect(complianceLog.isComplianceEvent()).toBe(true);

      const normalLog = await auditLogService.log({
        action: 'LOGIN',
        category: 'AUTHENTICATION',
        message: 'User login',
        severity: 'INFO',
      });

      expect(normalLog.isComplianceEvent()).toBe(false);
    });

    test('should trigger security alerts for failed logins', async () => {
      // Simulate multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await auditLogService.log({
          action: 'LOGIN',
          category: 'AUTHENTICATION',
          message: `Failed login attempt ${i + 1}`,
          severity: 'WARN',
          outcome: 'FAILURE',
          userId: testUser._id,
        });
      }

      // Check if security alert was triggered
      const alertLogs = await AuditLog.find({ action: 'SECURITY_ALERT' });
      expect(alertLogs.length).toBeGreaterThan(0);

      const alert = alertLogs[0];
      expect(alert.category).toBe('SECURITY');
      expect(alert.severity).toBe('SECURITY');
      expect(alert.metadata.type).toBe('MULTIPLE_FAILED_LOGINS');
    });
  });

  describe('Integration with Encryption', () => {
    test('should encrypt sensitive audit log data', async () => {
      // Mock encryption service
      const mockEncrypt = jest.spyOn(encryptionService, 'encrypt');
      mockEncrypt.mockResolvedValue({
        data: 'encrypted_data',
        iv: 'test_iv',
        tag: 'test_tag',
        metadata: { version: 1 },
      });

      const logData = {
        action: 'SENSITIVE_OPERATION',
        category: 'SECURITY',
        message: 'Access to sensitive data',
        metadata: {
          ssn: '123-45-6789',
          creditCard: '4111-1111-1111-1111',
        },
      };

      await auditLogService.log(logData);

      // Verify encryption was called for sensitive fields
      expect(mockEncrypt).toHaveBeenCalledWith('123-45-6789');
      expect(mockEncrypt).toHaveBeenCalledWith('4111-1111-1111-1111');
    });

    test('should handle encryption errors gracefully', async () => {
      // Mock encryption service to throw error
      const mockEncrypt = jest.spyOn(encryptionService, 'encrypt');
      mockEncrypt.mockRejectedValue(new Error('Encryption failed'));

      const logData = {
        action: 'TEST_ACTION',
        category: 'SYSTEM',
        message: 'Test with encryption',
        metadata: {
          sensitiveField: 'sensitive_data',
        },
      };

      // Should not throw, but should handle error gracefully
      const result = await auditLogService.log(logData);

      expect(result).toBeDefined();
      expect(result.action).toBe(logData.action);
      // Sensitive field should not be included if encryption fails
      expect(result.metadata.sensitiveField).toBeUndefined();
    });
  });

  describe('Retention Policies', () => {
    test('should set appropriate retention dates', async () => {
      const testCases = [
        { severity: 'DEBUG', expectedDays: 30 },
        { severity: 'INFO', expectedDays: 180 },
        { severity: 'WARN', expectedDays: 365 },
        { severity: 'ERROR', expectedDays: 1095 },
        { severity: 'SECURITY', expectedDays: 2555 },
        { severity: 'COMPLIANCE', expectedDays: 2555 },
      ];

      for (const testCase of testCases) {
        const log = await auditLogService.log({
          action: 'RETENTION_TEST',
          category: 'SYSTEM',
          message: `Test retention for ${testCase.severity}`,
          severity: testCase.severity,
        });

        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + testCase.expectedDays);

        expect(log.retentionExpiresAt).toBeDefined();
        expect(log.retentionExpiresAt.toDateString()).toBe(
          expectedDate.toDateString()
        );
      }
    });

    test('should apply retention policies correctly', async () => {
      // Create old logs
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

      await AuditLog.create({
        action: 'OLD_LOG',
        category: 'SYSTEM',
        message: 'Old log entry',
        severity: 'DEBUG', // 30-day retention
        timestamp: oldDate,
      });

      // Apply retention policies
      const results = await auditLogService.applyRetentionPolicies();

      expect(results).toBeDefined();
      expect(results.DEBUG).toBeDefined();
      expect(results.DEBUG.deletedCount).toBe(1);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle high volume of logs', async () => {
      const startTime = Date.now();
      const logCount = 1000;

      // Create many logs
      const promises = [];
      for (let i = 0; i < logCount; i++) {
        promises.push(
          auditLogService.log({
            action: `BULK_TEST_${i}`,
            category: 'SYSTEM',
            message: `Bulk test log ${i}`,
            severity: 'INFO',
          })
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds

      // Verify all logs were created
      const logs = await AuditLog.find({ action: { $regex: /^BULK_TEST_/ } });
      expect(logs).toHaveLength(logCount);
    });

    test('should query logs efficiently', async () => {
      // Create test data
      for (let i = 0; i < 100; i++) {
        await auditLogService.log({
          action: `QUERY_TEST_${i}`,
          category: i % 2 === 0 ? 'AUTHENTICATION' : 'SECURITY',
          message: `Query test log ${i}`,
          severity: 'INFO',
        });
      }

      const startTime = Date.now();

      // Test various queries
      const authLogs = await auditLogService.getLogs(
        { category: 'AUTHENTICATION' },
        { page: 1, limit: 50 }
      );

      const securityLogs = await auditLogService.getLogs(
        { category: 'SECURITY' },
        { page: 1, limit: 50 }
      );

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(authLogs.logs).toHaveLength(50);
      expect(securityLogs.logs).toHaveLength(50);
      expect(queryTime).toBeLessThan(1000); // 1 second
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing required fields', async () => {
      const invalidLogData = {
        message: 'Missing action and category',
      };

      await expect(auditLogService.log(invalidLogData)).rejects.toThrow(
        'Missing required fields: action, category, message'
      );
    });

    test('should handle database connection errors', async () => {
      // Close database connection
      await mongoose.disconnect();

      const logData = {
        action: 'DB_ERROR_TEST',
        category: 'SYSTEM',
        message: 'Test database error handling',
      };

      await expect(auditLogService.log(logData)).rejects.toThrow();

      // Reconnect for other tests
      const mongoUri =
        process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/boosty-test';
      await mongoose.connect(mongoUri);
    });

    test('should handle malformed request data', async () => {
      // Test with malformed JSON
      const response = await request(testApp)
        .post('/api/test')
        .send('invalid-json-{')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);

      // Should still log the attempt
      const logs = await AuditLog.find({ action: 'ACCESS' });
      expect(logs).toHaveLength(1);

      const log = logs[0];
      expect(log.outcome).toBe('FAILURE');
      expect(log.severity).toBe('ERROR');
    });
  });
});
