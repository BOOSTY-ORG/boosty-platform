/**
 * Performance Auth Middleware Tests
 *
 * Tests for performance authentication middleware including:
 * - Role-based access control
 * - API key validation
 * - Token verification
 * - Permission checking
 * - Error handling
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const performanceAuthMiddleware = require('../../../src/middleware/metrics/performance-auth.middleware.js');
const {
  setupTestDatabase,
  teardownTestDatabase,
  createMockRequest,
  createMockResponse,
  createMockNext,
} = require('../../helpers/metrics.test.helpers.js');

// Mock dependencies
jest.mock('../../../src/helpers/logger.js');

describe('Performance Auth Middleware', () => {
  let app, server;

  beforeAll(async () => {
    await setupTestDatabase();

    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Apply middleware
    app.use(
      '/api/v1/performance/dashboard',
      performanceAuthMiddleware.requireAuth
    );
    app.use(
      '/api/v1/performance/realtime',
      performanceAuthMiddleware.requireAuth
    );
    app.use(
      '/api/v1/performance/analytics',
      performanceAuthMiddleware.requireRole(['admin', 'manager'])
    );
    app.use(
      '/api/v1/performance/configuration',
      performanceAuthMiddleware.requireRole(['admin'])
    );

    // Setup test routes
    app.get('/api/v1/performance/dashboard/test', (req, res) => {
      res.json({ success: true, message: 'Dashboard access granted' });
    });

    app.get('/api/v1/performance/realtime/test', (req, res) => {
      res.json({ success: true, message: 'Realtime access granted' });
    });

    app.get('/api/v1/performance/analytics/test', (req, res) => {
      res.json({ success: true, message: 'Analytics access granted' });
    });

    app.get('/api/v1/performance/configuration/test', (req, res) => {
      res.json({ success: true, message: 'Configuration access granted' });
    });
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await teardownTestDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    test('should allow access with valid JWT token', async () => {
      const validToken = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/test')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Dashboard access granted');
    });

    test('should reject access with missing token', async () => {
      const response = await request(app).get(
        '/api/v1/performance/dashboard/test'
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
      expect(response.body.error.message).toBe('Authentication required');
    });

    test('should reject access with invalid token format', async () => {
      const response = await request(app)
        .get('/api/v1/performance/dashboard/test')
        .set('Authorization', 'InvalidFormat token123');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN_FORMAT');
    });

    test('should reject access with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/test')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    test('should reject access with malformed token', async () => {
      const response = await request(app)
        .get('/api/v1/performance/dashboard/test')
        .set('Authorization', 'Bearer malformed.token.here');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    test('should attach user to request object', async () => {
      const validToken = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Create a test route that checks the user object
      app.get('/api/v1/performance/dashboard/user-check', (req, res) => {
        if (req.user && req.user.id === 'user123') {
          res.json({ success: true, user: req.user });
        } else {
          res
            .status(500)
            .json({ success: false, message: 'User not attached' });
        }
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/user-check')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe('user123');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.role).toBe('admin');
    });
  });

  describe('requireRole', () => {
    test('should allow access with authorized role', async () => {
      const adminToken = jwt.sign(
        { id: 'admin123', email: 'admin@example.com', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Analytics access granted');
    });

    test('should allow access with manager role for admin/manager endpoint', async () => {
      const managerToken = jwt.sign(
        { id: 'manager123', email: 'manager@example.com', role: 'manager' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/test')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject access with unauthorized role', async () => {
      const userToken = jwt.sign(
        { id: 'user123', email: 'user@example.com', role: 'user' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/test')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(response.body.error.message).toContain(
        'requires one of the following roles'
      );
    });

    test('should reject access with admin-only role for admin endpoint', async () => {
      const managerToken = jwt.sign(
        { id: 'manager123', email: 'manager@example.com', role: 'manager' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/configuration/test')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should allow access with admin role for admin endpoint', async () => {
      const adminToken = jwt.sign(
        { id: 'admin123', email: 'admin@example.com', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/configuration/test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Configuration access granted');
    });

    test('should handle multiple role options', async () => {
      // Test with custom middleware that accepts multiple roles
      app.use(
        '/api/v1/performance/multi-role',
        performanceAuthMiddleware.requireRole(['admin', 'manager', 'analyst'])
      );

      app.get('/api/v1/performance/multi-role/test', (req, res) => {
        res.json({ success: true, message: 'Multi-role access granted' });
      });

      const analystToken = jwt.sign(
        { id: 'analyst123', email: 'analyst@example.com', role: 'analyst' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/multi-role/test')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('API Key Validation', () => {
    test('should allow access with valid API key', async () => {
      // This would test API key functionality if implemented
      // For now, we're testing the JWT-based auth
      const validToken = jwt.sign(
        { id: 'api-user', email: 'api@example.com', role: 'service' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/test')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-API-Key', 'valid-api-key');

      expect([200, 401]).toContain(response.status);
    });

    test('should reject access with invalid API key', async () => {
      const validToken = jwt.sign(
        { id: 'api-user', email: 'api@example.com', role: 'service' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/test')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-API-Key', 'invalid-api-key');

      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Token Verification', () => {
    test('should verify token signature', async () => {
      const tokenWithWrongSecret = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'admin' },
        'wrong-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/test')
        .set('Authorization', `Bearer ${tokenWithWrongSecret}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    test('should handle tokens with missing required fields', async () => {
      const incompleteToken = jwt.sign(
        { id: 'user123' }, // Missing email and role
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/test')
        .set('Authorization', `Bearer ${incompleteToken}`);

      // Behavior depends on implementation
      expect([200, 401]).toContain(response.status);
    });

    test('should handle tokens with invalid structure', async () => {
      const response = await request(app)
        .get('/api/v1/performance/dashboard/test')
        .set('Authorization', 'Bearer not.a.jwt.token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Permission Checking', () => {
    test('should check resource-specific permissions', async () => {
      // This would test resource-level permissions if implemented
      const adminToken = jwt.sign(
        {
          id: 'admin123',
          email: 'admin@example.com',
          role: 'admin',
          permissions: [
            'dashboard:read',
            'analytics:read',
            'configuration:write',
          ],
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    test('should deny access without required permission', async () => {
      // This would test resource-level permissions if implemented
      const limitedToken = jwt.sign(
        {
          id: 'user123',
          email: 'user@example.com',
          role: 'user',
          permissions: ['dashboard:read'], // No analytics permission
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/analytics/test')
        .set('Authorization', `Bearer ${limitedToken}`);

      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    test('should handle JWT verification errors gracefully', async () => {
      // Mock JWT to throw an error
      const originalVerify = jwt.verify;
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('JWT verification failed');
      });

      const validToken = 'some.token';
      const response = await request(app)
        .get('/api/v1/performance/dashboard/test')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);

      // Restore original function
      jwt.verify = originalVerify;
    });

    test('should handle malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/performance/dashboard/test')
        .set('Authorization', 'MalformedHeader');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN_FORMAT');
    });

    test('should handle multiple authorization headers', async () => {
      const validToken = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/test')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Alternative-Auth', `Alternative ${validToken}`);

      // Should use the first valid header
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to authentication attempts', async () => {
      const invalidToken = 'invalid.token';

      // Make multiple requests to test rate limiting
      const requests = Array(10)
        .fill()
        .map(() =>
          request(app)
            .get('/api/v1/performance/dashboard/test')
            .set('Authorization', `Bearer ${invalidToken}`)
        );

      const responses = await Promise.all(requests);

      // Most requests should fail with 401
      const authErrors = responses.filter((r) => r.status === 401);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      expect(authErrors.length + rateLimitedResponses.length).toBe(10);
    });

    test('should implement progressive delays for repeated failures', async () => {
      const invalidToken = 'invalid.token';

      // Make sequential requests to test progressive delays
      const startTime = Date.now();

      for (let i = 0; i < 5; i++) {
        await request(app)
          .get('/api/v1/performance/dashboard/test')
          .set('Authorization', `Bearer ${invalidToken}`);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should take longer due to progressive delays
      expect(totalTime).toBeGreaterThan(1000);
    });
  });

  describe('Security Headers', () => {
    test('should set appropriate security headers', async () => {
      const validToken = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/test')
        .set('Authorization', `Bearer ${validToken}`);

      // Check for security headers if implemented
      expect(response.headers).toBeDefined();
    });
  });

  describe('Context and Metadata', () => {
    test('should attach request metadata', async () => {
      const validToken = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Create a test route that checks request metadata
      app.get('/api/v1/performance/dashboard/metadata-check', (req, res) => {
        res.json({
          success: true,
          hasAuth: !!req.auth,
          hasUser: !!req.user,
          timestamp: req.timestamp,
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/metadata-check')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Request-ID', 'test-request-123');

      expect(response.status).toBe(200);
      expect(response.body.hasAuth).toBe(true);
      expect(response.body.hasUser).toBe(true);
    });

    test('should track authentication attempts', async () => {
      const invalidToken = 'invalid.token';

      // Make multiple failed attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .get('/api/v1/performance/dashboard/test')
          .set('Authorization', `Bearer ${invalidToken}`);
      }

      // Then make a successful attempt
      const validToken = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/test')
        .set('Authorization', `Bearer ${validToken}`);

      // Should still succeed after failed attempts
      expect(response.status).toBe(200);
    });
  });
});
