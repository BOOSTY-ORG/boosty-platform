/**
 * Notification API Constants and Enums
 * Defines all constants, types, and configurations for the notification system
 */

// Notification Types
export const NOTIFICATION_TYPES = {
  MESSAGE: "message",
  TASK: "task",
  ERROR: "error",
  WARNING: "warning",
  SUCCESS: "success",
  INFO: "info",
  SYSTEM: "system",
  PAYMENT: "payment",
  KYC: "kyc",
  INVESTMENT: "investment",
  CRM: "crm",
};

// Notification Categories
export const NOTIFICATION_CATEGORIES = {
  GENERAL: "general",
  AUTHENTICATION: "authentication",
  TRANSACTIONS: "transactions",
  INVESTMENTS: "investments",
  KYC_DOCUMENTS: "kyc_documents",
  CRM_COMMUNICATIONS: "crm_communications",
  SYSTEM_UPDATES: "system_updates",
  PAYMENTS: "payments",
  SECURITY: "security",
  MARKETING: "marketing",
};

// Notification Priorities
export const NOTIFICATION_PRIORITIES = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
  CRITICAL: "critical",
};

// Notification Status
export const NOTIFICATION_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
  ARCHIVED: "archived",
};

// Notification Channels
export const NOTIFICATION_CHANNELS = {
  IN_APP: "in_app",
  EMAIL: "email",
  SMS: "sms",
  PUSH: "push",
  WEBHOOK: "webhook",
};

// Real-time Connection Types
export const REALTIME_CONNECTION_TYPES = {
  WEBSOCKET: "websocket",
  SSE: "sse",
  BOTH: "both",
};

// Real-time Event Types
export const REALTIME_EVENT_TYPES = {
  NOTIFICATION_NEW: "notification_new",
  NOTIFICATION_UPDATE: "notification_update",
  NOTIFICATION_DELETE: "notification_delete",
  NOTIFICATION_READ: "notification_read",
  PREFERENCE_UPDATE: "preference_update",
  CONNECTION_STATUS: "connection_status",
};

// API Endpoints
export const NOTIFICATION_ENDPOINTS = {
  BASE: "/api/notifications",
  USER_NOTIFICATIONS: "/api/notifications/users/:userId",
  NOTIFICATION_BY_ID: "/api/notifications/:id",
  MARK_READ: "/api/notifications/:id/read",
  MARK_UNREAD: "/api/notifications/:id/unread",
  DELETE: "/api/notifications/:id",
  UNREAD_COUNT: "/api/notifications/unread/count",
  MARK_ALL_READ: "/api/notifications/read-all",
  USER_PREFERENCES: "/api/notifications/preferences/:userId",
  REALTIME_SSE: "/api/notifications/realtime/sse",
  REALTIME_WS: "/api/notifications/realtime/ws",
  STATS: "/api/notifications/stats",
  DELIVERY_TRACKING: "/api/notifications/:id/delivery",
  BULK_OPERATIONS: "/api/notifications/bulk",
};

// Cache Configuration
export const CACHE_CONFIG = {
  NOTIFICATIONS_TTL: 5 * 60 * 1000, // 5 minutes
  PREFERENCES_TTL: 30 * 60 * 1000, // 30 minutes
  STATS_TTL: 10 * 60 * 1000, // 10 minutes
  MAX_CACHE_SIZE: 100,
};

// Pagination Defaults
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
};

// Filter Options
export const FILTER_OPTIONS = {
  DATE_RANGES: {
    TODAY: "today",
    YESTERDAY: "yesterday",
    THIS_WEEK: "this_week",
    LAST_WEEK: "last_week",
    THIS_MONTH: "this_month",
    LAST_MONTH: "last_month",
    CUSTOM: "custom",
  },
  SORT_OPTIONS: {
    CREATED_AT_DESC: "createdAt_desc",
    CREATED_AT_ASC: "createdAt_asc",
    PRIORITY_DESC: "priority_desc",
    PRIORITY_ASC: "priority_asc",
    SUBJECT_ASC: "subject_asc",
    SUBJECT_DESC: "subject_desc",
  },
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection.",
  UNAUTHORIZED: "You are not authorized to access notifications.",
  NOT_FOUND: "Notification not found.",
  VALIDATION_ERROR: "Invalid notification data.",
  SERVER_ERROR: "Server error. Please try again later.",
  REALTIME_CONNECTION_FAILED: "Failed to establish real-time connection.",
  PREFERENCES_UPDATE_FAILED: "Failed to update notification preferences.",
  BULK_OPERATION_FAILED: "Bulk operation failed.",
};

