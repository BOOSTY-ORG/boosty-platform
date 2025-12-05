import mongoose from 'mongoose';
import PaymentTransaction from '../../../src/models/payment/paymentTransaction.model.js';
import { 
  generateMockPaymentTransaction, 
  setupTestDatabase, 
  cleanupTestDatabase 
} from '../../helpers/payment.test.helpers.js';

describe('PaymentTransaction Model', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await PaymentTransaction.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid payment transaction', async () => {
      const mockData = generateMockPaymentTransaction();
      const transaction = new PaymentTransaction(mockData);
      
      const savedTransaction = await transaction.save();
      
      expect(savedTransaction.transactionId).toBe(mockData.transactionId);
      expect(savedTransaction.type).toBe(mockData.type);
      expect(savedTransaction.amount).toBe(mockData.amount);
      expect(savedTransaction.currency).toBe(mockData.currency);
      expect(savedTransaction.status).toBe(mockData.status);
      expect(savedTransaction.fromEntityId.toString()).toBe(mockData.fromEntityId.toString());
      expect(savedTransaction.toEntityId.toString()).toBe(mockData.toEntityId.toString());
      expect(savedTransaction.paymentMethod).toBe(mockData.paymentMethod);
      expect(savedTransaction.paymentReference).toBe(mockData.paymentReference);
    });

    it('should require transactionId', async () => {
      const mockData = generateMockPaymentTransaction();
      delete mockData.transactionId;
      
      const transaction = new PaymentTransaction(mockData);
      
      await expect(transaction.save()).rejects.toThrow();
    });

    it('should require type', async () => {
      const mockData = generateMockPaymentTransaction();
      delete mockData.type;
      
      const transaction = new PaymentTransaction(mockData);
      
      await expect(transaction.save()).rejects.toThrow();
    });

    it('should require amount', async () => {
      const mockData = generateMockPaymentTransaction();
      delete mockData.amount;
      
      const transaction = new PaymentTransaction(mockData);
      
      await expect(transaction.save()).rejects.toThrow();
    });

    it('should require fromEntityId', async () => {
      const mockData = generateMockPaymentTransaction();
      delete mockData.fromEntityId;
      
      const transaction = new PaymentTransaction(mockData);
      
      await expect(transaction.save()).rejects.toThrow();
    });

    it('should require toEntityId', async () => {
      const mockData = generateMockPaymentTransaction();
      delete mockData.toEntityId;
      
      const transaction = new PaymentTransaction(mockData);
      
      await expect(transaction.save()).rejects.toThrow();
    });

    it('should require paymentMethod', async () => {
      const mockData = generateMockPaymentTransaction();
      delete mockData.paymentMethod;
      
      const transaction = new PaymentTransaction(mockData);
      
      await expect(transaction.save()).rejects.toThrow();
    });

    it('should require paymentReference', async () => {
      const mockData = generateMockPaymentTransaction();
      delete mockData.paymentReference;
      
      const transaction = new PaymentTransaction(mockData);
      
      await expect(transaction.save()).rejects.toThrow();
    });

    it('should validate enum values for type', async () => {
      const mockData = generateMockPaymentTransaction({ type: 'invalid_type' });
      const transaction = new PaymentTransaction(mockData);
      
      await expect(transaction.save()).rejects.toThrow();
    });

    it('should validate enum values for fromEntity', async () => {
      const mockData = generateMockPaymentTransaction({ fromEntity: 'invalid_entity' });
      const transaction = new PaymentTransaction(mockData);
      
      await expect(transaction.save()).rejects.toThrow();
    });

    it('should validate enum values for toEntity', async () => {
      const mockData = generateMockPaymentTransaction({ toEntity: 'invalid_entity' });
      const transaction = new PaymentTransaction(mockData);
      
      await expect(transaction.save()).rejects.toThrow();
    });

    it('should validate enum values for status', async () => {
      const mockData = generateMockPaymentTransaction({ status: 'invalid_status' });
      const transaction = new PaymentTransaction(mockData);
      
      await expect(transaction.save()).rejects.toThrow();
    });

    it('should validate enum values for paymentMethod', async () => {
      const mockData = generateMockPaymentTransaction({ 
        paymentMethod: 'invalid_method' 
      });
      const transaction = new PaymentTransaction(mockData);
      
      await expect(transaction.save()).rejects.toThrow();
    });

    it('should set default currency to NGN', async () => {
      const mockData = generateMockPaymentTransaction();
      delete mockData.currency;
      
      const transaction = new PaymentTransaction(mockData);
      const savedTransaction = await transaction.save();
      
      expect(savedTransaction.currency).toBe('NGN');
    });

    it('should set default status to pending', async () => {
      const mockData = generateMockPaymentTransaction();
      delete mockData.status;
      
      const transaction = new PaymentTransaction(mockData);
      const savedTransaction = await transaction.save();
      
      expect(savedTransaction.status).toBe('pending');
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate totalFees correctly', async () => {
      const transaction = new PaymentTransaction(generateMockPaymentTransaction({
        fees: {
          processingFee: 100,
          platformFee: 200,
          transactionFee: 50
        }
      }));
      
      expect(transaction.totalFees).toBe(350);
    });

    it('should calculate netAmount correctly for investment/repayment', async () => {
      const investmentTransaction = new PaymentTransaction(generateMockPaymentTransaction({
        type: 'investment',
        amount: 10000,
        fees: {
          processingFee: 100,
          platformFee: 200,
          transactionFee: 50
        }
      }));
      
      const refundTransaction = new PaymentTransaction(generateMockPaymentTransaction({
        type: 'refund',
        amount: 10000,
        fees: {
          processingFee: 100,
          platformFee: 200,
          transactionFee: 50
        }
      }));
      
      expect(investmentTransaction.netAmount).toBe(9650);
      expect(refundTransaction.netAmount).toBe(10000);
    });

    it('should calculate processingDuration correctly', async () => {
      const processedAt = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const completedAt = new Date();
      
      const transactionWithDuration = new PaymentTransaction(generateMockPaymentTransaction({
        processedAt,
        completedAt
      }));
      
      const transactionWithoutDuration = new PaymentTransaction(generateMockPaymentTransaction({
        processedAt: null,
        completedAt: null
      }));
      
      expect(transactionWithDuration.processingDuration).toBeGreaterThan(0);
      expect(transactionWithoutDuration.processingDuration).toBeNull();
    });

    it('should calculate isCompleted correctly', async () => {
      const completedTransaction = new PaymentTransaction(generateMockPaymentTransaction({
        status: 'completed'
      }));
      
      const pendingTransaction = new PaymentTransaction(generateMockPaymentTransaction({
        status: 'pending'
      }));
      
      expect(completedTransaction.isCompleted).toBe(true);
      expect(pendingTransaction.isCompleted).toBe(false);
    });

    it('should calculate isFailed correctly', async () => {
      const failedTransaction = new PaymentTransaction(generateMockPaymentTransaction({
        status: 'failed'
      }));
      
      const completedTransaction = new PaymentTransaction(generateMockPaymentTransaction({
        status: 'completed'
      }));
      
      expect(failedTransaction.isFailed).toBe(true);
      expect(completedTransaction.isFailed).toBe(false);
    });

    it('should calculate isRefundable correctly', async () => {
      const refundableTransaction = new PaymentTransaction(generateMockPaymentTransaction({
        status: 'completed',
        refundableAmount: 10000,
        refundStatus: 'none'
      }));
      
      const nonRefundableTransaction = new PaymentTransaction(generateMockPaymentTransaction({
        status: 'completed',
        refundableAmount: 0,
        refundStatus: 'completed'
      }));
      
      const pendingTransaction = new PaymentTransaction(generateMockPaymentTransaction({
        status: 'pending',
        refundableAmount: 10000,
        refundStatus: 'none'
      }));
      
      expect(refundableTransaction.isRefundable).toBe(true);
      expect(nonRefundableTransaction.isRefundable).toBe(false);
      expect(pendingTransaction.isRefundable).toBe(false);
    });

    it('should calculate totalSplitAmount correctly', async () => {
      const transactionWithSplits = new PaymentTransaction(generateMockPaymentTransaction({
        splitPayments: [
          {
            amount: 5000,
            subaccountId: 'SUB1'
          },
          {
            amount: 3000,
            subaccountId: 'SUB2'
          }
        ]
      }));
      
      const transactionWithoutSplits = new PaymentTransaction(generateMockPaymentTransaction({
        splitPayments: []
      }));
      
      expect(transactionWithSplits.totalSplitAmount).toBe(8000);
      expect(transactionWithoutSplits.totalSplitAmount).toBe(0);
    });
  });

  describe('Pre-save Middleware', () => {
    it('should generate transactionId if not provided', async () => {
      const mockData = generateMockPaymentTransaction();
      delete mockData.transactionId;
      
      const transaction = new PaymentTransaction(mockData);
      const savedTransaction = await transaction.save();
      
      expect(savedTransaction.transactionId).toMatch(/^TXN\d{8}\d{6}$/);
    });

    it('should set processedAt when status changes to processing', async () => {
      const mockData = generateMockPaymentTransaction({ status: 'pending' });
      const transaction = new PaymentTransaction(mockData);
      await transaction.save();
      
      transaction.status = 'processing';
      const savedTransaction = await transaction.save();
      
      expect(savedTransaction.processedAt).toBeInstanceOf(Date);
    });

    it('should set completedAt when status changes to completed', async () => {
      const mockData = generateMockPaymentTransaction({ status: 'processing' });
      const transaction = new PaymentTransaction(mockData);
      await transaction.save();
      
      transaction.status = 'completed';
      const savedTransaction = await transaction.save();
      
      expect(savedTransaction.completedAt).toBeInstanceOf(Date);
    });

    it('should set failedAt when status changes to failed', async () => {
      const mockData = generateMockPaymentTransaction({ status: 'processing' });
      const transaction = new PaymentTransaction(mockData);
      await transaction.save();
      
      transaction.status = 'failed';
      const savedTransaction = await transaction.save();
      
      expect(savedTransaction.failedAt).toBeInstanceOf(Date);
    });

    it('should calculate refundableAmount for completed transactions', async () => {
      const mockData = generateMockPaymentTransaction({
        status: 'pending',
        amount: 10000,
        fees: {
          processingFee: 100,
          platformFee: 200,
          transactionFee: 50
        }
      });
      
      const transaction = new PaymentTransaction(mockData);
      await transaction.save();
      
      transaction.status = 'completed';
      const savedTransaction = await transaction.save();
      
      expect(savedTransaction.refundableAmount).toBe(9650); // 10000 - 350
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create some test data
      await PaymentTransaction.create([
        generateMockPaymentTransaction({ 
          transactionId: 'TXN001',
          status: 'completed',
          fromEntityId: new mongoose.Types.ObjectId()
        }),
        generateMockPaymentTransaction({ 
          transactionId: 'TXN002',
          status: 'pending',
          fromEntityId: new mongoose.Types.ObjectId()
        }),
        generateMockPaymentTransaction({ 
          transactionId: 'TXN003',
          status: 'failed',
          fromEntityId: new mongoose.Types.ObjectId()
        })
      ]);
    });

    describe('findByReference', () => {
      it('should find transaction by paystackReference', async () => {
        const transaction = await PaymentTransaction.findByReference('paystack_ref_123');
        
        expect(transaction).toBeTruthy();
        expect(transaction.paystackReference).toBe('paystack_ref_123');
      });

      it('should return null for non-existent reference', async () => {
        const transaction = await PaymentTransaction.findByReference('nonexistent_ref');
        
        expect(transaction).toBeNull();
      });
    });

    describe('findByTransactionId', () => {
      it('should find transaction by transactionId', async () => {
        const transaction = await PaymentTransaction.findByTransactionId('TXN001');
        
        expect(transaction).toBeTruthy();
        expect(transaction.transactionId).toBe('TXN001');
      });

      it('should return null for non-existent transactionId', async () => {
        const transaction = await PaymentTransaction.findByTransactionId('NONEXISTENT');
        
        expect(transaction).toBeNull();
      });
    });

    describe('findWithPagination', () => {
      it('should find transactions with pagination', async () => {
        const userId = new mongoose.Types.ObjectId();
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ fromEntityId: userId }),
          generateMockPaymentTransaction({ fromEntityId: userId }),
          generateMockPaymentTransaction({ fromEntityId: userId }),
          generateMockPaymentTransaction({ fromEntityId: userId })
        ]);
        
        const results = await PaymentTransaction.findWithPagination(
          { fromEntityId: userId },
          { page: 1, limit: 2 }
        );
        
        expect(results).toHaveLength(2);
      });
    });

    describe('countWithFilter', () => {
      it('should count transactions with filter', async () => {
        const userId = new mongoose.Types.ObjectId();
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ fromEntityId: userId, status: 'completed' }),
          generateMockPaymentTransaction({ fromEntityId: userId, status: 'completed' }),
          generateMockPaymentTransaction({ fromEntityId: userId, status: 'pending' })
        ]);
        
        const count = await PaymentTransaction.countWithFilter({
          fromEntityId: userId,
          status: 'completed'
        });
        
        expect(count).toBe(2);
      });
    });

    describe('findByUser', () => {
      it('should find transactions for user (from or to)', async () => {
        const userId = new mongoose.Types.ObjectId();
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ fromEntityId: userId }),
          generateMockPaymentTransaction({ toEntityId: userId }),
          generateMockPaymentTransaction({ fromEntityId: new mongoose.Types.ObjectId() })
        ]);
        
        const results = await PaymentTransaction.findByUser(userId, { page: 1, limit: 10 });
        
        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(
            result.fromEntityId.toString() === userId.toString() ||
            result.toEntityId.toString() === userId.toString()
          ).toBe(true);
        });
      });

      it('should filter by status', async () => {
        const userId = new mongoose.Types.ObjectId();
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ fromEntityId: userId, status: 'completed' }),
          generateMockPaymentTransaction({ toEntityId: userId, status: 'pending' }),
          generateMockPaymentTransaction({ fromEntityId: userId, status: 'completed' })
        ]);
        
        const results = await PaymentTransaction.findByUser(userId, { status: 'completed' });
        
        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(result.status).toBe('completed');
        });
      });

      it('should filter by type', async () => {
        const userId = new mongoose.Types.ObjectId();
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ fromEntityId: userId, type: 'investment' }),
          generateMockPaymentTransaction({ toEntityId: userId, type: 'repayment' }),
          generateMockPaymentTransaction({ fromEntityId: userId, type: 'investment' })
        ]);
        
        const results = await PaymentTransaction.findByUser(userId, { type: 'investment' });
        
        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(result.type).toBe('investment');
        });
      });
    });

    describe('getTransactionStats', () => {
      it('should calculate transaction statistics', async () => {
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ 
            status: 'completed',
            amount: 10000,
            fees: { processingFee: 100, platformFee: 200, transactionFee: 50 }
          }),
          generateMockPaymentTransaction({ 
            status: 'failed',
            amount: 5000,
            fees: { processingFee: 50, platformFee: 100, transactionFee: 25 }
          }),
          generateMockPaymentTransaction({ 
            status: 'completed',
            amount: 15000,
            fees: { processingFee: 150, platformFee: 300, transactionFee: 75 }
          })
        ]);
        
        const stats = await PaymentTransaction.getTransactionStats();
        
        expect(stats).toHaveLength(1);
        expect(stats[0]).toEqual({
          _id: null,
          totalTransactions: 6, // 3 existing + 3 created in this test
          totalAmount: 30000,
          totalFees: 1050,
          netAmount: 28950,
          successfulTransactions: 4, // 1 existing + 2 created in this test
          failedTransactions: 2, // 1 existing + 1 created in this test
          averageAmount: 5000
        });
      });
    });

    describe('getPaymentMethodStats', () => {
      it('should calculate payment method statistics', async () => {
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ 
            paymentMethod: 'card',
            amount: 10000,
            status: 'completed'
          }),
          generateMockPaymentTransaction({ 
            paymentMethod: 'card',
            amount: 5000,
            status: 'failed'
          }),
          generateMockPaymentTransaction({ 
            paymentMethod: 'bank_transfer',
            amount: 15000,
            status: 'completed'
          })
        ]);
        
        const stats = await PaymentTransaction.getPaymentMethodStats();
        
        expect(stats).toHaveLength(3);
        
        const cardStats = stats.find(stat => stat._id === 'card');
        expect(cardStats.count).toBe(2);
        expect(cardStats.totalAmount).toBe(15000);
        expect(cardStats.averageAmount).toBe(7500);
        
        const bankTransferStats = stats.find(stat => stat._id === 'bank_transfer');
        expect(bankTransferStats.count).toBe(1);
        expect(bankTransferStats.totalAmount).toBe(15000);
      });
    });

    describe('getDailyTransactionStats', () => {
      it('should calculate daily statistics', async () => {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ 
            createdAt: today,
            status: 'completed',
            amount: 10000
          }),
          generateMockPaymentTransaction({ 
            createdAt: today,
            status: 'failed',
            amount: 5000
          }),
          generateMockPaymentTransaction({ 
            createdAt: yesterday,
            status: 'completed',
            amount: 15000
          })
        ]);
        
        const stats = await PaymentTransaction.getDailyTransactionStats(
          new Date(today.getTime() - 24 * 60 * 60 * 1000),
          today
        );
        
        expect(stats).toHaveLength(2);
        
        const todayStats = stats.find(stat => stat._id === today.toISOString().slice(0, 10));
        expect(todayStats.totalTransactions).toBe(2);
        expect(todayStats.successfulTransactions).toBe(1);
        expect(todayStats.failedTransactions).toBe(1);
        expect(todayStats.totalAmount).toBe(15000);
      });
    });

    describe('findWithAdvancedFilters', () => {
      it('should filter by date range', async () => {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ createdAt: today }),
          generateMockPaymentTransaction({ createdAt: lastWeek }),
          generateMockPaymentTransaction({ 
            createdAt: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000) 
          })
        ]);
        
        const results = await PaymentTransaction.findWithAdvancedFilters({
          startDate: lastWeek.toISOString(),
          endDate: today.toISOString()
        });
        
        expect(results).toHaveLength(2);
      });

      it('should filter by status array', async () => {
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ status: 'completed' }),
          generateMockPaymentTransaction({ status: 'pending' }),
          generateMockPaymentTransaction({ status: 'failed' })
        ]);
        
        const results = await PaymentTransaction.findWithAdvancedFilters({
          status: ['completed', 'pending']
        });
        
        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(['completed', 'pending']).toContain(result.status);
        });
      });

      it('should filter by amount range', async () => {
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ amount: 5000 }),
          generateMockPaymentTransaction({ amount: 10000 }),
          generateMockPaymentTransaction({ amount: 15000 })
        ]);
        
        const results = await PaymentTransaction.findWithAdvancedFilters({
          minAmount: 6000,
          maxAmount: 12000
        });
        
        expect(results).toHaveLength(1);
        expect(results[0].amount).toBe(10000);
      });

      it('should filter by user entity', async () => {
        const userId = new mongoose.Types.ObjectId();
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ fromEntityId: userId }),
          generateMockPaymentTransaction({ toEntityId: userId }),
          generateMockPaymentTransaction({ fromEntityId: new mongoose.Types.ObjectId() })
        ]);
        
        const results = await PaymentTransaction.findWithAdvancedFilters({
          userEntity: userId
        });
        
        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(
            result.fromEntityId.toString() === userId.toString() ||
            result.toEntityId.toString() === userId.toString()
          ).toBe(true);
        });
      });

      it('should search by transactionId or reference', async () => {
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ transactionId: 'TXN123456' }),
          generateMockPaymentTransaction({ paymentReference: 'REF123456' }),
          generateMockPaymentTransaction({ paystackReference: 'PAY123456' })
        ]);
        
        const results = await PaymentTransaction.findWithAdvancedFilters({
          search: '123456'
        });
        
        expect(results).toHaveLength(2);
      });
    });

    describe('getAdvancedTransactionStats', () => {
      it('should calculate advanced statistics', async () => {
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ 
            status: 'completed',
            amount: 10000,
            processingDuration: 5000
          }),
          generateMockPaymentTransaction({ 
            status: 'failed',
            amount: 5000,
            processingDuration: 2000
          }),
          generateMockPaymentTransaction({ 
            status: 'pending',
            amount: 15000,
            processingDuration: null
          })
        ]);
        
        const stats = await PaymentTransaction.getAdvancedTransactionStats();
        
        expect(stats).toHaveLength(1);
        expect(stats[0]).toEqual({
          _id: null,
          totalTransactions: 6, // 3 existing + 3 created in this test
          totalAmount: 30000,
          totalFees: expect.any(Number),
          netAmount: expect.any(Number),
          successfulTransactions: 4, // 1 existing + 2 created in this test
          failedTransactions: 2, // 1 existing + 1 created in this test
          pendingTransactions: 1,
          processingTransactions: 0,
          refundedTransactions: 0,
          averageAmount: 5000,
          minAmount: expect.any(Number),
          maxAmount: expect.any(Number),
          averageProcessingTime: expect.any(Number),
          totalRefundAmount: 0,
          successRate: 66.66666666666667,
          failureRate: 33.33333333333333,
          refundRate: 0
        });
      });
    });

    describe('getTransactionVolumeByPeriod', () => {
      it('should calculate volume by day', async () => {
        const today = new Date();
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ 
            createdAt: today,
            status: 'completed',
            amount: 10000
          }),
          generateMockPaymentTransaction({ 
            createdAt: today,
            status: 'completed',
            amount: 5000
          })
        ]);
        
        const stats = await PaymentTransaction.getTransactionVolumeByPeriod({}, 'day');
        
        expect(stats).toHaveLength(1);
        expect(stats[0]).toEqual({
          _id: today.toISOString().slice(0, 10),
          timestamp: expect.any(Date),
          count: 2,
          totalAmount: 15000,
          totalFees: expect.any(Number),
          successfulTransactions: 2,
          failedTransactions: 0,
          averageAmount: 7500,
          uniqueUserCount: 2,
          uniqueInvestorCount: 2,
          successRate: 100
        });
      });
    });

    describe('getTransactionBreakdownByField', () => {
      it('should breakdown by type field', async () => {
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ type: 'investment', amount: 10000 }),
          generateMockPaymentTransaction({ type: 'investment', amount: 5000 }),
          generateMockPaymentTransaction({ type: 'repayment', amount: 15000 })
        ]);
        
        const stats = await PaymentTransaction.getTransactionBreakdownByField('type');
        
        expect(stats).toHaveLength(2);
        
        const investmentStats = stats.find(stat => stat._id === 'investment');
        expect(investmentStats.count).toBe(2);
        expect(investmentStats.totalAmount).toBe(15000);
        expect(investmentStats.successRate).toBe(100);
        
        const repaymentStats = stats.find(stat => stat._id === 'repayment');
        expect(repaymentStats.count).toBe(1);
        expect(repaymentStats.totalAmount).toBe(15000);
        expect(repaymentStats.successRate).toBe(100);
      });
    });

    describe('getRecentFailedTransactions', () => {
      it('should get recent failed transactions', async () => {
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
        
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ 
            status: 'failed',
            failedAt: twoHoursAgo
          }),
          generateMockPaymentTransaction({ 
            status: 'failed',
            failedAt: oneHourAgo
          }),
          generateMockPaymentTransaction({ 
            status: 'failed',
            failedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000) // 25 hours ago
          })
        ]);
        
        const results = await PaymentTransaction.getRecentFailedTransactions(24, 50);
        
        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(result.status).toBe('failed');
          expect(result.failedAt.getTime()).toBeGreaterThan(oneHourAgo.getTime());
        });
      });
    });

    describe('getTransactionSuccessRateByTime', () => {
      it('should calculate success rate by time', async () => {
        const today = new Date();
        const morning = new Date(today.setHours(9));
        const afternoon = new Date(today.setHours(15));
        
        await PaymentTransaction.create([
          generateMockPaymentTransaction({ 
            createdAt: morning,
            status: 'completed'
          }),
          generateMockPaymentTransaction({ 
            createdAt: morning,
            status: 'failed'
          }),
          generateMockPaymentTransaction({ 
            createdAt: afternoon,
            status: 'completed'
          }),
          generateMockPaymentTransaction({ 
            createdAt: afternoon,
            status: 'completed'
          })
        ]);
        
        const stats = await PaymentTransaction.getTransactionSuccessRateByTime();
        
        expect(stats).toHaveLength(2);
        
        const morningStats = stats.find(stat => 
          stat._id.hour === 9 && stat._id.dayOfWeek === today.getDay()
        );
        expect(morningStats.totalTransactions).toBe(2);
        expect(morningStats.successfulTransactions).toBe(1);
        expect(morningStats.successRate).toBe(50);
        
        const afternoonStats = stats.find(stat => 
          stat._id.hour === 15 && stat._id.dayOfWeek === today.getDay()
        );
        expect(afternoonStats.totalTransactions).toBe(2);
        expect(afternoonStats.successfulTransactions).toBe(2);
        expect(afternoonStats.successRate).toBe(100);
      });
    });
  });

  describe('Indexes', () => {
    it('should have proper indexes defined', async () => {
      const indexes = await PaymentTransaction.collection.getIndexes();
      
      const indexNames = indexes.map(index => index.name);
      
      // Check for required indexes
      expect(indexNames).toContain('transactionId_1');
      expect(indexNames).toContain('paystackReference_1');
      expect(indexNames).toContain('status_1_createdAt_-1');
      expect(indexNames).toContain('fromEntityId_1_status_1_createdAt_-1');
      expect(indexNames).toContain('toEntityId_1_status_1_createdAt_-1');
      expect(indexNames).toContain('paymentMethod_1_status_1_createdAt_-1');
      expect(indexNames).toContain('type_1_status_1_completedAt_-1');
      expect(indexNames).toContain('createdAt_-1_amount_-1');
      expect(indexNames).toContain('type_1_createdAt_-1');
      expect(indexNames).toContain('completedAt_-1_amount_-1');
      expect(indexNames).toContain('kycVerified_1_status_1');
      expect(indexNames).toContain('amlScreeningPassed_1_createdAt_-1');
      expect(indexNames).toContain('splitCode_1_status_1_createdAt_-1');
      expect(indexNames).toContain('subscriptionId_1_subscriptionStatus_1');
      expect(indexNames).toContain('fraudFlag_1_createdAt_-1');
      
      // Check for compound indexes
      expect(indexNames).toContain('fromEntityId_1_type_1_status_1_createdAt_-1');
      expect(indexNames).toContain('toEntityId_1_type_1_status_1_createdAt_-1');
      expect(indexNames).toContain('status_1_type_1_amount_-1');
    });
  });
});