/**
 * Real-time Notification Middleware
 *
 * This middleware handles real-time notification delivery through WebSocket and SSE:
 * - WebSocket connection management for real-time updates
 * - Server-Sent Events (SSE) implementation
 * - User session tracking for notification delivery
 * - Notification filtering and routing
 * - Connection authentication and authorization
 * - Heartbeat and connection health monitoring
 */

import jwt from 'jsonwebtoken';
import User from '../../models/user.model.js';
import UserNotificationPreferences from '../../models/userNotificationPreferences.model.js';
import {
  formatSuccessResponse,
  formatErrorResponse,
} from '../../utils/metrics/responseFormatter.util.js';

class RealtimeNotificationMiddleware {
  constructor() {
    this.connectedUsers = new Map(); // userId -> Set of connections
    this.userSessions = new Map(); // sessionId -> user info
    this.heartbeatIntervals = new Map(); // connectionId -> interval
    this.logger = this.createLogger();
  }

  /**
   * Create a logger instance
   * @returns {object} - Logger instance
   */
  createLogger() {
    return {
      info: (message, data = {}) => {
        console.log(`[RealtimeMiddleware] INFO: ${message}`, data);
      },
      warn: (message, data = {}) => {
        console.warn(`[RealtimeMiddleware] WARN: ${message}`, data);
      },
      error: (message, error) => {
        console.error(`[RealtimeMiddleware] ERROR: ${message}`, error);
      },
    };
  }

  /**
   * Authenticate WebSocket connection
   * @param {object} socket - Socket.IO socket instance
   * @param {function} next - Next middleware function
   */
  async authenticateConnection(socket, next) {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user information
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }

      // Get user preferences
      const preferences = await UserNotificationPreferences.findOne({
        userId: user._id,
      });

      // Store user info in socket
      socket.user = user;
      socket.preferences = preferences;
      socket.connectionType = 'websocket';
      socket.connectedAt = new Date();

      this.logger.info('User authenticated for real-time notifications', {
        userId: user._id,
        socketId: socket.id,
        connectionType: 'websocket',
      });

