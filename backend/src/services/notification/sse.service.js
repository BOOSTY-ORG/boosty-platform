/**
 * Server-Sent Events (SSE) Service
 *
 * This service handles SSE implementation for real-time notifications:
 * - Server-Sent Events implementation
 * - Client connection management
 * - Event streaming for notifications
 * - Connection retry and error handling
 * - Last event ID tracking for resume capability
 */

import User from '../../models/user.model.js';
import UserNotificationPreferences from '../../models/userNotificationPreferences.model.js';
import Notification from '../../models/notification.model.js';
import { authenticateSSE } from '../../middleware/notification/realtimeAuth.middleware.js';

class SSEService {
  constructor() {
    this.connections = new Map(); // userId -> Set of SSE connections
    this.connectionDetails = new Map(); // connectionId -> connection details
    this.eventIdCounter = 0;
    this.logger = this.createLogger();
  }

  /**
   * Create a logger instance
   * @returns {object} - Logger instance
   */
  createLogger() {
    return {
      info: (message, data = {}) => {
        console.log(`[SSEService] INFO: ${message}`, data);
      },
      warn: (message, data = {}) => {
        console.warn(`[SSEService] WARN: ${message}`, data);
      },
      error: (message, error) => {
        console.error(`[SSEService] ERROR: ${message}`, error);
      },
    };
  }

