/**
 * Comprehensive error handling utilities for the financial dashboard
 * Provides error classification, retry mechanisms, logging, and user-friendly messages
 */

// Error types classification
export const ERROR_TYPES = {
  NETWORK: "network",
  API: "api",
  VALIDATION: "validation",
  PERMISSION: "permission",
  TIMEOUT: "timeout",
  SERVER: "server",
  CLIENT: "client",
  UNKNOWN: "unknown",
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

// Default error messages
export const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: {
    title: "Network Connection Error",
    message:
      "Unable to connect to the server. Please check your internet connection.",
    action: "Please check your network connection and try again.",
  },
  [ERROR_TYPES.API]: {
    title: "API Error",
    message: "There was a problem processing your request.",
    action: "Please try again. If the problem persists, contact support.",
  },
  [ERROR_TYPES.VALIDATION]: {
    title: "Validation Error",
    message: "The data you entered is not valid.",
    action: "Please check your input and try again.",
  },
  [ERROR_TYPES.PERMISSION]: {
    title: "Permission Denied",
    message: "You don't have permission to perform this action.",
    action: "Please contact your administrator for access.",
  },
  [ERROR_TYPES.TIMEOUT]: {
    title: "Request Timeout",
    message: "The request took too long to complete.",
    action:
      "Please try again. If the problem continues, check your connection.",
  },
  [ERROR_TYPES.SERVER]: {
    title: "Server Error",
    message: "The server encountered an error.",
    action:
      "Please try again in a few minutes. If the problem persists, contact support.",
  },
  [ERROR_TYPES.CLIENT]: {
    title: "Application Error",
    message: "An unexpected error occurred in the application.",
    action: "Please refresh the page and try again.",
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: "Unknown Error",
    message: "An unexpected error occurred.",
    action: "Please try again. If the problem persists, contact support.",
  },
};

/**
 * Classify error type based on error object and response
 */
export const classifyError = (error) => {
  // Network errors
  if (!navigator.onLine) {
    return ERROR_TYPES.NETWORK;
  }

  // Axios/HTTP errors
  if (error.response) {
    const status = error.response.status;

    if (status >= 400 && status < 500) {
      if (status === 401 || status === 403) {
        return ERROR_TYPES.PERMISSION;
      } else if (status === 400 || status === 422) {
        return ERROR_TYPES.VALIDATION;
      }
      return ERROR_TYPES.CLIENT;
    } else if (status >= 500) {
      return ERROR_TYPES.SERVER;
    }
  }

  // Timeout errors
  if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    return ERROR_TYPES.TIMEOUT;
  }

  // Network errors
  if (
    error.code === "NETWORK_ERROR" ||
    error.message?.includes("Network Error")
  ) {
    return ERROR_TYPES.NETWORK;
  }

  // API errors (custom)
  if (error.isApiError) {
    return ERROR_TYPES.API;
  }

  return ERROR_TYPES.UNKNOWN;
};

/**
 * Get error severity based on type and context
 */
export const getErrorSeverity = (errorType, context = {}) => {
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
    case ERROR_TYPES.TIMEOUT:
      return context.isCritical ? ERROR_SEVERITY.HIGH : ERROR_SEVERITY.MEDIUM;

    case ERROR_TYPES.SERVER:
      return ERROR_SEVERITY.HIGH;

    case ERROR_TYPES.PERMISSION:
      return ERROR_SEVERITY.MEDIUM;

    case ERROR_TYPES.VALIDATION:
    case ERROR_TYPES.API:
      return ERROR_SEVERITY.LOW;

    case ERROR_TYPES.CLIENT:
      return context.isCritical ? ERROR_SEVERITY.HIGH : ERROR_SEVERITY.MEDIUM;

    default:
      return ERROR_SEVERITY.MEDIUM;
  }
};

/**
 * Create a standardized error object
 */
