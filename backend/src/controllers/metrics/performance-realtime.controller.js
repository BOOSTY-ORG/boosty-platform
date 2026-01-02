/**
 * Performance Real-time Controller
 *
 * This controller handles all real-time performance endpoints including:
 * - Real-time metrics streaming
 * - System metrics streaming
 * - Endpoint-specific metrics streaming
 * - Real-time alerts streaming
 * - Server-Sent Events (SSE) implementation
 */

import { performance } from 'perf_hooks';
import performanceCollector from '../../monitoring/performance-collector.js';
import monitoringConfig from '../../config/monitoring.config.js';
import logger from '../../helpers/logger.js';

class PerformanceRealtimeController {
  constructor() {
    this.activeStreams = new Map(); // Track active SSE connections
    this.streamSubscriptions = new Map(); // Track subscriptions to metrics
  }

  /**
   * Get real-time metrics stream (SSE)
   */
  async getRealtimeMetrics(req, res) {
    try {
      const { interval = 5000 } = req.query;
      const streamId = this.generateStreamId(req);

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      // Send initial connection message
      res.write(`id: ${Date.now()}\n`);
      res.write('event: connected\n');
      res.write(
        `data: ${JSON.stringify({
          type: 'connection',
          message: 'Connected to real-time metrics stream',
          timestamp: new Date().toISOString(),
          streamId,
        })}\n\n`
      );

      // Store the stream
      this.activeStreams.set(streamId, {
        res,
        req,
        lastActivity: Date.now(),
        interval: parseInt(interval),
      });

      // Subscribe to performance collector events
      this.subscribeToMetrics(streamId, 'system', (data) => {
        this.sendStreamData(streamId, 'system-metrics', data);
      });

      this.subscribeToMetrics(streamId, 'api', (data) => {
        this.sendStreamData(streamId, 'api-metrics', data);
      });

      this.subscribeToMetrics(streamId, 'database', (data) => {
        this.sendStreamData(streamId, 'database-metrics', data);
      });

      this.subscribeToMetrics(streamId, 'redis', (data) => {
        this.sendStreamData(streamId, 'redis-metrics', data);
      });

      // Set up periodic data sending
      const metricsInterval = setInterval(() => {
        if (this.activeStreams.has(streamId)) {
          this.sendMetricsSnapshot(streamId);
        } else {
          clearInterval(metricsInterval);
        }
      }, parseInt(interval));

      // Handle client disconnect
      req.on('close', () => {
        this.cleanupStream(streamId);
        clearInterval(metricsInterval);
      });

      req.on('error', (error) => {
        logger.error(`Stream error for ${streamId}:`, error);
        this.cleanupStream(streamId);
        clearInterval(metricsInterval);
      });

      // Send initial metrics
      this.sendMetricsSnapshot(streamId);

      logger.info(`Real-time metrics stream started: ${streamId}`);
    } catch (error) {
      logger.error('Error starting real-time metrics stream:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REALTIME_METRICS_ERROR',
          message: 'Failed to start real-time metrics stream',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get real-time system metrics stream
   */
  async getRealtimeSystemMetrics(req, res) {
    try {
      const { interval = 2000 } = req.query;
      const streamId = this.generateStreamId(req);

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      // Send initial connection message
      res.write(`id: ${Date.now()}\n`);
      res.write('event: connected\n');
      res.write(
        `data: ${JSON.stringify({
          type: 'connection',
          message: 'Connected to system metrics stream',
          timestamp: new Date().toISOString(),
          streamId,
        })}\n\n`
      );

      // Store the stream
      this.activeStreams.set(streamId, {
        res,
        req,
        lastActivity: Date.now(),
        interval: parseInt(interval),
      });

      // Subscribe to system metrics
      this.subscribeToMetrics(streamId, 'system', (data) => {
        this.sendStreamData(streamId, 'system-update', data);
      });

      // Set up periodic system metrics sending
      const systemInterval = setInterval(() => {
        if (this.activeStreams.has(streamId)) {
          this.sendSystemMetrics(streamId);
        } else {
          clearInterval(systemInterval);
        }
      }, parseInt(interval));

      // Handle client disconnect
      req.on('close', () => {
        this.cleanupStream(streamId);
        clearInterval(systemInterval);
      });

      // Send initial system metrics
      this.sendSystemMetrics(streamId);

      logger.info(`Real-time system metrics stream started: ${streamId}`);
    } catch (error) {
      logger.error('Error starting real-time system metrics stream:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REALTIME_SYSTEM_METRICS_ERROR',
          message: 'Failed to start real-time system metrics stream',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get real-time endpoint metrics stream
   */
  async getRealtimeEndpointMetrics(req, res) {
    try {
      const { endpoint } = req.params;
      const { interval = 3000 } = req.query;
      const streamId = this.generateStreamId(req);

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      // Send initial connection message
      res.write(`id: ${Date.now()}\n`);
      res.write('event: connected\n');
      res.write(
        `data: ${JSON.stringify({
          type: 'connection',
          message: `Connected to endpoint metrics stream for ${endpoint}`,
          timestamp: new Date().toISOString(),
          streamId,
          endpoint,
        })}\n\n`
      );

      // Store the stream
      this.activeStreams.set(streamId, {
        res,
        req,
        lastActivity: Date.now(),
        interval: parseInt(interval),
        endpoint,
      });

      // Set up periodic endpoint metrics sending
      const endpointInterval = setInterval(() => {
        if (this.activeStreams.has(streamId)) {
          this.sendEndpointMetrics(streamId, endpoint);
        } else {
          clearInterval(endpointInterval);
        }
      }, parseInt(interval));

      // Handle client disconnect
      req.on('close', () => {
        this.cleanupStream(streamId);
        clearInterval(endpointInterval);
      });

      // Send initial endpoint metrics
      this.sendEndpointMetrics(streamId, endpoint);

      logger.info(
        `Real-time endpoint metrics stream started: ${streamId} for ${endpoint}`
      );
    } catch (error) {
      logger.error('Error starting real-time endpoint metrics stream:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REALTIME_ENDPOINT_METRICS_ERROR',
          message: 'Failed to start real-time endpoint metrics stream',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get real-time alerts stream
   */
  async getRealtimeAlerts(req, res) {
    try {
      const { level = 'all' } = req.query;
      const streamId = this.generateStreamId(req);

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      // Send initial connection message
      res.write(`id: ${Date.now()}\n`);
      res.write('event: connected\n');
      res.write(
        `data: ${JSON.stringify({
          type: 'connection',
          message: 'Connected to real-time alerts stream',
          timestamp: new Date().toISOString(),
          streamId,
        })}\n\n`
      );

      // Store the stream
      this.activeStreams.set(streamId, {
        res,
        req,
        lastActivity: Date.now(),
        level,
      });

      // Subscribe to alerts
      this.subscribeToAlerts(streamId, level, (alert) => {
        this.sendStreamData(streamId, 'alert', alert);
      });

      // Send existing alerts
      this.sendExistingAlerts(streamId, level);

      // Handle client disconnect
      req.on('close', () => {
        this.cleanupStream(streamId);
      });

      logger.info(`Real-time alerts stream started: ${streamId}`);
    } catch (error) {
      logger.error('Error starting real-time alerts stream:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REALTIME_ALERTS_ERROR',
          message: 'Failed to start real-time alerts stream',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Generate unique stream ID
   */
  generateStreamId(req) {
    const userId = req.user?._id || 'anonymous';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `stream-${userId}-${timestamp}-${random}`;
  }

  /**
   * Subscribe to metrics updates
   */
  subscribeToMetrics(streamId, metricType, callback) {
    if (!this.streamSubscriptions.has(streamId)) {
      this.streamSubscriptions.set(streamId, new Map());
    }

    const subscriptions = this.streamSubscriptions.get(streamId);

    if (!subscriptions.has(metricType)) {
      subscriptions.set(metricType, []);
    }

    subscriptions.get(metricType).push(callback);

    // Subscribe to performance collector events
    performanceCollector.on(metricType + 'Metrics', (data) => {
      if (this.activeStreams.has(streamId)) {
        callback(data);
      }
    });
  }

  /**
   * Subscribe to alerts
   */
  subscribeToAlerts(streamId, level, callback) {
    // Subscribe to performance collector alert events
    performanceCollector.on('alert', (alert) => {
      if (this.activeStreams.has(streamId)) {
        if (level === 'all' || alert.level === level) {
          callback(alert);
        }
      }
    });
  }

  /**
   * Send data to stream with backpressure handling
   */
  sendStreamData(streamId, event, data) {
    const stream = this.activeStreams.get(streamId);
    if (!stream) return;

    try {
      const payload = {
        type: event,
        data,
        timestamp: new Date().toISOString(),
      };

      // Check for backpressure
      if (stream.isBuffered && stream.bufferSize > stream.maxBufferSize) {
        logger.warn(`Stream ${streamId} buffer full, dropping message`);
        return;
      }

      // Try to write directly first
      try {
        stream.res.write(`id: ${Date.now()}\n`);
        stream.res.write(`event: ${event}\n`);
        stream.res.write(`data: ${JSON.stringify(payload)}\n\n`);

        // Reset buffer state on successful write
        stream.isBuffered = false;
        stream.bufferSize = 0;
      } catch (writeError) {
        // Handle backpressure
        if (writeError.code === 'EAGAIN' || writeError.code === 'EWOULDBLOCK') {
          stream.isBuffered = true;
          stream.bufferSize++;
          logger.debug(`Backpressure on stream ${streamId}, buffering message`);

          // Buffer the message for later retry
          if (!stream.messageBuffer) {
            stream.messageBuffer = [];
          }
          stream.messageBuffer.push({ event, data });
          return;
        } else {
          throw writeError;
        }
      }

      stream.lastActivity = Date.now();
    } catch (error) {
      logger.error(`Error sending data to stream ${streamId}:`, error);
      this.cleanupStream(streamId);
    }
  }

  /**
   * Send metrics snapshot
   */
  sendMetricsSnapshot(streamId) {
    const metrics = performanceCollector.getMetricsSnapshot();
    const summary = performanceCollector.getPerformanceSummary();

    const snapshot = {
      timestamp: new Date().toISOString(),
      summary,
      metrics: {
        system: {
          cpu: metrics.system.cpu.slice(-1),
          memory: metrics.system.memory.slice(-1),
          eventLoopLag: metrics.system.eventLoopLag.slice(-1),
          uptime: metrics.system.uptime,
        },
        database: {
          queryTimes: metrics.database.queryTimes.slice(-5),
          slowQueries: metrics.database.slowQueries.slice(-3),
          connectionCount: metrics.database.connectionCount,
        },
        redis: {
          hitRate: metrics.redis.hitRate,
          responseTime: metrics.redis.responseTime.slice(-5),
        },
        api: {
          responseTimes: metrics.api.responseTimes.slice(-10),
          requestCount: metrics.api.requestCount,
          errorCount: metrics.api.errorCount,
        },
      },
    };

    this.sendStreamData(streamId, 'metrics-snapshot', snapshot);
  }

  /**
   * Send system metrics
   */
  sendSystemMetrics(streamId) {
    const metrics = performanceCollector.getMetricsSnapshot();
    const systemMetrics = {
      timestamp: new Date().toISOString(),
      cpu: metrics.system.cpu.slice(-1)[0] || {
        value: 0,
        timestamp: Date.now(),
      },
      memory: metrics.system.memory.slice(-1)[0] || {
        value: 0,
        timestamp: Date.now(),
      },
      eventLoopLag: metrics.system.eventLoopLag.slice(-1)[0] || {
        value: 0,
        timestamp: Date.now(),
      },
      uptime: metrics.system.uptime,
    };

    this.sendStreamData(streamId, 'system-metrics', systemMetrics);
  }

  /**
   * Send endpoint metrics
   */
  sendEndpointMetrics(streamId, endpoint) {
    const metrics = performanceCollector.getMetricsSnapshot();
    const endpointData = metrics.api.endpoints[endpoint];

    if (!endpointData) {
      this.sendStreamData(streamId, 'endpoint-not-found', {
        endpoint,
        message: 'Endpoint not found or no data available',
      });
      return;
    }

    const endpointMetrics = {
      timestamp: new Date().toISOString(),
      endpoint,
      statistics: {
        requestCount: endpointData.count,
        errorCount: endpointData.errors,
        avgResponseTime:
          endpointData.count > 0
            ? endpointData.totalResponseTime / endpointData.count
            : 0,
        recentResponseTimes: endpointData.responseTimes.slice(-10),
      },
    };

    this.sendStreamData(streamId, 'endpoint-metrics', endpointMetrics);
  }

  /**
   * Send existing alerts
   */
  sendExistingAlerts(streamId, level) {
    const metrics = performanceCollector.getMetricsSnapshot();
    let alerts = metrics.alerts;

    // Filter by level if specified
    if (level !== 'all') {
      alerts = alerts.filter((alert) => alert.level === level);
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => b.timestamp - a.timestamp);

    // Send alerts in batches
    alerts.forEach((alert, index) => {
      setTimeout(() => {
        if (this.activeStreams.has(streamId)) {
          this.sendStreamData(streamId, 'existing-alert', alert);
        }
      }, index * 100); // Stagger alerts to avoid overwhelming the client
    });
  }

  /**
   * Clean up stream resources
   */
  cleanupStream(streamId) {
    try {
      // Close the response stream
      const stream = this.activeStreams.get(streamId);
      if (stream && stream.res) {
        try {
          stream.res.end();
        } catch (error) {
          // Ignore errors when closing
        }
      }

      // Remove from active streams
      this.activeStreams.delete(streamId);

      // Remove subscriptions
      this.streamSubscriptions.delete(streamId);

      logger.info(`Cleaned up stream: ${streamId}`);
    } catch (error) {
      logger.error(`Error cleaning up stream ${streamId}:`, error);
    }
  }

  /**
   * Clean up inactive streams
   */
  cleanupInactiveStreams() {
    const now = Date.now();
    const inactiveThreshold = 60000; // 1 minute

    for (const [streamId, stream] of this.activeStreams.entries()) {
      if (now - stream.lastActivity > inactiveThreshold) {
        logger.info(`Cleaning up inactive stream: ${streamId}`);
        this.cleanupStream(streamId);
      }
    }
  }

  /**
   * Get active streams statistics
   */
  getActiveStreamsStats() {
    const stats = {
      totalStreams: this.activeStreams.size,
      streamsByType: {},
      averageActivity: 0,
    };

    const now = Date.now();
    let totalActivity = 0;

    for (const [streamId, stream] of this.activeStreams.entries()) {
      const streamType = stream.endpoint ? 'endpoint' : 'general';
      stats.streamsByType[streamType] =
        (stats.streamsByType[streamType] || 0) + 1;
      totalActivity += now - stream.lastActivity;
    }

    if (stats.totalStreams > 0) {
      stats.averageActivity = totalActivity / stats.totalStreams;
    }

    return stats;
  }

  /**
   * Initialize cleanup interval
   */
  initializeCleanupInterval() {
    // Clean up inactive streams every 5 minutes
    setInterval(() => {
      this.cleanupInactiveStreams();
    }, 300000);

    logger.info('Real-time stream cleanup initialized');
  }
}

export default new PerformanceRealtimeController();