      next();
    } catch (error) {
      this.logger.error(
        'Authentication failed for real-time connection',
        error
      );
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Handle new WebSocket connection
   * @param {object} socket - Socket.IO socket instance
   * @param {object} io - Socket.IO server instance
   */
  handleConnection(socket, io) {
    const userId = socket.user._id.toString();
    const connectionInfo = {
      socketId: socket.id,
      userId,
      type: 'websocket',
      connectedAt: socket.connectedAt,
      lastActivity: new Date(),
      preferences: socket.preferences,
    };

    // Add connection to user's connection set
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(connectionInfo);

    // Add to session tracking
    this.userSessions.set(socket.id, connectionInfo);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join preference-based rooms
    this.joinPreferenceRooms(socket, socket.preferences);

    // Start heartbeat monitoring
    this.startHeartbeat(socket);

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to real-time notifications',
      userId,
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    this.logger.info('User connected to real-time notifications', {
      userId,
      socketId: socket.id,
      totalConnections: this.connectedUsers.get(userId)?.size || 0,
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle heartbeat response
    socket.on('pong', () => {
      this.updateLastActivity(socket.id);
    });

    // Handle preference updates
    socket.on('preferences_updated', (preferences) => {
      this.handlePreferenceUpdate(socket, preferences);
    });

    // Handle notification read status
    socket.on('mark_read', async (data) => {
      await this.handleMarkAsRead(socket, data);
    });

    // Handle notification actions
    socket.on('notification_action', async (data) => {
      await this.handleNotificationAction(socket, data);
    });
  }

  /**
   * Handle WebSocket disconnection
   * @param {object} socket - Socket.IO socket instance
   * @param {string} reason - Disconnection reason
   */
  handleDisconnection(socket, reason) {
    const userId = socket.user._id.toString();
    const socketId = socket.id;

    // Clear heartbeat interval
    if (this.heartbeatIntervals.has(socketId)) {
      clearInterval(this.heartbeatIntervals.get(socketId));
      this.heartbeatIntervals.delete(socketId);
    }

    // Remove from user connections
    if (this.connectedUsers.has(userId)) {
      const userConnections = this.connectedUsers.get(userId);
      userConnections.delete(socketId);

      // Clean up empty user connection sets
      if (userConnections.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    // Remove from session tracking
    this.userSessions.delete(socketId);

    // Leave all rooms
    socket.leaveAll();

    this.logger.info('User disconnected from real-time notifications', {
      userId,
      socketId,
      reason,
      remainingConnections: this.connectedUsers.get(userId)?.size || 0,
    });
  }

  /**
   * Join rooms based on user preferences
   * @param {object} socket - Socket.IO socket instance
   * @param {object} preferences - User notification preferences
   */
  joinPreferenceRooms(socket, preferences) {
    if (!preferences) return;

    // Join category rooms based on preferences
    Object.entries(preferences.categories || {}).forEach(
      ([category, config]) => {
        if (config.enabled) {
          socket.join(`category:${category}`);
        }
      }
    );

    // Join priority rooms
    ['urgent', 'high', 'medium', 'low'].forEach((priority) => {
      socket.join(`priority:${priority}`);
    });

    // Join channel rooms
    Object.entries(preferences.channels || {}).forEach(([channel, config]) => {
      if (config.enabled) {
        socket.join(`channel:${channel}`);
      }
    });
  }

  /**
   * Start heartbeat monitoring for connection
   * @param {object} socket - Socket.IO socket instance
   */
  startHeartbeat(socket) {
    const interval = setInterval(() => {
      socket.emit('ping', { timestamp: new Date().toISOString() });

      // Check for timeout (no pong response within 30 seconds)
      setTimeout(() => {
        const session = this.userSessions.get(socket.id);
        if (session && new Date() - session.lastActivity > 30000) {
          this.logger.warn('Connection timeout, disconnecting', {
            socketId: socket.id,
            userId: socket.user._id,
          });
          socket.disconnect(true);
        }
      }, 30000);
    }, 15000); // Send ping every 15 seconds

    this.heartbeatIntervals.set(socket.id, interval);
  }

  /**
   * Update last activity timestamp for connection
   * @param {string} socketId - Socket ID
   */
  updateLastActivity(socketId) {
    const session = this.userSessions.get(socketId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Handle preference update
   * @param {object} socket - Socket.IO socket instance
   * @param {object} preferences - Updated preferences
   */
  async handlePreferenceUpdate(socket, preferences) {
    try {
      // Update preferences in session
      const session = this.userSessions.get(socket.id);
      if (session) {
        session.preferences = preferences;
      }

      // Leave all current rooms and rejoin based on new preferences
      socket.leaveAll();
      socket.join(`user:${socket.user._id}`);
      this.joinPreferenceRooms(socket, preferences);

      this.logger.info('User preferences updated for real-time notifications', {
        userId: socket.user._id,
        socketId: socket.id,
      });

      socket.emit('preferences_updated', {
        message: 'Preferences updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        'Failed to update preferences for real-time connection',
        error
      );
      socket.emit('error', {
        message: 'Failed to update preferences',
        error: error.message,
      });
    }
  }

  /**
   * Handle mark as read request
   * @param {object} socket - Socket.IO socket instance
   * @param {object} data - Request data
   */
  async handleMarkAsRead(socket, data) {
    try {
      const { notificationId, channels = [] } = data;

      // Import here to avoid circular dependency
      const { default: NotificationService } = await import(
        '../../services/notification/notification.service.js'
      );
      const notificationService = new NotificationService();

      await notificationService.markAsRead(notificationId, channels);

      socket.emit('marked_read', {
        notificationId,
        channels,
        timestamp: new Date().toISOString(),
      });

      this.logger.info('Notification marked as read via real-time connection', {
        userId: socket.user._id,
        notificationId,
        channels,
      });
    } catch (error) {
      this.logger.error('Failed to mark notification as read', error);
      socket.emit('error', {
        message: 'Failed to mark notification as read',
        error: error.message,
      });
    }
  }

  /**
   * Handle notification action
   * @param {object} socket - Socket.IO socket instance
   * @param {object} data - Action data
   */
  async handleNotificationAction(socket, data) {
    try {
      const { notificationId, action, payload } = data;

      // Here you can implement custom notification actions
      // For example: approve, reject, dismiss, etc.

      this.logger.info('Notification action received', {
        userId: socket.user._id,
        notificationId,
        action,
        payload,
      });

      socket.emit('action_processed', {
        notificationId,
        action,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to process notification action', error);
      socket.emit('error', {
        message: 'Failed to process action',
        error: error.message,
      });
    }
  }

  /**
   * Send notification to specific user
   * @param {string} userId - User ID
   * @param {object} notification - Notification data
   * @param {object} io - Socket.IO server instance
   */
  async sendToUser(userId, notification, io) {
    const connections = this.connectedUsers.get(userId?.toString());
    if (!connections || connections.size === 0) {
      this.logger.info('No active connections for user', { userId });
      return false;
    }

    // Check user preferences before sending
    const shouldSend = await this.shouldSendNotification(userId, notification);
    if (!shouldSend) {
      this.logger.info('Notification filtered by user preferences', {
        userId,
        notificationId: notification._id,
      });
      return false;
    }

    // Send to all user connections
    let sentCount = 0;
    connections.forEach((connection) => {
      io.to(connection.socketId).emit('notification', {
        id: notification._id,
        type: notification.type,
        category: notification.category,
        priority: notification.priority,
        subject: notification.subject,
        content: notification.content,
        htmlContent: notification.htmlContent,
        channels: notification.channels,
        status: notification.status,
        createdAt: notification.createdAt,
        variables: notification.variables,
        metadata: notification.metadata,
      });

      sentCount++;
    });

    this.logger.info('Notification sent via real-time connection', {
      userId,
      notificationId: notification._id,
      sentCount,
      connectionsCount: connections.size,
    });

    return sentCount > 0;
  }

  /**
   * Broadcast notification to multiple users
   * @param {array} userIds - Array of user IDs
   * @param {object} notification - Notification data
   * @param {object} io - Socket.IO server instance
   */
  async broadcastToUsers(userIds, notification, io) {
    const results = {
      total: userIds.length,
      sent: 0,
      filtered: 0,
      failed: 0,
    };

    for (const userId of userIds) {
      try {
        const sent = await this.sendToUser(userId, notification, io);
        if (sent) {
          results.sent++;
        } else {
          results.filtered++;
        }
      } catch (error) {
        results.failed++;
        this.logger.error('Failed to send notification to user', {
          userId,
          error: error.message,
        });
      }
    }

    this.logger.info('Broadcast notification completed', {
      notificationId: notification._id,
      results,
    });

    return results;
  }

  /**
   * Check if notification should be sent based on user preferences
   * @param {string} userId - User ID
   * @param {object} notification - Notification data
   * @returns {boolean} - Should send notification
   */
  async shouldSendNotification(userId, notification) {
    try {
      const preferences = await UserNotificationPreferences.findOne({ userId });
      if (!preferences) {
        return true; // Send if no preferences exist
      }

      // Check global enabled status
      if (!preferences.globalEnabled) {
        return false;
      }

      // Check quiet hours
      if (
        preferences.quietHours?.enabled &&
        notification.priority !== 'urgent'
      ) {
        const now = new Date();
        const userTime = this.getUserTime(now, preferences.quietHours.timezone);

        if (this.isInQuietHours(userTime, preferences.quietHours)) {
          return false;
        }
      }

      // Check category preferences
      const categoryPref = preferences.categories?.[notification.category];
      if (!categoryPref?.enabled) {
        return false;
      }

      // Check if any preferred channels match
      const preferredChannels = categoryPref.channels || [];
      const hasMatchingChannel = notification.channels.some((channel) =>
        preferredChannels.includes(channel)
      );

      return hasMatchingChannel;
    } catch (error) {
      this.logger.error('Error checking notification preferences', error);
      return true; // Send on error to avoid missing notifications
    }
  }

  /**
   * Get user time in their timezone
   * @param {Date} date - Date object
   * @param {string} timezone - User timezone
   * @returns {Date} - Date in user timezone
   */
  getUserTime(date, timezone = 'UTC') {
    return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  }

  /**
   * Check if current time is in quiet hours
   * @param {Date} userTime - User's current time
   * @param {object} quietHours - Quiet hours configuration
   * @returns {boolean} - Is in quiet hours
   */
  isInQuietHours(userTime, quietHours) {
    const currentTime = userTime.getHours() * 60 + userTime.getMinutes();

    const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = quietHours.endTime.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      // Same day range (e.g., 22:00 - 08:00)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight range (e.g., 22:00 - 08:00 next day)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Get connection statistics
   * @returns {object} - Connection statistics
   */
  getConnectionStats() {
    const totalConnections = this.userSessions.size;
    const totalUsers = this.connectedUsers.size;
    const connectionsByType = {};
    const connectionsByHour = {};

    this.userSessions.forEach((session) => {
      // Count by type
      connectionsByType[session.type] =
        (connectionsByType[session.type] || 0) + 1;

      // Count by hour
      const hour = session.connectedAt.getHours();
      connectionsByHour[hour] = (connectionsByHour[hour] || 0) + 1;
    });

    return {
      totalConnections,
      totalUsers,
      connectionsByType,
      connectionsByHour,
      averageConnectionsPerUser:
        totalUsers > 0 ? totalConnections / totalUsers : 0,
    };
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections() {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    this.userSessions.forEach((session, socketId) => {
      if (now - session.lastActivity > staleThreshold) {
        this.logger.info('Cleaning up stale connection', {
          socketId,
          userId: session.userId,
          lastActivity: session.lastActivity,
        });

        // Remove from tracking
        this.userSessions.delete(socketId);

        if (this.heartbeatIntervals.has(socketId)) {
          clearInterval(this.heartbeatIntervals.get(socketId));
          this.heartbeatIntervals.delete(socketId);
        }

        // Remove from user connections
        if (this.connectedUsers.has(session.userId)) {
          this.connectedUsers.get(session.userId).delete(socketId);
          if (this.connectedUsers.get(session.userId).size === 0) {
            this.connectedUsers.delete(session.userId);
          }
        }
      }
    });
  }
}

// Create singleton instance
const realtimeMiddleware = new RealtimeNotificationMiddleware();

export default realtimeMiddleware;
