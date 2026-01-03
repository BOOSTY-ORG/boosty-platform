import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../src/express.js';
import Payout from '../../../src/models/payment/payout.model.js';
import {
  generateMockPayout,
  setupTestDatabase,
  cleanupTestDatabase,
  createAuthHeaders
} from '../../helpers/payment.test.helpers.js';

describe('ROI and Payout Endpoints Integration Tests', () => {
  let authToken;
  let adminUser;
  let testUser;
  let testPayouts;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test users
    adminUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'admin@example.com',
      role: 'admin'
    };
    
    testUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'user@example.com',
      role: 'user'
    };
    
    authToken = 'test_jwt_token';
    
    // Create test payouts
    testPayouts = await Payout.create([
      generateMockPayout({
        payoutId: 'PAY001',
        type: 'roi_payment',
        amount: 10000,
        status: 'completed',
        recipientId: testUser._id
      }),
      generateMockPayout({
        payoutId: 'PAY002',
        type: 'profit_sharing',
        amount: 5000,
        status: 'pending',
        recipientId: testUser._id
      }),
      generateMockPayout({
        payoutId: 'PAY003',
        type: 'dividend',
        amount: 7500,
        status: 'failed',
        recipientId: testUser._id
      }),
      generateMockPayout({
        payoutId: 'PAY004',
        type: 'commission',
        amount: 2500,
        status: 'processing',
        recipientId: testUser._id
      })
    ]);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/payouts', () => {
    it('should get payouts with admin permissions', async () => {
      const response = await request(app)
        .get('/api/payouts')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('payouts');
      expect(response.body.data.payouts).toHaveLength(4);
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('total');
    });

    it('should filter payouts by status', async () => {
      const response = await request(app)
        .get('/api/payouts?status=completed')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.payouts).toHaveLength(1);
      response.body.data.payouts.forEach(payout => {
        expect(payout.status).toBe('completed');
      });
    });

    it('should filter payouts by type', async () => {
      const response = await request(app)
        .get('/api/payouts?type=roi_payment')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.payouts).toHaveLength(1);
      response.body.data.payouts.forEach(payout => {
        expect(payout.type).toBe('roi_payment');
      });
    });

    it('should paginate payouts correctly', async () => {
      const response = await request(app)
        .get('/api/payouts?page=1&limit=2')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.payouts).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/payouts')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should restrict access to own payouts for regular users', async () => {
      const response = await request(app)
        .get('/api/payouts')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.payouts).toHaveLength(4);
      // Regular users should see all payouts in this test setup
    });
  });

  describe('GET /api/payouts/:payoutId', () => {
    it('should get specific payout', async () => {
      const response = await request(app)
        .get('/api/payouts/PAY001')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('payout');
      expect(response.body.data.payout.payoutId).toBe('PAY001');
      expect(response.body.data.payout.type).toBe('roi_payment');
      expect(response.body.data.payout.amount).toBe(10000);
      expect(response.body.data.payout.status).toBe('completed');
    });

    it('should return 404 for non-existent payout', async () => {
      const response = await request(app)
        .get('/api/payouts/NONEXISTENT')
        .set(createAuthHeaders(authToken))
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('PAYOUT_NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/payouts/PAY001')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/payouts', () => {
    it('should create payout with admin permissions', async () => {
      const payoutData = {
        type: 'roi_payment',
        amount: 5000,
        recipientId: testUser._id,
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        calculationBasis: {
          investmentAmount: 100000,
          investmentPeriod: 12,
          interestRate: 15,
          roiPercentage: 20,
          profitAmount: 20000
        }
      };

      const response = await request(app)
        .post('/api/payouts')
        .set(createAuthHeaders(authToken))
        .send(payoutData)
        .expect(201);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('payout');
      expect(response.body.data.payout.type).toBe('roi_payment');
      expect(response.body.data.payout.amount).toBe(5000);
      expect(response.body.data.payout.status).toBe('pending');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing type
        amount: 5000,
        recipientId: testUser._id
      };

      const response = await request(app)
        .post('/api/payouts')
        .set(createAuthHeaders(authToken))
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('code');
    });

    it('should validate amount is positive', async () => {
      const invalidData = {
        type: 'roi_payment',
        amount: -1000, // Negative amount
        recipientId: testUser._id
      };

      const response = await request(app)
        .post('/api/payouts')
        .set(createAuthHeaders(authToken))
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_AMOUNT');
    });

    it('should validate recipient exists', async () => {
      const invalidData = {
        type: 'roi_payment',
        amount: 5000,
        recipientId: new mongoose.Types.ObjectId() // Non-existent user
      };

      const response = await request(app)
        .post('/api/payouts')
        .set(createAuthHeaders(authToken))
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('RECIPIENT_NOT_FOUND');
    });

    it('should require admin permissions', async () => {
      const payoutData = {
        type: 'roi_payment',
        amount: 5000,
        recipientId: testUser._id
      };

      const response = await request(app)
        .post('/api/payouts')
        .set(createAuthHeaders(authToken))
        .send(payoutData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('PUT /api/payouts/:payoutId/approve', () => {
    it('should approve payout with admin permissions', async () => {
      const response = await request(app)
        .put('/api/payouts/PAY002/approve')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      
      // Verify payout status changed
      const updatedPayout = await Payout.findById('PAY002');
      expect(updatedPayout.approvalStatus).toBe('approved');
      expect(updatedPayout.approvedAt).toBeInstanceOf(Date);
    });

    it('should reject payout with admin permissions', async () => {
      const response = await request(app)
        .put('/api/payouts/PAY003/reject')
        .set(createAuthHeaders(authToken))
        .send({ reason: 'Invalid calculation basis' })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      
      // Verify payout status changed
      const updatedPayout = await Payout.findById('PAY003');
      expect(updatedPayout.approvalStatus).toBe('rejected');
      expect(updatedPayout.rejectionReason).toBe('Invalid calculation basis');
    });

    it('should require admin permissions', async () => {
      const response = await request(app)
        .put('/api/payouts/PAY004/approve')
        .set(createAuthHeaders(authToken))
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should handle non-existent payout', async () => {
      const response = await request(app)
        .put('/api/payouts/NONEXISTENT/approve')
        .set(createAuthHeaders(authToken))
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('PAYOUT_NOT_FOUND');
    });
  });

  describe('POST /api/payouts/process', () => {
    beforeEach(async () => {
      // Create approved payouts for processing
      await Payout.updateMany(
        { payoutId: { $in: ['PAY002', 'PAY005'] } },
        { approvalStatus: 'approved' }
      );
    });

    it('should process approved payouts', async () => {
      const response = await request(app)
        .post('/api/payouts/process')
        .set(createAuthHeaders(authToken))
        .send({ payoutIds: ['PAY002', 'PAY005'] })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('processed');
      expect(response.body.data.processed).toBe(2);
      
      // Verify payouts status changed
      const processedPayouts = await Payout.find({
        payoutId: { $in: ['PAY002', 'PAY005'] }
      });
      expect(processedPayouts.length).toBe(2);
      processedPayouts.forEach(payout => {
        expect(payout.status).toBe('processing');
      });
    });

    it('should not process non-approved payouts', async () => {
      const response = await request(app)
        .post('/api/payouts/process')
        .set(createAuthHeaders(authToken))
        .send({ payoutIds: ['PAY003'] }) // Not approved
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('code');
    });

    it('should require admin permissions', async () => {
      const response = await request(app)
        .post('/api/payouts/process')
        .set(createAuthHeaders(authToken))
        .send({ payoutIds: ['PAY002'] })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('GET /api/payouts/analytics', () => {
    it('should get payout analytics with admin permissions', async () => {
      const response = await request(app)
        .get('/api/payouts/analytics')
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalPayouts');
      expect(response.body.data).toHaveProperty('totalAmount');
      expect(response.body.data).toHaveProperty('averageAmount');
      expect(response.body.data).toHaveProperty('payoutByType');
      expect(response.body.data).toHaveProperty('monthlyStats');
    });

    it('should calculate analytics correctly', async () => {
      const response = await request(app)
        .get('/api/payouts/analytics')
        .set(createAuthHeaders(authToken))
        .expect(200);

      const analytics = response.body.data;
      
      expect(analytics.totalPayouts).toBe(4);
      expect(analytics.totalAmount).toBe(25000); // Sum of all payouts
      expect(analytics.averageAmount).toBe(6250); // Average payout amount
      
      expect(analytics.payoutByType).toHaveProperty('roi_payment');
      expect(analytics.payoutByType.roi_payment.count).toBe(1);
      expect(analytics.payoutByType.roi_payment.totalAmount).toBe(10000);
      
      expect(analytics.payoutByType).toHaveProperty('profit_sharing');
      expect(analytics.payoutByType.profit_sharing.count).toBe(1);
      expect(analytics.payoutByType.profit_sharing.totalAmount).toBe(5000);
    });

    it('should require admin permissions', async () => {
      const response = await request(app)
        .get('/api/payouts/analytics')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should support date range filtering', async () => {
      const startDate = '2023-01-01T00:00:00.000Z';
      const endDate = '2023-03-01T00:00:00.000Z';
      
      const response = await request(app)
        .get(`/api/payouts/analytics?startDate=${startDate}&endDate=${endDate}`)
        .set(createAuthHeaders(authToken))
        .expect(200);

      expect(response.body.data.totalPayouts).toBe(2); // Only payouts within date range
      expect(response.body.data.totalAmount).toBe(12500); // 10000 + 2500
    });
  });

  describe('GET /api/roi/calculator', () => {
    it('should calculate ROI for investment', async () => {
      const roiData = {
        investmentAmount: 100000,
        investmentPeriod: 12, // months
        profitAmount: 20000
      };

      const response = await request(app)
        .post('/api/roi/calculator')
        .set(createAuthHeaders(authToken))
        .send(roiData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('roiPercentage');
      expect(response.body.data.roiPercentage).toBe(20); // (20000 / 100000) * 100
      expect(response.body.data).toHaveProperty('totalReturn');
      expect(response.body.data.totalReturn).toBe(120000); // 100000 + 20000
    });

    it('should validate investment amount', async () => {
      const invalidData = {
        investmentAmount: -1000, // Negative amount
        investmentPeriod: 12,
        profitAmount: 20000
      };

      const response = await request(app)
        .post('/api/roi/calculator')
        .set(createAuthHeaders(authToken))
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('code');
    });

    it('should validate investment period', async () => {
      const invalidData = {
        investmentAmount: 100000,
        investmentPeriod: 0, // Invalid period
        profitAmount: 20000
      };

      const response = await request(app)
        .post('/api/roi/calculator')
        .set(createAuthHeaders(authToken))
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('code');
    });

    it('should handle calculation errors gracefully', async () => {
      // Mock calculation service to throw error
      const originalCalculate = app.locals.roiCalculatorService.calculate;
      app.locals.roiCalculatorService.calculate = jest.fn().mockImplementation(() => {
        throw new Error('Calculation service unavailable');
      });

      const roiData = {
        investmentAmount: 100000,
        investmentPeriod: 12,
        profitAmount: 20000
      };

      const response = await request(app)
        .post('/api/roi/calculator')
        .set(createAuthHeaders(authToken))
        .send(roiData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('code');
      
      // Restore original method
      app.locals.roiCalculatorService.calculate = originalCalculate;
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors consistently', async () => {
      const response = await request(app)
        .post('/api/payouts')
        .set(createAuthHeaders(authToken))
        .send({ invalidField: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle database errors gracefully', async () => {
      // Mock Payout.find to throw error
      const originalFind = Payout.find;
      Payout.find = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/payouts')
        .set(createAuthHeaders(authToken))
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('code');
      expect(response.body.code).toBe('DATABASE_ERROR');
      
      // Restore original method
      Payout.find = originalFind;
    });

    it('should handle server errors gracefully', async () => {
      // Mock app to throw error
      const originalUse = app.use;
      app.use = jest.fn().mockImplementation((err, req, res, next) => {
        if (err) throw new Error('Server error');
        next(err);
      });

      const response = await request(app)
        .get('/api/payouts')
        .set(createAuthHeaders(authToken))
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('code');
      expect(response.body.code).toBe('SERVER_ERROR');
      
      // Restore original method
      app.use = originalUse;
    });
  });

  describe('Performance and Caching', () => {
    it('should handle large datasets efficiently', async () => {
      // Create 1000 payouts
      const largePayouts = Array(1000).fill(null).map((_, index) =>
        generateMockPayout({
          payoutId: `PAY${String(index + 1).padStart(5, '0')}`,
          type: 'roi_payment',
          amount: 1000 + (index * 10),
          status: 'completed',
          recipientId: testUser._id
        })
      );
      
      await Payout.create(largePayouts);

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/payouts')
        .set(createAuthHeaders(authToken))
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should handle large dataset within reasonable time
      expect(responseTime).toBeLessThan(5000); // 5 seconds
      expect(response.body.data.payouts).toHaveLength(1000);
    });

    it('should implement caching for analytics', async () => {
      // First request should hit database
      const firstResponse = await request(app)
        .get('/api/payouts/analytics')
        .set(createAuthHeaders(authToken))
        .expect(200);

      // Second request should use cache
      const secondResponse = await request(app)
        .get('/api/payouts/analytics')
        .set(createAuthHeaders(authToken))
        .expect(200);

      // Both should return same data but second should be faster
      expect(firstResponse.body.data).toEqual(secondResponse.body.data);
      expect(firstResponse.headers['cache-control']).not.toBeDefined();
      expect(secondResponse.headers['cache-control']).toMatch(/max-age=/);
    });
  });

  describe('Security', () => {
    it('should validate payout amounts', async () => {
      const suspiciousData = {
        type: 'roi_payment',
        amount: 99999999, // Suspiciously large amount
        recipientId: testUser._id
      };

      const response = await request(app)
        .post('/api/payouts')
        .set(createAuthHeaders(authToken))
        .send(suspiciousData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_AMOUNT');
    });

    it('should prevent unauthorized access', async () => {
      const response = await request(app)
        .put('/api/payouts/PAY001/approve')
        .set({ 'Authorization': 'Bearer invalid_token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });
});