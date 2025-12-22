import { create } from "zustand";
import { notificationAPI } from "../api/index.js";
import { realtimeNotificationService } from "../services/realtimeNotificationService.js";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUS,
  REALTIME_EVENT_TYPES,
} from "../api/notificationConstants.js";

/**
 * Zustand store for notification management
 * Integrates with the notification API service layer
 */
const useNotificationStore = create((set, get) => ({
  // State
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  filters: {
    type: null,
    category: null,
    priority: null,
    status: null,
    dateRange: null,
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  preferences: null,
  realtimeConnected: false,

  // Actions
  /**
   * Set loading state
   * @param {boolean} loading - Loading state
   */
  setLoading: (loading) => set({ isLoading: loading }),

  /**
   * Set error state
   * @param {string|null} error - Error message
   */
  setError: (error) => set({ error }),

  /**
   * Fetch notifications from API
   * @param {Object} options - Query options
   */
  fetchNotifications: async (options = {}) => {
    try {
      set({ isLoading: true, error: null });

      const response = await notificationAPI.getNotifications({
        ...get().filters,
        ...options,
      });

      set({
        notifications: response.data || [],
        pagination: response.pagination || get().pagination,
        isLoading: false,
      });

      return response;
    } catch (error) {
      set({
        error: error.message || "Failed to fetch notifications",
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Fetch unread count
   */
  fetchUnreadCount: async () => {
    try {
      const count = await notificationAPI.getUnreadCount();
      set({ unreadCount: count });
      return count;
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  },

  /**
   * Add a new notification
   * @param {Object} notification - Notification data
   */
  addNotification: (notification) => {
    const id = notification.id || Date.now().toString();
    const newNotification = {
      id,
      type: NOTIFICATION_TYPES.INFO,
      priority: NOTIFICATION_PRIORITIES.NORMAL,
      status: NOTIFICATION_STATUS.DELIVERED,
      autoClose: true,
      duration: 5000,
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + (newNotification.read ? 0 : 1),
    }));

    // Auto-dismiss notification if enabled
    if (newNotification.autoClose && newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  },

  /**
   * Remove a notification
   * @param {string} id - Notification ID
   */
  removeNotification: (id) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      const newNotifications = state.notifications.filter((n) => n.id !== id);
      const unreadCount =
        notification && !notification.read
          ? state.unreadCount - 1
          : state.unreadCount;

      return {
        notifications: newNotifications,
        unreadCount: Math.max(0, unreadCount),
      };
    });
  },

  /**
   * Mark notification as read
   * @param {string} id - Notification ID
   */
  markAsRead: async (id) => {
    try {
      await notificationAPI.markAsRead(id);

      set((state) => {
        const updatedNotifications = state.notifications.map((notification) =>
          notification.id === id
            ? { ...notification, read: true, status: NOTIFICATION_STATUS.READ }
            : notification
        );

        const unreadCount = updatedNotifications.filter((n) => !n.read).length;

        return {
          notifications: updatedNotifications,
          unreadCount,
        };
      });
    } catch (error) {
      set({ error: error.message || "Failed to mark notification as read" });
      throw error;
    }
  },

  /**
   * Mark notification as unread
   * @param {string} id - Notification ID
   */
  markAsUnread: async (id) => {
    try {
      await notificationAPI.markAsUnread(id);

      set((state) => {
        const updatedNotifications = state.notifications.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                read: false,
                status: NOTIFICATION_STATUS.DELIVERED,
              }
            : notification
        );

        const unreadCount = updatedNotifications.filter((n) => !n.read).length;

        return {
          notifications: updatedNotifications,
          unreadCount,
        };
      });
    } catch (error) {
      set({ error: error.message || "Failed to mark notification as unread" });
      throw error;
    }
  },

  /**
   * Delete a notification
   * @param {string} id - Notification ID
   */
  deleteNotification: async (id) => {
    try {
      await notificationAPI.deleteNotification(id);
      get().removeNotification(id);
    } catch (error) {
      set({ error: error.message || "Failed to delete notification" });
      throw error;
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    try {
      await notificationAPI.markAllAsRead();

      set((state) => ({
        notifications: state.notifications.map((notification) => ({
          ...notification,
          read: true,
          status: NOTIFICATION_STATUS.READ,
        })),
        unreadCount: 0,
      }));
    } catch (error) {
      set({
        error: error.message || "Failed to mark all notifications as read",
      });
      throw error;
    }
  },

  /**
   * Clear all notifications
   */
  clearAllNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
    });
  },

  /**
   * Set filters
   * @param {Object} filters - Filter options
   */
  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  /**
   * Clear filters
   */
  clearFilters: () => {
    set({
      filters: {
        type: null,
        category: null,
        priority: null,
        status: null,
        dateRange: null,
      },
    });
  },

  /**
   * Set pagination
   * @param {Object} pagination - Pagination options
   */
  setPagination: (pagination) => {
    set({ pagination: { ...get().pagination, ...pagination } });
  },

  /**
   * Fetch user preferences
   */
  fetchPreferences: async () => {
    try {
      const preferences = await notificationAPI.getUserPreferences();
      set({ preferences });
      return preferences;
    } catch (error) {
      console.error("Error fetching preferences:", error);
    }
  },

  /**
   * Update user preferences
   * @param {Object} preferences - Updated preferences
   */
  updatePreferences: async (preferences) => {
    try {
      const updatedPreferences =
        await notificationAPI.updateUserPreferences(preferences);
      set({ preferences: updatedPreferences });
      return updatedPreferences;
    } catch (error) {
      set({ error: error.message || "Failed to update preferences" });
      throw error;
    }
  },

  /**
   * Connect to real-time notifications
   * @param {Object} preferences - Connection preferences
   */
  connectRealtime: async (preferences = {}) => {
    try {
      // Get current user ID from notifications
      const state = get();
      const userId = state.userId || "current-user";

      const connected = await realtimeNotificationService.connect(
        userId,
        preferences
      );
      set({ realtimeConnected: connected });

      if (connected) {
        // Subscribe to real-time events using the new service
        realtimeNotificationService.subscribe(
          REALTIME_EVENT_TYPES.NOTIFICATION_NEW,
          (notification) => {
            get().addNotification(notification);
          }
        );

        realtimeNotificationService.subscribe(
          REALTIME_EVENT_TYPES.NOTIFICATION_UPDATE,
          (notification) => {
            set((state) => ({
              notifications: state.notifications.map((n) =>
                n.id === notification.id ? { ...n, ...notification } : n
              ),
            }));
          }
        );

        realtimeNotificationService.subscribe(
          REALTIME_EVENT_TYPES.NOTIFICATION_DELETE,
          ({ id }) => {
            get().removeNotification(id);
          }
        );

        realtimeNotificationService.subscribe(
          REALTIME_EVENT_TYPES.NOTIFICATION_READ,
          ({ id }) => {
            set((state) => ({
              notifications: state.notifications.map((n) =>
                n.id === id
                  ? { ...n, read: true, status: NOTIFICATION_STATUS.READ }
                  : n
              ),
            }));
          }
        );

        realtimeNotificationService.subscribe(
          REALTIME_EVENT_TYPES.CONNECTION_STATUS,
          (status) => {
            set({ realtimeConnected: status.status === "connected" });
          }
        );
      }

      return connected;
    } catch (error) {
      set({
        error: error.message || "Failed to connect to real-time notifications",
        realtimeConnected: false,
      });
      throw error;
    }
  },

  /**
   * Disconnect from real-time notifications
   */
  disconnectRealtime: () => {
    realtimeNotificationService.disconnect();
    set({ realtimeConnected: false });
  },

  // Convenience methods for common notification types
  showSuccess: (message, title = "Success", options = {}) => {
    return get().addNotification({
      type: NOTIFICATION_TYPES.SUCCESS,
      title,
      message,
      ...options,
    });
  },

  showError: (message, title = "Error", options = {}) => {
    return get().addNotification({
      type: NOTIFICATION_TYPES.ERROR,
      title,
      message,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      autoClose: false,
      ...options,
    });
  },

  showWarning: (message, title = "Warning", options = {}) => {
    return get().addNotification({
      type: NOTIFICATION_TYPES.WARNING,
      title,
      message,
      ...options,
    });
  },

  showInfo: (message, title = "Info", options = {}) => {
    return get().addNotification({
      type: NOTIFICATION_TYPES.INFO,
      title,
      message,
      ...options,
    });
  },

  showMessage: (message, title = "Message", options = {}) => {
    return get().addNotification({
      type: NOTIFICATION_TYPES.MESSAGE,
      title,
      message,
      ...options,
    });
  },

  showTask: (message, title = "Task Update", options = {}) => {
    return get().addNotification({
      type: NOTIFICATION_TYPES.TASK,
      title,
      message,
      ...options,
    });
  },

  /**
   * Get real-time connection statistics
   * @returns {Object} Connection statistics
   */
  getRealtimeStats: () => {
    return realtimeNotificationService.getConnectionStats();
  },

  /**
   * Send message through real-time connection
   * @param {Object} message - Message to send
   * @returns {boolean} Send success status
   */
  sendRealtimeMessage: (message) => {
    return realtimeNotificationService.sendMessage(message);
  },

  /**
   * Update real-time connection preferences
   * @param {Object} preferences - New preferences
   */
  updateRealtimePreferences: async (preferences) => {
    try {
      const state = get();
      if (state.realtimeConnected) {
        // Disconnect and reconnect with new preferences
        get().disconnectRealtime();
        return await get().connectRealtime(preferences);
      }
      return false;
    } catch (error) {
      set({ error: error.message || "Failed to update real-time preferences" });
      throw error;
    }
  },
}));

export default useNotificationStore;
