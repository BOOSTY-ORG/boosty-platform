/**
 * Queue Configuration for Bull Queues with Redis
 *
 * This configuration defines:
 * - Redis connection settings
 * - Queue configurations for different priorities
 * - Rate limiting settings
 * - Retry and error handling settings
 */

import dotenv from 'dotenv';

dotenv.config();

// Redis connection configuration
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Queue configurations for different priorities
export const queueConfigs = {
  highPriority: {
    name: 'notifications-high-priority',
    concurrency: 10,
    maxRetries: 5,
    retryDelay: 1000, // 1 second
    backoffMultiplier: 2,
    maxRetryDelay: 30000, // 30 seconds
    removeOnComplete: 100,
    removeOnFail: 50,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  },

  normalPriority: {
    name: 'notifications-normal-priority',
    concurrency: 5,
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds
    backoffMultiplier: 2,
    maxRetryDelay: 60000, // 1 minute
    removeOnComplete: 200,
    removeOnFail: 100,
    defaultJobOptions: {
      removeOnComplete: 200,
      removeOnFail: 100,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  },

  lowPriority: {
    name: 'notifications-low-priority',
    concurrency: 2,
    maxRetries: 2,
    retryDelay: 5000, // 5 seconds
    backoffMultiplier: 2,
    maxRetryDelay: 120000, // 2 minutes
    removeOnComplete: 300,
    removeOnFail: 150,
    defaultJobOptions: {
      removeOnComplete: 300,
      removeOnFail: 150,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  },

  retry: {
    name: 'notifications-retry',
    concurrency: 3,
    maxRetries: 5,
    retryDelay: 10000, // 10 seconds
    backoffMultiplier: 3,
    maxRetryDelay: 300000, // 5 minutes
    removeOnComplete: 50,
    removeOnFail: 25,
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 25,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
    },
  },

  deadLetter: {
    name: 'notifications-dead-letter',
    concurrency: 1,
    removeOnComplete: 1000,
    removeOnFail: 1000,
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 1000,
      attempts: 1,
    },
  },
};

// Rate limiting configurations per provider
export const rateLimitConfigs = {
  twilio: {
    windowMs: 60000, // 1 minute
    maxRequests: 60, // 60 SMS per minute
    keyGenerator: (job) => `twilio:${job.data.phoneNumber}`,
  },
  mailgun: {
    windowMs: 60000, // 1 minute
    maxRequests: 300, // 300 emails per minute
    keyGenerator: (job) => `mailgun:${job.data.recipient}`,
  },
  pushNotification: {
    windowMs: 60000, // 1 minute
    maxRequests: 1000, // 1000 push notifications per minute
    keyGenerator: (job) => `push:${job.data.deviceId}`,
  },
  inApp: {
    windowMs: 60000, // 1 minute
    maxRequests: 5000, // 5000 in-app notifications per minute
    keyGenerator: (job) => `inapp:${job.data.userId}`,
  },
};

// Priority mapping
export const priorityMapping = {
  urgent: 10,
  high: 8,
  medium: 5,
  low: 1,
};

// Queue settings
export const queueSettings = {
  // Default settings for all queues
  defaultSettings: {
    settings: {
      stalledInterval: 30 * 1000, // 30 seconds
      maxStalledCount: 1,
    },
  },

  // Job deduplication settings
  deduplication: {
    enabled: true,
    ttl: 60 * 60 * 1000, // 1 hour
    keyGenerator: (job) => {
      const { type, userId, channel, content } = job.data;
      return `${type}:${userId}:${channel}:${hashCode(content)}`;
    },
  },

  // Job scheduling settings
  scheduling: {
    maxDelayedJobs: 10000,
    delayPrecision: 1000, // 1 second precision
  },

  // Monitoring settings
  monitoring: {
    enabled: true,
    interval: 30 * 1000, // 30 seconds
    metricsRetention: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Health check settings
  healthCheck: {
    enabled: true,
    interval: 60 * 1000, // 1 minute
    timeout: 10 * 1000, // 10 seconds
  },
};

// Helper function to generate hash for deduplication
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

// Queue metrics configuration
export const metricsConfig = {
  // Metrics to collect
  metrics: [
    'completed',
    'failed',
    'stalled',
    'active',
    'waiting',
    'delayed',
    'paused',
  ],

  // Aggregation intervals
  intervals: [
    { name: '1m', duration: 60 * 1000 }, // 1 minute
    { name: '5m', duration: 5 * 60 * 1000 }, // 5 minutes
    { name: '1h', duration: 60 * 60 * 1000 }, // 1 hour
    { name: '1d', duration: 24 * 60 * 60 * 1000 }, // 1 day
  ],

  // Alert thresholds
  alerts: {
    failedJobsThreshold: 10, // Alert if more than 10 jobs fail in 5 minutes
    stalledJobsThreshold: 5, // Alert if more than 5 jobs are stalled
    queueSizeThreshold: 1000, // Alert if queue size exceeds 1000
    processingTimeThreshold: 30000, // Alert if processing time exceeds 30 seconds
  },
};

// Error handling configuration
export const errorHandlingConfig = {
  // Error classification
  errorTypes: {
    retryable: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'RATE_LIMIT_ERROR',
      'PROVIDER_TEMPORARY_ERROR',
      'NETWORK_ERROR',
    ],
    nonRetryable: [
      'INVALID_RECIPIENT',
      'INVALID_CONTENT',
      'AUTHENTICATION_ERROR',
      'PERMISSION_DENIED',
      'TEMPLATE_NOT_FOUND',
      'USER_UNSUBSCRIBED',
    ],
  },

  // Error notification settings
  notifications: {
    enabled: true,
    channels: ['email', 'slack'],
    recipients: process.env.ERROR_NOTIFICATION_RECIPIENTS?.split(',') || [],
    cooldownPeriod: 5 * 60 * 1000, // 5 minutes between notifications
  },

  // Dead letter queue settings
  deadLetterQueue: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 60 * 1000, // 1 minute
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Export all configurations
export default {
  redis: redisConfig,
  queues: queueConfigs,
  rateLimits: rateLimitConfigs,
  priorities: priorityMapping,
  settings: queueSettings,
  metrics: metricsConfig,
  errorHandling: errorHandlingConfig,
};
