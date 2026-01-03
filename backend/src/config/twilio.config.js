/**
 * Twilio Configuration for SMS Notifications
 *
 * This configuration defines:
 * - Twilio account settings
 * - SMS service configuration
 * - Rate limiting settings
 * - Webhook configuration for delivery status
 */

import dotenv from 'dotenv';

dotenv.config();

// Twilio account configuration
export const twilioAccountConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_FROM_NUMBER,
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
};

// SMS service settings
export const smsServiceConfig = {
  // Default sender information
  defaultFrom: process.env.TWILIO_FROM_NUMBER || '+15017122661',

  // Message settings
  maxMessageLength: 1600, // Twilio supports up to 1600 characters
  unicodeSupport: true,

  // Delivery settings
  enableDeliveryTracking: true,
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds

  // Cost tracking
  enableCostTracking: true,
  defaultCurrency: 'USD',

  // Message validation
  validatePhoneNumbers: true,
  validateContent: true,
  blockSpamContent: true,
};

// Rate limiting configuration
export const rateLimitConfig = {
  // Per-second rate limit (Twilio recommends 1 SMS per second)
  perSecond: {
    maxRequests: parseInt(process.env.TWILIO_RATE_LIMIT_PER_SECOND) || 1,
    windowMs: 1000,
  },

  // Per-minute rate limit
  perMinute: {
    maxRequests: parseInt(process.env.TWILIO_RATE_LIMIT_PER_MINUTE) || 60,
    windowMs: 60 * 1000,
  },

  // Per-hour rate limit
  perHour: {
    maxRequests: parseInt(process.env.TWILIO_RATE_LIMIT_PER_HOUR) || 1000,
    windowMs: 60 * 60 * 1000,
  },

  // Per-day rate limit
  perDay: {
    maxRequests: parseInt(process.env.TWILIO_RATE_LIMIT_PER_DAY) || 10000,
    windowMs: 24 * 60 * 60 * 1000,
  },
};

// Webhook configuration for delivery status
export const webhookConfig = {
  // Base URL for webhooks
  baseUrl: process.env.API_URL || 'http://localhost:7000',

  // Webhook endpoints
  statusCallback: `${process.env.API_URL || 'http://localhost:7000'}/api/webhooks/twilio/status`,
  inboundUrl: `${process.env.API_URL || 'http://localhost:7000'}/api/webhooks/twilio/inbound`,

  // Security settings
  webhookAuthToken: process.env.TWILIO_WEBHOOK_AUTH_TOKEN,
  allowedIps: process.env.TWILIO_WEBHOOK_ALLOWED_IPS?.split(',') || [],

  // Retry settings for webhook delivery
  retryAttempts: 3,
  retryDelay: 2000, // 2 seconds
};

// Regional settings and restrictions
export const regionalConfig = {
  // Default country code for phone numbers without country code
  defaultCountryCode: process.env.TWILIO_DEFAULT_COUNTRY_CODE || 'US',

  // Supported countries (ISO country codes)
  supportedCountries: process.env.TWILIO_SUPPORTED_COUNTRIES?.split(',') || [
    'US',
    'CA',
    'GB',
    'AU',
    'NG',
    'KE',
    'ZA',
    'GH',
    'UG',
    'TZ',
  ],

  // Restricted countries (where SMS is not supported)
  restrictedCountries: process.env.TWILIO_RESTRICTED_COUNTRIES?.split(',') || [
    'CU',
    'IR',
    'KP',
    'SY',
  ],

  // Timezone handling
  defaultTimezone: process.env.TWILIO_DEFAULT_TIMEZONE || 'UTC',

  // Quiet hours configuration
  quietHours: {
    enabled: process.env.TWILIO_QUIET_HOURS_ENABLED === 'true',
    startTime: process.env.TWILIO_QUIET_HOURS_START || '22:00',
    endTime: process.env.TWILIO_QUIET_HOURS_END || '08:00',
    timezone: process.env.TWILIO_QUIET_HOURS_TIMEZONE || 'UTC',
  },
};

