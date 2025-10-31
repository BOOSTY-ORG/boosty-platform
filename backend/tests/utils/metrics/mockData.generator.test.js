import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  generateMockData,
  generateTestUser,
  generateTestInvestor,
  MOCK_CONFIG
} from '../../../src/utils/metrics/mockData.generator.js';
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

describe('Mock Data Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('MOCK_CONFIG', () => {
    it('should have correct configuration values', () => {
      expect(MOCK_CONFIG).toBeDefined();
      expect(MOCK_CONFIG.users).toBeGreaterThan(0);
      expect(MOCK_CONFIG.investors).toBeGreaterThan(0);
      expect(MOCK_CONFIG.applications).toBeGreaterThan(0);
      expect(MOCK_CONFIG.transactions).toBeGreaterThan(0);
      expect(MOCK_CONFIG.investments).toBeGreaterThan(0);
      expect(MOCK_CONFIG.kycDocuments).toBeGreaterThan(0);
      expect(MOCK_CONFIG.dateRange).toBeDefined();
      expect(MOCK_CONFIG.dateRange.start).toBeInstanceOf(Date);
      expect(MOCK_CONFIG.dateRange.end).toBeInstanceOf(Date);
    });
  });

  describe('generateTestUser', () => {
    it('should generate a test user with valid properties', async () => {
      const user = await generateTestUser();
      
      expect(user).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.password).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.lastLoginAt).toBeInstanceOf(Date);
    });

    it('should save user to database', async () => {
      const mockSave = jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        createdAt: new Date(),
        lastLoginAt: new Date()
      });
      
      User.mockImplementation(() => ({
        save: mockSave
      }));
      
      const user = await generateTestUser();
      
      expect(mockSave).toHaveBeenCalled();
      expect(user._id).toBe('507f1f77bcf86cd799439011');
    });

    it('should handle save errors', async () => {
      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
      
      User.mockImplementation(() => ({
        save: mockSave
      }));
      
      await expect(generateTestUser()).rejects.toThrow('Database error');
    });
  });

  describe('generateTestInvestor', () => {
    it('should generate a test investor with valid properties', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const investor = await generateTestInvestor(userId);
      
      expect(investor).toBeDefined();
      expect(investor.userId).toBe(userId);
      expect(investor.investorType).toBeDefined();
      expect(investor.riskProfile).toBeDefined();
      expect(investor.totalInvested).toBeGreaterThan(0);
      expect(investor.availableFunds).toBeGreaterThan(0);
      expect(investor.expectedReturns).toBeGreaterThan(0);
      expect(investor.actualReturns).toBeGreaterThanOrEqual(0);
      expect(investor.verificationStatus).toBeDefined();
      expect(investor.investmentPreferences).toBeDefined();
      expect(investor.verificationDocuments).toBeDefined();
      expect(investor.bankAccounts).toBeDefined();
      expect(investor.performance).toBeDefined();
      expect(investor.isActive).toBeDefined();
      expect(investor.joinedAt).toBeInstanceOf(Date);
    });

    it('should save investor to database', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const mockSave = jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
        userId,
        investorType: 'individual',
        riskProfile: 'moderate',
        totalInvested: 1000000,
        availableFunds: 500000,
        expectedReturns: 1200000,
        actualReturns: 150000,
        verificationStatus: 'verified',
        investmentPreferences: {
          minAmount: 100000,
          maxAmount: 1000000,
          preferredRegions: ['Lagos', 'Abuja'],
          preferredTerms: ['12 months', '24 months']
        },
        verificationDocuments: [],
        bankAccounts: [],
        performance: {
          totalInvestments: 5,
          activeInvestments: 2,
          completedInvestments: 3,
          averageROI: 15.5,
          onTimePaymentRate: 95.0,
          defaultRate: 0.0
        },
        isActive: true,
        joinedAt: new Date()
      });
      
      Investor.mockImplementation(() => ({
        save: mockSave
      }));
      
      const investor = await generateTestInvestor(userId);
      
      expect(mockSave).toHaveBeenCalled();
      expect(investor._id).toBe('507f1f77bcf86cd799439012');
      expect(investor.userId).toBe(userId);
    });

    it('should handle save errors', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
      
      Investor.mockImplementation(() => ({
        save: mockSave
      }));
      
      await expect(generateTestInvestor(userId)).rejects.toThrow('Database error');
    });
  });

  describe('generateMockData', () => {
    it('should generate mock data with correct counts', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue();
      const mockInsertMany = jest.fn().mockResolvedValue([
        { _id: 'user1' },
        { _id: 'user2' }
      ]);
      
      User.deleteMany = mockDeleteMany;
      User.insertMany = mockInsertMany;
      
      Investor.deleteMany = mockDeleteMany;
      Investor.insertMany = mockInsertMany;
      
      SolarApplication.deleteMany = mockDeleteMany;
      SolarApplication.insertMany = mockInsertMany;
      
      Transaction.deleteMany = mockDeleteMany;
      Transaction.insertMany = mockInsertMany;
      
      Investment.deleteMany = mockDeleteMany;
      Investment.insertMany = mockInsertMany;
      
      KYCDocument.deleteMany = mockDeleteMany;
      KYCDocument.insertMany = mockInsertMany;
      
      const result = await generateMockData();
      
      expect(result).toBeDefined();
      expect(result.users).toBe(2);
      expect(result.investors).toBe(2);
      expect(result.applications).toBe(2);
      expect(result.transactions).toBe(2);
      expect(result.investments).toBe(2);
      expect(result.kycDocuments).toBe(2);
      
      // Verify that deleteMany was called for each model
      expect(User.deleteMany).toHaveBeenCalled();
      expect(Investor.deleteMany).toHaveBeenCalled();
      expect(SolarApplication.deleteMany).toHaveBeenCalled();
      expect(Transaction.deleteMany).toHaveBeenCalled();
      expect(Investment.deleteMany).toHaveBeenCalled();
      expect(KYCDocument.deleteMany).toHaveBeenCalled();
      
      // Verify that insertMany was called for each model
      expect(User.insertMany).toHaveBeenCalled();
      expect(Investor.insertMany).toHaveBeenCalled();
      expect(SolarApplication.insertMany).toHaveBeenCalled();
      expect(Transaction.insertMany).toHaveBeenCalled();
      expect(Investment.insertMany).toHaveBeenCalled();
      expect(KYCDocument.insertMany).toHaveBeenCalled();
    });

    it('should generate users with valid properties', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue();
      const mockInsertMany = jest.fn().mockResolvedValue([
        { _id: 'user1', name: 'John Doe', email: 'john@example.com' },
        { _id: 'user2', name: 'Jane Smith', email: 'jane@example.com' }
      ]);
      
      User.deleteMany = mockDeleteMany;
      User.insertMany = mockInsertMany;
      
      // Mock other models to avoid errors
      Investor.deleteMany = jest.fn().mockResolvedValue();
      Investor.insertMany = jest.fn().mockResolvedValue([]);
      
      SolarApplication.deleteMany = jest.fn().mockResolvedValue();
      SolarApplication.insertMany = jest.fn().mockResolvedValue([]);
      
      Transaction.deleteMany = jest.fn().mockResolvedValue();
      Transaction.insertMany = jest.fn().mockResolvedValue([]);
      
      Investment.deleteMany = jest.fn().mockResolvedValue();
      Investment.insertMany = jest.fn().mockResolvedValue([]);
      
      KYCDocument.deleteMany = jest.fn().mockResolvedValue();
      KYCDocument.insertMany = jest.fn().mockResolvedValue([]);
      
      await generateMockData();
      
      const users = mockInsertMany.mock.calls[0][0];
      
      expect(users).toHaveLength(2);
      expect(users[0].name).toBeDefined();
      expect(users[0].email).toBeDefined();
      expect(users[0].password).toBeDefined();
      expect(users[0].createdAt).toBeInstanceOf(Date);
      expect(users[0].lastLoginAt).toBeInstanceOf(Date);
    });

    it('should generate investors with valid properties', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue();
      const mockInsertMany = jest.fn().mockResolvedValue([
        { _id: 'investor1', investorType: 'individual', riskProfile: 'moderate' },
        { _id: 'investor2', investorType: 'institutional', riskProfile: 'conservative' }
      ]);
      
      // Mock users to provide user IDs
      User.deleteMany = jest.fn().mockResolvedValue();
      User.insertMany = jest.fn().mockResolvedValue([
        { _id: 'user1' },
        { _id: 'user2' }
      ]);
      
      Investor.deleteMany = mockDeleteMany;
      Investor.insertMany = mockInsertMany;
      
      // Mock other models to avoid errors
      SolarApplication.deleteMany = jest.fn().mockResolvedValue();
      SolarApplication.insertMany = jest.fn().mockResolvedValue([]);
      
      Transaction.deleteMany = jest.fn().mockResolvedValue();
      Transaction.insertMany = jest.fn().mockResolvedValue([]);
      
      Investment.deleteMany = jest.fn().mockResolvedValue();
      Investment.insertMany = jest.fn().mockResolvedValue([]);
      
      KYCDocument.deleteMany = jest.fn().mockResolvedValue();
      KYCDocument.insertMany = jest.fn().mockResolvedValue([]);
      
      await generateMockData();
      
      const investors = mockInsertMany.mock.calls[0][0];
      
      expect(investors).toHaveLength(2);
      expect(investors[0].userId).toBeDefined();
      expect(investors[0].investorType).toBeDefined();
      expect(investors[0].riskProfile).toBeDefined();
      expect(investors[0].totalInvested).toBeGreaterThan(0);
      expect(investors[0].availableFunds).toBeGreaterThan(0);
      expect(investors[0].expectedReturns).toBeGreaterThan(0);
      expect(investors[0].actualReturns).toBeGreaterThanOrEqual(0);
      expect(investors[0].verificationStatus).toBeDefined();
      expect(investors[0].investmentPreferences).toBeDefined();
      expect(investors[0].verificationDocuments).toBeDefined();
      expect(investors[0].bankAccounts).toBeDefined();
      expect(investors[0].performance).toBeDefined();
      expect(investors[0].isActive).toBeDefined();
      expect(investors[0].joinedAt).toBeInstanceOf(Date);
    });

    it('should generate applications with valid properties', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue();
      const mockInsertMany = jest.fn().mockResolvedValue([
        { _id: 'app1', applicationId: 'APP0001', status: 'approved' },
        { _id: 'app2', applicationId: 'APP0002', status: 'pending' }
      ]);
      
      // Mock users to provide user IDs
      User.deleteMany = jest.fn().mockResolvedValue();
      User.insertMany = jest.fn().mockResolvedValue([
        { _id: 'user1' },
        { _id: 'user2' }
      ]);
      
      // Mock other models to avoid errors
      Investor.deleteMany = jest.fn().mockResolvedValue();
      Investor.insertMany = jest.fn().mockResolvedValue([]);
      
      SolarApplication.deleteMany = mockDeleteMany;
      SolarApplication.insertMany = mockInsertMany;
      
      Transaction.deleteMany = jest.fn().mockResolvedValue();
      Transaction.insertMany = jest.fn().mockResolvedValue([]);
      
      Investment.deleteMany = jest.fn().mockResolvedValue();
      Investment.insertMany = jest.fn().mockResolvedValue([]);
      
      KYCDocument.deleteMany = jest.fn().mockResolvedValue();
      KYCDocument.insertMany = jest.fn().mockResolvedValue([]);
      
      await generateMockData();
      
      const applications = mockInsertMany.mock.calls[0][0];
      
      expect(applications).toHaveLength(2);
      expect(applications[0].userId).toBeDefined();
      expect(applications[0].applicationId).toBeDefined();
      expect(applications[0].personalInfo).toBeDefined();
      expect(applications[0].propertyDetails).toBeDefined();
      expect(applications[0].financialInfo).toBeDefined();
      expect(applications[0].systemRequirements).toBeDefined();
      expect(applications[0].applicationStatus).toBeDefined();
      expect(applications[0].kycStatus).toBeDefined();
      expect(applications[0].submittedAt).toBeInstanceOf(Date);
      expect(applications[0].reviewedAt).toBeInstanceOf(Date);
      expect(applications[0].approvedAt).toBeInstanceOf(Date);
      expect(applications[0].fundedAt).toBeInstanceOf(Date);
      expect(applications[0].installedAt).toBeInstanceOf(Date);
    });

    it('should generate transactions with valid properties', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue();
      const mockInsertMany = jest.fn().mockResolvedValue([
        { _id: 'txn1', transactionId: 'TXN0001', type: 'investment', status: 'completed' },
        { _id: 'txn2', transactionId: 'TXN0002', type: 'repayment', status: 'pending' }
      ]);
      
      // Mock users and investors to provide IDs
      User.deleteMany = jest.fn().mockResolvedValue();
      User.insertMany = jest.fn().mockResolvedValue([
        { _id: 'user1' },
        { _id: 'user2' }
      ]);
      
      Investor.deleteMany = jest.fn().mockResolvedValue();
      Investor.insertMany = jest.fn().mockResolvedValue([
        { _id: 'investor1' },
        { _id: 'investor2' }
      ]);
      
      // Mock other models to avoid errors
      SolarApplication.deleteMany = jest.fn().mockResolvedValue();
      SolarApplication.insertMany = jest.fn().mockResolvedValue([]);
      
      Transaction.deleteMany = mockDeleteMany;
      Transaction.insertMany = mockInsertMany;
      
      Investment.deleteMany = jest.fn().mockResolvedValue();
      Investment.insertMany = jest.fn().mockResolvedValue([]);
      
      KYCDocument.deleteMany = jest.fn().mockResolvedValue();
      KYCDocument.insertMany = jest.fn().mockResolvedValue([]);
      
      await generateMockData();
      
      const transactions = mockInsertMany.mock.calls[0][0];
      
      expect(transactions).toHaveLength(2);
      expect(transactions[0].transactionId).toBeDefined();
      expect(transactions[0].type).toBeDefined();
      expect(transactions[0].fromEntity).toBeDefined();
      expect(transactions[0].toEntity).toBeDefined();
      expect(transactions[0].fromEntityId).toBeDefined();
      expect(transactions[0].toEntityId).toBeDefined();
      expect(transactions[0].amount).toBeGreaterThan(0);
      expect(transactions[0].currency).toBeDefined();
      expect(transactions[0].status).toBeDefined();
      expect(transactions[0].paymentMethod).toBeDefined();
      expect(transactions[0].paymentReference).toBeDefined();
      expect(transactions[0].fees).toBeDefined();
      expect(transactions[0].metadata).toBeDefined();
      expect(transactions[0].createdAt).toBeInstanceOf(Date);
      expect(transactions[0].processedAt).toBeInstanceOf(Date);
      expect(transactions[0].completedAt).toBeInstanceOf(Date);
    });

    it('should generate investments with valid properties', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue();
      const mockInsertMany = jest.fn().mockResolvedValue([
        { _id: 'inv1', investmentId: 'INV0001', status: 'active' },
        { _id: 'inv2', investmentId: 'INV0002', status: 'completed' }
      ]);
      
      // Mock investors and applications to provide IDs
      Investor.deleteMany = jest.fn().mockResolvedValue();
      Investor.insertMany = jest.fn().mockResolvedValue([
        { _id: 'investor1' },
        { _id: 'investor2' }
      ]);
      
      SolarApplication.deleteMany = jest.fn().mockResolvedValue();
      SolarApplication.insertMany = jest.fn().mockResolvedValue([
        { _id: 'app1' },
        { _id: 'app2' }
      ]);
      
      // Mock other models to avoid errors
      User.deleteMany = jest.fn().mockResolvedValue();
      User.insertMany = jest.fn().mockResolvedValue([]);
      
      Transaction.deleteMany = jest.fn().mockResolvedValue();
      Transaction.insertMany = jest.fn().mockResolvedValue([]);
      
      Investment.deleteMany = mockDeleteMany;
      Investment.insertMany = mockInsertMany;
      
      KYCDocument.deleteMany = jest.fn().mockResolvedValue();
      KYCDocument.insertMany = jest.fn().mockResolvedValue([]);
      
      await generateMockData();
      
      const investments = mockInsertMany.mock.calls[0][0];
      
      expect(investments).toHaveLength(2);
      expect(investments[0].investmentId).toBeDefined();
      expect(investments[0].investorId).toBeDefined();
      expect(investments[0].applicationId).toBeDefined();
      expect(investments[0].amount).toBeGreaterThan(0);
      expect(investments[0].expectedReturn).toBeGreaterThan(0);
      expect(investments[0].actualReturn).toBeGreaterThanOrEqual(0);
      expect(investments[0].interestRate).toBeGreaterThan(0);
      expect(investments[0].term).toBeGreaterThan(0);
      expect(investments[0].startDate).toBeInstanceOf(Date);
      expect(investments[0].endDate).toBeInstanceOf(Date);
      expect(investments[0].status).toBeDefined();
      expect(investments[0].repaymentSchedule).toBeDefined();
      expect(investments[0].riskAssessment).toBeDefined();
      expect(investments[0].performance).toBeDefined();
    });

    it('should generate KYC documents with valid properties', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue();
      const mockInsertMany = jest.fn().mockResolvedValue([
        { _id: 'kyc1', documentType: 'government_id', verificationStatus: 'verified' },
        { _id: 'kyc2', documentType: 'utility_bill', verificationStatus: 'pending' }
      ]);
      
      // Mock users and applications to provide IDs
      User.deleteMany = jest.fn().mockResolvedValue();
      User.insertMany = jest.fn().mockResolvedValue([
        { _id: 'user1' },
        { _id: 'user2' }
      ]);
      
      SolarApplication.deleteMany = jest.fn().mockResolvedValue();
      SolarApplication.insertMany = jest.fn().mockResolvedValue([
        { _id: 'app1' },
        { _id: 'app2' }
      ]);
      
      // Mock other models to avoid errors
      Investor.deleteMany = jest.fn().mockResolvedValue();
      Investor.insertMany = jest.fn().mockResolvedValue([]);
      
      Transaction.deleteMany = jest.fn().mockResolvedValue();
      Transaction.insertMany = jest.fn().mockResolvedValue([]);
      
      Investment.deleteMany = jest.fn().mockResolvedValue();
      Investment.insertMany = jest.fn().mockResolvedValue([]);
      
      KYCDocument.deleteMany = mockDeleteMany;
      KYCDocument.insertMany = mockInsertMany;
      
      await generateMockData();
      
      const kycDocuments = mockInsertMany.mock.calls[0][0];
      
      expect(kycDocuments).toHaveLength(2);
      expect(kycDocuments[0].userId).toBeDefined();
      expect(kycDocuments[0].applicationId).toBeDefined();
      expect(kycDocuments[0].documentType).toBeDefined();
      expect(kycDocuments[0].documentUrl).toBeDefined();
      expect(kycDocuments[0].documentNumber).toBeDefined();
      expect(kycDocuments[0].issuingAuthority).toBeDefined();
      expect(kycDocuments[0].issueDate).toBeInstanceOf(Date);
      expect(kycDocuments[0].expiryDate).toBeInstanceOf(Date);
      expect(kycDocuments[0].verificationStatus).toBeDefined();
      expect(kycDocuments[0].verificationScore).toBeGreaterThanOrEqual(0);
      expect(kycDocuments[0].rejectionReason).toBeDefined();
      expect(kycDocuments[0].reviewedBy).toBeDefined();
      expect(kycDocuments[0].reviewedAt).toBeInstanceOf(Date);
      expect(kycDocuments[0].aiAnalysis).toBeDefined();
      expect(kycDocuments[0].uploadedAt).toBeInstanceOf(Date);
    });

    it('should handle database errors', async () => {
      const mockDeleteMany = jest.fn().mockRejectedValue(new Error('Database error'));
      
      User.deleteMany = mockDeleteMany;
      
      await expect(generateMockData()).rejects.toThrow('Database error');
    });

    it('should update relationships between entities', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue();
      const mockInsertMany = jest.fn().mockResolvedValue([
        { _id: 'user1' },
        { _id: 'user2' }
      ]);
      
      const mockInvestorInsertMany = jest.fn().mockResolvedValue([
        { _id: 'investor1', userId: 'user1' },
        { _id: 'investor2', userId: 'user2' }
      ]);
      
      const mockApplicationInsertMany = jest.fn().mockResolvedValue([
        { _id: 'app1', userId: 'user1', applicationStatus: 'funded' },
        { _id: 'app2', userId: 'user2', applicationStatus: 'installed' }
      ]);
      
      const mockInvestmentInsertMany = jest.fn().mockResolvedValue([
        { _id: 'inv1', investorId: 'investor1', applicationId: 'app1' },
        { _id: 'inv2', investorId: 'investor2', applicationId: 'app2' }
      ]);
      
      const mockTransactionInsertMany = jest.fn().mockResolvedValue([
        { _id: 'txn1', fromEntityId: 'investor1', toEntityId: 'user1', type: 'investment', amount: 100000 },
        { _id: 'txn2', fromEntityId: 'investor2', toEntityId: 'user2', type: 'investment', amount: 200000 }
      ]);
      
      const mockUpdateOne = jest.fn().mockResolvedValue();
      
      User.deleteMany = mockDeleteMany;
      User.insertMany = mockInsertMany;
      
      Investor.deleteMany = mockDeleteMany;
      Investor.insertMany = mockInvestorInsertMany;
      
      SolarApplication.deleteMany = mockDeleteMany;
      SolarApplication.insertMany = mockApplicationInsertMany;
      SolarApplication.findByIdAndUpdate = mockUpdateOne;
      
      Transaction.deleteMany = mockDeleteMany;
      Transaction.insertMany = mockTransactionInsertMany;
      
      Investment.deleteMany = mockDeleteMany;
      Investment.insertMany = mockInvestmentInsertMany;
      Investment.findByIdAndUpdate = mockUpdateOne;
      
      KYCDocument.deleteMany = mockDeleteMany;
      KYCDocument.insertMany = jest.fn().mockResolvedValue([]);
      
      await generateMockData();
      
      // Verify that relationships were updated
      expect(SolarApplication.findByIdAndUpdate).toHaveBeenCalledWith(
        'app1',
        { assignedInvestor: 'investor1' }
      );
      
      expect(SolarApplication.findByIdAndUpdate).toHaveBeenCalledWith(
        'app2',
        { assignedInvestor: 'investor2' }
      );
      
      expect(Investment.findByIdAndUpdate).toHaveBeenCalledWith(
        'inv1',
        { relatedTransaction: 'txn1' }
      );
      
      expect(Investment.findByIdAndUpdate).toHaveBeenCalledWith(
        'inv2',
        { relatedTransaction: 'txn2' }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty database', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue();
      const mockInsertMany = jest.fn().mockResolvedValue([]);
      
      User.deleteMany = mockDeleteMany;
      User.insertMany = mockInsertMany;
      
      Investor.deleteMany = mockDeleteMany;
      Investor.insertMany = mockInsertMany;
      
      SolarApplication.deleteMany = mockDeleteMany;
      SolarApplication.insertMany = mockInsertMany;
      
      Transaction.deleteMany = mockDeleteMany;
      Transaction.insertMany = mockInsertMany;
      
      Investment.deleteMany = mockDeleteMany;
      Investment.insertMany = mockInsertMany;
      
      KYCDocument.deleteMany = mockDeleteMany;
      KYCDocument.insertMany = mockInsertMany;
      
      const result = await generateMockData();
      
      expect(result.users).toBe(0);
      expect(result.investors).toBe(0);
      expect(result.applications).toBe(0);
      expect(result.transactions).toBe(0);
      expect(result.investments).toBe(0);
      expect(result.kycDocuments).toBe(0);
    });

    it('should handle partial data generation', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue();
      const mockInsertMany = jest.fn().mockResolvedValue([
        { _id: 'user1' }
      ]);
      
      User.deleteMany = mockDeleteMany;
      User.insertMany = mockInsertMany;
      
      // Mock other models to return empty arrays
      Investor.deleteMany = jest.fn().mockResolvedValue();
      Investor.insertMany = jest.fn().mockResolvedValue([]);
      
      SolarApplication.deleteMany = jest.fn().mockResolvedValue();
      SolarApplication.insertMany = jest.fn().mockResolvedValue([]);
      
      Transaction.deleteMany = jest.fn().mockResolvedValue();
      Transaction.insertMany = jest.fn().mockResolvedValue([]);
      
      Investment.deleteMany = jest.fn().mockResolvedValue();
      Investment.insertMany = jest.fn().mockResolvedValue([]);
      
      KYCDocument.deleteMany = jest.fn().mockResolvedValue();
      KYCDocument.insertMany = jest.fn().mockResolvedValue([]);
      
      const result = await generateMockData();
      
      expect(result.users).toBe(1);
      expect(result.investors).toBe(0);
      expect(result.applications).toBe(0);
      expect(result.transactions).toBe(0);
      expect(result.investments).toBe(0);
      expect(result.kycDocuments).toBe(0);
    });

    it('should handle concurrent requests', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue();
      const mockInsertMany = jest.fn().mockResolvedValue([
        { _id: 'user1' },
        { _id: 'user2' }
      ]);
      
      User.deleteMany = mockDeleteMany;
      User.insertMany = mockInsertMany;
      
      // Mock other models to avoid errors
      Investor.deleteMany = jest.fn().mockResolvedValue();
      Investor.insertMany = jest.fn().mockResolvedValue([]);
      
      SolarApplication.deleteMany = jest.fn().mockResolvedValue();
      SolarApplication.insertMany = jest.fn().mockResolvedValue([]);
      
      Transaction.deleteMany = jest.fn().mockResolvedValue();
      Transaction.insertMany = jest.fn().mockResolvedValue([]);
      
      Investment.deleteMany = jest.fn().mockResolvedValue();
      Investment.insertMany = jest.fn().mockResolvedValue([]);
      
      KYCDocument.deleteMany = jest.fn().mockResolvedValue();
      KYCDocument.insertMany = jest.fn().mockResolvedValue([]);
      
      // Make multiple concurrent requests
      const requests = Array(5).fill().map(() => generateMockData());
      
      const results = await Promise.all(requests);
      
      results.forEach(result => {
        expect(result.users).toBe(2);
        expect(result.investors).toBe(0);
        expect(result.applications).toBe(0);
        expect(result.transactions).toBe(0);
        expect(result.investments).toBe(0);
        expect(result.kycDocuments).toBe(0);
      });
    });
  });
});