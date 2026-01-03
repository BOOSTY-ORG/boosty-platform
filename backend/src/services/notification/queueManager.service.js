/**
 * Queue Manager Service
 *
 * This service manages Bull queues for notification processing:
 * - Initializes queues for different priorities
 * - Handles job scheduling and routing
 * - Manages retry mechanisms and dead letter queues
 * - Provides queue monitoring and health checks
 */

import Bull from 'bull';
import Redis from 'ioredis';
import {
  redisConfig,
  queueConfigs,
  priorityMapping,
  queueSettings,
  errorHandlingConfig,
} from '../../config/queue.config.js';
import Notification from '../../models/notification.model.js';
import NotificationDelivery from '../../models/notificationDelivery.model.js';

class QueueManager {
  constructor() {
    this.queues = {};
    this.redis = null;
    this.isInitialized = false;
    this.metrics = {
      jobsProcessed: 0,
      jobsFailed: 0,
      jobsRetried: 0,
      startTime: new Date(),
    };
  }

  /**
   * Initialize the queue system
   */
  async initialize() {
    try {
      // Create Redis connection
      this.redis = new Redis(redisConfig);

      // Initialize all queues
      await this.initializeQueues();

      // Set up queue event listeners
      this.setupEventListeners();

      // Set up monitoring
      this.setupMonitoring();

      this.isInitialized = true;
      console.log('Queue Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Queue Manager:', error);
      throw error;
    }
  }

  /**
   * Initialize all notification queues
   */
  async initializeQueues() {
    const queueNames = Object.keys(queueConfigs);

    for (const queueName of queueNames) {
      const config = queueConfigs[queueName];

      // Create queue with Redis configuration
      const queue = new Bull(config.name, {
        redis: redisConfig,
        defaultJobOptions: config.defaultJobOptions,
        settings: queueSettings.defaultSettings.settings,
      });

      // Set concurrency
      await queue.process(config.concurrency, this.createProcessor(queueName));

      // Store queue instance
      this.queues[queueName] = {
        instance: queue,
        config,
        name: config.name,
      };

      console.log(`Queue initialized: ${config.name}`);
    }
  }

