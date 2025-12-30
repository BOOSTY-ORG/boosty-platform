/**
 * End-to-End Integration Tests for Role Management, Encryption, and Audit Logging
 *
 * This test suite covers complete workflows that involve all three systems
 * working together to ensure proper integration and security.
 */

import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import RoleManagementService from '../src/services/roleManagement.service.js';
import encryptionService from '../src/services/encryption.service.js';
import auditLogService from '../src/services/auditLog.service.js';
import {
  authenticateToken,
  requireRole,
  requirePermission,
  preventRoleEscalation,
  fetchTargetUser,
} from '../src/middleware/roleManagement.middleware.js';
import {
  encryptRequestData,
  decryptResponseData,
  conditionalDecryption,
} from '../src/middleware/encryption.middleware.js';
import {
  auditLogMiddleware,
  logUserAction,
  logSensitiveOperation,
} from '../src/middleware/auditLog.middleware.js';
import User from '../src/models/user.model.js';
import PaymentTransaction from '../src/models/payment/paymentTransaction.model.js';
import KYCDocument from '../src/models/metrics/kycDocument.model.js';

// Mock dependencies
jest.mock('../src/helpers/logger.js');

// Comprehensive test app with all middleware
const createE2ETestApp = () => {
  const app = express();
  app.use(express.json());

  // Apply global middleware
  app.use(auditLogMiddleware);

  // Authentication endpoint with audit logging
  app.post(
    '/api/auth/login',
    logUserAction('LOGIN', 'AUTH'),
    async (req, res) => {
      const { email, password } = req.body;

      // Mock authentication
      if (email === 'admin@example.com' && password === 'admin123') {
        const user = await User.findOne({ email });
        if (user) {
          const token = jwt.sign(
            { _id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
          );

          res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
              id: user._id,
              email: user.email,
              role: user.role,
            },
          });
        } else {
          res.status(401).json({
            success: false,
            message: 'Invalid credentials',
          });
        }
      } else {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }
    }
  );

  // User registration with encryption and audit logging
  app.post(
    '/api/users/register',
    encryptRequestData('user'),
    logUserAction('REGISTER', 'AUTHENTICATION'),
    async (req, res) => {
      const user = new User(req.body);
      await user.save();

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        userId: user._id,
      });
    }
  );

  // Role management endpoints
  app.post(
    '/api/admin/users/:userId/assign-role',
    authenticateToken,
    requireRole(['admin', 'superadmin']),
    fetchTargetUser('userId'),
    preventRoleEscalation,
    logUserAction('ROLE_ASSIGN', 'AUTHORIZATION'),
    async (req, res) => {
      const { newRole, reason } = req.body;

      const updatedUser = await RoleManagementService.assignRole(
        req.params.userId,
        newRole,
        req.auth._id,
        reason
      );

      res.json({
        success: true,
        message: 'Role assigned successfully',
        user: updatedUser,
      });
    }
  );

  // Sensitive data operations with encryption and audit logging
  app.post(
    '/api/payments/transaction',
    authenticateToken,
    requirePermission('financial_access', 'create'),
    encryptRequestData('paymentTransaction'),
    logSensitiveOperation('FINANCIAL_TRANSACTION'),
    conditionalDecryption(),
    async (req, res) => {
      const transaction = new PaymentTransaction(req.body);
      await transaction.save();

      res.json({
        success: true,
        message: 'Payment transaction created',
        transactionId: transaction._id,
      });
    }
  );

  // KYC document handling with all security measures
  app.post(
    '/api/kyc/documents',
    authenticateToken,
    requirePermission('user_management', 'update'),
    encryptRequestData('kycDocument'),
    logSensitiveOperation('KYC_DOCUMENT_UPLOAD'),
    conditionalDecryption(),
    async (req, res) => {
      const kycDoc = new KYCDocument(req.body);
      await kycDoc.save();

      res.json({
        success: true,
        message: 'KYC document uploaded',
        documentId: kycDoc._id,
      });
    }
  );

  // User data retrieval with role-based decryption
  app.get(
    '/api/users/:userId/sensitive-data',
    authenticateToken,
    requireOwnershipOrAdmin('userId'),
    decryptResponseData('user'),
    logUserAction('SENSITIVE_DATA_ACCESS', 'DATA_OPERATIONS'),
    async (req, res) => {
      const user = await User.findById(req.params.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        data: user,
      });
    }
  );

  // Audit log viewing with proper authorization
  app.get(
    '/api/admin/audit-logs',
    authenticateToken,
    requireRole(['admin', 'superadmin']),
    logUserAction('AUDIT_LOG_ACCESS', 'SYSTEM'),
    async (req, res) => {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        action: req.query.action,
        category: req.query.category,
      };

      const result = await auditLogService.getLogs(filters, {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
      });

      res.json({
        success: true,
        data: result.logs,
        pagination: result.pagination,
      });
    }
  );

  return app;
};

