import api from "../api/index.js";
import {
  REALTIME_CONNECTION_TYPES,
  REALTIME_EVENT_TYPES,
  WEBSOCKET_CONFIG,
  SSE_CONFIG,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  ERROR_MESSAGES,
} from "../api/notificationConstants.js";

/**
 * Enhanced real-time notification service with WebSocket and SSE support
 * Features connection management, auto-reconnection, event handling, and offline support
 */
class RealtimeNotificationService {
  constructor() {
    // Connection state
    this.websocketConnection = null;
    this.sseConnection = null;
    this.connectionType = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.userId = null;
    this.connectionPromise = null;

    // Event handling
    this.eventHandlers = new Map();
    this.messageQueue = [];
    this.isOnline = navigator.onLine;

    // Health monitoring
    this.heartbeatInterval = null;
    this.connectionHealthCheck = null;
    this.lastMessageTime = null;
    this.connectionStartTime = null;

    // Configuration
    this.config = {
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      reconnectMaxDelay: 30000,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      messageQueueSize: 100,
      healthCheckInterval: 60000,
    };

    // Bind methods to maintain context
    this.handleOnlineStatus = this.handleOnlineStatus.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

    // Set up event listeners for browser events
    this.setupBrowserEventListeners();
  }

  /**
   * Set up browser event listeners for online/offline and visibility changes
   */
  setupBrowserEventListeners() {
    window.addEventListener("online", this.handleOnlineStatus);
    window.addEventListener("offline", this.handleOnlineStatus);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  /**
   * Handle browser online/offline status changes
   * @param {Event} event - Online/offline event
   */
  handleOnlineStatus(event) {
    const wasOnline = this.isOnline;
    this.isOnline = navigator.onLine;

    if (this.isOnline && !wasOnline) {
      console.log("Browser is back online, attempting to reconnect...");
      this.attemptReconnect();
    } else if (!this.isOnline && wasOnline) {
      console.log("Browser is offline, connection will be paused");
      this.pauseConnection();
    }
  }

  /**
   * Handle page visibility changes
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden, reduce heartbeat frequency
      this.reduceHeartbeatFrequency();
    } else {
      // Page is visible, restore normal heartbeat
      this.restoreHeartbeatFrequency();
      // Check connection health when page becomes visible
      this.checkConnectionHealth();
    }
  }

  /**
   * Connect to real-time notification service
   * @param {string} userId - User ID for connection
   * @param {Object} preferences - User preferences for connection type
   * @returns {Promise<boolean>} Connection success status
   */
  async connect(userId, preferences = {}) {
    // Prevent multiple connection attempts
    if (this.isConnecting) {
      return this.connectionPromise;
    }

    if (this.isConnected) {
      console.log("Already connected to real-time service");
      return true;
    }

    this.isConnecting = true;
    this.connectionPromise = this._performConnection(userId, preferences);

    try {
      const result = await this.connectionPromise;
      this.isConnecting = false;
      this.connectionPromise = null;
      return result;
    } catch (error) {
      this.isConnecting = false;
      this.connectionPromise = null;
      throw error;
    }
  }

  /**
   * Perform the actual connection
   * @param {string} userId - User ID for connection
   * @param {Object} preferences - User preferences for connection type
   * @returns {Promise<boolean>} Connection success status
   * @private
   */
  async _performConnection(userId, preferences = {}) {
    try {
      this.userId = userId;
      this.connectionType =
        preferences.realtimeConnectionType || REALTIME_CONNECTION_TYPES.SSE;
      this.connectionStartTime = Date.now();

      console.log(
        `Connecting to real-time service with ${this.connectionType} for user ${userId}`
      );

      if (this.connectionType === REALTIME_CONNECTION_TYPES.WEBSOCKET) {
        return await this.connectWebSocket(userId);
      } else if (this.connectionType === REALTIME_CONNECTION_TYPES.SSE) {
        return await this.connectSSE(userId);
      } else if (this.connectionType === REALTIME_CONNECTION_TYPES.BOTH) {
        // Try WebSocket first, fallback to SSE
        try {
          return await this.connectWebSocket(userId);
        } catch (error) {
          console.warn(
            "WebSocket connection failed, falling back to SSE:",
            error
          );
          this.connectionType = REALTIME_CONNECTION_TYPES.SSE;
          return await this.connectSSE(userId);
        }
      }

      return false;
    } catch (error) {
      console.error("Real-time connection failed:", error);
      this.isConnected = false;
      this.emitConnectionStatus("disconnected", error.message);
      throw error;
    }
  }

  /**
   * Connect using WebSocket with enhanced error handling
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Connection success status
   */
  async connectWebSocket(userId) {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${api.defaults.baseURL.replace("http", "ws")}/api/notifications/realtime/ws/${userId}`;
        this.websocketConnection = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            this.websocketConnection.close();
            reject(new Error("WebSocket connection timeout"));
          }
        }, this.config.connectionTimeout);

        this.websocketConnection.onopen = () => {
          console.log("WebSocket connection established");
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.startHealthMonitoring();
          this.emitConnectionStatus("connected");
          this.processMessageQueue();
          resolve(true);
        };

        this.websocketConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.lastMessageTime = Date.now();
            this.handleRealtimeEvent(data);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.websocketConnection.onclose = (event) => {
          console.log("WebSocket connection closed", event.code, event.reason);
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          this.stopHeartbeat();
          this.stopHealthMonitoring();
          this.emitConnectionStatus("disconnected", event.reason);

          // Only attempt reconnect if not a normal closure
          if (event.code !== 1000) {
            this.attemptReconnect();
          }
        };

        this.websocketConnection.onerror = (error) => {
          console.error("WebSocket error:", error);
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Connect using Server-Sent Events with enhanced error handling
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Connection success status
   */
  async connectSSE(userId) {
    return new Promise((resolve, reject) => {
      try {
        const sseUrl = `${api.defaults.baseURL}/api/notifications/realtime/sse/${userId}`;
        this.sseConnection = new EventSource(sseUrl);

        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            this.sseConnection.close();
            reject(new Error("SSE connection timeout"));
          }
        }, this.config.connectionTimeout);

        this.sseConnection.onopen = () => {
          console.log("SSE connection established");
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHealthMonitoring();
          this.emitConnectionStatus("connected");
          this.processMessageQueue();
          resolve(true);
        };

        this.sseConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.lastMessageTime = Date.now();
            this.handleRealtimeEvent(data);
          } catch (error) {
            console.error("Error parsing SSE message:", error);
          }
        };

        this.sseConnection.onerror = (error) => {
          console.error("SSE error:", error);
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          this.stopHealthMonitoring();
          this.emitConnectionStatus("disconnected");

          // SSE connections automatically retry, but we'll handle it manually
          this.attemptReconnect();
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle real-time events with validation and routing
   * @param {Object} event - Event data
   */
  handleRealtimeEvent(event) {
    if (!event || typeof event !== "object") {
      console.error("Invalid event format:", event);
      return;
    }

    const { type, data, timestamp } = event;

    // Validate event structure
    if (!type) {
      console.error("Event missing type:", event);
      return;
    }

    // Add timestamp if not present
    if (!timestamp) {
      event.timestamp = new Date().toISOString();
    }

    // Handle connection status events
    if (type === REALTIME_EVENT_TYPES.CONNECTION_STATUS) {
      this.handleConnectionStatusEvent(data);
      return;
    }

    // Route to specific handlers
    if (this.eventHandlers.has(type)) {
      const handlers = this.eventHandlers.get(type);
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${type}:`, error);
        }
      });
    }

    // Handle specific notification events
    this.handleNotificationEvent(type, data);
  }

  /**
   * Handle notification-specific events
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  handleNotificationEvent(eventType, data) {
    switch (eventType) {
      case REALTIME_EVENT_TYPES.NOTIFICATION_NEW:
        this.handleNewNotification(data);
        break;
      case REALTIME_EVENT_TYPES.NOTIFICATION_UPDATE:
        this.handleNotificationUpdate(data);
        break;
      case REALTIME_EVENT_TYPES.NOTIFICATION_DELETE:
        this.handleNotificationDelete(data);
        break;
      case REALTIME_EVENT_TYPES.NOTIFICATION_READ:
        this.handleNotificationRead(data);
        break;
      case REALTIME_EVENT_TYPES.PREFERENCE_UPDATE:
        this.handlePreferenceUpdate(data);
        break;
      default:
        console.log("Unhandled event type:", eventType);
    }
  }

  /**
   * Handle new notification event
   * @param {Object} notification - Notification data
   */
  handleNewNotification(notification) {
    // Validate notification structure
    if (!notification.id || !notification.message) {
      console.error("Invalid notification structure:", notification);
      return;
    }

    // Add default values if missing
    const enhancedNotification = {
      type: NOTIFICATION_TYPES.INFO,
      priority: NOTIFICATION_PRIORITIES.NORMAL,
      read: false,
      timestamp: new Date().toISOString(),
      ...notification,
    };

    // Emit to general notification handlers
    this.emitToHandlers(
      REALTIME_EVENT_TYPES.NOTIFICATION_NEW,
      enhancedNotification
    );
  }

  /**
   * Handle notification update event
   * @param {Object} notification - Updated notification data
   */
  handleNotificationUpdate(notification) {
    if (!notification.id) {
      console.error("Invalid notification update structure:", notification);
      return;
    }

    this.emitToHandlers(REALTIME_EVENT_TYPES.NOTIFICATION_UPDATE, notification);
  }

  /**
   * Handle notification delete event
   * @param {Object} data - Delete event data
   */
  handleNotificationDelete(data) {
    if (!data.id) {
      console.error("Invalid notification delete structure:", data);
      return;
    }

    this.emitToHandlers(REALTIME_EVENT_TYPES.NOTIFICATION_DELETE, data);
  }

  /**
   * Handle notification read event
   * @param {Object} data - Read event data
   */
  handleNotificationRead(data) {
    if (!data.id) {
      console.error("Invalid notification read structure:", data);
      return;
    }

    this.emitToHandlers(REALTIME_EVENT_TYPES.NOTIFICATION_READ, data);
  }

  /**
   * Handle preference update event
   * @param {Object} preferences - Updated preferences
   */
  handlePreferenceUpdate(preferences) {
    this.emitToHandlers(REALTIME_EVENT_TYPES.PREFERENCE_UPDATE, preferences);
  }

  /**
   * Handle connection status events
   * @param {Object} data - Connection status data
   */
  handleConnectionStatusEvent(data) {
    if (data.status === "connected") {
      this.isConnected = true;
    } else if (data.status === "disconnected") {
      this.isConnected = false;
    }

    this.emitToHandlers(REALTIME_EVENT_TYPES.CONNECTION_STATUS, data);
  }

  /**
   * Emit event to all registered handlers
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  emitToHandlers(eventType, data) {
    if (this.eventHandlers.has(eventType)) {
      const handlers = this.eventHandlers.get(eventType);
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in handler for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Emit connection status event
   * @param {string} status - Connection status
   * @param {string} message - Optional status message
   */
  emitConnectionStatus(status, message = "") {
    this.emitToHandlers(REALTIME_EVENT_TYPES.CONNECTION_STATUS, {
      status,
      message,
      timestamp: new Date().toISOString(),
      connectionType: this.connectionType,
      userId: this.userId,
    });
  }

  /**
   * Subscribe to real-time events
   * @param {string} eventType - Event type to subscribe to
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }

    this.eventHandlers.get(eventType).push(handler);

    // Return unsubscribe function
    return () => this.unsubscribe(eventType, handler);
  }

  /**
   * Unsubscribe from real-time events
   * @param {string} eventType - Event type to unsubscribe from
   * @param {Function} handler - Event handler function to remove
   */
  unsubscribe(eventType, handler) {
    if (this.eventHandlers.has(eventType)) {
      const handlers = this.eventHandlers.get(eventType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.eventHandlers.delete(eventType);
      }
    }
  }

  /**
   * Attempt to reconnect to real-time service with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error("Max reconnect attempts reached");
      this.emitConnectionStatus(
        "failed",
        "Maximum reconnection attempts reached"
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.reconnectMaxDelay
    );

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      if (this.userId && this.isOnline) {
        this.connect(this.userId);
      }
    }, delay);
  }

  /**
   * Start heartbeat for connection monitoring
   */
  startHeartbeat() {
    if (
      this.connectionType === REALTIME_CONNECTION_TYPES.WEBSOCKET &&
      this.websocketConnection
    ) {
      this.heartbeatInterval = setInterval(() => {
        if (this.websocketConnection.readyState === WebSocket.OPEN) {
          this.websocketConnection.send(
            JSON.stringify({ type: "ping", timestamp: Date.now() })
          );
        }
      }, this.config.heartbeatInterval);
    }
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Reduce heartbeat frequency when page is hidden
   */
  reduceHeartbeatFrequency() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = setInterval(() => {
        if (
          this.websocketConnection &&
          this.websocketConnection.readyState === WebSocket.OPEN
        ) {
          this.websocketConnection.send(
            JSON.stringify({ type: "ping", timestamp: Date.now() })
          );
        }
      }, this.config.heartbeatInterval * 2); // Double the interval
    }
  }

  /**
   * Restore normal heartbeat frequency
   */
  restoreHeartbeatFrequency() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.startHeartbeat();
    }
  }

  /**
   * Start health monitoring for connection
   */
  startHealthMonitoring() {
    this.connectionHealthCheck = setInterval(() => {
      this.checkConnectionHealth();
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.connectionHealthCheck) {
      clearInterval(this.connectionHealthCheck);
      this.connectionHealthCheck = null;
    }
  }

  /**
   * Check connection health and take action if needed
   */
  checkConnectionHealth() {
    if (!this.isConnected) return;

    const now = Date.now();
    const timeSinceLastMessage = this.lastMessageTime
      ? now - this.lastMessageTime
      : now - this.connectionStartTime;

    // If no messages for too long, check connection
    if (timeSinceLastMessage > this.config.healthCheckInterval * 2) {
      console.warn("Connection health check: No messages received recently");

      // Send a ping if WebSocket
      if (
        this.connectionType === REALTIME_CONNECTION_TYPES.WEBSOCKET &&
        this.websocketConnection &&
        this.websocketConnection.readyState === WebSocket.OPEN
      ) {
        this.websocketConnection.send(
          JSON.stringify({ type: "ping", timestamp: now })
        );
      }
    }
  }

  /**
   * Pause connection when offline
   */
  pauseConnection() {
    this.isConnected = false;
    this.emitConnectionStatus("paused", "Browser is offline");
  }

  /**
   * Queue message when offline
   * @param {Object} message - Message to queue
   */
  queueMessage(message) {
    if (this.messageQueue.length >= this.config.messageQueueSize) {
      // Remove oldest message if queue is full
      this.messageQueue.shift();
    }

    this.messageQueue.push({
      ...message,
      queuedAt: Date.now(),
    });
  }

  /**
   * Process queued messages when connection is restored
   */
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`Processing ${this.messageQueue.length} queued messages`);

    const queuedMessages = [...this.messageQueue];
    this.messageQueue = [];

    queuedMessages.forEach((queuedMessage) => {
      this.handleRealtimeEvent(queuedMessage);
    });
  }

  /**
   * Send a message through the current connection
   * @param {Object} message - Message to send
   * @returns {boolean} Send success status
   */
  sendMessage(message) {
    if (!this.isConnected) {
      this.queueMessage(message);
      return false;
    }

    try {
      const messageData = {
        ...message,
        timestamp: Date.now(),
        userId: this.userId,
      };

      if (
        this.connectionType === REALTIME_CONNECTION_TYPES.WEBSOCKET &&
        this.websocketConnection &&
        this.websocketConnection.readyState === WebSocket.OPEN
      ) {
        this.websocketConnection.send(JSON.stringify(messageData));
        return true;
      }

      // SSE doesn't support client-to-server messaging
      console.warn("SSE connections do not support client-to-server messaging");
      return false;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getConnectionStats() {
    return {
      isConnected: this.isConnected,
      connectionType: this.connectionType,
      reconnectAttempts: this.reconnectAttempts,
      userId: this.userId,
      isOnline: this.isOnline,
      connectionStartTime: this.connectionStartTime,
      lastMessageTime: this.lastMessageTime,
      queuedMessages: this.messageQueue.length,
    };
  }

  /**
   * Disconnect from real-time service
   */
  disconnect() {
    console.log("Disconnecting from real-time service");

    this.isConnected = false;
    this.stopHeartbeat();
    this.stopHealthMonitoring();

    if (this.websocketConnection) {
      this.websocketConnection.close(1000, "Client disconnect");
      this.websocketConnection = null;
    }

    if (this.sseConnection) {
      this.sseConnection.close();
      this.sseConnection = null;
    }

    this.eventHandlers.clear();
    this.messageQueue = [];
    this.userId = null;
    this.reconnectAttempts = 0;
    this.connectionStartTime = null;
    this.lastMessageTime = null;

    this.emitConnectionStatus("disconnected", "Client disconnected");
  }

  /**
   * Check if connection is active
   * @returns {boolean} Connection status
   */
  isConnectionActive() {
    return this.isConnected && this.isOnline;
  }

  /**
   * Clean up resources and remove event listeners
   */
  cleanup() {
    this.disconnect();
    window.removeEventListener("online", this.handleOnlineStatus);
    window.removeEventListener("offline", this.handleOnlineStatus);
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );
  }
}

// Create and export singleton instance
export const realtimeNotificationService = new RealtimeNotificationService();

// Export the service class for testing or multiple instances
export { RealtimeNotificationService };

export default realtimeNotificationService;
