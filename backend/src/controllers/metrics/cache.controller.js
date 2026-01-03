import {
  formatSuccessResponse,
  handleControllerError,
} from '../../utils/metrics/responseFormatter.util.js';
import { getRedisClient, checkRedisHealth } from '../../config/redis.config.js';
import cacheService from '../../utils/metrics/cache.util.js';

// Get comprehensive cache statistics and health information
export const getCacheMetrics = async (req, res) => {
  try {
    // Get cache service metrics
    const serviceMetrics = cacheService.getMetrics();

    // Get Redis health information
    const redisHealth = await checkRedisHealth();

    // Get additional Redis information
    const redis = getRedisClient();
    let redisInfo = {};

    if (redis && redis.status === 'healthy') {
      try {
        // Get Redis memory usage
        const memoryInfo = await redis.info('memory');
        const keyCount = await redis.dbsize();

        // Get Redis connection info
        const connectionInfo = await redis.info('clients');

        // Get Redis command stats
        const commandStats = await redis.info('stats');

        redisInfo = {
          memory: parseRedisMemoryInfo(memoryInfo),
          keyCount,
          connections: parseRedisConnectionInfo(connectionInfo),
          commands: parseRedisCommandStats(commandStats),
          uptime: await redis
            .info('server')
            .then((info) => parseRedisUptime(info)),
        };
      } catch (error) {
        console.error('Error getting detailed Redis info:', error);
      }
    }

    // Calculate cache performance metrics
    const performanceMetrics = {
      hitRate: serviceMetrics.hitRate,
      missRate:
        serviceMetrics.hits > 0
          ? (serviceMetrics.misses / serviceMetrics.hits) * 100
          : 0,
      errorRate: serviceMetrics.errorRate,
      averageResponseTime: serviceMetrics.averageResponseTime || 0,
      totalOperations:
        serviceMetrics.hits +
        serviceMetrics.misses +
        serviceMetrics.sets +
        serviceMetrics.deletes +
        serviceMetrics.errors,
    };

    // Get cache key distribution
    const keyDistribution = await getCacheKeyDistribution();

    // Get cache invalidation statistics
    const invalidationStats = await getInvalidationStats();

    const response = {
      overview: {
        status: redisHealth.status,
        uptime: serviceMetrics.uptime,
        version: process.env.npm_package_version || 'unknown',
        environment: process.env.NODE_ENV || 'unknown',
      },
      performance: performanceMetrics,
      redis: redisInfo,
      distribution: keyDistribution,
      invalidation: invalidationStats,
      health: redisHealth,
      service: serviceMetrics,
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Get cache key distribution and patterns
const getCacheKeyDistribution = async () => {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return { error: 'Redis not available' };
    }

    // Get all keys with their patterns
    const keys = await redis.keys('boosty:*');
    const keyPatterns = {};

    keys.forEach((key) => {
      const parts = key.split(':');
      const namespace = parts[1] || 'unknown';
      const type = parts[2] || 'unknown';

      if (!keyPatterns[namespace]) {
        keyPatterns[namespace] = {};
      }

      if (!keyPatterns[namespace][type]) {
        keyPatterns[namespace][type] = 0;
      }

      keyPatterns[namespace][type]++;
    });

    // Calculate percentages
    const totalKeys = keys.length;
    const distribution = {};

    Object.keys(keyPatterns).forEach((namespace) => {
      distribution[namespace] = {};
      const namespaceTotal = Object.values(keyPatterns[namespace]).reduce(
        (sum, count) => sum + count,
        0
      );

      Object.keys(keyPatterns[namespace]).forEach((type) => {
        const count = keyPatterns[namespace][type];
        distribution[namespace][type] = {
          count,
          percentage:
            namespaceTotal > 0
              ? Math.round((count / namespaceTotal) * 100 * 10) / 10
              : 0,
        };
      });
    });

    return {
      totalKeys,
      patterns: keyPatterns,
      distribution,
      topNamespaces: Object.entries(keyPatterns)
        .map(([namespace, types]) => ({
          namespace,
          total: Object.values(types).reduce((sum, count) => sum + count, 0),
          types: Object.entries(types)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
    };
  } catch (error) {
    console.error('Error getting cache key distribution:', error);
    return { error: error.message };
  }
};

// Get cache invalidation statistics
const getInvalidationStats = async () => {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return { error: 'Redis not available' };
    }

    // Get invalidation channel subscribers
    const pubsub = redis.duplicate();
    const subscribers = await pubsub.subscribe('cache:invalidations');

    // Get recent invalidation events from a list (mock implementation)
    const recentInvalidations = await getRecentInvalidations();

    return {
      subscribers: subscribers ? 1 : 0, // Simplified count
      recentEvents: recentInvalidations,
      totalInvalidated: recentInvalidations.reduce(
        (sum, event) => sum + (event.keysAffected || 0),
        0
      ),
      invalidationRate:
        recentInvalidations.length > 0
          ? recentInvalidations.reduce(
              (sum, event) => sum + (event.keysAffected || 0),
              0
            ) / recentInvalidations.length
          : 0,
    };
  } catch (error) {
    console.error('Error getting invalidation stats:', error);
    return { error: error.message };
  }
};

// Mock implementation for recent invalidations
const getRecentInvalidations = async () => {
  // In a real implementation, this would query an event log or database
  // For now, return mock data
  return [
    {
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      tags: ['dashboard', 'overview'],
      keysAffected: 15,
      reason: 'data_update',
    },
    {
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      tags: ['transaction', 'analytics'],
      keysAffected: 8,
      reason: 'scheduled_cleanup',
    },
    {
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      tags: ['user', 'metrics'],
      keysAffected: 12,
      reason: 'manual_invalidation',
    },
  ];
};

// Parse Redis memory information
const parseRedisMemoryInfo = (memoryInfo) => {
  const lines = memoryInfo.split('\r\n');
  const memoryData = {};

  lines.forEach((line) => {
    if (line.startsWith('used_memory_human:')) {
      memoryData.used = line.split(':')[1]?.trim();
    } else if (line.startsWith('used_memory_peak_human:')) {
      memoryData.peakUsed = line.split(':')[1]?.trim();
    } else if (line.startsWith('maxmemory_human:')) {
      memoryData.max = line.split(':')[1]?.trim();
    }
  });

  return memoryData;
};

// Parse Redis connection information
const parseRedisConnectionInfo = (connectionInfo) => {
  const lines = connectionInfo.split('\r\n');
  const connectionData = {};

  lines.forEach((line) => {
    if (line.startsWith('connected_clients:')) {
      connectionData.connected = parseInt(line.split(':')[1]?.trim() || '0');
    } else if (line.startsWith('blocked_clients:')) {
      connectionData.blocked = parseInt(line.split(':')[1]?.trim() || '0');
    }
  });

  return connectionData;
};

// Parse Redis command statistics
const parseRedisCommandStats = (commandStats) => {
  const lines = commandStats.split('\r\n');
  const commandData = {};

  lines.forEach((line) => {
    if (line.startsWith('total_commands_processed:')) {
      commandData.totalProcessed = parseInt(line.split(':')[1]?.trim() || '0');
    } else if (line.startsWith('total_connections_received:')) {
      commandData.totalConnections = parseInt(
        line.split(':')[1]?.trim() || '0'
      );
    }
  });

  return commandData;
};

// Parse Redis uptime information
const parseRedisUptime = (uptimeInfo) => {
  const lines = uptimeInfo.split('\r\n');
  let uptimeSeconds = 0;

  lines.forEach((line) => {
    if (line.startsWith('uptime_in_seconds:')) {
      uptimeSeconds = parseInt(line.split(':')[1]?.trim() || '0');
    }
  });

  // Convert to human readable format
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);

  return {
    seconds: uptimeSeconds,
    humanReadable: `${days}d ${hours}h ${minutes}m`,
  };
};

// Clear cache with options
export const clearCacheEndpoint = async (req, res) => {
  try {
    const { pattern, tags, namespace, confirm } = req.body;

    let clearedCount = 0;
    let clearedKeys = [];

    if (confirm !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required for cache clearing operations',
      });
    }

    const redis = getRedisClient();
    if (!redis) {
      return res.status(503).json({
        success: false,
        message: 'Redis not available',
      });
    }

    if (namespace) {
      // Clear specific namespace
      const keys = await redis.keys(`boosty:${namespace}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
        clearedCount = keys.length;
        clearedKeys = keys;
      }
    } else if (tags && Array.isArray(tags)) {
      // Clear by tags using cache service
      clearedCount = await cacheService.invalidateByTags(tags);
      clearedKeys = [`tags: ${tags.join(', ')}`];
    } else if (pattern) {
      // Clear by pattern
      const keys = await redis.keys(`boosty:*${pattern}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
        clearedCount = keys.length;
        clearedKeys = keys;
      }
    } else {
      // Clear all cache
      const keys = await redis.keys('boosty:*');
      if (keys.length > 0) {
        await redis.del(...keys);
        clearedCount = keys.length;
        clearedKeys = keys;
      }
    }

    const response = {
      success: true,
      clearedCount,
      clearedKeys: clearedKeys.slice(0, 10), // Return first 10 keys as examples
      message: `Successfully cleared ${clearedCount} cache entries`,
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Warm up cache with frequently accessed data
export const warmupCacheEndpoint = async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: 'Warmup data must be an array',
      });
    }

    // Transform input data to cache warmup format
    const warmupData = data.map((item) => ({
      key: item.key || `warmup:${item.type}:${item.id}`,
      data: item.data,
      options: {
        ttl: item.ttl || 300, // Default 5 minutes
        tags: item.tags || ['warmup', item.type],
      },
    }));

    // Perform cache warmup
    const results = await cacheService.warmCache(warmupData);

    const response = {
      success: true,
      ...results,
      message: `Cache warmup completed: ${results.success} success, ${results.failed} failed`,
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Reset cache metrics
export const resetCacheMetrics = async (req, res) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required for metrics reset',
      });
    }

    // Reset cache service metrics
    cacheService.resetMetrics();

    const response = {
      success: true,
      message: 'Cache metrics reset successfully',
      timestamp: new Date().toISOString(),
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export default {
  getCacheMetrics,
  clearCacheEndpoint,
  warmupCacheEndpoint,
  resetCacheMetrics,
};
