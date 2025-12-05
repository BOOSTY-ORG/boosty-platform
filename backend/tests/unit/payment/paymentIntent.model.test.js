import mongoose from 'mongoose';
import PaymentIntent from '../../../src/models/payment/paymentIntent.model.js';
import { 
  generateMockPaymentIntent, 
  setupTestDatabase, 
  cleanupTestDatabase 
} from '../../helpers/payment.test.helpers.js';

describe('PaymentIntent Model', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await PaymentIntent.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid payment intent', async () => {
      const mockData = generateMockPaymentIntent();
      const paymentIntent = new PaymentIntent(mockData);
      
      const savedIntent = await paymentIntent.save();
      
      expect(savedIntent.intentId).toBe(mockData.intentId);
      expect(savedIntent.type).toBe(mockData.type);
      expect(savedIntent.amount).toBe(mockData.amount);
      expect(savedIntent.currency).toBe(mockData.currency);
      expect(savedIntent.status).toBe(mockData.status);
      expect(savedIntent.userId.toString()).toBe(mockData.userId.toString());
      expect(savedIntent.userEmail).toBe(mockData.userEmail);
    });

    it('should require intentId', async () => {
      const mockData = generateMockPaymentIntent();
      delete mockData.intentId;
      
      const paymentIntent = new PaymentIntent(mockData);
      
      await expect(paymentIntent.save()).rejects.toThrow();
    });

    it('should require type', async () => {
      const mockData = generateMockPaymentIntent();
      delete mockData.type;
      
      const paymentIntent = new PaymentIntent(mockData);
      
      await expect(paymentIntent.save()).rejects.toThrow();
    });

    it('should require amount', async () => {
      const mockData = generateMockPaymentIntent();
      delete mockData.amount;
      
      const paymentIntent = new PaymentIntent(mockData);
      
      await expect(paymentIntent.save()).rejects.toThrow();
    });

    it('should require userId', async () => {
      const mockData = generateMockPaymentIntent();
      delete mockData.userId;
      
      const paymentIntent = new PaymentIntent(mockData);
      
      await expect(paymentIntent.save()).rejects.toThrow();
    });

    it('should require userEmail', async () => {
      const mockData = generateMockPaymentIntent();
      delete mockData.userEmail;
      
      const paymentIntent = new PaymentIntent(mockData);
      
      await expect(paymentIntent.save()).rejects.toThrow();
    });

    it('should validate enum values for type', async () => {
      const mockData = generateMockPaymentIntent({ type: 'invalid_type' });
      const paymentIntent = new PaymentIntent(mockData);
      
      await expect(paymentIntent.save()).rejects.toThrow();
    });

    it('should validate enum values for status', async () => {
      const mockData = generateMockPaymentIntent({ status: 'invalid_status' });
      const paymentIntent = new PaymentIntent(mockData);
      
      await expect(paymentIntent.save()).rejects.toThrow();
    });

    it('should validate enum values for preferredPaymentMethod', async () => {
      const mockData = generateMockPaymentIntent({ 
        preferredPaymentMethod: 'invalid_method' 
      });
      const paymentIntent = new PaymentIntent(mockData);
      
      await expect(paymentIntent.save()).rejects.toThrow();
    });

    it('should set default currency to NGN', async () => {
      const mockData = generateMockPaymentIntent();
      delete mockData.currency;
      
      const paymentIntent = new PaymentIntent(mockData);
      const savedIntent = await paymentIntent.save();
      
      expect(savedIntent.currency).toBe('NGN');
    });

    it('should set default status to created', async () => {
      const mockData = generateMockPaymentIntent();
      delete mockData.status;
      
      const paymentIntent = new PaymentIntent(mockData);
      const savedIntent = await paymentIntent.save();
      
      expect(savedIntent.status).toBe('created');
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate isExpired correctly', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      const expiredIntent = new PaymentIntent(generateMockPaymentIntent({
        expiresAt: pastDate
      }));
      
      const validIntent = new PaymentIntent(generateMockPaymentIntent({
        expiresAt: futureDate
      }));
      
      expect(expiredIntent.isExpired).toBe(true);
      expect(validIntent.isExpired).toBe(false);
    });

    it('should calculate isCompleted correctly', async () => {
      const completedIntent = new PaymentIntent(generateMockPaymentIntent({
        status: 'completed'
      }));
      
      const pendingIntent = new PaymentIntent(generateMockPaymentIntent({
        status: 'pending'
      }));
      
      expect(completedIntent.isCompleted).toBe(true);
      expect(pendingIntent.isCompleted).toBe(false);
    });

    it('should calculate isPending correctly', async () => {
      const createdIntent = new PaymentIntent(generateMockPaymentIntent({
        status: 'created'
      }));
      
      const initializedIntent = new PaymentIntent(generateMockPaymentIntent({
        status: 'initialized'
      }));
      
      const pendingIntent = new PaymentIntent(generateMockPaymentIntent({
        status: 'pending'
      }));
      
      const completedIntent = new PaymentIntent(generateMockPaymentIntent({
        status: 'completed'
      }));
      
      expect(createdIntent.isPending).toBe(true);
      expect(initializedIntent.isPending).toBe(true);
      expect(pendingIntent.isPending).toBe(true);
      expect(completedIntent.isPending).toBe(false);
    });

    it('should calculate isFailed correctly', async () => {
      const failedIntent = new PaymentIntent(generateMockPaymentIntent({
        status: 'failed'
      }));
      
      const completedIntent = new PaymentIntent(generateMockPaymentIntent({
        status: 'completed'
      }));
      
      expect(failedIntent.isFailed).toBe(true);
      expect(completedIntent.isFailed).toBe(false);
    });

    it('should calculate canRetry correctly', async () => {
      const retryableIntent = new PaymentIntent(generateMockPaymentIntent({
        status: 'failed',
        retryCount: 1,
        maxRetries: 3,
        nextRetryAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      }));
      
      const nonRetryableIntent = new PaymentIntent(generateMockPaymentIntent({
        status: 'failed',
        retryCount: 3,
        maxRetries: 3
      }));
      
      const futureRetryIntent = new PaymentIntent(generateMockPaymentIntent({
        status: 'failed',
        retryCount: 1,
        maxRetries: 3,
        nextRetryAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      }));
      
      expect(retryableIntent.canRetry).toBe(true);
      expect(nonRetryableIntent.canRetry).toBe(false);
      expect(futureRetryIntent.canRetry).toBe(false);
    });

    it('should calculate netAmount correctly', async () => {
      const intentWithFees = new PaymentIntent(generateMockPaymentIntent({
        amount: 10000,
        feeStructure: {
          processingFee: 100,
          platformFee: 200,
          transactionFee: 50,
          totalFees: 350
        }
      }));
      
      const intentWithoutFees = new PaymentIntent(generateMockPaymentIntent({
        amount: 10000
      }));
      
      expect(intentWithFees.netAmount).toBe(9650);
      expect(intentWithoutFees.netAmount).toBe(10000);
    });

    it('should calculate timeToExpiry correctly', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      
      const validIntent = new PaymentIntent(generateMockPaymentIntent({
        expiresAt: futureDate
      }));
      
      const expiredIntent = new PaymentIntent(generateMockPaymentIntent({
        expiresAt: pastDate
      }));
      
      const intentWithoutExpiry = new PaymentIntent(generateMockPaymentIntent({
        expiresAt: null
      }));
      
      expect(validIntent.timeToExpiry).toBeGreaterThan(0);
      expect(expiredIntent.timeToExpiry).toBeLessThan(0);
      expect(intentWithoutExpiry.timeToExpiry).toBeNull();
    });
  });

  describe('Pre-save Middleware', () => {
    it('should generate intentId if not provided', async () => {
      const mockData = generateMockPaymentIntent();
      delete mockData.intentId;
      
      const paymentIntent = new PaymentIntent(mockData);
      const savedIntent = await paymentIntent.save();
      
      expect(savedIntent.intentId).toMatch(/^INT\d{8}\d{6}$/);
    });

    it('should set expiresAt if not provided', async () => {
      const mockData = generateMockPaymentIntent();
      delete mockData.expiresAt;
      
      const paymentIntent = new PaymentIntent(mockData);
      const savedIntent = await paymentIntent.save();
      
      const expectedExpiry = new Date(Date.now() + 30 * 60 * 1000);
      expect(savedIntent.expiresAt).toBeInstanceOf(Date);
      expect(Math.abs(savedIntent.expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });

    it('should set initializedAt when status changes to initialized', async () => {
      const mockData = generateMockPaymentIntent({ status: 'created' });
      const paymentIntent = new PaymentIntent(mockData);
      await paymentIntent.save();
      
      paymentIntent.status = 'initialized';
      const savedIntent = await paymentIntent.save();
      
      expect(savedIntent.initializedAt).toBeInstanceOf(Date);
    });

    it('should set completedAt when status changes to completed', async () => {
      const mockData = generateMockPaymentIntent({ status: 'pending' });
      const paymentIntent = new PaymentIntent(mockData);
      await paymentIntent.save();
      
      paymentIntent.status = 'completed';
      const savedIntent = await paymentIntent.save();
      
      expect(savedIntent.completedAt).toBeInstanceOf(Date);
    });

    it('should set failedAt when status changes to failed', async () => {
      const mockData = generateMockPaymentIntent({ status: 'pending' });
      const paymentIntent = new PaymentIntent(mockData);
      await paymentIntent.save();
      
      paymentIntent.status = 'failed';
      const savedIntent = await paymentIntent.save();
      
      expect(savedIntent.failedAt).toBeInstanceOf(Date);
    });

    it('should set cancelledAt when status changes to cancelled', async () => {
      const mockData = generateMockPaymentIntent({ status: 'pending' });
      const paymentIntent = new PaymentIntent(mockData);
      await paymentIntent.save();
      
      paymentIntent.status = 'cancelled';
      const savedIntent = await paymentIntent.save();
      
      expect(savedIntent.cancelledAt).toBeInstanceOf(Date);
    });

    it('should calculate totalFees when feeStructure is modified', async () => {
      const mockData = generateMockPaymentIntent({
        feeStructure: {
          processingFee: 100,
          platformFee: 200,
          transactionFee: 50
        }
      });
      
      const paymentIntent = new PaymentIntent(mockData);
      const savedIntent = await paymentIntent.save();
      
      expect(savedIntent.feeStructure.totalFees).toBe(350);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create some test data
      await PaymentIntent.create([
        generateMockPaymentIntent({ 
          intentId: 'INT001',
          status: 'completed',
          userId: new mongoose.Types.ObjectId()
        }),
        generateMockPaymentIntent({ 
          intentId: 'INT002',
          status: 'pending',
          userId: new mongoose.Types.ObjectId()
        }),
        generateMockPaymentIntent({ 
          intentId: 'INT003',
          status: 'failed',
          userId: new mongoose.Types.ObjectId()
        })
      ]);
    });

    describe('findByIntentId', () => {
      it('should find payment intent by intentId', async () => {
        const intent = await PaymentIntent.findByIntentId('INT001');
        
        expect(intent).toBeTruthy();
        expect(intent.intentId).toBe('INT001');
      });

      it('should return null for non-existent intentId', async () => {
        const intent = await PaymentIntent.findByIntentId('NONEXISTENT');
        
        expect(intent).toBeNull();
      });
    });

    describe('findByUserId', () => {
      it('should find payment intents by userId with pagination', async () => {
        const userId = new mongoose.Types.ObjectId();
        await PaymentIntent.create([
          generateMockPaymentIntent({ userId, status: 'completed' }),
          generateMockPaymentIntent({ userId, status: 'pending' }),
          generateMockPaymentIntent({ userId, status: 'failed' })
        ]);
        
        const results = await PaymentIntent.findByUserId(userId, { page: 1, limit: 2 });
        
        expect(results).toHaveLength(2);
        expect(results[0].userId.toString()).toBe(userId.toString());
      });

      it('should filter by status', async () => {
        const userId = new mongoose.Types.ObjectId();
        await PaymentIntent.create([
          generateMockPaymentIntent({ userId, status: 'completed' }),
          generateMockPaymentIntent({ userId, status: 'pending' }),
          generateMockPaymentIntent({ userId, status: 'completed' })
        ]);
        
        const results = await PaymentIntent.findByUserId(userId, { 
          status: 'completed' 
        });
        
        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(result.status).toBe('completed');
        });
      });

      it('should filter by type', async () => {
        const userId = new mongoose.Types.ObjectId();
        await PaymentIntent.create([
          generateMockPaymentIntent({ userId, type: 'investment' }),
          generateMockPaymentIntent({ userId, type: 'repayment' }),
          generateMockPaymentIntent({ userId, type: 'investment' })
        ]);
        
        const results = await PaymentIntent.findByUserId(userId, { 
          type: 'investment' 
        });
        
        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(result.type).toBe('investment');
        });
      });
    });

    describe('findExpiredIntents', () => {
      it('should find expired intents', async () => {
        const pastDate = new Date(Date.now() - 60 * 60 * 1000);
        const futureDate = new Date(Date.now() + 60 * 60 * 1000);
        
        await PaymentIntent.create([
          generateMockPaymentIntent({ 
            status: 'created',
            expiresAt: pastDate
          }),
          generateMockPaymentIntent({ 
            status: 'initialized',
            expiresAt: pastDate
          }),
          generateMockPaymentIntent({ 
            status: 'pending',
            expiresAt: futureDate
          })
        ]);
        
        const results = await PaymentIntent.findExpiredIntents();
        
        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(result.expiresAt.getTime()).toBeLessThan(Date.now());
          expect(['created', 'initialized', 'pending']).toContain(result.status);
        });
      });
    });

    describe('findRetryableIntents', () => {
      it('should find retryable intents', async () => {
        const pastDate = new Date(Date.now() - 60 * 60 * 1000);
        const futureDate = new Date(Date.now() + 60 * 60 * 1000);
        
        await PaymentIntent.create([
          generateMockPaymentIntent({ 
            status: 'failed',
            retryCount: 1,
            maxRetries: 3,
            nextRetryAt: pastDate
          }),
          generateMockPaymentIntent({ 
            status: 'failed',
            retryCount: 3,
            maxRetries: 3
          }),
          generateMockPaymentIntent({ 
            status: 'failed',
            retryCount: 1,
            maxRetries: 3,
            nextRetryAt: futureDate
          })
        ]);
        
        const results = await PaymentIntent.findRetryableIntents();
        
        expect(results).toHaveLength(1);
        expect(results[0].retryCount).toBe(1);
        expect(results[0].maxRetries).toBe(3);
      });
    });

    describe('getIntentStats', () => {
      it('should calculate intent statistics', async () => {
        await PaymentIntent.create([
          generateMockPaymentIntent({ 
            status: 'completed',
            amount: 10000
          }),
          generateMockPaymentIntent({ 
            status: 'failed',
            amount: 5000
          }),
          generateMockPaymentIntent({ 
            status: 'completed',
            amount: 15000
          })
        ]);
        
        const stats = await PaymentIntent.getIntentStats();
        
        expect(stats).toHaveLength(1);
        expect(stats[0]).toEqual({
          _id: null,
          totalIntents: 6, // 3 existing + 3 created in this test
          completedIntents: 4, // 1 existing + 2 created in this test
          failedIntents: 2, // 1 existing + 1 created in this test
          expiredIntents: 0,
          totalAmount: expect.any(Number),
          averageAmount: expect.any(Number)
        });
      });
    });

    describe('getPaymentMethodStats', () => {
      it('should calculate payment method statistics', async () => {
        const userId = new mongoose.Types.ObjectId();
        await PaymentIntent.create([
          generateMockPaymentIntent({ 
            userId,
            preferredPaymentMethod: 'card',
            amount: 10000,
            status: 'completed'
          }),
          generateMockPaymentIntent({ 
            userId,
            preferredPaymentMethod: 'card',
            amount: 5000,
            status: 'failed'
          }),
          generateMockPaymentIntent({ 
            userId,
            preferredPaymentMethod: 'bank_transfer',
            amount: 15000,
            status: 'completed'
          })
        ]);
        
        const stats = await PaymentIntent.getPaymentMethodStats({ userId });
        
        expect(stats).toHaveLength(2);
        
        const cardStats = stats.find(stat => stat._id === 'card');
        expect(cardStats.count).toBe(2);
        expect(cardStats.totalAmount).toBe(15000);
        
        const bankTransferStats = stats.find(stat => stat._id === 'bank_transfer');
        expect(bankTransferStats.count).toBe(1);
        expect(bankTransferStats.totalAmount).toBe(15000);
      });
    });

    describe('getDailyIntentStats', () => {
      it('should calculate daily statistics', async () => {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        await PaymentIntent.create([
          generateMockPaymentIntent({ 
            createdAt: today,
            status: 'completed',
            amount: 10000
          }),
          generateMockPaymentIntent({ 
            createdAt: today,
            status: 'failed',
            amount: 5000
          }),
          generateMockPaymentIntent({ 
            createdAt: yesterday,
            status: 'completed',
            amount: 15000
          })
        ]);
        
        const stats = await PaymentIntent.getDailyIntentStats(
          new Date(today.getTime() - 24 * 60 * 60 * 1000),
          today
        );
        
        expect(stats).toHaveLength(2);
        
        const todayStats = stats.find(stat => stat._id === today.toISOString().slice(0, 10));
        expect(todayStats.totalIntents).toBe(2);
        expect(todayStats.completedIntents).toBe(1);
        expect(todayStats.failedIntents).toBe(1);
      });
    });

    describe('cleanupExpiredIntents', () => {
      it('should update expired intents to expired status', async () => {
        const pastDate = new Date(Date.now() - 60 * 60 * 1000);
        const futureDate = new Date(Date.now() + 60 * 60 * 1000);
        
        await PaymentIntent.create([
          generateMockPaymentIntent({ 
            status: 'created',
            expiresAt: pastDate
          }),
          generateMockPaymentIntent({ 
            status: 'initialized',
            expiresAt: pastDate
          }),
          generateMockPaymentIntent({ 
            status: 'pending',
            expiresAt: futureDate
          })
        ]);
        
        const result = await PaymentIntent.cleanupExpiredIntents();
        
        expect(result.modifiedCount).toBe(2);
        
        const expiredIntents = await PaymentIntent.find({ status: 'expired' });
        expect(expiredIntents).toHaveLength(2);
      });
    });
  });

  describe('Indexes', () => {
    it('should have proper indexes defined', async () => {
      const indexes = await PaymentIntent.collection.getIndexes();
      
      const indexNames = indexes.map(index => index.name);
      
      // Check for required indexes
      expect(indexNames).toContain('intentId_1');
      expect(indexNames).toContain('userId_1_status_1');
      expect(indexNames).toContain('status_1_createdAt_-1');
      expect(indexNames).toContain('gatewayReference_1');
      expect(indexNames).toContain('expiresAt_1');
      expect(indexNames).toContain('type_1_status_1');
      expect(indexNames).toContain('relatedApplication_1');
      expect(indexNames).toContain('relatedInvestment_1');
      expect(indexNames).toContain('createdAt_-1');
      expect(indexNames).toContain('userId_1_type_1_status_1');
      expect(indexNames).toContain('status_1_expiresAt_1');
    });
  });
});