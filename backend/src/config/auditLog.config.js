/**
 * Audit Log Configuration
 *
 * This configuration file defines settings for the audit logging system,
 * including log levels, retention policies, and integration settings.
 */

import { config } from 'dotenv';

// Load environment variables
config();

// Log levels in order of severity
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SECURITY: 4,
  COMPLIANCE: 5,
};

// Log categories for classification
export const LOG_CATEGORIES = {
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  DATA_OPERATIONS: 'DATA_OPERATIONS',
  SECURITY: 'SECURITY',
  SYSTEM: 'SYSTEM',
};

// Default configuration
export const auditLogConfig = {
  // General settings
  enabled: process.env.AUDIT_LOG_ENABLED !== 'false',
  logLevel: process.env.AUDIT_LOG_LEVEL || 'INFO',

  // Database settings
  database: {
    collection: 'auditLogs',
    maxPoolSize: 10,
    retryAttempts: 3,
    retryDelay: 1000,
  },

  // Retention policies (in days)
  retention: {
    default: 365, // 1 year
    debug: 30, // 30 days
    info: 180, // 6 months
    warn: 365, // 1 year
    error: 1095, // 3 years
    security: 2555, // 7 years
    compliance: 2555, // 7 years
  },

  // Log rotation settings
  rotation: {
    enabled: true,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 10,
    interval: 'daily', // daily, weekly, monthly
  },

  // Alert thresholds
  alerts: {
    enabled: true,
    securityEventsThreshold: 10, // per minute
    errorRateThreshold: 0.05, // 5% error rate
    failedLoginThreshold: 5, // per minute
    privilegeEscalationThreshold: 1, // immediate alert
  },

  // Integration settings
  integrations: {
    externalLogger: {
      enabled: process.env.EXTERNAL_LOGGER_ENABLED === 'true',
      endpoint: process.env.EXTERNAL_LOGGER_ENDPOINT,
      apiKey: process.env.EXTERNAL_LOGGER_API_KEY,
      batchSize: 100,
      flushInterval: 5000, // 5 seconds
    },
    siem: {
      enabled: process.env.SIEM_INTEGRATION_ENABLED === 'true',
      endpoint: process.env.SIEM_ENDPOINT,
      apiKey: process.env.SIEM_API_KEY,
      format: 'CEF', // CEF, JSON, LEEF
    },
  },

  // Performance settings
  performance: {
    asyncLogging: true,
    bufferSize: 1000,
    flushInterval: 1000, // 1 second
    maxRetries: 3,
    retryDelay: 500,
  },

  // Privacy settings
  privacy: {
    encryptSensitiveData: true,
    sensitiveFields: [
      'password',
      'token',
      'ssn',
      'creditCard',
      'bankAccount',
      'apiKey',
      'secret',
    ],
    anonymizeIpAddresses: true,
    dataRetentionDays: 2555, // 7 years for compliance
  },

  // Filtering settings
  filtering: {
    excludeHealthChecks: true,
    excludeStaticAssets: true,
    excludeSuccessfulGetRequests: false,
    includeRequestBody: false,
    includeResponseBody: false,
    maxRequestBodySize: 1024, // 1KB
  },

  // Formatting settings
  formatting: {
    timestamp: true,
    correlationId: true,
    structuredOutput: true,
    prettyPrint: process.env.NODE_ENV === 'development',
  },
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'test') {
  auditLogConfig.enabled = false;
  auditLogConfig.performance.asyncLogging = false;
}

if (process.env.NODE_ENV === 'production') {
  auditLogConfig.formatting.prettyPrint = false;
  auditLogConfig.performance.bufferSize = 5000;
  auditLogConfig.performance.flushInterval = 500;
}

export default auditLogConfig;
