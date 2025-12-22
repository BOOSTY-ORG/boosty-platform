/**
 * Socket.IO Integration Service
 *
 * This service handles Socket.IO server setup and real-time notifications:
 * - Socket.IO server setup for real-time notifications
 * - Room management for user-specific notifications
 * - Event handling for different notification types
 * - Connection lifecycle management
 * - Broadcasting to multiple clients
 * - Integration with notification queue system
 */

import { Server } from 'socket.io';
import { createAdapter } from 'socket.io-redis-adapter';
import { createClient } from 'redis';
import realtimeMiddleware from '../../middleware/notification/realtimeNotification.middleware.js';
import Notification from '../../models/notification.model.js';
import UserNotificationPreferences from '../../models/userNotificationPreferences.model.js';

class SocketIOService {
  constructor() {
    this.io = null;
    this.redisClient = null;
    this.pubClient = null;
    this.subClient = null;
    this.logger = this.createLogger();
    this.isInitialized = false;
  }

  /**
   * Create a logger instance
   * @returns {object} - Logger instance
   */
  createLogger() {
    return {
      info: (message, data = {}) => {
        console.log(`[SocketIOService] INFO: ${message}`, data);
      },
      warn: (message, data = {}) => {
        console.warn(`[SocketIOService] WARN: ${message}`, data);
      },
      error: (message, error) => {
        console.error(`[SocketIOService] ERROR: ${message}`, error);
      },
    };
  }

