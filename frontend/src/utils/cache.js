/**
 * Intelligent caching utilities for API responses
 * Provides cache management, invalidation strategies, and offline support
 */

// Cache storage with TTL support
class CacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.maxSize = options.maxSize || 1000;
    this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 1 minute
    this.persistenceKey = options.persistenceKey || "app_cache";

    // Start cleanup interval
    this.startCleanup();

    // Load persisted cache if available
    this.loadPersistedCache();
  }

  /**
   * Set cache entry with TTL
   */
  set(key, value, ttl = this.defaultTTL) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const entry = {
      value,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
    this.persistCache();

    return entry;
  }

  /**
   * Get cache entry
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.persistCache();
      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = Date.now();

    return entry.value;
  }

  /**
   * Check if cache entry exists and is valid
   */
  has(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.persistCache();
      return false;
    }

    return true;
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.persistCache();
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.persistCache();
  }

  /**
   * Clear entries matching a pattern
   */
  clearPattern(pattern) {
    const regex = new RegExp(pattern);
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
    this.persistCache();

    return keysToDelete.length;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const avgHits = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      avgHits,
      hitRate: this.calculateHitRate(),
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Check if entry has expired
   */
  isExpired(entry) {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict oldest entries
   */
  evictOldest(count = 1) {
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed
    );

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Evict least frequently used entries
   */
  evictLFU(count = 1) {
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.hits - b.hits
    );

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Start cleanup interval
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const keysToDelete = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      this.persistCache();
    }

    return keysToDelete.length;
  }

  /**
   * Persist cache to localStorage
   */
  persistCache() {
    try {
      const serializableCache = {};

      for (const [key, entry] of this.cache.entries()) {
        // Only persist entries that are serializable and not expired
        if (this.isSerializable(entry.value) && !this.isExpired(entry)) {
          serializableCache[key] = {
            ...entry,
            value: entry.value,
          };
        }
      }

      localStorage.setItem(
        this.persistenceKey,
        JSON.stringify(serializableCache)
      );
    } catch (error) {
      console.warn("Failed to persist cache:", error);
    }
  }

  /**
   * Load persisted cache from localStorage
   */
  loadPersistedCache() {
    try {
      const persisted = localStorage.getItem(this.persistenceKey);

      if (persisted) {
        const data = JSON.parse(persisted);

        for (const [key, entry] of Object.entries(data)) {
          // Only load entries that haven't expired
          if (!this.isExpired(entry)) {
            this.cache.set(key, entry);
          }
        }
      }
    } catch (error) {
      console.warn("Failed to load persisted cache:", error);
    }
  }

  /**
   * Check if value is serializable
   */
  isSerializable(value) {
    try {
      JSON.stringify(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Estimate memory usage
   */
  estimateMemoryUsage() {
    try {
      return JSON.stringify(Array.from(this.cache.entries())).length;
    } catch {
      return 0;
    }
  }

  /**
   * Calculate hit rate (placeholder - would need tracking)
   */
  calculateHitRate() {
    // This would require tracking hits and misses
    return 0;
  }
}

// Create global cache instance
export const cacheManager = new CacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000,
  cleanupInterval: 60 * 1000, // 1 minute
});

/**
 * Cache strategies
 */
export const CACHE_STRATEGIES = {
  CACHE_FIRST: "cache_first",
  NETWORK_FIRST: "network_first",
  CACHE_ONLY: "cache_only",
  NETWORK_ONLY: "network_only",
  STALE_WHILE_REVALIDATE: "stale_while_revalidate",
};

/**
 * Cache key generator
 */
export const generateCacheKey = (endpoint, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      if (params[key] !== undefined && params[key] !== null) {
        result[key] = params[key];
      }
      return result;
    }, {});

  const paramString = JSON.stringify(sortedParams);
  return `${endpoint}:${paramString}`;
};

/**
 * Cached API call wrapper
 */
export const withCache = (apiCall, options = {}) => {
  const {
    strategy = CACHE_STRATEGIES.CACHE_FIRST,
    ttl = cacheManager.defaultTTL,
    keyGenerator = generateCacheKey,
    shouldCache = () => true,
    onError = null,
  } = options;

  return async (endpoint, params = {}, ...args) => {
    const cacheKey = keyGenerator(endpoint, params);

    // Check if we should cache this call
    if (!shouldCache(endpoint, params)) {
      return apiCall(endpoint, params, ...args);
    }

    try {
      switch (strategy) {
        case CACHE_STRATEGIES.CACHE_FIRST:
          return await cacheFirstStrategy(
            cacheKey,
            apiCall,
            endpoint,
            params,
            args,
            ttl
          );

        case CACHE_STRATEGIES.NETWORK_FIRST:
          return await networkFirstStrategy(
            cacheKey,
            apiCall,
            endpoint,
            params,
            args,
            ttl
          );

        case CACHE_STRATEGIES.CACHE_ONLY:
          return await cacheOnlyStrategy(cacheKey);

        case CACHE_STRATEGIES.NETWORK_ONLY:
          return await apiCall(endpoint, params, ...args);

        case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
          return await staleWhileRevalidateStrategy(
            cacheKey,
            apiCall,
            endpoint,
            params,
            args,
            ttl
          );

        default:
          return await apiCall(endpoint, params, ...args);
      }
    } catch (error) {
      if (onError) {
        onError(error, endpoint, params);
      }
      throw error;
    }
  };
};

