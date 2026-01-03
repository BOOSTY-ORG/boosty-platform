import { 
  getRedisClient, 
  getRedisPublisher, 
  generateCacheKey, 
  generateCacheTags, 
  cacheTTL,
  cacheVersion 
} from '../../config/redis.config.js';
import logger from '../../helpers/logger.js';

// Cache metrics tracking
const cacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
  lastReset: Date.now()
};

// Cache-aside pattern implementation
class CacheAsideService {
  constructor() {
    this.redis = null;
    this.publisher = null;
    this.initialized = false;
  }

  // Initialize the cache service
  async initialize() {
    try {
      this.redis = getRedisClient();
      this.publisher = getRedisPublisher();
      this.initialized = true;
      logger.info('Cache service initialized');
    } catch (error) {
      logger.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  // Get value from cache with cache-aside pattern
  async get(key, fetchFunction, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      ttl = cacheTTL.simpleQuery,
      tags = [],
      version = cacheVersion.current,
      useFallback = true
    } = options;

    const versionedKey = `${key}:${version}`;
    
    try {
      // Try to get from cache first
      const cachedValue = await this.redis.get(versionedKey);
      
      if (cachedValue !== null) {
        cacheMetrics.hits++;
        logger.debug(`Cache hit for key: ${versionedKey}`);
        
        // Parse and return cached data
        return JSON.parse(cachedValue);
      }

      // Cache miss - fetch data
      cacheMetrics.misses++;
      logger.debug(`Cache miss for key: ${versionedKey}`);
      
      const data = await fetchFunction();
      
      // Cache the fetched data
      if (data !== null && data !== undefined) {
        await this.set(versionedKey, data, { ttl, tags, version });
      }
      
      return data;
      
    } catch (error) {
      cacheMetrics.errors++;
      logger.error(`Cache get error for key ${versionedKey}:`, error);
      
      // Fallback to direct fetch if cache fails
      if (useFallback && fetchFunction) {
        return await fetchFunction();
      }
      
      throw error;
    }
  }

  // Set value in cache with tags
  async set(key, value, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      ttl = cacheTTL.simpleQuery,
      tags = [],
      version = cacheVersion.current
    } = options;

    const versionedKey = `${key}:${version}`;
    
    try {
      const serializedValue = JSON.stringify(value);
      
      // Set the main cache entry
      await this.redis.setex(versionedKey, ttl, serializedValue);
      
      // Add tags for invalidation
      if (tags.length > 0) {
        await this.addTagsToKey(versionedKey, tags);
      }
      
      cacheMetrics.sets++;
      logger.debug(`Cache set for key: ${versionedKey}, TTL: ${ttl}s`);
      
      return true;
    } catch (error) {
      cacheMetrics.errors++;
      logger.error(`Cache set error for key ${versionedKey}:`, error);
      return false;
    }
  }

  // Delete cache entry by key
  async del(key, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const { version = cacheVersion.current } = options;
    const versionedKey = `${key}:${version}`;
    
    try {
      // Get tags before deletion for cleanup
      const tags = await this.getKeyTags(versionedKey);
      
      // Delete the main cache entry
      const result = await this.redis.del(versionedKey);
      
      // Clean up tag associations
      if (tags.length > 0) {
        await this.removeKeyFromTags(versionedKey, tags);
      }
      
      cacheMetrics.deletes++;
      logger.debug(`Cache delete for key: ${versionedKey}`);
      
      return result > 0;
    } catch (error) {
      cacheMetrics.errors++;
      logger.error(`Cache delete error for key ${versionedKey}:`, error);
      return false;
    }
  }

