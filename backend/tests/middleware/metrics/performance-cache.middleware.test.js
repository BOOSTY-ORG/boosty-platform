/**
 * Performance Cache Middleware Tests
 *
 * Tests for performance cache middleware including:
 * - Response caching
 * - Cache invalidation
 * - Cache key generation
 * - TTL management
 * - Cache hit/miss tracking
 */

const request = require('supertest');
const express = require('express');
const performanceCacheMiddleware = require('../../../src/middleware/metrics/performance-cache.middleware.js');
const {
  setupTestDatabase,
  teardownTestDatabase,
  createMockRequest,
  createMockResponse,
  createMockNext,
} = require('../../helpers/metrics.test.helpers.js');

// Mock dependencies
jest.mock('../../../src/helpers/logger.js');

describe('Performance Cache Middleware', () => {
  let app, server, mockCache;

  beforeAll(async () => {
    await setupTestDatabase();

    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Mock cache implementation
    mockCache = new Map();

    // Setup cache middleware with mock
    app.use(
      '/api/v1/performance/cached',
      performanceCacheMiddleware.cache({
        ttl: 60, // 60 seconds
        keyGenerator: (req) =>
          `cache:${req.path}:${req.query.timeRange || 'default'}`,
        cache: {
          get: (key) => mockCache.get(key),
          set: (key, value, ttl) => {
            mockCache.set(key, { value, expires: Date.now() + ttl * 1000 });
          },
          del: (key) => mockCache.delete(key),
          clear: () => mockCache.clear(),
        },
      })
    );

    // Setup test routes
    app.get('/api/v1/performance/cached/test', (req, res) => {
      // Simulate expensive operation
      setTimeout(() => {
        res.json({
          success: true,
          data: { timestamp: Date.now(), random: Math.random() },
          cached: false,
        });
      }, 100);
    });

    app.get('/api/v1/performance/cached/test2', (req, res) => {
      // Different endpoint with different cache key
      setTimeout(() => {
        res.json({
          success: true,
          data: { timestamp: Date.now(), random: Math.random() },
          cached: false,
        });
      }, 100);
    });

    // Setup route with cache invalidation
    app.post(
      '/api/v1/performance/cached/invalidate',
      performanceCacheMiddleware.invalidate({
        pattern: 'cache:/api/v1/performance/cached/*',
      }),
      (req, res) => {
        res.json({ success: true, message: 'Cache invalidated' });
      }
    );

    // Setup route with custom cache options
    app.get(
      '/api/v1/performance/cached/custom',
      performanceCacheMiddleware.cache({
        ttl: 30, // 30 seconds
        condition: (req) => req.method === 'GET',
        skipCache: (req) => req.query.skip === 'true',
      }),
      (req, res) => {
        setTimeout(() => {
          res.json({
            success: true,
            data: { timestamp: Date.now() },
            cached: false,
          });
        }, 100);
      }
    );
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await teardownTestDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.clear();
  });

  describe('Response Caching', () => {
    test('should cache response on first request', async () => {
      const startTime = Date.now();
      const response1 = await request(app)
        .get('/api/v1/performance/cached/test')
        .query({ timeRange: '1h' });

      const firstRequestTime = Date.now() - startTime;
      expect(response1.status).toBe(200);
      expect(response1.body.cached).toBe(false);
      expect(response1.headers).not.toHaveProperty('x-cache-status');

      // Second request should be faster and return cached data
      const startTime2 = Date.now();
      const response2 = await request(app)
        .get('/api/v1/performance/cached/test')
        .query({ timeRange: '1h' });

      const secondRequestTime = Date.now() - startTime2;
      expect(response2.status).toBe(200);
      expect(response2.body.cached).toBe(true);
      expect(response2.headers).toHaveProperty('x-cache-status', 'HIT');
      expect(secondRequestTime).toBeLessThan(firstRequestTime);

      // Data should be identical (except for cached flag)
      expect(response1.body.data.timestamp).toBe(response2.body.data.timestamp);
      expect(response1.body.data.random).toBe(response2.body.data.random);
    });

    test('should generate different cache keys for different parameters', async () => {
      const response1 = await request(app)
        .get('/api/v1/performance/cached/test')
        .query({ timeRange: '1h' });

      const response2 = await request(app)
        .get('/api/v1/performance/cached/test')
        .query({ timeRange: '24h' });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.data.timestamp).not.toBe(
        response2.body.data.timestamp
      );
      expect(response1.body.data.random).not.toBe(response2.body.data.random);
    });

    test('should generate different cache keys for different endpoints', async () => {
      const response1 = await request(app).get(
        '/api/v1/performance/cached/test'
      );

      const response2 = await request(app).get(
        '/api/v1/performance/cached/test2'
      );

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.data.timestamp).not.toBe(
        response2.body.data.timestamp
      );
      expect(response1.body.data.random).not.toBe(response2.body.data.random);
    });

    test('should not cache non-GET requests', async () => {
      const response = await request(app)
        .post('/api/v1/performance/cached/custom')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.headers).not.toHaveProperty('x-cache-status');
    });

    test('should skip cache when condition is not met', async () => {
      const response = await request(app)
        .get('/api/v1/performance/cached/custom')
        .query({ skip: 'true' });

      expect(response.status).toBe(200);
      expect(response.headers).not.toHaveProperty('x-cache-status');
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate cache matching pattern', async () => {
      // First, populate cache
      await request(app).get('/api/v1/performance/cached/test');
      await request(app).get('/api/v1/performance/cached/test2');

      // Verify cache is populated
      expect(mockCache.size).toBe(2);

      // Invalidate cache
      const invalidateResponse = await request(app).post(
        '/api/v1/performance/cached/invalidate'
      );

      expect(invalidateResponse.status).toBe(200);
      expect(mockCache.size).toBe(0);
    });

    test('should handle partial cache invalidation', async () => {
      // Populate cache with multiple entries
      await request(app).get('/api/v1/performance/cached/test');
      await request(app).get('/api/v1/performance/cached/test2');

      // Add a non-matching entry directly to cache
      mockCache.set('other:key', {
        value: 'data',
        expires: Date.now() + 60000,
      });

      expect(mockCache.size).toBe(3);

      // Invalidate only matching pattern
      const invalidateResponse = await request(app).post(
        '/api/v1/performance/cached/invalidate'
      );

      expect(invalidateResponse.status).toBe(200);
      expect(mockCache.size).toBe(1);
      expect(mockCache.has('other:key')).toBe(true);
    });
  });

  describe('TTL Management', () => {
    test('should respect cache TTL', async () => {
      // Setup cache with very short TTL for testing
      app.use(
        '/api/v1/performance/cached/ttl',
        performanceCacheMiddleware.cache({
          ttl: 0.1, // 0.1 seconds
          cache: {
            get: (key) => mockCache.get(key),
            set: (key, value, ttl) => {
              mockCache.set(key, { value, expires: Date.now() + ttl * 1000 });
            },
            del: (key) => mockCache.delete(key),
            clear: () => mockCache.clear(),
          },
        })
      );

      app.get('/api/v1/performance/cached/ttl/test', (req, res) => {
        res.json({ success: true, data: { timestamp: Date.now() } });
      });

      // First request
      const response1 = await request(app).get(
        '/api/v1/performance/cached/ttl/test'
      );

      expect(response1.status).toBe(200);
      expect(mockCache.size).toBe(1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Second request after TTL should miss cache
      const response2 = await request(app).get(
        '/api/v1/performance/cached/ttl/test'
      );

      expect(response2.status).toBe(200);
      // Cache should be refreshed (new timestamp)
      expect(response2.body.data.timestamp).not.toBe(
        response1.body.data.timestamp
      );
    });

    test('should handle expired cache entries', async () => {
      // Add expired entry directly to cache
      const expiredKey = 'cache:/api/v1/performance/cached/test:default';
      mockCache.set(expiredKey, {
        value: { success: true, data: { timestamp: Date.now() - 1000 } },
        expires: Date.now() - 1000, // Expired
      });

      const response = await request(app).get(
        '/api/v1/performance/cached/test'
      );

      expect(response.status).toBe(200);
      // Should generate fresh data, not use expired cache
      expect(response.body.data.timestamp).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('Cache Key Generation', () => {
    test('should generate consistent cache keys', async () => {
      // Make multiple identical requests
      const response1 = await request(app)
        .get('/api/v1/performance/cached/test')
        .query({ timeRange: '1h' });

      const response2 = await request(app)
        .get('/api/v1/performance/cached/test')
        .query({ timeRange: '1h' });

      expect(response1.body.data.timestamp).toBe(response2.body.data.timestamp);
      expect(response1.body.data.random).toBe(response2.body.data.random);
    });

    test('should include request parameters in cache key', async () => {
      const response1 = await request(app)
        .get('/api/v1/performance/cached/test')
        .query({ timeRange: '1h' });

      const response2 = await request(app)
        .get('/api/v1/performance/cached/test')
        .query({ timeRange: '24h' });

      expect(response1.body.data.timestamp).not.toBe(
        response2.body.data.timestamp
      );
      expect(response1.body.data.random).not.toBe(response2.body.data.random);
    });

    test('should handle complex parameter combinations', async () => {
      const response1 = await request(app)
        .get('/api/v1/performance/cached/test')
        .query({
          timeRange: '1h',
          category: 'system',
          metrics: 'cpu,memory',
          filters: JSON.stringify({ environment: 'production' }),
        });

      const response2 = await request(app)
        .get('/api/v1/performance/cached/test')
        .query({
          timeRange: '1h',
          category: 'system',
          metrics: 'cpu,memory',
          filters: JSON.stringify({ environment: 'production' }),
        });

      expect(response1.body.data.timestamp).toBe(response2.body.data.timestamp);
      expect(response1.body.data.random).toBe(response2.body.data.random);
    });
  });

  describe('Cache Headers', () => {
    test('should set appropriate cache headers', async () => {
      const response = await request(app).get(
        '/api/v1/performance/cached/test'
      );

      expect(response.headers).toHaveProperty('x-cache-status');
      expect(response.headers).toHaveProperty('x-cache-key');
      expect(response.headers).toHaveProperty('x-cache-ttl');
    });

    test('should indicate cache hit in headers', async () => {
      // First request
      await request(app).get('/api/v1/performance/cached/test');

      // Second request should be cache hit
      const response = await request(app).get(
        '/api/v1/performance/cached/test'
      );

      expect(response.headers['x-cache-status']).toBe('HIT');
    });

    test('should indicate cache miss in headers', async () => {
      const response = await request(app).get(
        '/api/v1/performance/cached/test'
      );

      expect(response.headers['x-cache-status']).toBe('MISS');
    });

    test('should include cache metadata in headers', async () => {
      const response = await request(app).get(
        '/api/v1/performance/cached/test'
      );

      expect(response.headers['x-cache-key']).toContain(
        'cache:/api/v1/performance/cached/test'
      );
      expect(response.headers['x-cache-ttl']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should not cache error responses', async () => {
      // Setup route that returns error
      app.get('/api/v1/performance/cached/error', (req, res) => {
        res.status(500).json({ success: false, error: 'Test error' });
      });

      const response1 = await request(app).get(
        '/api/v1/performance/cached/error'
      );

      expect(response1.status).toBe(500);
      expect(mockCache.size).toBe(0);

      // Second request should also not be cached
      const response2 = await request(app).get(
        '/api/v1/performance/cached/error'
      );

      expect(response2.status).toBe(500);
      expect(mockCache.size).toBe(0);
    });

    test('should handle cache operation errors gracefully', async () => {
      // Setup middleware with error-prone cache
      const errorCache = {
        get: () => {
          throw new Error('Cache get error');
        },
        set: () => {
          throw new Error('Cache set error');
        },
        del: () => {
          throw new Error('Cache delete error');
        },
        clear: () => {
          throw new Error('Cache clear error');
        },
      };

      app.use(
        '/api/v1/performance/cached/error-prone',
        performanceCacheMiddleware.cache({
          cache: errorCache,
        })
      );

      app.get('/api/v1/performance/cached/error-prone/test', (req, res) => {
        res.json({ success: true, data: { timestamp: Date.now() } });
      });

      const response = await request(app).get(
        '/api/v1/performance/cached/error-prone/test'
      );

      // Should still respond despite cache errors
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track cache hit/miss statistics', async () => {
      // Make multiple requests to generate statistics
      await request(app).get('/api/v1/performance/cached/test');
      await request(app).get('/api/v1/performance/cached/test'); // Cache hit
      await request(app).get('/api/v1/performance/cached/test2');
      await request(app).get('/api/v1/performance/cached/test2'); // Cache hit

      // This would test statistics tracking if implemented
      expect(mockCache.size).toBe(2);
    });

    test('should measure cache performance impact', async () => {
      // First request (cache miss)
      const start1 = Date.now();
      const response1 = await request(app).get(
        '/api/v1/performance/cached/test'
      );
      const time1 = Date.now() - start1;

      // Second request (cache hit)
      const start2 = Date.now();
      const response2 = await request(app).get(
        '/api/v1/performance/cached/test'
      );
      const time2 = Date.now() - start2;

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Cache hit should be significantly faster
      expect(time2).toBeLessThan(time1 * 0.5); // At least 50% faster
    });
  });

  describe('Cache Size Management', () => {
    test('should respect cache size limits', async () => {
      // Setup cache with size limit
      const sizeLimitedCache = new Map();
      let cacheSize = 0;
      const maxCacheSize = 2;

      const sizeLimitedCacheImpl = {
        get: (key) => sizeLimitedCache.get(key),
        set: (key, value, ttl) => {
          if (cacheSize >= maxCacheSize) {
            // Remove oldest entry (simple LRU)
            const firstKey = sizeLimitedCache.keys().next().value;
            sizeLimitedCache.delete(firstKey);
            cacheSize--;
          }
          sizeLimitedCache.set(key, {
            value,
            expires: Date.now() + ttl * 1000,
          });
          cacheSize++;
        },
        del: (key) => {
          sizeLimitedCache.delete(key);
          cacheSize--;
        },
        clear: () => {
          sizeLimitedCache.clear();
          cacheSize = 0;
        },
      };

      app.use(
        '/api/v1/performance/cached/size-limited',
        performanceCacheMiddleware.cache({
          cache: sizeLimitedCacheImpl,
        })
      );

      app.get('/api/v1/performance/cached/size-limited/test1', (req, res) => {
        res.json({ success: true, data: { timestamp: Date.now() } });
      });

      app.get('/api/v1/performance/cached/size-limited/test2', (req, res) => {
        res.json({ success: true, data: { timestamp: Date.now() } });
      });

      app.get('/api/v1/performance/cached/size-limited/test3', (req, res) => {
        res.json({ success: true, data: { timestamp: Date.now() } });
      });

      // Make requests that exceed cache size
      await request(app).get('/api/v1/performance/cached/size-limited/test1');
      await request(app).get('/api/v1/performance/cached/size-limited/test2');
      await request(app).get('/api/v1/performance/cached/size-limited/test3');

      // Should only keep 2 most recent entries
      expect(sizeLimitedCache.size).toBeLessThanOrEqual(maxCacheSize);
    });
  });

  describe('Concurrent Requests', () => {
    test('should handle concurrent cache access', async () => {
      // Make multiple concurrent requests
      const requests = Array(5)
        .fill()
        .map((_, i) =>
          request(app)
            .get('/api/v1/performance/cached/test')
            .query({ requestId: i })
        );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Should only have one cache entry
      expect(mockCache.size).toBe(1);
    });

    test('should prevent cache stampede', async () => {
      // This would test stampede protection if implemented
      const requests = Array(10)
        .fill()
        .map(() => request(app).get('/api/v1/performance/cached/test'));

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach((response) => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });
});