  /**
   * Initialize Socket.IO server
   * @param {object} httpServer - HTTP server instance
   * @param {object} options - Configuration options
   */
  async initialize(httpServer, options = {}) {
    try {
      if (this.isInitialized) {
        this.logger.warn('Socket.IO service already initialized');
        return;
      }

      // Default configuration
      const defaultOptions = {
        cors: {
          origin: process.env.CORS_ORIGIN || '*',
          methods: ['GET', 'POST'],
          credentials: true,
          allowedHeaders: ['Content-Type', 'Authorization'],
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e8, // 100 MB
        allowEIO3: true, // Enable Engine.IO v3 protocol
        ...options,
      };

      // Create Socket.IO server
      this.io = new Server(httpServer, defaultOptions);

      // Setup Redis adapter for scaling
      await this.setupRedisAdapter();

      // Setup authentication middleware
      this.io.use(
        realtimeMiddleware.authenticateConnection.bind(realtimeMiddleware)
      );

      // Setup connection handlers
      this.setupConnectionHandlers();

      // Setup notification event handlers
      this.setupNotificationHandlers();

      // Start cleanup interval
      this.startCleanupInterval();

      this.isInitialized = true;
      this.logger.info('Socket.IO service initialized successfully');

      return this.io;
    } catch (error) {
      this.logger.error('Failed to initialize Socket.IO service', error);
      throw error;
    }
  }

  /**
   * Setup Redis adapter for scaling across multiple server instances
   */
  async setupRedisAdapter() {
    try {
      // Create Redis clients
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      this.pubClient = this.redisClient.duplicate();
      this.subClient = this.redisClient.duplicate();

      // Connect clients
      await Promise.all([
        this.redisClient.connect(),
        this.pubClient.connect(),
        this.subClient.connect(),
      ]);

      // Setup Redis adapter
      this.io.adapter(createAdapter(this.pubClient, this.subClient));

      this.logger.info('Redis adapter setup for Socket.IO');
    } catch (error) {
      this.logger.warn(
        'Failed to setup Redis adapter, falling back to memory adapter',
        error
      );
      // Continue without Redis adapter for development
    }
  }

  /**
   * Setup connection handlers
   */
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      realtimeMiddleware.handleConnection(socket, this.io);
    });

    this.io.on('connect_error', (error) => {
      this.logger.error('Socket.IO connection error', error);
    });

    this.io.engine.on('connection_error', (error) => {
      this.logger.error('Socket.IO engine connection error', error);
    });
  }

  /**
   * Setup notification event handlers
   */
  setupNotificationHandlers() {
    // Listen for notification events from other services
    this.io.on('notification:send', async (data) => {
      await this.handleNotificationSend(data);
    });

    this.io.on('notification:broadcast', async (data) => {
      await this.handleNotificationBroadcast(data);
    });

    this.io.on('notification:update', async (data) => {
      await this.handleNotificationUpdate(data);
    });

    this.io.on('notification:cancel', async (data) => {
      await this.handleNotificationCancel(data);
    });
  }

  /**
   * Handle single notification send
   * @param {object} data - Notification data
   */
  async handleNotificationSend(data) {
    try {
      const { userId, notification } = data;

      // Get notification from database if only ID is provided
      let notificationData = notification;
      if (typeof notification === 'string') {
        notificationData = await Notification.findById(notification);
      }

      if (!notificationData) {
        this.logger.error('Notification not found', {
          notificationId: notification,
        });
        return;
      }

      // Send to specific user
      await realtimeMiddleware.sendToUser(userId, notificationData, this.io);
    } catch (error) {
      this.logger.error('Failed to send notification', error);
    }
  }

  /**
   * Handle notification broadcast
   * @param {object} data - Broadcast data
   */
  async handleNotificationBroadcast(data) {
    try {
      const { userIds, notification } = data;

      // Get notification from database if only ID is provided
      let notificationData = notification;
      if (typeof notification === 'string') {
        notificationData = await Notification.findById(notification);
      }

      if (!notificationData) {
        this.logger.error('Notification not found for broadcast', {
          notificationId: notification,
        });
        return;
      }

      // Broadcast to multiple users
      await realtimeMiddleware.broadcastToUsers(
        userIds,
        notificationData,
        this.io
      );
    } catch (error) {
      this.logger.error('Failed to broadcast notification', error);
    }
  }

  /**
   * Handle notification update
   * @param {object} data - Update data
   */
  async handleNotificationUpdate(data) {
    try {
      const { notificationId, updates, userIds } = data;

      // Get updated notification
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        this.logger.error('Notification not found for update', {
          notificationId,
        });
        return;
      }

      // Send update to specific users or all connected users
      if (userIds && userIds.length > 0) {
        userIds.forEach((userId) => {
          this.io.to(`user:${userId}`).emit('notification_updated', {
            id: notificationId,
            updates,
            notification: notification,
            timestamp: new Date().toISOString(),
          });
        });
      } else {
        this.io.emit('notification_updated', {
          id: notificationId,
          updates,
          notification: notification,
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.info('Notification update sent', { notificationId, userIds });
    } catch (error) {
      this.logger.error('Failed to send notification update', error);
    }
  }

  /**
   * Handle notification cancellation
   * @param {object} data - Cancellation data
   */
  async handleNotificationCancel(data) {
    try {
      const { notificationId, userIds } = data;

      // Send cancellation to specific users or all connected users
      if (userIds && userIds.length > 0) {
        userIds.forEach((userId) => {
          this.io.to(`user:${userId}`).emit('notification_cancelled', {
            id: notificationId,
            timestamp: new Date().toISOString(),
          });
        });
      } else {
        this.io.emit('notification_cancelled', {
          id: notificationId,
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.info('Notification cancellation sent', {
        notificationId,
        userIds,
      });
    } catch (error) {
      this.logger.error('Failed to send notification cancellation', error);
    }
  }

  /**
   * Send notification to specific user
   * @param {string} userId - User ID
   * @param {object} notification - Notification data
   */
  async sendToUser(userId, notification) {
    if (!this.io) {
      this.logger.error('Socket.IO not initialized');
      return false;
    }

    return await realtimeMiddleware.sendToUser(userId, notification, this.io);
  }

  /**
   * Broadcast notification to multiple users
   * @param {array} userIds - Array of user IDs
   * @param {object} notification - Notification data
   */
  async broadcastToUsers(userIds, notification) {
    if (!this.io) {
      this.logger.error('Socket.IO not initialized');
      return { sent: 0, failed: userIds.length };
    }

    return await realtimeMiddleware.broadcastToUsers(
      userIds,
      notification,
      this.io
    );
  }

  /**
   * Send notification to room
   * @param {string} room - Room name
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  sendToRoom(room, event, data) {
    if (!this.io) {
      this.logger.error('Socket.IO not initialized');
      return;
    }

    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });

    this.logger.info('Message sent to room', { room, event });
  }

  /**
   * Send notification to category room
   * @param {string} category - Notification category
   * @param {object} notification - Notification data
   */
  sendToCategory(category, notification) {
    this.sendToRoom(`category:${category}`, 'notification', notification);
  }

  /**
   * Send notification to priority room
   * @param {string} priority - Notification priority
   * @param {object} notification - Notification data
   */
  sendToPriority(priority, notification) {
    this.sendToRoom(`priority:${priority}`, 'notification', notification);
  }

  /**
   * Send notification to channel room
   * @param {string} channel - Notification channel
   * @param {object} notification - Notification data
   */
  sendToChannel(channel, notification) {
    this.sendToRoom(`channel:${channel}`, 'notification', notification);
  }

  /**
   * Get server statistics
   * @returns {object} - Server statistics
   */
  getServerStats() {
    if (!this.io) {
      return null;
    }

    const sockets = this.io.sockets.sockets;
    const rooms = this.io.sockets.adapter.rooms;

    const stats = {
      connectedSockets: sockets.size,
      totalRooms: rooms.size,
      realtimeStats: realtimeMiddleware.getConnectionStats(),
      adapter: this.io.adapter.constructor.name,
      uptime: process.uptime(),
    };

    return stats;
  }

  /**
   * Get room information
   * @param {string} room - Room name
   * @returns {object} - Room information
   */
  getRoomInfo(room) {
    if (!this.io) {
      return null;
    }

    const roomInfo = this.io.sockets.adapter.rooms.get(room);
    if (!roomInfo) {
      return null;
    }

    return {
      name: room,
      size: roomInfo.size,
      sockets: Array.from(roomInfo),
    };
  }

  /**
   * Get all rooms
   * @returns {array} - Array of room information
   */
  getAllRooms() {
    if (!this.io) {
      return [];
    }

    const rooms = this.io.sockets.adapter.rooms;
    const roomInfo = [];

    rooms.forEach((sockets, room) => {
      // Skip socket ID rooms (private rooms)
      if (!sockets.has(room)) {
        roomInfo.push({
          name: room,
          size: sockets.size,
          sockets: Array.from(sockets),
        });
      }
    });

    return roomInfo;
  }

  /**
   * Disconnect all clients
   * @param {string} reason - Disconnection reason
   */
  disconnectAll(reason = 'Server shutdown') {
    if (!this.io) {
      return;
    }

    this.io.emit('server_shutdown', {
      message: 'Server is shutting down',
      reason,
      timestamp: new Date().toISOString(),
    });

    this.io.disconnectSockets(true);
    this.logger.info('All clients disconnected', { reason });
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    // Clean up stale connections every 5 minutes
    setInterval(
      () => {
        realtimeMiddleware.cleanupStaleConnections();
      },
      5 * 60 * 1000
    );

    this.logger.info('Cleanup interval started');
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      this.logger.info('Shutting down Socket.IO service');

      // Disconnect all clients
      this.disconnectAll('Server maintenance');

      // Close Redis connections
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      if (this.pubClient) {
        await this.pubClient.quit();
      }
      if (this.subClient) {
        await this.subClient.quit();
      }

      // Close server
      if (this.io) {
        this.io.close();
      }

      this.isInitialized = false;
      this.logger.info('Socket.IO service shutdown completed');
    } catch (error) {
      this.logger.error('Error during Socket.IO shutdown', error);
    }
  }
}

// Create singleton instance
const socketIOService = new SocketIOService();

export default socketIOService;
