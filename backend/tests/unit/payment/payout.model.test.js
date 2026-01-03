import mongoose from 'mongoose';
import Payout from '../../../src/models/payment/payout.model.js';
import { 
  generateMockPayout, 
  setupTestDatabase, 
  cleanupTestDatabase 
} from '../../helpers/payment.test.helpers.js';

describe('Payout Model', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await Payout.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid payout', async () => {
      const mockData = generateMockPayout();
      const payout = new Payout(mockData);
      
      const savedPayout = await payout.save();
      
      expect(savedPayout.payoutId).toBe(mockData.payoutId);
      expect(savedPayout.type).toBe(mockData.type);
      expect(savedPayout.amount).toBe(mockData.amount);
      expect(savedPayout.currency).toBe(mockData.currency);
      expect(savedPayout.status).toBe(mockData.status);
      expect(savedPayout.recipientId.toString()).toBe(mockData.recipientId.toString());
      expect(savedPayout.recipientType).toBe(mockData.recipientType);
      expect(savedPayout.recipientEmail).toBe(mockData.recipientEmail);
    });

    it('should require payoutId', async () => {
      const mockData = generateMockPayout();
      delete mockData.payoutId;
      
      const payout = new Payout(mockData);
      
      await expect(payout.save()).rejects.toThrow();
    });

    it('should require type', async () => {
      const mockData = generateMockPayout();
      delete mockData.type;
      
      const payout = new Payout(mockData);
      
      await expect(payout.save()).rejects.toThrow();
    });

    it('should require amount', async () => {
      const mockData = generateMockPayout();
      delete mockData.amount;
      
      const payout = new Payout(mockData);
      
      await expect(payout.save()).rejects.toThrow();
    });

    it('should require recipientId', async () => {
      const mockData = generateMockPayout();
      delete mockData.recipientId;
      
      const payout = new Payout(mockData);
      
      await expect(payout.save()).rejects.toThrow();
    });

    it('should require recipientType', async () => {
      const mockData = generateMockPayout();
      delete mockData.recipientType;
      
      const payout = new Payout(mockData);
      
      await expect(payout.save()).rejects.toThrow();
    });

    it('should require recipientEmail', async () => {
      const mockData = generateMockPayout();
      delete mockData.recipientEmail;
      
      const payout = new Payout(mockData);
      
      await expect(payout.save()).rejects.toThrow();
    });

    it('should require scheduledFor', async () => {
      const mockData = generateMockPayout();
      delete mockData.scheduledFor;
      
      const payout = new Payout(mockData);
      
      await expect(payout.save()).rejects.toThrow();
    });

    it('should validate enum values for type', async () => {
      const mockData = generateMockPayout({ type: 'invalid_type' });
      const payout = new Payout(mockData);
      
      await expect(payout.save()).rejects.toThrow();
    });

    it('should validate enum values for status', async () => {
      const mockData = generateMockPayout({ status: 'invalid_status' });
      const payout = new Payout(mockData);
      
      await expect(payout.save()).rejects.toThrow();
    });

    it('should validate enum values for recipientType', async () => {
      const mockData = generateMockPayout({ recipientType: 'invalid_type' });
      const payout = new Payout(mockData);
      
      await expect(payout.save()).rejects.toThrow();
    });

    it('should set default currency to NGN', async () => {
      const mockData = generateMockPayout();
      delete mockData.currency;
      
      const payout = new Payout(mockData);
      const savedPayout = await payout.save();
      
      expect(savedPayout.currency).toBe('NGN');
    });

    it('should set default status to pending', async () => {
      const mockData = generateMockPayout();
      delete mockData.status;
      
      const payout = new Payout(mockData);
      const savedPayout = await payout.save();
      
      expect(savedPayout.status).toBe('pending');
    });

    it('should set default priority to normal', async () => {
      const mockData = generateMockPayout();
      delete mockData.priority;
      
      const payout = new Payout(mockData);
      const savedPayout = await payout.save();
      
      expect(savedPayout.priority).toBe('normal');
    });

    it('should set default approvalStatus to pending', async () => {
      const mockData = generateMockPayout();
      delete mockData.approvalStatus;
      
      const payout = new Payout(mockData);
      const savedPayout = await payout.save();
      
      expect(savedPayout.approvalStatus).toBe('pending');
    });

    it('should set default batchStatus to individual', async () => {
      const mockData = generateMockPayout();
      delete mockData.batchStatus;
      
      const payout = new Payout(mockData);
      const savedPayout = await payout.save();
      
      expect(savedPayout.batchStatus).toBe('individual');
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate totalFees correctly', async () => {
      const payout = new Payout(generateMockPayout({
        fees: {
          processingFee: 100,
          transferFee: 200,
          taxWithheld: 300,
          platformFee: 150
        }
      }));
      
      expect(payout.totalFees).toBe(750);
    });

    it('should calculate netAmount correctly', async () => {
      const payout = new Payout(generateMockPayout({
        amount: 10000,
        fees: {
          processingFee: 100,
          transferFee: 200,
          taxWithheld: 300,
          platformFee: 150
        }
      }));
      
      expect(payout.netAmount).toBe(9250); // 10000 - 750
    });

    it('should calculate isPending correctly', async () => {
      const pendingPayout = new Payout(generateMockPayout({
        status: 'pending'
      }));
      
      const completedPayout = new Payout(generateMockPayout({
        status: 'completed'
      }));
      
      expect(pendingPayout.isPending).toBe(true);
      expect(completedPayout.isPending).toBe(false);
    });

    it('should calculate isCompleted correctly', async () => {
      const completedPayout = new Payout(generateMockPayout({
        status: 'completed'
      }));
      
      const pendingPayout = new Payout(generateMockPayout({
        status: 'pending'
      }));
      
      expect(completedPayout.isCompleted).toBe(true);
      expect(pendingPayout.isCompleted).toBe(false);
    });

    it('should calculate isFailed correctly', async () => {
      const failedPayout = new Payout(generateMockPayout({
        status: 'failed'
      }));
      
      const completedPayout = new Payout(generateMockPayout({
        status: 'completed'
      }));
      
      expect(failedPayout.isFailed).toBe(true);
      expect(completedPayout.isFailed).toBe(false);
    });

    it('should calculate canProcess correctly', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      const futureDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      
      const processablePayout = new Payout(generateMockPayout({
        status: 'pending',
        approvalStatus: 'approved',
        scheduledFor: pastDate
      }));
      
      const nonProcessablePayout1 = new Payout(generateMockPayout({
        status: 'pending',
        approvalStatus: 'pending',
        scheduledFor: pastDate
      }));
      
      const nonProcessablePayout2 = new Payout(generateMockPayout({
        status: 'pending',
        approvalStatus: 'approved',
        scheduledFor: futureDate
      }));
      
      expect(processablePayout.canProcess).toBe(true);
      expect(nonProcessablePayout1.canProcess).toBe(false);
      expect(nonProcessablePayout2.canProcess).toBe(false);
    });

    it('should calculate daysSinceScheduled correctly', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      
      const payout = new Payout(generateMockPayout({
        scheduledFor: twoDaysAgo
      }));
      
      expect(payout.daysSinceScheduled).toBe(2);
    });
  });

  describe('Pre-save Middleware', () => {
    it('should generate payoutId if not provided', async () => {
      const mockData = generateMockPayout();
      delete mockData.payoutId;
      
      const payout = new Payout(mockData);
      const savedPayout = await payout.save();
      
      expect(savedPayout.payoutId).toMatch(/^PAY\d{8}\d{6}$/);
    });

    it('should set processedAt when status changes to processing', async () => {
      const mockData = generateMockPayout({ status: 'pending' });
      const payout = new Payout(mockData);
      await payout.save();
      
      payout.status = 'processing';
      const savedPayout = await payout.save();
      
      expect(savedPayout.processedAt).toBeInstanceOf(Date);
    });

    it('should set completedAt when status changes to completed', async () => {
      const mockData = generateMockPayout({ status: 'processing' });
      const payout = new Payout(mockData);
      await payout.save();
      
      payout.status = 'completed';
      const savedPayout = await payout.save();
      
      expect(savedPayout.completedAt).toBeInstanceOf(Date);
    });

    it('should set failedAt when status changes to failed', async () => {
      const mockData = generateMockPayout({ status: 'processing' });
      const payout = new Payout(mockData);
      await payout.save();
      
      payout.status = 'failed';
      const savedPayout = await payout.save();
      
      expect(savedPayout.failedAt).toBeInstanceOf(Date);
    });

    it('should auto-approve low amounts', async () => {
      const mockData = generateMockPayout({
        amount: 5000, // Below 10000 threshold
        approvalStatus: 'pending'
      });
      
      const payout = new Payout(mockData);
      const savedPayout = await payout.save();
      
      expect(savedPayout.approvalStatus).toBe('approved');
      expect(savedPayout.approvedAt).toBeInstanceOf(Date);
    });

    it('should not auto-approve high amounts', async () => {
      const mockData = generateMockPayout({
        amount: 15000, // Above 10000 threshold
        approvalStatus: 'pending'
      });
      
      const payout = new Payout(mockData);
      const savedPayout = await payout.save();
      
      expect(savedPayout.approvalStatus).toBe('pending');
      expect(savedPayout.approvedAt).toBeUndefined();
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create some test data
      await Payout.create([
        generateMockPayout({ 
          payoutId: 'PAY001',
          status: 'completed',
          recipientId: new mongoose.Types.ObjectId()
        }),
        generateMockPayout({ 
          payoutId: 'PAY002',
          status: 'pending',
          recipientId: new mongoose.Types.ObjectId()
        }),
        generateMockPayout({ 
          payoutId: 'PAY003',
          status: 'failed',
          recipientId: new mongoose.Types.ObjectId()
        })
      ]);
    });

    describe('findByPayoutId', () => {
      it('should find payout by payoutId', async () => {
        const payout = await Payout.findByPayoutId('PAY001');
        
        expect(payout).toBeTruthy();
        expect(payout.payoutId).toBe('PAY001');
      });

      it('should return null for non-existent payoutId', async () => {
        const payout = await Payout.findByPayoutId('NONEXISTENT');
        
        expect(payout).toBeNull();
      });
    });

    describe('findByRecipient', () => {
      it('should find payouts by recipientId with pagination', async () => {
        const recipientId = new mongoose.Types.ObjectId();
        await Payout.create([
          generateMockPayout({ recipientId, status: 'completed' }),
          generateMockPayout({ recipientId, status: 'pending' }),
          generateMockPayout({ recipientId, status: 'failed' })
        ]);
        
        const results = await Payout.findByRecipient(recipientId, { page: 1, limit: 2 });
        
        expect(results).toHaveLength(2);
        expect(results[0].recipientId.toString()).toBe(recipientId.toString());
      });

      it('should filter by status', async () => {
        const recipientId = new mongoose.Types.ObjectId();
        await Payout.create([
          generateMockPayout({ recipientId, status: 'completed' }),
          generateMockPayout({ recipientId, status: 'pending' }),
          generateMockPayout({ recipientId, status: 'completed' })
        ]);
        
        const results = await Payout.findByRecipient(recipientId, { 
          status: 'completed' 
        });
        
        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(result.status).toBe('completed');
        });
      });

      it('should filter by type', async () => {
        const recipientId = new mongoose.Types.ObjectId();
        await Payout.create([
          generateMockPayout({ recipientId, type: 'roi_payment' }),
          generateMockPayout({ recipientId, type: 'profit_sharing' }),
          generateMockPayout({ recipientId, type: 'roi_payment' })
        ]);
        
        const results = await Payout.findByRecipient(recipientId, { 
          type: 'roi_payment' 
        });
        
        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(result.type).toBe('roi_payment');
        });
      });
    });

    describe('findPendingPayouts', () => {
      it('should find pending payouts with approval', async () => {
        const now = new Date();
        const pastDate = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
        
        await Payout.create([
          generateMockPayout({ 
            status: 'pending',
            approvalStatus: 'approved',
            scheduledFor: pastDate
          }),
          generateMockPayout({ 
            status: 'pending',
            approvalStatus: 'pending',
            scheduledFor: pastDate
          }),
          generateMockPayout({ 
            status: 'pending',
            approvalStatus: 'approved',
            scheduledFor: new Date(now.getTime() + 60 * 60 * 1000) // Future
          })
        ]);
        
        const results = await Payout.findPendingPayouts();
        
        expect(results).toHaveLength(1);
        expect(results[0].approvalStatus).toBe('approved');
        expect(results[0].scheduledFor.getTime()).toBeLessThan(now.getTime());
      });
    });

    describe('findBatchPayouts', () => {
      it('should find payouts by batchId', async () => {
        const batchId = 'BATCH123456';
        await Payout.create([
          generateMockPayout({ batchId }),
          generateMockPayout({ batchId }),
          generateMockPayout({ batchId: 'OTHER_BATCH' })
        ]);
        
        const results = await Payout.findBatchPayouts(batchId);
        
        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(result.batchId).toBe(batchId);
        });
      });
    });

    describe('getPayoutStats', () => {
      it('should calculate payout statistics', async () => {
        await Payout.create([
          generateMockPayout({ 
            status: 'completed',
            amount: 10000,
            fees: { processingFee: 100, transferFee: 200, taxWithheld: 300, platformFee: 150 }
          }),
          generateMockPayout({ 
            status: 'failed',
            amount: 5000,
            fees: { processingFee: 50, transferFee: 100, taxWithheld: 150, platformFee: 75 }
          }),
          generateMockPayout({ 
            status: 'completed',
            amount: 15000,
            fees: { processingFee: 150, transferFee: 300, taxWithheld: 450, platformFee: 225 }
          })
        ]);
        
        const stats = await Payout.getPayoutStats();
        
        expect(stats).toHaveLength(1);
        expect(stats[0]).toEqual({
          _id: null,
          totalPayouts: 6, // 3 existing + 3 created in this test
          totalAmount: 30000,
          totalFees: 2100, // Sum of all fees
          netAmount: 27900,
          completedPayouts: 4, // 1 existing + 2 created in this test
          failedPayouts: 2, // 1 existing + 1 created in this test
          pendingPayouts: 0,
          averageAmount: 5000
        });
      });
    });

    describe('getPayoutTypeStats', () => {
      it('should calculate payout type statistics', async () => {
        const recipientId = new mongoose.Types.ObjectId();
        await Payout.create([
          generateMockPayout({ 
            recipientId,
            type: 'roi_payment',
            amount: 10000,
            status: 'completed'
          }),
          generateMockPayout({ 
            recipientId,
            type: 'roi_payment',
            amount: 5000,
            status: 'failed'
          }),
          generateMockPayout({ 
            recipientId,
            type: 'profit_sharing',
            amount: 15000,
            status: 'completed'
          })
        ]);
        
        const stats = await Payout.getPayoutTypeStats({ recipientId });
        
        expect(stats).toHaveLength(2);
        
        const roiStats = stats.find(stat => stat._id === 'roi_payment');
        expect(roiStats.count).toBe(2);
        expect(roiStats.totalAmount).toBe(15000);
        expect(roiStats.successRate).toBe(50); // 1 completed out of 2
        
        const profitStats = stats.find(stat => stat._id === 'profit_sharing');
        expect(profitStats.count).toBe(1);
        expect(profitStats.totalAmount).toBe(15000);
        expect(profitStats.successRate).toBe(100);
      });
    });

    describe('getDailyPayoutStats', () => {
      it('should calculate daily statistics', async () => {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        await Payout.create([
          generateMockPayout({ 
            completedAt: today,
            status: 'completed',
            amount: 10000
          }),
          generateMockPayout({ 
            completedAt: today,
            status: 'failed',
            amount: 5000
          }),
          generateMockPayout({ 
            completedAt: yesterday,
            status: 'completed',
            amount: 15000
          })
        ]);
        
        const stats = await Payout.getDailyPayoutStats(
          new Date(today.getTime() - 24 * 60 * 60 * 1000),
          today
        );
        
        expect(stats).toHaveLength(2);
        
        const todayStats = stats.find(stat => stat._id === today.toISOString().slice(0, 10));
        expect(todayStats.totalPayouts).toBe(2);
        expect(todayStats.totalAmount).toBe(15000);
        
        const yesterdayStats = stats.find(stat => stat._id === yesterday.toISOString().slice(0, 10));
        expect(yesterdayStats.totalPayouts).toBe(1);
        expect(yesterdayStats.totalAmount).toBe(15000);
      });
    });

    describe('createBatch', () => {
      it('should create batch from payout IDs', async () => {
        const payoutIds = [
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId()
        ];
        
        await Payout.create([
          generateMockPayout({ _id: payoutIds[0] }),
          generateMockPayout({ _id: payoutIds[1] }),
          generateMockPayout({ _id: payoutIds[2] })
        ]);
        
        const result = await Payout.createBatch(payoutIds, 'BATCH123');
        
        expect(result.modifiedCount).toBe(3);
        
        const updatedPayouts = await Payout.find({ batchId: 'BATCH123' });
        expect(updatedPayouts).toHaveLength(3);
        updatedPayouts.forEach(payout => {
          expect(payout.batchId).toBe('BATCH123');
          expect(payout.batchStatus).toBe('batch_pending');
        });
      });
    });

    describe('processBatch', () => {
      it('should process batch', async () => {
        const payoutIds = [
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId()
        ];
        
        await Payout.create([
          generateMockPayout({ 
            _id: payoutIds[0],
            batchId: 'BATCH123'
          }),
          generateMockPayout({ 
            _id: payoutIds[1],
            batchId: 'BATCH123'
          }),
          generateMockPayout({ 
            _id: payoutIds[2],
            batchId: 'BATCH123'
          })
        ]);
        
        const result = await Payout.processBatch('BATCH123');
        
        expect(result.modifiedCount).toBe(3);
        
        const updatedPayouts = await Payout.find({ batchId: 'BATCH123' });
        expect(updatedPayouts).toHaveLength(3);
        updatedPayouts.forEach(payout => {
          expect(payout.batchStatus).toBe('batch_processing');
          expect(payout.status).toBe('processing');
        });
      });
    });

    describe('completeBatch', () => {
      it('should complete batch', async () => {
        const payoutIds = [
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId()
        ];
        
        await Payout.create([
          generateMockPayout({ 
            _id: payoutIds[0],
            batchId: 'BATCH123'
          }),
          generateMockPayout({ 
            _id: payoutIds[1],
            batchId: 'BATCH123'
          }),
          generateMockPayout({ 
            _id: payoutIds[2],
            batchId: 'BATCH123'
          })
        ]);
        
        const result = await Payout.completeBatch('BATCH123');
        
        expect(result.modifiedCount).toBe(3);
        
        const updatedPayouts = await Payout.find({ batchId: 'BATCH123' });
        expect(updatedPayouts).toHaveLength(3);
        updatedPayouts.forEach(payout => {
          expect(payout.batchStatus).toBe('batch_completed');
          expect(payout.status).toBe('completed');
          expect(payout.completedAt).toBeInstanceOf(Date);
        });
      });
    });
  });

  describe('Indexes', () => {
    it('should have proper indexes defined', async () => {
      const indexes = await Payout.collection.getIndexes();
      
      const indexNames = indexes.map(index => index.name);
      
      // Check for required indexes
      expect(indexNames).toContain('payoutId_1');
      expect(indexNames).toContain('recipientId_1_status_1');
      expect(indexNames).toContain('status_1_createdAt_-1');
      expect(indexNames).toContain('type_1_status_1');
      expect(indexNames).toContain('scheduledFor_1');
      expect(indexNames).toContain('gatewayReference_1');
      expect(indexNames).toContain('batchId_1');
      expect(indexNames).toContain('relatedInvestment_1');
      expect(indexNames).toContain('relatedTransaction_1');
      expect(indexNames).toContain('relatedProject_1');
      expect(indexNames).toContain('createdAt_-1');
      expect(indexNames).toContain('completedAt_-1');
      
      // Check for compound indexes
      expect(indexNames).toContain('recipientId_1_type_1_status_1');
      expect(indexNames).toContain('status_1_scheduledFor_1');
      expect(indexNames).toContain('batchStatus_1_status_1');
    });
  });
});