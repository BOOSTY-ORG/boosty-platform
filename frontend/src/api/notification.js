import api from "./index.js";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUS,
  NOTIFICATION_CHANNELS,
  REALTIME_CONNECTION_TYPES,
  REALTIME_EVENT_TYPES,
  NOTIFICATION_ENDPOINTS,
  CACHE_CONFIG,
  PAGINATION_DEFAULTS,
  FILTER_OPTIONS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  WEBSOCKET_CONFIG,
  SSE_CONFIG,
  NOTIFICATION_ACTIONS,
  DEFAULT_PREFERENCES,
  BULK_OPERATION_TYPES,
  VALIDATION_RULES,
} from "./notificationConstants.js";

/**
 * Simple in-memory cache implementation for notification data
 */
class NotificationCache {
  constructor() {
    this.cache = new Map();
    this.timeouts = new Map();
  }

  set(key, data, ttl = CACHE_CONFIG.NOTIFICATIONS_TTL) {
    // Clear existing timeout if any
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
    }

    // Set data in cache
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Set expiration timeout
    const timeout = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.timeouts.set(key, timeout);

    // Clean up if cache exceeds max size
    if (this.cache.size > CACHE_CONFIG.MAX_CACHE_SIZE) {
      this.cleanOldest();
    }
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if item is expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key) {
    this.cache.delete(key);
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
      this.timeouts.delete(key);
    }
  }

  clear() {
    this.cache.clear();
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts.clear();
  }

  cleanOldest() {
    let oldestKey = null;
    let oldestTimestamp = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }
}

/**
 * Real-time notification service for WebSocket and SSE connections
 */
class RealtimeNotificationService {
  constructor() {
    this.websocketConnection = null;
    this.sseConnection = null;
    this.eventHandlers = new Map();
    this.connectionType = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.userId = null;
  }

  /**
   * Connect to real-time notification service
   * @param {string} userId - User ID for connection
   * @param {Object} preferences - User preferences for connection type
   * @returns {Promise<boolean>} Connection success status
   */
  async connect(userId, preferences = {}) {
    try {
      this.userId = userId;
      this.connectionType =
        preferences.realtimeConnectionType || REALTIME_CONNECTION_TYPES.SSE;

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
          return await this.connectSSE(userId);
        }
      }

