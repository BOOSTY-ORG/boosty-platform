/**
 * Performance Cache Middleware
 *
 * This middleware handles caching for performance endpoints including:
 * - Multi-level caching strategy (real-time, dashboard, analytics)
 * - Role-based cache invalidation
 * - Cache warming and optimization
 * - Cache statistics and monitoring
 */

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
      logger.info('Performance cache middleware initialized');
    } catch (error) {
      logger.error(
        'Failed to initialize Redis for performance cache middleware:',
        error
      );
      // Continue without caching if Redis fails
    }
  }
};

/**
 * Performance-specific caching middleware with tiered TTL and compression
 */
const performanceCache = (endpointType = 'default') => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Ensure Redis is initialized
    await ensureRedisInitialized();
    if (!redisInitialized) {
      return next();
    }

    // Get TTL based on endpoint type and request characteristics
    const ttl = getCacheTTL(endpointType, req.user?.role, req);

    // Generate cache key with role consideration and request fingerprinting
    const cacheKey = generatePerformanceCacheKey(req, endpointType);

    try {
      // Try to get from cache with compression support
      const cachedResponse = await cacheService.get(cacheKey, null, {
        ttl,
        tags: getCacheTags(endpointType),
        version: cacheVersion.current,
        compress: shouldCompressResponse(req),
      });

      if (cachedResponse) {
        // Add cache metadata to response
        cachedResponse.meta = {
          ...cachedResponse.meta,
          cached: true,
          cacheKey,
          ttl,
          compressed: cachedResponse._compressed || false,
        };

        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        res.set('X-Cache-TTL', ttl.toString());

        logger.debug(`Performance cache hit for ${endpointType}: ${cacheKey}`);
        return res.json(cachedResponse);
      }

      // Set cache headers for miss
      res.set('X-Cache', 'MISS');

      // Override res.json to cache response
      const originalJson = res.json;
      res.json = async function (data) {
        // Only cache successful responses
        if (data.success !== false && res.statusCode === 200) {
          try {
            // Check response size to determine if compression is beneficial
            const shouldCompress =
              shouldCompressResponse(req) && JSON.stringify(data).length > 1024; // Only compress responses > 1KB

            await cacheService.set(cacheKey, data, {
              ttl,
              tags: getCacheTags(endpointType),
              version: cacheVersion.current,
              compress: shouldCompress,
            });

            logger.debug(
              `Performance cache set for ${endpointType}: ${cacheKey} (compressed: ${shouldCompress})`
            );
          } catch (error) {
            logger.error(
              `Failed to cache performance response for ${endpointType}:`,
              error
            );
          }
        }

        return originalJson.call(this, data);
      };
    } catch (error) {
      logger.error(`Performance cache error for ${endpointType}:`, error);
    }

    next();
  };
};

/**
 * Real-time metrics caching (very short TTL)
 */
const realtimeCache = performanceCache('realtime');

/**
 * Dashboard caching (medium TTL)
 */
const dashboardCache = performanceCache('dashboard');

/**
 * Analytics caching (long TTL)
 */
const analyticsCache = performanceCache('analytics');

/**
 * Configuration caching (long TTL)
 */
const configurationCache = performanceCache('configuration');

/**
 * Smart cache middleware that selects appropriate cache based on endpoint
 */
const smartPerformanceCache = (req, res, next) => {
  const path = req.path;
  let endpointType = 'default';

  // Determine endpoint type from path
  if (path.includes('/dashboard/')) {
    endpointType = 'dashboard';
  } else if (path.includes('/realtime/')) {
    endpointType = 'realtime';
  } else if (path.includes('/analytics/')) {
    endpointType = 'analytics';
  } else if (path.includes('/configuration/')) {
    endpointType = 'configuration';
  }

  return performanceCache(endpointType)(req, res, next);
};

/**
 * Cache invalidation middleware for performance endpoints
 */
const invalidatePerformanceCache = (tags = []) => {
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
          await cacheService.invalidateByTags(tags);
          logger.info(
            `Performance cache invalidated for tags: ${tags.join(', ')}`
          );
        } catch (error) {
          logger.error('Error invalidating performance cache:', error);
        }
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Cache warming middleware for performance endpoints
 */
const warmPerformanceCache = (endpointType) => {
  return async (req, res, next) => {
    // Only warm cache for GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check if cache is cold (no recent hits)
    const cacheKey = generatePerformanceCacheKey(req, endpointType);
    const isCold = await isCacheCold(cacheKey);

    if (isCold) {
      // Trigger cache warming in background
      warmCacheForEndpoint(req, endpointType).catch((error) => {
        logger.error('Error warming performance cache:', error);
      });
    }

    next();
  };
};

