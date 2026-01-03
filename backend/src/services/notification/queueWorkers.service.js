/**
 * Queue Workers Service
 *
 * This service manages queue workers for notification processing:
 * - Worker management and scaling
 * - Graceful shutdown handling
 * - Worker health monitoring
 * - Concurrent processing limits
 * - Worker lifecycle management
 */

import queueManager from './queueManager.service.js';
import queueProcessors from './queueProcessors.service.js';
import { queueConfigs, queueSettings } from '../../config/queue.config.js';

class QueueWorkers {
  constructor() {
    this.workers = new Map();
    this.isShuttingDown = false;
    this.healthCheckInterval = null;
    this.scalingInterval = null;
    this.metrics = {
      totalWorkers: 0,
      activeWorkers: 0,
      idleWorkers: 0,
      lastHealthCheck: null,
      startTime: new Date(),
    };
  }

  /**
   * Initialize workers
   */
  async initialize() {
    try {
      console.log('Initializing Queue Workers...');

      // Set up processors in queue manager
      this.setupProcessors();

      // Start workers for each queue
      await this.startWorkers();

      // Set up health monitoring
      this.setupHealthMonitoring();

      // Set up auto-scaling
      this.setupAutoScaling();

      console.log('Queue Workers initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Queue Workers:', error);
      throw error;
    }
  }

  /**
   * Set up processors in queue manager
   */
  setupProcessors() {
    // Override the getChannelProcessor method in queue manager
    queueManager.getChannelProcessor = (channel) => {
      return queueProcessors.getProcessor(channel);
    };
  }

  /**
   * Start workers for all queues
   */
  async startWorkers() {
    const queueNames = Object.keys(queueConfigs);

    for (const queueName of queueNames) {
      await this.startQueueWorkers(queueName);
    }
  }

  /**
   * Start workers for a specific queue
   */
  async startQueueWorkers(queueName) {
    const config = queueConfigs[queueName];
    const queue = queueManager.queues[queueName];

    if (!queue) {
      console.error(`Queue not found: ${queueName}`);
      return;
    }

    // Create workers based on concurrency
    const workerCount = config.concurrency;
    const workers = [];

    for (let i = 0; i < workerCount; i++) {
      const worker = await this.createWorker(queueName, i);
      workers.push(worker);
    }

    this.workers.set(queueName, workers);
    this.metrics.totalWorkers += workerCount;

    console.log(`Started ${workerCount} workers for queue ${queue.name}`);
  }

  /**
   * Create a worker for a queue
   */
  async createWorker(queueName, workerIndex) {
    const config = queueConfigs[queueName];
    const queue = queueManager.queues[queueName];

    const worker = {
      id: `${queueName}-worker-${workerIndex}`,
      queueName,
      index: workerIndex,
      status: 'idle',
      startTime: new Date(),
      jobsProcessed: 0,
      jobsFailed: 0,
      lastActivity: new Date(),
      isHealthy: true,
    };

    // Set up worker event listeners
    this.setupWorkerEventListeners(worker, queue);

    return worker;
  }

  /**
   * Set up event listeners for a worker
   */
  setupWorkerEventListeners(worker, queue) {
    const { instance } = queue;

    // Job started
    const onActive = (job) => {
      worker.status = 'active';
      worker.lastActivity = new Date();
      this.metrics.activeWorkers++;
      this.metrics.idleWorkers--;
      console.log(`Worker ${worker.id} processing job ${job.id}`);
    };

    // Job completed
    const onCompleted = (job) => {
      worker.status = 'idle';
      worker.jobsProcessed++;
      worker.lastActivity = new Date();
      this.metrics.activeWorkers--;
      this.metrics.idleWorkers++;
      console.log(`Worker ${worker.id} completed job ${job.id}`);
    };

    // Job failed
    const onFailed = (job, err) => {
      worker.status = 'idle';
      worker.jobsFailed++;
      worker.lastActivity = new Date();
      this.metrics.activeWorkers--;
      this.metrics.idleWorkers++;
      console.error(`Worker ${worker.id} failed job ${job.id}:`, err.message);
    };

    // Register event listeners
    instance.on('active', onActive);
    instance.on('completed', onCompleted);
    instance.on('failed', onFailed);

    // Store event listeners for cleanup
    worker.eventListeners = {
      onActive,
      onCompleted,
      onFailed,
    };
  }

