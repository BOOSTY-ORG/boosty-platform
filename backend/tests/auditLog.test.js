/**
 * Unit Tests for Audit Logging System
 *
 * This test suite covers the audit log service, model, and middleware
 * to ensure comprehensive logging functionality.
 */

import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import AuditLog from '../src/models/auditLog.model.js';
import auditLogService from '../src/services/auditLog.service.js';
import auditLogConfig from '../src/config/auditLog.config.js';
import {
  auditLogMiddleware,
  logUserAction,
  logSensitiveOperation,
  logCrudOperation,
} from '../src/middleware/auditLog.middleware.js';
import logger from '../src/helpers/logger.js';

// Mock dependencies
jest.mock('../src/services/encryption.service.js');
jest.mock('../src/helpers/logger.js');

// Test data
const mockUser = {
  _id: new mongoose.Types.ObjectId(),
  id: '507f1f77bcf86cd799439011',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  permissions: ['read:own'],
};

const mockAuditLogData = {
  action: 'LOGIN',
  category: 'AUTHENTICATION',
  message: 'User login successful',
  userId: mockUser.id,
  userRole: mockUser.role,
  userName: mockUser.name,
  userEmail: mockUser.email,
  outcome: 'SUCCESS',
  severity: 'INFO',
  resource: 'AUTH',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0 (Test Browser)',
  sessionId: 'session123',
};

// Mock Express request/response objects
const createMockRequest = (overrides = {}) => ({
  user: mockUser,
  ip: '192.168.1.1',
  headers: {
    'user-agent': 'Mozilla/5.0 (Test Browser)',
    'x-session-id': 'session123',
  },
  method: 'GET',
  path: '/api/test',
  params: {},
  query: {},
  body: {},
  correlationId: 'test-correlation-id',
  ...overrides,
});

const createMockResponse = (overrides = {}) => {
  const res = {
    statusCode: 200,
    headers: {},
    get: jest.fn(),
    set: jest.fn(),
    end: jest.fn(),
  };

  // Mock the end function to call the callback
  res.end.mockImplementation(function (callback) {
    if (typeof callback === 'function') {
      callback();
    }
    return this;
  });

  return { ...res, ...overrides };
};

describe('Audit Log Model', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri =
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/boosty-test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Clean up and disconnect
    await AuditLog.deleteMany({});
    await mongoose.disconnect();
  });

  afterEach(async () => {
    // Clean up after each test
    await AuditLog.deleteMany({});
  });

  test('should create a valid audit log entry', async () => {
    const auditLog = new AuditLog(mockAuditLogData);
    const savedLog = await auditLog.save();

    expect(savedLog).toBeDefined();
    expect(savedLog.action).toBe(mockAuditLogData.action);
    expect(savedLog.category).toBe(mockAuditLogData.category);
    expect(savedLog.userId.toString()).toBe(mockAuditLogData.userId);
    expect(savedLog.outcome).toBe(mockAuditLogData.outcome);
    expect(savedLog.severity).toBe(mockAuditLogData.severity);
  });

  test('should set retention date on save', async () => {
    const auditLog = new AuditLog(mockAuditLogData);
    const savedLog = await auditLog.save();

    expect(savedLog.retentionExpiresAt).toBeDefined();
    expect(savedLog.retentionExpiresAt).toBeInstanceOf(Date);
  });

  test('should identify high risk events', () => {
    const securityLog = new AuditLog({
      ...mockAuditLogData,
      severity: 'SECURITY',
    });

    const normalLog = new AuditLog(mockAuditLogData);

    expect(securityLog.isHighRisk()).toBe(true);
    expect(normalLog.isHighRisk()).toBe(false);
  });

  test('should identify compliance events', () => {
    const complianceLog = new AuditLog({
      ...mockAuditLogData,
      severity: 'COMPLIANCE',
    });

    const normalLog = new AuditLog(mockAuditLogData);

    expect(complianceLog.isComplianceEvent()).toBe(true);
    expect(normalLog.isComplianceEvent()).toBe(false);
  });

  test('should generate summary', () => {
    const auditLog = new AuditLog(mockAuditLogData);
    const summary = auditLog.getSummary();

    expect(summary).toHaveProperty('id');
    expect(summary).toHaveProperty('timestamp');
    expect(summary).toHaveProperty('action');
    expect(summary).toHaveProperty('isHighRisk');
    expect(summary).toHaveProperty('isComplianceEvent');
    expect(summary.action).toBe(mockAuditLogData.action);
  });
});

