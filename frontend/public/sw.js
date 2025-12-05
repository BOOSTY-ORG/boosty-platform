/**
 * Service Worker for offline support and background data refresh
 * Provides caching, background sync, and offline functionality
 */

const CACHE_NAME = 'boosty-finance-v1';
const CACHE_VERSION = '1.0.0.0';
const API_CACHE_NAME = 'boosty-api-cache-v1';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
};

// API endpoints to cache
const CACHEABLE_ENDPOINTS = [
  '/api/finance/kpi',
  '/api/finance/transaction-timeline',
  '/api/finance/payouts',
  '/api/finance/roi-analytics',
  '/api/finance/payout-analytics',
  '/api/finance/revenue',
  '/api/finance/investments',
  '/api/finance/portfolio-performance',
  '/api/finance/investor-performance',
  '/api/finance/summary',
];

// Install service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker installed with cache:', CACHE_NAME);
      self.skipWaiting();
    })
  );
});

// Activate service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker activated with cache:', CACHE_NAME);
      return self.clients.claim();
    })
  );
});

// Handle fetch events (network requests)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle GET requests for our API endpoints
  if (request.method !== 'GET' || !isCacheableEndpoint(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        // Return cached response if available and fresh
        if (cachedResponse && isResponseFresh(cachedResponse)) {
          console.log('Serving from cache:', request.url);
          return cachedResponse;
        }
        
        // Otherwise, fetch from network
        console.log('Fetching from network:', request.url);
        return fetch(request).then((networkResponse) => {
          // Cache the network response for future use
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            cache.put(request, responseToCache);
          }
          
          return networkResponse;
        });
      });
    })
  );
});

// Handle message events (from main thread)
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_API_RESPONSE':
      cacheApiResponse(data.url, data.response, data.ttl);
      break;
      
    case 'CLEAR_CACHE':
      clearCache();
      break;
      
    case 'GET_CACHE_STATS':
      getCacheStats().then((stats) => {
        event.ports[0].postMessage({ type: 'CACHE_STATS', data: stats });
      });
      break;
      
    case 'SYNC_DATA':
      syncDataWithServer();
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
});

// Check if response is still fresh
function isResponseFresh(response) {
  if (!response || !response.headers) return false;
  
  const cacheControl = response.headers.get('cache-control');
  const expires = response.headers.get('expires');
  
  // Check max-age
  if (cacheControl) {
    const maxAge = cacheControl.match(/max-age=(\d+)/);
    if (maxAge) {
      const age = parseInt(maxAge[1]);
      const responseTime = parseInt(response.headers.get('sw-response-time') || Date.now());
      return (Date.now() - responseTime) < (age * 1000);
    }
  }
  
  // Check expires header
  if (expires) {
    const expiryTime = new Date(expires).getTime();
    return Date.now() < expiryTime;
  }
  
  // Default to 5 minutes if no cache headers
  const defaultMaxAge = 5 * 60; // 5 minutes
  const responseTime = parseInt(response.headers.get('sw-response-time') || Date.now());
  return (Date.now() - responseTime) < (defaultMaxAge * 1000);
}

// Check if endpoint should be cached
function isCacheableEndpoint(pathname) {
  return CACHEABLE_ENDPOINTS.some(endpoint => {
    return pathname.startsWith(endpoint);
  });
}

// Cache API response
async function cacheApiResponse(url, response, ttl = 5 * 60 * 1000) { // 5 minutes default TTL
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const cacheKey = new Request(url, { method: 'GET' });
    
    // Create response object with cache headers
    const responseToCache = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'sw-cached': 'true',
        'sw-cached-time': Date.now().toString(),
        'cache-control': `max-age=${Math.floor(ttl / 1000)}`,
      },
    });
    
    await cache.put(cacheKey, responseToCache);
    console.log('API response cached:', url);
  } catch (error) {
    console.error('Failed to cache API response:', error);
  }
}

// Clear cache
async function clearCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    await Promise.all(keys.map(key => cache.delete(key)));
    console.log('Cache cleared:', keys.length, 'items removed');
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