  // Invalidate cache by tags
  async invalidateByTags(tags) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!Array.isArray(tags)) {
      tags = [tags];
    }

    try {
      const pipeline = this.redis.pipeline();
      
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const keys = await this.redis.smembers(tagKey);
        
        if (keys.length > 0) {
          pipeline.del(...keys);
          pipeline.del(tagKey);
        }
      }
      
      const results = await pipeline.exec();
      
      const deletedCount = results.reduce((sum, [err, result]) => {
        return err ? sum : sum + (result || 0);
      }, 0);
      
      logger.info(`Invalidated ${deletedCount} cache entries for tags: ${tags.join(', ')}`);
      
      // Publish invalidation event
      await this.publishInvalidationEvent(tags);
      
      return deletedCount;
    } catch (error) {
      cacheMetrics.errors++;
      logger.error(`Cache invalidation error for tags ${tags}:`, error);
      return 0;
    }
  }

  // Add tags to a cache key
  async addTagsToKey(key, tags) {
    if (!Array.isArray(tags)) {
      tags = [tags];
    }

    const pipeline = this.redis.pipeline();
    
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      pipeline.sadd(tagKey, key);
      pipeline.expire(tagKey, cacheTTL.referenceData); // Long TTL for tags
    }
    
    return pipeline.exec();
  }

  // Get tags associated with a key
  async getKeyTags(key) {
    const tagPattern = `tag:*`;
    const keys = await this.redis.keys(tagPattern);
    
    if (keys.length === 0) {
      return [];
    }
    
    const pipeline = this.redis.pipeline();
    for (const tagKey of keys) {
      pipeline.sismember(tagKey, key);
    }
    
    const results = await pipeline.exec();
    const tags = [];
    
    results.forEach(([err, isMember], index) => {
      if (!err && isMember) {
        const tag = keys[index].replace('tag:', '');
        tags.push(tag);
      }
    });
    
    return tags;
  }

  // Remove key from tags
  async removeKeyFromTags(key, tags) {
    const pipeline = this.redis.pipeline();
    
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      pipeline.srem(tagKey, key);
    }
    
    return pipeline.exec();
  }

  // Publish cache invalidation event
  async publishInvalidationEvent(tags) {
    try {
      const event = {
        type: 'cache_invalidation',
        tags,
        timestamp: new Date().toISOString(),
        source: process.env.NODE_ENV || 'unknown'
      };
      
      await this.publisher.publish('cache:invalidations', JSON.stringify(event));
    } catch (error) {
      logger.error('Failed to publish cache invalidation event:', error);
    }
  }

  // Warm cache with frequently accessed data
  async warmCache(warmupData) {
    if (!this.initialized) {
      await this.initialize();
    }

    const results = {
      success: 0,
      failed: 0,
      total: warmupData.length
    };

    logger.info(`Starting cache warmup for ${warmupData.length} entries`);

    for (const entry of warmupData) {
      try {
        const { key, data, options = {} } = entry;
        await this.set(key, data, options);
        results.success++;
      } catch (error) {
        logger.error(`Failed to warm cache for key ${entry.key}:`, error);
        results.failed++;
      }
    }

    logger.info(`Cache warmup completed: ${results.success} success, ${results.failed} failed`);
    return results;
  }

  // Get cache statistics
  getMetrics() {
    const now = Date.now();
    const uptime = now - cacheMetrics.lastReset;
    
    return {
      ...cacheMetrics,
      uptime,
      hitRate: cacheMetrics.hits / (cacheMetrics.hits + cacheMetrics.misses) || 0,
      errorRate: cacheMetrics.errors / (cacheMetrics.hits + cacheMetrics.misses + cacheMetrics.sets + cacheMetrics.deletes) || 0
    };
  }

  // Reset cache metrics
  resetMetrics() {
    cacheMetrics.hits = 0;
    cacheMetrics.misses = 0;
    cacheMetrics.sets = 0;
    cacheMetrics.deletes = 0;
    cacheMetrics.errors = 0;
    cacheMetrics.lastReset = Date.now();
  }

  // Health check for cache service
  async healthCheck() {
    if (!this.initialized) {
      return { status: 'unhealthy', message: 'Cache service not initialized' };
    }

    try {
      const testKey = 'health:check';
      const testValue = { timestamp: Date.now() };
      
      await this.set(testKey, testValue, { ttl: 10 });
      const retrieved = await this.get(testKey);
      await this.del(testKey);
      
      if (retrieved && retrieved.timestamp === testValue.timestamp) {
        return {
          status: 'healthy',
          metrics: this.getMetrics()
        };
      } else {
        return { status: 'unhealthy', message: 'Cache read/write test failed' };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }
}

// Create singleton instance
const cacheService = new CacheAsideService();

// Helper functions for specific cache operations
export const cacheQueryResult = async (queryKey, queryFunction, options = {}) => {
  return cacheService.get(
    generateCacheKey('query', queryKey, options.params || {}),
    queryFunction,
    {
      ttl: cacheTTL.complexQuery,
      tags: ['query', 'aggregation'],
      ...options
    }
  );
};

export const cacheUserData = async (userId, dataFunction, options = {}) => {
  return cacheService.get(
    generateCacheKey('user', userId, options.params || {}),
    dataFunction,
    {
      ttl: cacheTTL.userProfile,
      tags: generateCacheTags('user', userId),
      ...options
    }
  );
};

export const cacheInvestorData = async (investorId, dataFunction, options = {}) => {
  return cacheService.get(
    generateCacheKey('investor', investorId, options.params || {}),
    dataFunction,
    {
      ttl: cacheTTL.investorProfile,
      tags: generateCacheTags('investor', investorId),
      ...options
    }
  );
};

export const cacheDashboardMetrics = async (dashboardType, dataFunction, options = {}) => {
  return cacheService.get(
    generateCacheKey('dashboard', dashboardType, options.params || {}),
    dataFunction,
    {
      ttl: cacheTTL.dashboardOverview,
      tags: ['dashboard', dashboardType],
      ...options
    }
  );
};

export const cacheTransactionAnalytics = async (analyticsType, dataFunction, options = {}) => {
  return cacheService.get(
    generateCacheKey('transaction', analyticsType, options.params || {}),
    dataFunction,
    {
      ttl: cacheTTL.transactionAnalytics,
      tags: ['transaction', 'analytics', analyticsType],
      ...options
    }
  );
};

// Invalidate cache for specific entities
export const invalidateUserCache = async (userId) => {
  const tags = generateCacheTags('user', userId);
  return cacheService.invalidateByTags(Object.values(tags));
};

export const invalidateInvestorCache = async (investorId) => {
  const tags = generateCacheTags('investor', investorId);
  return cacheService.invalidateByTags(Object.values(tags));
};

export const invalidateTransactionCache = async () => {
  return cacheService.invalidateByTags(['transaction', 'analytics']);
};

export const invalidateDashboardCache = async () => {
  return cacheService.invalidateByTags(['dashboard']);
};

export default cacheService;