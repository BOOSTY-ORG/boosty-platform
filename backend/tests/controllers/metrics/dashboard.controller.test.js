import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/express.js';
import { createTestData, createMockRequest, createMockResponse, createMockNext } from '../../helpers/metrics.test.helpers.js';
import User from '../../../src/models/user.model.js';
import Investor from '../../../src/models/metrics/investor.model.js';
import SolarApplication from '../../../src/models/metrics/solarApplication.model.js';
import Transaction from '../../../src/models/metrics/transaction.model.js';
import Investment from '../../../src/models/metrics/investment.model.js';
import KYCDocument from '../../../src/models/metrics/kycDocument.model.js';

// Mock the models to control their behavior in tests
jest.mock('../../../src/models/user.model.js');
jest.mock('../../../src/models/metrics/investor.model.js');
jest.mock('../../../src/models/metrics/solarApplication.model.js');
jest.mock('../../../src/models/metrics/transaction.model.js');
jest.mock('../../../src/models/metrics/investment.model.js');
jest.mock('../../../src/models/metrics/kycDocument.model.js');

describe('Dashboard Controller', () => {
  let mockReq, mockRes, mockNext;
  let testData;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getDashboardOverview', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return dashboard overview metrics successfully', async () => {
      // Mock the database calls
      User.countDocuments.mockResolvedValue(100);
      User.countDocuments.mockResolvedValueOnce(80); // For active users
      Investor.countDocuments.mockResolvedValue(50);
      Investor.countDocuments.mockResolvedValueOnce(40); // For active investors
      SolarApplication.countDocuments.mockResolvedValue(200);
      SolarApplication.countDocuments.mockResolvedValueOnce(30); // For pending
      SolarApplication.countDocuments.mockResolvedValueOnce(150); // For approved
      SolarApplication.countDocuments.mockResolvedValueOnce(100); // For installed
      
      // Mock transaction aggregations
      Transaction.aggregate.mockResolvedValueOnce([{ total: 5000000 }]); // Investment volume
      Transaction.aggregate.mockResolvedValueOnce([{ total: 3000000 }]); // Repayment volume
      Transaction.aggregate.mockResolvedValueOnce([{ total: 5500000 }]); // Total revenue
      
      const response = await request(app)
        .get('/api/metrics/dashboard/overview')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.growth).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
      expect(response.body.data.recentActivity).toBeDefined();
      
      // Verify summary metrics
      expect(response.body.data.summary.totalUsers).toBe(100);
      expect(response.body.data.summary.activeUsers).toBe(80);
      expect(response.body.data.summary.totalInvestors).toBe(50);
      expect(response.body.data.summary.activeInvestors).toBe(40);
      expect(response.body.data.summary.totalApplications).toBe(200);
      expect(response.body.data.summary.pendingApplications).toBe(30);
      expect(response.body.data.summary.approvedApplications).toBe(150);
      expect(response.body.data.summary.installedSystems).toBe(100);
      expect(response.body.data.summary.totalInvestments).toBe(5000000);
      expect(response.body.data.summary.totalRevenue).toBe(5500000);
    });

    it('should handle date range parameters correctly', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      User.countDocuments.mockResolvedValue(50);
      User.countDocuments.mockResolvedValueOnce(40);
      Investor.countDocuments.mockResolvedValue(25);
      Investor.countDocuments.mockResolvedValueOnce(20);
      SolarApplication.countDocuments.mockResolvedValue(100);
      SolarApplication.countDocuments.mockResolvedValueOnce(15);
      SolarApplication.countDocuments.mockResolvedValueOnce(75);
      SolarApplication.countDocuments.mockResolvedValueOnce(50);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 2500000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 1500000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 2750000 }]);

      const response = await request(app)
        .get(`/api/metrics/dashboard/overview?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(User.countDocuments).toHaveBeenCalledWith({
        createdAt: { 
          $gte: expect.any(Date), 
          $lte: expect.any(Date) 
        }
      });
    });

    it('should handle preset date ranges', async () => {
      User.countDocuments.mockResolvedValue(30);
      User.countDocuments.mockResolvedValueOnce(25);
      Investor.countDocuments.mockResolvedValue(15);
      Investor.countDocuments.mockResolvedValueOnce(12);
      SolarApplication.countDocuments.mockResolvedValue(60);
      SolarApplication.countDocuments.mockResolvedValueOnce(10);
      SolarApplication.countDocuments.mockResolvedValueOnce(45);
      SolarApplication.countDocuments.mockResolvedValueOnce(30);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 1500000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 900000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 1650000 }]);

      const response = await request(app)
        .get('/api/metrics/dashboard/overview?dateRange=last_30_days')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalUsers).toBe(30);
    });

    it('should calculate growth metrics correctly', async () => {
      // Mock current period data
      User.countDocuments.mockResolvedValueOnce(100); // Current period
      User.countDocuments.mockResolvedValueOnce(80); // Active users
      Investor.countDocuments.mockResolvedValueOnce(50);
      Investor.countDocuments.mockResolvedValueOnce(40);
      SolarApplication.countDocuments.mockResolvedValueOnce(200);
      SolarApplication.countDocuments.mockResolvedValueOnce(30);
      SolarApplication.countDocuments.mockResolvedValueOnce(150);
      SolarApplication.countDocuments.mockResolvedValueOnce(100);
      
      // Mock transaction data
      Transaction.aggregate.mockResolvedValueOnce([{ total: 5000000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 3000000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 5500000 }]);
      
      // Mock previous period data
      User.countDocuments.mockResolvedValueOnce(80); // Previous period
      Transaction.aggregate.mockResolvedValueOnce([{ total: 4000000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 2500000 }]);

      const response = await request(app)
        .get('/api/metrics/dashboard/overview')
        .expect(200);

      expect(response.body.data.growth.userGrowth).toBeDefined();
      expect(response.body.data.growth.investmentGrowth).toBeDefined();
      expect(response.body.data.growth.revenueGrowth).toBeDefined();
      
      // Verify growth calculation
      expect(response.body.data.growth.userGrowth.current).toBe(100);
      expect(response.body.data.growth.userGrowth.previous).toBe(80);
      expect(response.body.data.growth.userGrowth.percentage).toBe(25); // (100-80)/80 * 100
      expect(response.body.data.growth.userGrowth.trend).toBe('up');
    });

    it('should handle database errors gracefully', async () => {
      User.countDocuments.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/metrics/dashboard/overview')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle zero values in growth calculations', async () => {
      // Mock current period data
      User.countDocuments.mockResolvedValueOnce(0);
      User.countDocuments.mockResolvedValueOnce(0);
      Investor.countDocuments.mockResolvedValueOnce(0);
      Investor.countDocuments.mockResolvedValueOnce(0);
      SolarApplication.countDocuments.mockResolvedValueOnce(0);
      SolarApplication.countDocuments.mockResolvedValueOnce(0);
      SolarApplication.countDocuments.mockResolvedValueOnce(0);
      SolarApplication.countDocuments.mockResolvedValueOnce(0);
      
      // Mock transaction data
      Transaction.aggregate.mockResolvedValueOnce([{ total: 0 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 0 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 0 }]);
      
      // Mock previous period data
      User.countDocuments.mockResolvedValueOnce(0);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 0 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 0 }]);

      const response = await request(app)
        .get('/api/metrics/dashboard/overview')
        .expect(200);

      expect(response.body.data.growth.userGrowth.percentage).toBe(0);
      expect(response.body.data.growth.userGrowth.trend).toBe('stable');
    });
  });

  describe('getRealtimeMetrics', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return realtime metrics successfully', async () => {
      // Mock the database calls
      User.countDocuments.mockResolvedValue(50); // Active users
      Investor.countDocuments.mockResolvedValue(20); // Online investors
      Transaction.countDocuments.mockResolvedValue(10); // Pending transactions
      SolarApplication.countDocuments.mockResolvedValue(5); // Current hour applications
      Transaction.countDocuments.mockResolvedValueOnce(3); // Current hour investments
      Transaction.countDocuments.mockResolvedValueOnce(7); // Current hour repayments

      const response = await request(app)
        .get('/api/metrics/dashboard/realtime')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.activeUsers).toBe(50);
      expect(response.body.data.onlineInvestors).toBe(20);
      expect(response.body.data.pendingTransactions).toBe(10);
      expect(response.body.data.systemStatus).toBeDefined();
      expect(response.body.data.serverLoad).toBeDefined();
      expect(response.body.data.responseTime).toBeDefined();
      expect(response.body.data.currentHourStats).toBeDefined();
      expect(response.body.data.todayStats).toBeDefined();
    });

    it('should include system performance metrics', async () => {
      User.countDocuments.mockResolvedValue(30);
      Investor.countDocuments.mockResolvedValue(15);
      Transaction.countDocuments.mockResolvedValue(5);
      SolarApplication.countResolvedValue(3);
      Transaction.countDocuments.mockResolvedValueOnce(2);
      Transaction.countDocuments.mockResolvedValueOnce(4);

      const response = await request(app)
        .get('/api/metrics/dashboard/realtime')
        .expect(200);

      expect(response.body.data.systemStatus).toBe('operational');
      expect(response.body.data.serverLoad).toBeDefined();
      expect(response.body.data.serverLoad.memory).toBeDefined();
      expect(response.body.data.serverLoad.cpu).toBeDefined();
      expect(typeof response.body.data.responseTime).toBe('number');
    });

    it('should handle errors in realtime metrics', async () => {
      User.countDocuments.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/metrics/dashboard/realtime')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should calculate today stats correctly', async () => {
      User.countDocuments.mockResolvedValue(25);
      Investor.countDocuments.mockResolvedValue(10);
      Transaction.countDocuments.mockResolvedValue(8);
      SolarApplication.countResolvedValue(4);
      Transaction.countDocuments.mockResolvedValueOnce(2);
      Transaction.countDocuments.mockResolvedValueOnce(3);
      
      // Mock today's stats aggregation
      Transaction.aggregate.mockResolvedValueOnce([{ total: 500000 }]);

      const response = await request(app)
        .get('/api/metrics/dashboard/realtime')
        .expect(200);

      expect(response.body.data.todayStats).toBeDefined();
      expect(response.body.data.todayStats.applications).toBe(4);
      expect(response.body.data.todayStats.investments).toBe(2);
      expect(response.body.data.todayStats.repayments).toBe(3);
      expect(response.body.data.todayStats.revenue).toBe(500000);
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate KYC approval rate correctly', async () => {
      // This tests the helper function indirectly through the controller
      KYCDocument.countDocuments.mockResolvedValue(100); // Total documents
      KYCDocument.countDocuments.mockResolvedValueOnce(85); // Verified documents

      // Mock other required calls
      User.countDocuments.mockResolvedValue(50);
      User.countDocuments.mockResolvedValueOnce(40);
      Investor.countDocuments.mockResolvedValue(25);
      Investor.countDocuments.mockResolvedValueOnce(20);
      SolarApplication.countDocuments.mockResolvedValue(100);
      SolarApplication.countDocuments.mockResolvedValueOnce(15);
      SolarApplication.countDocuments.mockResolvedValueOnce(75);
      SolarApplication.countDocuments.mockResolvedValueOnce(50);
      Transaction.aggregate.mockResolvedValue([{ total: 2500000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 1500000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 2750000 }]);

      const response = await request(app)
        .get('/api/metrics/dashboard/overview')
        .expect(200);

      expect(response.body.data.performance.kycApprovalRate).toBe(85);
    });

    it('should calculate application approval rate correctly', async () => {
      SolarApplication.countDocuments.mockResolvedValueOnce(200); // Total applications
      SolarApplication.countDocuments.mockResolvedValueOnce(150); // Approved applications

      // Mock other required calls
      User.countDocuments.mockResolvedValue(50);
      User.countDocuments.mockResolvedValueOnce(40);
      Investor.countDocuments.mockResolvedValue(25);
      Investor.countDocuments.mockResolvedValueOnce(20);
      SolarApplication.countDocuments.mockResolvedValueOnce(200); // Total
      SolarApplication.countDocuments.mockResolvedValueOnce(30); // Pending
      SolarApplication.countDocuments.mockResolvedValueOnce(100); // Installed
      Transaction.aggregate.mockResolvedValue([{ total: 2500000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 1500000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 2750000 }]);

      const response = await request(app)
        .get('/api/metrics/dashboard/overview')
        .expect(200);

      expect(response.body.data.performance.applicationApprovalRate).toBe(75);
    });

    it('should handle division by zero in rate calculations', async () => {
      // Mock zero values to test division by zero handling
      KYCDocument.countDocuments.mockResolvedValue(0); // No documents
      SolarApplication.countDocuments.mockResolvedValueOnce(0); // No applications

      // Mock other required calls
      User.countDocuments.mockResolvedValue(0);
      User.countDocuments.mockResolvedValueOnce(0);
      Investor.countDocuments.mockResolvedValue(0);
      Investor.countDocuments.mockResolvedValueOnce(0);
      SolarApplication.countDocuments.mockResolvedValueOnce(0); // Total
      SolarApplication.countDocuments.mockResolvedValueOnce(0); // Pending
      SolarApplication.countDocuments.mockResolvedValueOnce(0); // Approved
      SolarApplication.countDocuments.mockResolvedValueOnce(0); // Installed
      Transaction.aggregate.mockResolvedValue([{ total: 0 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 0 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 0 }]);

      const response = await request(app)
        .get('/api/metrics/dashboard/overview')
        .expect(200);

      expect(response.body.data.performance.kycApprovalRate).toBe(0);
      expect(response.body.data.performance.applicationApprovalRate).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid date ranges', async () => {
      const response = await request(app)
        .get('/api/metrics/dashboard/overview?startDate=2023-01-31&endDate=2023-01-01')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle very large date ranges', async () => {
      const response = await request(app)
        .get('/api/metrics/dashboard/overview?startDate=2020-01-01&endDate=2023-12-31')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle malformed date parameters', async () => {
      const response = await request(app)
        .get('/api/metrics/dashboard/overview?startDate=invalid-date&endDate=2023-01-31')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle concurrent requests', async () => {
      // Mock successful responses
      User.countDocuments.mockResolvedValue(100);
      User.countDocuments.mockResolvedValueOnce(80);
      Investor.countDocuments.mockResolvedValue(50);
      Investor.countDocuments.mockResolvedValueOnce(40);
      SolarApplication.countDocuments.mockResolvedValue(200);
      SolarApplication.countDocuments.mockResolvedValueOnce(30);
      SolarApplication.countDocuments.mockResolvedValueOnce(150);
      SolarApplication.countDocuments.mockResolvedValueOnce(100);
      Transaction.aggregate.mockResolvedValue([{ total: 5000000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 3000000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 5500000 }]);

      // Make multiple concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app).get('/api/metrics/dashboard/overview')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});