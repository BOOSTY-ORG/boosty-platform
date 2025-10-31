/**
 * Metrics Cache Utility
 * Provides intelligent caching strategies for metrics data
 */

// Cache configuration
const CACHE_CONFIG = {
  // Cache durations in milliseconds
  DASHBOARD_OVERVIEW: 5 * 60 * 1000,      // 5 minutes
  REALTIME_METRICS: 30 * 1000,            // 30 seconds
  INVESTOR_METRICS: 15 * 60 * 1000,       // 15 minutes
  USER_METRICS: 15 * 60 * 1000,           // 15 minutes
  TRANSACTION_METRICS: 10 * 60 * 1000,      // 10 minutes
  KYC_METRICS: 10 * 60 * 1000,            // 10 minutes
  REPORTS: 24 * 60 * 60 * 1000,          // 24 hours
  
  // Maximum cache size
  MAX_CACHE_SIZE: 100,
  
  // Cleanup interval
  CLEANUP_INTERVAL: 5 * 60 * 1000,          // 5 minutes
};

// Cache entry interface
class CacheEntry {
  constructor(data, ttl) {
    this.data = data;
    this.timestamp = Date.now();
    this.ttl = ttl;
    this.hits = 0;
  }
  
  isExpired() {
    return Date.now() - this.timestamp > this.ttl;
  }
  
  hit() {
    this.hits++;
  }
}

// Main cache manager
class MetricsCache {
  constructor() {
    this.cache = new Map();
    this.cleanupTimer = null;
    this.startCleanup();
  }
  
  // Generate cache key
  generateKey(endpoint, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${endpoint}${paramString ? '?' + paramString : ''}`;
  }
  
  // Set cache entry
  set(endpoint, params, data, ttl = CACHE_CONFIG.DASHBOARD_OVERVIEW) {
    const key = this.generateKey(endpoint, params);
    
    // Check cache size limit
    if (this.cache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }
    
    this.cache.set(key, new CacheEntry(data, ttl));
  }
  
  // Get cache entry
  get(endpoint, params = {}) {
    const key = this.generateKey(endpoint, params);
    const entry = this.cache.get(key);
    
    if (!entry || entry.isExpired()) {
      if (entry) {
        this.cache.delete(key);
      }
      return null;
    }
    
    entry.hit();
    return entry.data;
  }
  
  // Check if entry exists and is not expired
  has(endpoint, params = {}) {
    const key = this.generateKey(endpoint, params);
    const entry = this.cache.get(key);
    return entry && !entry.isExpired();
  }
  
  // Delete specific entry
  delete(endpoint, params = {}) {
    const key = this.generateKey(endpoint, params);
    this.cache.delete(key);
  }
  
  // Clear all cache
  clear() {
    this.cache.clear();
  }
  
  // Clear expired entries
  clearExpired() {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired()) {
        this.cache.delete(key);
      }
    }
  }
  
  // Evict least recently used entries
  evictLeastRecentlyUsed() {
    let lruKey = null;
    let lruEntry = null;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!lruEntry || entry.hits < lruEntry.hits) {
        lruKey = key;
        lruEntry = entry;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }
  
  // Get cache statistics
  getStats() {
    const entries = Array.from(this.cache.values());
    const expired = entries.filter(entry => entry.isExpired()).length;
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    
    return {
      size: this.cache.size,
      maxSize: CACHE_CONFIG.MAX_CACHE_SIZE,
      expired,
      totalHits,
      hitRate: totalHits > 0 ? (totalHits / (totalHits + expired)) * 100 : 0
    };
  }
  
  // Start cleanup timer
  startCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.clearExpired();
    }, CACHE_CONFIG.CLEANUP_INTERVAL);
  }
  
  // Stop cleanup timer
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Create singleton instance
const metricsCache = new MetricsCache();

// Cache-aware fetch wrapper
export const cachedFetch = async (endpoint, params, fetchFunction, ttl) => {
  // Try to get from cache first
  const cachedData = metricsCache.get(endpoint, params);
  if (cachedData) {
    return {
      data: cachedData,
      fromCache: true
    };
  }
  
  // If not in cache, fetch from API
  try {
    const response = await fetchFunction(params);
    
    // Cache the response
    metricsCache.set(endpoint, params, response, ttl);
    
    return {
      data: response,
      fromCache: false
    };
  } catch (error) {
    // Don't cache errors
    throw error;
  }
};

// Prefetch function for background data loading
export const prefetchData = async (endpoints, params = {}) => {
  const prefetchPromises = endpoints.map(async ({ endpoint, ttl }) => {
    try {
      // Only prefetch if not already cached
      if (!metricsCache.has(endpoint, params)) {
        const response = await fetch(`/api/metrics${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('metrics_token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          metricsCache.set(endpoint, params, data, ttl);
        }
      }
    } catch (error) {
      console.warn(`Failed to prefetch ${endpoint}:`, error);
    }
  });
  
  await Promise.allSettled(prefetchPromises);
};

// Cache invalidation utilities
export const invalidateCache = (pattern) => {
  const regex = new RegExp(pattern);
  
  for (const [key] of metricsCache.cache.entries()) {
    if (regex.test(key)) {
      metricsCache.cache.delete(key);
    }
  }
};

// Specific invalidation functions
export const invalidateDashboardCache = () => {
  invalidateCache('dashboard/overview');
  invalidateCache('dashboard/realtime');
};

export const invalidateInvestorCache = () => {
  invalidateCache('investors');
};

export const invalidateUserCache = () => {
  invalidateCache('users');
};

export const invalidateTransactionCache = () => {
  invalidateCache('transactions');
};

export const invalidateKycCache = () => {
  invalidateCache('kyc');
};

export const invalidateAllCache = () => {
  metricsCache.clear();
};

// Performance monitoring
export const getCachePerformance = () => {
  return metricsCache.getStats();
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    metricsCache.stopCleanup();
  });
}

// Export cache instance for advanced usage
export { metricsCache };
export default metricsCache;