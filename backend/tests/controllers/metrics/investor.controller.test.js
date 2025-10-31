import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/express.js';
import { createTestData, createMockRequest, createMockResponse, createMockNext } from '../../helpers/metrics.test.helpers.js';
import Investor from '../../../src/models/metrics/investor.model.js';
import Investment from '../../../src/models/metrics/investment.model.js';
import Transaction from '../../../src/models/metrics/transaction.model.js';
import User from '../../../src/models/user.model.js';

// Mock models to control their behavior in tests
jest.mock('../../../src/models/metrics/investor.model.js');
jest.mock('../../../src/models/metrics/investment.model.js');
jest.mock('../../../src/models/metrics/transaction.model.js');
jest.mock('../../../src/models/user.model.js');

describe('Investor Controller', () => {
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

  describe('getInvestorMetrics', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return investor metrics successfully', async () => {
      // Mock database calls
      Investor.countDocuments.mockResolvedValue(100); // Total investors
      Investor.countDocuments.mockResolvedValueOnce(80); // Active investors
      Investor.countDocuments.mockResolvedValueOnce(20); // New investors
      
      // Mock aggregation calls
      Investor.aggregate.mockResolvedValueOnce([
        { _id: 'individual', count: 60 },
        { _id: 'institutional', count: 30 },
        { _id: 'corporate', count: 10 }
      ]); // Investor type breakdown
      
      Investor.aggregate.mockResolvedValueOnce([
        { _id: 'conservative', count: 30 },
        { _id: 'moderate', count: 50 },
        { _id: 'aggressive', count: 20 }
      ]); // Risk profile breakdown
      
      Investor.aggregate.mockResolvedValueOnce([
        { _id: 'pending', count: 10 },
        { _id: 'verified', count: 85 },
        { _id: 'rejected', count: 5 }
      ]); // Verification status breakdown
      
      // Mock top investors
      Investor.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([
              {
                _id: 'investor1',
                userId: { name: 'John Doe', email: 'john@example.com' },
                investorType: 'individual',
                totalInvested: 1000000,
                actualReturns: 150000,
                roi: 15,
                performance: { activeInvestments: 5 }
              }
            ])
          })
        })
      });
      
      // Mock regional distribution
      Investor.aggregate.mockResolvedValueOnce([
        { _id: ['Lagos', 'Abuja'], count: 40 },
        { _id: ['Kano', 'Kaduna'], count: 30 },
        { _id: ['Port Harcourt'], count: 30 }
      ]);

      const response = await request(app)
        .get('/api/metrics/investors')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.breakdowns).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
      expect(response.body.data.topInvestors).toBeDefined();
      expect(response.body.data.trends).toBeDefined();
      
      // Verify summary metrics
      expect(response.body.data.summary.totalInvestors).toBe(100);
      expect(response.body.data.summary.activeInvestors).toBe(80);
      expect(response.body.data.summary.newInvestors).toBe(20);
    });

    it('should handle date range parameters correctly', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      Investor.countDocuments.mockResolvedValue(50);
      Investor.countDocuments.mockResolvedValueOnce(40);
      Investor.countDocuments.mockResolvedValueOnce(10);
      
      Investor.aggregate.mockResolvedValueOnce([
        { _id: 'individual', count: 30 },
        { _id: 'institutional', count: 15 },
        { _id: 'corporate', count: 5 }
      ]);
      
      Investor.aggregate.mockResolvedValueOnce([
        { _id: 'moderate', count: 25 },
        { _id: 'conservative', count: 15 },
        { _id: 'aggressive', count: 10 }
      ]);
      
      Investor.aggregate.mockResolvedValueOnce([
        { _id: 'verified', count: 45 },
        { _id: 'pending', count: 5 }
      ]);
      
      Investor.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([])
          })
        })
      });
      
      Investor.aggregate.mockResolvedValueOnce([]);

      const response = await request(app)
        .get(`/api/metrics/investors?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Investor.countDocuments).toHaveBeenCalledWith({
        createdAt: { 
          $gte: expect.any(Date), 
          $lte: expect.any(Date) 
        }
      });
    });

    it('should handle filter parameters', async () => {
      Investor.countDocuments.mockResolvedValue(30);
      Investor.countDocuments.mockResolvedValueOnce(25);
      Investor.countDocuments.mockResolvedValueOnce(5);
      
      Investor.aggregate.mockResolvedValueOnce([
        { _id: 'individual', count: 20 },
        { _id: 'institutional', count: 10 }
      ]);
      
      Investor.aggregate.mockResolvedValueOnce([
        { _id: 'moderate', count: 15 },
        { _id: 'aggressive', count: 15 }
      ]);
      
      Investor.aggregate.mockResolvedValueOnce([
        { _id: 'verified', count: 28 },
        { _id: 'pending', count: 2 }
      ]);
      
      Investor.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([])
          })
        })
      });
      
      Investor.aggregate.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/metrics/investors?investorType=individual&riskProfile=moderate')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      Investor.countDocuments.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/metrics/investors')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should calculate average investment per investor correctly', async () => {
      Investor.countDocuments.mockResolvedValue(10);
      Investor.countDocuments.mockResolvedValueOnce(8);
      Investor.countDocuments.mockResolvedValueOnce(2);
      
      // Mock investment metrics
      Investor.aggregate.mockResolvedValueOnce([]); // Type breakdown
      Investor.aggregate.mockResolvedValueOnce([]); // Risk profile
      Investor.aggregate.mockResolvedValueOnce([]); // Verification status
      Investor.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([])
          })
        })
      });
      Investor.aggregate.mockResolvedValueOnce([]); // Regional
      Investor.aggregate.mockResolvedValueOnce([{ total: 5000000 }]); // Total investments
      
      Investor.aggregate.mockResolvedValueOnce([{ total: 750000 }]); // Total returns
      Investment.countDocuments.mockResolvedValue(15); // Active investments

      const response = await request(app)
        .get('/api/metrics/investors')
        .expect(200);

      expect(response.body.data.summary.averageInvestmentPerInvestor).toBe(500000);
      expect(response.body.data.summary.totalInvestmentVolume).toBe(5000000);
      expect(response.body.data.summary.totalReturns).toBe(750000);
    });
  });

  describe('getInvestorDetails', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return investor details successfully', async () => {
      const investorId = '507f1f77bcf86cd799439011';
      
      // Mock investor lookup
      Investor.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({
            _id: investorId,
            userId: { name: 'John Doe', email: 'john@example.com' },
            investorType: 'individual',
            verificationStatus: 'verified',
            riskProfile: 'moderate',
            joinedAt: new Date('2023-01-01'),
            isActive: true,
            totalInvested: 1000000,
            availableFunds: 500000,
            expectedReturns: 1200000,
            actualReturns: 150000,
            roi: 15,
            totalValue: 1150000
          })
        })
      });
      
      // Mock investments
      Investment.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          {
            _id: 'investment1',
            applicationId: { applicationId: 'APP1234', propertyDetails: { propertyType: 'residential' } },
            amount: 500000,
            expectedReturn: 600000,
            actualReturn: 75000,
            status: 'active',
            startDate: new Date('2023-01-01'),
            endDate: new Date('2024-01-01'),
            currentROI: 15
          }
        ])
      });
      
      // Mock transactions
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            _id: 'transaction1',
            transactionId: 'TXN123456',
            type: 'investment',
            amount: 500000,
            status: 'completed',
            paymentMethod: 'bank_transfer',
            createdAt: new Date('2023-01-01'),
            completedAt: new Date('2023-01-02')
          }
        ])
      });

      const response = await request(app)
        .get(`/api/metrics/investors/${investorId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.investor).toBeDefined();
      expect(response.body.data.financials).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
      expect(response.body.data.investments).toBeDefined();
      expect(response.body.data.transactions).toBeDefined();
      expect(response.body.data.detailedMetrics).toBeDefined();
      
      expect(response.body.data.investor.id).toBe(investorId);
      expect(response.body.data.investor.investorType).toBe('individual');
      expect(response.body.data.financials.totalInvested).toBe(1000000);
    });

    it('should handle non-existent investor', async () => {
      const investorId = '507f1f77bcf86cd799439011';
      
      Investor.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        })
      });

      const response = await request(app)
        .get(`/api/metrics/investors/${investorId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVESTOR_NOT_FOUND');
      expect(response.body.error.message).toBe('Investor not found');
    });

    it('should handle invalid investor ID', async () => {
      const response = await request(app)
        .get('/api/metrics/investors/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should include detailed metrics calculation', async () => {
      const investorId = '507f1f77bcf86cd799439011';
      
      Investor.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({
            _id: investorId,
            userId: { name: 'John Doe', email: 'john@example.com' },
            investorType: 'individual',
            verificationStatus: 'verified',
            riskProfile: 'moderate',
            joinedAt: new Date('2023-01-01'),
            isActive: true
          })
        })
      });
      
      Investment.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          {
            _id: 'investment1',
            amount: 500000,
            status: 'active',
            performance: { onTimePayments: 5, latePayments: 1 }
          },
          {
            _id: 'investment2',
            amount: 300000,
            status: 'completed',
            performance: { onTimePayments: 12, latePayments: 0 }
          }
        ])
      });
      
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            _id: 'transaction1',
            type: 'investment',
            amount: 500000,
            createdAt: new Date('2023-01-01')
          },
          {
            _id: 'transaction2',
            type: 'repayment',
            amount: 75000,
            createdAt: new Date('2023-02-01')
          }
        ])
      });

      const response = await request(app)
        .get(`/api/metrics/investors/${investorId}`)
        .expect(200);

      expect(response.body.data.detailedMetrics).toBeDefined();
      expect(response.body.data.detailedMetrics.totalTransactions).toBe(2);
      expect(response.body.data.detailedMetrics.totalInvestmentAmount).toBe(800000);
      expect(response.body.data.detailedMetrics.totalRepaymentAmount).toBe(75000);
      expect(response.body.data.detailedMetrics.activeInvestments).toBe(1);
      expect(response.body.data.detailedMetrics.completedInvestments).toBe(1);
      expect(response.body.data.detailedMetrics.avgInvestmentSize).toBe(400000);
    });
  });

  describe('getInvestorList', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return paginated investor list successfully', async () => {
      // Mock database calls
      Investor.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                {
                  _id: 'investor1',
                  userId: { name: 'John Doe', email: 'john@example.com' },
                  investorType: 'individual',
                  verificationStatus: 'verified',
                  riskProfile: 'moderate',
                  totalInvested: 1000000,
                  actualReturns: 150000,
                  roi: 15,
                  isActive: true,
                  joinedAt: new Date('2023-01-01')
                },
                {
                  _id: 'investor2',
                  userId: { name: 'Jane Smith', email: 'jane@example.com' },
                  investorType: 'institutional',
                  verificationStatus: 'verified',
                  riskProfile: 'conservative',
                  totalInvested: 2000000,
                  actualReturns: 300000,
                  roi: 15,
                  isActive: true,
                  joinedAt: new Date('2023-02-01')
                }
              ])
            })
          })
        })
      });
      
      Investor.countDocuments.mockResolvedValue(25);

      const response = await request(app)
        .get('/api/metrics/investors/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(25);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.totalPages).toBe(2);
    });

    it('should handle pagination parameters correctly', async () => {
      Investor.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                { _id: 'investor1', userId: { name: 'John Doe' } }
              ])
            })
          })
        })
      });
      
      Investor.countDocuments.mockResolvedValue(50);

      const response = await request(app)
        .get('/api/metrics/investors/list?page=2&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.totalPages).toBe(5);
      expect(Investor.find().skip).toHaveBeenCalledWith(10); // (page-1) * limit
    });

    it('should handle filter parameters in list', async () => {
      Investor.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                { _id: 'investor1', userId: { name: 'John Doe' }, investorType: 'individual' }
              ])
            })
          })
        })
      });
      
      Investor.countDocuments.mockResolvedValue(10);

      const response = await request(app)
        .get('/api/metrics/investors/list?investorType=individual&verificationStatus=verified')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].investorType).toBe('individual');
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/metrics/investors/list?page=0&limit=101')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('getInvestorPerformanceMetrics', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return investor performance metrics successfully', async () => {
      // Mock database calls
      Investor.aggregate.mockResolvedValueOnce([
        { _id: 5, count: 10, investors: ['id1', 'id2'] },
        { _id: 10, count: 15, investors: ['id3', 'id4'] },
        { _id: 15, count: 20, investors: ['id5', 'id6'] },
        { _id: 20, count: 25, investors: ['id7', 'id8'] },
        { _id: 25, count: 30, investors: ['id9', 'id10'] }
      ]); // ROI distribution
      
      Investment.aggregate.mockResolvedValueOnce([{
        _id: null,
        avgDuration: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
        minDuration: 180 * 24 * 60 * 60 * 1000, // 6 months
        maxDuration: 730 * 24 * 60 * 60 * 1000  // 2 years
      }]); // Duration analysis
      
      // Mock other performance metrics
      Investor.aggregate.mockResolvedValueOnce([{ avgROI: 15.5 }]); // Average ROI
      Investment.countDocuments.mockResolvedValueOnce(100); // Total investments
      Investment.countDocuments.mockResolvedValueOnce(80); // Completed investments
      Investment.countDocuments.mockResolvedValueOnce(5); // Defaulted investments

      const response = await request(app)
        .get('/api/metrics/investors/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.roiDistribution).toBeDefined();
      expect(response.body.data.investmentDuration).toBeDefined();
      expect(response.body.data.averageROI).toBe(15.5);
      expect(response.body.data.completionRate).toBe(80);
      expect(response.body.data.defaultRate).toBe(5);
      
      // Verify ROI distribution
      expect(response.body.data.roiDistribution).toHaveLength(5);
      expect(response.body.data.roiDistribution[0].range).toBe('0-5%');
      expect(response.body.data.roiDistribution[0].count).toBe(10);
      
      // Verify investment duration
      expect(response.body.data.investmentDuration.average).toBe(365 * 24 * 60 * 60 * 1000);
      expect(response.body.data.investmentDuration.minimum).toBe(180 * 24 * 60 * 60 * 1000);
      expect(response.body.data.investmentDuration.maximum).toBe(730 * 24 * 60 * 60 * 1000);
    });

    it('should handle empty performance data', async () => {
      Investor.aggregate.mockResolvedValueOnce([]); // ROI distribution
      Investment.aggregate.mockResolvedValueOnce([{}]); // Duration analysis with null values
      Investor.aggregate.mockResolvedValueOnce([{ avgROI: 0 }]); // Average ROI
      Investment.countDocuments.mockResolvedValueOnce(0); // Total investments
      Investment.countDocuments.mockResolvedValueOnce(0); // Completed investments
      Investment.countDocuments.mockResolvedValueOnce(0); // Defaulted investments

      const response = await request(app)
        .get('/api/metrics/investors/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.averageROI).toBe(0);
      expect(response.body.data.completionRate).toBe(0);
      expect(response.body.data.defaultRate).toBe(0);
    });

    it('should handle database errors in performance metrics', async () => {
      Investor.aggregate.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/metrics/investors/performance')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent requests', async () => {
      // Mock successful responses
      Investor.countDocuments.mockResolvedValue(100);
      Investor.countDocuments.mockResolvedValueOnce(80);
      Investor.countDocuments.mockResolvedValueOnce(20);
      Investor.aggregate.mockResolvedValueOnce([]);
      Investor.aggregate.mockResolvedValueOnce([]);
      Investor.aggregate.mockResolvedValueOnce([]);
      Investor.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([])
          })
        })
      });
      Investor.aggregate.mockResolvedValueOnce([]);

      // Make multiple concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app).get('/api/metrics/investors')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle malformed query parameters', async () => {
      const response = await request(app)
        .get('/api/metrics/investors?startDate=invalid-date')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle very large pagination values', async () => {
      const response = await request(app)
        .get('/api/metrics/investors/list?page=1&limit=1000')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});