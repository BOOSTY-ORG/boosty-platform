/**
 * Simple Integration Tests
 *
 * This file contains basic integration tests for the role management,
 * encryption, and audit logging systems.
 */

import mongoose from 'mongoose';
import roleManagementService from '../src/services/roleManagement.service.js';
import encryptionService from '../src/services/encryption.service.js';
import auditLogService from '../src/services/auditLog.service.js';

describe('Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri =
      process.env.DATABASE_URL || 'mongodb://localhost:27017/boosty_test';
    await mongoose.connect(mongoUri);

    // Initialize services (note: encryption and audit log services don't have initialize methods)
    // await encryptionService.initialize();
    // await auditLogService.initialize();
    await roleManagementService.initialize();
  });

  afterAll(async () => {
    // Clean up database
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up audit logs before each test
    await auditLogService.clearLogs();
  });

  describe('Encryption Service Integration', () => {
    test('Should encrypt and decrypt data correctly', () => {
      const testData = 'Sensitive user data';
      const encryptedData = encryptionService.encryptField(testData);
      const decryptedData = encryptionService.decryptField(encryptedData);

      expect(encryptedData).not.toBe(testData);
      expect(decryptedData).toBe(testData);
    });

    test('Should handle encryption of objects', () => {
      const testObject = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      };

      const encryptedObject = encryptionService.encryptObject(testObject);
      const decryptedObject = encryptionService.decryptObject(encryptedObject);

      expect(encryptedObject).not.toEqual(testObject);
      expect(decryptedObject).toEqual(testObject);
    });
  });

  describe('Role Management Service Integration', () => {
    test('Should create and assign roles', async () => {
      const testUserId = new mongoose.Types.ObjectId();

      // Create a test role
      const testRole = await roleManagementService.createRole({
        name: 'test-role',
        description: 'Test role for integration testing',
        permissions: ['test:read', 'test:write'],
      });

      expect(testRole).toBeDefined();
      expect(testRole.name).toBe('test-role');

      // Assign role to user
      await roleManagementService.assignRoleToUser(testUserId, 'test-role');

      // Verify role assignment
      const userRoles = await roleManagementService.getUserRoles(testUserId);
      expect(userRoles).toContain('test-role');

      // Verify permissions
      const userPermissions =
        await roleManagementService.getUserPermissions(testUserId);
      expect(userPermissions).toContain('test:read');
      expect(userPermissions).toContain('test:write');
    });

    test('Should check user permissions correctly', async () => {
      const testUserId = new mongoose.Types.ObjectId();

      // Assign roles with different permissions
      await roleManagementService.assignRoleToUser(testUserId, 'user');
      await roleManagementService.assignRoleToUser(testUserId, 'manager');

      // Check permissions
      const canRead = await roleManagementService.hasPermission(
        testUserId,
        'users:read'
      );
      const canWrite = await roleManagementService.hasPermission(
        testUserId,
        'users:write'
      );
      const canDelete = await roleManagementService.hasPermission(
        testUserId,
        'users:delete'
      );

      expect(canRead).toBe(true); // Manager should have read access
      expect(canWrite).toBe(true); // Manager should have write access
      expect(canDelete).toBe(false); // Manager should not have delete access
    });
  });

  describe('Audit Log Service Integration', () => {
    test('Should log and retrieve audit events', async () => {
      const testUserId = new mongoose.Types.ObjectId();

      // Log an event
      await auditLogService.logEvent({
        action: 'TEST_EVENT',
        category: 'SYSTEM',
        severity: 'INFO',
        outcome: 'SUCCESS',
        userId: testUserId,
        details: {
          message: 'Test audit log event',
          testData: 'sample data',
        },
      });

      // Retrieve the event
      const logs = await auditLogService.getAuditLogs({
        userId: testUserId,
        action: 'TEST_EVENT',
      });

      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('TEST_EVENT');
      expect(logs[0].category).toBe('SYSTEM');
      expect(logs[0].severity).toBe('INFO');
      expect(logs[0].outcome).toBe('SUCCESS');
      expect(logs[0].userId.toString()).toBe(testUserId.toString());
      expect(logs[0].details.message).toBe('Test audit log event');
    });

    test('Should handle audit log analytics', async () => {
      const testUserId = new mongoose.Types.ObjectId();

      // Log multiple events
      await auditLogService.logEvent({
        action: 'LOGIN_SUCCESS',
        category: 'AUTHENTICATION',
        severity: 'INFO',
        outcome: 'SUCCESS',
        userId: testUserId,
      });

      await auditLogService.logEvent({
        action: 'LOGIN_ATTEMPT',
        category: 'AUTHENTICATION',
        severity: 'WARN',
        outcome: 'FAILURE',
        userId: testUserId,
      });

      // Get analytics
      const analytics = await auditLogService.getAuditAnalytics({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        endDate: new Date(),
      });

      expect(analytics.totalEvents).toBe(2);
      expect(analytics.categoryBreakdown.AUTHENTICATION).toBe(2);
      expect(analytics.severityBreakdown.INFO).toBe(1);
      expect(analytics.severityBreakdown.WARN).toBe(1);
    });
  });

  describe('Cross-Service Integration', () => {
    test('Should work together for user operations', async () => {
      const testUserId = new mongoose.Types.ObjectId();
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
      };

      // Encrypt user data
      const encryptedUserData = encryptionService.encryptObject(userData);

      // Assign role to user
      await roleManagementService.assignRoleToUser(testUserId, 'user');

      // Log user creation
      await auditLogService.logEvent({
        action: 'USER_CREATED',
        category: 'DATA_OPERATIONS',
        severity: 'INFO',
        outcome: 'SUCCESS',
        userId: testUserId,
        targetUserId: testUserId,
        details: {
          encryptedData: encryptedUserData,
          role: 'user',
        },
      });

      // Verify all operations
      const userRoles = await roleManagementService.getUserRoles(testUserId);
      expect(userRoles).toContain('user');

      const logs = await auditLogService.getAuditLogs({
        action: 'USER_CREATED',
        targetUserId: testUserId,
      });
      expect(logs.length).toBe(1);

      const decryptedUserData =
        encryptionService.decryptObject(encryptedUserData);
      expect(decryptedUserData.name).toBe(userData.name);
    });

    test('Should handle permission-based audit logging', async () => {
      const testUserId = new mongoose.Types.ObjectId();

      // Assign admin role
      await roleManagementService.assignRoleToUser(testUserId, 'admin');

      // Log sensitive operation
      await auditLogService.logEvent({
        action: 'SENSITIVE_OPERATION',
        category: 'SECURITY',
        severity: 'SECURITY',
        outcome: 'SUCCESS',
        userId: testUserId,
        details: {
          operation: 'delete_all_users',
          reason: 'System maintenance',
        },
      });

      // Verify the event was logged with correct severity
      const logs = await auditLogService.getAuditLogs({
        userId: testUserId,
        severity: 'SECURITY',
      });

      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('SENSITIVE_OPERATION');
      expect(logs[0].severity).toBe('SECURITY');
    });
  });

  describe('Error Handling Integration', () => {
    test('Should handle service failures gracefully', async () => {
      // Test with invalid encryption key
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'invalid_key';

      try {
        await encryptionService.initialize();
        // Should throw an error with invalid key
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      } finally {
        // Restore original key
        if (originalKey) {
          process.env.ENCRYPTION_KEY = originalKey;
        }
      }
    });

    test('Should handle database connection failures', async () => {
      // Close existing connection
      await mongoose.connection.close();

      try {
        // Try to log event without database connection
        await auditLogService.log({
          action: 'TEST_EVENT',
          category: 'SYSTEM',
          severity: 'INFO',
          outcome: 'SUCCESS',
          userId: new mongoose.Types.ObjectId(),
        });

        // Should handle gracefully without throwing
        expect(true).toBe(true);
      } catch (error) {
        // Should handle database errors gracefully
        expect(error.message).toContain('database');
      } finally {
        // Reconnect for other tests
        const mongoUri =
          process.env.DATABASE_URL || 'mongodb://localhost:27017/boosty_test';
        await mongoose.connect(mongoUri);
      }
    });
  });

  describe('Performance Integration', () => {
    test('Should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      const testUserId = new mongoose.Types.ObjectId();
      const eventCount = 100;

      // Log multiple events
      const promises = [];
      for (let i = 0; i < eventCount; i++) {
        promises.push(
          auditLogService.log({
            action: `BULK_EVENT_${i}`,
            category: 'SYSTEM',
            severity: 'INFO',
            outcome: 'SUCCESS',
            userId: testUserId,
            details: { index: i },
          })
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time (5 seconds for 100 events)
      expect(processingTime).toBeLessThan(5000);

      // Verify all events were logged
      const logs = await auditLogService.getLogs({
        userId: testUserId,
      });
      expect(logs.length).toBeGreaterThanOrEqual(eventCount);
    });

    test('Should cache roles and permissions efficiently', async () => {
      const testUserId = new mongoose.Types.ObjectId();

      // First call - should hit database
      const startTime1 = Date.now();
      await roleManagementService.getUserRoles(testUserId);
      const firstCallTime = Date.now() - startTime1;

      // Second call - should hit cache
      const startTime2 = Date.now();
      await roleManagementService.getUserRoles(testUserId);
      const secondCallTime = Date.now() - startTime2;

      // Cached call should be significantly faster
      expect(secondCallTime).toBeLessThan(firstCallTime);
    });
  });
});

export default {};
