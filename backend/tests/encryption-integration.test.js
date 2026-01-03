/**
 * Integration Tests for Encryption System
 *
 * This test suite covers encryption service, middleware, and integration
 * with role management and audit logging systems.
 */

import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import encryptionService from '../src/services/encryption.service.js';
import {
  encryptRequestData,
  decryptResponseData,
  encryptDatabaseFields,
  decryptDatabaseFields,
  conditionalDecryption,
} from '../src/middleware/encryption.middleware.js';
import User from '../src/models/user.model.js';
import PaymentTransaction from '../src/models/payment/paymentTransaction.model.js';
import KYCDocument from '../src/models/metrics/kycDocument.model.js';

// Mock dependencies
jest.mock('../src/helpers/logger.js');
jest.mock('../src/services/auditLog.service.js');

// Test app setup
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Test endpoints with encryption middleware
  app.post('/api/users', encryptRequestData('user'), (req, res) => {
    res.json({ success: true, data: req.body });
  });

  app.get('/api/users/:id', decryptResponseData('user'), async (req, res) => {
    const user = await User.findById(req.params.id);
    res.json({ success: true, data: user });
  });

  app.post(
    '/api/payments',
    encryptRequestData('paymentTransaction'),
    async (req, res) => {
      const transaction = new PaymentTransaction(req.body);
      await transaction.save();
      res.json({ success: true, data: transaction });
    }
  );

  app.post('/api/kyc', encryptRequestData('kycDocument'), async (req, res) => {
    const kycDoc = new KYCDocument(req.body);
    await kycDoc.save();
    res.json({ success: true, data: kycDoc });
  });

  return app;
};