// Get cache statistics
async function getCacheStats() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const entries = await Promise.all(keys.map(key => cache.match(key)));
    
    let totalSize = 0;
    let cacheHits = 0;
    let networkRequests = 0;
    
    entries.forEach(entry => {
      if (entry && entry.response) {
        totalSize += estimateResponseSize(entry.response);
        if (entry.response.headers.get('sw-cached') === 'true') {
          cacheHits++;
        } else {
          networkRequests++;
        }
      }
    });
    
    return {
      totalEntries: keys.length,
      cacheHits,
      networkRequests,
      totalSize,
      cacheSize: await estimateCacheSize(cache),
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {
      totalEntries: 0,
      cacheHits: 0,
      networkRequests: 0,
      totalSize: 0,
      cacheSize: 0,
    };
  }
}

// Estimate response size
function estimateResponseSize(response) {
  if (!response) return 0;
  
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    return parseInt(contentLength);
  }
  
  // Rough estimate if no content-length header
  return 1024; // 1KB estimate
}

// Estimate cache size
async function estimateCacheSize(cache) {
  try {
    const keys = await cache.keys();
    let totalSize = 0;
    
    for (const key of keys) {
      const entry = await cache.match(key);
      if (entry && entry.response) {
        totalSize += estimateResponseSize(entry.response);
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Failed to estimate cache size:', error);
    return 0;
  }
}

// Sync data with server
async function syncDataWithServer() {
  try {
    // Check if online
    if (!navigator.onLine) {
      console.log('Offline - skipping data sync');
      return;
    }
    
    // Get recent data that needs syncing
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    // Filter for recently modified data
    const recentKeys = keys.filter(key => {
      return key.includes('/api/finance/');
    });
    
    if (recentKeys.length === 0) {
      console.log('No data to sync');
      return;
    }
    
    console.log('Syncing', recentKeys.length, 'items with server');
    
    // Fetch latest data from server for each endpoint
    for (const key of recentKeys) {
      try {
        const response = await fetch(key);
        if (response.ok) {
          const freshResponse = response.clone();
          await cache.put(key, freshResponse);
          console.log('Synced data for:', key);
        }
      } catch (error) {
        console.error('Failed to sync data for', key, ':', error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Background sync with server
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered');
  event.waitUntil(syncDataWithServer());
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Push message received:', event);
  
  const data = event.data.json();
  
  if (data.type === 'CACHE_UPDATE') {
    // Clear specific cache entries
    const cache = await caches.open(CACHE_NAME);
    for (const url of data.urls || []) {
      const request = new Request(url);
      await cache.delete(request);
      console.log('Cleared cache entry:', url);
    }
  }
  
  if (data.type === 'REFRESH_DATA') {
    // Refresh specific data
    const cache = await caches.open(CACHE_NAME);
    for (const url of data.urls || []) {
      try {
        const request = new Request(url);
        const response = await fetch(url);
        if (response.ok) {
          const freshResponse = response.clone();
          await cache.put(request, freshResponse);
          console.log('Refreshed cache entry:', url);
        }
      } catch (error) {
        console.error('Failed to refresh cache entry:', url, ':', error);
      }
    }
  }
});

// Periodic cleanup
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync triggered');
  event.waitUntil(cleanupOldCacheEntries());
});

// Clean up old cache entries
async function cleanupOldCacheEntries() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const key of keys) {
      const entry = await cache.match(key);
      if (entry && entry.response) {
        const cachedTime = parseInt(entry.response.headers.get('sw-cached-time') || '0');
        
        // Remove entries older than 24 hours
        if (now - cachedTime > maxAge) {
          await cache.delete(key);
          console.log('Removed old cache entry:', key);
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup cache:', error);
  }
}

// Network status monitoring
self.addEventListener('online', () => {
  console.log('Network connection restored');
  // Trigger sync when coming back online
  syncDataWithServer();
});

self.addEventListener('offline', () => {
  console.log('Network connection lost');
  // Notify main thread about offline status
  self.clients.forEach(client => {
    client.postMessage({ type: 'OFFLINE_STATUS', isOffline: true });
  });
});

console.log('Service Worker loaded');