export const createError = (error, context = {}) => {
  const errorType = classifyError(error);
  const severity = getErrorSeverity(errorType, context);
  const defaultMessage = ERROR_MESSAGES[errorType];

  return {
    type: errorType,
    severity,
    title: context.title || defaultMessage.title,
    message: context.message || defaultMessage.message,
    action: context.action || defaultMessage.action,
    originalError: error,
    timestamp: new Date().toISOString(),
    context: {
      component: context.component,
      action: context.action,
      ...context,
    },
    retryable: isRetryableError(errorType),
    userMessage: context.userMessage || defaultMessage.message,
  };
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (errorType) => {
  const retryableTypes = [
    ERROR_TYPES.NETWORK,
    ERROR_TYPES.TIMEOUT,
    ERROR_TYPES.SERVER,
    ERROR_TYPES.API,
  ];

  return retryableTypes.includes(errorType);
};

/**
 * Retry mechanism with exponential backoff
 */
export const retryWithBackoff = async (
  fn,
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 10000,
  backoffFactor = 2
) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorType = classifyError(error);

      // Don't retry non-retryable errors
      if (!isRetryableError(errorType)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );

      console.warn(
        `Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`,
        error
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Error logging service
 */
class ErrorLogger {
  constructor() {
    this.errors = [];
    this.maxLogSize = 1000;
  }

  log(error, context = {}) {
    const standardError = createError(error, context);

    this.errors.push(standardError);

    // Keep log size manageable
    if (this.errors.length > this.maxLogSize) {
      this.errors.shift();
    }

    // Console logging in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error logged:", standardError);
    }

    // Send to external service in production
    if (process.env.NODE_ENV === "production") {
      this.sendToExternalService(standardError);
    }

    return standardError;
  }

  getErrors(filter = {}) {
    let filtered = [...this.errors];

    if (filter.type) {
      filtered = filtered.filter((error) => error.type === filter.type);
    }

    if (filter.severity) {
      filtered = filtered.filter((error) => error.severity === filter.severity);
    }

    if (filter.since) {
      const since = new Date(filter.since);
      filtered = filtered.filter((error) => new Date(error.timestamp) >= since);
    }

    return filtered;
  }

  clear() {
    this.errors = [];
  }

  async sendToExternalService(error) {
    try {
      // Implementation depends on your error tracking service
      // e.g., Sentry, LogRocket, custom endpoint
      if (window.Sentry) {
        window.Sentry.captureException(error.originalError, {
          tags: {
            errorType: error.type,
            severity: error.severity,
            component: error.context.component,
          },
          extra: {
            errorContext: error.context,
            timestamp: error.timestamp,
          },
        });
      }
    } catch (loggingError) {
      console.error("Failed to send error to external service:", loggingError);
    }
  }

  generateErrorReport() {
    const errorsByType = {};
    const errorsBySeverity = {};

    this.errors.forEach((error) => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] =
        (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      timestamp: new Date().toISOString(),
      totalErrors: this.errors.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: this.errors.slice(-10),
    };
  }
}

export const errorLogger = new ErrorLogger();

/**
 * Network error detection
 */
export const detectNetworkError = (error) => {
  if (!navigator.onLine) {
    return {
      isOffline: true,
      message:
        "You are currently offline. Please check your internet connection.",
    };
  }

  if (
    error.code === "NETWORK_ERROR" ||
    error.message?.includes("Network Error")
  ) {
    return {
      isOffline: false,
      message: "Network connection lost. Please check your connection.",
    };
  }

  return null;
};

/**
 * User-friendly error message generator
 */
export const getUserFriendlyMessage = (error, context = {}) => {
  const standardError = createError(error, context);
  const networkError = detectNetworkError(error);

  if (networkError) {
    return {
      title: "Connection Issue",
      message: networkError.message,
      action: "Check your internet connection and try again.",
      type: "network",
    };
  }

  return {
    title: standardError.title,
    message: standardError.userMessage,
    action: standardError.action,
    type: standardError.type,
    severity: standardError.severity,
  };
};

/**
 * Error boundary helper for React
 */
export const createErrorBoundaryFallback = (error, resetError) => {
  const userMessage = getUserFriendlyMessage(error);

  return {
    title: userMessage.title,
    message: userMessage.message,
    action: userMessage.action,
    onRetry: resetError,
    showRetry: isRetryableError(classifyError(error)),
  };
};

/**
 * API error handler wrapper
 */
export const withErrorHandling = (apiCall, context = {}) => {
  return async (...args) => {
    try {
      return await apiCall(...args);
    } catch (error) {
      const standardError = errorLogger.log(error, context);
      throw standardError;
    }
  };
};

/**
 * Component error state manager
 */
export class ComponentErrorManager {
  constructor(componentName) {
    this.componentName = componentName;
    this.errors = [];
    this.retryCallbacks = new Map();
  }

  addError(error, retryCallback = null) {
    const standardError = errorLogger.log(error, {
      component: this.componentName,
    });

    this.errors.push(standardError);

    if (retryCallback) {
      const errorId = Date.now();
      this.retryCallbacks.set(errorId, retryCallback);
      standardError.retryId = errorId;
    }

    return standardError;
  }

  retry(errorId) {
    const retryCallback = this.retryCallbacks.get(errorId);
    if (retryCallback) {
      this.retryCallbacks.delete(errorId);
      return retryCallback();
    }
    return null;
  }

  clearErrors() {
    this.errors = [];
    this.retryCallbacks.clear();
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  getLastError() {
    return this.errors[this.errors.length - 1];
  }

  getAllErrors() {
    return [...this.errors];
  }
}

/**
 * Performance error tracking
 */
export const trackPerformanceError = (metric, threshold, actualValue) => {
  const error = new Error(`Performance threshold exceeded: ${metric}`);
  error.isPerformanceError = true;
  error.metric = metric;
  error.threshold = threshold;
  error.actualValue = actualValue;

  return errorLogger.log(error, {
    type: "performance",
    metric,
    threshold,
    actualValue,
  });
};

/**
 * Initialize error handling
 */
export const initializeErrorHandling = () => {
  // Global error handlers
  window.addEventListener("error", (event) => {
    errorLogger.log(event.error, {
      type: "global",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    errorLogger.log(event.reason, {
      type: "unhandled_promise",
    });
  });

  // Network status monitoring
  window.addEventListener("online", () => {
    console.log("Network connection restored");
  });

  window.addEventListener("offline", () => {
    console.log("Network connection lost");
  });
};

// Initialize error handling when module loads
if (typeof window !== "undefined") {
  initializeErrorHandling();
}
