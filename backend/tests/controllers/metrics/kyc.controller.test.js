import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/express.js';
import { createTestData, createMockRequest, createMockResponse, createMockNext } from '../../helpers/metrics.test.helpers.js';
import KYCDocument from '../../../src/models/metrics/kycDocument.model.js';
import User from '../../../src/models/user.model.js';
import SolarApplication from '../../../src/models/metrics/solarApplication.model.js';
import Investor from '../../../src/models/metrics/investor.model.js';
import Investment from '../../../src/models/metrics/investment.model.js';

// Mock models to control their behavior in tests
jest.mock('../../../src/models/metrics/kycDocument.model.js');
jest.mock('../../../src/models/user.model.js');
jest.mock('../../../src/models/metrics/solarApplication.model.js');
jest.mock('../../../src/models/metrics/investor.model.js');
jest.mock('../../../src/models/metrics/investment.model.js');

describe('KYC Controller', () => {
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

  describe('getKYCMetrics', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return KYC metrics successfully', async () => {
      // Mock database calls
      KYCDocument.countDocuments.mockResolvedValue(1000); // Total documents
      KYCDocument.countDocuments.mockResolvedValueOnce(800); // Verified documents
      KYCDocument.countDocuments.mockResolvedValueOnce(150); // Pending documents
      KYCDocument.countDocuments.mockResolvedValueOnce(30); // Rejected documents
      KYCDocument.countDocuments.mockResolvedValueOnce(20); // Under review documents
      
      // Mock aggregation calls
      KYCDocument.aggregate.mockResolvedValueOnce([
        { _id: 'government_id', count: 400 },
        { _id: 'utility_bill', count: 300 },
        { _id: 'bank_statement', count: 200 },
        { _id: 'proof_of_income', count: 80 },
        { _id: 'property_document', count: 20 }
      ]); // Document type breakdown
      
      KYCDocument.aggregate.mockResolvedValueOnce([
        { _id: 'verified', count: 800 },
        { _id: 'pending', count: 150 },
        { _id: 'rejected', count: 30 },
        { _id: 'under_review', count: 20 }
      ]); // Verification status breakdown
      
      // Mock processing time stats
      const mockProcessingTimeStats = {
        average: 2.5,
        minimum: 0.5,
        maximum: 7.0
      };
      
      // Mock verification score stats
      const mockVerificationScoreStats = {
        average: 85.5,
        minimum: 60.0,
        maximum: 98.0
      };
      
      // Mock performance metrics
      const mockPerformanceMetrics = {
        totalDocuments: 1000,
        verifiedDocuments: 800,
        rejectedDocuments: 30,
        verificationRate: 80.0,
        rejectionRate: 3.0,
        averageProcessingTime: 2.5
      };
      
      // Mock trends
      const mockKYCTrends = {
        dailyUploads: [
          { date: '2023-01-01', count: 30, verified: 25, verificationRate: 83.3 },
          { date: '2023-01-02', count: 25, verified: 20, verificationRate: 80.0 }
        ],
        monthlyVerification: [
          { month: '2023-01', status: 'verified', count: 600 },
          { month: '2023-01', status: 'rejected', count: 20 }
        ]
      };
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/kyc.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/kyc.controller.js');
        return {
          ...originalModule,
          getProcessingTimeStats: jest.fn().mockResolvedValue(mockProcessingTimeStats),
          getVerificationScoreStats: jest.fn().mockResolvedValue(mockVerificationScoreStats),
          getKYCPerformanceMetrics: jest.fn().mockResolvedValue(mockPerformanceMetrics),
          getKYCTrends: jest.fn().mockResolvedValue(mockKYCTrends)
        };
      });

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
      expect(response.body.data.summary.totalDocuments).toBe(1000);
      expect(response.body.data.summary.verifiedDocuments).toBe(800);
      expect(response.body.data.summary.pendingDocuments).toBe(150);
      expect(response.body.data.summary.rejectedDocuments).toBe(30);
      expect(response.body.data.summary.underReviewDocuments).toBe(20);
      expect(response.body.data.summary.verificationRate).toBe(80);
      expect(response.body.data.summary.rejectionRate).toBe(3);
      expect(response.body.data.summary.averageProcessingTime).toBe(2.5);
      expect(response.body.data.summary.averageVerificationScore).toBe(85.5);
    });

    it('should handle date range parameters correctly', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      KYCDocument.countDocuments.mockResolvedValue(500);
      KYCDocument.countDocuments.mockResolvedValueOnce(400);
      KYCDocument.countDocuments.mockResolvedValueOnce(75);
      KYCDocument.countDocuments.mockResolvedValueOnce(15);
      KYCDocument.countDocuments.mockResolvedValueOnce(10);
      
      KYCDocument.aggregate.mockResolvedValueOnce([
        { _id: 'government_id', count: 200 },
        { _id: 'utility_bill', count: 150 },
        { _id: 'bank_statement', count: 100 },
        { _id: 'proof_of_income', count: 40 },
        { _id: 'property_document', count: 10 }
      ]);
      
      KYCDocument.aggregate.mockResolvedValueOnce([
        { _id: 'verified', count: 400 },
        { _id: 'pending', count: 75 },
        { _id: 'rejected', count: 15 },
        { _id: 'under_review', count: 10 }
      ]);
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/kyc.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/kyc.controller.js');
        return {
          ...originalModule,
          getProcessingTimeStats: jest.fn().mockResolvedValue({
            average: 2.0,
            minimum: 0.5,
            maximum: 5.0
          }),
          getVerificationScoreStats: jest.fn().mockResolvedValue({
            average: 85.0,
            minimum: 65.0,
            maximum: 95.0
          }),
          getKYCPerformanceMetrics: jest.fn().mockResolvedValue({
            totalDocuments: 500,
            verifiedDocuments: 400,
            rejectedDocuments: 15,
            verificationRate: 80.0,
            rejectionRate: 3.0,
            averageProcessingTime: 2.0
          }),
          getKYCTrends: jest.fn().mockResolvedValue({
            dailyUploads: [
              { date: '2023-01-01', count: 15, verified: 12, verificationRate: 80.0 }
            ],
            monthlyVerification: [
              { month: '2023-01', status: 'verified', count: 300 }
            ]
          })
        };
      });

      const response = await request(app)
        .get(`/api/metrics/kyc?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(KYCDocument.countDocuments).toHaveBeenCalledWith({
        uploadedAt: { 
          $gte: expect.any(Date), 
          $lte: expect.any(Date) 
        }
      });
    });

    it('should handle preset date ranges', async () => {
      KYCDocument.countDocuments.mockResolvedValue(300);
      KYCDocument.countDocuments.mockResolvedValueOnce(240);
      KYCDocument.countDocuments.mockResolvedValueOnce(45);
      KYCDocument.countDocuments.mockResolvedValueOnce(9);
      KYCDocument.countDocuments.mockResolvedValueOnce(6);
      
      KYCDocument.aggregate.mockResolvedValueOnce([
        { _id: 'government_id', count: 120 },
        { _id: 'utility_bill', count: 90 },
        { _id: 'bank_statement', count: 60 },
        { _id: 'proof_of_income', count: 24 },
        { _id: 'property_document', count: 6 }
      ]);
      
      KYCDocument.aggregate.mockResolvedValueOnce([
        { _id: 'verified', count: 240 },
        { _id: 'pending', count: 45 },
        { _id: 'rejected', count: 9 },
        { _id: 'under_review', count: 6 }
      ]);
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/kyc.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/kyc.controller.js');
        return {
          ...originalModule,
          getProcessingTimeStats: jest.fn().mockResolvedValue({
            average: 1.8,
            minimum: 0.5,
            maximum: 4.0
          }),
          getVerificationScoreStats: jest.fn().mockResolvedValue({
            average: 87.0,
            minimum: 70.0,
            maximum: 95.0
          }),
          getKYCPerformanceMetrics: jest.fn().mockResolvedValue({
            totalDocuments: 300,
            verifiedDocuments: 240,
            rejectedDocuments: 9,
            verificationRate: 80.0,
            rejectionRate: 3.0,
            averageProcessingTime: 1.8
          }),
          getKYCTrends: jest.fn().mockResolvedValue({
            dailyUploads: [
              { date: '2023-01-01', count: 10, verified: 8, verificationRate: 80.0 }
            ],
            monthlyVerification: [
              { month: '2023-01', status: 'verified', count: 180 }
            ]
          })
        };
      });

      const response = await request(app)
        .get('/api/metrics/kyc?dateRange=last_30_days')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalDocuments).toBe(300);
    });

    it('should calculate growth metrics correctly', async () => {
      // Mock current period data
      KYCDocument.countDocuments.mockResolvedValueOnce(1000); // Current period
      KYCDocument.countDocuments.mockResolvedValueOnce(800); // Verified
      KYCDocument.countDocuments.mockResolvedValueOnce(150); // Pending
      KYCDocument.countDocuments.mockResolvedValueOnce(30); // Rejected
      KYCDocument.countDocuments.mockResolvedValueOnce(20); // Under review
      
      // Mock previous period data
      KYCDocument.countDocuments.mockResolvedValueOnce(800); // Previous period
      KYCDocument.countDocuments.mockResolvedValueOnce(600); // Previous verified
      
      KYCDocument.aggregate.mockResolvedValueOnce([]); // Type breakdown
      KYCDocument.aggregate.mockResolvedValueOnce([]); // Status breakdown
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/kyc.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/kyc.controller.js');
        return {
          ...originalModule,
          getProcessingTimeStats: jest.fn().mockResolvedValue({
            average: 2.5,
            minimum: 0.5,
            maximum: 7.0
          }),
          getVerificationScoreStats: jest.fn().mockResolvedValue({
            average: 85.5,
            minimum: 60.0,
            maximum: 98.0
          }),
          getKYCPerformanceMetrics: jest.fn().mockResolvedValue({
            totalDocuments: 1000,
            verifiedDocuments: 800,
            rejectedDocuments: 30,
            verificationRate: 80.0,
            rejectionRate: 3.0,
            averageProcessingTime: 2.5
          }),
          getKYCTrends: jest.fn().mockResolvedValue({
            dailyUploads: [],
            monthlyVerification: []
          })
        };
      });

      const response = await request(app)
        .get('/api/metrics/kyc')
        .expect(200);

      expect(response.body.data.growth.documentGrowth).toBeDefined();
      expect(response.body.data.growth.verificationGrowth).toBeDefined();
      
      // Verify growth calculation
      expect(response.body.data.growth.documentGrowth.current).toBe(1000);
      expect(response.body.data.growth.documentGrowth.previous).toBe(800);
      expect(response.body.data.growth.documentGrowth.percentage).toBe(25); // (1000-800)/800 * 100
      expect(response.body.data.growth.documentGrowth.trend).toBe('up');
      
      expect(response.body.data.growth.verificationGrowth.current).toBe(800);
      expect(response.body.data.growth.verificationGrowth.previous).toBe(600);
      expect(response.body.data.growth.verificationGrowth.percentage).toBe(33.33); // (800-600)/600 * 100
      expect(response.body.data.growth.verificationGrowth.trend).toBe('up');
    });

    it('should handle database errors gracefully', async () => {
      KYCDocument.countDocuments.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/metrics/kyc')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle zero values in calculations', async () => {
      KYCDocument.countDocuments.mockResolvedValue(0);
      KYCDocument.countDocuments.mockResolvedValueOnce(0);
      KYCDocument.countDocuments.mockResolvedValueOnce(0);
      KYCDocument.countDocuments.mockResolvedValueOnce(0);
      KYCDocument.countDocuments.mockResolvedValueOnce(0);
      
      KYCDocument.aggregate.mockResolvedValueOnce([]);
      KYCDocument.aggregate.mockResolvedValueOnce([]);
      
      KYCDocument.countDocuments.mockResolvedValueOnce(0); // Previous period
      KYCDocument.countDocuments.mockResolvedValueOnce(0); // Previous verified
      
      // Mock helper functions with zero values
      jest.doMock('../../../src/controllers/metrics/kyc.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/kyc.controller.js');
        return {
          ...originalModule,
          getProcessingTimeStats: jest.fn().mockResolvedValue({
            average: 0,
            minimum: 0,
            maximum: 0
          }),
          getVerificationScoreStats: jest.fn().mockResolvedValue({
            average: 0,
            minimum: 0,
            maximum: 0
          }),
          getKYCPerformanceMetrics: jest.fn().mockResolvedValue({
            totalDocuments: 0,
            verifiedDocuments: 0,
            rejectedDocuments: 0,
            verificationRate: 0,
            rejectionRate: 0,
            averageProcessingTime: 0
          }),
          getKYCTrends: jest.fn().mockResolvedValue({
            dailyUploads: [],
            monthlyVerification: []
          })
        };
      });

      const response = await request(app)
        .get('/api/metrics/kyc')
        .expect(200);

      expect(response.body.data.summary.verificationRate).toBe(0);
      expect(response.body.data.summary.rejectionRate).toBe(0);
      expect(response.body.data.growth.documentGrowth.percentage).toBe(0);
      expect(response.body.data.growth.documentGrowth.trend).toBe('stable');
    });
  });

  describe('getKYCDetails', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return KYC document details successfully', async () => {
      const documentId = '507f1f77bcf86cd799439011';
      
      // Mock document lookup
      KYCDocument.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({
              _id: documentId,
              documentType: 'government_id',
              documentUrl: 'https://example.com/doc.pdf',
              documentNumber: '1234567890',
              issuingAuthority: 'NIMC',
              issueDate: new Date('2015-01-01'),
              expiryDate: new Date('2025-01-01'),
              verificationStatus: 'verified',
              verificationScore: 95,
              rejectionReason: null,
              uploadedAt: new Date('2023-01-01'),
              reviewedAt: new Date('2023-01-03'),
              processingTime: 2,
              isExpired: false,
              daysUntilExpiry: 730,
              hasHighConfidence: true,
              hasFlags: false,
              aiAnalysis: {
                authenticityScore: 98,
                extractedData: {
                  name: 'John Doe',
                  dateOfBirth: new Date('1990-01-01'),
                  documentNumber: '1234567890'
                },
                flags: []
              }
            })
          })
        })
      });
      
      // Mock related user
      User.findById.mockResolvedValue({
        _id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date('2022-01-01')
      });
      
      // Mock user applications
      SolarApplication.find.mockResolvedValue([
        {
          _id: 'app1',
          applicationId: 'APP1234',
          status: 'approved',
          kycStatus: 'verified'
        },
        {
          _id: 'app2',
          applicationId: 'APP1235',
          status: 'pending',
          kycStatus: 'pending'
        }
      ]);
      
      // Mock user investments
      Investment.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          {
            _id: 'inv1',
            investmentId: 'INV1234',
            applicationId: { applicationId: 'APP1234' },
            status: 'active',
            amount: 500000
          }
        ])
      });
      
      // Mock document history
      const mockDocumentHistory = [
        {
          action: 'uploaded',
          timestamp: new Date('2023-01-01'),
          performedBy: 'user123',
          details: 'Document uploaded by user'
        },
        {
          action: 'reviewed',
          timestamp: new Date('2023-01-03'),
          performedBy: 'reviewer123',
          details: 'Document verified by reviewer'
        }
      ];
      
      jest.doMock('../../../src/controllers/metrics/kyc.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/kyc.controller.js');
        return {
          ...originalModule,
          getDocumentHistory: jest.fn().mockResolvedValue(mockDocumentHistory)
        };
      });

      const response = await request(app)
        .get(`/api/metrics/kyc/${documentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.document).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.relatedApplication).toBeDefined();
      expect(response.body.data.reviewer).toBeDefined();
      expect(response.body.data.userApplications).toBeDefined();
      expect(response.body.data.userInvestments).toBeDefined();
      expect(response.body.data.documentHistory).toBeDefined();
      
      expect(response.body.data.document.id).toBe(documentId);
      expect(response.body.data.document.documentType).toBe('government_id');
      expect(response.body.data.document.verificationStatus).toBe('verified');
      expect(response.body.data.document.verificationScore).toBe(95);
      expect(response.body.data.document.isExpired).toBe(false);
      expect(response.body.data.document.hasHighConfidence).toBe(true);
      expect(response.body.data.document.hasFlags).toBe(false);
    });

    it('should handle non-existent document', async () => {
      const documentId = '507f1f77bcf86cd799439011';
      
      KYCDocument.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(null)
          })
        })
      });

      const response = await request(app)
        .get(`/api/metrics/kyc/${documentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('KYC_DOCUMENT_NOT_FOUND');
      expect(response.body.error.message).toBe('KYC document not found');
    });

    it('should handle invalid document ID', async () => {
      const response = await request(app)
        .get('/api/metrics/kyc/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should handle document with flags', async () => {
      const documentId = '507f1f77bcf86cd799439011';
      
      KYCDocument.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({
              _id: documentId,
              documentType: 'utility_bill',
              verificationStatus: 'under_review',
              verificationScore: 75,
              rejectionReason: null,
              hasFlags: true,
              aiAnalysis: {
                authenticityScore: 80,
                flags: ['Low quality', 'Suspicious pattern']
              }
            })
          })
        })
      });
      
      User.findById.mockResolvedValue({
        _id: 'user123',
        name: 'John Doe',
        email: 'john@example.com'
      });
      
      SolarApplication.find.mockResolvedValue([]);
      Investment.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });
      
      jest.doMock('../../../src/controllers/metrics/kyc.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/kyc.controller.js');
        return {
          ...originalModule,
          getDocumentHistory: jest.fn().mockResolvedValue([
            {
              action: 'uploaded',
              timestamp: new Date('2023-01-01'),
              performedBy: 'user123',
              details: 'Document uploaded by user'
            }
          ])
        };
      });

      const response = await request(app)
        .get(`/api/metrics/kyc/${documentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.document.hasFlags).toBe(true);
      expect(response.body.data.document.aiAnalysis.flags).toContain('Low quality');
      expect(response.body.data.document.aiAnalysis.flags).toContain('Suspicious pattern');
    });
  });

  describe('getKYCList', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return paginated KYC document list successfully', async () => {
      // Mock database calls
      KYCDocument.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                {
                  _id: 'doc1',
                  documentType: 'government_id',
                  verificationStatus: 'verified',
                  verificationScore: 95,
                  user: { _id: 'user1', name: 'John Doe', email: 'john@example.com' },
                  applicationId: { applicationId: 'APP1234' },
                  reviewer: { _id: 'reviewer1', name: 'Jane Reviewer', email: 'jane@example.com' },
                  uploadedAt: new Date('2023-01-01'),
                  reviewedAt: new Date('2023-01-03'),
                  processingTime: 2,
                  isExpired: false,
                  hasFlags: false
                },
                {
                  _id: 'doc2',
                  documentType: 'utility_bill',
                  verificationStatus: 'pending',
                  verificationScore: 0,
                  user: { _id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
                  applicationId: { applicationId: 'APP1235' },
                  reviewer: null,
                  uploadedAt: new Date('2023-01-02'),
                  reviewedAt: null,
                  processingTime: null,
                  isExpired: false,
                  hasFlags: true
                }
              ])
            })
          })
        })
      });
      
      KYCDocument.countDocuments.mockResolvedValue(250);

      const response = await request(app)
        .get('/api/metrics/kyc/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(250);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.totalPages).toBe(13);
      
      // Verify document data
      expect(response.body.data[0].documentType).toBe('government_id');
      expect(response.body.data[0].verificationStatus).toBe('verified');
      expect(response.body.data[0].verificationScore).toBe(95);
      expect(response.body.data[0].user.name).toBe('John Doe');
      expect(response.body.data[0].applicationId).toBe('APP1234');
      expect(response.body.data[0].reviewer.name).toBe('Jane Reviewer');
      expect(response.body.data[0].processingTime).toBe(2);
      expect(response.body.data[0].isExpired).toBe(false);
      expect(response.body.data[0].hasFlags).toBe(false);
      
      expect(response.body.data[1].documentType).toBe('utility_bill');
      expect(response.body.data[1].verificationStatus).toBe('pending');
      expect(response.body.data[1].verificationScore).toBe(0);
      expect(response.body.data[1].user.name).toBe('Jane Smith');
      expect(response.body.data[1].reviewer).toBeNull();
      expect(response.body.data[1].processingTime).toBeNull();
      expect(response.body.data[1].hasFlags).toBe(true);
    });

    it('should handle pagination parameters correctly', async () => {
      KYCDocument.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                { _id: 'doc1', documentType: 'government_id' }
              ])
            })
          })
        })
      });
      
      KYCDocument.countDocuments.mockResolvedValue(100);

      const response = await request(app)
        .get('/api/metrics/kyc/list?page=2&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.totalPages).toBe(10);
      expect(KYCDocument.find().skip).toHaveBeenCalledWith(10); // (page-1) * limit
    });

    it('should handle filter parameters in list', async () => {
      KYCDocument.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                { _id: 'doc1', documentType: 'government_id', verificationStatus: 'verified' }
              ])
            })
          })
        })
      });
      
      KYCDocument.countDocuments.mockResolvedValue(50);

      const response = await request(app)
        .get('/api/metrics/kyc/list?documentType=government_id&verificationStatus=verified')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].documentType).toBe('government_id');
      expect(response.body.data[0].verificationStatus).toBe('verified');
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/metrics/kyc/list?page=0&limit=101')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('getKYCPerformanceMetrics', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return KYC performance metrics successfully', async () => {
      // Mock database calls
      KYCDocument.countDocuments.mockResolvedValue(1000); // Total documents
      KYCDocument.countDocuments.mockResolvedValueOnce(800); // Verified documents
      KYCDocument.countDocuments.mockResolvedValueOnce(150); // Rejected documents
      
      // Mock processing time distribution
      KYCDocument.aggregate.mockResolvedValueOnce([
        { _id: 1, count: 500 }, // 0-1 days
        { _id: 3, count: 300 }, // 2-3 days
        { _id: 5, count: 150 }, // 4-5 days
        { _id: 7, count: 30 }, // 6-7 days
        { _id: 14, count: 20 }  // 8-14 days
      ]);
      
      // Mock verification score distribution
      KYCDocument.aggregate.mockResolvedValueOnce([
        { _id: 70, count: 50 },   // 70-79
        { _id: 80, count: 200 },  // 80-89
        { _id: 90, count: 400 },  // 90-95
        { _id: 95, count: 300 },  // 95-100
        { _id: 100, count: 50 }  // 100
      ]);
      
      // Mock reviewer performance
      KYCDocument.aggregate.mockResolvedValueOnce([
        { _id: 'reviewer1', totalReviewed: 200, verified: 180, rejected: 20, avgProcessingTime: 2.5, avgScore: 88 },
        { _id: 'reviewer2', totalReviewed: 150, verified: 130, rejected: 20, avgProcessingTime: 3.0, avgScore: 85 }
      ]);
      
      // Mock reviewer population
      KYCDocument.populate.mockResolvedValue([
        {
          _id: 'reviewer1',
          name: 'Jane Reviewer',
          email: 'jane@example.com'
        },
        {
          _id: 'reviewer2',
          name: 'John Reviewer',
          email: 'john@example.com'
        }
      ]);
      
      // Mock performance metrics
      const mockPerformanceMetrics = {
        totalDocuments: 1000,
        verifiedDocuments: 800,
        rejectedDocuments: 150,
        verificationRate: 80.0,
        rejectionRate: 15.0,
        averageProcessingTime: 2.7
      };
      
      jest.doMock('../../../src/controllers/metrics/kyc.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/kyc.controller.js');
        return {
          ...originalModule,
          getKYCPerformanceMetrics: jest.fn().mockResolvedValue(mockPerformanceMetrics)
        };
      });

      const response = await request(app)
        .get('/api/metrics/kyc/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalDocuments).toBe(1000);
      expect(response.body.data.verifiedDocuments).toBe(800);
      expect(response.body.data.rejectedDocuments).toBe(150);
      expect(response.body.data.verificationRate).toBe(80.0);
      expect(response.body.data.rejectionRate).toBe(15.0);
      expect(response.body.data.averageProcessingTime).toBe(2.7);
      
      // Verify processing time distribution
      expect(response.body.data.processingTimeDistribution).toHaveLength(5);
      expect(response.body.data.processingTimeDistribution[0].range).toBe('0-1 days');
      expect(response.body.data.processingTimeDistribution[0].count).toBe(500);
      
      // Verify score distribution
      expect(response.body.data.scoreDistribution).toHaveLength(5);
      expect(response.body.data.scoreDistribution[0].range).toBe('70-79');
      expect(response.body.data.scoreDistribution[0].count).toBe(50);
      
      // Verify reviewer performance
      expect(response.body.data.reviewerPerformance).toHaveLength(2);
      expect(response.body.data.reviewerPerformance[0].reviewer.name).toBe('Jane Reviewer');
      expect(response.body.data.reviewerPerformance[0].totalReviewed).toBe(200);
      expect(response.body.data.reviewerPerformance[0].verified).toBe(180);
      expect(response.body.data.reviewerPerformance[0].rejected).toBe(20);
      expect(response.body.data.reviewerPerformance[0].approvalRate).toBe(90.0);
      expect(response.body.data.reviewerPerformance[0].avgProcessingTime).toBe(2.5);
      expect(response.body.data.reviewerPerformance[0].avgScore).toBe(88.0);
    });

    it('should handle empty performance data', async () => {
      KYCDocument.countDocuments.mockResolvedValue(0);
      KYCDocument.countDocuments.mockResolvedValueOnce(0);
      KYCDocument.countDocuments.mockResolvedValueOnce(0);
      
      KYCDocument.aggregate.mockResolvedValueOnce([]); // Processing time
      KYCDocument.aggregate.mockResolvedValueOnce([]); // Score distribution
      KYCDocument.aggregate.mockResolvedValueOnce([]); // Reviewer performance
      KYCDocument.populate.mockResolvedValue([]); // Reviewer population
      
      jest.doMock('../../../src/controllers/metrics/kyc.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/kyc.controller.js');
        return {
          ...originalModule,
          getKYCPerformanceMetrics: jest.fn().mockResolvedValue({
            totalDocuments: 0,
            verifiedDocuments: 0,
            rejectedDocuments: 0,
            verificationRate: 0,
            rejectionRate: 0,
            averageProcessingTime: 0
          })
        };
      });

      const response = await request(app)
        .get('/api/metrics/kyc/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verificationRate).toBe(0);
      expect(response.body.data.rejectionRate).toBe(0);
      expect(response.body.data.averageProcessingTime).toBe(0);
      expect(response.body.data.processingTimeDistribution).toHaveLength(0);
      expect(response.body.data.scoreDistribution).toHaveLength(0);
      expect(response.body.data.reviewerPerformance).toHaveLength(0);
    });

    it('should handle database errors in performance metrics', async () => {
      KYCDocument.countDocuments.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/metrics/kyc/performance')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('getKYCAnalytics', () => {
    beforeEach(async () => {
      testData = await createTestData();
    });

    it('should return KYC analytics successfully', async () => {
      // Mock document type success rates
      KYCDocument.aggregate.mockResolvedValueOnce([
        { _id: 'government_id', total: 400, verified: 360, rejected: 40 },
        { _id: 'utility_bill', total: 300, verified: 270, rejected: 30 },
        { _id: 'bank_statement', total: 200, verified: 180, rejected: 20 },
        { _id: 'proof_of_income', total: 80, verified: 70, rejected: 10 },
        { _id: 'property_document', total: 20, verified: 15, rejected: 5 }
      ]);
      
      // Mock AI insights
      KYCDocument.aggregate.mockResolvedValueOnce([
        { _id: ['Low quality'], count: 50, avgAuthenticityScore: 75 },
        { _id: ['Suspicious pattern'], count: 20, avgAuthenticityScore: 65 },
        { _id: ['Manual review required'], count: 30, avgAuthenticityScore: 80 }
      ]);
      
      // Mock expiry analysis
      KYCDocument.aggregate.mockResolvedValueOnce([
        { _id: -30, count: 10 }, // Expired
        { _id: 30, count: 50 },  // Expiring soon
        { _id: 90, count: 200 }, // Expiring in 3 months
        { _id: 180, count: 300 }, // Expiring in 6 months
        { _id: 365, count: 400 }  // Expiring in 1 year
      ]);
      
      // Mock quality trends
      KYCDocument.aggregate.mockResolvedValueOnce([
        { _id: { year: 2023, month: 1 }, avgScore: 85, count: 100, highConfidence: 80 },
        { _id: { year: 2023, month: 2 }, avgScore: 87, count: 120, highConfidence: 100 }
      ]);

      const response = await request(app)
        .get('/api/metrics/kyc/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.typeSuccessRates).toBeDefined();
      expect(response.body.data.aiInsights).toBeDefined();
      expect(response.body.data.expiryAnalysis).toBeDefined();
      expect(response.body.data.qualityTrends).toBeDefined();
      
      // Verify type success rates
      expect(response.body.data.typeSuccessRates).toHaveLength(5);
      expect(response.body.data.typeSuccessRates[0].documentType).toBe('government_id');
      expect(response.body.data.typeSuccessRates[0].total).toBe(400);
      expect(response.body.data.typeSuccessRates[0].verified).toBe(360);
      expect(response.body.data.typeSuccessRates[0].rejected).toBe(40);
      expect(response.body.data.typeSuccessRates[0].successRate).toBe(90.0);
      expect(response.body.data.typeSuccessRates[0].rejectionRate).toBe(10.0);
      
      // Verify AI insights
      expect(response.body.data.aiInsights).toHaveLength(3);
      expect(response.body.data.aiInsights[0].flags).toEqual(['Low quality']);
      expect(response.body.data.aiInsights[0].count).toBe(50);
      expect(response.body.data.aiInsights[0].avgAuthenticityScore).toBe(75.0);
      
      // Verify expiry analysis
      expect(response.body.data.expiryAnalysis).toHaveLength(5);
      expect(response.body.data.expiryAnalysis[0].range).toBe('Expired');
      expect(response.body.data.expiryAnalysis[0].count).toBe(10);
      expect(response.body.data.expiryAnalysis[1].range).toBe('Expiring Soon');
      expect(response.body.data.expiryAnalysis[1].count).toBe(50);
      
      // Verify quality trends
      expect(response.body.data.qualityTrends).toHaveLength(2);
      expect(response.body.data.qualityTrends[0].month).toBe('2023-01');
      expect(response.body.data.qualityTrends[0].avgScore).toBe(85.0);
      expect(response.body.data.qualityTrends[0].count).toBe(100);
      expect(response.body.data.qualityTrends[0].highConfidenceRate).toBe(80.0);
    });

    it('should handle empty analytics data', async () => {
      KYCDocument.aggregate.mockResolvedValueOnce([]); // Type success rates
      KYCDocument.aggregate.mockResolvedValueOnce([]); // AI insights
      KYCDocument.aggregate.mockResolvedValueOnce([]); // Expiry analysis
      KYCDocument.aggregate.mockResolvedValueOnce([]); // Quality trends

      const response = await request(app)
        .get('/api/metrics/kyc/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.typeSuccessRates).toHaveLength(0);
      expect(response.body.data.aiInsights).toHaveLength(0);
      expect(response.body.data.expiryAnalysis).toHaveLength(0);
      expect(response.body.data.qualityTrends).toHaveLength(0);
    });

    it('should handle database errors in analytics', async () => {
      KYCDocument.aggregate.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/metrics/kyc/analytics')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent requests', async () => {
      // Mock successful responses
      KYCDocument.countDocuments.mockResolvedValue(1000);
      KYCDocument.countDocuments.mockResolvedValueOnce(800);
      KYCDocument.countDocuments.mockResolvedValueOnce(150);
      KYCDocument.countDocuments.mockResolvedValueOnce(30);
      KYCDocument.countDocuments.mockResolvedValueOnce(20);
      
      KYCDocument.aggregate.mockResolvedValueOnce([]);
      KYCDocument.aggregate.mockResolvedValueOnce([]);
      
      // Mock helper functions
      jest.doMock('../../../src/controllers/metrics/kyc.controller.js', () => {
        const originalModule = jest.requireActual('../../../src/controllers/metrics/kyc.controller.js');
        return {
          ...originalModule,
          getProcessingTimeStats: jest.fn().mockResolvedValue({
            average: 2.5,
            minimum: 0.5,
            maximum: 7.0
          }),
          getVerificationScoreStats: jest.fn().mockResolvedValue({
            average: 85.5,
            minimum: 60.0,
            maximum: 98.0
          }),
          getKYCPerformanceMetrics: jest.fn().mockResolvedValue({
            totalDocuments: 1000,
            verifiedDocuments: 800,
            rejectedDocuments: 30,
            verificationRate: 80.0,
            rejectionRate: 3.0,
            averageProcessingTime: 2.5
          }),
          getKYCTrends: jest.fn().mockResolvedValue({
            dailyUploads: [],
            monthlyVerification: []
          })
        };
      });

      // Make multiple concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app).get('/api/metrics/kyc')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle malformed query parameters', async () => {
      const response = await request(app)
        .get('/api/metrics/kyc?startDate=invalid-date')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle very large pagination values', async () => {
      const response = await request(app)
        .get('/api/metrics/kyc/list?page=1&limit=1000')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});