// Enhanced logger utility for the application
// Integrates with the audit logging system for comprehensive logging

import auditLogService from '../services/auditLog.service.js';
import auditLogConfig from '../config/auditLog.config.js';
import { v4 as uuidv4 } from 'uuid';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Create a structured log entry for audit logging
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Structured log entry
 */
const createStructuredLog = (level, message, metadata = {}) => {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    correlationId: metadata.correlationId || uuidv4(),
    metadata,
  };
};

/**
 * Convert log level to audit log severity
 * @param {string} level - Log level
 * @returns {string} Audit log severity
 */
const levelToSeverity = (level) => {
  const mapping = {
    debug: 'DEBUG',
    info: 'INFO',
    warn: 'WARN',
    error: 'ERROR',
  };
  return mapping[level.toLowerCase()] || 'INFO';
};

/**
 * Send log to audit service if enabled
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 */
const sendToAuditService = async (level, message, metadata) => {
  try {
    // Only send to audit service if it's enabled and not a test environment
    if (auditLogConfig?.enabled && !isTest) {
      const auditLogData = {
        action: 'SYSTEM_LOG',
        category: 'SYSTEM',
        severity: levelToSeverity(level),
        message,
        metadata: {
          ...metadata,
          originalLevel: level,
          source: 'logger',
        },
        source: {
          service: 'boosty-api',
          module: 'logger',
        },
        outcome: 'SUCCESS',
      };

      await auditLogService.log(auditLogData);
    }
  } catch (error) {
    // Prevent infinite loop by not logging audit service errors
    if (isDevelopment) {
      console.error('Failed to send log to audit service:', error);
    }
  }
};