/**
 * Cache-first strategy
 */
const cacheFirstStrategy = async (
  cacheKey,
  apiCall,
  endpoint,
  params,
  args,
  ttl
) => {
  // Try cache first
  const cached = cacheManager.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fallback to network
  const result = await apiCall(endpoint, params, ...args);
  cacheManager.set(cacheKey, result, ttl);
  return result;
};

/**
 * Network-first strategy
 */
const networkFirstStrategy = async (
  cacheKey,
  apiCall,
  endpoint,
  params,
  args,
  ttl
) => {
  try {
    // Try network first
    const result = await apiCall(endpoint, params, ...args);
    cacheManager.set(cacheKey, result, ttl);
    return result;
  } catch (error) {
    // Fallback to cache on network error
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
    throw error;
  }
};

/**
 * Cache-only strategy
 */
const cacheOnlyStrategy = async (cacheKey) => {
  const cached = cacheManager.get(cacheKey);
  if (cached) {
    return cached;
  }
  throw new Error("No cached data available");
};

/**
 * Stale-while-revalidate strategy
 */
const staleWhileRevalidateStrategy = async (
  cacheKey,
  apiCall,
  endpoint,
  params,
  args,
  ttl
) => {
  const cached = cacheManager.get(cacheKey);

  // Return cached data immediately if available
  if (cached) {
    // Revalidate in background
    apiCall(endpoint, params, ...args)
      .then((result) => {
        cacheManager.set(cacheKey, result, ttl);
      })
      .catch(() => {
        // Ignore background revalidation errors
      });

    return cached;
  }

  // No cache, fetch from network
  const result = await apiCall(endpoint, params, ...args);
  cacheManager.set(cacheKey, result, ttl);
  return result;
};

/**
 * Cache invalidation utilities
 */
export const invalidateCache = {
  /**
   * Invalidate by endpoint pattern
   */
  byEndpoint: (pattern) => {
    return cacheManager.clearPattern(`^${pattern}:`);
  },

  /**
   * Invalidate by specific endpoint and params
   */
  byKey: (endpoint, params = {}) => {
    const cacheKey = generateCacheKey(endpoint, params);
    return cacheManager.delete(cacheKey);
  },

  /**
   * Invalidate all cache
   */
  all: () => {
    cacheManager.clear();
  },

  /**
   * Invalidate expired entries
   */
  expired: () => {
    return cacheManager.cleanup();
  },

  /**
   * Invalidate by tag (if implemented)
   */
  byTag: (tag) => {
    // This would require implementing tag-based caching
    return cacheManager.clearPattern(`.*:tag:${tag}:.*`);
  },
};

/**
 * Cache hooks for React
 */
export const useCache = (key, fetcher, options = {}) => {
  const { ttl, enabled = true } = options;
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!enabled) return;

    // Try cache first
    const cached = cacheManager.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    // Fetch data
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        setData(result);
        cacheManager.set(key, result, ttl);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key, fetcher, ttl, enabled]);

  const refetch = React.useCallback(() => {
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        setData(result);
        cacheManager.set(key, result, ttl);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetcher, key, ttl]);

  const invalidate = React.useCallback(() => {
    cacheManager.delete(key);
  }, [key]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
  };
};

/**
 * Prefetch utility
 */
export const prefetch = (key, fetcher, options = {}) => {
  const { ttl, priority = "low" } = options;

  // Don't prefetch if already cached
  if (cacheManager.has(key)) {
    return;
  }

  // Use requestIdleCallback for low priority prefetches
  const executePrefetch = () => {
    fetcher()
      .then((result) => {
        cacheManager.set(key, result, ttl);
      })
      .catch(() => {
        // Ignore prefetch errors
      });
  };

  if (priority === "low" && "requestIdleCallback" in window) {
    window.requestIdleCallback(executePrefetch);
  } else {
    executePrefetch();
  }
};

/**
 * Background refresh utility
 */
export const setupBackgroundRefresh = (
  key,
  fetcher,
  interval,
  options = {}
) => {
  const { ttl, enabled = true } = options;

  if (!enabled) return null;

  const intervalId = setInterval(() => {
    fetcher()
      .then((result) => {
        cacheManager.set(key, result, ttl);
      })
      .catch(() => {
        // Ignore background refresh errors
      });
  }, interval);

  return () => clearInterval(intervalId);
};

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  cacheManager.stopCleanup();
});

export default {
  cacheManager,
  withCache,
  invalidateCache,
  useCache,
  prefetch,
  setupBackgroundRefresh,
  generateCacheKey,
  CACHE_STRATEGIES,
};
