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

// Mock models to control their behavior in tests
jest.mock('../../../src/models/user.model.js');
jest.mock('../../../src/models/metrics/investor.model.js');
jest.mock('../../../src/models/metrics/solarApplication.model.js');
jest.mock('../../../src/models/metrics/transaction.model.js');
jest.mock('../../../src/models/metrics/investment.model.js');
jest.mock('../../../src/models/metrics/kycDocument.model.js');

describe('Reporting Controller', () => {
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

  describe('generateFinancialReport', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should generate financial report successfully', async () => {
      // Mock database calls
      Transaction.countDocuments.mockResolvedValueOnce(100); // Total investments
      Transaction.countDocuments.mockResolvedValueOnce(80); // Total repayments
      Transaction.countDocuments.mockResolvedValueOnce(20); // Total fees
      
      // Mock aggregation calls
      Transaction.aggregate.mockResolvedValueOnce([{ total: 5000000 }]); // Investment volume
      Transaction.aggregate.mockResolvedValueOnce([{ total: 3000000 }]); // Repayment volume
      Transaction.aggregate.mockResolvedValueOnce([{ total: 500000 }]); // Fee volume
      
      // Mock monthly financials
      const mockMonthlyFinancials = [
        { _id: { year: 2023, month: 1, type: 'investment' }, count: 20, volume: 1000000 },
        { _id: { year: 2023, month: 1, type: 'repayment' }, count: 15, volume: 750000 },
        { _id: { year: 2023, month: 1, type: 'fee' }, count: 5, volume: 50000 }
      ];
      
      // Mock investor returns
      const mockInvestorReturns = [{ totalInvested: 10000000, totalReturns: 12000000, averageROI: 15, totalInvestors: 50 }];
      
      // Mock payment method breakdown
      const mockPaymentMethodBreakdown = [
        { _id: 'bank_transfer', count: 80, volume: 4000000 },
        { _id: 'card', count: 30, volume: 1500000 },
        { _id: 'wallet', count: 20, volume: 1000000 },
        { _id: 'auto_debit', count: 10, volume: 500000 }
      ];
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getMonthlyFinancials: jest.fn().mockResolvedValue(mockMonthlyFinancials),
          getInvestorReturns: jest.fn().mockResolvedValue(mockInvestorReturns),
          getPaymentMethodBreakdown: jest.fn().mockResolvedValue(mockPaymentMethodBreakdown)
        };
      });

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
      expect(response.body.data.summary.totalInvestments).toBe(100);
      expect(response.body.data.summary.totalRepayments).toBe(80);
      expect(response.body.data.summary.totalFees).toBe(20);
      expect(response.body.data.summary.investmentVolume).toBe(5000000);
      expect(response.body.data.summary.repaymentVolume).toBe(3000000);
      expect(response.body.data.summary.feeVolume).toBe(500000);
      expect(response.body.data.summary.netRevenue).toBe(-2000000); // 3000000 - 5000000
      expect(response.body.data.summary.totalRevenue).toBe(3500000); // 3000000 + 500000
      expect(response.body.data.summary.profitMargin).toBe(-57.14); // -2000000 / 3500000 * 100
    });

    it('should handle date range parameters correctly', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      Transaction.countDocuments.mockResolvedValueOnce(50);
      Transaction.countDocuments.mockResolvedValueOnce(40);
      Transaction.countDocuments.mockResolvedValueOnce(10);
      
      Transaction.aggregate.mockResolvedValueOnce([{ total: 2500000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 1500000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 250000 }]);
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getMonthlyFinancials: jest.fn().mockResolvedValue([
            { _id: { year: 2023, month: 1, type: 'investment' }, count: 10, volume: 500000 }
          ]),
          getInvestorReturns: jest.fn().mockResolvedValue([{ totalInvested: 5000000, totalReturns: 6000000, averageROI: 15, totalInvestors: 25 }]),
          getPaymentMethodBreakdown: jest.fn().mockResolvedValue([
            { _id: 'bank_transfer', count: 40, volume: 2000000 }
          ])
        };
      });

      const response = await request(app)
        .get(`/api/metrics/reports/financial?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalInvestments).toBe(50);
      expect(response.body.data.summary.investmentVolume).toBe(2500000);
    });

    it('should handle CSV format', async () => {
      Transaction.countDocuments.mockResolvedValueOnce(100);
      Transaction.countDocuments.mockResolvedValueOnce(80);
      Transaction.countDocuments.mockResolvedValueOnce(20);
      
      Transaction.aggregate.mockResolvedValueOnce([{ total: 5000000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 3000000 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 500000 }]);
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getMonthlyFinancials: jest.fn().mockResolvedValue([]),
          getInvestorReturns: jest.fn().mockResolvedValue([]),
          getPaymentMethodBreakdown: jest.fn().mockResolvedValue([])
        };
      });

      const response = await request(app)
        .get('/api/metrics/reports/financial?format=csv')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('financial-report');
    });

    it('should handle database errors gracefully', async () => {
      Transaction.countDocuments.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/metrics/reports/financial')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle zero values in calculations', async () => {
      Transaction.countDocuments.mockResolvedValueOnce(0);
      Transaction.countDocuments.mockResolvedValueOnce(0);
      Transaction.countDocuments.mockResolvedValueOnce(0);
      
      Transaction.aggregate.mockResolvedValueOnce([{ total: 0 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 0 }]);
      Transaction.aggregate.mockResolvedValueOnce([{ total: 0 }]);
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getMonthlyFinancials: jest.fn().mockResolvedValue([]),
          getInvestorReturns: jest.fn().mockResolvedValue([]),
          getPaymentMethodBreakdown: jest.fn().mockResolvedValue([])
        };
      });

      const response = await request(app)
        .get('/api/metrics/reports/financial')
        .expect(200);

      expect(response.body.data.summary.totalInvestments).toBe(0);
      expect(response.body.data.summary.investmentVolume).toBe(0);
      expect(response.body.data.summary.netRevenue).toBe(0);
      expect(response.body.data.summary.totalRevenue).toBe(0);
      expect(response.body.data.summary.profitMargin).toBe(0);
    });
  });

  describe('generateOperationalReport', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should generate operational report successfully', async () => {
      // Mock helper functions
      const mockUserOperationalMetrics = {
        totalUsers: 500,
        activeUsers: 300,
        newUsers: 50
      };
      
      const mockApplicationOperationalMetrics = {
        totalApplications: 200,
        approvedApplications: 150,
        completedInstallations: 100
      };
      
      const mockKYCOperationalMetrics = {
        totalDocuments: 400,
        verifiedDocuments: 350,
        complianceRate: 87.5
      };
      
      const mockInvestorOperationalMetrics = {
        totalInvestors: 100,
        activeInvestors: 80
      };
      
      const mockTransactionOperationalMetrics = {
        totalTransactions: 1000
      };
      
      const mockSystemPerformance = {
        uptime: 99.9
      };
      
      const mockRegionalBreakdown = [
        { _id: 'Lagos', count: 150 },
        { _id: 'Abuja', count: 100 },
        { _id: 'Kano', count: 80 },
        { _id: 'Others', count: 170 }
      ];
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getUserOperationalMetrics: jest.fn().mockResolvedValue(mockUserOperationalMetrics),
          getApplicationOperationalMetrics: jest.fn().mockResolvedValue(mockApplicationOperationalMetrics),
          getKYCOperationalMetrics: jest.fn().mockResolvedValue(mockKYCOperationalMetrics),
          getInvestorOperationalMetrics: jest.fn().mockResolvedValue(mockInvestorOperationalMetrics),
          getTransactionOperationalMetrics: jest.fn().mockResolvedValue(mockTransactionOperationalMetrics),
          getSystemPerformanceMetrics: jest.fn().mockResolvedValue(mockSystemPerformance),
          getRegionalBreakdown: jest.fn().mockResolvedValue(mockRegionalBreakdown)
        };
      });

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
      expect(response.body.data.summary.totalUsers).toBe(500);
      expect(response.body.data.summary.activeUsers).toBe(300);
      expect(response.body.data.summary.totalApplications).toBe(200);
      expect(response.body.data.summary.approvedApplications).toBe(150);
      expect(response.body.data.summary.completedInstallations).toBe(100);
      expect(response.body.data.summary.totalInvestors).toBe(100);
      expect(response.body.data.summary.activeInvestors).toBe(80);
      expect(response.body.data.summary.totalTransactions).toBe(1000);
      expect(response.body.data.summary.systemUptime).toBe(99.9);
      
      // Verify details
      expect(response.body.data.details.users).toEqual(mockUserOperationalMetrics);
      expect(response.body.data.details.applications).toEqual(mockApplicationOperationalMetrics);
      expect(response.body.data.details.kyc).toEqual(mockKYCOperationalMetrics);
      expect(response.body.data.details.investors).toEqual(mockInvestorOperationalMetrics);
      expect(response.body.data.details.transactions).toEqual(mockTransactionOperationalMetrics);
      expect(response.body.data.details.systemPerformance).toEqual(mockSystemPerformance);
      expect(response.body.data.details.regionalBreakdown).toEqual(mockRegionalBreakdown);
    });

    it('should handle date range parameters correctly', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      // Mock helper functions with date-specific data
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getUserOperationalMetrics: jest.fn().mockResolvedValue({
            totalUsers: 250,
            activeUsers: 150,
            newUsers: 25
          }),
          getApplicationOperationalMetrics: jest.fn().mockResolvedValue({
            totalApplications: 100,
            approvedApplications: 75,
            completedInstallations: 50
          }),
          getKYCOperationalMetrics: jest.fn().mockResolvedValue({
            totalDocuments: 200,
            verifiedDocuments: 175,
            complianceRate: 87.5
          }),
          getInvestorOperationalMetrics: jest.fn().mockResolvedValue({
            totalInvestors: 50,
            activeInvestors: 40
          }),
          getTransactionOperationalMetrics: jest.fn().mockResolvedValue({
            totalTransactions: 500
          }),
          getSystemPerformanceMetrics: jest.fn().mockResolvedValue({
            uptime: 99.8
          }),
          getRegionalBreakdown: jest.fn().mockResolvedValue([
            { _id: 'Lagos', count: 75 },
            { _id: 'Abuja', count: 50 },
            { _id: 'Others', count: 125 }
          ])
        };
      });

      const response = await request(app)
        .get(`/api/metrics/reports/operational?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalUsers).toBe(250);
      expect(response.body.data.summary.totalApplications).toBe(100);
    });

    it('should handle CSV format', async () => {
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getUserOperationalMetrics: jest.fn().mockResolvedValue({
            totalUsers: 500,
            activeUsers: 300,
            newUsers: 50
          }),
          getApplicationOperationalMetrics: jest.fn().mockResolvedValue({
            totalApplications: 200,
            approvedApplications: 150,
            completedInstallations: 100
          }),
          getKYCOperationalMetrics: jest.fn().mockResolvedValue({
            totalDocuments: 400,
            verifiedDocuments: 350,
            complianceRate: 87.5
          }),
          getInvestorOperationalMetrics: jest.fn().mockResolvedValue({
            totalInvestors: 100,
            activeInvestors: 80
          }),
          getTransactionOperationalMetrics: jest.fn().mockResolvedValue({
            totalTransactions: 1000
          }),
          getSystemPerformanceMetrics: jest.fn().mockResolvedValue({
            uptime: 99.9
          }),
          getRegionalBreakdown: jest.fn().mockResolvedValue([
            { _id: 'Lagos', count: 150 },
            { _id: 'Abuja', count: 100 },
            { _id: 'Others', count: 250 }
          ])
        };
      });

      const response = await request(app)
        .get('/api/metrics/reports/operational?format=csv')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('operational-report');
    });

    it('should handle database errors gracefully', async () => {
      // Mock helper functions to throw error
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getUserOperationalMetrics: jest.fn().mockRejectedValue(new Error('Database error'))
        };
      });

      const response = await request(app)
        .get('/api/metrics/reports/operational')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('generateComplianceReport', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should generate compliance report successfully', async () => {
      // Mock helper functions
      const mockKYCComplianceMetrics = {
        totalDocuments: 1000,
        verifiedDocuments: 850,
        complianceRate: 85.0,
        complianceScore: 85
      };
      
      const mockTransactionComplianceMetrics = {
        totalTransactions: 2000,
        compliantTransactions: 1900,
        complianceRate: 95.0,
        complianceScore: 95,
        highRiskTransactions: 100
      };
      
      const mockInvestorComplianceMetrics = {
        totalInvestors: 200,
        verifiedInvestors: 180,
        complianceRate: 90.0,
        complianceScore: 90
      };
      
      const mockAuditTrail = {
        totalAudits: 50,
        issues: [
          {
            severity: 'medium',
            description: 'Delayed KYC verification',
            count: 5
          }
        ]
      };
      
      const mockRiskAssessment = {
        overallRiskLevel: 'low',
        riskFactors: [
          {
            factor: 'Market volatility',
            level: 'medium',
            impact: 0.3
          }
        ]
      };
      
      const mockRegulatoryMetrics = {
        regulatoryComplianceScore: 95,
        pendingRegulatoryChanges: 2,
        lastAuditDate: new Date('2023-01-15')
      };
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getKYCComplianceMetrics: jest.fn().mockResolvedValue(mockKYCComplianceMetrics),
          getTransactionComplianceMetrics: jest.fn().mockResolvedValue(mockTransactionComplianceMetrics),
          getInvestorComplianceMetrics: jest.fn().mockResolvedValue(mockInvestorComplianceMetrics),
          getAuditTrail: jest.fn().mockResolvedValue(mockAuditTrail),
          getRiskAssessment: jest.fn().mockResolvedValue(mockRiskAssessment),
          getRegulatoryMetrics: jest.fn().mockResolvedValue(mockRegulatoryMetrics)
        };
      });

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
      expect(response.body.data.summary.overallComplianceScore).toBe(90); // Average of 85, 95, 90
      expect(response.body.data.summary.kycComplianceRate).toBe(85.0);
      expect(response.body.data.summary.transactionComplianceRate).toBe(95.0);
      expect(response.body.data.summary.investorComplianceRate).toBe(90.0);
      expect(response.body.data.summary.highRiskTransactions).toBe(100);
      expect(response.body.data.summary.auditIssues).toBe(1);
      
      // Verify details
      expect(response.body.data.details.kyc).toEqual(mockKYCComplianceMetrics);
      expect(response.body.data.details.transactions).toEqual(mockTransactionComplianceMetrics);
      expect(response.body.data.details.investors).toEqual(mockInvestorComplianceMetrics);
      expect(response.body.data.details.auditTrail).toEqual(mockAuditTrail);
      expect(response.body.data.details.riskAssessment).toEqual(mockRiskAssessment);
      expect(response.body.data.details.regulatory).toEqual(mockRegulatoryMetrics);
    });

    it('should handle date range parameters correctly', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      // Mock helper functions with date-specific data
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getKYCComplianceMetrics: jest.fn().mockResolvedValue({
            totalDocuments: 500,
            verifiedDocuments: 425,
            complianceRate: 85.0,
            complianceScore: 85
          }),
          getTransactionComplianceMetrics: jest.fn().mockResolvedValue({
            totalTransactions: 1000,
            compliantTransactions: 950,
            complianceRate: 95.0,
            complianceScore: 95,
            highRiskTransactions: 50
          }),
          getInvestorComplianceMetrics: jest.fn().mockResolvedValue({
            totalInvestors: 100,
            verifiedInvestors: 90,
            complianceRate: 90.0,
            complianceScore: 90
          }),
          getAuditTrail: jest.fn().mockResolvedValue({
            totalAudits: 25,
            issues: []
          }),
          getRiskAssessment: jest.fn().mockResolvedValue({
            overallRiskLevel: 'low',
            riskFactors: []
          }),
          getRegulatoryMetrics: jest.fn().mockResolvedValue({
            regulatoryComplianceScore: 95,
            pendingRegulatoryChanges: 1,
            lastAuditDate: new Date('2023-01-15')
          })
        };
      });

      const response = await request(app)
        .get(`/api/metrics/reports/compliance?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.overallComplianceScore).toBe(90); // Average of 85, 95, 90
      expect(response.body.data.summary.kycComplianceRate).toBe(85.0);
    });

    it('should handle CSV format', async () => {
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getKYCComplianceMetrics: jest.fn().mockResolvedValue({
            totalDocuments: 1000,
            verifiedDocuments: 850,
            complianceRate: 85.0,
            complianceScore: 85
          }),
          getTransactionComplianceMetrics: jest.fn().mockResolvedValue({
            totalTransactions: 2000,
            compliantTransactions: 1900,
            complianceRate: 95.0,
            complianceScore: 95,
            highRiskTransactions: 100
          }),
          getInvestorComplianceMetrics: jest.fn().mockResolvedValue({
            totalInvestors: 200,
            verifiedInvestors: 180,
            complianceRate: 90.0,
            complianceScore: 90
          }),
          getAuditTrail: jest.fn().mockResolvedValue({
            totalAudits: 50,
            issues: []
          }),
          getRiskAssessment: jest.fn().mockResolvedValue({
            overallRiskLevel: 'low',
            riskFactors: []
          }),
          getRegulatoryMetrics: jest.fn().mockResolvedValue({
            regulatoryComplianceScore: 95,
            pendingRegulatoryChanges: 2,
            lastAuditDate: new Date('2023-01-15')
          })
        };
      });

      const response = await request(app)
        .get('/api/metrics/reports/compliance?format=csv')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('compliance-report');
    });

    it('should handle database errors gracefully', async () => {
      // Mock helper functions to throw error
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getKYCComplianceMetrics: jest.fn().mockRejectedValue(new Error('Database error'))
        };
      });

      const response = await request(app)
        .get('/api/metrics/reports/compliance')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('generatePerformanceReport', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should generate performance report successfully', async () => {
      // Mock helper functions
      const mockInvestmentPerformanceMetrics = {
        totalInvestments: 500,
        totalReturns: 750000,
        averageROI: 15.0
      };
      
      const mockInvestorPerformanceMetrics = {
        satisfactionScore: 4.2,
        retentionRate: 85,
        netPromoterScore: 72
      };
      
      const mockSystemPerformance = {
        uptime: 99.9,
        averageResponseTime: 150,
        errorRate: 0.1,
        throughput: 1000
      };
      
      const mockUserEngagementMetrics = {
        totalUsers: 1000,
        activeUsers: 700,
        engagementRate: 70.0
      };
      
      const mockApplicationPerformanceMetrics = {
        totalApplications: 800,
        approvedApplications: 600,
        approvalRate: 75.0
      };
      
      const mockTransactionPerformanceMetrics = {
        totalTransactions: 2000,
        completedTransactions: 1900,
        successRate: 95.0
      };
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getInvestmentPerformanceMetrics: jest.fn().mockResolvedValue(mockInvestmentPerformanceMetrics),
          getInvestorPerformanceMetrics: jest.fn().mockResolvedValue(mockInvestorPerformanceMetrics),
          getSystemPerformanceMetrics: jest.fn().mockResolvedValue(mockSystemPerformance),
          getUserEngagementMetrics: jest.fn().mockResolvedValue(mockUserEngagementMetrics),
          getApplicationPerformanceMetrics: jest.fn().mockResolvedValue(mockApplicationPerformanceMetrics),
          getTransactionPerformanceMetrics: jest.fn().mockResolvedValue(mockTransactionPerformanceMetrics)
        };
      });

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
      expect(response.body.data.summary.averageROI).toBe(15.0);
      expect(response.body.data.summary.totalReturns).toBe(750000);
      expect(response.body.data.summary.investorSatisfactionScore).toBe(4.2);
      expect(response.body.data.summary.systemResponseTime).toBe(150);
      expect(response.body.data.summary.userEngagementRate).toBe(70.0);
      expect(response.body.data.summary.applicationApprovalRate).toBe(75.0);
      expect(response.body.data.summary.transactionSuccessRate).toBe(95.0);
      
      // Verify details
      expect(response.body.data.details.investments).toEqual(mockInvestmentPerformanceMetrics);
      expect(response.body.data.details.investors).toEqual(mockInvestorPerformanceMetrics);
      expect(response.body.data.details.system).toEqual(mockSystemPerformance);
      expect(response.body.data.details.userEngagement).toEqual(mockUserEngagementMetrics);
      expect(response.body.data.details.applications).toEqual(mockApplicationPerformanceMetrics);
      expect(response.body.data.details.transactions).toEqual(mockTransactionPerformanceMetrics);
    });

    it('should handle date range parameters correctly', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      // Mock helper functions with date-specific data
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getInvestmentPerformanceMetrics: jest.fn().mockResolvedValue({
            totalInvestments: 250,
            totalReturns: 375000,
            averageROI: 15.0
          }),
          getInvestorPerformanceMetrics: jest.fn().mockResolvedValue({
            satisfactionScore: 4.0,
            retentionRate: 80,
            netPromoterScore: 70
          }),
          getSystemPerformanceMetrics: jest.fn().mockResolvedValue({
            uptime: 99.8,
            averageResponseTime: 160,
            errorRate: 0.2,
            throughput: 900
          }),
          getUserEngagementMetrics: jest.fn().mockResolvedValue({
            totalUsers: 500,
            activeUsers: 350,
            engagementRate: 70.0
          }),
          getApplicationPerformanceMetrics: jest.fn().mockResolvedValue({
            totalApplications: 400,
            approvedApplications: 300,
            approvalRate: 75.0
          }),
          getTransactionPerformanceMetrics: jest.fn().mockResolvedValue({
            totalTransactions: 1000,
            completedTransactions: 950,
            successRate: 95.0
          })
        };
      });

      const response = await request(app)
        .get(`/api/metrics/reports/performance?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.averageROI).toBe(15.0);
      expect(response.body.data.summary.totalReturns).toBe(375000);
    });

    it('should handle CSV format', async () => {
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getInvestmentPerformanceMetrics: jest.fn().mockResolvedValue({
            totalInvestments: 500,
            totalReturns: 750000,
            averageROI: 15.0
          }),
          getInvestorPerformanceMetrics: jest.fn().mockResolvedValue({
            satisfactionScore: 4.2,
            retentionRate: 85,
            netPromoterScore: 72
          }),
          getSystemPerformanceMetrics: jest.fn().mockResolvedValue({
            uptime: 99.9,
            averageResponseTime: 150,
            errorRate: 0.1,
            throughput: 1000
          }),
          getUserEngagementMetrics: jest.fn().mockResolvedValue({
            totalUsers: 1000,
            activeUsers: 700,
            engagementRate: 70.0
          }),
          getApplicationPerformanceMetrics: jest.fn().mockResolvedValue({
            totalApplications: 800,
            approvedApplications: 600,
            approvalRate: 75.0
          }),
          getTransactionPerformanceMetrics: jest.fn().mockResolvedValue({
            totalTransactions: 2000,
            completedTransactions: 1900,
            successRate: 95.0
          })
        };
      });

      const response = await request(app)
        .get('/api/metrics/reports/performance?format=csv')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('performance-report');
    });

    it('should handle database errors gracefully', async () => {
      // Mock helper functions to throw error
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getInvestmentPerformanceMetrics: jest.fn().mockRejectedValue(new Error('Database error'))
        };
      });

      const response = await request(app)
        .get('/api/metrics/reports/performance')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('getReportList', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return report list successfully', async () => {
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getLastReportDate: jest.fn()
            .mockResolvedValueOnce(new Date('2023-01-15')) // For financial report
            .mockResolvedValueOnce(new Date('2023-01-10')) // For operational report
            .mockResolvedValueOnce(new Date('2023-01-05')) // For compliance report
            .mockResolvedValueOnce(new Date('2023-01-20')) // For performance report
        };
      });

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

    it('should handle date range parameters', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getLastReportDate: jest.fn()
            .mockResolvedValueOnce(new Date('2022-12-15')) // For financial report
            .mockResolvedValueOnce(new Date('2022-12-10')) // For operational report
            .mockResolvedValueOnce(new Date('2022-12-05')) // For compliance report
            .mockResolvedValueOnce(new Date('2022-12-20')) // For performance report
        };
      });

      const response = await request(app)
        .get(`/api/metrics/reports?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters.dateRange.startDate).toBe(startDate);
      expect(response.body.data.filters.dateRange.endDate).toBe(endDate);
    });

    it('should handle database errors gracefully', async () => {
      // Mock helper functions to throw error
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getLastReportDate: jest.fn().mockRejectedValue(new Error('Database error'))
        };
      });

      const response = await request(app)
        .get('/api/metrics/reports')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('scheduleReport', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should schedule report successfully', async () => {
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

    it('should handle invalid report ID', async () => {
      const reportData = {
        reportId: 'invalid_report',
        schedule: 'weekly',
        recipients: ['admin@example.com'],
        format: 'json'
      };

      const response = await request(app)
        .post('/api/metrics/reports/schedule')
        .send(reportData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REPORT_ID');
      expect(response.body.error.message).toBe('Invalid report ID');
    });

    it('should handle invalid schedule', async () => {
      const reportData = {
        reportId: 'financial',
        schedule: 'invalid_schedule',
        recipients: ['admin@example.com'],
        format: 'json'
      };

      const response = await request(app)
        .post('/api/metrics/reports/schedule')
        .send(reportData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SCHEDULE');
      expect(response.body.error.message).toBe('Invalid schedule frequency');
    });

    it('should handle missing required fields', async () => {
      const reportData = {
        recipients: ['admin@example.com'],
        format: 'json'
        // Missing reportId and schedule
      };

      const response = await request(app)
        .post('/api/metrics/reports/schedule')
        .send(reportData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should calculate next run date correctly', async () => {
      const now = new Date('2023-01-01T00:00:00Z');
      
      // Mock Date.now to return a fixed time
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => now.getTime());
      
      try {
        // Test daily schedule
        const dailyReportData = {
          reportId: 'financial',
          schedule: 'daily',
          recipients: ['admin@example.com'],
          format: 'json'
        };

        const dailyResponse = await request(app)
          .post('/api/metrics/reports/schedule')
          .send(dailyReportData)
          .expect(200);

        const dailyNextRun = new Date(dailyResponse.body.data.scheduledReport.nextRun);
        const expectedDailyNextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        expect(dailyNextRun.getTime()).toBeCloseTo(expectedDailyNextRun.getTime(), 1000);

        // Test weekly schedule
        const weeklyReportData = {
          reportId: 'financial',
          schedule: 'weekly',
          recipients: ['admin@example.com'],
          format: 'json'
        };

        const weeklyResponse = await request(app)
          .post('/api/metrics/reports/schedule')
          .send(weeklyReportData)
          .expect(200);

        const weeklyNextRun = new Date(weeklyResponse.body.data.scheduledReport.nextRun);
        const expectedWeeklyNextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        expect(weeklyNextRun.getTime()).toBeCloseTo(expectedWeeklyNextRun.getTime(), 1000);

        // Test monthly schedule
        const monthlyReportData = {
          reportId: 'financial',
          schedule: 'monthly',
          recipients: ['admin@example.com'],
          format: 'json'
        };

        const monthlyResponse = await request(app)
          .post('/api/metrics/reports/schedule')
          .send(monthlyReportData)
          .expect(200);

        const monthlyNextRun = new Date(monthlyResponse.body.data.scheduledReport.nextRun);
        const expectedMonthlyNextRun = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        expect(monthlyNextRun.getTime()).toBeCloseTo(expectedMonthlyNextRun.getTime(), 1000);

        // Test quarterly schedule
        const quarterlyReportData = {
          reportId: 'financial',
          schedule: 'quarterly',
          recipients: ['admin@example.com'],
          format: 'json'
        };

        const quarterlyResponse = await request(app)
          .post('/api/metrics/reports/schedule')
          .send(quarterlyReportData)
          .expect(200);

        const quarterlyNextRun = new Date(quarterlyResponse.body.data.scheduledReport.nextRun);
        const expectedQuarterlyNextRun = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
        expect(quarterlyNextRun.getTime()).toBeCloseTo(expectedQuarterlyNextRun.getTime(), 1000);
      } finally {
        // Restore original Date.now
        Date.now = originalDateNow;
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent requests', async () => {
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/reporting.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/reporting.controller.js');
        return {
          ...originalModule,
          getMonthlyFinancials: jest.fn().mockResolvedValue([]),
          getInvestorReturns: jest.fn().mockResolvedValue([]),
          getPaymentMethodBreakdown: jest.fn().mockResolvedValue([])
        };
      });

      // Make multiple concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app).get('/api/metrics/reports/financial')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle malformed query parameters', async () => {
      const response = await request(app)
        .get('/api/metrics/reports/financial?startDate=invalid-date')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid format parameter', async () => {
      const response = await request(app)
        .get('/api/metrics/reports/financial?format=invalid_format')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});