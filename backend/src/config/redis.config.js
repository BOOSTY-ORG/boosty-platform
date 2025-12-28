import Redis from 'ioredis';
import logger from '../helpers/logger.js';

// Redis configuration with environment-specific settings
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  // Enable offline queue for better resilience
  enableOfflineQueue: true,
  // Reconnect strategy
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Create Redis client instances for different purposes
let redisClient = null;
let redisSubscriber = null;
let redisPublisher = null;

// Initialize Redis connection
const initializeRedis = async () => {
  try {
    // Main Redis client for caching
    redisClient = new Redis(redisConfig);

    // Dedicated client for pub/sub
    redisSubscriber = new Redis(redisConfig);
    redisPublisher = new Redis(redisConfig);

    // Connection event handlers
    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    redisClient.on('close', () => {
      logger.warn('Redis client connection closed');
    });

    redisClient.on('reconnecting', (delay) => {
      logger.info(`Redis client reconnecting in ${delay}ms`);
    });

    // Test connection
    await redisClient.ping();
    logger.info('Redis connection established successfully');

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
};

// Get Redis client instance
const getRedisClient = () => {
  if (!redisClient) {
    throw new Error(
      'Redis client not initialized. Call initializeRedis() first.'
    );
  }
  return redisClient;
};

// Get Redis subscriber instance
const getRedisSubscriber = () => {
  if (!redisSubscriber) {
    throw new Error(
      'Redis subscriber not initialized. Call initializeRedis() first.'
    );
  }
  return redisSubscriber;
};

// Get Redis publisher instance
const getRedisPublisher = () => {
  if (!redisPublisher) {
    throw new Error(
      'Redis publisher not initialized. Call initializeRedis() first.'
    );
  }
  return redisPublisher;
};

// Close Redis connections
const closeRedisConnections = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis client connection closed');
    }
    if (redisSubscriber) {
      await redisSubscriber.quit();
      logger.info('Redis subscriber connection closed');
    }
    if (redisPublisher) {
      await redisPublisher.quit();
      logger.info('Redis publisher connection closed');
    }
  } catch (error) {
    logger.error('Error closing Redis connections:', error);
  }
};

// Health check for Redis
const checkRedisHealth = async () => {
  try {
    if (!redisClient) {
      return { status: 'unhealthy', message: 'Redis client not initialized' };
    }

    const startTime = Date.now();
    await redisClient.ping();
    const responseTime = Date.now() - startTime;

    const info = await redisClient.info('memory');
    const memoryInfo = parseRedisMemoryInfo(info);

    return {
      status: 'healthy',
      responseTime,
      memory: memoryInfo,
      uptime: await redisClient.info('uptime'),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
    };
  }
};

// Parse Redis memory info
const parseRedisMemoryInfo = (info) => {
  const lines = info.split('\r\n');
  const memoryData = {};

  lines.forEach((line) => {
    if (line.startsWith('used_memory_human:')) {
      memoryData.used = line.split(':')[1];
    } else if (line.startsWith('used_memory_peak_human:')) {
      memoryData.peak = line.split(':')[1];
    } else if (line.startsWith('used_memory_rss_human:')) {
      memoryData.rss = line.split(':')[1];
    }
  });

  return memoryData;
};

// Cache key generator with consistent naming convention
const generateCacheKey = (namespace, identifier, params = {}) => {
  const paramString = Object.keys(params)
    .sort()
    .map((key) => `${key}:${params[key]}`)
    .join('|');

  return paramString
    ? `boosty:${namespace}:${identifier}:${paramString}`
    : `boosty:${namespace}:${identifier}`;
};

// Cache tag management for invalidation
const generateCacheTags = (entityType, entityId) => {
  return {
    entity: `entity:${entityType}`,
    specific: `entity:${entityType}:${entityId}`,
    type: `type:${entityType}`,
  };
};

// TTL configuration for different data types
const cacheTTL = {
  // Dashboard metrics (change frequently)
  dashboardOverview: 5 * 60, // 5 minutes
  realtimeMetrics: 30, // 30 seconds
  performanceMetrics: 10 * 60, // 10 minutes

  // Transaction data (moderate change frequency)
  transactionMetrics: 15 * 60, // 15 minutes
  transactionAnalytics: 30 * 60, // 30 minutes
  transactionHistory: 60 * 60, // 1 hour

  // User data (low to moderate change frequency)
  userProfile: 30 * 60, // 30 minutes
  userMetrics: 20 * 60, // 20 minutes

  // Investor data (low change frequency)
  investorMetrics: 45 * 60, // 45 minutes
  investorProfile: 60 * 60, // 1 hour

  // Reference data (very low change frequency)
  referenceData: 24 * 60 * 60, // 24 hours
  systemConfig: 12 * 60 * 60, // 12 hours

  // Query results (based on complexity)
  simpleQuery: 10 * 60, // 10 minutes
  complexQuery: 30 * 60, // 30 minutes
  aggregationQuery: 60 * 60, // 1 hour
};

// Cache versioning for schema changes
const cacheVersion = {
  current: 'v1',
  dashboard: 'v1.2',
  transactions: 'v1.1',
  investors: 'v1.0',
  users: 'v1.1',
};

export {
  initializeRedis,
  getRedisClient,
  getRedisSubscriber,
  getRedisPublisher,
  closeRedisConnections,
  checkRedisHealth,
  generateCacheKey,
  generateCacheTags,
  cacheTTL,
  cacheVersion,
  redisConfig,
};
