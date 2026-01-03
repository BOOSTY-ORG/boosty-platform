import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../src/express.js';
import PaymentTransaction from '../../../src/models/payment/paymentTransaction.model.js';
import {
  generateMockPaymentTransaction,
  setupTestDatabase,
  cleanupTestDatabase,
  createAuthHeaders
} from '../../helpers/payment.test.helpers.js';

describe('Transaction History Endpoints Integration Tests', () => {
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
    // Clear collection before each test
    await PaymentTransaction.deleteMany({});
  });

  describe('GET /api/payment/history', () => {
    beforeEach(async () => {
      // Create multiple payment transactions
      await PaymentTransaction.create([
        generateMockPaymentTransaction({
          transactionId: 'TXN001',
          fromEntityId: testUser._id,
          status: 'completed',
          createdAt: new Date('2023-01-01T00:00:00.000Z'),
          amount: 10000
        }),
        generateMockPaymentTransaction({
          transactionId: 'TXN002',
          fromEntityId: testUser._id,
          status: 'pending',
          createdAt: new Date('2023-01-02T00:00:00.000Z'),
          amount: 5000
        }),
        generateMockPaymentTransaction({
          transactionId: 'TXN003',
          fromEntityId: testUser._id,
          status: 'failed',
          createdAt: new Date('2023-01-03T00:00:00.000Z'),
          amount: 7500
        }),
        generateMockPaymentTransaction({
          transactionId: 'TXN004',
          fromEntityId: testUser._id,
          status: 'completed',
          createdAt: new Date('2023-01-04T00:00:00.000Z'),
          amount: 15000
        }),
        generateMockPaymentTransaction({
          transactionId: 'TXN005',
          fromEntityId: testUser._id,
          status: 'completed',
          createdAt: new Date('2023-01-05T00:00:00.000Z'),
          amount: 20000
        })
      ]);
    });

    it('should get transaction history with default pagination', async () => {
      const response = await request(app)
        .get('/api/payment/history')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactions');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.transactions).toHaveLength(5);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(20);
      expect(response.body.data.pagination.total).toBe(5);
    });

    it('should paginate correctly', async () => {
      const response = await request(app)
        .get('/api/payment/history?page=2&limit=2')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.transactions).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.total).toBe(5);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/payment/history?status=completed')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.transactions).toHaveLength(3);
      response.body.data.transactions.forEach(transaction => {
        expect(transaction.status).toBe('completed');
      });
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/payment/history?type=investment')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.transactions).toHaveLength(1);
      response.body.data.transactions.forEach(transaction => {
        expect(transaction.type).toBe('investment');
      });
    });

    it('should filter by payment method', async () => {
      const response = await request(app)
        .get('/api/payment/history?paymentMethod=card')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.transactions).toHaveLength(2);
      response.body.data.transactions.forEach(transaction => {
        expect(transaction.paymentMethod).toBe('card');
      });
    });

    it('should filter by amount range', async () => {
      const response = await request(app)
        .get('/api/payment/history?minAmount=10000&maxAmount=20000')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.transactions).toHaveLength(2);
      response.body.data.transactions.forEach(transaction => {
        expect(transaction.amount).toBeGreaterThanOrEqual(10000);
        expect(transaction.amount).toBeLessThanOrEqual(20000);
      });
    });

    it('should filter by date range', async () => {
      const startDate = '2023-01-01T00:00:00.000Z';
      const endDate = '2023-01-03T00:00:00.000Z';
      
      const response = await request(app)
        .get(`/api/payment/history?startDate=${startDate}&endDate=${endDate}`)
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.transactions).toHaveLength(3);
      response.body.data.transactions.forEach(transaction => {
        const transactionDate = new Date(transaction.createdAt);
        expect(transactionDate.getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
        expect(transactionDate.getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
      });
    });

    it('should search by transaction reference', async () => {
      const response = await request(app)
        .get('/api/payment/history?search=TXN001')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].transactionId).toBe('TXN001');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/payment/history')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/payment/history/export', () => {
    beforeEach(async () => {
      // Create transactions for export
      await PaymentTransaction.create([
        generateMockPaymentTransaction({
          transactionId: 'TXN001',
          fromEntityId: testUser._id,
          status: 'completed',
          amount: 10000
        }),
        generateMockPaymentTransaction({
          transactionId: 'TXN002',
          fromEntityId: testUser._id,
          status: 'completed',
          amount: 5000
        })
      ]);
    });

    it('should export transaction history as CSV', async () => {
      const response = await request(app)
        .get('/api/payment/history/export?format=csv')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.text).toContain('transactionId,type,amount,status,createdAt');
    });

    it('should export transaction history as JSON', async () => {
      const response = await request(app)
        .get('/api/payment/history/export?format=json')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.headers['content-type']).toBe('application/json');
      const exportedData = JSON.parse(response.text);
      expect(exportedData).toHaveLength(2);
      expect(exportedData[0]).toHaveProperty('transactionId');
    });

    it('should support date range filtering in export', async () => {
      const startDate = '2023-01-01T00:00:00.000Z';
      const endDate = '2023-01-03T00:00:00.000Z';
      
      const response = await request(app)
        .get(`/api/payment/history/export?startDate=${startDate}&endDate=${endDate}&format=csv`)
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.text).toContain('TXN001');
      expect(response.text).not.toContain('TXN004');
    });

    it('should require authentication for export', async () => {
      const response = await request(app)
        .get('/api/payment/history/export')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/payment/history/summary', () => {
    beforeEach(async () => {
      // Create transactions for summary
      await PaymentTransaction.create([
        generateMockPaymentTransaction({
          transactionId: 'TXN001',
          fromEntityId: testUser._id,
          status: 'completed',
          amount: 10000,
          type: 'investment'
        }),
        generateMockPaymentTransaction({
          transactionId: 'TXN002',
          fromEntityId: testUser._id,
          status: 'completed',
          amount: 5000,
          type: 'investment'
        }),
        generateMockPaymentTransaction({
          transactionId: 'TXN003',
          fromEntityId: testUser._id,
          status: 'pending',
          amount: 7500,
          type: 'repayment'
        }),
        generateMockPaymentTransaction({
          transactionId: 'TXN004',
          fromEntityId: testUser._id,
          status: 'failed',
          amount: 2500,
          type: 'fee'
        })
      ]);
    });

    it('should get transaction summary statistics', async () => {
      const response = await request(app)
        .get('/api/payment/history/summary')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTransactions');
      expect(response.body.data).toHaveProperty('totalAmount');
      expect(response.body.data).toHaveProperty('successRate');
      expect(response.body.data).toHaveProperty('averageAmount');
    });

    it('should filter summary by date range', async () => {
      const startDate = '2023-01-01T00:00:00.000Z';
      const endDate = '2023-01-03T00:00:00.000Z';
      
      const response = await request(app)
        .get(`/api/payment/history/summary?startDate=${startDate}&endDate=${endDate}`)
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.totalTransactions).toBe(3);
      expect(response.body.data.totalAmount).toBe(15000);
    });

    it('should filter summary by transaction type', async () => {
      const response = await request(app)
        .get('/api/payment/history/summary?type=investment')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.totalTransactions).toBe(2);
      expect(response.body.data.totalAmount).toBe(15000);
    });

    it('should calculate success rate correctly', async () => {
      const response = await request(app)
        .get('/api/payment/history/summary')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.successRate).toBe(75); // 3 successful out of 4 total
    });

    it('should require authentication for summary', async () => {
      const response = await request(app)
        .get('/api/payment/history/summary')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Advanced Filtering', () => {
    beforeEach(async () => {
      // Create transactions with various properties
      await PaymentTransaction.create([
        generateMockPaymentTransaction({
          transactionId: 'TXN001',
          fromEntityId: testUser._id,
          status: 'completed',
          amount: 10000,
          paymentMethod: 'card',
          createdAt: new Date('2023-01-01T00:00:00.000Z')
        }),
        generateMockPaymentTransaction({
          transactionId: 'TXN002',
          fromEntityId: testUser._id,
          status: 'completed',
          amount: 5000,
          paymentMethod: 'bank_transfer',
          createdAt: new Date('2023-01-02T00:00:00.000Z')
        }),
        generateMockPaymentTransaction({
          transactionId: 'TXN003',
          fromEntityId: testUser._id,
          status: 'failed',
          amount: 7500,
          paymentMethod: 'ussd',
          createdAt: new Date('2023-01-03T00:00:00.000Z')
        }),
        generateMockPaymentTransaction({
          transactionId: 'TXN004',
          fromEntityId: testUser._id,
          status: 'completed',
          amount: 15000,
          paymentMethod: 'mobile_money',
          createdAt: new Date('2023-01-04T00:00:00.000Z')
        }),
        generateMockPaymentTransaction({
          transactionId: 'TXN005',
          fromEntityId: testUser._id,
          status: 'completed',
          amount: 20000,
          paymentMethod: 'card',
          createdAt: new Date('2023-01-05T00:00:00.000Z')
        })
      ]);
    });

    it('should support multiple filter parameters', async () => {
      const response = await request(app)
        .get('/api/payment/history?status=completed&paymentMethod=card&type=investment&minAmount=5000&maxAmount=20000')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.transactions).toHaveLength(3);
      response.body.data.transactions.forEach(transaction => {
        expect(transaction.status).toBe('completed');
        expect(transaction.paymentMethod).toBe('card');
        expect(transaction.type).toBe('investment');
        expect(transaction.amount).toBeGreaterThanOrEqual(5000);
        expect(transaction.amount).toBeLessThanOrEqual(20000);
      });
    });

    it('should support date range presets', async () => {
      const response = await request(app)
        .get('/api/payment/history?dateRange=today')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.transactions.length).toBeGreaterThan(0);
      response.body.data.transactions.forEach(transaction => {
        const transactionDate = new Date(transaction.createdAt);
        const today = new Date();
        expect(transactionDate.toDateString()).toBe(today.toDateString());
      });
    });

    it('should support cursor-based pagination', async () => {
      const firstResponse = await request(app)
        .get('/api/payment/history?limit=2')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(firstResponse.body.data.transactions).toHaveLength(2);
      
      const cursor = firstResponse.body.data.pagination.cursor;
      const secondResponse = await request(app)
        .get(`/api/payment/history?cursor=${cursor}&limit=2`)
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(secondResponse.body.data.transactions).toHaveLength(2);
      // Ensure we get different transactions
      const firstIds = firstResponse.body.data.transactions.map(t => t.transactionId);
      const secondIds = secondResponse.body.data.transactions.map(t => t.transactionId);
      expect(firstIds).not.toEqual(secondIds);
    });
  });

  describe('Performance and Caching', () => {
    it('should handle large datasets efficiently', async () => {
      // Create 100 transactions
      const transactions = Array(100).fill(null).map((_, index) =>
        generateMockPaymentTransaction({
          transactionId: `TXN${String(index + 1).padStart(5, '0')}`,
          fromEntityId: testUser._id,
          status: 'completed',
          amount: 1000 + (index * 100)
        })
      );
      
      await PaymentTransaction.create(transactions);

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/payment/history')
        .set(createAuthHeaders(authToken))
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within reasonable time
      expect(responseTime).toBeLessThan(5000); // 5 seconds
      expect(response.body.data.transactions).toHaveLength(100);
    });

    it('should include caching headers', async () => {
      const response = await request(app)
        .get('/api/payment/history')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.headers).toHaveProperty('cache-control');
      expect(response.headers['cache-control']).toMatch(/max-age=/);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid filter parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/payment/history?status=invalid_status')
        .set(createAuthHeaders(authToken))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle invalid date format', async () => {
      const response = await request(app)
        .get('/api/payment/history?startDate=invalid-date')
        .set(createAuthHeaders(authToken))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_DATE_FORMAT');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalFind = PaymentTransaction.find;
      PaymentTransaction.find = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/payment/history')
        .set(createAuthHeaders(authToken))
        .expect(500);

      // Restore original method
      PaymentTransaction.find = originalFind;

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('DATABASE_ERROR');
    });
  });
});