import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/express.js';
import { createTestData, createMockRequest, createMockResponse, createMockNext } from '../../helpers/metrics.test.helpers.js';
import Transaction from '../../../src/models/metrics/transaction.model.js';
import Investment from '../../../src/models/metrics/investment.model.js';
import SolarApplication from '../../../src/models/metrics/solarApplication.model.js';
import Investor from '../../../src/models/metrics/investor.model.js';
import User from '../../../src/models/user.model.js';

// Mock models to control their behavior in tests
jest.mock('../../../src/models/metrics/transaction.model.js');
jest.mock('../../../src/models/metrics/investment.model.js');
jest.mock('../../../src/models/metrics/solarApplication.model.js');
jest.mock('../../../src/models/metrics/investor.model.js');
jest.mock('../../../src/models/user.model.js');

describe('Transaction Controller', () => {
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

  describe('getTransactionMetrics', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return transaction metrics successfully', async () => {
      // Mock database calls
      Transaction.countDocuments.mockResolvedValue(1000); // Total transactions
      Transaction.countDocuments.mockResolvedValueOnce(800); // Completed transactions
      Transaction.countDocuments.mockResolvedValueOnce(150); // Pending transactions
      Transaction.countDocuments.mockResolvedValueOnce(50); // Failed transactions
      
      // Mock aggregation calls
      Transaction.aggregate.mockResolvedValueOnce([{ total: 50000000 }]); // Transaction volume
      Transaction.aggregate.mockResolvedValueOnce([{ total: 250000 }]); // Transaction fees
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: 'investment', count: 400, volume: 30000000 },
        { _id: 'repayment', count: 350, volume: 20000000 },
        { _id: 'fee', count: 200, volume: 250000 },
        { _id: 'refund', count: 50, volume: 5000000 }
      ]); // Transaction type breakdown
      
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: 'bank_transfer', count: 500, volume: 35000000 },
        { _id: 'card', count: 300, volume: 15000000 },
        { _id: 'wallet', count: 150, volume: 8000000 },
        { _id: 'auto_debit', count: 50, volume: 2000000 }
      ]); // Payment method breakdown
      
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: 'completed', count: 800 },
        { _id: 'pending', count: 150 },
        { _id: 'failed', count: 50 }
      ]); // Status breakdown

      const response = await request(app)
        .get('/api/metrics/transactions')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.growth).toBeDefined();
      expect(response.body.data.breakdowns).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
      expect(response.body.data.trends).toBeDefined();
      
      // Verify summary metrics
      expect(response.body.data.summary.totalTransactions).toBe(1000);
      expect(response.body.data.summary.completedTransactions).toBe(800);
      expect(response.body.data.summary.pendingTransactions).toBe(150);
      expect(response.body.data.summary.failedTransactions).toBe(50);
      expect(response.body.data.summary.totalVolume).toBe(50000000);
      expect(response.body.data.summary.totalFees).toBe(250000);
      expect(response.body.data.summary.averageTransactionValue).toBe(50000); // 50000000/1000
      expect(response.body.data.summary.completionRate).toBe(80); // 800/1000 * 100
    });

    it('should handle date range parameters correctly', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      Transaction.countDocuments.mockResolvedValue(500);
      Transaction.countDocuments.mockResolvedValueOnce(400);
      Transaction.countDocuments.mockResolvedValueOnce(75);
      Transaction.countDocuments.mockResolvedValueOnce(25);
      
      Transaction.aggregate.mockResolvedValueOnce([{ total: 25000000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 125000 }]);
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: 'investment', count: 200, volume: 15000000 },
        { _id: 'repayment', count: 175, volume: 10000000 },
        { _id: 'fee', count: 100, volume: 125000 },
        { _id: 'refund', count: 25, volume: 2500000 }
      ]);
      
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: 'bank_transfer', count: 250, volume: 17500000 },
        { _id: 'card', count: 150, volume: 7500000 },
        { _id: 'wallet', count: 75, volume: 4000000 },
        { _id: 'auto_debit', count: 25, volume: 1000000 }
      ]);
      
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: 'completed', count: 400 },
        { _id: 'pending', count: 75 },
        { _id: 'failed', count: 25 }
      ]);

      const response = await request(app)
        .get(`/api/metrics/transactions?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Transaction.countDocuments).toHaveBeenCalledWith({
        createdAt: { 
          $gte: expect.any(Date), 
          $lte: expect.any(Date) 
        }
      });
    });

    it('should handle filter parameters', async () => {
      Transaction.countDocuments.mockResolvedValue(300);
      Transaction.countDocuments.mockResolvedValueOnce(240);
      Transaction.countDocuments.mockResolvedValueOnce(45);
      Transaction.countDocuments.mockResolvedValueOnce(15);
      
      Transaction.aggregate.mockResolvedValueOnce([{ total: 15000000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 75000 }]);
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: 'investment', count: 120, volume: 9000000 },
        { _id: 'repayment', count: 105, volume: 6000000 },
        { _id: 'fee', count: 60, volume: 75000 },
        { _id: 'refund', count: 15, volume: 1500000 }
      ]);
      
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: 'bank_transfer', count: 150, volume: 10500000 },
        { _id: 'card', count: 90, volume: 4500000 },
        { _id: 'wallet', count: 45, volume: 2400000 },
        { _id: 'auto_debit', count: 15, volume: 600000 }
      ]);
      
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: 'completed', count: 240 },
        { _id: 'pending', count: 45 },
        { _id: 'failed', count: 15 }
      ]);

      const response = await request(app)
        .get('/api/metrics/transactions?type=investment&status=completed')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should calculate growth metrics correctly', async () => {
      // Mock current period data
      Transaction.countDocuments.mockResolvedValueOnce(1000); // Current period
      Transaction.countDocuments.mockResolvedValueOnce(800); // Completed
      Transaction.countDocuments.mockResolvedValueOnce(150); // Pending
      Transaction.countDocuments.mockResolvedValueOnce(50); // Failed
      
      Transaction.aggregate.mockResolvedValueOnce([{ total: 50000000 }]); // Volume
      Transaction.aggregate.mockResolvedValueOnce([{ total: 250000 }]); // Fees
      Transaction.aggregate.mockResolvedValueOnce([]); // Type breakdown
      Transaction.aggregate.mockResolvedValueOnce([]); // Payment method
      Transaction.aggregate.mockResolvedValueOnce([]); // Status
      
      // Mock previous period data
      Transaction.countDocuments.mockResolvedValueOnce(800); // Previous period
      Transaction.aggregate.mockResolvedValueOnce([{ total: 40000000 }]); // Previous volume

      const response = await request(app)
        .get('/api/metrics/transactions')
        .expect(200);

      expect(response.body.data.growth.transactionGrowth).toBeDefined();
      expect(response.body.data.growth.volumeGrowth).toBeDefined();
      
      // Verify growth calculation
      expect(response.body.data.growth.transactionGrowth.current).toBe(1000);
      expect(response.body.data.growth.transactionGrowth.previous).toBe(800);
      expect(response.body.data.growth.transactionGrowth.percentage).toBe(25); // (1000-800)/800 * 100
      expect(response.body.data.growth.transactionGrowth.trend).toBe('up');
    });

    it('should handle database errors gracefully', async () => {
      Transaction.countDocuments.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/metrics/transactions')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle zero values in calculations', async () => {
      Transaction.countDocuments.mockResolvedValue(0);
      Transaction.countDocuments.mockResolvedValueOnce(0);
      Transaction.countDocuments.mockResolvedValueOnce(0);
      Transaction.countDocuments.mockResolvedValueOnce(0);
      
      Transaction.aggregate.mockResolvedValueOnce([{ total: 0 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 0 }]);
      Transaction.aggregate.mockResolvedValueOnce([]);
      Transaction.aggregate.mockResolvedValueOnce([]);
      Transaction.aggregate.mockResolvedValueOnce([]);
      
      Transaction.countDocuments.mockResolvedValueOnce(0); // Previous period
      Transaction.aggregate.mockResolvedValueOnce([{ total: 0 }]); // Previous volume

      const response = await request(app)
        .get('/api/metrics/transactions')
        .expect(200);

      expect(response.body.data.summary.averageTransactionValue).toBe(0);
      expect(response.body.data.summary.completionRate).toBe(0);
      expect(response.body.data.growth.transactionGrowth.percentage).toBe(0);
      expect(response.body.data.growth.transactionGrowth.trend).toBe('stable');
    });
  });

  describe('getTransactionDetails', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return transaction details successfully', async () => {
      const transactionId = '507f1f77bcf86cd799439011';
      
      // Mock transaction lookup
      Transaction.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({
              _id: transactionId,
              transactionId: 'TXN123456',
              type: 'investment',
              fromEntity: 'investor',
              toEntity: 'user',
              fromEntityId: 'investor123',
              toEntityId: 'user123',
              amount: 100000,
              currency: 'NGN',
              status: 'completed',
              paymentMethod: 'bank_transfer',
              paymentReference: 'REF123456',
              fees: {
                processingFee: 1000,
                platformFee: 500,
                transactionFee: 200
              },
              totalFees: 1700,
              netAmount: 98300,
              metadata: { source: 'web' },
              createdAt: new Date('2023-01-01'),
              processedAt: new Date('2023-01-01'),
              completedAt: new Date('2023-01-02'),
              processingDuration: 86400000, // 1 day in ms
              relatedApplication: { applicationId: 'APP1234' },
              relatedInvestment: { investmentId: 'INV1234' }
            })
          })
        })
      });
      
      // Mock related entities
      Investor.findById.mockResolvedValue({
        _id: 'investor123',
        userId: { name: 'John Investor', email: 'investor@example.com' }
      });
      
      User.findById.mockResolvedValue({
        _id: 'user123',
        name: 'Jane User',
        email: 'user@example.com'
      });

      const response = await request(app)
        .get(`/api/metrics/transactions/${transactionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.transaction).toBeDefined();
      expect(response.body.data.relatedEntities).toBeDefined();
      expect(response.body.data.relatedApplication).toBeDefined();
      expect(response.body.data.relatedInvestment).toBeDefined();
      
      expect(response.body.data.transaction.id).toBe(transactionId);
      expect(response.body.data.transaction.type).toBe('investment');
      expect(response.body.data.transaction.amount).toBe(100000);
      expect(response.body.data.transaction.status).toBe('completed');
      expect(response.body.data.transaction.totalFees).toBe(1700);
      expect(response.body.data.transaction.netAmount).toBe(98300);
    });

    it('should handle non-existent transaction', async () => {
      const transactionId = '507f1f77bcf86cd799439011';
      
      Transaction.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(null)
          })
        })
      });

      const response = await request(app)
        .get(`/api/metrics/transactions/${transactionId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TRANSACTION_NOT_FOUND');
      expect(response.body.error.message).toBe('Transaction not found');
    });

    it('should handle invalid transaction ID', async () => {
      const response = await request(app)
        .get('/api/metrics/transactions/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should handle different entity types correctly', async () => {
      const transactionId = '507f1f77bcf86cd799439011';
      
      Transaction.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({
              _id: transactionId,
              type: 'repayment',
              fromEntity: 'user',
              toEntity: 'investor',
              fromEntityId: 'user123',
              toEntityId: 'investor123'
            })
          })
        })
      });
      
      // Mock related entities for repayment
      User.findById.mockResolvedValue({
        _id: 'user123',
        name: 'Jane User',
        email: 'user@example.com'
      });
      
      Investor.findById.mockResolvedValue({
        _id: 'investor123',
        userId: { name: 'John Investor', email: 'investor@example.com' }
      });

      const response = await request(app)
        .get(`/api/metrics/transactions/${transactionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.type).toBe('repayment');
      expect(response.body.data.relatedEntities.from.name).toBe('Jane User');
      expect(response.body.data.relatedEntities.to.name).toBe('John Investor');
    });
  });

  describe('getTransactionList', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return paginated transaction list successfully', async () => {
      // Mock database calls
      Transaction.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                {
                  _id: 'txn1',
                  transactionId: 'TXN123456',
                  type: 'investment',
                  fromEntity: 'investor',
                  toEntity: 'user',
                  fromEntityId: { name: 'John Investor', email: 'investor@example.com' },
                  toEntityId: { name: 'Jane User', email: 'user@example.com' },
                  amount: 100000,
                  status: 'completed',
                  paymentMethod: 'bank_transfer',
                  createdAt: new Date('2023-01-01'),
                  completedAt: new Date('2023-01-02'),
                  relatedApplication: { applicationId: 'APP1234' }
                },
                {
                  _id: 'txn2',
                  transactionId: 'TXN123457',
                  type: 'repayment',
                  fromEntity: 'user',
                  toEntity: 'investor',
                  fromEntityId: { name: 'Jane User', email: 'user@example.com' },
                  toEntityId: { name: 'John Investor', email: 'investor@example.com' },
                  amount: 15000,
                  status: 'completed',
                  paymentMethod: 'auto_debit',
                  createdAt: new Date('2023-01-05'),
                  completedAt: new Date('2023-01-06'),
                  relatedApplication: { applicationId: 'APP1234' }
                }
              ])
            })
          })
        })
      });
      
      Transaction.countDocuments.mockResolvedValue(250);

      const response = await request(app)
        .get('/api/metrics/transactions/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(250);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.totalPages).toBe(13);
      
      // Verify transaction data
      expect(response.body.data[0].transactionId).toBe('TXN123456');
      expect(response.body.data[0].type).toBe('investment');
      expect(response.body.data[0].amount).toBe(100000);
      expect(response.body.data[0].fromEntityName).toBe('John Investor');
      expect(response.body.data[0].toEntityName).toBe('Jane User');
    });

    it('should handle pagination parameters correctly', async () => {
      Transaction.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                { _id: 'txn1', transactionId: 'TXN123456' }
              ])
            })
          })
        })
      });
      
      Transaction.countDocuments.mockResolvedValue(100);

      const response = await request(app)
        .get('/api/metrics/transactions/list?page=2&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.totalPages).toBe(10);
      expect(Transaction.find().skip).toHaveBeenCalledWith(10); // (page-1) * limit
    });

    it('should handle filter parameters in list', async () => {
      Transaction.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                { _id: 'txn1', type: 'investment', status: 'completed' }
              ])
            })
          })
        })
      });
      
      Transaction.countDocuments.mockResolvedValue(50);

      const response = await request(app)
        .get('/api/metrics/transactions/list?type=investment&status=completed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].type).toBe('investment');
      expect(response.body.data[0].status).toBe('completed');
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/metrics/transactions/list?page=0&limit=101')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('getTransactionPerformanceMetrics', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return transaction performance metrics successfully', async () => {
      // Mock database calls
      Transaction.countDocuments.mockResolvedValue(1000); // Total transactions
      Transaction.countDocuments.mockResolvedValueOnce(800); // Completed transactions
      Transaction.countDocuments.mockResolvedValueOnce(150); // Pending transactions
      Transaction.countDocuments.mockResolvedValueOnce(50); // Failed transactions
      
      // Mock processing time analysis
      Transaction.aggregate.mockResolvedValueOnce([{
        _id: null,
        avgProcessingTime: 3600000, // 1 hour in ms
        minProcessingTime: 1800000, // 30 minutes
        maxProcessingTime: 7200000  // 2 hours
      }]);
      
      // Mock success rate by payment method
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: 'bank_transfer', total: 500, successful: 475 },
        { _id: 'card', total: 300, successful: 270 },
        { _id: 'wallet', total: 150, successful: 135 },
        { _id: 'auto_debit', total: 50, successful: 45 }
      ]);
      
      // Mock value distribution
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: 1000, count: 200, totalVolume: 150000 },
        { _id: 5000, count: 300, totalVolume: 1200000 },
        { _id: 10000, count: 250, totalVolume: 2250000 },
        { _id: 25000, count: 150, totalVolume: 3375000 },
        { _id: 50000, count: 80, totalVolume: 3600000 },
        { _id: 100000, count: 20, totalVolume: 1500000 }
      ]);

      const response = await request(app)
        .get('/api/metrics/transactions/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalTransactions).toBe(1000);
      expect(response.body.data.completedTransactions).toBe(800);
      expect(response.body.data.failedTransactions).toBe(50);
      expect(response.body.data.successRate).toBe(80);
      expect(response.body.data.failureRate).toBe(5);
      expect(response.body.data.averageProcessingTime).toBe(3600000);
      
      // Verify processing time
      expect(response.body.data.processingTime.average).toBe(3600000);
      expect(response.body.data.processingTime.minimum).toBe(1800000);
      expect(response.body.data.processingTime.maximum).toBe(7200000);
      
      // Verify success rate by payment method
      expect(response.body.data.successRateByMethod).toHaveLength(4);
      expect(response.body.data.successRateByMethod[0].paymentMethod).toBe('bank_transfer');
      expect(response.body.data.successRateByMethod[0].totalTransactions).toBe(500);
      expect(response.body.data.successRateByMethod[0].successRate).toBe(95); // 475/500 * 100
      
      // Verify value distribution
      expect(response.body.data.valueDistribution).toHaveLength(6);
      expect(response.body.data.valueDistribution[0].range).toBe('₦0 - ₦1,000');
      expect(response.body.data.valueDistribution[0].count).toBe(200);
      expect(response.body.data.valueDistribution[0].totalVolume).toBe(150000);
    });

    it('should handle empty performance data', async () => {
      Transaction.countDocuments.mockResolvedValue(0);
      Transaction.countDocuments.mockResolvedValueOnce(0);
      Transaction.countDocuments.mockResolvedValueOnce(0);
      Transaction.countDocuments.mockResolvedValueOnce(0);
      
      Transaction.aggregate.mockResolvedValueOnce([{}]); // Processing time with null values
      Transaction.aggregate.mockResolvedValueOnce([]); // Success rate by method
      Transaction.aggregate.mockResolvedValueOnce([]); // Value distribution

      const response = await request(app)
        .get('/api/metrics/transactions/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.successRate).toBe(0);
      expect(response.body.data.failureRate).toBe(0);
      expect(response.body.data.processingTime.average).toBe(0);
      expect(response.body.data.processingTime.minimum).toBe(0);
      expect(response.body.data.processingTime.maximum).toBe(0);
    });

    it('should handle database errors in performance metrics', async () => {
      Transaction.countDocuments.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/metrics/transactions/performance')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('getTransactionAnalytics', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return transaction analytics successfully', async () => {
      // Mock transaction flow analysis
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: { from: 'investor', to: 'user', type: 'investment' }, count: 400, volume: 30000000 },
        { _id: { from: 'user', to: 'investor', type: 'repayment' }, count: 350, volume: 20000000 },
        { _id: { from: 'user', to: 'system', type: 'fee' }, count: 200, volume: 250000 },
        { _id: { from: 'user', to: 'system', type: 'refund' }, count: 50, volume: 5000000 }
      ]);
      
      // Mock hourly patterns
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: 9, count: 50, volume: 2500000 },
        { _id: 10, count: 80, volume: 4000000 },
        { _id: 11, count: 100, volume: 5000000 },
        { _id: 12, count: 90, volume: 4500000 },
        { _id: 13, count: 70, volume: 3500000 },
        { _id: 14, count: 60, volume: 3000000 },
        { _id: 15, count: 40, volume: 2000000 }
      ]);
      
      // Mock daily patterns
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: { year: 2023, month: 1, day: 1 }, count: 100, volume: 5000000 },
        { _id: { year: 2023, month: 1, day: 2 }, count: 120, volume: 6000000 },
        { _id: { year: 2023, month: 1, day: 3 }, count: 80, volume: 4000000 }
      ]);
      
      // Mock failure analysis
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: { type: 'investment', paymentMethod: 'card', failureReason: 'Insufficient funds' }, count: 20 },
        { _id: { type: 'repayment', paymentMethod: 'bank_transfer', failureReason: 'Invalid account' }, count: 15 },
        { _id: { type: 'fee', paymentMethod: 'wallet', failureReason: 'Bank error' }, count: 10 }
      ]);

      const response = await request(app)
        .get('/api/metrics/transactions/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.transactionFlow).toBeDefined();
      expect(response.body.data.hourlyPatterns).toBeDefined();
      expect(response.body.data.dailyPatterns).toBeDefined();
      expect(response.body.data.failureAnalysis).toBeDefined();
      
      // Verify transaction flow
      expect(response.body.data.transactionFlow).toHaveLength(4);
      expect(response.body.data.transactionFlow[0].from).toBe('investor');
      expect(response.body.data.transactionFlow[0].to).toBe('user');
      expect(response.body.data.transactionFlow[0].type).toBe('investment');
      expect(response.body.data.transactionFlow[0].count).toBe(400);
      expect(response.body.data.transactionFlow[0].volume).toBe(30000000);
      
      // Verify hourly patterns
      expect(response.body.data.hourlyPatterns).toHaveLength(7);
      expect(response.body.data.hourlyPatterns[0].hour).toBe(9);
      expect(response.body.data.hourlyPatterns[0].count).toBe(50);
      expect(response.body.data.hourlyPatterns[0].volume).toBe(2500000);
      
      // Verify daily patterns
      expect(response.body.data.dailyPatterns).toHaveLength(3);
      expect(response.body.data.dailyPatterns[0].date).toBe('2023-01-01');
      expect(response.body.data.dailyPatterns[0].count).toBe(100);
      expect(response.body.data.dailyPatterns[0].volume).toBe(5000000);
      
      // Verify failure analysis
      expect(response.body.data.failureAnalysis).toHaveLength(3);
      expect(response.body.data.failureAnalysis[0].type).toBe('investment');
      expect(response.body.data.failureAnalysis[0].paymentMethod).toBe('card');
      expect(response.body.data.failureAnalysis[0].failureReason).toBe('Insufficient funds');
      expect(response.body.data.failureAnalysis[0].count).toBe(20);
    });

    it('should handle empty analytics data', async () => {
      Transaction.aggregate.mockResolvedValueOnce([]); // Transaction flow
      Transaction.aggregate.mockResolvedValueOnce([]); // Hourly patterns
      Transaction.aggregate.mockResolvedValueOnce([]); // Daily patterns
      Transaction.aggregate.mockResolvedValueOnce([]); // Failure analysis

      const response = await request(app)
        .get('/api/metrics/transactions/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactionFlow).toHaveLength(0);
      expect(response.body.data.hourlyPatterns).toHaveLength(0);
      expect(response.body.data.dailyPatterns).toHaveLength(0);
      expect(response.body.data.failureAnalysis).toHaveLength(0);
    });

    it('should handle database errors in analytics', async () => {
      Transaction.aggregate.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/metrics/transactions/analytics')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent requests', async () => {
      // Mock successful responses
      Transaction.countDocuments.mockResolvedValue(1000);
      Transaction.countDocuments.mockResolvedValueOnce(800);
      Transaction.countDocuments.mockResolvedValueOnce(150);
      Transaction.countDocuments.mockResolvedValueOnce(50);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 50000000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 250000 }]);
      Transaction.aggregate.mockResolvedValueOnce([]);
      Transaction.aggregate.mockResolvedValueOnce([]);
      Transaction.aggregate.mockResolvedValueOnce([]);

      // Make multiple concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app).get('/api/metrics/transactions')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle malformed query parameters', async () => {
      const response = await request(app)
        .get('/api/metrics/transactions?startDate=invalid-date')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle very large pagination values', async () => {
      const response = await request(app)
        .get('/api/metrics/transactions/list?page=1&limit=1000')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});