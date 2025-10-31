import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/express.js';
import { createTestData, createMockRequest, createMockResponse, createMockNext } from '../../helpers/metrics.test.helpers.js';
import User from '../../../src/models/user.model.js';
import SolarApplication from '../../../src/models/metrics/solarApplication.model.js';
import KYCDocument from '../../../src/models/metrics/kycDocument.model.js';
import Transaction from '../../../src/models/metrics/transaction.model.js';

// Mock models to control their behavior in tests
jest.mock('../../../src/models/user.model.js');
jest.mock('../../../src/models/metrics/solarApplication.model.js');
jest.mock('../../../src/models/metrics/kycDocument.model.js');
jest.mock('../../../src/models/metrics/transaction.model.js');

describe('User Controller', () => {
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

  describe('getUserMetrics', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return user metrics successfully', async () => {
      // Mock database calls
      User.countDocuments.mockResolvedValue(500); // Total users
      User.countDocuments.mockResolvedValueOnce(300); // Active users
      User.countDocuments.mockResolvedValueOnce(50); // New users
      
      // Mock user activity stats
      const mockUserActivityStats = {
        dailyActive: 100,
        weeklyActive: 200,
        monthlyActive: 300
      };
      
      // Mock user application stats
      const mockUserApplicationStats = {
        totalApplications: 200,
        approvedApplications: 150,
        pendingApplications: 30,
        rejectedApplications: 20,
        approvalRate: 75
      };
      
      // Mock user KYC stats
      const mockUserKYCStats = {
        totalDocuments: 400,
        verifiedDocuments: 350,
        pendingDocuments: 40,
        rejectedDocuments: 10,
        completionRate: 87.5
      };
      
      // Mock user transaction stats
      const mockUserTransactionStats = {
        transactionCount: 1000,
        totalVolume: 50000000,
        averageValue: 50000,
        completionRate: 95
      };
      
      // Mock regional distribution
      const mockRegionalDistribution = {
        'Lagos': 150,
        'Abuja': 100,
        'Kano': 80,
        'Port Harcourt': 70,
        'Others': 100
      };
      
      // Mock user trends
      const mockUserTrends = {
        signups: [
          { month: '2023-01', count: 40 },
          { month: '2023-02', count: 45 }
        ],
        applications: [
          { month: '2023-01', count: 30 },
          { month: '2023-02', count: 35 }
        ]
      };

      // Mock the helper functions
      jest.doMock('../../../src/controllers/metrics/user.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/user.controller.js');
        return {
          ...originalModule,
          getUserActivityStats: jest.fn().mockResolvedValue(mockUserActivityStats),
          getUserApplicationStats: jest.fn().mockResolvedValue(mockUserApplicationStats),
          getUserKYCStats: jest.fn().mockResolvedValue(mockUserKYCStats),
          getUserTransactionStats: jest.fn().mockResolvedValue(mockUserTransactionStats),
          getUserRegionalDistribution: jest.fn().mockResolvedValue(mockRegionalDistribution),
          getUserTrends: jest.fn().mockResolvedValue(mockUserTrends)
        };
      });

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
      expect(response.body.data.summary.totalUsers).toBe(500);
      expect(response.body.data.summary.activeUsers).toBe(300);
      expect(response.body.data.summary.newUsers).toBe(50);
      expect(response.body.data.summary.averageApplicationsPerUser).toBe(0.4); // 200/500
      expect(response.body.data.summary.kycCompletionRate).toBe(87.5);
      expect(response.body.data.summary.averageTransactionValue).toBe(50000);
    });

    it('should handle date range parameters correctly', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      User.countDocuments.mockResolvedValue(200);
      User.countDocuments.mockResolvedValueOnce(150);
      User.countDocuments.mockResolvedValueOnce(20);
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/user.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/user.controller.js');
        return {
          ...originalModule,
          getUserActivityStats: jest.fn().mockResolvedValue({
            dailyActive: 50,
            weeklyActive: 100,
            monthlyActive: 150
          }),
          getUserApplicationStats: jest.fn().mockResolvedValue({
            totalApplications: 80,
            approvedApplications: 60,
            pendingApplications: 15,
            rejectedApplications: 5,
            approvalRate: 75
          }),
          getUserKYCStats: jest.fn().mockResolvedValue({
            totalDocuments: 150,
            verifiedDocuments: 130,
            pendingDocuments: 15,
            rejectedDocuments: 5,
            completionRate: 86.7
          }),
          getUserTransactionStats: jest.fn().mockResolvedValue({
            transactionCount: 400,
            totalVolume: 20000000,
            averageValue: 50000,
            completionRate: 95
          }),
          getUserRegionalDistribution: jest.fn().mockResolvedValue({
            'Lagos': 60,
            'Abuja': 40,
            'Others': 100
          }),
          getUserTrends: jest.fn().mockResolvedValue({
            signups: [{ month: '2023-01', count: 20 }],
            applications: [{ month: '2023-01', count: 15 }]
          })
        };
      });

      const response = await request(app)
        .get(`/api/metrics/users?startDate=${startDate}&endDate=${endDate}`)
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
      User.countDocuments.mockResolvedValue(100);
      User.countDocuments.mockResolvedValueOnce(80);
      User.countDocuments.mockResolvedValueOnce(10);
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/user.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/user.controller.js');
        return {
          ...originalModule,
          getUserActivityStats: jest.fn().mockResolvedValue({
            dailyActive: 30,
            weeklyActive: 60,
            monthlyActive: 80
          }),
          getUserApplicationStats: jest.fn().mockResolvedValue({
            totalApplications: 40,
            approvedApplications: 30,
            pendingApplications: 8,
            rejectedApplications: 2,
            approvalRate: 75
          }),
          getUserKYCStats: jest.fn().mockResolvedValue({
            totalDocuments: 80,
            verifiedDocuments: 70,
            pendingDocuments: 8,
            rejectedDocuments: 2,
            completionRate: 87.5
          }),
          getUserTransactionStats: jest.fn().mockResolvedValue({
            transactionCount: 200,
            totalVolume: 10000000,
            averageValue: 50000,
            completionRate: 95
          }),
          getUserRegionalDistribution: jest.fn().mockResolvedValue({
            'Lagos': 30,
            'Abuja': 20,
            'Others': 50
          }),
          getUserTrends: jest.fn().mockResolvedValue({
            signups: [{ month: '2023-01', count: 10 }],
            applications: [{ month: '2023-01', count: 8 }]
          })
        };
      });

      const response = await request(app)
        .get('/api/metrics/users?dateRange=last_30_days')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalUsers).toBe(100);
    });

    it('should calculate user growth correctly', async () => {
      // Mock current period data
      User.countDocuments.mockResolvedValueOnce(100); // Current period
      User.countDocuments.mockResolvedValueOnce(80); // Active users
      User.countDocuments.mockResolvedValueOnce(20); // New users
      User.countDocuments.mockResolvedValueOnce(80); // Previous period
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/user.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/user.controller.js');
        return {
          ...originalModule,
          getUserActivityStats: jest.fn().mockResolvedValue({
            dailyActive: 30,
            weeklyActive: 60,
            monthlyActive: 80
          }),
          getUserApplicationStats: jest.fn().mockResolvedValue({
            totalApplications: 40,
            approvedApplications: 30,
            pendingApplications: 8,
            rejectedApplications: 2,
            approvalRate: 75
          }),
          getUserKYCStats: jest.fn().mockResolvedValue({
            totalDocuments: 80,
            verifiedDocuments: 70,
            pendingDocuments: 8,
            rejectedDocuments: 2,
            completionRate: 87.5
          }),
          getUserTransactionStats: jest.fn().mockResolvedValue({
            transactionCount: 200,
            totalVolume: 10000000,
            averageValue: 50000,
            completionRate: 95
          }),
          getUserRegionalDistribution: jest.fn().mockResolvedValue({
            'Lagos': 30,
            'Abuja': 20,
            'Others': 50
          }),
          getUserTrends: jest.fn().mockResolvedValue({
            signups: [{ month: '2023-01', count: 20 }],
            applications: [{ month: '2023-01', count: 15 }]
          })
        };
      });

      const response = await request(app)
        .get('/api/metrics/users')
        .expect(200);

      expect(response.body.data.summary.userGrowth).toBeDefined();
      expect(response.body.data.summary.userGrowth.current).toBe(20);
      expect(response.body.data.summary.userGrowth.previous).toBe(80);
      expect(response.body.data.summary.userGrowth.percentage).toBe(-75); // (20-80)/80 * 100
      expect(response.body.data.summary.userGrowth.trend).toBe('down');
    });

    it('should handle database errors gracefully', async () => {
      User.countDocuments.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/metrics/users')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle zero values in calculations', async () => {
      User.countDocuments.mockResolvedValue(0);
      User.countDocuments.mockResolvedValueOnce(0);
      User.countDocuments.mockResolvedValueOnce(0);
      User.countDocuments.mockResolvedValueOnce(0);
      
      // Mock helper functions with zero values
      jest.doMock('../../../src/controllers/metrics/user.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/user.controller.js');
        return {
          ...originalModule,
          getUserActivityStats: jest.fn().mockResolvedValue({
            dailyActive: 0,
            weeklyActive: 0,
            monthlyActive: 0
          }),
          getUserApplicationStats: jest.fn().mockResolvedValue({
            totalApplications: 0,
            approvedApplications: 0,
            pendingApplications: 0,
            rejectedApplications: 0,
            approvalRate: 0
          }),
          getUserKYCStats: jest.fn().mockResolvedValue({
            totalDocuments: 0,
            verifiedDocuments: 0,
            pendingDocuments: 0,
            rejectedDocuments: 0,
            completionRate: 0
          }),
          getUserTransactionStats: jest.fn().mockResolvedValue({
            transactionCount: 0,
            totalVolume: 0,
            averageValue: 0,
            completionRate: 0
          }),
          getUserRegionalDistribution: jest.fn().mockResolvedValue({}),
          getUserTrends: jest.fn().mockResolvedValue({
            signups: [],
            applications: []
          })
        };
      });

      const response = await request(app)
        .get('/api/metrics/users')
        .expect(200);

      expect(response.body.data.summary.averageApplicationsPerUser).toBe(0);
      expect(response.body.data.summary.kycCompletionRate).toBe(0);
      expect(response.body.data.summary.averageTransactionValue).toBe(0);
    });
  });

  describe('getUserDetails', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return user details successfully', async () => {
      const userId = '507f1f77bcf86cd799439011';
      
      // Mock user lookup
      User.findById.mockResolvedValue({
        _id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date('2023-01-01'),
        lastLoginAt: new Date('2023-01-15')
      });
      
      // Mock user's applications
      SolarApplication.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          {
            _id: 'app1',
            applicationId: 'APP1234',
            status: 'approved',
            kycStatus: 'verified',
            propertyType: 'residential',
            estimatedCost: 500000,
            submittedAt: new Date('2023-01-05'),
            approvedAt: new Date('2023-01-10'),
            installedAt: new Date('2023-01-20')
          }
        ])
      });
      
      // Mock user's KYC documents
      KYCDocument.find.mockResolvedValue([
        {
          _id: 'kyc1',
          documentType: 'government_id',
          verificationStatus: 'verified',
          uploadedAt: new Date('2023-01-03'),
          reviewedAt: new Date('2023-01-07'),
          verificationScore: 95
        }
      ]);
      
      // Mock user's transactions
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            _id: 'txn1',
            transactionId: 'TXN123456',
            type: 'investment',
            amount: 100000,
            status: 'completed',
            paymentMethod: 'bank_transfer',
            createdAt: new Date('2023-01-08'),
            completedAt: new Date('2023-01-09')
          }
        ])
      });

      const response = await request(app)
        .get(`/api/metrics/users/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.applications).toBeDefined();
      expect(response.body.data.kycDocuments).toBeDefined();
      expect(response.body.data.transactions).toBeDefined();
      expect(response.body.data.detailedMetrics).toBeDefined();
      
      expect(response.body.data.user.id).toBe(userId);
      expect(response.body.data.user.name).toBe('John Doe');
      expect(response.body.data.user.email).toBe('john@example.com');
    });

    it('should handle non-existent user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      
      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/metrics/users/${userId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
      expect(response.body.error.message).toBe('User not found');
    });

    it('should handle invalid user ID', async () => {
      const response = await request(app)
        .get('/api/metrics/users/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should calculate detailed metrics correctly', async () => {
      const userId = '507f1f77bcf86cd799439011';
      
      User.findById.mockResolvedValue({
        _id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date('2023-01-01'),
        lastLoginAt: new Date('2023-01-15')
      });
      
      SolarApplication.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          {
            _id: 'app1',
            status: 'approved',
            applicationStatus: 'approved'
          },
          {
            _id: 'app2',
            status: 'installed',
            applicationStatus: 'installed'
          },
          {
            _id: 'app3',
            status: 'pending',
            applicationStatus: 'pending'
          }
        ])
      });
      
      KYCDocument.find.mockResolvedValue([
        {
          _id: 'kyc1',
          verificationStatus: 'verified'
        },
        {
          _id: 'kyc2',
          verificationStatus: 'pending'
        }
      ]);
      
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            _id: 'txn1',
            type: 'investment',
            amount: 100000,
            createdAt: new Date('2023-01-08')
          },
          {
            _id: 'txn2',
            type: 'repayment',
            amount: 15000,
            createdAt: new Date('2023-02-08')
          }
        ])
      });

      const response = await request(app)
        .get(`/api/metrics/users/${userId}`)
        .expect(200);

      expect(response.body.data.detailedMetrics).toBeDefined();
      expect(response.body.data.detailedMetrics.totalApplications).toBe(3);
      expect(response.body.data.detailedMetrics.approvedApplications).toBe(2);
      expect(response.body.data.detailedMetrics.installedApplications).toBe(1);
      expect(response.body.data.detailedMetrics.applicationSuccessRate).toBe(66.7);
      expect(response.body.data.detailedMetrics.totalKYCDocuments).toBe(2);
      expect(response.body.data.detailedMetrics.verifiedDocuments).toBe(1);
      expect(response.body.data.detailedMetrics.pendingDocuments).toBe(1);
      expect(response.body.data.detailedMetrics.kycCompletionRate).toBe(50);
      expect(response.body.data.detailedMetrics.totalTransactions).toBe(2);
      expect(response.body.data.detailedMetrics.totalInvestmentAmount).toBe(100000);
      expect(response.body.data.detailedMetrics.totalRepaymentAmount).toBe(15000);
    });
  });

  describe('getUserList', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return paginated user list successfully', async () => {
      // Mock database calls
      User.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                _id: 'user1',
                name: 'John Doe',
                email: 'john@example.com',
                createdAt: new Date('2023-01-01'),
                lastLoginAt: new Date('2023-01-15')
              },
              {
                _id: 'user2',
                name: 'Jane Smith',
                email: 'jane@example.com',
                createdAt: new Date('2023-01-05'),
                lastLoginAt: new Date('2023-01-20')
              }
            ])
          })
        })
      });
      
      User.countDocuments.mockResolvedValue(25);
      
      // Mock additional metrics for each user
      SolarApplication.countDocuments.mockResolvedValue(2); // Application count
      KYCDocument.countDocuments.mockResolvedValue(3); // KYC count
      Transaction.countDocuments.mockResolvedValue(5); // Transaction count

      const response = await request(app)
        .get('/api/metrics/users/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(25);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.totalPages).toBe(2);
      
      // Verify user metrics
      expect(response.body.data[0].applicationCount).toBe(2);
      expect(response.body.data[0].kycCount).toBe(3);
      expect(response.body.data[0].transactionCount).toBe(5);
    });

    it('should handle pagination parameters correctly', async () => {
      User.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              { _id: 'user1', name: 'John Doe' }
            ])
          })
        })
      });
      
      User.countDocuments.mockResolvedValue(50);
      SolarApplication.countDocuments.mockResolvedValue(1);
      KYCDocument.countDocuments.mockResolvedValue(2);
      Transaction.countDocuments.mockResolvedValue(3);

      const response = await request(app)
        .get('/api/metrics/users/list?page=2&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.totalPages).toBe(5);
      expect(User.find().skip).toHaveBeenCalledWith(10); // (page-1) * limit
    });

    it('should handle filter parameters in list', async () => {
      User.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              { _id: 'user1', name: 'John Doe' }
            ])
          })
        })
      });
      
      User.countDocuments.mockResolvedValue(10);
      SolarApplication.countDocuments.mockResolvedValue(1);
      KYCDocument.countDocuments.mockResolvedValue(2);
      Transaction.countDocuments.mockResolvedValue(3);

      const response = await request(app)
        .get('/api/metrics/users/list?status=active')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/metrics/users/list?page=0&limit=101')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('getUserActivityMetrics', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return user activity metrics successfully', async () => {
      // Mock database calls
      User.countDocuments.mockResolvedValue(100); // Total users
      User.countDocuments.mockResolvedValueOnce(50); // Active users (last 30 days)
      
      // Mock daily activity
      User.aggregate.mockResolvedValueOnce([
        { _id: { year: 2023, month: 1, day: 1 }, activeUsers: 20 },
        { _id: { year: 2023, month: 1, day: 2 }, activeUsers: 25 },
        { _id: { year: 2023, month: 1, day: 3 }, activeUsers: 30 }
      ]);
      
      // Mock hourly activity
      User.aggregate.mockResolvedValueOnce([
        { _id: 9, activeUsers: 10 },
        { _id: 10, activeUsers: 15 },
        { _id: 11, activeUsers: 20 },
        { _id: 12, activeUsers: 25 },
        { _id: 13, activeUsers: 30 },
        { _id: 14, activeUsers: 25 },
        { _id: 15, activeUsers: 20 }
      ]);
      
      // Mock user engagement metrics
      const mockUserEngagementMetrics = {
        applicationEngagement: 60,
        kycEngagement: 80,
        transactionEngagement: 40
      };
      
      jest.doMock('../../../src/controllers/metrics/user.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/user.controller.js');
        return {
          ...originalModule,
          getUserActivityStats: jest.fn().mockResolvedValue({
            dailyActive: 50,
            weeklyActive: 70,
            monthlyActive: 100
          }),
          getUserEngagementMetrics: jest.fn().mockResolvedValue(mockUserEngagementMetrics)
        };
      });

      const response = await request(app)
        .get('/api/metrics/users/activity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.dailyActive).toBe(50);
      expect(response.body.data.weeklyActive).toBe(70);
      expect(response.body.data.monthlyActive).toBe(100);
      expect(response.body.data.dailyActivity).toBeDefined();
      expect(response.body.data.hourlyActivity).toBeDefined();
      expect(response.body.data.engagement).toBeDefined();
      
      // Verify daily activity
      expect(response.body.data.dailyActivity).toHaveLength(3);
      expect(response.body.data.dailyActivity[0].date).toBe('2023-01-01');
      expect(response.body.data.dailyActivity[0].activeUsers).toBe(20);
      
      // Verify hourly activity
      expect(response.body.data.hourlyActivity).toHaveLength(7);
      expect(response.body.data.hourlyActivity[0].hour).toBe(9);
      expect(response.body.data.hourlyActivity[0].activeUsers).toBe(10);
      
      // Verify engagement metrics
      expect(response.body.data.engagement.applicationEngagement).toBe(60);
      expect(response.body.data.engagement.kycEngagement).toBe(80);
      expect(response.body.data.engagement.transactionEngagement).toBe(40);
    });

    it('should handle empty activity data', async () => {
      User.countDocuments.mockResolvedValue(0);
      User.countDocuments.mockResolvedValueOnce(0);
      User.aggregate.mockResolvedValueOnce([]); // Daily activity
      User.aggregate.mockResolvedValueOnce([]); // Hourly activity
      
      jest.doMock('../../../src/controllers/metrics/user.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/user.controller.js');
        return {
          ...originalModule,
          getUserActivityStats: jest.fn().mockResolvedValue({
            dailyActive: 0,
            weeklyActive: 0,
            monthlyActive: 0
          }),
          getUserEngagementMetrics: jest.fn().mockResolvedValue({
            applicationEngagement: 0,
            kycEngagement: 0,
            transactionEngagement: 0
          })
        };
      });

      const response = await request(app)
        .get('/api/metrics/users/activity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dailyActive).toBe(0);
      expect(response.body.data.dailyActivity).toHaveLength(0);
      expect(response.body.data.hourlyActivity).toHaveLength(0);
    });

    it('should handle database errors in activity metrics', async () => {
      User.countDocuments.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/metrics/users/activity')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent requests', async () => {
      // Mock successful responses
      User.countDocuments.mockResolvedValue(100);
      User.countDocuments.mockResolvedValueOnce(80);
      User.countDocuments.mockResolvedValueOnce(20);
      
      jest.doMock('../../../src/controllers/metrics/user.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/user.controller.js');
        return {
          ...originalModule,
          getUserActivityStats: jest.fn().mockResolvedValue({
            dailyActive: 30,
            weeklyActive: 60,
            monthlyActive: 80
          }),
          getUserApplicationStats: jest.fn().mockResolvedValue({
            totalApplications: 40,
            approvedApplications: 30,
            pendingApplications: 8,
            rejectedApplications: 2,
            approvalRate: 75
          }),
          getUserKYCStats: jest.fn().mockResolvedValue({
            totalDocuments: 80,
            verifiedDocuments: 70,
            pendingDocuments: 8,
            rejectedDocuments: 2,
            completionRate: 87.5
          }),
          getUserTransactionStats: jest.fn().mockResolvedValue({
            transactionCount: 200,
            totalVolume: 10000000,
            averageValue: 50000,
            completionRate: 95
          }),
          getUserRegionalDistribution: jest.fn().mockResolvedValue({
            'Lagos': 30,
            'Abuja': 20,
            'Others': 50
          }),
          getUserTrends: jest.fn().mockResolvedValue({
            signups: [{ month: '2023-01', count: 10 }],
            applications: [{ month: '2023-01', count: 8 }]
          })
        };
      });

      // Make multiple concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app).get('/api/metrics/users')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle malformed query parameters', async () => {
      const response = await request(app)
        .get('/api/metrics/users?startDate=invalid-date')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle very large pagination values', async () => {
      const response = await request(app)
        .get('/api/metrics/users/list?page=1&limit=1000')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});