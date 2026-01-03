import { useCallback } from "react";
import useNotificationStore from "../stores/notificationStore.js";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
} from "../api/notificationConstants.js";
import {
  ERROR_TYPES,
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
} from "../components/notifications/ErrorNotification";

/**
 * Enhanced useNotification hook that integrates with Zustand store
 * and provides convenient methods for displaying notifications
 */
const useNotification = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    filters,
    pagination,
    preferences,
    realtimeConnected,

    // Actions
    addNotification,
    removeNotification,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
    clearAllNotifications,
    setFilters,
    clearFilters,
    setPagination,
    fetchNotifications,
    fetchUnreadCount,
    fetchPreferences,
    updatePreferences,
    connectRealtime,
    disconnectRealtime,

    // Convenience methods
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showMessage,
    showTask,
  } = useNotificationStore();

  /**
   * Show a success notification
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifySuccess = useCallback(
    (message, title = "Success", options = {}) => {
      return showSuccess(message, title, {
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        autoClose: true,
        duration: 5000,
        ...options,
      });
    },
    [showSuccess]
  );

  /**
   * Show an error notification
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifyError = useCallback(
    (message, title = "Error", options = {}) => {
      return showError(message, title, {
        priority: NOTIFICATION_PRIORITIES.HIGH,
        autoClose: false,
        ...options,
      });
    },
    [showError]
  );

  /**
   * Show a warning notification
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifyWarning = useCallback(
    (message, title = "Warning", options = {}) => {
      return showWarning(message, title, {
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        autoClose: true,
        duration: 7000,
        ...options,
      });
    },
    [showWarning]
  );

  /**
   * Show an info notification
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifyInfo = useCallback(
    (message, title = "Info", options = {}) => {
      return showInfo(message, title, {
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        autoClose: true,
        duration: 5000,
        ...options,
      });
    },
    [showInfo]
  );

  /**
   * Show a message notification
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifyMessage = useCallback(
    (message, title = "Message", options = {}) => {
      return showMessage(message, title, {
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        autoClose: true,
        duration: 6000,
        ...options,
      });
    },
    [showMessage]
  );

  /**
   * Show a task notification
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifyTask = useCallback(
    (message, title = "Task Update", options = {}) => {
      return showTask(message, title, {
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        autoClose: true,
        duration: 8000,
        ...options,
      });
    },
    [showTask]
  );

  /**
   * Show a payment notification
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifyPayment = useCallback(
    (message, title = "Payment", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.PAYMENT,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        autoClose: true,
        duration: 10000,
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Show a KYC notification
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifyKYC = useCallback(
    (message, title = "KYC Update", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.KYC,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        autoClose: true,
        duration: 10000,
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Show an investment notification
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifyInvestment = useCallback(
    (message, title = "Investment Update", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.INVESTMENT,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        autoClose: true,
        duration: 8000,
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Show a CRM notification
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifyCRM = useCallback(
    (message, title = "CRM Update", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.CRM,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        autoClose: true,
        duration: 7000,
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Show a system notification
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifySystem = useCallback(
    (message, title = "System", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.SYSTEM,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        autoClose: true,
        duration: 6000,
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Show a critical notification
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifyCritical = useCallback(
    (message, title = "Critical", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.CRITICAL,
        autoClose: false,
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Show a validation error notification
   * @param {string} message - Error message
   * @param {string} title - Error title
   * @param {Object} options - Additional options
   */
  const notifyValidationError = useCallback(
    (message, title = "Validation Error", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        errorType: ERROR_TYPES.VALIDATION,
        severity: ERROR_SEVERITY.WARNING,
        category: ERROR_CATEGORIES.USER_INPUT,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        autoClose: true,
        duration: 7000,
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Show a network error notification
   * @param {string} message - Error message
   * @param {string} title - Error title
   * @param {Object} options - Additional options
   */
  const notifyNetworkError = useCallback(
    (message, title = "Network Error", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        errorType: ERROR_TYPES.NETWORK,
        severity: ERROR_SEVERITY.ERROR,
        category: ERROR_CATEGORIES.COMMUNICATION,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        autoClose: false,
        recoverySuggestions: [
          "Check your internet connection",
          "Try refreshing the page",
          "Contact support if the problem persists",
        ],
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Show a system error notification
   * @param {string} message - Error message
   * @param {string} title - Error title
   * @param {Object} options - Additional options
   */
  const notifySystemError = useCallback(
    (message, title = "System Error", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        errorType: ERROR_TYPES.SYSTEM,
        severity: ERROR_SEVERITY.ERROR,
        category: ERROR_CATEGORIES.SYSTEM_FAILURE,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        autoClose: false,
        recoverySuggestions: [
          "Try refreshing the page",
          "Clear your browser cache",
          "Contact support if the problem persists",
        ],
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Show an API error notification
   * @param {string} message - Error message
   * @param {string} title - Error title
   * @param {Object} options - Additional options
   */
  const notifyAPIError = useCallback(
    (message, title = "API Error", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        errorType: ERROR_TYPES.API,
        severity: ERROR_SEVERITY.ERROR,
        category: ERROR_CATEGORIES.COMMUNICATION,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        autoClose: false,
        recoverySuggestions: [
          "Check your internet connection",
          "Try again in a few moments",
          "Contact support if the problem persists",
        ],
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Show an authentication error notification
   * @param {string} message - Error message
   * @param {string} title - Error title
   * @param {Object} options - Additional options
   */
  const notifyAuthError = useCallback(
    (message, title = "Authentication Error", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        errorType: ERROR_TYPES.AUTHENTICATION,
        severity: ERROR_SEVERITY.ERROR,
        category: ERROR_CATEGORIES.SECURITY,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        autoClose: false,
        recoverySuggestions: [
          "Check your login credentials",
          "Try resetting your password",
          "Contact support if you need assistance",
        ],
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Show a timeout error notification
   * @param {string} message - Error message
   * @param {string} title - Error title
   * @param {Object} options - Additional options
   */
  const notifyTimeoutError = useCallback(
    (message, title = "Timeout Error", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        errorType: ERROR_TYPES.TIMEOUT,
        severity: ERROR_SEVERITY.WARNING,
        category: ERROR_CATEGORIES.PERFORMANCE,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        autoClose: true,
        duration: 8000,
        recoverySuggestions: [
          "Check your internet connection speed",
          "Try again with a better connection",
          "Contact support if the problem persists",
        ],
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Show a payment error notification
   * @param {string} message - Error message
   * @param {string} title - Error title
   * @param {Object} options - Additional options
   */
  const notifyPaymentError = useCallback(
    (message, title = "Payment Error", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        errorType: ERROR_TYPES.PAYMENT,
        severity: ERROR_SEVERITY.ERROR,
        category: ERROR_CATEGORIES.BUSINESS_LOGIC,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.CRITICAL,
        autoClose: false,
        recoverySuggestions: [
          "Check your payment details",
          "Verify your billing information",
          "Contact support if the problem persists",
        ],
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Show a file upload error notification
   * @param {string} message - Error message
   * @param {string} title - Error title
   * @param {Object} options - Additional options
   */
  const notifyFileUploadError = useCallback(
    (message, title = "File Upload Error", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        errorType: ERROR_TYPES.FILE_UPLOAD,
        severity: ERROR_SEVERITY.ERROR,
        category: ERROR_CATEGORIES.USER_INPUT,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        autoClose: true,
        duration: 8000,
        recoverySuggestions: [
          "Check file size and format",
          "Ensure file meets requirements",
          "Try uploading a different file",
        ],
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Show a critical error notification
   * @param {string} message - Error message
   * @param {string} title - Error title
   * @param {Object} options - Additional options
   */
  const notifyCriticalError = useCallback(
    (message, title = "Critical Error", options = {}) => {
      return addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        errorType: ERROR_TYPES.SYSTEM,
        severity: ERROR_SEVERITY.CRITICAL,
        category: ERROR_CATEGORIES.SYSTEM_FAILURE,
        title,
        message,
        priority: NOTIFICATION_PRIORITIES.CRITICAL,
        autoClose: false,
        persist: true,
        recoverySuggestions: [
          "Contact support immediately",
          "Save your work if possible",
          "Do not refresh the page",
        ],
        ...options,
      });
    },
    [addNotification]
  );

  /**
   * Fetch notifications with current filters
   */
  const loadNotifications = useCallback(() => {
    return fetchNotifications();
  }, [fetchNotifications]);

  /**
   * Refresh unread count
   */
  const refreshUnreadCount = useCallback(() => {
    return fetchUnreadCount();
  }, [fetchUnreadCount]);

  /**
   * Load user preferences
   */
  const loadPreferences = useCallback(() => {
    return fetchPreferences();
  }, [fetchPreferences]);

  /**
   * Initialize real-time connection
   */
  const initializeRealtime = useCallback(
    async (preferences = {}) => {
      try {
        return await connectRealtime(preferences);
      } catch (error) {
        console.error("Failed to initialize real-time notifications:", error);
        return false;
      }
    },
    [connectRealtime]
  );

  /**
   * Filter notifications by type
   * @param {string} type - Notification type to filter by
   */
  const filterByType = useCallback(
    (type) => {
      setFilters({ type });
    },
    [setFilters]
  );

  /**
   * Filter notifications by priority
   * @param {string} priority - Priority to filter by
   */
  const filterByPriority = useCallback(
    (priority) => {
      setFilters({ priority });
    },
    [setFilters]
  );

  /**
   * Filter notifications by read status
   * @param {boolean} read - Read status to filter by
   */
  const filterByReadStatus = useCallback(
    (read) => {
      setFilters({ read });
    },
    [setFilters]
  );

  /**
   * Go to next page
   */
  const nextPage = useCallback(() => {
    if (pagination.page < pagination.pages) {
      setPagination({ page: pagination.page + 1 });
    }
  }, [pagination, setPagination]);

  /**
   * Go to previous page
   */
  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      setPagination({ page: pagination.page - 1 });
    }
  }, [pagination, setPagination]);

  /**
   * Go to specific page
   * @param {number} page - Page number
   */
  const goToPage = useCallback(
    (page) => {
      setPagination({ page });
    },
    [setPagination]
  );

  return {
    // State
    notifications,
    unreadCount,
    isLoading,
    error,
    filters,
    pagination,
    preferences,
    realtimeConnected,

    // Basic actions
    addNotification,
    removeNotification,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
    clearAllNotifications,

    // Data fetching
    fetchNotifications: loadNotifications,
    fetchUnreadCount: refreshUnreadCount,
    fetchPreferences: loadPreferences,

    // Filtering and pagination
    setFilters,
    clearFilters,
    filterByType,
    filterByPriority,
    filterByReadStatus,
    setPagination,
    nextPage,
    prevPage,
    goToPage,

    // Preferences
    updatePreferences,

    // Real-time
    connectRealtime: initializeRealtime,
    disconnectRealtime,

    // Convenience methods
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    notifyMessage,
    notifyTask,
    notifyPayment,
    notifyKYC,
    notifyInvestment,
    notifyCRM,
    notifySystem,
    notifyCritical,

    // Error notification methods
    notifyValidationError,
    notifyNetworkError,
    notifySystemError,
    notifyAPIError,
    notifyAuthError,
    notifyTimeoutError,
    notifyPaymentError,
    notifyFileUploadError,
    notifyCriticalError,
  };
};

export default useNotification;