// Message content settings
export const contentConfig = {
  // Template settings
  templates: {
    enabled: true,
    variablePattern: /\{\{(\w+)\}\}/g, // {{variableName}} pattern
    maxVariables: 20,
  },

  // Content validation
  validation: {
    enabled: true,
    blockedWords: process.env.TWILIO_BLOCKED_WORDS?.split(',') || [],
    blockedPatterns: [
      /\b(viagra|cialis|lottery|winner|congratulations)\b/gi,
      /\b(free|click|claim|prize|reward)\b/gi,
    ],
    maxLinks: 3,
    allowedDomains: process.env.TWILIO_ALLOWED_DOMAINS?.split(',') || [],
  },

  // Personalization settings
  personalization: {
    enabled: true,
    defaultVariables: {
      companyName: process.env.COMPANY_NAME || 'Boosty',
      supportPhone: process.env.SUPPORT_PHONE || '',
      supportEmail: process.env.SUPPORT_EMAIL || '',
    },
  },
};

// Error handling configuration
export const errorHandlingConfig = {
  // Error classification
  errorTypes: {
    retryable: [
      '21610', // Temporarily unavailable
      '21611', // Too many requests
      '21612', // Message cannot be sent to this number
      '30001', // Queue overflow
      '30002', // Account suspended
      '30003', // Unreachable destination handset
      '30004', // Message blocked
      '30005', // Unknown destination handset
      '30006', // Landline or unreachable carrier
    ],
    nonRetryable: [
      '21211', // Invalid 'To' Phone Number
      '21212', // Invalid 'From' Phone Number
      '21408', // Permission to send an SMS has not been enabled
      '21614', // 'To' number is not a valid mobile number
      '30007', // Message carrier is not supported
      '30008', // Message frequency limit exceeded
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
  enabled: process.env.TWILIO_MONITORING_ENABLED === 'true',

  // Performance metrics
  metrics: {
    trackDeliveryTime: true,
    trackCost: true,
    trackErrors: true,
    trackRetries: true,
  },

  // Alert thresholds
  alerts: {
    failureRateThreshold: 5.0, // Alert if failure rate exceeds 5%
    deliveryTimeThreshold: 30000, // Alert if delivery time exceeds 30 seconds
    errorCountThreshold: 10, // Alert if more than 10 errors in 5 minutes
    costThreshold: 100.0, // Alert if daily cost exceeds $100
  },

  // Reporting settings
  reporting: {
    enabled: true,
    reportInterval: 'daily', // daily, weekly, monthly
    reportRecipients: process.env.TWILIO_REPORT_RECIPIENTS?.split(',') || [],
  },
};

// Development and testing configuration
export const developmentConfig = {
  // Test mode settings
  testMode: process.env.NODE_ENV === 'test',

  // Mock settings for testing
  mockDelivery: process.env.TWILIO_MOCK_DELIVERY === 'true',

  // Logging settings
  logging: {
    enabled: process.env.TWILIO_LOGGING_ENABLED !== 'false', // Default to true
    level: process.env.TWILIO_LOG_LEVEL || 'info', // debug, info, warn, error
    includeRequestBody: process.env.TWILIO_LOG_REQUEST_BODY === 'true',
    includeResponseBody: process.env.TWILIO_LOG_RESPONSE_BODY === 'true',
  },
};

// Validate required configuration
export const validateConfig = () => {
  const required = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_FROM_NUMBER',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Twilio configuration: ${missing.join(', ')}`
    );
  }

  return true;
};

// Export all configurations
export default {
  account: twilioAccountConfig,
  smsService: smsServiceConfig,
  rateLimits: rateLimitConfig,
  webhooks: webhookConfig,
  regional: regionalConfig,
  content: contentConfig,
  errorHandling: errorHandlingConfig,
  monitoring: monitoringConfig,
  development: developmentConfig,
  validate: validateConfig,
};
