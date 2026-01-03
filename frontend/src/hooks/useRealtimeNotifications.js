import { useState, useEffect, useRef, useCallback } from "react";
import useNotificationStore from "../stores/notificationStore.js";
import { realtimeNotificationService } from "../services/realtimeNotificationService.js";
import {
  REALTIME_EVENT_TYPES,
  REALTIME_CONNECTION_TYPES,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
} from "../api/notificationConstants.js";

/**
 * React hook for managing real-time notifications
 * Provides connection management, event handling, and integration with the notification store
 * @param {Object} options - Hook options
 * @returns {Object} Real-time notification state and actions
 */
const useRealtimeNotifications = (options = {}) => {
  const {
    userId,
    autoConnect = true,
    defaultConnectionType = REALTIME_CONNECTION_TYPES.SSE,
    enableNotifications = true,
    enableConnectionStatus = true,
    onNotificationReceived,
    onConnectionStatusChange,
    onError,
  } = options;

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionType, setConnectionType] = useState(defaultConnectionType);
  const [connectionStats, setConnectionStats] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Store integration
  const {
    addNotification,
    markAsRead,
    markAsUnread,
    deleteNotification,
    fetchNotifications,
    fetchUnreadCount,
    preferences,
    fetchPreferences,
  } = useNotificationStore();

  // Refs for cleanup
  const unsubscribeRefs = useRef([]);
  const isInitialized = useRef(false);

  /**
   * Initialize real-time connection
   */
  const initializeConnection = useCallback(async () => {
    if (!userId || !enableNotifications) {
      return;
    }

    try {
      setIsConnecting(true);
      setLastError(null);

      // Get user preferences if not already loaded
      if (!preferences) {
        await fetchPreferences();
      }

      // Connect to real-time service
      const connected = await realtimeNotificationService.connect(userId, {
        realtimeConnectionType: defaultConnectionType,
      });

      if (connected) {
        setIsConnected(true);
        setConnectionType(realtimeNotificationService.connectionType);

        // Fetch initial notifications
        await fetchNotifications();
        const count = await fetchUnreadCount();
        setUnreadCount(count || 0);
      }
    } catch (error) {
      console.error("Failed to initialize real-time connection:", error);
      setLastError(error.message);
      if (onError) {
        onError(error);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [
    userId,
    enableNotifications,
    defaultConnectionType,
    preferences,
    fetchNotifications,
    fetchUnreadCount,
    onError,
  ]);

  /**
   * Disconnect from real-time service
   */
  const disconnect = useCallback(() => {
    realtimeNotificationService.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  /**
   * Reconnect to real-time service
   */
  const reconnect = useCallback(async () => {
    disconnect();
    await initializeConnection();
  }, [disconnect, initializeConnection]);

  /**
   * Update connection preferences
   * @param {Object} newPreferences - New connection preferences
   */
  const updateConnectionPreferences = useCallback(
    async (newPreferences) => {
      if (newPreferences.realtimeConnectionType !== connectionType) {
        setConnectionType(newPreferences.realtimeConnectionType);
        disconnect();
        await initializeConnection();
      }
    },
    [connectionType, disconnect, initializeConnection]
  );

  /**
   * Handle new notification from real-time service
   * @param {Object} notification - New notification data
   */
  const handleNewNotification = useCallback(
    (notification) => {
      // Add to store
      const notificationId = addNotification(notification);

      // Update unread count
      setUnreadCount((prev) => prev + 1);

      // Call custom handler if provided
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }

      // Show browser notification if permitted and page is not visible
      if (
        !document.hidden &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        showBrowserNotification(notification);
      }
    },
    [addNotification, onNotificationReceived]
  );

  /**
   * Handle notification update from real-time service
   * @param {Object} notification - Updated notification data
   */
  const handleNotificationUpdate = useCallback((notification) => {
    // Update in store is handled by the store's real-time subscription
    // Update unread count if notification was marked as read
    if (notification.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  /**
   * Handle notification deletion from real-time service
   * @param {Object} data - Deletion event data
   */
  const handleNotificationDelete = useCallback((data) => {
    // Update in store is handled by the store's real-time subscription
    // Update unread count if deleted notification was unread
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  /**
   * Handle notification read event from real-time service
   * @param {Object} data - Read event data
   */
  const handleNotificationRead = useCallback((data) => {
    // Update unread count
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  /**
   * Handle connection status changes
   * @param {Object} status - Connection status data
   */
  const handleConnectionStatusChange = useCallback(
    (status) => {
      const { status: connectionStatus } = status;
      setIsConnected(connectionStatus === "connected");

      // Call custom handler if provided
      if (onConnectionStatusChange) {
        onConnectionStatusChange(status);
      }
    },
    [onConnectionStatusChange]
  );

  /**
   * Show browser notification
   * @param {Object} notification - Notification data
   */
  const showBrowserNotification = useCallback(
    (notification) => {
      try {
        const notificationOptions = {
          body: notification.message,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: notification.id,
          requireInteraction:
            notification.priority === NOTIFICATION_PRIORITIES.HIGH ||
            notification.priority === NOTIFICATION_PRIORITIES.URGENT ||
            notification.priority === NOTIFICATION_PRIORITIES.CRITICAL,
        };

        if (notification.title) {
          notificationOptions.title = notification.title;
        }

        const browserNotification = new Notification(
          notification.title || "New Notification",
          notificationOptions
        );

        // Handle notification click
        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();

          // Mark as read if action URL is provided
          if (notification.actionUrl) {
            window.open(notification.actionUrl, "_blank");
          }

          // Mark notification as read
          if (notification.id) {
            markAsRead(notification.id);
          }
        };

        // Auto-close after 5 seconds for non-critical notifications
        if (
          notification.priority !== NOTIFICATION_PRIORITIES.HIGH &&
          notification.priority !== NOTIFICATION_PRIORITIES.URGENT &&
          notification.priority !== NOTIFICATION_PRIORITIES.CRITICAL
        ) {
          setTimeout(() => {
            browserNotification.close();
          }, 5000);
        }
      } catch (error) {
        console.error("Error showing browser notification:", error);
      }
    },
    [markAsRead]
  );

  /**
   * Request browser notification permission
   * @returns {Promise<boolean>} Permission granted status
   */
  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }, []);

  /**
   * Update connection statistics
   */
  const updateConnectionStats = useCallback(() => {
    const stats = realtimeNotificationService.getConnectionStats();
    setConnectionStats(stats);
  }, []);

  /**
   * Send a message through the real-time connection
   * @param {Object} message - Message to send
   * @returns {boolean} Send success status
   */
  const sendMessage = useCallback((message) => {
    return realtimeNotificationService.sendMessage(message);
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    if (!isInitialized.current && autoConnect && userId) {
      isInitialized.current = true;
      initializeConnection();
      requestNotificationPermission();
    }
  }, [
    autoConnect,
    userId,
    initializeConnection,
    requestNotificationPermission,
  ]);

  // Set up event subscriptions
  useEffect(() => {
    if (!enableNotifications) {
      return;
    }

    // Subscribe to real-time events
    const unsubscribeNew = realtimeNotificationService.subscribe(
      REALTIME_EVENT_TYPES.NOTIFICATION_NEW,
      handleNewNotification
    );

    const unsubscribeUpdate = realtimeNotificationService.subscribe(
      REALTIME_EVENT_TYPES.NOTIFICATION_UPDATE,
      handleNotificationUpdate
    );

    const unsubscribeDelete = realtimeNotificationService.subscribe(
      REALTIME_EVENT_TYPES.NOTIFICATION_DELETE,
      handleNotificationDelete
    );

    const unsubscribeRead = realtimeNotificationService.subscribe(
      REALTIME_EVENT_TYPES.NOTIFICATION_READ,
      handleNotificationRead
    );

    const unsubscribeStatus = realtimeNotificationService.subscribe(
      REALTIME_EVENT_TYPES.CONNECTION_STATUS,
      handleConnectionStatusChange
    );

    // Store unsubscribe functions for cleanup
    unsubscribeRefs.current = [
      unsubscribeNew,
      unsubscribeUpdate,
      unsubscribeDelete,
      unsubscribeRead,
      unsubscribeStatus,
    ];

    // Update connection stats periodically
    const statsInterval = setInterval(updateConnectionStats, 5000);

    return () => {
      // Cleanup subscriptions
      unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe());
      unsubscribeRefs.current = [];

      clearInterval(statsInterval);
    };
  }, [
    enableNotifications,
    handleNewNotification,
    handleNotificationUpdate,
    handleNotificationDelete,
    handleNotificationRead,
    handleConnectionStatusChange,
    updateConnectionStats,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isInitialized.current) {
        disconnect();
      }
    };
  }, [disconnect]);

  // Return hook API
  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionType,
    connectionStats,
    lastError,
    unreadCount,

    // Actions
    connect: initializeConnection,
    disconnect,
    reconnect,
    sendMessage,
    updateConnectionPreferences,
    requestNotificationPermission,

    // Store integration
    markAsRead,
    markAsUnread,
    deleteNotification,

    // Utilities
    updateConnectionStats,
  };
};

export default useRealtimeNotifications;
