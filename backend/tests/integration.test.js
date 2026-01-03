/**
 * Integration Tests
 *
 * This file contains integration tests for the role management,
 * encryption, and audit logging systems working together.
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/express.js';
import User from '../src/models/user.model.js';
import roleManagementService from '../src/services/roleManagement.service.js';
import encryptionService from '../src/services/encryption.service.js';
import auditLogService from '../src/services/auditLog.service.js';

// Test data
const testUser = {
  name: 'Test User',
  email: 'testuser@example.com',
  password: 'testpassword123',
  phone: '+1234567890',
  address: {
    street: '123 Test Street',
    city: 'Test City',
    country: 'Test Country',
  },
};

const adminUser = {
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'adminpassword123',
  role: 'admin',
};

describe('Integration Tests', () => {
  let authToken;
  let adminAuthToken;
  let testUserId;
  let adminUserId;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri =
      process.env.DATABASE_URL || 'mongodb://localhost:27017/boosty_test';
    await mongoose.connect(mongoUri);

    // Initialize services
    await encryptionService.initialize();
    await auditLogService.initialize();
    await roleManagementService.initialize();
  });

  afterAll(async () => {
    // Clean up database
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up audit logs before each test
    await auditLogService.clearLogs();
  });

  describe('Authentication Integration', () => {
    test('Should register user with default role and log event', async () => {
      const response = await request(app)
        .post('/api/users')
        .send(testUser)
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.user.roles).toContain('user');

      testUserId = response.body.user._id;
      authToken = response.body.token;

      // Verify audit log was created
      const auditLogs = await auditLogService.getAuditLogs({
        userId: testUserId,
        action: 'USER_CREATED',
      });
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].action).toBe('USER_CREATED');
      expect(auditLogs[0].outcome).toBe('SUCCESS');
    });

    test('Should login user and log authentication events', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.roles).toBeDefined();
      expect(response.body.user.permissions).toBeDefined();

      // Verify audit log was created
      const auditLogs = await auditLogService.getAuditLogs({
        action: 'LOGIN_SUCCESS',
      });
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].action).toBe('LOGIN_SUCCESS');
      expect(auditLogs[0].outcome).toBe('SUCCESS');
    });

    test('Should log failed login attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      // Verify audit log was created
      const auditLogs = await auditLogService.getAuditLogs({
        action: 'LOGIN_ATTEMPT',
        outcome: 'FAILURE',
      });
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].action).toBe('LOGIN_ATTEMPT');
      expect(auditLogs[0].outcome).toBe('FAILURE');
    });
  });

  describe('Role Management Integration', () => {
    beforeAll(async () => {
      // Create admin user
      const adminResponse = await request(app)
        .post('/api/users')
        .send(adminUser)
        .expect(201);

      adminUserId = adminResponse.body.user._id;
      adminAuthToken = adminResponse.body.token;

      // Assign admin role
      await roleManagementService.assignRoleToUser(adminUserId, 'admin');
    });

    test('Should enforce role-based access control', async () => {
      // Regular user trying to access admin endpoint
      const response = await request(app)
        .get('/api/users')
        .set('Cookie', `t=${authToken}`)
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');

      // Verify audit log was created
      const auditLogs = await auditLogService.getAuditLogs({
        action: 'USER_LIST_ACCESS_DENIED',
      });
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].action).toBe('USER_LIST_ACCESS_DENIED');
      expect(auditLogs[0].outcome).toBe('FAILURE');
    });

    test('Should allow admin to access protected endpoints', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Cookie', `t=${adminAuthToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify audit log was created
      const auditLogs = await auditLogService.getAuditLogs({
        action: 'USER_LIST_ACCESSED',
      });
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].action).toBe('USER_LIST_ACCESSED');
      expect(auditLogs[0].outcome).toBe('SUCCESS');
    });

    test('Should assign and update user roles', async () => {
      // Assign manager role to test user
      await roleManagementService.assignRoleToUser(testUserId, 'manager');

      const userRoles = await roleManagementService.getUserRoles(testUserId);
      expect(userRoles).toContain('user');
      expect(userRoles).toContain('manager');

      // Verify audit log was created
      const auditLogs = await auditLogService.getAuditLogs({
        action: 'ROLE_ASSIGNED',
      });
      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Encryption Integration', () => {
    test('Should encrypt sensitive user data', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Cookie', `t=${authToken}`)
        .expect(200);

      expect(response.body.email).toBeDefined();
      expect(response.body.email).not.toBe(testUser.email);
      expect(response.body.phone).toBeDefined();
      expect(response.body.phone).not.toBe(testUser.phone);

      // Verify data is encrypted
      const decryptedEmail = encryptionService.decryptField(
        response.body.email
      );
      expect(decryptedEmail).toBe(testUser.email);
    });

    test('Should encrypt payment data', async () => {
      const paymentData = {
        transactionId: 'txn_test_123',
        transactionType: 'investment',
        amount: 10000,
        currency: 'NGN',
        paymentMethod: 'card',
        email: 'payment@example.com',
        cardNumber: '4111111111111111',
        cvv: '123',
        expiryMonth: '12',
        expiryYear: '2025',
      };

      const response = await request(app)
        .post('/api/payments/initialize')
        .set('Cookie', `t=${authToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.data).toBeDefined();

      // Verify audit log was created with encrypted data
      const auditLogs = await auditLogService.getAuditLogs({
        action: 'PAYMENT_INITIALIZED',
      });
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].details.amount).toBe(paymentData.amount);
      // Card details should not be in audit logs
      expect(auditLogs[0].details.cardNumber).toBeUndefined();
    });
  });

  describe('Audit Logging Integration', () => {
    test('Should log all CRUD operations', async () => {
      // Create user
      const newUser = {
        name: 'Audit Test User',
        email: 'audittest@example.com',
        password: 'testpassword123',
      };

      const createResponse = await request(app)
        .post('/api/users')
        .set('Cookie', `t=${adminAuthToken}`)
        .send(newUser)
        .expect(201);

      const newUserId = createResponse.body.user._id;

      // Update user
      const updateResponse = await request(app)
        .put(`/api/users/${newUserId}`)
        .set('Cookie', `t=${adminAuthToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      // Delete user
      await request(app)
        .delete(`/api/users/${newUserId}`)
        .set('Cookie', `t=${adminAuthToken}`)
        .expect(200);

      // Verify all operations were logged
      const createLogs = await auditLogService.getAuditLogs({
        action: 'USER_CREATED',
        targetUserId: newUserId,
      });
      expect(createLogs.length).toBe(1);

      const updateLogs = await auditLogService.getAuditLogs({
        action: 'USER_UPDATED',
        targetUserId: newUserId,
      });
      expect(updateLogs.length).toBe(1);

      const deleteLogs = await auditLogService.getAuditLogs({
        action: 'USER_DELETED',
        targetUserId: newUserId,
      });
      expect(deleteLogs.length).toBe(1);
    });

    test('Should log security events', async () => {
      // Multiple failed login attempts
      for (let i = 0; i < 3; i++) {
        await request(app).post('/api/auth/login').send({
          email: testUser.email,
          password: 'wrongpassword',
        });
      }

      // Verify security events were logged
      const securityLogs = await auditLogService.getAuditLogs({
        category: 'AUTHENTICATION',
        severity: 'WARN',
      });
      expect(securityLogs.length).toBeGreaterThanOrEqual(3);
    });

    test('Should handle audit log failures gracefully', async () => {
      // Mock audit log service failure
      const originalLogEvent = auditLogService.logEvent;
      auditLogService.logEvent = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      // Operation should still succeed despite audit log failure
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.token).toBeDefined();

      // Restore original function
      auditLogService.logEvent = originalLogEvent;
    });
  });

  describe('Performance Integration', () => {
    test('Should handle concurrent requests with audit logging', async () => {
      const promises = [];
      const concurrentRequests = 10;

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get(`/api/users/${testUserId}`)
            .set('Cookie', `t=${authToken}`)
        );
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Verify all requests were logged
      const auditLogs = await auditLogService.getAuditLogs({
        action: 'AUTHORIZATION_CHECK',
      });
      expect(auditLogs.length).toBeGreaterThan(0);
    });

    test('Should maintain performance with encryption', async () => {
      const startTime = Date.now();

      // Create multiple users with encryption
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/users')
            .set('Cookie', `t=${adminAuthToken}`)
            .send({
              ...testUser,
              email: `testuser${i}@example.com`,
            })
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time (5 seconds)
      expect(processingTime).toBeLessThan(5000);
    });
  });

  describe('Error Handling Integration', () => {
    test('Should handle encryption service failures', async () => {
      // Mock encryption service failure
      const originalEncryptField = encryptionService.encryptField;
      encryptionService.encryptField = jest
        .fn()
        .mockRejectedValue(new Error('Encryption failed'));

      const response = await request(app)
        .post('/api/users')
        .set('Cookie', `t=${adminAuthToken}`)
        .send(testUser)
        .expect(500);

      expect(response.body.error).toBeDefined();

      // Restore original function
      encryptionService.encryptField = originalEncryptField;
    });

    test('Should handle role management service failures', async () => {
      // Mock role management service failure
      const originalAssignRole = roleManagementService.assignRoleToUser;
      roleManagementService.assignRoleToUser = jest
        .fn()
        .mockRejectedValue(new Error('Role assignment failed'));

      const response = await request(app)
        .post('/api/users')
        .set('Cookie', `t=${adminAuthToken}`)
        .send({
          ...testUser,
          email: 'roletest@example.com',
          role: 'manager',
        })
        .expect(500);

      expect(response.body.error).toBeDefined();

      // Restore original function
      roleManagementService.assignRoleToUser = originalAssignRole;
    });
  });
});

export default {};