  /**
   * Set up health monitoring
   */
  setupHealthMonitoring() {
    if (!queueSettings.healthCheck.enabled) {
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, queueSettings.healthCheck.interval);
  }

  /**
   * Perform health check on all workers
   */
  async performHealthCheck() {
    const healthStatus = {
      status: 'healthy',
      workers: [],
      timestamp: new Date(),
    };

    for (const [queueName, workers] of this.workers) {
      for (const worker of workers) {
        const workerHealth = await this.checkWorkerHealth(worker);
        healthStatus.workers.push(workerHealth);

        if (!workerHealth.isHealthy) {
          healthStatus.status = 'unhealthy';
        }
      }
    }

    this.metrics.lastHealthCheck = new Date();

    // Log health status
    if (healthStatus.status === 'unhealthy') {
      console.warn('Worker health check failed:', healthStatus);
    }

    // Emit health status
    this.emit('health:check', healthStatus);

    return healthStatus;
  }

  /**
   * Check health of a single worker
   */
  async checkWorkerHealth(worker) {
    const now = new Date();
    const timeSinceLastActivity = now - worker.lastActivity;
    const isStalled = timeSinceLastActivity > queueSettings.healthCheck.timeout;

    worker.isHealthy = !isStalled;

    return {
      id: worker.id,
      queueName: worker.queueName,
      status: worker.status,
      isHealthy: worker.isHealthy,
      isStalled,
      timeSinceLastActivity,
      jobsProcessed: worker.jobsProcessed,
      jobsFailed: worker.jobsFailed,
      uptime: now - worker.startTime,
    };
  }

  /**
   * Set up auto-scaling
   */
  setupAutoScaling() {
    if (!queueSettings.monitoring.enabled) {
      return;
    }

    this.scalingInterval = setInterval(
      async () => {
        await this.checkAndScaleWorkers();
      },
      5 * 60 * 1000
    ); // Check every 5 minutes
  }

  /**
   * Check and scale workers based on queue load
   */
  async checkAndScaleWorkers() {
    try {
      const queueStats = await queueManager.getQueueStats();

      for (const [queueName, stats] of Object.entries(queueStats)) {
        await this.scaleQueueWorkers(queueName, stats);
      }
    } catch (error) {
      console.error('Failed to check and scale workers:', error);
    }
  }

  /**
   * Scale workers for a specific queue based on stats
   */
  async scaleQueueWorkers(queueName, stats) {
    const config = queueConfigs[queueName];
    const workers = this.workers.get(queueName);

    if (!workers) {
      return;
    }

    const { waiting, active } = stats;
    const currentWorkerCount = workers.length;
    const maxWorkerCount = config.concurrency * 2; // Allow up to 2x scaling
    const minWorkerCount = Math.max(1, Math.floor(config.concurrency / 2)); // Minimum 1 worker

    // Scale up if there are many waiting jobs
    if (waiting > 10 && currentWorkerCount < maxWorkerCount) {
      const newWorkerCount = Math.min(currentWorkerCount + 2, maxWorkerCount);
      await this.scaleUpWorkers(queueName, newWorkerCount);
    }
    // Scale down if there are no waiting jobs and many idle workers
    else if (waiting === 0 && currentWorkerCount > minWorkerCount) {
      const idleWorkerCount = workers.filter((w) => w.status === 'idle').length;
      if (idleWorkerCount > Math.floor(currentWorkerCount / 2)) {
        const newWorkerCount = Math.max(minWorkerCount, currentWorkerCount - 1);
        await this.scaleDownWorkers(queueName, newWorkerCount);
      }
    }
  }

  /**
   * Scale up workers for a queue
   */
  async scaleUpWorkers(queueName, targetCount) {
    const workers = this.workers.get(queueName);
    const currentCount = workers.length;

    if (targetCount <= currentCount) {
      return;
    }

    console.log(
      `Scaling up workers for queue ${queueName} from ${currentCount} to ${targetCount}`
    );

    for (let i = currentCount; i < targetCount; i++) {
      const worker = await this.createWorker(queueName, i);
      workers.push(worker);
    }

    this.metrics.totalWorkers += targetCount - currentCount;
    this.emit('scaling:up', { queueName, from: currentCount, to: targetCount });
  }