const logger = {
  /**
   * Log info level message
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  info: async (message, ...args) => {
    const structuredLog = createStructuredLog('info', message, { args });

    if (!isTest) {
      console.log(`[INFO] ${structuredLog.timestamp} - ${message}`, ...args);
    }

    // Send to audit service asynchronously
    await sendToAuditService('info', message, structuredLog.metadata);
  },

  /**
   * Log warning level message
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  warn: async (message, ...args) => {
    const structuredLog = createStructuredLog('warn', message, { args });

    if (!isTest) {
      console.warn(`[WARN] ${structuredLog.timestamp} - ${message}`, ...args);
    }

    // Send to audit service asynchronously
    await sendToAuditService('warn', message, structuredLog.metadata);
  },

  /**
   * Log error level message
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  error: async (message, ...args) => {
    const structuredLog = createStructuredLog('error', message, { args });

    if (!isTest) {
      console.error(`[ERROR] ${structuredLog.timestamp} - ${message}`, ...args);
    }

    // Send to audit service asynchronously
    await sendToAuditService('error', message, structuredLog.metadata);
  },

  /**
   * Log debug level message
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  debug: async (message, ...args) => {
    const structuredLog = createStructuredLog('debug', message, { args });

    if (isDevelopment && !isTest) {
      console.debug(`[DEBUG] ${structuredLog.timestamp} - ${message}`, ...args);
    }

    // Send to audit service asynchronously in development
    if (isDevelopment) {
      await sendToAuditService('debug', message, structuredLog.metadata);
    }
  },

  /**
   * Log security event
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  security: async (message, metadata = {}) => {
    const structuredLog = createStructuredLog('security', message, metadata);

    if (!isTest) {
      console.warn(
        `[SECURITY] ${structuredLog.timestamp} - ${message}`,
        metadata
      );
    }

    // Send to audit service with security severity
    try {
      if (auditLogConfig?.enabled) {
        await auditLogService.log({
          action: 'SECURITY_EVENT',
          category: 'SECURITY',
          severity: 'SECURITY',
          message,
          metadata: {
            ...metadata,
            source: 'logger-security',
          },
          source: {
            service: 'boosty-api',
            module: 'logger',
          },
          outcome: 'SUCCESS',
        });
      }
    } catch (error) {
      if (isDevelopment) {
        console.error('Failed to send security log to audit service:', error);
      }
    }
  },

  /**
   * Log compliance event
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  compliance: async (message, metadata = {}) => {
    const structuredLog = createStructuredLog('compliance', message, metadata);

    if (!isTest) {
      console.warn(
        `[COMPLIANCE] ${structuredLog.timestamp} - ${message}`,
        metadata
      );
    }

    // Send to audit service with compliance severity
    try {
      if (auditLogConfig?.enabled) {
        await auditLogService.log({
          action: 'COMPLIANCE_EVENT',
          category: 'SECURITY',
          severity: 'COMPLIANCE',
          message,
          metadata: {
            ...metadata,
            source: 'logger-compliance',
          },
          complianceFlags: {
            gdpr: true,
            sox: true,
          },
          source: {
            service: 'boosty-api',
            module: 'logger',
          },
          outcome: 'SUCCESS',
        });
      }
    } catch (error) {
      if (isDevelopment) {
        console.error('Failed to send compliance log to audit service:', error);
      }
    }
  },

  /**
   * Create a child logger with additional context
   * @param {Object} context - Additional context to include in all logs
   * @returns {Object} Child logger instance
   */
  child: (context = {}) => {
    return {
      info: async (message, ...args) => {
        await logger.info(message, ...args, { ...context });
      },
      warn: async (message, ...args) => {
        await logger.warn(message, ...args, { ...context });
      },
      error: async (message, ...args) => {
        await logger.error(message, ...args, { ...context });
      },
      debug: async (message, ...args) => {
        await logger.debug(message, ...args, { ...context });
      },
      security: async (message, metadata = {}) => {
        await logger.security(message, { ...context, ...metadata });
      },
      compliance: async (message, metadata = {}) => {
        await logger.compliance(message, { ...context, ...metadata });
      },
    };
  },

  /**
   * Log with correlation ID for request tracking
   * @param {string} correlationId - Correlation ID
   * @returns {Object} Logger with correlation ID
   */
  withCorrelationId: (correlationId) => {
    return logger.child({ correlationId });
  },

  /**
   * Log user action
   * @param {string} userId - User ID
   * @param {string} action - Action performed
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  userAction: async (userId, action, message, metadata = {}) => {
    const structuredLog = createStructuredLog('info', message, {
      userId,
      action,
      ...metadata,
    });

    if (!isTest) {
      console.log(
        `[USER_ACTION] ${structuredLog.timestamp} - [${userId}] ${action}: ${message}`,
        metadata
      );
    }

    // Send to audit service
    try {
      if (auditLogConfig?.enabled) {
        await auditLogService.log({
          userId,
          action,
          category: 'DATA_OPERATIONS',
          severity: 'INFO',
          message,
          metadata: {
            ...metadata,
            source: 'logger-user-action',
          },
          source: {
            service: 'boosty-api',
            module: 'logger',
          },
          outcome: 'SUCCESS',
        });
      }
    } catch (error) {
      if (isDevelopment) {
        console.error(
          'Failed to send user action log to audit service:',
          error
        );
      }
    }
  },

  /**
   * Log performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  performance: async (operation, duration, metadata = {}) => {
    const structuredLog = createStructuredLog(
      'info',
      `Performance: ${operation}`,
      {
        operation,
        duration,
        ...metadata,
      }
    );

    if (isDevelopment && !isTest) {
      console.log(
        `[PERFORMANCE] ${structuredLog.timestamp} - ${operation}: ${duration}ms`,
        metadata
      );
    }

    // Send to audit service in development
    if (isDevelopment && auditLogConfig?.enabled) {
      try {
        await auditLogService.log({
          action: 'PERFORMANCE_METRIC',
          category: 'SYSTEM',
          severity: 'INFO',
          message: `Performance metric for ${operation}`,
          metadata: {
            operation,
            duration,
            ...metadata,
            source: 'logger-performance',
          },
          source: {
            service: 'boosty-api',
            module: 'logger',
          },
          outcome: 'SUCCESS',
        });
      } catch (error) {
        if (isDevelopment) {
          console.error(
            'Failed to send performance log to audit service:',
            error
          );
        }
      }
    }
  },
};

// Export the enhanced logger
export default logger;