      return false;
    } catch (error) {
      console.error("Real-time connection failed:", error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Connect using WebSocket
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Connection success status
   */
  async connectWebSocket(userId) {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${api.defaults.baseURL.replace("http", "ws")}${NOTIFICATION_ENDPOINTS.REALTIME_WS.replace(":userId", userId)}`;
        this.websocketConnection = new WebSocket(wsUrl);

        this.websocketConnection.onopen = () => {
          console.log("WebSocket connection established");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve(true);
        };

        this.websocketConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleRealtimeEvent(data);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.websocketConnection.onclose = () => {
          console.log("WebSocket connection closed");
          this.isConnected = false;
          this.stopHeartbeat();
          this.attemptReconnect();
        };

        this.websocketConnection.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.isConnected = false;
          reject(error);
        };

        // Set connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error("WebSocket connection timeout"));
          }
        }, WEBSOCKET_CONFIG.CONNECTION_TIMEOUT);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Connect using Server-Sent Events
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Connection success status
   */
  async connectSSE(userId) {
    return new Promise((resolve, reject) => {
      try {
        const sseUrl = `${api.defaults.baseURL}${NOTIFICATION_ENDPOINTS.REALTIME_SSE.replace(":userId", userId)}`;
        this.sseConnection = new EventSource(sseUrl);

        this.sseConnection.onopen = () => {
          console.log("SSE connection established");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(true);
        };

        this.sseConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleRealtimeEvent(data);
          } catch (error) {
            console.error("Error parsing SSE message:", error);
          }
        };

        this.sseConnection.onerror = (error) => {
          console.error("SSE error:", error);
          this.isConnected = false;
          this.attemptReconnect();
        };

        // Set connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error("SSE connection timeout"));
          }
        }, SSE_CONFIG.CONNECTION_TIMEOUT);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle real-time events
   * @param {Object} event - Event data
   */
  handleRealtimeEvent(event) {
    const { type, data } = event;

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

    // Handle connection status events
    if (type === REALTIME_EVENT_TYPES.CONNECTION_STATUS) {
      this.isConnected = data.status === "connected";
    }
  }

  /**
   * Subscribe to real-time events
   * @param {string} eventType - Event type to subscribe to
   * @param {Function} handler - Event handler function
   */
  subscribe(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
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
   * Attempt to reconnect to real-time service
   */
  attemptReconnect() {
    if (
      this.reconnectAttempts >=
      (this.connectionType === REALTIME_CONNECTION_TYPES.WEBSOCKET
        ? WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS
        : SSE_CONFIG.RECONNECT_ATTEMPTS)
    ) {
      console.error("Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      (this.connectionType === REALTIME_CONNECTION_TYPES.WEBSOCKET
        ? WEBSOCKET_CONFIG.RECONNECT_DELAY
        : SSE_CONFIG.RECONNECT_DELAY) * Math.pow(2, this.reconnectAttempts - 1),
      this.connectionType === REALTIME_CONNECTION_TYPES.WEBSOCKET
        ? WEBSOCKET_CONFIG.RECONNECT_MAX_DELAY
        : SSE_CONFIG.RECONNECT_DELAY * 10
    );

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId);
      }
    }, delay);
  }

  /**
   * Start heartbeat for WebSocket connection
   */
  startHeartbeat() {
    if (
      this.connectionType === REALTIME_CONNECTION_TYPES.WEBSOCKET &&
      this.websocketConnection
    ) {
      this.heartbeatInterval = setInterval(() => {
        if (this.websocketConnection.readyState === WebSocket.OPEN) {
          this.websocketConnection.send(JSON.stringify({ type: "ping" }));
        }
      }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL);
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
   * Disconnect from real-time service
   */
  disconnect() {
    this.isConnected = false;
    this.stopHeartbeat();

    if (this.websocketConnection) {
      this.websocketConnection.close();
      this.websocketConnection = null;
    }

    if (this.sseConnection) {
      this.sseConnection.close();
      this.sseConnection = null;
    }

    this.eventHandlers.clear();
    this.userId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Get connection status
   * @returns {boolean} Connection status
   */
  isConnectionActive() {
    return this.isConnected;
  }
}

/**
 * Main Notification API Service
 */
class NotificationService {
  constructor() {
    this.cache = new NotificationCache();
    this.realtimeService = new RealtimeNotificationService();
    this.userId = null;
  }

  /**
   * Set the current user ID for the service
   * @param {string} userId - User ID
   */
  setUserId(userId) {
    this.userId = userId;
  }

  /**
   * Get user notifications with pagination and filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Notifications data with pagination
   */
  async getNotifications(options = {}) {
    try {
      const {
        page = PAGINATION_DEFAULTS.PAGE,
        limit = PAGINATION_DEFAULTS.LIMIT,
        type,
        category,
        priority,
        status,
        dateRange,
        sortBy = FILTER_OPTIONS.SORT_OPTIONS.CREATED_AT_DESC,
        search,
        useCache = true,
      } = options;

      // Check cache first
      const cacheKey = `notifications_${this.userId}_${JSON.stringify(options)}`;
      if (useCache) {
        const cachedData = this.cache.get(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }

      // Build query parameters
      const params = {
        page,
        limit: Math.min(limit, PAGINATION_DEFAULTS.MAX_LIMIT),
        sortBy,
      };

      if (type) params.type = type;
      if (category) params.category = category;
      if (priority) params.priority = priority;
      if (status) params.status = status;
      if (dateRange) params.dateRange = dateRange;
      if (search) params.search = search;

      // Make API request
      const response = await api.get(
        NOTIFICATION_ENDPOINTS.USER_NOTIFICATIONS.replace(
          ":userId",
          this.userId
        ),
        {
          params,
        }
      );

      // Cache the response
      if (useCache && response.data) {
        this.cache.set(cacheKey, response.data, CACHE_CONFIG.NOTIFICATIONS_TTL);
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Get a single notification by ID
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Notification data
   */
  async getNotificationById(notificationId) {
    try {
      // Check cache first
      const cacheKey = `notification_${notificationId}`;
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const response = await api.get(
        NOTIFICATION_ENDPOINTS.NOTIFICATION_BY_ID.replace(":id", notificationId)
      );

      // Cache the response
      if (response.data) {
        this.cache.set(cacheKey, response.data, CACHE_CONFIG.NOTIFICATIONS_TTL);
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching notification:", error);
      if (error.response?.status === 404) {
        throw new Error(ERROR_MESSAGES.NOT_FOUND);
      }
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(notificationData) {
    try {
      // Validate notification data
      this.validateNotificationData(notificationData);

      const response = await api.post(NOTIFICATION_ENDPOINTS.BASE, {
        ...notificationData,
        userId: this.userId,
      });

      // Clear relevant cache
      this.clearNotificationsCache();

      return response.data;
    } catch (error) {
      console.error("Error creating notification:", error);
      if (error.response?.status === 400) {
        throw new Error(ERROR_MESSAGES.VALIDATION_ERROR);
      }
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId) {
    try {
      const response = await api.put(
        NOTIFICATION_ENDPOINTS.MARK_READ.replace(":id", notificationId)
      );

      // Update cache
      const cacheKey = `notification_${notificationId}`;
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        cachedData.status = NOTIFICATION_STATUS.READ;
        cachedData.readAt = new Date().toISOString();
        this.cache.set(cacheKey, cachedData);
      }

      // Clear notifications list cache
      this.clearNotificationsCache();

      return response.data;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Mark notification as unread
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  async markAsUnread(notificationId) {
    try {
      const response = await api.put(
        NOTIFICATION_ENDPOINTS.MARK_UNREAD.replace(":id", notificationId)
      );

      // Update cache
      const cacheKey = `notification_${notificationId}`;
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        cachedData.status = NOTIFICATION_STATUS.DELIVERED;
        cachedData.readAt = null;
        this.cache.set(cacheKey, cachedData);
      }

      // Clear notifications list cache
      this.clearNotificationsCache();

      return response.data;
    } catch (error) {
      console.error("Error marking notification as unread:", error);
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Deletion response
   */
  async deleteNotification(notificationId) {
    try {
      const response = await api.delete(
        NOTIFICATION_ENDPOINTS.DELETE.replace(":id", notificationId)
      );

      // Remove from cache
      this.cache.delete(`notification_${notificationId}`);

      // Clear notifications list cache
      this.clearNotificationsCache();

      return response.data;
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Get unread notification count
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount() {
    try {
      // Check cache first
      const cacheKey = `unread_count_${this.userId}`;
      const cachedData = this.cache.get(cacheKey);
      if (cachedData !== null) {
        return cachedData;
      }

      const response = await api.get(NOTIFICATION_ENDPOINTS.UNREAD_COUNT);

      // Cache the response
      if (response.data !== undefined) {
        this.cache.set(
          cacheKey,
          response.data.count,
          CACHE_CONFIG.NOTIFICATIONS_TTL
        );
      }

      return response.data.count;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Mark all notifications as read
   * @returns {Promise<Object>} Update response
   */
  async markAllAsRead() {
    try {
      const response = await api.put(NOTIFICATION_ENDPOINTS.MARK_ALL_READ, {
        userId: this.userId,
      });

      // Clear all notification cache
      this.clearAllNotificationCache();

      return response.data;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Get user notification preferences
   * @returns {Promise<Object>} User preferences
   */
  async getUserPreferences() {
    try {
      // Check cache first
      const cacheKey = `preferences_${this.userId}`;
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const response = await api.get(
        NOTIFICATION_ENDPOINTS.USER_PREFERENCES.replace(":userId", this.userId)
      );

      // Cache the response
      if (response.data) {
        this.cache.set(cacheKey, response.data, CACHE_CONFIG.PREFERENCES_TTL);
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Update user notification preferences
   * @param {Object} preferences - Updated preferences
   * @returns {Promise<Object>} Updated preferences
   */
  async updateUserPreferences(preferences) {
    try {
      const response = await api.put(
        NOTIFICATION_ENDPOINTS.USER_PREFERENCES.replace(":userId", this.userId),
        preferences
      );

      // Update cache
      const cacheKey = `preferences_${this.userId}`;
      this.cache.set(cacheKey, response.data, CACHE_CONFIG.PREFERENCES_TTL);

      return response.data;
    } catch (error) {
      console.error("Error updating user preferences:", error);
      throw new Error(ERROR_MESSAGES.PREFERENCES_UPDATE_FAILED);
    }
  }

  /**
   * Get notification statistics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Notification statistics
   */
  async getNotificationStats(options = {}) {
    try {
      // Check cache first
      const cacheKey = `stats_${this.userId}_${JSON.stringify(options)}`;
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const response = await api.get(NOTIFICATION_ENDPOINTS.STATS, {
        params: { userId: this.userId, ...options },
      });

      // Cache the response
      if (response.data) {
        this.cache.set(cacheKey, response.data, CACHE_CONFIG.STATS_TTL);
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Get delivery tracking for a notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Delivery tracking data
   */
  async getDeliveryTracking(notificationId) {
    try {
      const response = await api.get(
        NOTIFICATION_ENDPOINTS.DELIVERY_TRACKING.replace(":id", notificationId)
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching delivery tracking:", error);
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Perform bulk operations on notifications
   * @param {string} operationType - Type of bulk operation
   * @param {Array} notificationIds - Array of notification IDs
   * @param {Object} options - Additional options for the operation
   * @returns {Promise<Object>} Bulk operation result
   */
  async bulkOperation(operationType, notificationIds, options = {}) {
    try {
      const response = await api.post(NOTIFICATION_ENDPOINTS.BULK_OPERATIONS, {
        operationType,
        notificationIds,
        userId: this.userId,
        ...options,
      });

      // Clear relevant cache
      this.clearNotificationsCache();

      return response.data;
    } catch (error) {
      console.error("Error performing bulk operation:", error);
      throw new Error(ERROR_MESSAGES.BULK_OPERATION_FAILED);
    }
  }

  /**
   * Connect to real-time notification service
   * @param {Object} preferences - User preferences for connection
   * @returns {Promise<boolean>} Connection success status
   */
  async connectRealtime(preferences = {}) {
    if (!this.userId) {
      throw new Error(
        "User ID must be set before connecting to real-time service"
      );
    }

    return await this.realtimeService.connect(this.userId, preferences);
  }

  /**
   * Disconnect from real-time notification service
   */
  disconnectRealtime() {
    this.realtimeService.disconnect();
  }

  /**
   * Subscribe to real-time notification events
   * @param {string} eventType - Event type to subscribe to
   * @param {Function} handler - Event handler function
   */
  subscribeToRealtimeEvents(eventType, handler) {
    this.realtimeService.subscribe(eventType, handler);
  }

  /**
   * Unsubscribe from real-time notification events
   * @param {string} eventType - Event type to unsubscribe from
   * @param {Function} handler - Event handler function to remove
   */
  unsubscribeFromRealtimeEvents(eventType, handler) {
    this.realtimeService.unsubscribe(eventType, handler);
  }

  /**
   * Check if real-time connection is active
   * @returns {boolean} Connection status
   */
  isRealtimeConnected() {
    return this.realtimeService.isConnectionActive();
  }

  /**
   * Validate notification data
   * @param {Object} notificationData - Notification data to validate
   */
  validateNotificationData(notificationData) {
    if (
      !notificationData.subject ||
      notificationData.subject.length > VALIDATION_RULES.SUBJECT_MAX_LENGTH
    ) {
      throw new Error(
        `Subject must be provided and not exceed ${VALIDATION_RULES.SUBJECT_MAX_LENGTH} characters`
      );
    }

    if (
      !notificationData.content ||
      notificationData.content.length > VALIDATION_RULES.CONTENT_MAX_LENGTH
    ) {
      throw new Error(
        `Content must be provided and not exceed ${VALIDATION_RULES.CONTENT_MAX_LENGTH} characters`
      );
    }

    if (
      notificationData.type &&
      !Object.values(NOTIFICATION_TYPES).includes(notificationData.type)
    ) {
      throw new Error("Invalid notification type");
    }

    if (
      notificationData.category &&
      !Object.values(NOTIFICATION_CATEGORIES).includes(
        notificationData.category
      )
    ) {
      throw new Error("Invalid notification category");
    }

    if (
      notificationData.priority &&
      !Object.values(NOTIFICATION_PRIORITIES).includes(
        notificationData.priority
      )
    ) {
      throw new Error("Invalid notification priority");
    }

    if (
      notificationData.actionUrl &&
      notificationData.actionUrl.length > VALIDATION_RULES.ACTION_URL_MAX_LENGTH
    ) {
      throw new Error(
        `Action URL must not exceed ${VALIDATION_RULES.ACTION_URL_MAX_LENGTH} characters`
      );
    }

    if (
      notificationData.metadata &&
      JSON.stringify(notificationData.metadata).length >
        VALIDATION_RULES.METADATA_MAX_SIZE
    ) {
      throw new Error(
        `Metadata size must not exceed ${VALIDATION_RULES.METADATA_MAX_SIZE} characters`
      );
    }
  }

  /**
   * Clear notifications cache
   */
  clearNotificationsCache() {
    // Clear all notification list cache entries
    for (const key of this.cache.cache.keys()) {
      if (key.startsWith(`notifications_${this.userId}`)) {
        this.cache.delete(key);
      }
    }
    // Clear unread count cache
    this.cache.delete(`unread_count_${this.userId}`);
  }

  /**
   * Clear all notification-related cache
   */
  clearAllNotificationCache() {
    for (const key of this.cache.cache.keys()) {
      if (key.includes(this.userId)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear();
  }
}

// Create and export singleton instance
export const notificationService = new NotificationService();

// Export the service class for testing or multiple instances
export { NotificationService, RealtimeNotificationService, NotificationCache };

// Export a simplified API object for easier usage
export const notificationAPI = {
  // Core operations
  getNotifications: (options) => notificationService.getNotifications(options),
  getNotificationById: (id) => notificationService.getNotificationById(id),
  createNotification: (data) => notificationService.createNotification(data),
  markAsRead: (id) => notificationService.markAsRead(id),
  markAsUnread: (id) => notificationService.markAsUnread(id),
  deleteNotification: (id) => notificationService.deleteNotification(id),

  // Bulk operations
  markAllAsRead: () => notificationService.markAllAsRead(),
  bulkOperation: (type, ids, options) =>
    notificationService.bulkOperation(type, ids, options),

  // Preferences
  getUserPreferences: () => notificationService.getUserPreferences(),
  updateUserPreferences: (prefs) =>
    notificationService.updateUserPreferences(prefs),

  // Analytics
  getUnreadCount: () => notificationService.getUnreadCount(),
  getNotificationStats: (options) =>
    notificationService.getNotificationStats(options),
  getDeliveryTracking: (id) => notificationService.getDeliveryTracking(id),

  // Real-time
  connectRealtime: (prefs) => notificationService.connectRealtime(prefs),
  disconnectRealtime: () => notificationService.disconnectRealtime(),
  subscribeToRealtimeEvents: (type, handler) =>
    notificationService.subscribeToRealtimeEvents(type, handler),
  unsubscribeFromRealtimeEvents: (type, handler) =>
    notificationService.unsubscribeFromRealtimeEvents(type, handler),
  isRealtimeConnected: () => notificationService.isRealtimeConnected(),

  // Utility
  setUserId: (id) => notificationService.setUserId(id),
  clearCache: () => notificationService.clearAllCache(),
};

export default notificationAPI;
