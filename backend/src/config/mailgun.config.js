/**
 * Mailgun Configuration for Email Notifications
 *
 * This configuration defines:
 * - Mailgun account settings
 * - Email service configuration
 * - Rate limiting settings
 * - Webhook configuration for delivery tracking
 */

import dotenv from 'dotenv';

dotenv.config();

// Mailgun account configuration
export const mailgunAccountConfig = {
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
  region: process.env.MAILGUN_REGION || 'us',
  publicKey: process.env.MAILGUN_PUBLIC_KEY,
};

// Email service settings
export const emailServiceConfig = {
  // Default sender information
  defaultFrom: process.env.MAILGUN_DEFAULT_FROM || `noreply@${process.env.MAILGUN_DOMAIN}`,
  defaultReplyTo: process.env.MAILGUN_DEFAULT_REPLY_TO || `support@${process.env.MAILGUN_DOMAIN}`,

  // Message settings
  maxRecipients: 1000, // Maximum recipients per email
  maxAttachmentsSize: 25 * 1024 * 1024, // 25MB in bytes
  allowedAttachmentTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],

  // Delivery settings
  enableDeliveryTracking: true,
  enableOpenTracking: true,
  enableClickTracking: true,
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds

  // Cost tracking
  enableCostTracking: true,
  defaultCurrency: 'USD',

  // Message validation
  validateEmailAddresses: true,
  validateContent: true,
  blockSpamContent: true,
};

// Rate limiting configuration
export const rateLimitConfig = {
  // Per-second rate limit
  perSecond: {
    maxRequests: parseInt(process.env.MAILGUN_RATE_LIMIT_PER_SECOND) || 5,
    windowMs: 1000,
  },

  // Per-minute rate limit
  perMinute: {
    maxRequests: parseInt(process.env.MAILGUN_RATE_LIMIT_PER_MINUTE) || 300,
    windowMs: 60 * 1000,
  },

  // Per-hour rate limit
  perHour: {
    maxRequests: parseInt(process.env.MAILGUN_RATE_LIMIT_PER_HOUR) || 10000,
    windowMs: 60 * 60 * 1000,
  },

  // Per-day rate limit
  perDay: {
    maxRequests: parseInt(process.env.MAILGUN_RATE_LIMIT_PER_DAY) || 50000,
    windowMs: 24 * 60 * 60 * 1000,
  },
};

// Webhook configuration for delivery status
export const webhookConfig = {
  // Base URL for webhooks
  baseUrl: process.env.API_URL || 'http://localhost:7000',

  // Webhook endpoints
  delivered: `${process.env.API_URL || 'http://localhost:7000'}/api/webhooks/mailgun/delivered`,
  opened: `${process.env.API_URL || 'http://localhost:7000'}/api/webhooks/mailgun/opened`,
  clicked: `${process.env.API_URL || 'http://localhost:7000'}/api/webhooks/mailgun/clicked`,
  bounced: `${process.env.API_URL || 'http://localhost:7000'}/api/webhooks/mailgun/bounced`,
  complained: `${process.env.API_URL || 'http://localhost:7000'}/api/webhooks/mailgun/complained`,
  unsubscribed: `${process.env.API_URL || 'http://localhost:7000'}/api/webhooks/mailgun/unsubscribed`,
  failed: `${process.env.API_URL || 'http://localhost:7000'}/api/webhooks/mailgun/failed`,

  // Security settings
  webhookSigningKey: process.env.MAILGUN_WEBHOOK_SIGNING_KEY,
  allowedIps: process.env.MAILGUN_WEBHOOK_ALLOWED_IPS?.split(',') || [],

  // Retry settings for webhook delivery
  retryAttempts: 3,
  retryDelay: 2000, // 2 seconds
};

// Email template settings
export const templateConfig = {
  // Template settings
  templates: {
    enabled: true,
    variablePattern: /\{\{(\w+)\}\}/g, // {{variableName}} pattern
    maxVariables: 50,
  },

  // Content validation
  validation: {
    enabled: true,
    blockedWords: process.env.MAILGUN_BLOCKED_WORDS?.split(',') || [],
    blockedPatterns: [
      /\b(viagra|cialis|lottery|winner|congratulations)\b/gi,
      /\b(free|click|claim|prize|reward)\b/gi,
    ],
    maxLinks: 10,
    allowedDomains: process.env.MAILGUN_ALLOWED_DOMAINS?.split(',') || [],
  },

  // Personalization settings
  personalization: {
    enabled: true,
    defaultVariables: {
      companyName: process.env.COMPANY_NAME || 'Boosty',
      supportPhone: process.env.SUPPORT_PHONE || '',
      supportEmail: process.env.SUPPORT_EMAIL || '',
      websiteUrl: process.env.WEBSITE_URL || 'https://boosty.com',
    },
  },

  // HTML content settings
  html: {
    enabled: true,
    sanitize: true,
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'strong', 'em', 'u', 'i', 'b',
      'ul', 'ol', 'li',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span',
      'hr',
    ],
    allowedAttributes: {
      'a': ['href', 'target', 'title'],
      'img': ['src', 'alt', 'width', 'height'],
      'table': ['border', 'cellpadding', 'cellspacing'],
      'td': ['colspan', 'rowspan', 'align', 'valign'],
      'th': ['colspan', 'rowspan', 'align', 'valign'],
    },
  },
};

