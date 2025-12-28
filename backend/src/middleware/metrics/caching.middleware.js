// Redis-based caching with intelligent invalidation and monitoring
import {
  initializeRedis,
  generateCacheKey,
  cacheTTL,
  cacheVersion,
} from '../../config/redis.config.js';
import cacheService from '../../utils/metrics/cache.util.js';
import logger from '../../helpers/logger.js';

// Initialize Redis connection
let redisInitialized = false;

const ensureRedisInitialized = async () => {
  if (!redisInitialized) {
    try {
      await initializeRedis();
      redisInitialized = true;
      logger.info('Redis caching middleware initialized');
    } catch (error) {
      logger.error('Failed to initialize Redis for caching middleware:', error);
      // Continue without caching if Redis fails
    }
  }
};

const cacheMiddleware = (ttl = cacheTTL.simpleQuery, options = {}) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Ensure Redis is initialized
    await ensureRedisInitialized();
    if (!redisInitialized) {
      // Fallback to no caching if Redis is not available
      return next();
    }

    // Generate cache key based on URL and query parameters
    const cacheKey = generateCacheKey(
      'middleware',
      req.originalUrl || req.url,
      {
        query: req.query,
        user: req.auth ? req.auth._id : 'anonymous',
        path: req.path,
      }
    );

    try {
      // Try to get from cache using cache-aside pattern
      const cachedResponse = await cacheService.get(cacheKey, null, {
        ttl,
        tags: options.tags || ['middleware', 'response'],
        version: options.version || cacheVersion.current,
      });

      if (cachedResponse) {
        logger.debug(`Cache hit for middleware key: ${cacheKey}`);
        return res.json(cachedResponse);
      }

      // Override res.json to cache response
      const originalJson = res.json;
      res.json = async function (data) {
        // Only cache successful responses
        if (data.success !== false && res.statusCode === 200) {
          try {
            await cacheService.set(cacheKey, data, {
              ttl,
              tags: options.tags || ['middleware', 'response'],
              version: options.version || cacheVersion.current,
            });
            logger.debug(`Cache set for middleware key: ${cacheKey}`);
          } catch (error) {
            logger.error(
              `Failed to cache response for key ${cacheKey}:`,
              error
            );
          }
        }
        return originalJson.call(this, data);
      };
    } catch (error) {
      logger.error(`Cache middleware error for key ${cacheKey}:`, error);
      // Continue without caching if there's an error
    }

    next();
  };
};

// Generate cache key for requests (kept for backward compatibility)
const generateRequestCacheKey = (req) => {
  const url = req.originalUrl || req.url;
  const query = JSON.stringify(req.query);
  const user = req.auth ? req.auth._id : 'anonymous';
  return `metrics:${user}:${url}:${query}`;
};

// Clear cache by tags or pattern
const clearCache = async (tags = null, pattern = null) => {
  await ensureRedisInitialized();

  if (!redisInitialized) {
    logger.warn('Redis not initialized, cannot clear cache');
    return 0;
  }

  try {
    if (tags && Array.isArray(tags)) {
      // Clear cache by tags
      return await cacheService.invalidateByTags(tags);
    } else if (pattern) {
      // Clear cache by pattern (less efficient, should use tags when possible)
      const redis = cacheService.redis;
      const keys = await redis.keys(`*${pattern}*`);

      if (keys.length > 0) {
        const result = await redis.del(...keys);
        logger.info(
          `Cleared ${result} cache entries matching pattern: ${pattern}`
        );
        return result;
      }
      return 0;
    } else {
      // Clear all cache (use with caution)
      const redis = cacheService.redis;
      const keys = await redis.keys('boosty:*');

      if (keys.length > 0) {
        const result = await redis.del(...keys);
        logger.info(`Cleared all ${result} cache entries`);
        return result;
      }
      return 0;
    }
  } catch (error) {
    logger.error('Error clearing cache:', error);
    return 0;
  }
};

// Get comprehensive cache statistics
const getCacheStats = async () => {
  await ensureRedisInitialized();

  if (!redisInitialized) {
    return {
      status: 'unavailable',
      message: 'Redis not initialized',
    };
  }

  try {
    const serviceMetrics = cacheService.getMetrics();
    const redis = cacheService.redis;

    // Get Redis info
    const info = await redis.info('memory');
    const keyCount = await redis.dbsize();

    return {
      status: 'available',
      service: serviceMetrics,
      redis: {
        keyCount,
        memoryInfo: info,
      },
    };
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    return {
      status: 'error',
      message: error.message,
    };
  }
};

// Cache configuration for different endpoint types (using Redis TTL values)
const cacheConfig = {
  dashboard: cacheTTL.dashboardOverview,
  overview: cacheTTL.performanceMetrics,
  performance: cacheTTL.performanceMetrics,
  reports: cacheTTL.referenceData,
  realtime: 0, // No caching
  analytics: cacheTTL.transactionAnalytics,
};

// Middleware for specific cache durations with appropriate tags
const dashboardCache = cacheMiddleware(cacheConfig.dashboard, {
  tags: ['dashboard', 'overview'],
});

const overviewCache = cacheMiddleware(cacheConfig.overview, {
  tags: ['dashboard', 'overview'],
});

const performanceCache = cacheMiddleware(cacheConfig.performance, {
  tags: ['dashboard', 'performance'],
});

const reportsCache = cacheMiddleware(cacheConfig.reports, {
  tags: ['reports', 'analytics'],
});

const analyticsCache = cacheMiddleware(cacheConfig.analytics, {
  tags: ['analytics', 'transaction'],
});

// Conditional caching based on endpoint
const smartCache = (req, res, next) => {
  const path = req.path;

  if (path.includes('/realtime')) {
    return next(); // No caching for real-time endpoints
  }

  if (path.includes('/dashboard')) {
    return dashboardCache(req, res, next);
  }

  if (path.includes('/overview')) {
    return overviewCache(req, res, next);
  }

  if (path.includes('/performance')) {
    return performanceCache(req, res, next);
  }

  if (path.includes('/reports')) {
    return reportsCache(req, res, next);
  }

  if (path.includes('/analytics')) {
    return analyticsCache(req, res, next);
  }

  // Default 5-minute cache
  return cacheMiddleware()(req, res, next);
};

// Cache invalidation middleware for data updates
const invalidateCache = (tags = []) => {
  return async (req, res, next) => {
    const originalJson = res.json;

    res.json = async function (data) {
      // Invalidate cache after successful data updates
      if (
        res.statusCode >= 200 &&
        res.statusCode < 300 &&
        req.method !== 'GET'
      ) {
        try {
          await clearCache(tags);
          logger.info(`Cache invalidated for tags: ${tags.join(', ')}`);
        } catch (error) {
          logger.error('Error invalidating cache:', error);
        }
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

export {
  cacheMiddleware,
  generateRequestCacheKey,
  clearCache,
  getCacheStats,
  cacheConfig,
  dashboardCache,
  overviewCache,
  performanceCache,
  reportsCache,
  analyticsCache,
  smartCache,
  invalidateCache,
  ensureRedisInitialized,
};
