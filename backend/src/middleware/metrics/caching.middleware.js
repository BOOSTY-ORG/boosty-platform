// Simple in-memory caching for development
// In production, this should be replaced with Redis

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
  }

  get(key) {
    const now = Date.now();
    const ttl = this.ttlMap.get(key);
    
    if (ttl && now > ttl) {
      this.cache.delete(key);
      this.ttlMap.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  set(key, value, ttl = 300000) { // Default 5 minutes
    this.cache.set(key, value);
    this.ttlMap.set(key, Date.now() + ttl);
  }

  del(key) {
    this.cache.delete(key);
    this.ttlMap.delete(key);
  }

  clear() {
    this.cache.clear();
    this.ttlMap.clear();
  }

  size() {
    return this.cache.size;
  }
}

const cacheService = new CacheService();

const cacheMiddleware = (ttl = 300000) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key based on URL and query parameters
    const cacheKey = generateCacheKey(req);
    
    // Try to get from cache
    const cachedResponse = cacheService.get(cacheKey);
    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data) {
      // Only cache successful responses
      if (data.success !== false && res.statusCode === 200) {
        cacheService.set(cacheKey, data, ttl);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

const generateCacheKey = (req) => {
  const url = req.originalUrl || req.url;
  const query = JSON.stringify(req.query);
  const user = req.auth ? req.auth._id : 'anonymous';
  return `metrics:${user}:${url}:${query}`;
};

const clearCache = (pattern = null) => {
  if (pattern) {
    // Clear cache entries matching pattern
    for (const key of cacheService.cache.keys()) {
      if (key.includes(pattern)) {
        cacheService.del(key);
      }
    }
  } else {
    // Clear all cache
    cacheService.clear();
  }
};

const getCacheStats = () => {
  return {
    size: cacheService.size(),
    keys: Array.from(cacheService.cache.keys())
  };
};

// Cache configuration for different endpoint types
const cacheConfig = {
  dashboard: 300000,        // 5 minutes
  overview: 900000,         // 15 minutes
  performance: 1800000,      // 30 minutes
  reports: 86400000,        // 24 hours
  realtime: 0,              // No caching
  analytics: 3600000         // 1 hour
};

// Middleware for specific cache durations
const dashboardCache = cacheMiddleware(cacheConfig.dashboard);
const overviewCache = cacheMiddleware(cacheConfig.overview);
const performanceCache = cacheMiddleware(cacheConfig.performance);
const reportsCache = cacheMiddleware(cacheConfig.reports);
const analyticsCache = cacheMiddleware(cacheConfig.analytics);

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
const invalidateCache = (patterns = []) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      // Invalidate cache after successful data updates
      if (res.statusCode >= 200 && res.statusCode < 300 && req.method !== 'GET') {
        patterns.forEach(pattern => {
          clearCache(pattern);
        });
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
};

export {
  cacheMiddleware,
  generateCacheKey,
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
  cacheService
};