// Success Messages
export const SUCCESS_MESSAGES = {
  MARKED_READ: "Notification marked as read.",
  MARKED_UNREAD: "Notification marked as unread.",
  DELETED: "Notification deleted successfully.",
  ALL_READ: "All notifications marked as read.",
  PREFERENCES_UPDATED: "Notification preferences updated successfully.",
  BULK_OPERATION_SUCCESS: "Bulk operation completed successfully.",
};

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  RECONNECT_MAX_DELAY: 30000,
  HEARTBEAT_INTERVAL: 30000,
  CONNECTION_TIMEOUT: 10000,
};

// SSE Configuration
export const SSE_CONFIG = {
  RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 2000,
  CONNECTION_TIMEOUT: 10000,
};

// Notification Actions
export const NOTIFICATION_ACTIONS = {
  MARK_READ: "mark_read",
  MARK_UNREAD: "mark_unread",
  DELETE: "delete",
  ARCHIVE: "archive",
  SNOOZE: "snooze",
  MUTE: "mute",
  UNMUTE: "unmute",
};

// User Preference Defaults
export const DEFAULT_PREFERENCES = {
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  inAppNotifications: true,
  types: {
    [NOTIFICATION_TYPES.MESSAGE]: {
      enabled: true,
      email: true,
      sms: false,
      push: true,
      inApp: true,
    },
    [NOTIFICATION_TYPES.TASK]: {
      enabled: true,
      email: true,
      sms: false,
      push: true,
      inApp: true,
    },
    [NOTIFICATION_TYPES.ERROR]: {
      enabled: true,
      email: true,
      sms: true,
      push: true,
      inApp: true,
    },
    [NOTIFICATION_TYPES.WARNING]: {
      enabled: true,
      email: true,
      sms: false,
      push: true,
      inApp: true,
    },
    [NOTIFICATION_TYPES.SUCCESS]: {
      enabled: true,
      email: false,
      sms: false,
      push: true,
      inApp: true,
    },
    [NOTIFICATION_TYPES.INFO]: {
      enabled: true,
      email: false,
      sms: false,
      push: false,
      inApp: true,
    },
    [NOTIFICATION_TYPES.SYSTEM]: {
      enabled: true,
      email: true,
      sms: false,
      push: true,
      inApp: true,
    },
    [NOTIFICATION_TYPES.PAYMENT]: {
      enabled: true,
      email: true,
      sms: true,
      push: true,
      inApp: true,
    },
    [NOTIFICATION_TYPES.KYC]: {
      enabled: true,
      email: true,
      sms: true,
      push: true,
      inApp: true,
    },
    [NOTIFICATION_TYPES.INVESTMENT]: {
      enabled: true,
      email: true,
      sms: false,
      push: true,
      inApp: true,
    },
    [NOTIFICATION_TYPES.CRM]: {
      enabled: true,
      email: true,
      sms: false,
      push: true,
      inApp: true,
    },
  },
  quietHours: {
    enabled: false,
    startTime: "22:00",
    endTime: "08:00",
    timezone: "UTC",
  },
  frequency: {
    maxPerHour: 20,
    maxPerDay: 100,
    digestMode: false,
    digestFrequency: "daily",
  },
};

// Bulk Operation Types
export const BULK_OPERATION_TYPES = {
  MARK_READ: "mark_read",
  MARK_UNREAD: "mark_unread",
  DELETE: "delete",
  ARCHIVE: "archive",
  UPDATE_CATEGORY: "update_category",
  UPDATE_PRIORITY: "update_priority",
};

// Notification Validation Rules
export const VALIDATION_RULES = {
  SUBJECT_MAX_LENGTH: 200,
  CONTENT_MAX_LENGTH: 2000,
  ACTION_URL_MAX_LENGTH: 500,
  METADATA_MAX_SIZE: 1000,
};

// Export all constants as a single object for convenience
export const NOTIFICATION_CONSTANTS = {
  TYPES: NOTIFICATION_TYPES,
  CATEGORIES: NOTIFICATION_CATEGORIES,
  PRIORITIES: NOTIFICATION_PRIORITIES,
  STATUS: NOTIFICATION_STATUS,
  CHANNELS: NOTIFICATION_CHANNELS,
  REALTIME_CONNECTION_TYPES,
  REALTIME_EVENT_TYPES,
  ENDPOINTS: NOTIFICATION_ENDPOINTS,
  CACHE_CONFIG,
  PAGINATION_DEFAULTS,
  FILTER_OPTIONS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  WEBSOCKET_CONFIG,
  SSE_CONFIG,
  ACTIONS: NOTIFICATION_ACTIONS,
  DEFAULT_PREFERENCES,
  BULK_OPERATION_TYPES,
  VALIDATION_RULES,
};
