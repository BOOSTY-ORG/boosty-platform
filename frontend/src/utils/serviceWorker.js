/**
 * Service Worker registration and management utilities
 * Provides offline support, background sync, and caching
 */

const SW_VERSION = '1.0.0';
const SW_CACHE_NAME = 'boosty-finance-cache-v1';
const SW_CACHE_STRATEGY = 'networkFirst';

/**
 * Register service worker
 */
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'imports',
      });
      
      console.log('Service Worker registered:', registration);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        console.log('Service Worker update found');
      });
      
      registration.addEventListener('updated', (event) => {
        console.log('Service Worker updated:', event);
        // Notify user about update
        if (event.waiting) {
          showUpdateNotification();
        }
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  
  return null;
};

/**
 * Unregister service worker
 */
export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        console.log('Service Worker unregistered');
      }
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
    }
  }
};

/**
 * Check if service worker is supported
 */
export const isServiceWorkerSupported = () => {
  return 'serviceWorker' in navigator;
};

/**
 * Get service worker registration
 */
export const getServiceWorkerRegistration = async () => {
  if ('serviceWorker' in navigator) {
    try {
      return await navigator.serviceWorker.getRegistration();
    } catch (error) {
      console.error('Failed to get Service Worker registration:', error);
      return null;
    }
  }
  
  return null;
};

/**
 * Show update notification
 */
const showUpdateNotification = () => {
  // Check if notification permission is granted
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('App Update Available', {
      body: 'A new version of the application is available. Please refresh to get the latest features.',
      icon: '/favicon.ico',
      tag: 'app-update',
    });
  }
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }
  
  return false;
};

/**
 * Listen for service worker messages
 */
export const listenForServiceWorkerMessages = (callback) => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      callback(event.data);
    });
  }
};

/**
 * Send message to service worker
 */
export const sendMessageToServiceWorker = (message) => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      if (registration && registration.active) {
        registration.active.postMessage(message);
      }
    });
  }
};

/**
 * Background sync manager
 */
export class BackgroundSyncManager {
  constructor() {
    this.syncQueue = [];
    this.isSyncing = false;
  }
  
  /**
   * Add item to sync queue
   */
  addToQueue(item) {
    this.syncQueue.push({
      ...item,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    });
  }
  
  /**
   * Process sync queue
   */
  async processQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }
    
    this.isSyncing = true;
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.sync) {
        for (const item of this.syncQueue) {
          try {
            await registration.sync.register(item.tag);
            console.log('Background sync registered:', item);
          } catch (error) {
            console.error('Failed to register background sync:', error);
          }
        }
        
        // Clear processed items
        this.syncQueue = [];
      }
    } catch (error) {
      console.error('Failed to process sync queue:', error);
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isOnline: navigator.onLine,
      queueLength: this.syncQueue.length,
      isSyncing: this.isSyncing,
    };
  }
}

/**
 * Cache manager for service worker
 */
export class ServiceWorkerCacheManager {
  constructor() {
    this.cacheName = SW_CACHE_NAME;
  }
  
  /**
   * Clear cache
   */
  async clearCache() {
    try {
      const cache = await caches.open(this.cacheName);
      const keys = await cache.keys();
      await Promise.all(keys.map(key => cache.delete(key)));
      console.log('Cache cleared:', keys.length, 'items removed');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
  
  /**
   * Get cache size
   */
  async getCacheSize() {
    try {
      const cache = await caches.open(this.cacheName);
      const keys = await cache.keys();
      let totalSize = 0;
      
      for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            totalSize += parseInt(contentLength);
          } else {
            // Estimate size if no content-length header
            totalSize += 1024; // 1KB estimate
          }
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const cache = await caches.open(this.cacheName);
      const keys = await cache.keys();
      const entries = await Promise.all(keys.map(key => cache.match(key)));
      
      let totalEntries = keys.length;
      let cachedEntries = 0;
      let networkEntries = 0;
      let totalSize = 0;
      
      entries.forEach(entry => {
        if (entry) {
          if (entry.response.headers.get('sw-cached') === 'true') {
            cachedEntries++;
          } else {
            networkEntries++;
          }
          
          const contentLength = entry.response.headers.get('content-length');
          if (contentLength) {
            totalSize += parseInt(contentLength);
          } else {
            totalSize += 1024; // 1KB estimate
          }
        }
      });
      
      return {
        totalEntries,
        cachedEntries,
        networkEntries,
        totalSize,
        cacheHitRate: totalEntries > 0 ? (cachedEntries / totalEntries) * 100 : 0,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalEntries: 0,
        cachedEntries: 0,
        networkEntries: 0,
        totalSize: 0,
        cacheHitRate: 0,
      };
    }
  }
}

/**
 * Network status monitor
 */
export class NetworkStatusMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
  }
  
  /**
   * Add listener for network status changes
   */
  addListener(callback) {
    this.listeners.push(callback);
    
    const handleOnline = () => {
      this.isOnline = true;
      this.listeners.forEach(cb => cb({ online: true }));
    };
    
    const handleOffline = () => {
      this.isOnline = false;
      this.listeners.forEach(cb => cb({ online: false }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }
  
  /**
   * Remove listener
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  /**
   * Get current status
   */
  getStatus() {
    return {
      online: this.isOnline,
      effectiveType: this.isOnline ? 'online' : 'offline',
    };
  }
}

/**
 * Performance monitor for service worker
 */
export class ServiceWorkerPerformanceMonitor {
  constructor() {
    this.metrics = {
      cacheHits: 0,
      networkRequests: 0,
      backgroundSyncs: 0,
      errors: 0,
    };
  }
  
  /**
   * Record cache hit
   */
  recordCacheHit() {
    this.metrics.cacheHits++;
  }
  
  /**
   * Record network request
   */
  recordNetworkRequest() {
    this.metrics.networkRequests++;
  }
  
  /**
   * Record background sync
   */
  recordBackgroundSync() {
    this.metrics.backgroundSyncs++;
  }
  
  /**
   * Record error
   */
  recordError(error) {
    this.metrics.errors++;
    console.error('Service Worker error:', error);
  }
  
  /**
   * Get performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      cacheHits: 0,
      networkRequests: 0,
      backgroundSyncs: 0,
      errors: 0,
    };
  }
}

// Create singleton instances
export const backgroundSyncManager = new BackgroundSyncManager();
export const cacheManager = new ServiceWorkerCacheManager();
export const networkMonitor = new NetworkStatusMonitor();
export const performanceMonitor = new ServiceWorkerPerformanceMonitor();

// Initialize network monitoring
networkMonitor.addListener((status) => {
  console.log('Network status changed:', status);
});

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  isServiceWorkerSupported,
  getServiceWorkerRegistration,
  requestNotificationPermission,
  listenForServiceWorkerMessages,
  sendMessageToServiceWorker,
  backgroundSyncManager,
  cacheManager,
  networkMonitor,
  performanceMonitor,
  SW_VERSION,
  SW_CACHE_NAME,
  SW_CACHE_STRATEGY,
};