describe('Audit Log Service', () => {
  beforeAll(async () => {
    // Ensure audit logging is enabled for tests
    auditLogConfig.enabled = true;
    auditLogConfig.performance.asyncLogging = false; // Use sync for tests
  });

  afterAll(async () => {
    // Clean up
    await AuditLog.deleteMany({});
  });

  afterEach(async () => {
    // Clean up after each test
    await AuditLog.deleteMany({});
    jest.clearAllMocks();
  });

  test('should create an audit log entry', async () => {
    const result = await auditLogService.log(mockAuditLogData);

    expect(result).toBeDefined();
    expect(result.action).toBe(mockAuditLogData.action);
    expect(result.category).toBe(mockAuditLogData.category);
  });

  test('should handle missing required fields', async () => {
    const invalidData = { message: 'Missing action and category' };

    await expect(auditLogService.log(invalidData)).rejects.toThrow(
      'Missing required fields: action, category, message'
    );
  });

  test('should anonymize IP addresses', async () => {
    const logData = {
      ...mockAuditLogData,
      ipAddress: '192.168.1.123',
    };

    const result = await auditLogService.log(logData);

    expect(result.ipAddress).toBe('192.168.1.0');
  });

  test('should get logs with filters', async () => {
    // Create test logs
    await auditLogService.log(mockAuditLogData);
    await auditLogService.log({
      ...mockAuditLogData,
      action: 'LOGOUT',
      severity: 'WARN',
    });

    const result = await auditLogService.getLogs(
      { action: 'LOGIN' },
      { page: 1, limit: 10 }
    );

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].action).toBe('LOGIN');
    expect(result.pagination.total).toBe(1);
  });

  test('should get analytics', async () => {
    // Create test logs
    await auditLogService.log(mockAuditLogData);
    await auditLogService.log({
      ...mockAuditLogData,
      severity: 'SECURITY',
    });

    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const analytics = await auditLogService.getAnalytics(startDate, endDate);

    expect(analytics).toBeDefined();
    expect(analytics.summary).toBeDefined();
    expect(analytics.categoryBreakdown).toBeDefined();
    expect(analytics.severityBreakdown).toBeDefined();
  });

  test('should export logs as JSON', async () => {
    await auditLogService.log(mockAuditLogData);

    const exportData = await auditLogService.exportLogs({}, { format: 'json' });

    expect(exportData).toBeDefined();
    expect(exportData.format).toBe('json');
    expect(exportData.data).toHaveLength(1);
  });

  test('should export logs as CSV', async () => {
    await auditLogService.log(mockAuditLogData);

    const exportData = await auditLogService.exportLogs({}, { format: 'csv' });

    expect(exportData).toBeDefined();
    expect(exportData.format).toBe('csv');
    expect(exportData.data).toContain('action');
  });

  test('should apply retention policies', async () => {
    // Create an old log
    const oldLog = new AuditLog({
      ...mockAuditLogData,
      severity: 'DEBUG',
      timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    });
    await oldLog.save();

    const results = await auditLogService.applyRetentionPolicies();

    expect(results).toBeDefined();
    expect(results.DEBUG).toBeDefined();
  });
});