describe('End-to-End Systems Integration Tests', () => {
  let testApp;
  let adminUser, regularUser, analystUser;

  beforeAll(async () => {
    // Set up comprehensive test environment
    process.env.ENCRYPTION_MASTER_KEY =
      'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890';
    process.env.ENCRYPTION_SALT =
      'fedcba0987654321fedcba0987654321fedcba0987654321';
    process.env.JWT_SECRET = 'test-secret-for-e2e-testing';

    // Connect to test database
    const mongoUri =
      process.env.MONGODB_TEST_URI ||
      'mongodb://localhost:27017/boosty-e2e-test';
    await mongoose.connect(mongoUri);
    testApp = createE2ETestApp();
  });

  afterAll(async () => {
    // Comprehensive cleanup
    await User.deleteMany({});
    await PaymentTransaction.deleteMany({});
    await KYCDocument.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await User.deleteMany({});
    await PaymentTransaction.deleteMany({});
    await KYCDocument.deleteMany({});

    // Create test users
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'hashedpassword',
      role: 'admin',
      status: 'active',
    });
    await adminUser.save();

    regularUser = new User({
      name: 'Regular User',
      email: 'user@example.com',
      password: 'hashedpassword',
      role: 'user',
      status: 'active',
    });
    await regularUser.save();

    analystUser = new User({
      name: 'Analyst User',
      email: 'analyst@example.com',
      password: 'hashedpassword',
      role: 'analyst',
      status: 'active',
    });
    await analystUser.save();
  });

  describe('Complete User Registration Workflow', () => {
    test('should register user with encryption and audit logging', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        phone: '+1234567890',
        address: '123 New User St, Test City, TC 12345',
        password: 'password123',
        role: 'user',
      };

      const response = await request(testApp)
        .post('/api/users/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Verify user was created
      const createdUser = await User.findOne({ email: 'newuser@example.com' });
      expect(createdUser).toBeDefined();
      expect(createdUser.name).toBe('New User');

      // Verify sensitive data is encrypted in database
      expect(createdUser.email).toHaveProperty('encrypted', true);
      expect(createdUser.phone).toHaveProperty('encrypted', true);
      expect(createdUser.address).toHaveProperty('encrypted', true);

      // Verify audit log was created
      const auditLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          action: 'REGISTER',
        })
        .toArray();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].category).toBe('AUTHENTICATION');
      expect(auditLogs[0].outcome).toBe('SUCCESS');
    });
  });

  describe('Authentication and Authorization Workflow', () => {
    test('should authenticate user and create audit trail', async () => {
      const loginData = {
        email: 'admin@example.com',
        password: 'admin123',
      };

      const response = await request(testApp)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();

      // Verify audit log for login
      const auditLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          action: 'LOGIN',
          userId: adminUser._id,
        })
        .toArray();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].outcome).toBe('SUCCESS');
      expect(auditLogs[0].severity).toBe('INFO');
    });

    test('should log failed authentication attempts', async () => {
      const loginData = {
        email: 'admin@example.com',
        password: 'wrongpassword',
      };

      const response = await request(testApp)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);

      // Verify audit log for failed login
      const auditLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          action: 'LOGIN',
          userId: adminUser._id,
          outcome: 'FAILURE',
        })
        .toArray();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].severity).toBe('WARN');
    });
  });

  describe('Role Management Workflow', () => {
    test('should assign role with proper authorization and audit logging', async () => {
      const adminToken = jwt.sign(
        { _id: adminUser._id, email: adminUser.email, role: adminUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const roleData = {
        newRole: 'analyst',
        reason: 'Promoted to analyst role for project requirements',
      };

      const response = await request(testApp)
        .post(`/api/admin/users/${regularUser._id}/assign-role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roleData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify role was updated
      const updatedUser = await User.findById(regularUser._id);
      expect(updatedUser.role).toBe('analyst');

      // Verify role history was created
      const roleHistory = updatedUser.roleHistory || [];
      expect(roleHistory.length).toBeGreaterThan(0);
      expect(roleHistory[roleHistory.length - 1].newRole).toBe('analyst');

      // Verify audit log for role assignment
      const auditLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          action: 'ROLE_ASSIGN',
          resourceId: regularUser._id,
        })
        .toArray();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].category).toBe('AUTHORIZATION');
      expect(auditLogs[0].severity).toBe('INFO');
      expect(auditLogs[0].metadata.newRole).toBe('analyst');
    });

    test('should prevent unauthorized role assignment', async () => {
      const userToken = jwt.sign(
        {
          _id: regularUser._id,
          email: regularUser.email,
          role: regularUser.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const roleData = {
        newRole: 'admin',
        reason: 'Attempting privilege escalation',
      };

      const response = await request(testApp)
        .post(`/api/admin/users/${analystUser._id}/assign-role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(roleData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Verify audit log for unauthorized attempt
      const auditLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          action: 'ROLE_ASSIGN',
          outcome: 'FAILURE',
        })
        .toArray();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].severity).toBe('SECURITY');
    });
  });

  describe('Financial Transaction Workflow', () => {
    test('should process encrypted financial transaction with audit logging', async () => {
      const analystToken = jwt.sign(
        {
          _id: analystUser._id,
          email: analystUser.email,
          role: analystUser.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const transactionData = {
        userId: regularUser._id,
        amount: 5000,
        accountNumber: '1234567890123456',
        routingNumber: '021000021',
        bankName: 'Test Bank',
        cardLastFour: '1234',
        transactionReference: 'TXN' + Date.now(),
      };

      const response = await request(testApp)
        .post('/api/payments/transaction')
        .set('Authorization', `Bearer ${analystToken}`)
        .send(transactionData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify transaction was created
      const transaction = await PaymentTransaction.findById(
        response.body.transactionId
      );
      expect(transaction).toBeDefined();
      expect(transaction.amount).toBe(5000);

      // Verify sensitive data is encrypted
      expect(transaction.accountNumber).toHaveProperty('encrypted', true);
      expect(transaction.routingNumber).toHaveProperty('encrypted', true);
      expect(transaction.bankName).toHaveProperty('encrypted', true);

      // Verify audit log for financial transaction
      const auditLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          action: 'FINANCIAL_TRANSACTION',
          resourceId: transaction._id,
        })
        .toArray();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].category).toBe('SECURITY');
      expect(auditLogs[0].severity).toBe('SECURITY');
    });

    test('should prevent unauthorized financial access', async () => {
      const userToken = jwt.sign(
        {
          _id: regularUser._id,
          email: regularUser.email,
          role: regularUser.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const transactionData = {
        userId: regularUser._id,
        amount: 1000,
        accountNumber: '1234567890123456',
      };

      const response = await request(testApp)
        .post('/api/payments/transaction')
        .set('Authorization', `Bearer ${userToken}`)
        .send(transactionData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Verify audit log for unauthorized access attempt
      const auditLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          action: 'FINANCIAL_TRANSACTION',
          outcome: 'FAILURE',
        })
        .toArray();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].severity).toBe('SECURITY');
    });
  });

  describe('KYC Document Workflow', () => {
    test('should handle encrypted KYC documents with audit logging', async () => {
      const adminToken = jwt.sign(
        { _id: adminUser._id, email: adminUser.email, role: adminUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const kycData = {
        userId: regularUser._id,
        documentType: 'passport',
        documentNumber: 'P123456789',
        issuingAuthority: 'US Department of State',
        personalIdentifiers: {
          ssn: '123-45-6789',
          passportNumber: 'P123456789',
        },
      };

      const response = await request(testApp)
        .post('/api/kyc/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(kycData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify KYC document was created
      const kycDoc = await KYCDocument.findById(response.body.documentId);
      expect(kycDoc).toBeDefined();
      expect(kycDoc.documentType).toBe('passport');

      // Verify sensitive data is encrypted
      expect(kycDoc.documentNumber).toHaveProperty('encrypted', true);
      expect(kycDoc.issuingAuthority).toHaveProperty('encrypted', true);
      expect(kycDoc.personalIdentifiers).toHaveProperty('encrypted', true);

      // Verify audit log for KYC upload
      const auditLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          action: 'KYC_DOCUMENT_UPLOAD',
          resourceId: kycDoc._id,
        })
        .toArray();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].category).toBe('SECURITY');
      expect(auditLogs[0].severity).toBe('SECURITY');
    });
  });

  describe('Data Access with Role-Based Decryption', () => {
    test('should allow admins to view decrypted sensitive data', async () => {
      const adminToken = jwt.sign(
        { _id: adminUser._id, email: adminUser.email, role: adminUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(testApp)
        .get(`/api/users/${regularUser._id}/sensitive-data`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Admin should see decrypted data
      const userData = response.body.data;
      expect(userData.email).toBe('user@example.com');
      expect(userData.phone).toBe('+1234567890');
      expect(userData.address).toBe('123 Test St, Test City, TC 12345');

      // Verify audit log for data access
      const auditLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          action: 'SENSITIVE_DATA_ACCESS',
          resourceId: regularUser._id,
        })
        .toArray();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].outcome).toBe('SUCCESS');
    });

    test('should allow users to view their own decrypted data', async () => {
      const userToken = jwt.sign(
        {
          _id: regularUser._id,
          email: regularUser.email,
          role: regularUser.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(testApp)
        .get(`/api/users/${regularUser._id}/sensitive-data`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // User should see their own decrypted data
      const userData = response.body.data;
      expect(userData.email).toBe('user@example.com');
      expect(userData.phone).toBe('+1234567890');

      // Verify audit log for data access
      const auditLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          action: 'SENSITIVE_DATA_ACCESS',
          resourceId: regularUser._id,
        })
        .toArray();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].outcome).toBe('SUCCESS');
    });

    test('should prevent users from accessing others sensitive data', async () => {
      const userToken = jwt.sign(
        {
          _id: regularUser._id,
          email: regularUser.email,
          role: regularUser.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(testApp)
        .get(`/api/users/${adminUser._id}/sensitive-data`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Verify audit log for unauthorized access attempt
      const auditLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          action: 'SENSITIVE_DATA_ACCESS',
          outcome: 'FAILURE',
        })
        .toArray();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].severity).toBe('SECURITY');
    });
  });

  describe('Audit Log Access and Analytics', () => {
    test('should allow admins to view audit logs', async () => {
      const adminToken = jwt.sign(
        { _id: adminUser._id, email: adminUser.email, role: adminUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(testApp)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();

      // Verify audit log for audit log access
      const auditLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          action: 'AUDIT_LOG_ACCESS',
        })
        .toArray();

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].category).toBe('SYSTEM');
    });

    test('should prevent non-admins from viewing audit logs', async () => {
      const userToken = jwt.sign(
        {
          _id: regularUser._id,
          email: regularUser.email,
          role: regularUser.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(testApp)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Security and Compliance Validation', () => {
    test('should maintain audit trail for all sensitive operations', async () => {
      const adminToken = jwt.sign(
        { _id: adminUser._id, email: adminUser.email, role: adminUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Perform multiple sensitive operations
      await request(testApp)
        .post('/api/kyc/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: regularUser._id,
          documentType: 'passport',
          documentNumber: 'P987654321',
        });

      await request(testApp)
        .post('/api/payments/transaction')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: regularUser._id,
          amount: 2000,
          accountNumber: '9876543210987',
        });

      await request(testApp)
        .post(`/api/admin/users/${analystUser._id}/assign-role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newRole: 'manager',
          reason: 'Promotion to manager role',
        });

      // Verify all operations are logged
      const auditLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          action: {
            $in: [
              'KYC_DOCUMENT_UPLOAD',
              'FINANCIAL_TRANSACTION',
              'ROLE_ASSIGN',
            ],
          },
        })
        .toArray();

      expect(auditLogs).toHaveLength(3);

      // Verify each log has proper security context
      auditLogs.forEach((log) => {
        expect(log.timestamp).toBeDefined();
        expect(log.userId).toBeDefined();
        expect(log.ipAddress).toBeDefined();
        expect(log.userAgent).toBeDefined();
        expect(log.correlationId).toBeDefined();
      });
    });

    test('should detect and log security violations', async () => {
      const userToken = jwt.sign(
        {
          _id: regularUser._id,
          email: regularUser.email,
          role: regularUser.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Attempt unauthorized access
      await request(testApp)
        .post('/api/payments/transaction')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId: regularUser._id,
          amount: 1000,
          accountNumber: '1111222333',
        });

      // Attempt role escalation
      await request(testApp)
        .post(`/api/admin/users/${adminUser._id}/assign-role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          newRole: 'superadmin',
          reason: 'Attempting privilege escalation',
        });

      // Verify security violations are logged with high severity
      const securityLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          severity: 'SECURITY',
          outcome: 'FAILURE',
        })
        .toArray();

      expect(securityLogs.length).toBeGreaterThan(0);

      // Verify proper categorization
      securityLogs.forEach((log) => {
        expect(['FINANCIAL_TRANSACTION', 'ROLE_ASSIGN']).toContain(log.action);
        expect(log.category).toBe('SECURITY');
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent operations efficiently', async () => {
      const adminToken = jwt.sign(
        { _id: adminUser._id, email: adminUser.email, role: adminUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Create multiple concurrent requests
      const concurrentRequests = [];
      for (let i = 0; i < 10; i++) {
        concurrentRequests.push(
          request(testApp)
            .post('/api/kyc/documents')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              userId: `user-${i}@example.com`,
              documentType: 'passport',
              documentNumber: `P${i}23456789`,
            })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds

      // Verify all operations are logged
      const auditLogs = await mongoose.connection.db
        .collection('auditLogs')
        .find({
          action: 'KYC_DOCUMENT_UPLOAD',
        })
        .toArray();

      expect(auditLogs).toHaveLength(10);
    });

    test('should maintain performance with encryption overhead', async () => {
      const adminToken = jwt.sign(
        { _id: adminUser._id, email: adminUser.email, role: adminUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const largeData = 'x'.repeat(5000); // 5KB of data

      const startTime = Date.now();

      const response = await request(testApp)
        .post('/api/kyc/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: regularUser._id,
          documentType: 'passport',
          documentNumber: largeData,
          issuingAuthority: largeData,
        });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(processingTime).toBeLessThan(1000); // 1 second

      // Verify data is properly encrypted despite size
      const kycDoc = await KYCDocument.findById(response.body.documentId);
      expect(kycDoc.documentNumber).toHaveProperty('encrypted', true);
      expect(kycDoc.issuingAuthority).toHaveProperty('encrypted', true);
    });
  });
});