// Error handling configuration
export const errorHandlingConfig = {
  // Error classification
  errorTypes: {
    retryable: [
      '429', // Too many requests
      '500', // Internal server error
      '502', // Bad gateway
      '503', // Service unavailable
      '504', // Gateway timeout
      'timeout', // Request timeout
      'network', // Network error
    ],
    nonRetryable: [
      '400', // Bad request
      '401', // Unauthorized
      '403', // Forbidden
      '404', // Not found
      '422', // Unprocessable entity
    ],
  },

  // Error notification settings
  notifications: {
    enabled: true,
    channels: ['email', 'slack'],
    recipients: process.env.ERROR_NOTIFICATION_RECIPIENTS?.split(',') || [],
    cooldownPeriod: 5 * 60 * 1000, // 5 minutes between notifications
  },
};

// Monitoring and analytics configuration
export const monitoringConfig = {
  // Metrics collection
  enabled: process.env.MAILGUN_MONITORING_ENABLED !== 'false',

  // Performance metrics
  metrics: {
    trackDeliveryTime: true,
    trackOpenRate: true,
    trackClickRate: true,
    trackBounceRate: true,
    trackCost: true,
    trackErrors: true,
    trackRetries: true,
  },

  // Alert thresholds
  alerts: {
    failureRateThreshold: 5.0, // Alert if failure rate exceeds 5%
    bounceRateThreshold: 2.0, // Alert if bounce rate exceeds 2%
    deliveryTimeThreshold: 60000, // Alert if delivery time exceeds 60 seconds
    errorCountThreshold: 10, // Alert if more than 10 errors in 5 minutes
    costThreshold: 500.0, // Alert if daily cost exceeds $500
  },

  // Reporting settings
  reporting: {
    enabled: true,
    reportInterval: 'daily', // daily, weekly, monthly
    reportRecipients: process.env.MAILGUN_REPORT_RECIPIENTS?.split(',') || [],
  },
};

// Development and testing configuration
export const developmentConfig = {
  // Test mode settings
  testMode: process.env.NODE_ENV === 'test',

  // Mock settings for testing
  mockDelivery: process.env.MAILGUN_MOCK_DELIVERY === 'true',

  // Logging settings
  logging: {
    enabled: process.env.MAILGUN_LOGGING_ENABLED !== 'false', // Default to true
    level: process.env.MAILGUN_LOG_LEVEL || 'info', // debug, info, warn, error
    includeRequestBody: process.env.MAILGUN_LOG_REQUEST_BODY === 'true',
    includeResponseBody: process.env.MAILGUN_LOG_RESPONSE_BODY === 'true',
  },
};

// Batch email configuration
export const batchConfig = {
  // Batch processing settings
  maxBatchSize: 1000, // Maximum recipients per batch
  batchSize: 100, // Default batch size for processing
  delayBetweenBatches: 1000, // 1 second between batches

  // Batch delivery settings
  enableBatchDelivery: true,
  batchDeliveryDelay: 5000, // 5 seconds delay before batch delivery
  maxBatchRetries: 2,
};

// Validate required configuration
export const validateConfig = () => {
  const required = [
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Mailgun configuration: ${missing.join(', ')}`
    );
  }

  // Validate domain format
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
  if (!domainRegex.test(process.env.MAILGUN_DOMAIN)) {
    throw new Error('Invalid MAILGUN_DOMAIN format');
  }

  return true;
};

// Export all configurations
export default {
  account: mailgunAccountConfig,
  emailService: emailServiceConfig,
  rateLimits: rateLimitConfig,
  webhooks: webhookConfig,
  templates: templateConfig,
  errorHandling: errorHandlingConfig,
  monitoring: monitoringConfig,
  development: developmentConfig,
  batch: batchConfig,
  validate: validateConfig,
};