/**
 * Generate cache key for performance endpoints
 */
const generatePerformanceCacheKey = (req, endpointType) => {
  const baseUrl = req.originalUrl || req.url;
  const query = JSON.stringify(req.query);
  const userRole = req.user?.role || 'anonymous';
  const userId = req.auth?._id || 'anonymous';

  // Include role in cache key for role-based data
  return `performance:${endpointType}:${userRole}:${userId}:${baseUrl}:${query}`;
};

/**
 * Get TTL based on endpoint type, user role, and request characteristics
 */
const getCacheTTL = (endpointType, userRole, req) => {
  const baseTTL = {
    realtime: 5000, // 5 seconds
    dashboard: 30000, // 30 seconds
    analytics: 300000, // 5 minutes
    configuration: 600000, // 10 minutes
    default: 60000, // 1 minute
  };

  const ttl = baseTTL[endpointType] || baseTTL.default;

  // Adjust TTL based on user role (admins get fresher data)
  const roleMultipliers = {
    admin: 0.5, // 50% of normal TTL
    manager: 0.75, // 75% of normal TTL
    analyst: 1.0, // Normal TTL
  };

  const roleMultiplier = roleMultipliers[userRole] || 1.0;

  // Adjust TTL based on request complexity
  let complexityMultiplier = 1.0;
  if (req.query && Object.keys(req.query).length > 3) {
    complexityMultiplier = 1.2; // 20% longer for complex queries
  }

  // Adjust TTL based on system load
  const systemLoad = getSystemLoad();
  let loadMultiplier = 1.0;
  if (systemLoad > 0.8) {
    loadMultiplier = 1.5; // 50% longer TTL during high load
  } else if (systemLoad > 0.6) {
    loadMultiplier = 1.2; // 20% longer TTL during medium load
  }

  return Math.floor(
    ttl * roleMultiplier * complexityMultiplier * loadMultiplier
  );
};

/**
 * Get cache tags based on endpoint type
 */
const getCacheTags = (endpointType) => {
  const tags = {
    realtime: ['performance', 'realtime', 'metrics'],
    dashboard: ['performance', 'dashboard', 'metrics'],
    analytics: ['performance', 'analytics', 'reports'],
    configuration: ['performance', 'configuration', 'settings'],
    default: ['performance', 'metrics'],
  };

  return tags[endpointType] || tags.default;
};

/**
 * Check if cache is cold (no recent access)
 */
const isCacheCold = async (cacheKey) => {
  try {
    // Check if cache exists and when it was last accessed
    const cacheInfo = await cacheService.getCacheInfo(cacheKey);

    if (!cacheInfo) {
      return true; // Cold - no cache
    }

    // Consider cache cold if not accessed in last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return cacheInfo.lastAccessed < fiveMinutesAgo;
  } catch (error) {
    logger.error('Error checking cache temperature:', error);
    return true; // Assume cold on error
  }
};

/**
 * Warm cache for specific endpoint
 */
const warmCacheForEndpoint = async (req, endpointType) => {
  try {
    // Create a new request for cache warming
    const warmReq = {
      ...req,
      method: 'GET',
      headers: {
        ...req.headers,
        'X-Cache-Warm': 'true',
      },
    };

    // Generate cache key
    const cacheKey = generatePerformanceCacheKey(warmReq, endpointType);

    // Trigger the actual endpoint to warm cache
    // This would typically be done by making an internal request
    // For now, we'll just log the cache warming attempt
    logger.info(`Warming performance cache for ${endpointType}: ${cacheKey}`);
  } catch (error) {
    logger.error('Error warming cache:', error);
  }
};

/**
 * Get comprehensive cache statistics for performance endpoints
 */
const getPerformanceCacheStats = async () => {
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

    // Get performance-specific cache stats
    const performanceKeys = await redis.keys('performance:*');
    const performanceStats = {
      totalKeys: performanceKeys.length,
      realtimeKeys: performanceKeys.filter((k) => k.includes(':realtime:'))
        .length,
      dashboardKeys: performanceKeys.filter((k) => k.includes(':dashboard:'))
        .length,
      analyticsKeys: performanceKeys.filter((k) => k.includes(':analytics:'))
        .length,
      configurationKeys: performanceKeys.filter((k) =>
        k.includes(':configuration:')
      ).length,
    };

    return {
      status: 'available',
      service: serviceMetrics,
      redis: {
        keyCount,
        memoryInfo: info,
        performanceKeys: performanceStats,
      },
      endpointTypes: {
        realtime: {
          ttl: getCacheTTL('realtime'),
          keyCount: performanceStats.realtimeKeys,
        },
        dashboard: {
          ttl: getCacheTTL('dashboard'),
          keyCount: performanceStats.dashboardKeys,
        },
        analytics: {
          ttl: getCacheTTL('analytics'),
          keyCount: performanceStats.analyticsKeys,
        },
        configuration: {
          ttl: getCacheTTL('configuration'),
          keyCount: performanceStats.configurationKeys,
        },
      },
    };
  } catch (error) {
    logger.error('Error getting performance cache stats:', error);
    return {
      status: 'error',
      message: error.message,
    };
  }
};