  /**
   * Scale down workers for a queue
   */
  async scaleDownWorkers(queueName, targetCount) {
    const workers = this.workers.get(queueName);
    const currentCount = workers.length;

    if (targetCount >= currentCount) {
      return;
    }

    console.log(
      `Scaling down workers for queue ${queueName} from ${currentCount} to ${targetCount}`
    );

    // Remove idle workers first
    const idleWorkers = workers.filter((w) => w.status === 'idle');
    const workersToRemove = idleWorkers.slice(0, currentCount - targetCount);

    for (const worker of workersToRemove) {
      await this.removeWorker(worker);
    }

    this.metrics.totalWorkers -= currentCount - targetCount;
    this.emit('scaling:down', {
      queueName,
      from: currentCount,
      to: targetCount,
    });
  }

  /**
   * Remove a worker
   */
  async removeWorker(worker) {
    try {
      // Remove event listeners
      const queue = queueManager.queues[worker.queueName];
      if (queue && worker.eventListeners) {
        const { instance } = queue;
        instance.removeListener('active', worker.eventListeners.onActive);
        instance.removeListener('completed', worker.eventListeners.onCompleted);
        instance.removeListener('failed', worker.eventListeners.onFailed);
      }

      // Remove from workers array
      const workers = this.workers.get(worker.queueName);
      const index = workers.indexOf(worker);
      if (index > -1) {
        workers.splice(index, 1);
      }

      console.log(`Worker ${worker.id} removed`);
    } catch (error) {
      console.error(`Failed to remove worker ${worker.id}:`, error);
    }
  }

  /**
   * Restart a worker
   */
  async restartWorker(worker) {
    try {
      console.log(`Restarting worker ${worker.id}`);

      // Remove old worker
      await this.removeWorker(worker);

      // Create new worker
      const newWorker = await this.createWorker(worker.queueName, worker.index);
      const workers = this.workers.get(worker.queueName);
      const index = workers.findIndex((w) => w.index === worker.index);

      if (index > -1) {
        workers[index] = newWorker;
      } else {
        workers.push(newWorker);
      }

      console.log(`Worker ${worker.id} restarted as ${newWorker.id}`);
    } catch (error) {
      console.error(`Failed to restart worker ${worker.id}:`, error);
    }
  }

  /**
   * Get worker metrics
   */
  getWorkerMetrics() {
    const workerDetails = [];

    for (const [queueName, workers] of this.workers) {
      for (const worker of workers) {
        workerDetails.push({
          id: worker.id,
          queueName,
          status: worker.status,
          jobsProcessed: worker.jobsProcessed,
          jobsFailed: worker.jobsFailed,
          uptime: new Date() - worker.startTime,
          lastActivity: worker.lastActivity,
          isHealthy: worker.isHealthy,
        });
      }
    }

    return {
      ...this.metrics,
      workers: workerDetails,
    };
  }

  /**
   * Get workers by queue
   */
  getWorkersByQueue(queueName) {
    return this.workers.get(queueName) || [];
  }

  /**
   * Get all workers
   */
  getAllWorkers() {
    const allWorkers = [];
    for (const workers of this.workers.values()) {
      allWorkers.push(...workers);
    }
    return allWorkers;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log('Shutting down Queue Workers...');

    try {
      // Clear intervals
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      if (this.scalingInterval) {
        clearInterval(this.scalingInterval);
      }

      // Wait for active jobs to complete (with timeout)
      const shutdownTimeout = 30 * 1000; // 30 seconds
      const startTime = Date.now();

      while (
        this.metrics.activeWorkers > 0 &&
        Date.now() - startTime < shutdownTimeout
      ) {
        console.log(
          `Waiting for ${this.metrics.activeWorkers} active workers to finish...`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Force shutdown if timeout exceeded
      if (this.metrics.activeWorkers > 0) {
        console.warn(
          `Force shutting down with ${this.metrics.activeWorkers} active workers`
        );
      }

      // Close all queues
      await queueManager.shutdown();

      console.log('Queue Workers shutdown complete');
    } catch (error) {
      console.error('Error during Queue Workers shutdown:', error);
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
const queueWorkers = new QueueWorkers();

export default queueWorkers;
