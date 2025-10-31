import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  formatSuccessResponse,
  formatErrorResponse,
  formatValidationError,
  formatValidationErrors,
  formatPaginatedResponse,
  formatMetricsResponse,
  formatAggregationResponse,
  formatFileResponse,
  formatStreamResponse,
  formatHealthResponse,
  formatCacheResponse,
  formatRateLimitResponse,
  formatBulkResponse,
  formatExportResponse,
  formatSearchResponse,
  formatAnalyticsResponse,
  formatReportResponse,
  formatNotificationResponse,
  setResponseHeaders,
  setCORSHeaders,
  formatError,
  handleControllerError
} from '../../../src/utils/metrics/responseFormatter.util.js';

describe('Response Formatter Utility', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      protocol: 'https',
      get: jest.fn().mockReturnValue('example.com'),
      originalUrl: '/api/test',
      query: { filter: 'active' },
      queryBuilder: {
        dateRange: {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31')
        },
        filters: {
          status: { $in: ['active', 'pending'] },
          'personalInfo.state': 'Lagos',
          investorType: { $in: ['individual', 'institutional'] },
          riskProfile: { $in: ['conservative', 'moderate'] },
          type: { $in: ['investment', 'repayment'] },
          paymentMethod: { $in: ['bank_transfer', 'card'] },
          'propertyDetails.propertyType': { $in: ['residential', 'commercial'] },
          kycStatus: { $in: ['verified', 'pending'] },
          documentType: { $in: ['government_id', 'utility_bill'] },
          verificationStatus: { $in: ['verified', 'pending'] }
        }
      }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('formatSuccessResponse', () => {
    it('should format success response', () => {
      const data = { users: 100, activeUsers: 80 };
      
      const result = formatSuccessResponse(data, mockReq);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta).toBeDefined();
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.requestId).toBeDefined();
      expect(result.meta.filters).toBeDefined();
      expect(result.meta.filters.dateRange).toBe('2023-01-01T00:00:00.000Z to 2023-01-31T00:00:00.000Z');
      expect(result.meta.filters.status).toEqual(['active', 'pending']);
      expect(result.meta.filters.region).toBe('Lagos');
      expect(result.meta.filters.investorType).toEqual(['individual', 'institutional']);
      expect(result.meta.filters.riskProfile).toEqual(['conservative', 'moderate']);
      expect(result.meta.filters.transactionType).toEqual(['investment', 'repayment']);
      expect(result.meta.filters.paymentMethod).toEqual(['bank_transfer', 'card']);
      expect(result.meta.filters.propertyType).toEqual(['residential', 'commercial']);
      expect(result.meta.filters.kycStatus).toEqual(['verified', 'pending']);
      expect(result.meta.filters.documentType).toEqual(['government_id', 'utility_bill']);
      expect(result.meta.filters.verificationStatus).toEqual(['verified', 'pending']);
    });

    it('should handle data with pagination property', () => {
      const data = {
        data: [{ id: 1, name: 'User 1' }],
        pagination: { page: 1, limit: 10, total: 100 }
      };
      
      const result = formatSuccessResponse(data, mockReq);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, name: 'User 1' }]);
      expect(result.meta.pagination).toEqual({ page: 1, limit: 10, total: 100 });
    });

    it('should handle additional meta', () => {
      const data = { users: 100 };
      const additionalMeta = { version: '1.0.0', cache: 'miss' };
      
      const result = formatSuccessResponse(data, mockReq, additionalMeta);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta.version).toBe('1.0.0');
      expect(result.meta.cache).toBe('miss');
    });

    it('should handle request without queryBuilder', () => {
      const data = { users: 100 };
      const reqWithoutQueryBuilder = { ...mockReq };
      delete reqWithoutQueryBuilder.queryBuilder;
      
      const result = formatSuccessResponse(data, reqWithoutQueryBuilder);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta.filters).toBeDefined();
      expect(result.meta.filters.dateRange).toBeUndefined();
    });
  });

  describe('formatErrorResponse', () => {
    it('should format error response', () => {
      const error = new Error('Test error');
      error.code = 'TEST_ERROR';
      
      const result = formatErrorResponse(error, mockReq);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('TEST_ERROR');
      expect(result.error.message).toBe('Test error');
      expect(result.meta).toBeDefined();
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.requestId).toBeDefined();
    });

    it('should handle error without code', () => {
      const error = new Error('Test error');
      
      const result = formatErrorResponse(error, mockReq);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.message).toBe('Test error');
    });

    it('should handle error with details', () => {
      const error = new Error('Test error');
      error.code = 'VALIDATION_ERROR';
      error.details = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' }
      ];
      
      const result = formatErrorResponse(error, mockReq);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Test error');
      expect(result.error.details).toEqual([
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' }
      ]);
    });

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        const error = new Error('Test error');
        error.stack = 'Error stack trace';
        
        const result = formatErrorResponse(error, mockReq);
        
        expect(result.success).toBe(false);
        expect(result.error.stack).toBe('Error stack trace');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should not include stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      try {
        const error = new Error('Test error');
        error.stack = 'Error stack trace';
        
        const result = formatErrorResponse(error, mockReq);
        
        expect(result.success).toBe(false);
        expect(result.error.stack).toBeUndefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('formatValidationError', () => {
    it('should format validation error', () => {
      const field = 'email';
      const message = 'Invalid email format';
      const value = 'invalid-email';
      
      const result = formatValidationError(field, message, value);
      
      expect(result.field).toBe('email');
      expect(result.message).toBe('Invalid email format');
      expect(result.value).toBe('invalid-email');
    });

    it('should handle validation error without value', () => {
      const field = 'password';
      const message = 'Password too short';
      
      const result = formatValidationError(field, message);
      
      expect(result.field).toBe('password');
      expect(result.message).toBe('Password too short');
      expect(result.value).toBeNull();
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors', () => {
      const errors = [
        { field: 'email', msg: 'Invalid email format', value: 'invalid-email' },
        { field: 'password', msg: 'Password too short', value: '123' }
      ];
      
      const result = formatValidationErrors(errors);
      
      expect(result).toHaveLength(2);
      expect(result[0].field).toBe('email');
      expect(result[0].message).toBe('Invalid email format');
      expect(result[0].value).toBe('invalid-email');
      expect(result[1].field).toBe('password');
      expect(result[1].message).toBe('Password too short');
      expect(result[1].value).toBe('123');
    });

    it('should handle errors with param property', () => {
      const errors = [
        { param: 'email', msg: 'Invalid email format', value: 'invalid-email' },
        { param: 'password', msg: 'Password too short', value: '123' }
      ];
      
      const result = formatValidationErrors(errors);
      
      expect(result).toHaveLength(2);
      expect(result[0].field).toBe('email');
      expect(result[0].message).toBe('Invalid email format');
      expect(result[0].value).toBe('invalid-email');
      expect(result[1].field).toBe('password');
      expect(result[1].message).toBe('Password too short');
      expect(result[1].value).toBe('123');
    });
  });

  describe('formatPaginatedResponse', () => {
    it('should format paginated response', () => {
      const data = [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }];
      const pagination = { page: 1, limit: 10, total: 100 };
      
      const result = formatPaginatedResponse(data, pagination, mockReq);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta.pagination).toEqual(pagination);
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.requestId).toBeDefined();
    });

    it('should handle additional meta', () => {
      const data = [{ id: 1, name: 'User 1' }];
      const pagination = { page: 1, limit: 10, total: 100 };
      const additionalMeta = { version: '1.0.0' };
      
      const result = formatPaginatedResponse(data, pagination, mockReq, additionalMeta);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta.pagination).toEqual(pagination);
      expect(result.meta.version).toBe('1.0.0');
    });
  });

  describe('formatMetricsResponse', () => {
    it('should format metrics response', () => {
      const metrics = { totalUsers: 100, activeUsers: 80 };
      
      const result = formatMetricsResponse(metrics, mockReq);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(metrics);
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.requestId).toBeDefined();
    });

    it('should handle additional meta', () => {
      const metrics = { totalUsers: 100 };
      const additionalMeta = { period: 'last_30_days' };
      
      const result = formatMetricsResponse(metrics, mockReq, additionalMeta);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(metrics);
      expect(result.meta.period).toBe('last_30_days');
    });
  });

  describe('formatAggregationResponse', () => {
    it('should format aggregation response', () => {
      const aggregations = [
        { _id: 'individual', count: 50 },
        { _id: 'institutional', count: 30 }
      ];
      
      const result = formatAggregationResponse(aggregations, mockReq);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(aggregations);
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.requestId).toBeDefined();
    });

    it('should handle additional meta', () => {
      const aggregations = [{ _id: 'individual', count: 50 }];
      const additionalMeta = { type: 'investor_type' };
      
      const result = formatAggregationResponse(aggregations, mockReq, additionalMeta);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(aggregations);
      expect(result.meta.type).toBe('investor_type');
    });
  });

  describe('formatFileResponse', () => {
    it('should format file response', () => {
      const fileInfo = {
        id: 'file123',
        name: 'test.pdf',
        size: 1024,
        type: 'application/pdf',
        url: 'https://example.com/files/test.pdf',
        createdAt: new Date('2023-01-01')
      };
      
      const result = formatFileResponse(fileInfo, mockReq);
      
      expect(result.success).toBe(true);
      expect(result.data.fileId).toBe('file123');
      expect(result.data.fileName).toBe('test.pdf');
      expect(result.data.fileSize).toBe(1024);
      expect(result.data.fileType).toBe('application/pdf');
      expect(result.data.downloadUrl).toBe('https://example.com/files/test.pdf');
      expect(result.data.createdAt).toBe(fileInfo.createdAt);
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.requestId).toBeDefined();
    });
  });

  describe('formatStreamResponse', () => {
    it('should format stream response', () => {
      const stream = { pipe: jest.fn() };
      const filename = 'test.csv';
      const contentType = 'text/csv';
      
      const result = formatStreamResponse(stream, filename, contentType);
      
      expect(result.headers['Content-Type']).toBe('text/csv');
      expect(result.headers['Content-Disposition']).toBe('attachment; filename="test.csv"');
      expect(result.headers['Cache-Control']).toBe('no-cache');
      expect(result.stream).toBe(stream);
    });

    it('should use default content type', () => {
      const stream = { pipe: jest.fn() };
      const filename = 'test.csv';
      
      const result = formatStreamResponse(stream, filename);
      
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Content-Disposition']).toBe('attachment; filename="test.csv"');
      expect(result.stream).toBe(stream);
    });
  });

  describe('formatHealthResponse', () => {
    it('should format health response', () => {
      const health = {
        status: 'healthy',
        services: {
          database: 'up',
          cache: 'up'
        },
        metrics: {
          uptime: 3600,
          memory: 0.5
        }
      };
      
      const result = formatHealthResponse(health);
      
      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.services).toEqual(health.services);
      expect(result.metrics).toEqual(health.metrics);
      expect(result.version).toBeDefined();
      expect(result.uptime).toBeDefined();
    });

    it('should use default version', () => {
      const originalEnv = process.env.APP_VERSION;
      delete process.env.APP_VERSION;
      
      try {
        const health = { status: 'healthy' };
        
        const result = formatHealthResponse(health);
        
        expect(result.version).toBe('1.0.0');
      } finally {
        if (originalEnv) {
          process.env.APP_VERSION = originalEnv;
        } else {
          delete process.env.APP_VERSION;
        }
      }
    });

    it('should use custom version', () => {
      process.env.APP_VERSION = '2.0.0';
      
      try {
        const health = { status: 'healthy' };
        
        const result = formatHealthResponse(health);
        
        expect(result.version).toBe('2.0.0');
      } finally {
        delete process.env.APP_VERSION;
      }
    });
  });

  describe('formatCacheResponse', () => {
    it('should format cache response', () => {
      const cacheData = {
        size: 1000,
        keys: ['key1', 'key2', 'key3'],
        hitRate: 0.8,
        missRate: 0.2
      };
      
      const result = formatCacheResponse(cacheData);
      
      expect(result.success).toBe(true);
      expect(result.data.size).toBe(1000);
      expect(result.data.keys).toEqual(['key1', 'key2', 'key3']);
      expect(result.data.hitRate).toBe(0.8);
      expect(result.data.missRate).toBe(0.2);
      expect(result.meta.timestamp).toBeDefined();
    });

    it('should handle missing hit rate', () => {
      const cacheData = {
        size: 1000,
        keys: ['key1', 'key2', 'key3']
      };
      
      const result = formatCacheResponse(cacheData);
      
      expect(result.success).toBe(true);
      expect(result.data.hitRate).toBe(0);
      expect(result.data.missRate).toBe(0);
    });
  });

  describe('formatRateLimitResponse', () => {
    it('should format rate limit response', () => {
      const rateLimitData = {
        totalKeys: 100,
        activeKeys: 80,
        totalRequests: 10000
      };
      
      const result = formatRateLimitResponse(rateLimitData);
      
      expect(result.success).toBe(true);
      expect(result.data.totalKeys).toBe(100);
      expect(result.data.activeKeys).toBe(80);
      expect(result.data.totalRequests).toBe(10000);
      expect(result.meta.timestamp).toBeDefined();
    });
  });

  describe('formatBulkResponse', () => {
    it('should format bulk response', () => {
      const results = [
        { success: true, id: 1 },
        { success: true, id: 2 },
        { success: false, id: 3, error: 'Invalid data' }
      ];
      const operation = 'update';
      
      const result = formatBulkResponse(results, mockReq, operation);
      
      expect(result.success).toBe(true);
      expect(result.data.operation).toBe('update');
      expect(result.data.total).toBe(3);
      expect(result.data.successful).toBe(2);
      expect(result.data.failed).toBe(1);
      expect(result.data.results).toEqual(results);
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.requestId).toBeDefined();
    });

    it('should use default operation', () => {
      const results = [
        { success: true, id: 1 },
        { success: false, id: 2, error: 'Invalid data' }
      ];
      
      const result = formatBulkResponse(results, mockReq);
      
      expect(result.success).toBe(true);
      expect(result.data.operation).toBe('update');
      expect(result.data.total).toBe(2);
      expect(result.data.successful).toBe(1);
      expect(result.data.failed).toBe(1);
    });
  });

  describe('formatExportResponse', () => {
    it('should format export response', () => {
      const exportData = {
        id: 'export123',
        url: 'https://example.com/exports/export123.csv',
        size: 2048,
        expiresAt: new Date('2023-02-01')
      };
      const format = 'csv';
      const filename = 'users.csv';
      
      const result = formatExportResponse(exportData, format, filename);
      
      expect(result.success).toBe(true);
      expect(result.data.exportId).toBe('export123');
      expect(result.data.filename).toBe('users.csv');
      expect(result.data.format).toBe('csv');
      expect(result.data.size).toBe(2048);
      expect(result.data.downloadUrl).toBe('https://example.com/exports/export123.csv');
      expect(result.data.expiresAt).toBe(exportData.expiresAt);
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.requestId).toBeDefined();
    });
  });

  describe('formatSearchResponse', () => {
    it('should format search response', () => {
      const results = [
        { id: 1, name: 'User 1', score: 0.9 },
        { id: 2, name: 'User 2', score: 0.8 }
      ];
      const searchQuery = 'john';
      const pagination = { page: 1, limit: 10, total: 2 };
      
      const result = formatSearchResponse(results, searchQuery, pagination, mockReq);
      
      expect(result.success).toBe(true);
      expect(result.data.query).toBe('john');
      expect(result.data.results).toEqual(results);
      expect(result.data.pagination).toEqual(pagination);
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.requestId).toBeDefined();
    });
  });

  describe('formatAnalyticsResponse', () => {
    it('should format analytics response', () => {
      const analytics = {
        modelVersion: 'v1.0.0',
        predictions: [
          { id: 1, prediction: 'high_risk', confidence: 0.8 }
        ]
      };
      const timeRange = { startDate: '2023-01-01', endDate: '2023-01-31' };
      
      const result = formatAnalyticsResponse(analytics, mockReq, timeRange);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(analytics);
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.requestId).toBeDefined();
      expect(result.meta.timeRange).toEqual(timeRange);
      expect(result.meta.modelVersion).toBe('v1.0.0');
    });

    it('should use default model version', () => {
      const analytics = { predictions: [] };
      const timeRange = { startDate: '2023-01-01', endDate: '2023-01-31' };
      
      const result = formatAnalyticsResponse(analytics, mockReq, timeRange);
      
      expect(result.success).toBe(true);
      expect(result.meta.modelVersion).toBe('v1.0.0');
    });
  });

  describe('formatReportResponse', () => {
    it('should format report response', () => {
      const report = {
        id: 'report123',
        type: 'financial',
        period: 'monthly',
        generatedAt: new Date('2023-01-01'),
        downloadUrl: 'https://example.com/reports/report123.pdf',
        size: 1024,
        format: 'pdf'
      };
      
      const result = formatReportResponse(report, mockReq);
      
      expect(result.success).toBe(true);
      expect(result.data.reportId).toBe('report123');
      expect(result.data.type).toBe('financial');
      expect(result.data.period).toBe('monthly');
      expect(result.data.generatedAt).toBe(report.generatedAt);
      expect(result.data.downloadUrl).toBe('https://example.com/reports/report123.pdf');
      expect(result.data.size).toBe(1024);
      expect(result.data.format).toBe('pdf');
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.requestId).toBeDefined();
    });
  });

  describe('formatNotificationResponse', () => {
    it('should format notification response', () => {
      const notification = {
        id: 'notif123',
        type: 'email',
        title: 'Monthly Report',
        message: 'Your monthly report is ready',
        recipients: ['user1@example.com', 'user2@example.com'],
        sentAt: new Date('2023-01-01'),
        status: 'sent'
      };
      
      const result = formatNotificationResponse(notification, mockReq);
      
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('notif123');
      expect(result.data.type).toBe('email');
      expect(result.data.title).toBe('Monthly Report');
      expect(result.data.message).toBe('Your monthly report is ready');
      expect(result.data.recipients).toEqual(['user1@example.com', 'user2@example.com']);
      expect(result.data.sentAt).toBe(notification.sentAt);
      expect(result.data.status).toBe('sent');
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.requestId).toBeDefined();
    });
  });

  describe('setResponseHeaders', () => {
    it('should set response headers', () => {
      const headers = {
        'X-Custom-Header': 'custom-value',
        'Cache-Control': 'max-age=3600'
      };
      
      setResponseHeaders(mockRes, headers);
      
      expect(mockRes.set).toHaveBeenCalledWith({
        'X-API-Version': '1.0.0',
        'X-Response-Time': expect.any(Number),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Custom-Header': 'custom-value',
        'Cache-Control': 'max-age=3600'
      });
    });

    it('should use default headers', () => {
      setResponseHeaders(mockRes);
      
      expect(mockRes.set).toHaveBeenCalledWith({
        'X-API-Version': '1.0.0',
        'X-Response-Time': expect.any(Number),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
    });
  });

  describe('setCORSHeaders', () => {
    it('should set CORS headers', () => {
      const origin = 'https://example.com';
      
      setCORSHeaders(mockRes, origin);
      
      expect(mockRes.set).toHaveBeenCalledWith({
        'Access-Control-Allow-Origin': 'https://example.com',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true'
      });
    });

    it('should use default origin', () => {
      setCORSHeaders(mockRes);
      
      expect(mockRes.set).toHaveBeenCalledWith({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true'
      });
    });
  });

  describe('formatError', () => {
    it('should format error', () => {
      const code = 'VALIDATION_ERROR';
      const message = 'Invalid input data';
      const details = [
        { field: 'email', message: 'Invalid email format' }
      ];
      
      const result = formatError(code, message, details);
      
      expect(result).toBeInstanceOf(Error);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.message).toBe('Invalid input data');
      expect(result.details).toEqual([
        { field: 'email', message: 'Invalid email format' }
      ]);
    });

    it('should handle error without details', () => {
      const code = 'INTERNAL_ERROR';
      const message = 'Server error';
      
      const result = formatError(code, message);
      
      expect(result).toBeInstanceOf(Error);
      expect(result.code).toBe('INTERNAL_ERROR');
      expect(result.message).toBe('Server error');
      expect(result.details).toBeUndefined();
    });
  });

  describe('handleControllerError', () => {
    it('should handle error with code', () => {
      const error = new Error('Test error');
      error.code = 'TEST_ERROR';
      
      handleControllerError(error, mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'TEST_ERROR',
            message: 'Test error'
          })
        })
      );
    });

    it('should handle validation error', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        email: { message: 'Invalid email format', path: 'email', value: 'invalid-email' },
        password: { message: 'Password too short', path: 'password', value: '123' }
      };
      
      handleControllerError(error, mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'email',
                message: 'Invalid email format',
                value: 'invalid-email'
              }),
              expect.objectContaining({
                field: 'password',
                message: 'Password too short',
                value: '123'
              })
            ])
          })
        })
      );
    });

    it('should handle cast error', () => {
      const error = new Error('Cast error');
      error.name = 'CastError';
      
      handleControllerError(error, mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_ID',
            message: 'Invalid ID format'
          })
        })
      );
    });

    it('should handle default error', () => {
      const error = new Error('Unknown error');
      
      handleControllerError(error, mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Unknown error'
          })
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle null data', () => {
      const result = formatSuccessResponse(null, mockReq);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.meta).toBeDefined();
    });

    it('should handle undefined data', () => {
      const result = formatSuccessResponse(undefined, mockReq);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.meta).toBeDefined();
    });

    it('should handle empty data', () => {
      const result = formatSuccessResponse({}, mockReq);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(result.meta).toBeDefined();
    });

    it('should handle empty pagination', () => {
      const data = [{ id: 1, name: 'User 1' }];
      const pagination = {};
      
      const result = formatPaginatedResponse(data, pagination, mockReq);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta.pagination).toEqual({});
    });

    it('should handle request without query', () => {
      const reqWithoutQuery = { ...mockReq };
      delete reqWithoutQuery.query;
      
      const result = formatSuccessResponse({ users: 100 }, reqWithoutQuery);
      
      expect(result.success).toBe(true);
      expect(result.data.users).toBe(100);
      expect(result.meta.filters).toBeDefined();
      expect(result.meta.filters.dateRange).toBeUndefined();
    });

    it('should handle request without queryBuilder', () => {
      const reqWithoutQueryBuilder = { ...mockReq };
      delete reqWithoutQueryBuilder.queryBuilder;
      
      const result = formatSuccessResponse({ users: 100 }, reqWithoutQueryBuilder);
      
      expect(result.success).toBe(true);
      expect(result.data.users).toBe(100);
      expect(result.meta.filters).toBeDefined();
      expect(result.meta.filters.dateRange).toBeUndefined();
    });

    it('should handle response without status method', () => {
      const resWithoutStatus = { ...mockRes };
      delete resWithoutStatus.status;
      
      expect(() => {
        handleControllerError(new Error('Test error'), mockReq, resWithoutStatus);
      }).toThrow();
    });

    it('should handle response without json method', () => {
      const resWithoutJson = { ...mockRes };
      delete resWithoutJson.json;
      
      expect(() => {
        handleControllerError(new Error('Test error'), mockReq, resWithoutJson);
      }).toThrow();
    });
  });
});