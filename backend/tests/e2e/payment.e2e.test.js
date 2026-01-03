import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/express.js';
import PaymentIntent from '../../src/models/payment/paymentIntent.model.js';
import PaymentTransaction from '../../src/models/payment/paymentTransaction.model.js';
import Payout from '../../src/models/payment/payout.model.js';
import User from '../../src/models/user.model.js';
import {
  generateMockPaymentIntent,
  generateMockPaymentTransaction,
  generateMockPayout,
  generatePaystackWebhookEvent,
  generateWebhookSignature,
  setupTestDatabase,
  cleanupTestDatabase,
  createAuthHeaders,
  createMockUser
} from '../helpers/payment.test.helpers.js';

describe('Payment End-to-End Tests', () => {
  let authToken;
  let adminAuthToken;
  let testUser;
  let adminUser;
  let webhookSecret;

  beforeAll(async () => {
    await setupTestDatabase();
    
    webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET || 'test_webhook_secret';
    
    // Create test users
    testUser = await User.create(createMockUser({
      email: 'user@example.com',
      role: 'user',
      isEmailVerified: true
    }));
    
    adminUser = await User.create(createMockUser({
      email: 'admin@example.com',
      role: 'admin',
      isEmailVerified: true
    }));
    
    // Generate auth tokens
    authToken = 'test_user_token';
    adminAuthToken = 'test_admin_token';
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Complete Payment Lifecycle', () => {
    it('should handle full payment flow from initiation to completion', async () => {
      // Step 1: Initialize payment
      const paymentInitData = {
        amount: 50000,
        type: 'investment',
        paymentMethod: 'card',
        metadata: {
          investmentId: 'INV001',
          investmentType: 'solar_panel',
          description: 'Solar panel investment'
        }
      };

      const initResponse = await request(app)
        .post('/api/payments/initialize')
        .set(createAuthHeaders(authToken))
        .send(paymentInitData)
        .expect(200);

      expect(initResponse.body.success).toBe(true);
      expect(initResponse.body.data).toHaveProperty('paymentIntent');
      expect(initResponse.body.data.paymentIntent.status).toBe('pending');
      expect(initResponse.body.data).toHaveProperty('authorizationUrl');
      expect(initResponse.body.data).toHaveProperty('accessCode');

      const { paymentIntent, authorizationUrl } = initResponse.body.data;
      const intentId = paymentIntent.intentId;

      // Step 2: Verify payment intent was created in database
      const savedIntent = await PaymentIntent.findOne({ intentId });
      expect(savedIntent).toBeTruthy();
      expect(savedIntent.amount).toBe(50000);
      expect(savedIntent.type).toBe('investment');
      expect(savedIntent.status).toBe('pending');

      // Step 3: Simulate successful payment via webhook
      const webhookData = generatePaystackWebhookEvent('charge.success', {
        reference: paymentIntent.reference,
        amount: 50000,
        status: 'success',
        paid_at: new Date().toISOString(),
        customer: {
          email: testUser.email,
          customer_code: 'CUS_001'
        },
        authorization: {
          authorization_code: 'AUTH_001',
          card_type: 'visa',
          last4: '4242'
        }
      });

      const signature = generateWebhookSignature(webhookSecret, webhookData);

      const webhookResponse = await request(app)
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', signature)
        .send(webhookData)
        .expect(200);

      expect(webhookResponse.body.success).toBe(true);

      // Step 4: Verify payment was completed
      const completedIntent = await PaymentIntent.findOne({ intentId });
      expect(completedIntent.status).toBe('completed');
      expect(completedIntent.completedAt).toBeInstanceOf(Date);

      // Step 5: Verify payment transaction was created
      const transaction = await PaymentTransaction.findOne({ reference: paymentIntent.reference });
      expect(transaction).toBeTruthy();
      expect(transaction.status).toBe('completed');
      expect(transaction.amount).toBe(50000);

      // Step 6: Verify payment verification endpoint
      const verifyResponse = await request(app)
        .post(`/api/payments/${paymentIntent.reference}/verify`)
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.payment.status).toBe('completed');
    });

    it('should handle payment failure and retry flow', async () => {
      // Step 1: Initialize payment
      const paymentInitData = {
        amount: 30000,
        type: 'investment',
        paymentMethod: 'card',
        metadata: {
          investmentId: 'INV002',
          investmentType: 'battery_storage'
        }
      };

      const initResponse = await request(app)
        .post('/api/payments/initialize')
        .set(createAuthHeaders(authToken))
        .send(paymentInitData)
        .expect(200);

      const { paymentIntent } = initResponse.body.data;
      const intentId = paymentIntent.intentId;

      // Step 2: Simulate failed payment via webhook
      const failedWebhookData = generatePaystackWebhookEvent('charge.failed', {
        reference: paymentIntent.reference,
        amount: 30000,
        status: 'failed',
        paid_at: null,
        customer: {
          email: testUser.email,
          customer_code: 'CUS_002'
        },
        gateway_response: 'Insufficient Funds'
      });

      const failedSignature = generateWebhookSignature(webhookSecret, failedWebhookData);

      const failedWebhookResponse = await request(app)
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', failedSignature)
        .send(failedWebhookData)
        .expect(200);

      expect(failedWebhookResponse.body.success).toBe(true);

      // Step 3: Verify payment was marked as failed
      const failedIntent = await PaymentIntent.findOne({ intentId });
      expect(failedIntent.status).toBe('failed');
      expect(failedIntent.failureReason).toBe('Insufficient Funds');

      // Step 4: Retry payment with new initialization
      const retryResponse = await request(app)
        .post('/api/payments/initialize')
        .set(createAuthHeaders(authToken))
        .send({
          ...paymentInitData,
          metadata: {
            ...paymentInitData.metadata,
            originalIntentId: intentId,
            retryAttempt: 1
          }
        })
        .expect(200);

      expect(retryResponse.body.success).toBe(true);
      expect(retryResponse.body.data.paymentIntent.metadata.retryAttempt).toBe(1);

      // Step 5: Simulate successful retry payment
      const successWebhookData = generatePaystackWebhookEvent('charge.success', {
        reference: retryResponse.body.data.paymentIntent.reference,
        amount: 30000,
        status: 'success',
        paid_at: new Date().toISOString(),
        customer: {
          email: testUser.email,
          customer_code: 'CUS_002'
        }
      });

      const successSignature = generateWebhookSignature(webhookSecret, successWebhookData);

      const successWebhookResponse = await request(app)
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', successSignature)
        .send(successWebhookData)
        .expect(200);

      expect(successWebhookResponse.body.success).toBe(true);

      // Step 6: Verify retry payment was completed
      const retryIntent = await PaymentIntent.findOne({
        intentId: retryResponse.body.data.paymentIntent.intentId
      });
      expect(retryIntent.status).toBe('completed');
    });
  });

  describe('Refund Processing Flow', () => {
    it('should handle complete refund process', async () => {
      // Step 1: Create a completed payment for refund testing
      const paymentIntent = await PaymentIntent.create(
        generateMockPaymentIntent({
          intentId: 'REFUND_TEST_001',
          status: 'completed',
          amount: 25000,
          reference: 'REF_REFUND_001',
          userId: testUser._id,
          completedAt: new Date()
        })
      );

      const paymentTransaction = await PaymentTransaction.create(
        generateMockPaymentTransaction({
          transactionId: 'TXN_REFUND_001',
          status: 'completed',
          amount: 25000,
          reference: 'REF_REFUND_001',
          intentId: paymentIntent._id,
          completedAt: new Date()
        })
      );

      // Step 2: Initiate refund
      const refundData = {
        transactionId: paymentTransaction.transactionId,
        amount: 25000,
        reason: 'Customer requested refund'
      };

      const refundResponse = await request(app)
        .post('/api/payments/refund')
        .set(createAuthHeaders(adminAuthToken))
        .send(refundData)
        .expect(200);

      expect(refundResponse.body.success).toBe(true);
      expect(refundResponse.body.data).toHaveProperty('refund');
      expect(refundResponse.body.data.refund.status).toBe('processing');

      // Step 3: Verify refund transaction was created
      const refundTransaction = await PaymentTransaction.findOne({
        reference: refundResponse.body.data.refund.reference
      });
      expect(refundTransaction).toBeTruthy();
      expect(refundTransaction.type).toBe('refund');
      expect(refundTransaction.status).toBe('processing');
      expect(refundTransaction.amount).toBe(-25000); // Negative for refund

      // Step 4: Simulate successful refund webhook
      const refundWebhookData = generatePaystackWebhookEvent('refund.success', {
        reference: refundResponse.body.data.refund.reference,
        amount: 25000,
        status: 'success',
        transaction: {
          reference: paymentTransaction.reference
        }
      });

      const refundSignature = generateWebhookSignature(webhookSecret, refundWebhookData);

      const refundWebhookResponse = await request(app)
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', refundSignature)
        .send(refundWebhookData)
        .expect(200);

      expect(refundWebhookResponse.body.success).toBe(true);

      // Step 5: Verify refund was completed
      const completedRefund = await PaymentTransaction.findOne({
        reference: refundResponse.body.data.refund.reference
      });
      expect(completedRefund.status).toBe('completed');
      expect(completedRefund.completedAt).toBeInstanceOf(Date);
    });

    it('should handle partial refund', async () => {
      // Step 1: Create a completed payment for partial refund testing
      const paymentIntent = await PaymentIntent.create(
        generateMockPaymentIntent({
          intentId: 'PARTIAL_REFUND_001',
          status: 'completed',
          amount: 50000,
          reference: 'REF_PARTIAL_001',
          userId: testUser._id,
          completedAt: new Date()
        })
      );

      const paymentTransaction = await PaymentTransaction.create(
        generateMockPaymentTransaction({
          transactionId: 'TXN_PARTIAL_001',
          status: 'completed',
          amount: 50000,
          reference: 'REF_PARTIAL_001',
          intentId: paymentIntent._id,
          completedAt: new Date()
        })
      );

      // Step 2: Initiate partial refund
      const partialRefundData = {
        transactionId: paymentTransaction.transactionId,
        amount: 20000, // Partial refund amount
        reason: 'Partial refund for unused portion'
      };

      const refundResponse = await request(app)
        .post('/api/payments/refund')
        .set(createAuthHeaders(adminAuthToken))
        .send(partialRefundData)
        .expect(200);

      expect(refundResponse.body.success).toBe(true);
      expect(refundResponse.body.data.refund.amount).toBe(20000);

      // Step 3: Verify original payment status remains completed
      const originalPayment = await PaymentIntent.findOne({ intentId: 'PARTIAL_REFUND_001' });
      expect(originalPayment.status).toBe('completed');

      // Step 4: Verify refund transaction was created with correct amount
      const refundTransaction = await PaymentTransaction.findOne({
        reference: refundResponse.body.data.refund.reference
      });
      expect(refundTransaction.amount).toBe(-20000);
    });
  });

  describe('Payout Distribution Flow', () => {
    it('should handle complete payout distribution process', async () => {
      // Step 1: Create a payout for testing
      const payoutData = {
        type: 'roi_payment',
        amount: 15000,
        recipientId: testUser._id,
        recipientType: 'user',
        recipientAccount: {
          accountNumber: '1234567890',
          bankCode: '044',
          accountName: 'Test User'
        },
        calculationBasis: {
          investmentAmount: 100000,
          investmentPeriod: 12,
          interestRate: 15,
          roiPercentage: 15,
          profitAmount: 15000
        }
      };

      const createPayoutResponse = await request(app)
        .post('/api/payouts')
        .set(createAuthHeaders(adminAuthToken))
        .send(payoutData)
        .expect(201);

      expect(createPayoutResponse.body.success).toBe(true);
      expect(createPayoutResponse.body.data.payout.status).toBe('pending');

      const payoutId = createPayoutResponse.body.data.payout.payoutId;

      // Step 2: Approve payout
      const approveResponse = await request(app)
        .put(`/api/payouts/${payoutId}/approve`)
        .set(createAuthHeaders(adminAuthToken))
        .expect(200);

      expect(approveResponse.body.success).toBe(true);

      // Step 3: Verify payout was approved
      const approvedPayout = await Payout.findOne({ payoutId });
      expect(approvedPayout.approvalStatus).toBe('approved');
      expect(approvedPayout.approvedAt).toBeInstanceOf(Date);

      // Step 4: Process payout
      const processResponse = await request(app)
        .post('/api/payouts/process')
        .set(createAuthHeaders(adminAuthToken))
        .send({ payoutIds: [payoutId] })
        .expect(200);

      expect(processResponse.body.success).toBe(true);
      expect(processResponse.body.data.processed).toBe(1);

      // Step 5: Simulate successful transfer webhook
      const transferWebhookData = generatePaystackWebhookEvent('transfer.success', {
        reference: approvedPayout.transferReference,
        amount: 15000,
        status: 'success',
        recipient: {
          recipient_code: 'RCP_001',
          name: 'Test User',
          type: 'nuban'
        },
        transferred_at: new Date().toISOString()
      });

      const transferSignature = generateWebhookSignature(webhookSecret, transferWebhookData);

      const transferWebhookResponse = await request(app)
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', transferSignature)
        .send(transferWebhookData)
        .expect(200);

      expect(transferWebhookResponse.body.success).toBe(true);

      // Step 6: Verify payout was completed
      const completedPayout = await Payout.findOne({ payoutId });
      expect(completedPayout.status).toBe('completed');
      expect(completedPayout.completedAt).toBeInstanceOf(Date);
    });

    it('should handle payout rejection and resubmission', async () => {
      // Step 1: Create a payout for rejection testing
      const payoutData = {
        type: 'profit_sharing',
        amount: 8000,
        recipientId: testUser._id,
        recipientType: 'user',
        recipientAccount: {
          accountNumber: '0987654321',
          bankCode: '057',
          accountName: 'Test User'
        }
      };

      const createPayoutResponse = await request(app)
        .post('/api/payouts')
        .set(createAuthHeaders(adminAuthToken))
        .send(payoutData)
        .expect(201);

      const payoutId = createPayoutResponse.body.data.payout.payoutId;

      // Step 2: Reject payout
      const rejectResponse = await request(app)
        .put(`/api/payouts/${payoutId}/reject`)
        .set(createAuthHeaders(adminAuthToken))
        .send({ reason: 'Invalid account details' })
        .expect(200);

      expect(rejectResponse.body.success).toBe(true);

      // Step 3: Verify payout was rejected
      const rejectedPayout = await Payout.findOne({ payoutId });
      expect(rejectedPayout.approvalStatus).toBe('rejected');
      expect(rejectedPayout.rejectionReason).toBe('Invalid account details');

      // Step 4: Update payout details and resubmit
      const updateResponse = await request(app)
        .put(`/api/payouts/${payoutId}`)
        .set(createAuthHeaders(adminAuthToken))
        .send({
          recipientAccount: {
            accountNumber: '1111222233',
            bankCode: '044',
            accountName: 'Test User'
          }
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // Step 5: Approve updated payout
      const approveResponse = await request(app)
        .put(`/api/payouts/${payoutId}/approve`)
        .set(createAuthHeaders(adminAuthToken))
        .expect(200);

      expect(approveResponse.body.success).toBe(true);

      // Step 6: Verify payout was approved after resubmission
      const approvedPayout = await Payout.findOne({ payoutId });
      expect(approvedPayout.approvalStatus).toBe('approved');
      expect(approvedPayout.recipientAccount.accountNumber).toBe('1111222233');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle webhook processing failures gracefully', async () => {
      // Step 1: Create a payment intent
      const paymentIntent = await PaymentIntent.create(
        generateMockPaymentIntent({
          intentId: 'ERROR_TEST_001',
          status: 'pending',
          amount: 10000,
          reference: 'REF_ERROR_001',
          userId: testUser._id
        })
      );

      // Step 2: Send webhook with invalid data
      const invalidWebhookData = {
        event: 'charge.success',
        data: {
          reference: paymentIntent.reference,
          amount: 10000,
          status: 'success',
          // Missing required fields
        }
      };

      const signature = generateWebhookSignature(webhookSecret, invalidWebhookData);

      const webhookResponse = await request(app)
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', signature)
        .send(invalidWebhookData)
        .expect(400);

      expect(webhookResponse.body.success).toBe(false);
      expect(webhookResponse.body.code).toBe('INVALID_WEBHOOK_DATA');

      // Step 3: Verify payment intent remains unchanged
      const unchangedIntent = await PaymentIntent.findOne({ intentId: 'ERROR_TEST_001' });
      expect(unchangedIntent.status).toBe('pending');
    });

    it('should handle database connection failures during payment processing', async () => {
      // Step 1: Mock database connection failure
      const originalSave = PaymentIntent.prototype.save;
      PaymentIntent.prototype.save = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      // Step 2: Attempt to initialize payment
      const paymentInitData = {
        amount: 5000,
        type: 'investment',
        paymentMethod: 'card'
      };

      const initResponse = await request(app)
        .post('/api/payments/initialize')
        .set(createAuthHeaders(authToken))
        .send(paymentInitData)
        .expect(500);

      expect(initResponse.body.success).toBe(false);
      expect(initResponse.body.code).toBe('DATABASE_ERROR');

      // Step 3: Restore original save method
      PaymentIntent.prototype.save = originalSave;
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent payment processing', async () => {
      const paymentPromises = [];
      const startTime = Date.now();

      // Step 1: Create 50 concurrent payment requests
      for (let i = 0; i < 50; i++) {
        const paymentInitData = {
          amount: 1000 + (i * 10),
          type: 'investment',
          paymentMethod: 'card',
          metadata: {
            batchId: 'CONCURRENT_TEST',
            index: i
          }
        };

        paymentPromises.push(
          request(app)
            .post('/api/payments/initialize')
            .set(createAuthHeaders(authToken))
            .send(paymentInitData)
        );
      }

      // Step 2: Wait for all payment requests to complete
      const responses = await Promise.all(paymentPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Step 3: Verify all payments were initialized successfully
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.paymentIntent.amount).toBe(1000 + (index * 10));
      });

      // Step 4: Verify performance (should complete within 10 seconds)
      expect(totalTime).toBeLessThan(10000);

      // Step 5: Verify all payment intents were created in database
      const paymentIntents = await PaymentIntent.find({
        'metadata.batchId': 'CONCURRENT_TEST'
      });
      expect(paymentIntents).toHaveLength(50);
    });

    it('should handle large dataset queries efficiently', async () => {
      // Step 1: Create 1000 payment transactions
      const transactions = [];
      for (let i = 0; i < 1000; i++) {
        transactions.push(generateMockPaymentTransaction({
          transactionId: `LARGE_TEST_TXN_${i}`,
          status: i % 2 === 0 ? 'completed' : 'pending',
          amount: 1000 + (i * 5),
          reference: `LARGE_TEST_REF_${i}`,
          userId: testUser._id,
          createdAt: new Date(Date.now() - (i * 60000)) // Staggered timestamps
        }));
      }

      await PaymentTransaction.create(transactions);

      // Step 2: Test transaction history endpoint with large dataset
      const startTime = Date.now();
      const historyResponse = await request(app)
        .get('/api/transactions/history')
        .set(createAuthHeaders(authToken))
        .query({ limit: 100, page: 1 })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Step 3: Verify response structure and performance
      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data.transactions).toHaveLength(100);
      expect(historyResponse.body.data.pagination.total).toBe(1000);
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Step 4: Test filtered queries
      const filteredResponse = await request(app)
        .get('/api/transactions/history')
        .set(createAuthHeaders(authToken))
        .query({ status: 'completed', limit: 50 })
        .expect(200);

      expect(filteredResponse.body.data.transactions).toHaveLength(50);
      filteredResponse.body.data.transactions.forEach(transaction => {
        expect(transaction.status).toBe('completed');
      });
    });
  });

  describe('Security and Compliance', () => {
    it('should prevent unauthorized access to payment operations', async () => {
      // Step 1: Attempt to initialize payment without authentication
      const paymentInitData = {
        amount: 10000,
        type: 'investment',
        paymentMethod: 'card'
      };

      const unauthorizedResponse = await request(app)
        .post('/api/payments/initialize')
        .send(paymentInitData)
        .expect(401);

      expect(unauthorizedResponse.body.success).toBe(false);
      expect(unauthorizedResponse.body.code).toBe('UNAUTHORIZED');

      // Step 2: Attempt to access admin-only endpoints with user token
      const adminOnlyResponse = await request(app)
        .post('/api/payouts')
        .set(createAuthHeaders(authToken)) // User token, not admin
        .send({
          type: 'roi_payment',
          amount: 5000,
          recipientId: testUser._id
        })
        .expect(403);

      expect(adminOnlyResponse.body.success).toBe(false);
      expect(adminOnlyResponse.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate input data and prevent injection attacks', async () => {
      // Step 1: Attempt SQL injection through payment metadata
      const maliciousData = {
        amount: 10000,
        type: 'investment',
        paymentMethod: 'card',
        metadata: {
          description: "'; DROP TABLE payment_intents; --"
        }
      };

      const injectionResponse = await request(app)
        .post('/api/payments/initialize')
        .set(createAuthHeaders(authToken))
        .send(maliciousData)
        .expect(400);

      expect(injectionResponse.body.success).toBe(false);

      // Step 2: Verify database integrity is maintained
      const paymentIntents = await PaymentIntent.find({});
      expect(paymentIntents.length).toBeGreaterThan(0); // Table should still exist
    });

    it('should handle webhook signature verification', async () => {
      // Step 1: Send webhook with invalid signature
      const webhookData = generatePaystackWebhookEvent('charge.success', {
        reference: 'SIGNATURE_TEST',
        amount: 10000,
        status: 'success'
      });

      const invalidSignatureResponse = await request(app)
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', 'invalid_signature')
        .send(webhookData)
        .expect(401);

      expect(invalidSignatureResponse.body.success).toBe(false);
      expect(invalidSignatureResponse.body.code).toBe('WEBHOOK_SIGNATURE_INVALID');

      // Step 2: Send webhook with valid signature
      const validSignature = generateWebhookSignature(webhookSecret, webhookData);

      const validSignatureResponse = await request(app)
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', validSignature)
        .send(webhookData)
        .expect(200);

      expect(validSignatureResponse.body.success).toBe(true);
    });
  });
});