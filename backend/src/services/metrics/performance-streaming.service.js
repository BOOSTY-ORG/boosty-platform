/**
 * Performance Streaming Service
 *
 * This service handles real-time data streaming including:
 * - Server-Sent Events (SSE) management
 * - WebSocket connections
 * - Real-time metric broadcasting
 * - Stream subscription management
 */

import EventEmitter from 'events';
import performanceCollector from '../../monitoring/performance-collector.js';
import logger from '../../helpers/logger.js';

class PerformanceStreamingService extends EventEmitter {
  constructor() {
    super();
    this.streams = new Map(); // Active SSE streams
    this.subscriptions = new Map(); // Metric subscriptions
    this.websockets = new Map(); // WebSocket connections
    this.isInitialized = false;
    this.streamStats = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      errors: 0,
    };
  }

  /**
   * Initialize the streaming service
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Performance streaming service is already initialized');
      return;
    }

    try {
      logger.info('Initializing performance streaming service');

      // Subscribe to performance collector events
      this.setupPerformanceEventListeners();

      // Start stream cleanup interval
      this.startCleanupInterval();

      this.isInitialized = true;
      logger.info('Performance streaming service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize streaming service:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for performance collector
   */
  setupPerformanceEventListeners() {
    // Listen to system metrics
    performanceCollector.on('systemMetrics', (data) => {
      this.broadcastToSubscribers('system', data);
      this.broadcastToWebsockets('system-metrics', data);
    });

    // Listen to API metrics
    performanceCollector.on('apiMetrics', (data) => {
      this.broadcastToSubscribers('api', data);
      this.broadcastToWebsockets('api-metrics', data);
    });

    // Listen to database metrics
    performanceCollector.on('databaseMetrics', (data) => {
      this.broadcastToSubscribers('database', data);
      this.broadcastToWebsockets('database-metrics', data);
    });

    // Listen to Redis metrics
    performanceCollector.on('redisMetrics', (data) => {
      this.broadcastToSubscribers('redis', data);
      this.broadcastToWebsockets('redis-metrics', data);
    });

    // Listen to alerts
    performanceCollector.on('alert', (alert) => {
      this.broadcastToSubscribers('alerts', alert);
      this.broadcastToWebsockets('alert', alert);
    });

    logger.debug('Performance event listeners setup completed');
  }

  /**
   * Create SSE stream with optimization
   */
  createStream(req, res, options = {}) {
    const streamId = this.generateStreamId(req);
    const {
      interval = 5000,
      categories = ['system', 'api', 'database', 'redis'],
      filters = {},
    } = options;

    try {
      // Set SSE headers with compression
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no', // Disable buffering for Nginx
      });

      // Create stream object with backpressure handling
      const stream = {
        id: streamId,
        req,
        res,
        categories,
        filters,
        interval,
        lastActivity: Date.now(),
        messageCount: 0,
        isActive: true,
        isBuffered: false,
        bufferSize: 0,
        maxBufferSize: 100, // Maximum messages to buffer
      };

      // Store stream
      this.streams.set(streamId, stream);
      this.updateStreamStats();

      // Send initial connection message
      this.sendStreamMessage(streamId, 'connected', {
        message: 'Connected to performance stream',
        streamId,
        categories,
        interval,
        timestamp: new Date().toISOString(),
      });

      // Set up periodic data sending with backpressure management
      const dataInterval = setInterval(() => {
        if (this.streams.has(streamId) && this.streams.get(streamId).isActive) {
          const currentStream = this.streams.get(streamId);

          // Skip if buffer is getting full (backpressure)
          if (currentStream.bufferSize > currentStream.maxBufferSize * 0.8) {
            logger.debug(
              `Backpressure detected for stream ${streamId}, skipping update`
            );
            return;
          }

          this.sendPeriodicData(streamId);
        } else {
          clearInterval(dataInterval);
        }
      }, interval);

      // Store interval reference for cleanup
      stream.dataInterval = dataInterval;

      // Handle client disconnect
      req.on('close', () => {
        this.cleanupStream(streamId);
        clearInterval(dataInterval);
      });

      req.on('error', (error) => {
        logger.error(`Stream error for ${streamId}:`, error);
        this.cleanupStream(streamId);
        clearInterval(dataInterval);
      });

      // Implement connection timeout
      stream.timeoutId = setTimeout(() => {
        logger.warn(`Stream ${streamId} timed out`);
        this.cleanupStream(streamId);
      }, 300000); // 5 minutes timeout

      logger.info(`SSE stream created: ${streamId}`);
      return streamId;
    } catch (error) {
      logger.error('Error creating SSE stream:', error);
      throw error;
    }
  }

  /**
   * Create WebSocket connection
   */
  createWebSocket(ws, req, options = {}) {
    const socketId = this.generateSocketId(req);
    const {
      categories = ['system', 'api', 'database', 'redis'],
      filters = {},
    } = options;

    try {
      // Create socket object
      const socket = {
        id: socketId,
        ws,
        req,
        categories,
        filters,
        lastActivity: Date.now(),
        messageCount: 0,
        isActive: true,
      };

      // Store socket
      this.websockets.set(socketId, socket);
      this.updateStreamStats();

      // Set up WebSocket event handlers
      ws.on('message', (message) => {
        this.handleWebSocketMessage(socketId, message);
      });

      ws.on('close', () => {
        this.cleanupWebSocket(socketId);
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for ${socketId}:`, error);
        this.cleanupWebSocket(socketId);
      });

      // Send initial connection message
      this.sendWebSocketMessage(socketId, 'connected', {
        message: 'Connected to performance WebSocket',
        socketId,
        categories,
        timestamp: new Date().toISOString(),
      });

      logger.info(`WebSocket connection created: ${socketId}`);
      return socketId;
    } catch (error) {
      logger.error('Error creating WebSocket connection:', error);
      throw error;
    }
  }

  /**
   * Subscribe to specific metrics
   */
  subscribeToMetrics(streamId, categories, filters = {}) {
    if (!this.streams.has(streamId)) {
      throw new Error(`Stream ${streamId} not found`);
    }

    const stream = this.streams.get(streamId);
    stream.categories = categories;
    stream.filters = filters;

    // Update subscription map
    categories.forEach((category) => {
      if (!this.subscriptions.has(category)) {
        this.subscriptions.set(category, new Set());
      }
      this.subscriptions.get(category).add(streamId);
    });

    logger.debug(
      `Stream ${streamId} subscribed to categories: ${categories.join(', ')}`
    );
  }

  /**
   * Unsubscribe from specific metrics
   */
  unsubscribeFromMetrics(streamId, categories) {
    if (!this.streams.has(streamId)) {
      return;
    }

    const stream = this.streams.get(streamId);
    stream.categories = stream.categories.filter(
      (cat) => !categories.includes(cat)
    );

    // Update subscription map
    categories.forEach((category) => {
      if (this.subscriptions.has(category)) {
        this.subscriptions.get(category).delete(streamId);

        // Clean up empty subscription sets
        if (this.subscriptions.get(category).size === 0) {
          this.subscriptions.delete(category);
        }
      }
    });

    logger.debug(
      `Stream ${streamId} unsubscribed from categories: ${categories.join(', ')}`
    );
  }

  /**
   * Send message to SSE stream with backpressure handling
   */
  sendStreamMessage(streamId, event, data) {
    const stream = this.streams.get(streamId);
    if (!stream || !stream.isActive) {
      return;
    }

    try {
      const message = {
        id: Date.now(),
        event,
        data,
        timestamp: new Date().toISOString(),
      };

      // Check for backpressure
      if (stream.isBuffered && stream.bufferSize > stream.maxBufferSize) {
        logger.warn(`Stream ${streamId} buffer full, dropping message`);
        this.streamStats.errors++;
        return;
      }

      // Try to write directly first
      try {
        stream.res.write(`id: ${message.id}\n`);
        stream.res.write(`event: ${event}\n`);
        stream.res.write(`data: ${JSON.stringify(message)}\n\n`);

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
      stream.messageCount++;
      this.streamStats.messagesSent++;

      logger.debug(`SSE message sent to ${streamId}: ${event}`);
    } catch (error) {
      logger.error(`Error sending SSE message to ${streamId}:`, error);
      this.streamStats.errors++;
      this.cleanupStream(streamId);
    }
  }

  /**
   * Send message to WebSocket
   */
  sendWebSocketMessage(socketId, event, data) {
    const socket = this.websockets.get(socketId);
    if (!socket || !socket.isActive) {
      return;
    }

    try {
      const message = {
        id: Date.now(),
        event,
        data,
        timestamp: new Date().toISOString(),
      };

      socket.ws.send(JSON.stringify(message));

      socket.lastActivity = Date.now();
      socket.messageCount++;
      this.streamStats.messagesSent++;

      logger.debug(`WebSocket message sent to ${socketId}: ${event}`);
    } catch (error) {
      logger.error(`Error sending WebSocket message to ${socketId}:`, error);
      this.streamStats.errors++;
    }
  }

  /**
   * Send periodic data to stream
   */
  sendPeriodicData(streamId) {
    const stream = this.streams.get(streamId);
    if (!stream || !stream.isActive) {
      return;
    }

    try {
      // Get current metrics
      const metrics = performanceCollector.getMetricsSnapshot();

      // Filter by subscribed categories
      const filteredData = {};
      stream.categories.forEach((category) => {
        if (metrics[category]) {
          filteredData[category] = this.filterMetrics(
            metrics[category],
            stream.filters
          );
        }
      });

      this.sendStreamMessage(streamId, 'metrics-update', {
        timestamp: new Date().toISOString(),
        metrics: filteredData,
      });
    } catch (error) {
      logger.error(`Error sending periodic data to ${streamId}:`, error);
    }
  }

  /**
   * Broadcast to SSE subscribers
   */
  broadcastToSubscribers(category, data) {
    if (!this.subscriptions.has(category)) {
      return;
    }

    const subscribers = this.subscriptions.get(category);
    let sentCount = 0;

    subscribers.forEach((streamId) => {
      const stream = this.streams.get(streamId);
      if (stream && stream.isActive && stream.categories.includes(category)) {
        this.sendStreamMessage(streamId, `${category}-update`, data);
        sentCount++;
      }
    });

    logger.debug(
      `Broadcast to ${sentCount} subscribers for category: ${category}`
    );
  }

  /**
   * Broadcast to WebSocket clients
   */
  broadcastToWebsockets(event, data) {
    let sentCount = 0;

    this.websockets.forEach((socket, socketId) => {
      if (socket.isActive) {
        this.sendWebSocketMessage(socketId, event, data);
        sentCount++;
      }
    });

    logger.debug(
      `Broadcast to ${sentCount} WebSocket clients for event: ${event}`
    );
  }

  /**
   * Handle WebSocket message
   */
  handleWebSocketMessage(socketId, message) {
    const socket = this.websockets.get(socketId);
    if (!socket) {
      return;
    }

    try {
      const parsedMessage = JSON.parse(message);

      switch (parsedMessage.type) {
        case 'subscribe':
          this.subscribeToMetrics(
            socketId,
            parsedMessage.categories,
            parsedMessage.filters
          );
          this.sendWebSocketMessage(socketId, 'subscription-confirmed', {
            categories: parsedMessage.categories,
            filters: parsedMessage.filters,
          });
          break;

        case 'unsubscribe':
          this.unsubscribeFromMetrics(socketId, parsedMessage.categories);
          this.sendWebSocketMessage(socketId, 'unsubscription-confirmed', {
            categories: parsedMessage.categories,
          });
          break;

        case 'ping':
          this.sendWebSocketMessage(socketId, 'pong', {
            timestamp: new Date().toISOString(),
          });
          break;

        default:
          logger.warn(`Unknown WebSocket message type: ${parsedMessage.type}`);
      }
    } catch (error) {
      logger.error(`Error handling WebSocket message from ${socketId}:`, error);
    }
  }

  /**
   * Filter metrics based on filters
   */
  filterMetrics(metrics, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return metrics;
    }

    // Apply filters (simplified implementation)
    const filtered = { ...metrics };

    // Filter by time range
    if (filters.timeRange) {
      const now = Date.now();
      const timeRangeMs = {
        '1h': 3600000,
        '6h': 21600000,
        '24h': 86400000,
        '7d': 604800000,
      }[filters.timeRange];

      if (timeRangeMs) {
        const cutoffTime = now - timeRangeMs;

        // Filter array-based metrics
        Object.keys(filtered).forEach((key) => {
          if (Array.isArray(filtered[key])) {
            filtered[key] = filtered[key].filter(
              (item) => item.timestamp >= cutoffTime
            );
          }
        });
      }
    }

    // Filter by threshold
    if (filters.threshold) {
      Object.keys(filtered).forEach((key) => {
        if (Array.isArray(filtered[key])) {
          filtered[key] = filtered[key].filter(
            (item) => item.value >= filters.threshold
          );
        }
      });
    }

    return filtered;
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
   * Generate unique socket ID
   */
  generateSocketId(req) {
    const userId = req.user?._id || 'anonymous';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `socket-${userId}-${timestamp}-${random}`;
  }

  /**
   * Clean up SSE stream
   */
  cleanupStream(streamId) {
    try {
      const stream = this.streams.get(streamId);
      if (!stream) {
        return;
      }

      // Remove from subscriptions
      stream.categories.forEach((category) => {
        if (this.subscriptions.has(category)) {
          this.subscriptions.get(category).delete(streamId);

          // Clean up empty subscription sets
          if (this.subscriptions.get(category).size === 0) {
            this.subscriptions.delete(category);
          }
        }
      });

      // Close response stream
      if (stream.res && !stream.res.destroyed) {
        try {
          stream.res.end();
        } catch (error) {
          // Ignore errors when closing
        }
      }

      // Clear interval if exists
      if (stream.dataInterval) {
        clearInterval(stream.dataInterval);
      }

      // Remove from streams map
      this.streams.delete(streamId);
      this.updateStreamStats();

      logger.info(`SSE stream cleaned up: ${streamId}`);
    } catch (error) {
      logger.error(`Error cleaning up stream ${streamId}:`, error);
    }
  }

  /**
   * Clean up WebSocket connection
   */
  cleanupWebSocket(socketId) {
    try {
      const socket = this.websockets.get(socketId);
      if (!socket) {
        return;
      }

      // Close WebSocket if not already closed
      if (socket.ws && socket.ws.readyState === socket.ws.OPEN) {
        socket.ws.close();
      }

      // Remove from websockets map
      this.websockets.delete(socketId);
      this.updateStreamStats();

      logger.info(`WebSocket connection cleaned up: ${socketId}`);
    } catch (error) {
      logger.error(`Error cleaning up WebSocket ${socketId}:`, error);
    }
  }

  /**
   * Start cleanup interval for inactive connections with optimized cleanup
   */
  startCleanupInterval() {
    // Clean up inactive connections every 5 minutes
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 300000);

    // Buffer flush interval for backpressure management
    setInterval(() => {
      this.flushBufferedMessages();
    }, 1000); // Check every second

    logger.debug('Stream cleanup interval started');
  }

  /**
   * Flush buffered messages for streams with backpressure
   */
  flushBufferedMessages() {
    for (const [streamId, stream] of this.streams.entries()) {
      if (
        !stream.isActive ||
        !stream.isBuffered ||
        !stream.messageBuffer ||
        stream.messageBuffer.length === 0
      ) {
        continue;
      }

      try {
        // Try to flush buffered messages
        while (stream.messageBuffer.length > 0) {
          const { event, data } = stream.messageBuffer.shift();

          try {
            stream.res.write(`id: ${Date.now()}\n`);
            stream.res.write(`event: ${event}\n`);
            stream.res.write(`data: ${JSON.stringify(data)}\n\n`);

            stream.bufferSize = Math.max(0, stream.bufferSize - 1);
          } catch (writeError) {
            if (
              writeError.code === 'EAGAIN' ||
              writeError.code === 'EWOULDBLOCK'
            ) {
              // Still under backpressure, put message back and stop trying
              stream.messageBuffer.unshift({ event, data });
              break;
            } else {
              throw writeError;
            }
          }
        }

        // If buffer is empty, reset buffered state
        if (stream.messageBuffer.length === 0) {
          stream.isBuffered = false;
          stream.bufferSize = 0;
        }
      } catch (error) {
        logger.error(`Error flushing buffer for stream ${streamId}:`, error);
        this.cleanupStream(streamId);
      }
    }
  }

  /**
   * Clean up inactive connections with optimized cleanup
   */
  cleanupInactiveConnections() {
    const now = Date.now();
    const inactiveThreshold = 600000; // 10 minutes

    // Batch cleanup operations for better performance
    const streamsToCleanup = [];
    const socketsToCleanup = [];

    // Identify inactive streams
    for (const [streamId, stream] of this.streams.entries()) {
      if (now - stream.lastActivity > inactiveThreshold) {
        streamsToCleanup.push(streamId);
      }
    }

    // Identify inactive WebSockets
    for (const [socketId, socket] of this.websockets.entries()) {
      if (now - socket.lastActivity > inactiveThreshold) {
        socketsToCleanup.push(socketId);
      }
    }

    // Clean up identified streams
    streamsToCleanup.forEach((streamId) => {
      logger.info(`Cleaning up inactive stream: ${streamId}`);
      this.cleanupStream(streamId);
    });

    // Clean up identified WebSockets
    socketsToCleanup.forEach((socketId) => {
      logger.info(`Cleaning up inactive WebSocket: ${socketId}`);
      this.cleanupWebSocket(socketId);
    });
  }

  /**
   * Update stream statistics
   */
  updateStreamStats() {
    this.streamStats.totalConnections =
      this.streams.size + this.websockets.size;
    this.streamStats.activeConnections =
      Array.from(this.streams.values()).filter((stream) => stream.isActive)
        .length +
      Array.from(this.websockets.values()).filter((socket) => socket.isActive)
        .length;
  }

  /**
   * Get streaming statistics
   */
  getStreamingStats() {
    this.updateStreamStats();

    return {
      ...this.streamStats,
      subscriptions: {
        categories: Object.fromEntries(
          Array.from(this.subscriptions.entries()).map(
            ([category, subscribers]) => [category, subscribers.size]
          )
        ),
        total: Array.from(this.subscriptions.values()).reduce(
          (total, subscribers) => total + subscribers.size,
          0
        ),
      },
      connections: {
        sse: this.streams.size,
        websockets: this.websockets.size,
      },
    };
  }

  /**
   * Get active streams
   */
  getActiveStreams() {
    const activeStreams = [];

    this.streams.forEach((stream, streamId) => {
      if (stream.isActive) {
        activeStreams.push({
          id: streamId,
          categories: stream.categories,
          lastActivity: stream.lastActivity,
          messageCount: stream.messageCount,
        });
      }
    });

    return activeStreams;
  }

  /**
   * Get active WebSockets
   */
  getActiveWebSockets() {
    const activeSockets = [];

    this.websockets.forEach((socket, socketId) => {
      if (socket.isActive) {
        activeSockets.push({
          id: socketId,
          categories: socket.categories,
          lastActivity: socket.lastActivity,
          messageCount: socket.messageCount,
        });
      }
    });

    return activeSockets;
  }

  /**
   * Shutdown streaming service
   */
  async shutdown() {
    if (!this.isInitialized) {
      return;
    }

    logger.info('Shutting down performance streaming service');

    // Clean up all streams
    for (const [streamId, stream] of this.streams.entries()) {
      this.cleanupStream(streamId);
    }

    // Clean up all WebSockets
    for (const [socketId, socket] of this.websockets.entries()) {
      this.cleanupWebSocket(socketId);
    }

    // Remove all event listeners
    this.removeAllListeners();

    this.isInitialized = false;
    logger.info('Performance streaming service shut down');
  }
}

// Create and export singleton instance
const performanceStreamingService = new PerformanceStreamingService();

export default performanceStreamingService;