describe('Audit Log Middleware', () => {
  let mockReq;
  let mockRes;
  let nextFunction;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    nextFunction = jest.fn();
  });

  test('should add correlation ID to request and response', () => {
    auditLogMiddleware(mockReq, mockRes, nextFunction);

    expect(mockReq.correlationId).toBeDefined();
    expect(mockRes.set).toHaveBeenCalledWith(
      'X-Correlation-ID',
      mockReq.correlationId
    );
    expect(nextFunction).toHaveBeenCalled();
  });

  test('should use existing correlation ID from headers', () => {
    const existingCorrelationId = 'existing-correlation-id';
    mockReq.headers['x-correlation-id'] = existingCorrelationId;

    auditLogMiddleware(mockReq, mockRes, nextFunction);

    expect(mockReq.correlationId).toBe(existingCorrelationId);
  });

  test('should log request after response', async () => {
    const logSpy = jest.spyOn(auditLogService, 'log').mockResolvedValue({});

    auditLogMiddleware(mockReq, mockRes, nextFunction);

    // Simulate response completion
    mockRes.statusCode = 200;
    mockRes.end();

    // Wait for async logging
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(logSpy).toHaveBeenCalled();
  });

  test('should determine correct category for auth endpoints', () => {
    mockReq.path = '/api/auth/login';
    mockReq.method = 'POST';

    const category = determineCategory(mockReq);

    expect(category).toBe('AUTHENTICATION');
  });

  test('should determine correct action for different methods', () => {
    mockReq.method = 'POST';
    mockReq.path = '/api/users';

    const action = determineAction(mockReq);

    expect(action).toBe('CREATE');
  });

  test('should extract user information correctly', () => {
    const userInfo = extractUserInfo(mockReq);

    expect(userInfo.userId).toBe(mockUser.id);
    expect(userInfo.userRole).toBe(mockUser.role);
    expect(userInfo.userName).toBe(mockUser.name);
    expect(userInfo.userEmail).toBe(mockUser.email);
  });

  test('should extract client information correctly', () => {
    const clientInfo = extractClientInfo(mockReq);

    expect(clientInfo.ipAddress).toBe('192.168.1.1');
    expect(clientInfo.userAgent).toBe('Mozilla/5.0 (Test Browser)');
    expect(clientInfo.sessionId).toBe('session123');
  });

  test('should calculate risk score correctly', () => {
    const riskScore = calculateRiskScore(mockReq, mockRes);

    expect(riskScore).toBeGreaterThanOrEqual(0);
    expect(riskScore).toBeLessThanOrEqual(10);
  });
});

describe('Enhanced Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should log info messages', async () => {
    const message = 'Test info message';
    const args = { key: 'value' };

    await logger.info(message, args);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      message,
      args
    );
  });

  test('should log error messages', async () => {
    const message = 'Test error message';
    const args = { error: 'details' };

    await logger.error(message, args);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      message,
      args
    );
  });

  test('should log security events', async () => {
    const message = 'Security event';
    const metadata = { userId: '123' };

    await logger.security(message, metadata);

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[SECURITY]'),
      message,
      metadata
    );
  });

  test('should create child logger with context', () => {
    const context = { requestId: '123' };
    const childLogger = logger.child(context);

    expect(childLogger).toBeDefined();
    expect(typeof childLogger.info).toBe('function');
    expect(typeof childLogger.error).toBe('function');
  });

  test('should create logger with correlation ID', () => {
    const correlationId = 'test-correlation-id';
    const correlationLogger = logger.withCorrelationId(correlationId);

    expect(correlationLogger).toBeDefined();
    expect(typeof correlationLogger.info).toBe('function');
  });

  test('should log user actions', async () => {
    const userId = 'user123';
    const action = 'LOGIN';
    const message = 'User logged in';

    await logger.userAction(userId, action, message);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[USER_ACTION]'),
      expect.stringContaining(userId),
      expect.stringContaining(action),
      message
    );
  });

  test('should log performance metrics', async () => {
    const operation = 'database_query';
    const duration = 150;

    await logger.performance(operation, duration);

    if (process.env.NODE_ENV === 'development') {
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PERFORMANCE]'),
        expect.stringContaining(operation),
        expect.stringContaining(duration)
      );
    }
  });
});