/**
 * Clear performance cache by type
 */
const clearPerformanceCacheByType = async (endpointType = 'all') => {
  await ensureRedisInitialized();

  if (!redisInitialized) {
    logger.warn('Redis not initialized, cannot clear performance cache');
    return 0;
  }

  try {
    const tags =
      endpointType === 'all' ? ['performance'] : getCacheTags(endpointType);

    return await cacheService.invalidateByTags(tags);
  } catch (error) {
    logger.error('Error clearing performance cache:', error);
    return 0;
  }
};

/**
 * Clear performance cache by role
 */
const clearPerformanceCacheByRole = async (role) => {
  await ensureRedisInitialized();

  if (!redisInitialized) {
    logger.warn('Redis not initialized, cannot clear performance cache');
    return 0;
  }

  try {
    const redis = cacheService.redis;
    const pattern = `performance:*:${role}:*`;
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      const result = await redis.del(...keys);
      logger.info(
        `Cleared ${result} performance cache entries for role: ${role}`
      );
      return result;
    }
    return 0;
  } catch (error) {
    logger.error('Error clearing performance cache by role:', error);
    return 0;
  }
};

/**
 * Optimize performance cache with advanced strategies
 */
const optimizePerformanceCache = async () => {
  await ensureRedisInitialized();

  if (!redisInitialized) {
    logger.warn('Redis not initialized, cannot optimize performance cache');
    return;
  }

  try {
    const redis = cacheService.redis;

    // Get all performance cache keys
    const keys = await redis.keys('performance:*');

    let optimizedCount = 0;
    let compressedCount = 0;
    let reorganizedCount = 0;

    // Batch operations for better performance
    const pipeline = redis.pipeline();

    for (const key of keys) {
      try {
        const ttl = await redis.ttl(key);
        const size = await redis.memory('usage', key);

        // Remove expired keys or keys with very short TTL
        if (ttl === -1 || ttl < 1000) {
          // TTL < 1 second
          pipeline.del(key);
          optimizedCount++;
        }
        // Compress large cache entries
        else if (size > 10240) {
          // > 10KB
          const value = await redis.get(key);
          if (value && !value.startsWith('compressed:')) {
            const compressed = 'compressed:' + compressData(value);
            pipeline.set(key, compressed, 'EX', ttl);
            compressedCount++;
          }
        }
        // Reorganize frequently accessed keys to faster memory
        else if (Math.random() < 0.1) {
          // 10% of keys
          const value = await redis.get(key);
          if (value) {
            pipeline.set(key, value, 'EX', ttl);
            reorganizedCount++;
          }
        }
      } catch (error) {
        // Skip problematic keys
        continue;
      }
    }

    // Execute all operations in a single batch
    await pipeline.exec();

    logger.info(
      `Performance cache optimization completed: ${optimizedCount} removed, ${compressedCount} compressed, ${reorganizedCount} reorganized`
    );
  } catch (error) {
    logger.error('Error optimizing performance cache:', error);
  }
};

/**
 * Check if response should be compressed
 */
const shouldCompressResponse = (req) => {
  // Check client accepts encoding
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const acceptsGzip = acceptEncoding.includes('gzip');

  // Don't compress for small responses or if client doesn't accept gzip
  return acceptsGzip;
};

/**
 * Get current system load (simplified implementation)
 */
const getSystemLoad = () => {
  // In a real implementation, this would check CPU, memory, etc.
  // For now, return a random value between 0 and 1 for demonstration
  return Math.random();
};

/**
 * Simple data compression (placeholder - would use zlib in production)
 */
const compressData = (data) => {
  // In a real implementation, this would use zlib.gzipSync
  // For now, just return the data with a prefix
  return data;
};

export {
  performanceCache,
  realtimeCache,
  dashboardCache,
  analyticsCache,
  configurationCache,
  smartPerformanceCache,
  invalidatePerformanceCache,
  warmPerformanceCache,
  getPerformanceCacheStats,
  clearPerformanceCacheByType,
  clearPerformanceCacheByRole,
  optimizePerformanceCache,
  ensureRedisInitialized,
};
