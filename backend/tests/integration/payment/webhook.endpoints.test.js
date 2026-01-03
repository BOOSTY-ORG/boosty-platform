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
  generatePaystackWebhookEvent,
  generateWebhookSignature,
  setupTestDatabase,
  cleanupTestDatabase
} from '../../helpers/payment.test.helpers.js';

describe('Webhook Endpoints Integration Tests', () => {
  let testPaymentIntent;
  let testPaymentTransaction;
  let testPayout;
  let webhookSecret;

  beforeAll(async () => {
    await setupTestDatabase();
    
    webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET || 'test_webhook_secret';
    
    // Create test payment intent
    testPaymentIntent = await PaymentIntent.create(
      generateMockPaymentIntent({
        intentId: 'PI001',
        status: 'pending',
        amount: 50000,
        reference: 'REF001'
      })
    );
    
    // Create test payment transaction
    testPaymentTransaction = await PaymentTransaction.create(
      generateMockPaymentTransaction({
        transactionId: 'TXN001',
        status: 'pending',
        amount: 50000,
        reference: 'REF001',
        intentId: testPaymentIntent._id
      })
    );
    
    // Create test payout
    testPayout = await Payout.create(
      generateMockPayout({
        payoutId: 'PAY001',
        status: 'pending',
        amount: 10000
      })
    );
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/webhooks/paystack', () => {
    describe('Payment Success Events', () => {
      it('should handle charge.success event', async () => {
        const webhookData = generatePaystackWebhookEvent('charge.success', {
          reference: 'REF001',
          amount: 50000,
          status: 'success',
          paid_at: new Date().toISOString(),
          customer: {
            email: 'test@example.com',
            customer_code: 'CUS_001'
          },
          authorization: {
            authorization_code: 'AUTH_001',
            card_type: 'visa',
            last4: '4242'
          }
        });

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(200);

        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Webhook processed successfully');

        // Verify payment intent was updated
        const updatedIntent = await PaymentIntent.findOne({ intentId: 'PI001' });
        expect(updatedIntent.status).toBe('completed');
        expect(updatedIntent.completedAt).toBeInstanceOf(Date);

        // Verify payment transaction was updated
        const updatedTransaction = await PaymentTransaction.findOne({ transactionId: 'TXN001' });
        expect(updatedTransaction.status).toBe('completed');
        expect(updatedTransaction.completedAt).toBeInstanceOf(Date);
      });

      it('should handle charge.success event with new payment', async () => {
        const webhookData = generatePaystackWebhookEvent('charge.success', {
          reference: 'REF002',
          amount: 30000,
          status: 'success',
          paid_at: new Date().toISOString(),
          customer: {
            email: 'newuser@example.com',
            customer_code: 'CUS_002'
          }
        });

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify new payment intent was created
        const newIntent = await PaymentIntent.findOne({ reference: 'REF002' });
        expect(newIntent).toBeTruthy();
        expect(newIntent.status).toBe('completed');
        expect(newIntent.amount).toBe(30000);

        // Verify new payment transaction was created
        const newTransaction = await PaymentTransaction.findOne({ reference: 'REF002' });
        expect(newTransaction).toBeTruthy();
        expect(newTransaction.status).toBe('completed');
        expect(newTransaction.amount).toBe(30000);
      });
    });

    describe('Payment Failure Events', () => {
      it('should handle charge.failed event', async () => {
        // Create a pending payment for testing failure
        const failedPaymentIntent = await PaymentIntent.create(
          generateMockPaymentIntent({
            intentId: 'PI002',
            status: 'pending',
            amount: 25000,
            reference: 'REF003'
          })
        );

        const webhookData = generatePaystackWebhookEvent('charge.failed', {
          reference: 'REF003',
          amount: 25000,
          status: 'failed',
          paid_at: null,
          customer: {
            email: 'failed@example.com',
            customer_code: 'CUS_003'
          },
          gateway_response: 'Insufficient Funds'
        });

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify payment intent was updated
        const updatedIntent = await PaymentIntent.findOne({ intentId: 'PI002' });
        expect(updatedIntent.status).toBe('failed');
        expect(updatedIntent.failureReason).toBe('Insufficient Funds');
      });

      it('should handle transfer.failed event', async () => {
        const webhookData = generatePaystackWebhookEvent('transfer.failed', {
          reference: 'TRF001',
          amount: 10000,
          status: 'failed',
          recipient: {
            recipient_code: 'RCP_001',
            name: 'Test Recipient',
            type: 'nuban'
          },
          reason: 'Invalid recipient account'
        });

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify payout was updated
        const updatedPayout = await Payout.findOne({ payoutId: 'PAY001' });
        expect(updatedPayout.status).toBe('failed');
        expect(updatedPayout.failureReason).toBe('Invalid recipient account');
      });
    });

    describe('Transfer Events', () => {
      it('should handle transfer.success event', async () => {
        const webhookData = generatePaystackWebhookEvent('transfer.success', {
          reference: 'TRF002',
          amount: 10000,
          status: 'success',
          recipient: {
            recipient_code: 'RCP_001',
            name: 'Test Recipient',
            type: 'nuban'
          },
          transferred_at: new Date().toISOString()
        });

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify payout was updated
        const updatedPayout = await Payout.findOne({ payoutId: 'PAY001' });
        expect(updatedPayout.status).toBe('completed');
        expect(updatedPayout.completedAt).toBeInstanceOf(Date);
      });

      it('should handle transfer.reversed event', async () => {
        const webhookData = generatePaystackWebhookEvent('transfer.reversed', {
          reference: 'TRF003',
          amount: 10000,
          status: 'reversed',
          recipient: {
            recipient_code: 'RCP_001',
            name: 'Test Recipient',
            type: 'nuban'
          },
          reversal_reason: 'Account verification failed'
        });

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify payout was updated
        const updatedPayout = await Payout.findOne({ payoutId: 'PAY001' });
        expect(updatedPayout.status).toBe('reversed');
        expect(updatedPayout.reversalReason).toBe('Account verification failed');
      });
    });

    describe('Subscription Events', () => {
      it('should handle subscription.create event', async () => {
        const webhookData = generatePaystackWebhookEvent('subscription.create', {
          subscription_code: 'SUB_001',
          email_token: 'EMAIL_TOKEN_001',
          customer: {
            email: 'subscriber@example.com',
            customer_code: 'CUS_004'
          },
          plan: {
            plan_code: 'PLAN_001',
            name: 'Monthly Investment Plan',
            amount: 50000,
            interval: 'monthly'
          }
        });

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should handle invoice.create event', async () => {
        const webhookData = generatePaystackWebhookEvent('invoice.create', {
          invoice_code: 'INV_001',
          customer: {
            email: 'invoice@example.com',
            customer_code: 'CUS_005'
          },
          amount: 75000,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Security and Validation', () => {
      it('should reject webhook without signature', async () => {
        const webhookData = generatePaystackWebhookEvent('charge.success', {
          reference: 'REF004',
          amount: 10000,
          status: 'success'
        });

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .send(webhookData)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('WEBHOOK_SIGNATURE_INVALID');
      });

      it('should reject webhook with invalid signature', async () => {
        const webhookData = generatePaystackWebhookEvent('charge.success', {
          reference: 'REF005',
          amount: 10000,
          status: 'success'
        });

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', 'invalid_signature')
          .send(webhookData)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('WEBHOOK_SIGNATURE_INVALID');
      });

      it('should reject webhook with invalid event type', async () => {
        const webhookData = {
          event: 'invalid.event.type',
          data: {
            reference: 'REF006',
            amount: 10000
          }
        };

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('INVALID_WEBHOOK_EVENT');
      });

      it('should handle malformed webhook data', async () => {
        const malformedData = {
          event: 'charge.success',
          data: null // Invalid data
        };

        const signature = generateWebhookSignature(webhookSecret, malformedData);

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(malformedData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('INVALID_WEBHOOK_DATA');
      });
    });

    describe('Idempotency', () => {
      it('should handle duplicate webhook events', async () => {
        const webhookData = generatePaystackWebhookEvent('charge.success', {
          reference: 'REF007',
          amount: 15000,
          status: 'success',
          paid_at: new Date().toISOString()
        });

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        // First webhook processing
        const firstResponse = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(200);

        expect(firstResponse.body.success).toBe(true);

        // Second webhook processing (duplicate)
        const secondResponse = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(200);

        expect(secondResponse.body.success).toBe(true);
        expect(secondResponse.body.message).toContain('already been processed');

        // Verify only one payment was created
        const payments = await PaymentIntent.find({ reference: 'REF007' });
        expect(payments).toHaveLength(1);
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        // Mock PaymentIntent.findOne to throw error
        const originalFindOne = PaymentIntent.findOne;
        PaymentIntent.findOne = jest.fn().mockRejectedValue(new Error('Database connection failed'));

        const webhookData = generatePaystackWebhookEvent('charge.success', {
          reference: 'REF008',
          amount: 10000,
          status: 'success'
        });

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('WEBHOOK_PROCESSING_ERROR');

        // Restore original method
        PaymentIntent.findOne = originalFindOne;
      });

      it('should handle webhook processing errors', async () => {
        // Mock webhook handler to throw error
        const originalProcess = app.locals.webhookHandlerService.processWebhook;
        app.locals.webhookHandlerService.processWebhook = jest.fn().mockImplementation(() => {
          throw new Error('Webhook processing failed');
        });

        const webhookData = generatePaystackWebhookEvent('charge.success', {
          reference: 'REF009',
          amount: 10000,
          status: 'success'
        });

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('WEBHOOK_PROCESSING_ERROR');

        // Restore original method
        app.locals.webhookHandlerService.processWebhook = originalProcess;
      });
    });

    describe('Performance and Rate Limiting', () => {
      it('should handle high volume webhooks efficiently', async () => {
        const webhookPromises = [];
        const startTime = Date.now();

        // Create 100 webhook requests
        for (let i = 0; i < 100; i++) {
          const webhookData = generatePaystackWebhookEvent('charge.success', {
            reference: `REF_BULK_${i}`,
            amount: 1000 + (i * 10),
            status: 'success'
          });

          const signature = generateWebhookSignature(webhookSecret, webhookData);

          webhookPromises.push(
            request(app)
              .post('/api/webhooks/paystack')
              .set('x-paystack-signature', signature)
              .send(webhookData)
          );
        }

        // Wait for all webhooks to complete
        const responses = await Promise.all(webhookPromises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // All webhooks should be processed successfully
        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        });

        // Should complete within reasonable time (10 seconds)
        expect(totalTime).toBeLessThan(10000);
      });

      it('should implement rate limiting for webhook endpoints', async () => {
        const webhookData = generatePaystackWebhookEvent('charge.success', {
          reference: 'REF_RATE_LIMIT',
          amount: 10000,
          status: 'success'
        });

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        // Send multiple requests quickly to trigger rate limiting
        const requests = [];
        for (let i = 0; i < 200; i++) {
          requests.push(
            request(app)
              .post('/api/webhooks/paystack')
              .set('x-paystack-signature', signature)
              .send(webhookData)
          );
        }

        const responses = await Promise.allSettled(requests);
        
        // Some requests should be rate limited
        const rateLimitedResponses = responses.filter(
          result => result.status === 'fulfilled' && result.value.status === 429
        );
        
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      });
    });

    describe('Logging and Monitoring', () => {
      it('should log webhook processing events', async () => {
        const webhookData = generatePaystackWebhookEvent('charge.success', {
          reference: 'REF_LOG_TEST',
          amount: 10000,
          status: 'success'
        });

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        // Mock logger to capture log calls
        const originalLog = app.locals.logger.info;
        const logCalls = [];
        app.locals.logger.info = jest.fn().mockImplementation((message, meta) => {
          logCalls.push({ message, meta });
        });

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify webhook processing was logged
        const webhookLog = logCalls.find(log => 
          log.message.includes('Webhook processed') || 
          log.message.includes('charge.success')
        );
        expect(webhookLog).toBeTruthy();

        // Restore original logger
        app.locals.logger.info = originalLog;
      });

      it('should track webhook metrics', async () => {
        const webhookData = generatePaystackWebhookEvent('charge.success', {
          reference: 'REF_METRICS_TEST',
          amount: 10000,
          status: 'success'
        });

        const signature = generateWebhookSignature(webhookSecret, webhookData);

        // Mock metrics collector
        const originalTrack = app.locals.metricsCollector.track;
        const metricsCalls = [];
        app.locals.metricsCollector.track = jest.fn().mockImplementation((event, data) => {
          metricsCalls.push({ event, data });
        });

        const response = await request(app)
          .post('/api/webhooks/paystack')
          .set('x-paystack-signature', signature)
          .send(webhookData)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify webhook metrics were tracked
        const webhookMetrics = metricsCalls.find(metric => 
          metric.event === 'webhook.processed' || 
          metric.event === 'charge.success'
        );
        expect(webhookMetrics).toBeTruthy();

        // Restore original metrics collector
        app.locals.metricsCollector.track = originalTrack;
      });
    });
  });
});