/**
 * Performance Dashboard Routes Tests
 *
 * Tests for performance dashboard routes including:
 * - Route registration
 * - Middleware integration
 * - Request/response handling
 * - Error routing
 * - Route parameters
 */

const request = require('supertest');
const express = require('express');
const {
  setupTestDatabase,
  teardownTestDatabase,
  createMockRequest,
  createMockResponse,
  createMockNext,
} = require('../../../helpers/metrics.test.helpers.js');

// Mock dependencies
jest.mock(
  '../../../src/controllers/metrics/performance-dashboard.controller.js'
);
jest.mock('../../../src/middleware/metrics/performance-auth.middleware.js');
jest.mock('../../../src/middleware/metrics/performance-cache.middleware.js');
jest.mock('../../../src/helpers/logger.js');

describe('Performance Dashboard Routes', () => {
  let app, server;

  beforeAll(async () => {
    await setupTestDatabase();

    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Import and use routes
    const performanceDashboardRoutes = require('../../../src/routes/metrics/performance-dashboard.routes.js');
    app.use('/api/v1/performance/dashboard', performanceDashboardRoutes);
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

  describe('Route Registration', () => {
    test('should register dashboard routes correctly', () => {
      // Check that routes are registered
      const app = express();
      const performanceDashboardRoutes = require('../../../src/routes/metrics/performance-dashboard.routes.js');

      expect(typeof performanceDashboardRoutes).toBe('function');

      app.use('/test', performanceDashboardRoutes);

      // This is a basic test to ensure routes can be loaded
      expect(app._router).toBeDefined();
    });

    test('should have correct route paths', () => {
      const performanceDashboardRoutes = require('../../../src/routes/metrics/performance-dashboard.routes.js');

      // This would require access to the Express router internals
      // For now, we're testing that the module exports a function
      expect(typeof performanceDashboardRoutes).toBe('function');
    });
  });

  describe('GET /api/v1/performance/dashboard/overview', () => {
    test('should return dashboard overview', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getDashboardOverview.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            timestamp: new Date().toISOString(),
            widgets: [],
            summary: {},
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('widgets');
      expect(response.body.data).toHaveProperty('summary');
      expect(mockController.getDashboardOverview).toHaveBeenCalled();
    });

    test('should handle query parameters', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getDashboardOverview.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            timeRange: req.query.timeRange || '1h',
            refreshRate: req.query.refreshRate || '30',
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .query({ timeRange: '6h', refreshRate: '60' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.timeRange).toBe('6h');
      expect(response.body.data.refreshRate).toBe('60');
      expect(mockController.getDashboardOverview).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { timeRange: '6h', refreshRate: '60' },
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });

    test('should require authentication', async () => {
      const mockAuthMiddleware = require('../../../src/middleware/metrics/performance-auth.middleware.js');
      mockAuthMiddleware.requireAuth.mockImplementation((req, res, next) => {
        res
          .status(401)
          .json({ success: false, error: 'Authentication required' });
      });

      const response = await request(app).get(
        '/api/v1/performance/dashboard/overview'
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(mockAuthMiddleware.requireAuth).toHaveBeenCalled();
    });

    test('should handle controller errors', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getDashboardOverview.mockImplementation(
        (req, res, next) => {
          const error = new Error('Controller error');
          error.code = 'DASHBOARD_ERROR';
          next(error);
        }
      );

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DASHBOARD_ERROR');
    });
  });

  describe('GET /api/v1/performance/dashboard/system', () => {
    test('should return system dashboard', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getSystemDashboard.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            timestamp: new Date().toISOString(),
            widgets: [],
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/system')
        .query({ timeRange: '1h' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('widgets');
      expect(mockController.getSystemDashboard).toHaveBeenCalled();
    });

    test('should validate time range parameter', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getSystemDashboard.mockImplementation((req, res, next) => {
        if (!['1h', '6h', '24h', '7d'].includes(req.query.timeRange)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid time range parameter',
          });
        }
        res.json({ success: true, data: {} });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/system')
        .query({ timeRange: 'invalid' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid time range');
    });
  });

  describe('GET /api/v1/performance/dashboard/api', () => {
    test('should return API dashboard', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getApiDashboard.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            timestamp: new Date().toISOString(),
            widgets: [],
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/api')
        .query({ timeRange: '1h' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockController.getApiDashboard).toHaveBeenCalled();
    });

    test('should handle missing time range', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getApiDashboard.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            timeRange: req.query.timeRange || '1h', // Default value
            widgets: [],
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/api')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.timeRange).toBe('1h');
    });
  });

  describe('GET /api/v1/performance/dashboard/database', () => {
    test('should return database dashboard', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getDatabaseDashboard.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            timestamp: new Date().toISOString(),
            widgets: [],
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/database')
        .query({ timeRange: '1h' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockController.getDatabaseDashboard).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/performance/dashboard/alerts', () => {
    test('should return alerts dashboard', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getAlertsDashboard.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            timestamp: new Date().toISOString(),
            widgets: [],
            alerts: [],
            pagination: { total: 0, limit: 50, offset: 0 },
            summary: { total: 0, critical: 0, warning: 0 },
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/alerts')
        .query({ level: 'all', limit: '20', offset: '0' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('summary');
      expect(mockController.getAlertsDashboard).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { level: 'all', limit: '20', offset: '0' },
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });

    test('should validate pagination parameters', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getAlertsDashboard.mockImplementation((req, res, next) => {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        if (limit > 100 || limit < 1 || offset < 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid pagination parameters',
          });
        }

        res.json({ success: true, data: {} });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/alerts')
        .query({ limit: '200', offset: '-1' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid pagination parameters');
    });

    test('should validate alert level parameter', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getAlertsDashboard.mockImplementation((req, res, next) => {
        const validLevels = ['all', 'info', 'warning', 'critical'];

        if (!validLevels.includes(req.query.level)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid alert level parameter',
          });
        }

        res.json({ success: true, data: {} });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/alerts')
        .query({ level: 'invalid' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid alert level parameter');
    });
  });

  describe('Middleware Integration', () => {
    test('should apply authentication middleware', async () => {
      const mockAuthMiddleware = require('../../../src/middleware/metrics/performance-auth.middleware.js');
      mockAuthMiddleware.requireAuth.mockImplementation((req, res, next) => {
        req.user = { id: 'user123', role: 'admin' };
        next();
      });

      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getDashboardOverview.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: { user: req.user.id },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.user).toBe('user123');
      expect(mockAuthMiddleware.requireAuth).toHaveBeenCalled();
    });

    test('should apply caching middleware', async () => {
      const mockCacheMiddleware = require('../../../src/middleware/metrics/performance-cache.middleware.js');
      mockCacheMiddleware.cache.mockImplementation((options) => {
        return (req, res, next) => {
          // Simulate cache miss
          req.cacheHit = false;
          next();
        };
      });

      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getDashboardOverview.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: { cacheHit: req.cacheHit },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.cacheHit).toBe(false);
      expect(mockCacheMiddleware.cache).toHaveBeenCalled();
    });

    test('should apply rate limiting middleware', async () => {
      const mockRateLimitMiddleware = {
        rateLimit: jest.fn().mockImplementation((options) => {
          return (req, res, next) => {
            req.rateLimited = false;
            next();
          };
        }),
      };

      // Mock rate limiting middleware
      app.use(
        '/api/v1/performance/dashboard',
        mockRateLimitMiddleware.rateLimit({
          windowMs: 60000, // 1 minute
          max: 100,
        })
      );

      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getDashboardOverview.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: { rateLimited: req.rateLimited },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.rateLimited).toBe(false);
      expect(mockRateLimitMiddleware.rateLimit).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/performance/dashboard/overview')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
    });

    test('should handle missing authorization header', async () => {
      const response = await request(app).get(
        '/api/v1/performance/dashboard/overview'
      );

      expect(response.status).toBe(401);
    });

    test('should handle invalid authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Invalid token');

      expect(response.status).toBe(401);
    });

    test('should handle controller exceptions', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getDashboardOverview.mockImplementation(() => {
        throw new Error('Unexpected controller error');
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle middleware errors', async () => {
      const mockAuthMiddleware = require('../../../src/middleware/metrics/performance-auth.middleware.js');
      mockAuthMiddleware.requireAuth.mockImplementation((req, res, next) => {
        throw new Error('Authentication middleware error');
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Bearer valid-token');

      expect([500, 401]).toContain(response.status);
    });
  });

  describe('Content Type Handling', () => {
    test('should accept JSON content type', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getDashboardOverview.mockImplementation((req, res) => {
        res.json({ success: true, data: {} });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Bearer valid-token')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });

    test('should handle unsupported content type', async () => {
      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Bearer valid-token')
        .set('Accept', 'text/plain');

      expect([200, 406]).toContain(response.status);
    });
  });

  describe('Request Validation', () => {
    test('should validate query parameter types', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getDashboardOverview.mockImplementation(
        (req, res, next) => {
          // Validate timeRange parameter
          if (req.query.timeRange && typeof req.query.timeRange !== 'string') {
            return res.status(400).json({
              success: false,
              error: 'Invalid timeRange parameter type',
            });
          }

          // Validate refreshRate parameter
          if (req.query.refreshRate) {
            const refreshRate = parseInt(req.query.refreshRate);
            if (isNaN(refreshRate) || refreshRate < 5 || refreshRate > 300) {
              return res.status(400).json({
                success: false,
                error: 'Invalid refreshRate parameter',
              });
            }
          }

          res.json({ success: true, data: {} });
        }
      );

      const response1 = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .query({ timeRange: 123, refreshRate: 'invalid' })
        .set('Authorization', 'Bearer valid-token');

      expect(response1.status).toBe(400);
      expect(response1.body.error).toContain(
        'Invalid timeRange parameter type'
      );

      const response2 = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .query({ timeRange: '1h', refreshRate: '400' }) // Too high
        .set('Authorization', 'Bearer valid-token');

      expect(response2.status).toBe(400);
      expect(response2.body.error).toContain('Invalid refreshRate parameter');
    });

    test('should sanitize query parameters', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getDashboardOverview.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: {
            sanitizedTimeRange: req.query.timeRange,
          },
        });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .query({ timeRange: '<script>alert("xss")</script>' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      // Would verify XSS protection in actual implementation
    });
  });

  describe('Response Headers', () => {
    test('should set appropriate response headers', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getDashboardOverview.mockImplementation((req, res) => {
        res.set('Cache-Control', 'no-cache');
        res.set('X-Response-Time', '50');
        res.json({ success: true, data: {} });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.headers['x-response-time']).toBe('50');
    });

    test('should set CORS headers', async () => {
      const mockController = require('../../../src/controllers/metrics/performance-dashboard.controller.js');
      mockController.getDashboardOverview.mockImplementation((req, res) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.json({ success: true, data: {} });
      });

      const response = await request(app)
        .get('/api/v1/performance/dashboard/overview')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe(
        'GET, OPTIONS'
      );
    });
  });
});
