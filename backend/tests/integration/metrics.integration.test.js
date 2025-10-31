import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/express.js';
import { setupTestDatabase, teardownTestDatabase, createTestData } from '../helpers/metrics.test.helpers.js';
import User from '../../src/models/user.model.js';
import Investor from '../../src/models/metrics/investor.model.js';
import SolarApplication from '../../src/models/metrics/solarApplication.model.js';
import Transaction from '../../src/models/metrics/transaction.model.js';
import Investment from '../../src/models/metrics/investment.model.js';
import KYCDocument from '../../src/models/metrics/kycDocument.model.js';

describe('Metrics API Integration Tests', () => {
  let testData;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
  });

  afterAll(async () => {
    // Cleanup test database
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Create test data for each test
    testData = await createTestData({
      users: 10,
      investors: 5,
      applications: 20,
      transactions: 50,
      investments: 15,
      kycDocuments: 30
    });
  });

  afterEach(async () => {
    // Clean up collections between tests
    await Promise.all([
      User.deleteMany({}),
      Investor.deleteMany({}),
      SolarApplication.deleteMany({}),
      Transaction.deleteMany({}),
      Investment.deleteMany({}),
      KYCDocument.deleteMany({})
    ]);
  });

  describe('Dashboard Integration', () => {
    it('should return dashboard overview with real data', async () => {
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
      expect(response.body.data.summary.totalUsers).toBe(testData.users.length);
      expect(response.body.data.summary.totalInvestors).toBe(testData.investors.length);
      expect(response.body.data.summary.totalApplications).toBe(testData.applications.length);
      expect(response.body.data.summary.totalTransactions).toBe(testData.transactions.length);
      
      // Verify growth metrics
      expect(response.body.data.growth.userGrowth).toBeDefined();
      expect(response.body.data.growth.investmentGrowth).toBeDefined();
      expect(response.body.data.growth.revenueGrowth).toBeDefined();
      
      // Verify performance metrics
      expect(response.body.data.performance.kycApprovalRate).toBeDefined();
      expect(response.body.data.performance.applicationApprovalRate).toBeDefined();
    });

    it('should return realtime metrics with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/dashboard/realtime')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.activeUsers).toBeDefined();
      expect(response.body.data.onlineInvestors).toBeDefined();
      expect(response.body.data.pendingTransactions).toBeDefined();
      expect(response.body.data.systemStatus).toBeDefined();
      expect(response.body.data.serverLoad).toBeDefined();
      expect(response.body.data.responseTime).toBeDefined();
      expect(response.body.data.currentHourStats).toBeDefined();
      expect(response.body.data.todayStats).toBeDefined();
    });

    it('should handle date range parameters correctly', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const endDate = new Date();
      
      const response = await request(app)
        .get(`/api/metrics/dashboard/overview?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalUsers).toBe(testData.users.length);
      expect(response.body.data.summary.totalInvestors).toBe(testData.investors.length);
      expect(response.body.data.summary.totalApplications).toBe(testData.applications.length);
      expect(response.body.data.summary.totalTransactions).toBe(testData.transactions.length);
    });

    it('should handle preset date ranges', async () => {
      const response = await request(app)
        .get('/api/metrics/dashboard/overview?dateRange=last_7_days')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalUsers).toBe(testData.users.length);
      expect(response.body.data.summary.totalInvestors).toBe(testData.investors.length);
      expect(response.body.data.summary.totalApplications).toBe(testData.applications.length);
      expect(response.body.data.summary.totalTransactions).toBe(testData.transactions.length);
    });
  });

  describe('Investor Integration', () => {
    it('should return investor metrics with real data', async () => {
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
      expect(response.body.data.summary.totalInvestors).toBe(testData.investors.length);
      expect(response.body.data.summary.activeInvestors).toBe(testData.investors.filter(i => i.isActive).length);
      expect(response.body.data.summary.newInvestors).toBeDefined();
      
      // Verify breakdowns
      expect(response.body.data.breakdowns.investorType).toBeDefined();
      expect(response.body.data.breakdowns.riskProfile).toBeDefined();
      expect(response.body.data.breakdowns.verificationStatus).toBeDefined();
      
      // Verify performance metrics
      expect(response.body.data.performance.averageROI).toBeDefined();
      expect(response.body.data.performance.completionRate).toBeDefined();
      expect(response.body.data.performance.defaultRate).toBeDefined();
    });

    it('should return investor details with real data', async () => {
      const investor = testData.investors[0];
      
      const response = await request(app)
        .get(`/api/metrics/investors/${investor._id}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.investor).toBeDefined();
      expect(response.body.data.financials).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
      expect(response.body.data.investments).toBeDefined();
      expect(response.body.data.transactions).toBeDefined();
      expect(response.body.data.detailedMetrics).toBeDefined();
      
      // Verify investor data
      expect(response.body.data.investor.id).toBe(investor._id);
      expect(response.body.data.investor.investorType).toBe(investor.investorType);
      expect(response.body.data.investor.riskProfile).toBe(investor.riskProfile);
      expect(response.body.data.investor.verificationStatus).toBe(investor.verificationStatus);
      expect(response.body.data.investor.totalInvested).toBe(investor.totalInvested);
      expect(response.body.data.investor.actualReturns).toBe(investor.actualReturns);
      expect(response.body.data.investor.roi).toBe(investor.roi);
    });

    it('should return paginated investor list with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/investors/list')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(testData.investors.length);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(testData.investors.length);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.totalPages).toBe(Math.ceil(testData.investors.length / 20));
      
      // Verify investor data
      response.body.data.forEach((investor, index) => {
        expect(investor.id).toBe(testData.investors[index]._id);
        expect(investor.investorType).toBe(testData.investors[index].investorType);
        expect(investor.riskProfile).toBe(testData.investors[index].riskProfile);
        expect(investor.verificationStatus).toBe(testData.investors[index].verificationStatus);
        expect(investor.totalInvested).toBe(testData.investors[index].totalInvested);
        expect(investor.actualReturns).toBe(testData.investors[index].actualReturns);
        expect(investor.roi).toBe(testData.investors[index].roi);
      });
    });

    it('should handle pagination parameters correctly', async () => {
      const page = 1;
      const limit = 5;
      
      const response = await request(app)
        .get(`/api/metrics/investors/list?page=${page}&limit=${limit}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(limit);
      expect(response.body.pagination.page).toBe(page);
      expect(response.body.pagination.limit).toBe(limit);
      expect(response.body.pagination.total).toBe(testData.investors.length);
      expect(response.body.pagination.totalPages).toBe(Math.ceil(testData.investors.length / limit));
    });

    it('should return investor performance metrics with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/investors/performance')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.roiDistribution).toBeDefined();
      expect(response.body.data.investmentDuration).toBeDefined();
      expect(response.body.data.averageROI).toBeDefined();
      expect(response.body.data.completionRate).toBeDefined();
      expect(response.body.data.defaultRate).toBeDefined();
    });
  });

  describe('User Integration', () => {
    it('should return user metrics with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/users')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.activity).toBeDefined();
      expect(response.body.data.applications).toBeDefined();
      expect(response.body.data.kycStatus).toBeDefined();
      expect(response.body.data.transactions).toBeDefined();
      expect(response.body.data.regionalDistribution).toBeDefined();
      expect(response.body.data.trends).toBeDefined();
      
      // Verify summary metrics
      expect(response.body.data.summary.totalUsers).toBe(testData.users.length);
      expect(response.body.data.summary.activeUsers).toBeDefined();
      expect(response.body.data.summary.newUsers).toBeDefined();
      expect(response.body.data.summary.averageApplicationsPerUser).toBeDefined();
      expect(response.body.data.summary.kycCompletionRate).toBeDefined();
      expect(response.body.data.summary.averageTransactionValue).toBeDefined();
    });

    it('should return user details with real data', async () => {
      const user = testData.users[0];
      
      const response = await request(app)
        .get(`/api/metrics/users/${user._id}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.applications).toBeDefined();
      expect(response.body.data.kycDocuments).toBeDefined();
      expect(response.body.data.transactions).toBeDefined();
      expect(response.body.data.detailedMetrics).toBeDefined();
      
      // Verify user data
      expect(response.body.data.user.id).toBe(user._id);
      expect(response.body.data.user.name).toBe(user.name);
      expect(response.body.data.user.email).toBe(user.email);
      expect(response.body.data.user.createdAt).toBe(user.createdAt);
      expect(response.body.data.user.lastLoginAt).toBe(user.lastLoginAt);
    });

    it('should return paginated user list with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/users/list')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(testData.users.length);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(testData.users.length);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.totalPages).toBe(Math.ceil(testData.users.length / 20));
      
      // Verify user data
      response.body.data.forEach((user, index) => {
        expect(user.id).toBe(testData.users[index]._id);
        expect(user.name).toBe(testData.users[index].name);
        expect(user.email).toBe(testData.users[index].email);
        expect(user.createdAt).toBe(testData.users[index].createdAt);
        expect(user.lastLoginAt).toBe(testData.users[index].lastLoginAt);
      });
    });

    it('should return user activity metrics with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/users/activity')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.dailyActive).toBeDefined();
      expect(response.body.data.weeklyActive).toBeDefined();
      expect(response.body.data.monthlyActive).toBeDefined();
      expect(response.body.data.dailyActivity).toBeDefined();
      expect(response.body.data.hourlyActivity).toBeDefined();
      expect(response.body.data.engagement).toBeDefined();
    });
  });

  describe('Transaction Integration', () => {
    it('should return transaction metrics with real data', async () => {
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
      expect(response.body.data.summary.totalTransactions).toBe(testData.transactions.length);
      expect(response.body.data.summary.completedTransactions).toBe(testData.transactions.filter(t => t.status === 'completed').length);
      expect(response.body.data.summary.pendingTransactions).toBe(testData.transactions.filter(t => t.status === 'pending').length);
      expect(response.body.data.summary.failedTransactions).toBe(testData.transactions.filter(t => t.status === 'failed').length);
      expect(response.body.data.summary.totalVolume).toBeDefined();
      expect(response.body.data.summary.totalFees).toBeDefined();
      expect(response.body.data.summary.averageTransactionValue).toBeDefined();
      expect(response.body.data.summary.completionRate).toBeDefined();
    });

    it('should return transaction details with real data', async () => {
      const transaction = testData.transactions[0];
      
      const response = await request(app)
        .get(`/api/metrics/transactions/${transaction._id}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.transaction).toBeDefined();
      expect(response.body.data.relatedEntities).toBeDefined();
      expect(response.body.data.relatedApplication).toBeDefined();
      expect(response.body.data.relatedInvestment).toBeDefined();
      
      // Verify transaction data
      expect(response.body.data.transaction.id).toBe(transaction._id);
      expect(response.body.data.transaction.transactionId).toBe(transaction.transactionId);
      expect(response.body.data.transaction.type).toBe(transaction.type);
      expect(response.body.data.transaction.fromEntity).toBe(transaction.fromEntity);
      expect(response.body.data.transaction.toEntity).toBe(transaction.toEntity);
      expect(response.body.data.transaction.amount).toBe(transaction.amount);
      expect(response.body.data.transaction.status).toBe(transaction.status);
      expect(response.body.data.transaction.paymentMethod).toBe(transaction.paymentMethod);
      expect(response.body.data.transaction.totalFees).toBe(transaction.totalFees);
      expect(response.body.data.transaction.netAmount).toBe(transaction.netAmount);
    });

    it('should return paginated transaction list with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/transactions/list')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(testData.transactions.length);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(testData.transactions.length);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.totalPages).toBe(Math.ceil(testData.transactions.length / 20));
      
      // Verify transaction data
      response.body.data.forEach((transaction, index) => {
        expect(transaction.id).toBe(testData.transactions[index]._id);
        expect(transaction.transactionId).toBe(testData.transactions[index].transactionId);
        expect(transaction.type).toBe(testData.transactions[index].type);
        expect(transaction.amount).toBe(testData.transactions[index].amount);
        expect(transaction.status).toBe(testData.transactions[index].status);
        expect(transaction.paymentMethod).toBe(testData.transactions[index].paymentMethod);
      });
    });

    it('should return transaction performance metrics with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/transactions/performance')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalTransactions).toBe(testData.transactions.length);
      expect(response.body.data.completedTransactions).toBe(testData.transactions.filter(t => t.status === 'completed').length);
      expect(response.body.data.failedTransactions).toBe(testData.transactions.filter(t => t.status === 'failed').length);
      expect(response.body.data.successRate).toBeDefined();
      expect(response.body.data.failureRate).toBeDefined();
      expect(response.body.data.averageProcessingTime).toBeDefined();
      expect(response.body.data.processingTime).toBeDefined();
      expect(response.body.data.successRateByMethod).toBeDefined();
      expect(response.body.data.valueDistribution).toBeDefined();
    });

    it('should return transaction analytics with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/transactions/analytics')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.transactionFlow).toBeDefined();
      expect(response.body.data.hourlyPatterns).toBeDefined();
      expect(response.body.data.dailyPatterns).toBeDefined();
      expect(response.body.data.failureAnalysis).toBeDefined();
    });
  });

  describe('KYC Integration', () => {
    it('should return KYC metrics with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/kyc')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.growth).toBeDefined();
      expect(response.body.data.breakdowns).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
      expect(response.body.data.processingTime).toBeDefined();
      expect(response.body.data.verificationScores).toBeDefined();
      expect(response.body.data.trends).toBeDefined();
      
      // Verify summary metrics
      expect(response.body.data.summary.totalDocuments).toBe(testData.kycDocuments.length);
      expect(response.body.data.summary.verifiedDocuments).toBe(testData.kycDocuments.filter(d => d.verificationStatus === 'verified').length);
      expect(response.body.data.summary.pendingDocuments).toBe(testData.kycDocuments.filter(d => d.verificationStatus === 'pending').length);
      expect(response.body.data.summary.rejectedDocuments).toBe(testData.kycDocuments.filter(d => d.verificationStatus === 'rejected').length);
      expect(response.body.data.summary.underReviewDocuments).toBe(testData.kycDocuments.filter(d => d.verificationStatus === 'under_review').length);
      expect(response.body.data.summary.verificationRate).toBeDefined();
      expect(response.body.data.summary.rejectionRate).toBeDefined();
      expect(response.body.data.summary.averageProcessingTime).toBeDefined();
      expect(response.body.data.summary.averageVerificationScore).toBeDefined();
    });

    it('should return KYC document details with real data', async () => {
      const document = testData.kycDocuments[0];
      
      const response = await request(app)
        .get(`/api/metrics/kyc/${document._id}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.document).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.relatedApplication).toBeDefined();
      expect(response.body.data.reviewer).toBeDefined();
      expect(response.body.data.userApplications).toBeDefined();
      expect(response.body.data.userInvestments).toBeDefined();
      expect(response.body.data.documentHistory).toBeDefined();
      
      // Verify document data
      expect(response.body.data.document.id).toBe(document._id);
      expect(response.body.data.document.documentType).toBe(document.documentType);
      expect(response.body.data.document.verificationStatus).toBe(document.verificationStatus);
      expect(response.body.data.document.verificationScore).toBe(document.verificationScore);
      expect(response.body.data.document.isExpired).toBe(document.isExpired);
      expect(response.body.data.document.hasHighConfidence).toBe(document.hasHighConfidence);
      expect(response.body.data.document.hasFlags).toBe(document.hasFlags);
    });

    it('should return paginated KYC document list with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/kyc/list')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(testData.kycDocuments.length);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(testData.kycDocuments.length);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.totalPages).toBe(Math.ceil(testData.kycDocuments.length / 20));
      
      // Verify document data
      response.body.data.forEach((document, index) => {
        expect(document.id).toBe(testData.kycDocuments[index]._id);
        expect(document.documentType).toBe(testData.kycDocuments[index].documentType);
        expect(document.verificationStatus).toBe(testData.kycDocuments[index].verificationStatus);
        expect(document.verificationScore).toBe(testData.kycDocuments[index].verificationScore);
        expect(document.isExpired).toBe(testData.kycDocuments[index].isExpired);
        expect(document.hasFlags).toBe(testData.kycDocuments[index].hasFlags);
      });
    });

    it('should return KYC performance metrics with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/kyc/performance')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalDocuments).toBe(testData.kycDocuments.length);
      expect(response.body.data.verifiedDocuments).toBe(testData.kycDocuments.filter(d => d.verificationStatus === 'verified').length);
      expect(response.body.data.rejectedDocuments).toBe(testData.kycDocuments.filter(d => d.verificationStatus === 'rejected').length);
      expect(response.body.data.verificationRate).toBeDefined();
      expect(response.body.data.rejectionRate).toBeDefined();
      expect(response.body.data.averageProcessingTime).toBeDefined();
      expect(response.body.data.processingTimeDistribution).toBeDefined();
      expect(response.body.data.scoreDistribution).toBeDefined();
      expect(response.body.data.reviewerPerformance).toBeDefined();
    });

    it('should return KYC analytics with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/kyc/analytics')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.typeSuccessRates).toBeDefined();
      expect(response.body.data.aiInsights).toBeDefined();
      expect(response.body.data.expiryAnalysis).toBeDefined();
      expect(response.body.data.qualityTrends).toBeDefined();
    });
  });

  describe('Reporting Integration', () => {
    it('should generate financial report with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/reports/financial')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.reportType).toBe('financial');
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.monthlyBreakdown).toBeDefined();
      expect(response.body.data.investorReturns).toBeDefined();
      expect(response.body.data.paymentMethodBreakdown).toBeDefined();
      expect(response.body.data.generatedAt).toBeDefined();
      
      // Verify summary metrics
      expect(response.body.data.summary.totalInvestments).toBe(testData.transactions.filter(t => t.type === 'investment').length);
      expect(response.body.data.summary.totalRepayments).toBe(testData.transactions.filter(t => t.type === 'repayment').length);
      expect(response.body.data.summary.totalFees).toBe(testData.transactions.filter(t => t.type === 'fee').length);
      expect(response.body.data.summary.investmentVolume).toBeDefined();
      expect(response.body.data.summary.repaymentVolume).toBeDefined();
      expect(response.body.data.summary.feeVolume).toBeDefined();
      expect(response.body.data.summary.netRevenue).toBeDefined();
      expect(response.body.data.summary.totalRevenue).toBeDefined();
      expect(response.body.data.summary.profitMargin).toBeDefined();
    });

    it('should generate operational report with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/reports/operational')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.reportType).toBe('operational');
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.details).toBeDefined();
      expect(response.body.data.generatedAt).toBeDefined();
      
      // Verify summary metrics
      expect(response.body.data.summary.totalUsers).toBe(testData.users.length);
      expect(response.body.data.summary.totalApplications).toBe(testData.applications.length);
      expect(response.body.data.summary.totalInvestors).toBe(testData.investors.length);
      expect(response.body.data.summary.totalTransactions).toBe(testData.transactions.length);
      expect(response.body.data.summary.systemUptime).toBeDefined();
      
      // Verify details
      expect(response.body.data.details.users).toBeDefined();
      expect(response.body.data.details.applications).toBeDefined();
      expect(response.body.data.details.kyc).toBeDefined();
      expect(response.body.data.details.investors).toBeDefined();
      expect(response.body.data.details.transactions).toBeDefined();
      expect(response.body.data.details.systemPerformance).toBeDefined();
      expect(response.body.data.details.regionalBreakdown).toBeDefined();
    });

    it('should generate compliance report with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/reports/compliance')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.reportType).toBe('compliance');
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.details).toBeDefined();
      expect(response.body.data.generatedAt).toBeDefined();
      
      // Verify summary metrics
      expect(response.body.data.summary.overallComplianceScore).toBeDefined();
      expect(response.body.data.summary.kycComplianceRate).toBeDefined();
      expect(response.body.data.summary.transactionComplianceRate).toBeDefined();
      expect(response.body.data.summary.investorComplianceRate).toBeDefined();
      expect(response.body.data.summary.highRiskTransactions).toBeDefined();
      expect(response.body.data.summary.auditIssues).toBeDefined();
      
      // Verify details
      expect(response.body.data.details.kyc).toBeDefined();
      expect(response.body.data.details.transactions).toBeDefined();
      expect(response.body.data.details.investors).toBeDefined();
      expect(response.body.data.details.auditTrail).toBeDefined();
      expect(response.body.data.details.riskAssessment).toBeDefined();
      expect(response.body.data.details.regulatory).toBeDefined();
    });

    it('should generate performance report with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/reports/performance')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.reportType).toBe('performance');
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.details).toBeDefined();
      expect(response.body.data.generatedAt).toBeDefined();
      
      // Verify summary metrics
      expect(response.body.data.summary.averageROI).toBeDefined();
      expect(response.body.data.summary.totalReturns).toBeDefined();
      expect(response.body.data.summary.investorSatisfactionScore).toBeDefined();
      expect(response.body.data.summary.systemResponseTime).toBeDefined();
      expect(response.body.data.summary.userEngagementRate).toBeDefined();
      expect(response.body.data.summary.applicationApprovalRate).toBeDefined();
      expect(response.body.data.summary.transactionSuccessRate).toBeDefined();
      
      // Verify details
      expect(response.body.data.details.investments).toBeDefined();
      expect(response.body.data.details.investors).toBeDefined();
      expect(response.body.data.details.system).toBeDefined();
      expect(response.body.data.details.userEngagement).toBeDefined();
      expect(response.body.data.details.applications).toBeDefined();
      expect(response.body.data.details.transactions).toBeDefined();
    });

    it('should return report list with real data', async () => {
      const response = await request(app)
        .get('/api/metrics/reports')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.reports).toBeDefined();
      expect(response.body.data.filters).toBeDefined();
      
      // Verify reports list
      expect(response.body.data.reports).toHaveLength(4);
      
      // Verify financial report
      const financialReport = response.body.data.reports.find(r => r.id === 'financial');
      expect(financialReport).toBeDefined();
      expect(financialReport.name).toBe('Financial Report');
      expect(financialReport.category).toBe('financial');
      expect(financialReport.availableFormats).toEqual(['json', 'csv']);
      expect(financialReport.schedule).toBe('monthly');
      expect(financialReport.lastGenerated).toBeInstanceOf(Date);
      
      // Verify operational report
      const operationalReport = response.body.data.reports.find(r => r.id === 'operational');
      expect(operationalReport).toBeDefined();
      expect(operationalReport.name).toBe('Operational Report');
      expect(operationalReport.category).toBe('operational');
      expect(operationalReport.schedule).toBe('daily');
      
      // Verify compliance report
      const complianceReport = response.body.data.reports.find(r => r.id === 'compliance');
      expect(complianceReport).toBeDefined();
      expect(complianceReport.name).toBe('Compliance Report');
      expect(complianceReport.category).toBe('compliance');
      expect(complianceReport.schedule).toBe('weekly');
      
      // Verify performance report
      const performanceReport = response.body.data.reports.find(r => r.id === 'performance');
      expect(performanceReport).toBeDefined();
      expect(performanceReport.name).toBe('Performance Report');
      expect(performanceReport.category).toBe('performance');
      expect(performanceReport.schedule).toBe('monthly');
    });

    it('should schedule report with real data', async () => {
      const reportData = {
        reportId: 'financial',
        schedule: 'weekly',
        recipients: ['admin@example.com', 'manager@example.com'],
        format: 'csv'
      };

      const response = await request(app)
        .post('/api/metrics/reports/schedule')
        .send(reportData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.message).toBe('Report scheduled successfully');
      expect(response.body.data.scheduledReport).toBeDefined();
      
      // Verify scheduled report data
      expect(response.body.data.scheduledReport.reportId).toBe('financial');
      expect(response.body.data.scheduledReport.schedule).toBe('weekly');
      expect(response.body.data.scheduledReport.recipients).toEqual(['admin@example.com', 'manager@example.com']);
      expect(response.body.data.scheduledReport.format).toBe('csv');
      expect(response.body.data.scheduledReport.isActive).toBe(true);
      expect(response.body.data.scheduledReport.createdAt).toBeInstanceOf(Date);
      expect(response.body.data.scheduledReport.nextRun).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent resources', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      
      // Test non-existent investor
      const investorResponse = await request(app)
        .get(`/api/metrics/investors/${nonExistentId}`)
        .expect(404);

      expect(investorResponse.body.success).toBe(false);
      expect(investorResponse.body.error.code).toBe('INVESTOR_NOT_FOUND');
      
      // Test non-existent user
      const userResponse = await request(app)
        .get(`/api/metrics/users/${nonExistentId}`)
        .expect(404);

      expect(userResponse.body.success).toBe(false);
      expect(userResponse.body.error.code).toBe('USER_NOT_FOUND');
      
      // Test non-existent transaction
      const transactionResponse = await request(app)
        .get(`/api/metrics/transactions/${nonExistentId}`)
        .expect(404);

      expect(transactionResponse.body.success).toBe(false);
      expect(transactionResponse.body.error.code).toBe('TRANSACTION_NOT_FOUND');
      
      // Test non-existent KYC document
      const kycResponse = await request(app)
        .get(`/api/metrics/kyc/${nonExistentId}`)
        .expect(404);

      expect(kycResponse.body.success).toBe(false);
      expect(kycResponse.body.error.code).toBe('KYC_DOCUMENT_NOT_FOUND');
    });

    it('should handle invalid IDs', async () => {
      // Test invalid investor ID
      const investorResponse = await request(app)
        .get('/api/metrics/investors/invalid-id')
        .expect(400);

      expect(investorResponse.body.success).toBe(false);
      expect(investorResponse.body.error.code).toBe('INVALID_ID');
      
      // Test invalid user ID
      const userResponse = await request(app)
        .get('/api/metrics/users/invalid-id')
        .expect(400);

      expect(userResponse.body.success).toBe(false);
      expect(userResponse.body.error.code).toBe('INVALID_ID');
      
      // Test invalid transaction ID
      const transactionResponse = await request(app)
        .get('/api/metrics/transactions/invalid-id')
        .expect(400);

      expect(transactionResponse.body.success).toBe(false);
      expect(transactionResponse.body.error.code).toBe('INVALID_ID');
      
      // Test invalid KYC document ID
      const kycResponse = await request(app)
        .get('/api/metrics/kyc/invalid-id')
        .expect(400);

      expect(kycResponse.body.success).toBe(false);
      expect(kycResponse.body.error.code).toBe('INVALID_ID');
    });

    it('should handle invalid query parameters', async () => {
      // Test invalid date range
      const dateRangeResponse = await request(app)
        .get('/api/metrics/dashboard/overview?startDate=2023-01-31&endDate=2023-01-01')
        .expect(400);

      expect(dateRangeResponse.body.success).toBe(false);
      expect(dateRangeResponse.body.error.code).toBe('VALIDATION_ERROR');
      
      // Test invalid pagination
      const paginationResponse = await request(app)
        .get('/api/metrics/investors/list?page=0&limit=101')
        .expect(400);

      expect(paginationResponse.body.success).toBe(false);
      expect(paginationResponse.body.error.code).toBe('VALIDATION_ERROR');
      
      // Test invalid report parameters
      const reportResponse = await request(app)
        .post('/api/metrics/reports/schedule')
        .send({
          reportId: 'invalid_report',
          schedule: 'invalid_schedule',
          recipients: ['admin@example.com'],
          format: 'json'
        })
        .expect(400);

      expect(reportResponse.body.success).toBe(false);
      expect(reportResponse.body.error.code).toBe('INVALID_REPORT_ID');
    });

    it('should handle missing required parameters', async () => {
      // Test missing report parameters
      const reportResponse = await request(app)
        .post('/api/metrics/reports/schedule')
        .send({
          recipients: ['admin@example.com'],
          format: 'json'
          // Missing reportId and schedule
        })
        .expect(400);

      expect(reportResponse.body.success).toBe(false);
      expect(reportResponse.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      // Make multiple concurrent requests to the same endpoint
      const requests = Array(10).fill().map(() => 
        request(app).get('/api/metrics/dashboard/overview')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle large datasets', async () => {
      // Create a larger dataset
      const largeTestData = await createTestData({
        users: 100,
        investors: 50,
        applications: 200,
        transactions: 500,
        investments: 150,
        kycDocuments: 300
      });

      // Test dashboard overview with larger dataset
      const response = await request(app)
        .get('/api/metrics/dashboard/overview')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalUsers).toBe(largeTestData.users.length);
      expect(response.body.data.summary.totalInvestors).toBe(largeTestData.investors.length);
      expect(response.body.data.summary.totalApplications).toBe(largeTestData.applications.length);
      expect(response.body.data.summary.totalTransactions).toBe(largeTestData.transactions.length);
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/metrics/dashboard/overview')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Response should be under 2 seconds for a simple metrics query
      expect(responseTime).toBeLessThan(2000);
    });
  });
});