  /**
   * Authenticate SSE connection
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @returns {Promise<object>} - Authentication result
   */
  async authenticateConnection(req, res) {
    try {
      const token =
        req.query.token || req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return { success: false, error: 'Authentication token required' };
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user information
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Get user preferences
      const preferences = await UserNotificationPreferences.findOne({
        userId: user._id,
      });

      return {
        success: true,
        user,
        preferences,
        userId: user._id.toString(),
      };
    } catch (error) {
      this.logger.error('SSE authentication failed', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Setup SSE connection
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async setupConnection(req, res) {
    const connectionId = this.generateConnectionId();
    let isAuthenticated = false;
    let userId = null;
    let user = null;
    let preferences = null;

    try {
      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      // Authenticate connection
      const authResult = await this.authenticateConnection(req, res);
      if (!authResult.success) {
        this.sendError(res, 'authentication_error', authResult.error);
        res.end();
        return;
      }

      isAuthenticated = true;
      userId = authResult.userId;
      user = authResult.user;
      preferences = authResult.preferences;

      // Store connection details
      const connectionDetails = {
        id: connectionId,
        userId,
        user,
        preferences,
        req,
        res,
        connectedAt: new Date(),
        lastActivity: new Date(),
        lastEventId: req.headers['last-event-id'] || 0,
        isAlive: true,
      };

      this.connectionDetails.set(connectionId, connectionDetails);

      // Add to user connections
      if (!this.connections.has(userId)) {
        this.connections.set(userId, new Set());
      }
      this.connections.get(userId).add(connectionId);

      // Send initial connection event
      this.sendEvent(res, 'connected', {
        connectionId,
        userId,
        timestamp: new Date().toISOString(),
        message: 'Connected to real-time notifications via SSE',
      });

      // Send missed events if lastEventId is provided
      if (connectionDetails.lastEventId > 0) {
        await this.sendMissedEvents(res, userId, connectionDetails.lastEventId);
      }

      this.logger.info('SSE connection established', {
        connectionId,
        userId,
        totalConnections: this.connections.get(userId)?.size || 0,
      });

      // Handle connection cleanup on disconnect
      req.on('close', () => {
        this.handleDisconnection(connectionId);
      });

      req.on('aborted', () => {
        this.handleDisconnection(connectionId);
      });

      // Send periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        if (connectionDetails.isAlive) {
          this.sendHeartbeat(res);
        } else {
          clearInterval(heartbeatInterval);
          this.handleDisconnection(connectionId);
        }
      }, 30000); // 30 seconds

      // Handle client ping
      req.on('data', (data) => {
        connectionDetails.lastActivity = new Date();
        connectionDetails.isAlive = true;

        try {
          const message = data.toString().trim();
          if (message === 'ping') {
            this.sendEvent(res, 'pong', {
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          this.logger.error('Error processing client message', error);
        }
      });
    } catch (error) {
      this.logger.error('Error setting up SSE connection', error);

      if (isAuthenticated && res && !res.headersSent) {
        this.sendError(
          res,
          'connection_error',
          'Failed to establish connection'
        );
        res.end();
      }

      if (connectionId) {
        this.handleDisconnection(connectionId);
      }
    }
  }

  /**
   * Handle connection disconnection
   * @param {string} connectionId - Connection ID
   */
  handleDisconnection(connectionId) {
    const connectionDetails = this.connectionDetails.get(connectionId);
    if (!connectionDetails) {
      return;
    }

    const { userId, res } = connectionDetails;

    // Remove from user connections
    if (this.connections.has(userId)) {
      this.connections.get(userId).delete(connectionId);

      // Clean up empty user connection sets
      if (this.connections.get(userId).size === 0) {
        this.connections.delete(userId);
      }
    }

    // Remove connection details
    this.connectionDetails.delete(connectionId);

    // Mark as not alive
    connectionDetails.isAlive = false;

    this.logger.info('SSE connection disconnected', {
      connectionId,
      userId,
      remainingConnections: this.connections.get(userId)?.size || 0,
    });
  }

  /**
   * Send event to SSE connection
   * @param {object} res - Express response object
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  sendEvent(res, event, data) {
    try {
      const eventId = ++this.eventIdCounter;
      const eventData = JSON.stringify(data);

      res.write(`id: ${eventId}\n`);
      res.write(`event: ${event}\n`);
      res.write(`data: ${eventData}\n\n`);

      return eventId;
    } catch (error) {
      this.logger.error('Error sending SSE event', error);
      return null;
    }
  }

  /**
   * Send error event
   * @param {object} res - Express response object
   * @param {string} error - Error type
   * @param {string} message - Error message
   */
  sendError(res, error, message) {
    this.sendEvent(res, 'error', {
      error,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send heartbeat event
   * @param {object} res - Express response object
   */
  sendHeartbeat(res) {
    this.sendEvent(res, 'heartbeat', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send notification to user via SSE
   * @param {string} userId - User ID
   * @param {object} notification - Notification data
   * @returns {Promise<boolean>} - Send success
   */
  async sendToUser(userId, notification) {
    const userConnections = this.connections.get(userId?.toString());
    if (!userConnections || userConnections.size === 0) {
      this.logger.info('No SSE connections for user', { userId });
      return false;
    }

    // Check user preferences before sending
    const shouldSend = await this.shouldSendNotification(userId, notification);
    if (!shouldSend) {
      this.logger.info('Notification filtered by user preferences for SSE', {
        userId,
        notificationId: notification._id,
      });
      return false;
    }

    let sentCount = 0;
    userConnections.forEach((connectionId) => {
      const connectionDetails = this.connectionDetails.get(connectionId);
      if (connectionDetails && connectionDetails.isAlive) {
        this.sendEvent(connectionDetails.res, 'notification', {
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
      }
    });

    this.logger.info('Notification sent via SSE', {
      userId,
      notificationId: notification._id,
      sentCount,
      connectionsCount: userConnections.size,
    });

    return sentCount > 0;
  }

  /**
   * Broadcast notification to multiple users via SSE
   * @param {array} userIds - Array of user IDs
   * @param {object} notification - Notification data
   * @returns {Promise<object>} - Broadcast results
   */
  async broadcastToUsers(userIds, notification) {
    const results = {
      total: userIds.length,
      sent: 0,
      filtered: 0,
      failed: 0,
    };

    for (const userId of userIds) {
      try {
        const sent = await this.sendToUser(userId, notification);
        if (sent) {
          results.sent++;
        } else {
          results.filtered++;
        }
      } catch (error) {
        results.failed++;
        this.logger.error('Failed to send SSE notification to user', {
          userId,
          error: error.message,
        });
      }
    }

    this.logger.info('SSE broadcast notification completed', {
      notificationId: notification._id,
      results,
    });

    return results;
  }

  /**
   * Send missed events to reconnected client
   * @param {object} res - Express response object
   * @param {string} userId - User ID
   * @param {number} lastEventId - Last event ID received by client
   */
  async sendMissedEvents(res, userId, lastEventId) {
    try {
      // Get notifications created after the last event ID
      const notifications = await Notification.find({
        userId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      })
        .sort({ createdAt: 1 })
        .limit(50); // Limit to prevent overload

      for (const notification of notifications) {
        this.sendEvent(res, 'notification', {
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
          missed: true,
        });
      }

      this.logger.info('Sent missed events to reconnected client', {
        userId,
        lastEventId,
        missedCount: notifications.length,
      });
    } catch (error) {
      this.logger.error('Error sending missed events', error);
    }
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

      // Check if SSE is enabled for any preferred channels
      const preferredChannels = categoryPref.channels || [];
      const hasSSEChannel = preferredChannels.includes('in_app');

      return hasSSEChannel;
    } catch (error) {
      this.logger.error('Error checking SSE notification preferences', error);
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
   * Generate unique connection ID
   * @returns {string} - Connection ID
   */
  generateConnectionId() {
    return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection statistics
   * @returns {object} - Connection statistics
   */
  getConnectionStats() {
    const totalConnections = this.connectionDetails.size;
    const totalUsers = this.connections.size;
    const connectionsByHour = {};

    this.connectionDetails.forEach((connection) => {
      // Count by hour
      const hour = connection.connectedAt.getHours();
      connectionsByHour[hour] = (connectionsByHour[hour] || 0) + 1;
    });

    return {
      totalConnections,
      totalUsers,
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

    this.connectionDetails.forEach((connection, connectionId) => {
      if (
        !connection.isAlive ||
        now - connection.lastActivity > staleThreshold
      ) {
        this.logger.info('Cleaning up stale SSE connection', {
          connectionId,
          userId: connection.userId,
          lastActivity: connection.lastActivity,
        });

        // Remove from tracking
        this.connectionDetails.delete(connectionId);

        // Remove from user connections
        if (this.connections.has(connection.userId)) {
          this.connections.get(connection.userId).delete(connectionId);
          if (this.connections.get(connection.userId).size === 0) {
            this.connections.delete(connection.userId);
          }
        }
      }
    });
  }

  /**
   * Disconnect all SSE connections
   */
  disconnectAll() {
    this.connectionDetails.forEach((connection) => {
      try {
        this.sendEvent(connection.res, 'server_shutdown', {
          message: 'Server is shutting down',
          timestamp: new Date().toISOString(),
        });
        connection.res.end();
      } catch (error) {
        this.logger.error(
          'Error sending shutdown event to SSE connection',
          error
        );
      }
    });

    this.connections.clear();
    this.connectionDetails.clear();
    this.logger.info('All SSE connections disconnected');
  }
}

// Create singleton instance
const sseService = new SSEService();

export default sseService;