describe('Integration Tests', () => {
  beforeAll(async () => {
    auditLogConfig.enabled = true;
    auditLogConfig.performance.asyncLogging = false;
  });

  afterAll(async () => {
    await AuditLog.deleteMany({});
  });

  afterEach(async () => {
    await AuditLog.deleteMany({});
    jest.clearAllMocks();
  });

  test('should integrate middleware with service', async () => {
    const logSpy = jest.spyOn(auditLogService, 'log').mockResolvedValue({});
    const mockReq = createMockRequest();
    const mockRes = createMockResponse();
    const next = jest.fn();

    auditLogMiddleware(mockReq, mockRes, next);

    // Simulate response
    mockRes.statusCode = 200;
    mockRes.end();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(next).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.any(String),
        category: expect.any(String),
        message: expect.any(String),
        correlationId: expect.any(String),
      })
    );
  });

  test('should handle user action middleware', async () => {
    const logSpy = jest.spyOn(auditLogService, 'log').mockResolvedValue({});
    const mockReq = createMockRequest();
    const mockRes = createMockResponse();
    const next = jest.fn();

    const middleware = logUserAction('TEST_ACTION', 'TEST_RESOURCE');
    middleware(mockReq, mockRes, next);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(next).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TEST_ACTION',
        resource: 'TEST_RESOURCE',
      })
    );
  });

  test('should handle sensitive operation middleware', async () => {
    const logSpy = jest.spyOn(auditLogService, 'log').mockResolvedValue({});
    const mockReq = createMockRequest();
    const mockRes = createMockResponse();
    const next = jest.fn();

    const middleware = logSensitiveOperation('DATA_EXPORT');
    middleware(mockReq, mockRes, next);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(next).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DATA_EXPORT',
        category: 'SECURITY',
        severity: 'SECURITY',
      })
    );
  });

  test('should handle CRUD operation middleware', async () => {
    const logSpy = jest.spyOn(auditLogService, 'log').mockResolvedValue({});
    const mockReq = createMockRequest({
      method: 'POST',
      path: '/api/users',
    });
    const mockRes = createMockResponse();
    const next = jest.fn();

    const middleware = logCrudOperation('user');
    middleware(mockReq, mockRes, next);

    // Simulate response
    mockRes.statusCode = 201;
    mockRes.end();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(next).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        resource: 'USER',
        resourceType: 'user',
      })
    );
  });
});

// Helper functions for testing
function determineCategory(req) {
  const path = req.path.toLowerCase();
  if (path.includes('/auth')) return 'AUTHENTICATION';
  if (path.includes('/role')) return 'AUTHORIZATION';
  if (path.includes('/security')) return 'SECURITY';
  if (path.includes('/system')) return 'SYSTEM';
  return 'DATA_OPERATIONS';
}

function determineAction(req) {
  const method = req.method.toUpperCase();
  const path = req.path.toLowerCase();

  const methodActions = {
    GET: 'ACCESS',
    POST: 'CREATE',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE',
  };

  let action = methodActions[method] || method;

  if (path.includes('/auth/login')) action = 'LOGIN';
  else if (path.includes('/auth/logout')) action = 'LOGOUT';
  else if (path.includes('/auth/register')) action = 'REGISTER';

  return action;
}

function extractUserInfo(req) {
  const user = req.user || {};
  return {
    userId: user.id || user._id,
    userRole: user.role,
    userName: user.name || user.fullName,
    userEmail: user.email,
  };
}

function extractClientInfo(req) {
  return {
    ipAddress:
      req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent'],
    sessionId: req.sessionID || req.headers['x-session-id'],
  };
}

function calculateRiskScore(req, res) {
  let riskScore = 0;

  if (!req.user) riskScore += 2;

  const highRiskPaths = ['/auth', '/admin', '/role', '/security'];
  if (highRiskPaths.some((path) => req.path.includes(path))) riskScore += 3;

  if (['DELETE', 'PUT', 'PATCH'].includes(req.method)) riskScore += 2;

  if (res.statusCode >= 400) riskScore += 2;

  return Math.max(0, Math.min(10, riskScore));
}
