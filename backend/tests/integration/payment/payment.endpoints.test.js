import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../src/express.js';
import PaymentIntent from '../../../src/models/payment/paymentIntent.model.js';
import PaymentTransaction from '../../../src/models/payment/paymentTransaction.model.js';
import Payout from '../../../src/models/payment/payout.model.js';
import {
  generateMockPaymentIntent,
  generateMockPaymentTransaction,
  generateMockPayout,
  generateMockPaystackResponse,
  generateWebhookSignature,
  setupTestDatabase,
  cleanupTestDatabase,
  createAuthHeaders
} from '../../helpers/payment.test.helpers.js';

describe('Payment Endpoints Integration Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test user for authentication
    testUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      role: 'user'
    };
    
    authToken = 'test_jwt_token';
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await PaymentIntent.deleteMany({});
    await PaymentTransaction.deleteMany({});
    await Payout.deleteMany({});
  });

  describe('POST /api/payment/initialize', () => {
    it('should initialize payment successfully', async () => {
      const paymentData = {
        transactionId: 'TXN123456',
        transactionType: 'investment',
        amount: 10000,
        currency: 'NGN',
        paymentMethod: 'card',
        email: 'test@example.com',
        callbackUrl: 'https://example.com/callback',
        metadata: { source: 'test' }
      };

      const response = await request(app)
        .post('/api/payment/initialize')
        .set(createAuthHeaders(authToken))
        .send(paymentData)
        .expect(201);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactionId');
      expect(response.body.data).toHaveProperty('reference');
      expect(response.body.data).toHaveProperty('authorizationUrl');
      expect(response.body.data).toHaveProperty('accessCode');
      expect(response.body.data).toHaveProperty('expiresAt');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing transactionId
        transactionType: 'investment',
        amount: 10000,
        currency: 'NGN',
        paymentMethod: 'card',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/payment/initialize')
        .set(createAuthHeaders(authToken))
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
    });

    it('should validate amount is greater than 0', async () => {
      const invalidData = {
        transactionId: 'TXN123456',
        transactionType: 'investment',
        amount: 0, // Invalid amount
        currency: 'NGN',
        paymentMethod: 'card',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/payment/initialize')
        .set(createAuthHeaders(authToken))
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_AMOUNT');
    });

    it('should validate email format', async () => {
      const invalidData = {
        transactionId: 'TXN123456',
        transactionType: 'investment',
        amount: 10000,
        currency: 'NGN',
        paymentMethod: 'card',
        email: 'invalid-email' // Invalid email
      };

      const response = await request(app)
        .post('/api/payment/initialize')
        .set(createAuthHeaders(authToken))
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_EMAIL');
    });

    it('should require authentication', async () => {
      const paymentData = {
        transactionId: 'TXN123456',
        transactionType: 'investment',
        amount: 10000,
        currency: 'NGN',
        paymentMethod: 'card',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/payment/initialize')
        .send(paymentData)
        .expect(401);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/payment/verify/:reference', () => {
    let paymentIntent;

    beforeEach(async () => {
      // Create a payment intent for verification
      paymentIntent = await PaymentIntent.create(generateMockPaymentIntent({
        status: 'initialized',
        gatewayReference: 'REF123456'
      }));
    });

    it('should verify payment successfully', async () => {
      const response = await request(app)
        .get(`/api/payment/verify/${paymentIntent.gatewayReference}`)
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('amount');
      expect(response.body.data).toHaveProperty('fees');
    });

    it('should return 404 for non-existent reference', async () => {
      const response = await request(app)
        .get('/api/payment/verify/NONEXISTENT')
        .set(createAuthHeaders(authToken))
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TRANSACTION_NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/payment/verify/${paymentIntent.gatewayReference}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/payment/transaction/:transactionId', () => {
    let paymentTransaction;

    beforeEach(async () => {
      // Create a payment transaction
      paymentTransaction = await PaymentTransaction.create(generateMockPaymentTransaction({
        transactionId: 'TXN123456',
        fromEntityId: testUser._id
      }));
    });

    it('should get transaction details successfully', async () => {
      const response = await request(app)
        .get(`/api/payment/transaction/${paymentTransaction.transactionId}`)
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactionId');
      expect(response.body.data).toHaveProperty('type');
      expect(response.body.data).toHaveProperty('amount');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('paymentMethod');
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .get('/api/payment/transaction/NONEXISTENT')
        .set(createAuthHeaders(authToken))
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TRANSACTION_NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/payment/transaction/${paymentTransaction.transactionId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should restrict access to own transactions only', async () => {
      const otherUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'other@example.com',
        role: 'user'
      };

      const otherAuthToken = 'other_jwt_token';

      const response = await request(app)
        .get(`/api/payment/transaction/${paymentTransaction.transactionId}`)
        .set(createAuthHeaders(otherAuthToken))
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ACCESS_DENIED');
    });
  });

  describe('GET /api/payment/transactions', () => {
    beforeEach(async () => {
      // Create multiple payment transactions
      await PaymentTransaction.create([
        generateMockPaymentTransaction({
          transactionId: 'TXN001',
          fromEntityId: testUser._id,
          status: 'completed'
        }),
        generateMockPaymentTransaction({
          transactionId: 'TXN002',
          fromEntityId: testUser._id,
          status: 'pending'
        }),
        generateMockPaymentTransaction({
          transactionId: 'TXN003',
          fromEntityId: testUser._id,
          status: 'failed'
        })
      ]);
    });

    it('should get transactions with pagination', async () => {
      const response = await request(app)
        .get('/api/payment/transactions')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.data).toHaveLength(3);
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('total');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/payment/transactions?status=completed')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      response.body.data.data.forEach(transaction => {
        expect(transaction.status).toBe('completed');
      });
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/payment/transactions?type=investment')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      response.body.data.data.forEach(transaction => {
        expect(transaction.type).toBe('investment');
      });
    });

    it('should filter by payment method', async () => {
      const response = await request(app)
        .get('/api/payment/transactions?paymentMethod=card')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      response.body.data.data.forEach(transaction => {
        expect(transaction.paymentMethod).toBe('card');
      });
    });

    it('should filter by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      const response = await request(app)
        .get(`/api/payment/transactions?startDate=${yesterday.toISOString()}&endDate=${today.toISOString()}`)
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.data.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/payment/transactions')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/payment/refund', () => {
    let paymentTransaction;

    beforeEach(async () => {
      // Create a completed transaction for refund
      paymentTransaction = await PaymentTransaction.create(generateMockPaymentTransaction({
        transactionId: 'TXN123456',
        status: 'completed',
        amount: 10000,
        fromEntityId: testUser._id
      }));
    });

    it('should process refund successfully with admin permissions', async () => {
      const adminUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'admin@example.com',
        role: 'admin'
      };

      const adminAuthToken = 'admin_jwt_token';

      const refundData = {
        transactionId: 'TXN123456',
        amount: 5000,
        reason: 'Customer requested refund',
        customerNote: 'Refund for cancelled order'
      };

      const response = await request(app)
        .post('/api/payment/refund')
        .set(createAuthHeaders(adminAuthToken))
        .send(refundData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('refundId');
      expect(response.body.data).toHaveProperty('transactionId');
      expect(response.body.data).toHaveProperty('amount');
      expect(response.body.data).toHaveProperty('status');
    });

    it('should require admin permissions for refund', async () => {
      const refundData = {
        transactionId: 'TXN123456',
        amount: 5000,
        reason: 'Customer requested refund'
      };

      const response = await request(app)
        .post('/api/payment/refund')
        .set(createAuthHeaders(authToken))
        .send(refundData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate refund request', async () => {
      const adminUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'admin@example.com',
        role: 'admin'
      };

      const adminAuthToken = 'admin_jwt_token';

      const invalidRefundData = {
        // Missing transactionId
        amount: 5000,
        reason: 'Customer requested refund'
      };

      const response = await request(app)
        .post('/api/payment/refund')
        .set(createAuthHeaders(adminAuthToken))
        .send(invalidRefundData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('code');
    });
  });

  describe('GET /api/payment/balance', () => {
    it('should get balance successfully with admin permissions', async () => {
      const adminUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'admin@example.com',
        role: 'admin'
      };

      const adminAuthToken = 'admin_jwt_token';

      const response = await request(app)
        .get('/api/payment/balance')
        .set(createAuthHeaders(adminAuthToken))
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('currency');
      expect(response.body.data).toHaveProperty('balance');
      expect(response.body.data).toHaveProperty('ledger_balance');
    });

    it('should require admin permissions for balance', async () => {
      const response = await request(app)
        .get('/api/payment/balance')
        .set(createAuthHeaders(authToken))
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('POST /api/payment/recipient', () => {
    it('should create transfer recipient successfully with admin permissions', async () => {
      const adminUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'admin@example.com',
        role: 'admin'
      };

      const adminAuthToken = 'admin_jwt_token';

      const recipientData = {
        type: 'nuban',
        name: 'John Doe',
        accountNumber: '1234567890',
        bankCode: '057',
        email: 'john@example.com',
        description: 'Test recipient'
      };

      const response = await request(app)
        .post('/api/payment/recipient')
        .set(createAuthHeaders(adminAuthToken))
        .send(recipientData)
        .expect(201);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recipientCode');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('type');
    });

    it('should require admin permissions for recipient creation', async () => {
      const recipientData = {
        type: 'nuban',
        name: 'John Doe',
        accountNumber: '1234567890',
        bankCode: '057'
      };

      const response = await request(app)
        .post('/api/payment/recipient')
        .set(createAuthHeaders(authToken))
        .send(recipientData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate recipient data', async () => {
      const adminUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'admin@example.com',
        role: 'admin'
      };

      const adminAuthToken = 'admin_jwt_token';

      const invalidRecipientData = {
        // Missing required fields
        name: 'John Doe'
      };

      const response = await request(app)
        .post('/api/payment/recipient')
        .set(createAuthHeaders(adminAuthToken))
        .send(invalidRecipientData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('code');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors consistently', async () => {
      const invalidData = {
        transactionId: 'TXN123456',
        transactionType: 'invalid_type', // Invalid type
        amount: 10000,
        currency: 'NGN',
        paymentMethod: 'card',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/payment/initialize')
        .set(createAuthHeaders(authToken))
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle server errors gracefully', async () => {
      // Mock a server error by temporarily modifying the app
      const originalPost = app.post;
      app.post = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const paymentData = {
        transactionId: 'TXN123456',
        transactionType: 'investment',
        amount: 10000,
        currency: 'NGN',
        paymentMethod: 'card',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/payment/initialize')
        .set(createAuthHeaders(authToken))
        .send(paymentData)
        .expect(500);

      // Restore original method
      app.post = originalPost;

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Rate Limiting', () => {
    it('should implement rate limiting', async () => {
      const paymentData = {
        transactionId: 'TXN123456',
        transactionType: 'investment',
        amount: 10000,
        currency: 'NGN',
        paymentMethod: 'card',
        email: 'test@example.com'
      };

      // Make multiple requests quickly
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/payment/initialize')
          .set(createAuthHeaders(authToken))
          .send(paymentData)
      );

      const responses = await Promise.all(requests);

      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.statusCode === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Response Format', () => {
    it('should return consistent response format', async () => {
      const paymentData = {
        transactionId: 'TXN123456',
        transactionType: 'investment',
        amount: 10000,
        currency: 'NGN',
        paymentMethod: 'card',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/payment/initialize')
        .set(createAuthHeaders(authToken))
        .send(paymentData)
        .expect(201);

      // Check response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include metadata in response', async () => {
      const paymentData = {
        transactionId: 'TXN123456',
        transactionType: 'investment',
        amount: 10000,
        currency: 'NGN',
        paymentMethod: 'card',
        email: 'test@example.com',
        metadata: { source: 'web', version: '1.0' }
      };

      const response = await request(app)
        .post('/api/payment/initialize')
        .set(createAuthHeaders(authToken))
        .send(paymentData)
        .expect(201);

      expect(response.body.data.metadata).toEqual({ source: 'web', version: '1.0' });
    });
  });
});