  /**
   * Create a processor function for a queue
   */
  createProcessor(queueName) {
    return async (job) => {
      const { data, opts } = job;
      const { notificationId, channel, provider } = data;

      try {
        console.log(`Processing job ${job.id} in queue ${queueName}`);

        // Update notification status to processing
        await this.updateNotificationStatus(notificationId, 'processing');

        // Get the appropriate processor for the channel
        const processor = this.getChannelProcessor(channel);
        if (!processor) {
          throw new Error(`No processor found for channel: ${channel}`);
        }

        // Process the notification
        const result = await processor.process(job);

        // Update delivery tracking
        await this.updateDeliveryTracking(
          notificationId,
          channel,
          provider,
          result
        );

        // Update notification status
        await this.updateNotificationStatus(notificationId, 'sent');

        // Update metrics
        this.metrics.jobsProcessed++;

        console.log(`Job ${job.id} processed successfully`);
        return result;
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);

        // Update notification with error
        await this.handleJobError(job, error);

        // Update metrics
        this.metrics.jobsFailed++;

        throw error; // Re-throw to trigger Bull's retry mechanism
      }
    };
  }

  /**
   * Get the appropriate processor for a channel
   */
  getChannelProcessor(channel) {
    // This will be implemented when we create the processors service
    const processors = {
      email: null, // Will be set by processors service
      sms: null,
      in_app: null,
      push_notification: null,
    };

    return processors[channel];
  }

  /**
   * Add a notification job to the appropriate queue
   */
  async addNotificationJob(notificationData, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Queue Manager not initialized');
    }

    const {
      id: notificationId,
      priority = 'medium',
      scheduledAt,
      channels,
      type,
      userId,
    } = notificationData;

    try {
      // Determine queue based on priority
      const queueName = this.getQueueNameByPriority(priority);
      const queue = this.queues[queueName];

      if (!queue) {
        throw new Error(`Queue not found for priority: ${priority}`);
      }

      // Calculate delay for scheduled notifications
      let delay = 0;
      if (scheduledAt && scheduledAt > new Date()) {
        delay = scheduledAt.getTime() - Date.now();
      }

      // Create job data
      const jobData = {
        notificationId,
        type,
        userId,
        channels,
        priority,
        scheduledAt,
        ...notificationData,
      };

      // Job options
      const jobOptions = {
        priority: priorityMapping[priority] || 5,
        delay,
        attempts: queue.config.maxRetries,
        backoff: {
          type: 'exponential',
          delay: queue.config.retryDelay,
        },
        removeOnComplete: queue.config.removeOnComplete,
        removeOnFail: queue.config.removeOnFail,
        ...options,
      };

      // Add job to queue
      const job = await queue.instance.add(jobData, jobOptions);

      // Update notification with queue information
      await Notification.findByIdAndUpdate(notificationId, {
        queueJobId: job.id.toString(),
        queueName: queue.name,
        status: 'queued',
      });

      console.log(`Job ${job.id} added to queue ${queue.name}`);
      return job;
    } catch (error) {
      console.error('Failed to add notification job:', error);
      throw error;
    }
  }

  /**
   * Add multiple notification jobs (bulk operation)
   */
  async addBulkNotificationJobs(notificationsData, options = {}) {
    const jobs = [];

    for (const notificationData of notificationsData) {
      try {
        const job = await this.addNotificationJob(notificationData, options);
        jobs.push(job);
      } catch (error) {
        console.error('Failed to add bulk notification job:', error);
        // Continue with other jobs even if one fails
      }
    }

    return jobs;
  }

  /**
   * Get queue name by priority
   */
  getQueueNameByPriority(priority) {
    const priorityMap = {
      urgent: 'highPriority',
      high: 'highPriority',
      medium: 'normalPriority',
      low: 'lowPriority',
    };

    return priorityMap[priority] || 'normalPriority';
  }

  /**
   * Set up event listeners for all queues
   */
  setupEventListeners() {
    Object.values(this.queues).forEach(({ instance, name }) => {
      // Job completed
      instance.on('completed', (job, result) => {
        console.log(`Job ${job.id} completed in queue ${name}`);
        this.emit('job:completed', { job, result, queue: name });
      });

      // Job failed
      instance.on('failed', (job, err) => {
        console.error(`Job ${job.id} failed in queue ${name}:`, err);
        this.emit('job:failed', { job, error: err, queue: name });
      });

      // Job stalled
      instance.on('stalled', (job) => {
        console.warn(`Job ${job.id} stalled in queue ${name}`);
        this.emit('job:stalled', { job, queue: name });
      });

      // Queue error
      instance.on('error', (err) => {
        console.error(`Queue ${name} error:`, err);
        this.emit('queue:error', { error: err, queue: name });
      });

      // Queue waiting
      instance.on('waiting', (jobId) => {
        console.log(`Job ${jobId} waiting in queue ${name}`);
      });

      // Queue active
      instance.on('active', (job) => {
        console.log(`Job ${job.id} active in queue ${name}`);
      });
    });
  }

  /**
   * Set up monitoring for queues
   */
  setupMonitoring() {
    if (!queueSettings.monitoring.enabled) {
      return;
    }

    setInterval(async () => {
      await this.collectQueueMetrics();
    }, queueSettings.monitoring.interval);

    // Set up health checks
    if (queueSettings.healthCheck.enabled) {
      setInterval(async () => {
        await this.performHealthCheck();
      }, queueSettings.healthCheck.interval);
    }
  }

  /**
   * Collect metrics from all queues
   */
  async collectQueueMetrics() {
    const metrics = {};

    for (const [queueKey, { instance, name }] of Object.entries(this.queues)) {
      try {
        const counts = await instance.getJobCounts();
        const waiting = await instance.getWaiting();
        const active = await instance.getActive();
        const completed = await instance.getCompleted();
        const failed = await instance.getFailed();

        metrics[queueKey] = {
          name,
          counts,
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error(`Failed to collect metrics for queue ${name}:`, error);
        metrics[queueKey] = { error: error.message };
      }
    }

    this.emit('metrics:collected', metrics);
    return metrics;
  }

  /**
   * Perform health check on all queues
   */
  async performHealthCheck() {
    const healthStatus = {
      status: 'healthy',
      queues: {},
      timestamp: new Date(),
    };

    for (const [queueKey, { instance, name }] of Object.entries(this.queues)) {
      try {
        // Check if queue is responsive
        const isPaused = await instance.isPaused();
        const counts = await instance.getJobCounts();

        healthStatus.queues[queueKey] = {
          name,
          status: isPaused ? 'paused' : 'running',
          counts,
          responsive: true,
        };
      } catch (error) {
        console.error(`Health check failed for queue ${name}:`, error);
        healthStatus.queues[queueKey] = {
          name,
          status: 'error',
          error: error.message,
          responsive: false,
        };
        healthStatus.status = 'unhealthy';
      }
    }

    this.emit('health:check', healthStatus);
    return healthStatus;
  }

  /**
   * Update notification status
   */
  async updateNotificationStatus(notificationId, status) {
    try {
      await Notification.findByIdAndUpdate(notificationId, { status });
    } catch (error) {
      console.error('Failed to update notification status:', error);
    }
  }

  /**
   * Update delivery tracking
   */
  async updateDeliveryTracking(notificationId, channel, provider, result) {
    try {
      const delivery = new NotificationDelivery({
        notificationId,
        channel,
        provider,
        externalId: result.externalId,
        status: 'sent',
        sentAt: new Date(),
        providerResponse: result.providerResponse,
      });

      await delivery.save();
    } catch (error) {
      console.error('Failed to update delivery tracking:', error);
    }
  }

  /**
   * Handle job errors
   */
  async handleJobError(job, error) {
    const { notificationId, channel, provider } = job.data;

    try {
      // Update notification with error
      await Notification.findByIdAndUpdate(notificationId, {
        status: 'failed',
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
        lastRetryAt: new Date(),
        retryCount: job.attemptsMade,
      });

      // Update delivery tracking with error
      const delivery = await NotificationDelivery.findOne({
        notificationId,
        channel,
        provider,
      });

      if (delivery) {
        await delivery.markAsFailed(error);
      }
    } catch (updateError) {
      console.error('Failed to handle job error:', updateError);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const stats = {};

    for (const [queueKey, { instance, name }] of Object.entries(this.queues)) {
      try {
        const counts = await instance.getJobCounts();
        stats[queueKey] = {
          name,
          ...counts,
        };
      } catch (error) {
        stats[queueKey] = { name, error: error.message };
      }
    }

    return stats;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName) {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.instance.pause();
    console.log(`Queue ${queue.name} paused`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName) {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.instance.resume();
    console.log(`Queue ${queue.name} resumed`);
  }

  /**
   * Clean up queues
   */
  async cleanQueues() {
    for (const [queueKey, { instance, name }] of Object.entries(this.queues)) {
      try {
        await instance.clean(24 * 60 * 60 * 1000, 'completed'); // Clean completed jobs older than 24 hours
        await instance.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Clean failed jobs older than 7 days
        console.log(`Queue ${name} cleaned`);
      } catch (error) {
        console.error(`Failed to clean queue ${name}:`, error);
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('Shutting down Queue Manager...');

    try {
      // Close all queues
      for (const [queueKey, { instance, name }] of Object.entries(
        this.queues
      )) {
        await instance.close();
        console.log(`Queue ${name} closed`);
      }

      // Close Redis connection
      if (this.redis) {
        await this.redis.quit();
        console.log('Redis connection closed');
      }

      this.isInitialized = false;
      console.log('Queue Manager shutdown complete');
    } catch (error) {
      console.error('Error during Queue Manager shutdown:', error);
      throw error;
    }
  }

  /**
   * Event emitter functionality
   */
  emit(event, data) {
    // Simple event emitter implementation
    if (this.listeners && this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  on(event, callback) {
    if (!this.listeners) {
      this.listeners = {};
    }
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
}

// Create singleton instance
const queueManager = new QueueManager();

export default queueManager;