describe('Encryption System Integration Tests', () => {
  let testApp;
  let testUser;

  beforeAll(async () => {
    // Set up test environment
    process.env.ENCRYPTION_MASTER_KEY =
      'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890';
    process.env.ENCRYPTION_SALT =
      'fedcba0987654321fedcba0987654321fedcba0987654321';

    // Connect to test database
    const mongoUri =
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/boosty-test';
    await mongoose.connect(mongoUri);
    testApp = createTestApp();
  });

  afterAll(async () => {
    // Clean up and disconnect
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

    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      address: '123 Test St, Test City, TC 12345',
      role: 'user',
      status: 'active',
    });
    await testUser.save();
  });

  describe('Field Level Encryption', () => {
    test('should encrypt sensitive user data on request', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        address: '123 Main St, City, State',
        role: 'user',
      };

      const response = await request(testApp).post('/api/users').send(userData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Check that sensitive fields are encrypted
      const encryptedData = response.body.data;
      expect(encryptedData.email).toHaveProperty('encrypted', true);
      expect(encryptedData.phone).toHaveProperty('encrypted', true);
      expect(encryptedData.address).toHaveProperty('encrypted', true);

      // Non-sensitive fields should not be encrypted
      expect(encryptedData.name).toBe('John Doe');
      expect(encryptedData.role).toBe('user');
    });

    test('should decrypt sensitive user data on response', async () => {
      const response = await request(testApp).get(`/api/users/${testUser._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const userData = response.body.data;
      expect(userData.email).toBe('test@example.com');
      expect(userData.phone).toBe('+1234567890');
      expect(userData.address).toBe('123 Test St, Test City, TC 12345');
    });

    test('should encrypt payment transaction sensitive data', async () => {
      const transactionData = {
        userId: testUser._id,
        amount: 1000,
        accountNumber: '1234567890123456',
        routingNumber: '021000021',
        bankName: 'Test Bank',
        cardLastFour: '1234',
      };

      const response = await request(testApp)
        .post('/api/payments')
        .send(transactionData);

      expect(response.status).toBe(200);

      const savedTransaction = response.body.data;
      expect(savedTransaction.accountNumber).toHaveProperty('encrypted', true);
      expect(savedTransaction.routingNumber).toHaveProperty('encrypted', true);
      expect(savedTransaction.bankName).toHaveProperty('encrypted', true);
      expect(savedTransaction.cardLastFour).toHaveProperty('encrypted', true);

      // Non-sensitive fields should not be encrypted
      expect(savedTransaction.amount).toBe(1000);
      expect(savedTransaction.userId).toEqual(testUser._id);
    });

    test('should encrypt KYC document sensitive data', async () => {
      const kycData = {
        userId: testUser._id,
        documentType: 'passport',
        documentNumber: 'P123456789',
        issuingAuthority: 'US Department of State',
        personalIdentifiers: {
          ssn: '123-45-6789',
          passportNumber: 'P123456789',
        },
      };

      const response = await request(testApp).post('/api/kyc').send(kycData);

      expect(response.status).toBe(200);

      const savedKyc = response.body.data;
      expect(savedKyc.documentNumber).toHaveProperty('encrypted', true);
      expect(savedKyc.issuingAuthority).toHaveProperty('encrypted', true);
      expect(savedKyc.personalIdentifiers).toHaveProperty('encrypted', true);

      // Non-sensitive fields should not be encrypted
      expect(savedKyc.userId).toEqual(testUser._id);
      expect(savedKyc.documentType).toBe('passport');
    });
  });

  describe('Encryption Service Direct Operations', () => {
    test('should encrypt and decrypt data correctly', async () => {
      const originalData = 'Sensitive information that should be encrypted';

      const encrypted = await encryptionService.encrypt(originalData);
      const decrypted = await encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
      expect(encrypted).toHaveProperty('data');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted).toHaveProperty('metadata');
    });

    test('should handle different data types', async () => {
      const testCases = [
        { value: 'string data', type: 'string' },
        { value: 12345, type: 'number' },
        { value: true, type: 'boolean' },
        { value: { nested: 'object' }, type: 'object' },
        { value: [1, 2, 3], type: 'array' },
      ];

      for (const testCase of testCases) {
        const encrypted = await encryptionService.encryptField(
          testCase.value,
          'test',
          'testField'
        );
        const decrypted = await encryptionService.decryptField(
          encrypted,
          'test',
          'testField'
        );

        expect(decrypted).toEqual(testCase.value);
      }
    });

    test('should generate unique IVs for each encryption', async () => {
      const data = 'test data';
      const encrypted1 = await encryptionService.encrypt(data);
      const encrypted2 = await encryptionService.encrypt(data);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.data).not.toBe(encrypted2.data);
    });

    test('should handle key rotation', async () => {
      const data = 'test data for key rotation';

      // Encrypt with version 1
      const encrypted1 = await encryptionService.encrypt(data, 1);

      // Rotate key
      const newVersion = await encryptionService.rotateKeys();
      expect(newVersion).toBe(2);

      // Encrypt with version 2
      const encrypted2 = await encryptionService.encrypt(data, 2);

      // Both should decrypt correctly
      const decrypted1 = await encryptionService.decrypt(encrypted1);
      const decrypted2 = await encryptionService.decrypt(encrypted2);

      expect(decrypted1).toBe(data);
      expect(decrypted2).toBe(data);
    });
  });

  describe('Database Integration', () => {
    test('should encrypt fields when saving to database', async () => {
      const user = new User({
        name: 'Test User',
        email: 'encrypted@example.com',
        phone: '+9876543210',
        address: '456 Encrypted St, Secure City',
        role: 'user',
      });

      // Apply database encryption middleware
      await encryptDatabaseFields('user').call(user);
      await user.save();

      // Verify fields are encrypted in database
      const savedUser = await User.findById(user._id);
      expect(savedUser.email).toHaveProperty('encrypted', true);
      expect(savedUser.phone).toHaveProperty('encrypted', true);
      expect(savedUser.address).toHaveProperty('encrypted', true);
    });

    test('should decrypt fields when retrieving from database', async () => {
      // Create user with encrypted data
      const user = new User({
        name: 'Test User',
        email: 'encrypted@example.com',
        phone: '+9876543210',
        address: '456 Encrypted St, Secure City',
        role: 'user',
      });

      await encryptDatabaseFields('user').call(user);
      await user.save();

      // Apply decryption middleware
      const decryptedUser = await decryptDatabaseFields('user').call(user);

      expect(decryptedUser.email).toBe('encrypted@example.com');
      expect(decryptedUser.phone).toBe('+9876543210');
      expect(decryptedUser.address).toBe('456 Encrypted St, Secure City');
    });
  });

  describe('Performance Tests', () => {
    test('should complete encryption within acceptable time limits', async () => {
      const largeData = 'x'.repeat(10000); // 10KB
      const iterations = 100;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await encryptionService.encrypt(largeData);
      }

      const endTime = Date.now();
      const avgTime = (endTime - startTime) / iterations;

      // Should complete within 100ms on average
      expect(avgTime).toBeLessThan(100);
    });

    test('should complete decryption within acceptable time limits', async () => {
      const largeData = 'x'.repeat(10000); // 10KB
      const encrypted = await encryptionService.encrypt(largeData);
      const iterations = 100;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await encryptionService.decrypt(encrypted);
      }

      const endTime = Date.now();
      const avgTime = (endTime - startTime) / iterations;

      // Should complete within 50ms on average (decryption is faster)
      expect(avgTime).toBeLessThan(50);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing encryption key', async () => {
      delete process.env.ENCRYPTION_MASTER_KEY;

      await expect(encryptionService.encrypt('test data')).rejects.toThrow(
        'ENCRYPTION_MASTER_KEY environment variable is required'
      );

      // Restore for other tests
      process.env.ENCRYPTION_MASTER_KEY =
        'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890';
    });

    test('should handle corrupted encrypted data', async () => {
      const corruptedData = {
        data: 'corrupted_data',
        iv: 'invalid_iv',
        tag: 'invalid_tag',
        metadata: { version: 1, keyId: 'test-key' },
      };

      await expect(encryptionService.decrypt(corruptedData)).rejects.toThrow(
        'Decryption failed'
      );
    });

    test('should handle missing encrypted fields', async () => {
      const incompleteData = {
        data: 'some_data',
        // Missing iv, tag, metadata
      };

      await expect(encryptionService.decrypt(incompleteData)).rejects.toThrow(
        'Decryption failed'
      );
    });

    test('should handle empty/null values gracefully', async () => {
      const testCases = [null, undefined, '', 0, false];

      for (const testCase of testCases) {
        const encrypted = await encryptionService.encryptField(
          testCase,
          'test',
          'testField'
        );
        const decrypted = await encryptionService.decryptField(
          encrypted,
          'test',
          'testField'
        );

        expect(decrypted).toEqual(testCase);
      }
    });
  });

  describe('Security Validation', () => {
    test('should use different IVs for identical data', async () => {
      const data = 'identical sensitive data';
      const encrypted1 = await encryptionService.encrypt(data);
      const encrypted2 = await encryptionService.encrypt(data);

      // Same data should have different ciphertext due to random IV
      expect(encrypted1.data).not.toBe(encrypted2.data);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);

      // But both should decrypt to the same original
      const decrypted1 = await encryptionService.decrypt(encrypted1);
      const decrypted2 = await encryptionService.decrypt(encrypted2);

      expect(decrypted1).toBe(data);
      expect(decrypted2).toBe(data);
    });

    test('should include authentication tag for integrity', async () => {
      const data = 'data that must be authenticated';
      const encrypted = await encryptionService.encrypt(data);

      expect(encrypted.tag).toBeDefined();
      expect(encrypted.tag.length).toBe(32); // 128 bits = 32 hex chars

      // Tag should be different for different data
      const encrypted2 = await encryptionService.encrypt('different data');
      expect(encrypted.tag).not.toBe(encrypted2.tag);
    });

    test('should fail decryption with wrong authentication tag', async () => {
      const data = 'sensitive data';
      const encrypted = await encryptionService.encrypt(data);

      // Tamper with the authentication tag
      encrypted.tag = '0'.repeat(32);

      await expect(encryptionService.decrypt(encrypted)).rejects.toThrow(
        'Decryption failed'
      );
    });
  });

  describe('Integration with Role Management', () => {
    test('should respect role-based decryption permissions', async () => {
      // This would test conditional decryption based on user roles
      const mockReq = {
        user: { role: 'user', permissions: [] },
      };

      const mockRes = {};
      const next = jest.fn();

      await conditionalDecryption()(mockReq, mockRes, next);

      expect(mockReq.canViewDecrypted).toBe(false);
      expect(mockReq.keepEncrypted).toBe(true);

      // Test with admin user
      const adminReq = {
        user: { role: 'admin', permissions: [] },
      };

      await conditionalDecryption()(adminReq, mockRes, next);

      expect(adminReq.canViewDecrypted).toBe(true);
      expect(adminReq.keepEncrypted).toBeUndefined();
    });
  });
});
