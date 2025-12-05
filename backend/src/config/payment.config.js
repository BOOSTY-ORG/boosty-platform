import Joi from 'joi';

/**
 * Payment Configuration Schema
 * Validates all payment-related environment variables
 */
const paymentConfigSchema = Joi.object({
  // Paystack configuration
  PAYSTACK_PUBLIC_KEY: Joi.string().required(),
  PAYSTACK_SECRET_KEY: Joi.string().required(),
  PAYSTACK_WEBHOOK_SECRET: Joi.string().required(),
  PAYSTACK_BASE_URL: Joi.string().uri().default('https://api.paystack.co'),
  PAYSTACK_TIMEOUT: Joi.number().integer().min(5000).max(60000).default(30000),
  
  // Feature flags
  ENABLE_SPLIT_PAYMENTS: Joi.boolean().default(true),
  ENABLE_RECURRING_PAYMENTS: Joi.boolean().default(true),
  ENABLE_INTERNATIONAL_PAYMENTS: Joi.boolean().default(false),
  ENABLE_CARD_PAYMENTS: Joi.boolean().default(true),
  ENABLE_BANK_TRANSFER: Joi.boolean().default(true),
  ENABLE_MOBILE_MONEY: Joi.boolean().default(true),
  ENABLE_USSD_PAYMENTS: Joi.boolean().default(true),
  ENABLE_ADVANCED_ANALYTICS: Joi.boolean().default(true),
  ENABLE_REAL_TIME_NOTIFICATIONS: Joi.boolean().default(true),
  ENABLE_BATCH_PROCESSING: Joi.boolean().default(true),
  
  // Transaction limits
  MIN_TRANSACTION_AMOUNT: Joi.number().integer().min(1).default(100), // in kobo (1 NGN)
  MAX_TRANSACTION_AMOUNT: Joi.number().integer().min(1000).default(1000000000), // in kobo (10,000,000 NGN)
  DAILY_TRANSACTION_LIMIT: Joi.number().integer().min(0).default(0), // 0 = no limit
  MONTHLY_TRANSACTION_LIMIT: Joi.number().integer().min(0).default(0), // 0 = no limit
  
  // Fee configuration
  PLATFORM_FEE_PERCENTAGE: Joi.number().min(0).max(100).default(0.5), // 0.5%
  MINIMUM_PLATFORM_FEE: Joi.number().integer().min(0).default(10000), // 100 NGN in kobo
  MAXIMUM_PLATFORM_FEE: Joi.number().integer().min(0).default(100000), // 1000 NGN in kobo
  
  // Retry configuration
  MAX_RETRY_ATTEMPTS: Joi.number().integer().min(1).max(10).default(3),
  RETRY_BACKOFF_MULTIPLIER: Joi.number().min(1).max(5).default(2),
  INITIAL_RETRY_DELAY: Joi.number().integer().min(100).max(10000).default(1000), // milliseconds
  
  // Cache configuration
  CACHE_TTL_TRANSACTIONS: Joi.number().integer().min(60).default(300), // seconds
  CACHE_TTL_VERIFICATION: Joi.number().integer().min(60).default(600), // seconds
  CACHE_TTL_CONFIG: Joi.number().integer().min(300).default(3600), // seconds
  
  // Webhook configuration
  WEBHOOK_TIMEOUT: Joi.number().integer().min(5000).max(60000).default(30000),
  WEBHOOK_RETRY_ATTEMPTS: Joi.number().integer().min(1).max(10).default(5),
  WEBHOOK_RETRY_DELAY: Joi.number().integer().min(1000).max(30000).default(5000), // milliseconds
  
  // Security configuration
  ENCRYPTION_KEY: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  SESSION_SECRET: Joi.string().required(),
  
  // Compliance configuration
  KYC_REQUIRED: Joi.boolean().default(true),
  AML_SCREENING_REQUIRED: Joi.boolean().default(true),
  DATA_RETENTION_DAYS: Joi.number().integer().min(30).default(2555), // 7 years
  AUDIT_LOGGING_ENABLED: Joi.boolean().default(true),
  
  // Notification configuration
  EMAIL_NOTIFICATIONS_ENABLED: Joi.boolean().default(true),
  SMS_NOTIFICATIONS_ENABLED: Joi.boolean().default(false),
  PUSH_NOTIFICATIONS_ENABLED: Joi.boolean().default(true),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(60000).default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().min(1).default(100),
  
  // Database configuration
  DB_CONNECTION_POOL_SIZE: Joi.number().integer().min(5).max(50).default(10),
  DB_QUERY_TIMEOUT: Joi.number().integer().min(1000).max(30000).default(10000),
  
  // Monitoring configuration
  METRICS_ENABLED: Joi.boolean().default(true),
  HEALTH_CHECK_INTERVAL: Joi.number().integer().min(30000).default(60000), // milliseconds
  ALERT_ERROR_RATE_THRESHOLD: Joi.number().min(0).max(100).default(5), // percentage
  ALERT_RESPONSE_TIME_THRESHOLD: Joi.number().integer().min(100).max(10000).default(5000) // milliseconds
}).unknown(true);

// Validate and export configuration
const { error, value } = paymentConfigSchema.validate(process.env);

if (error) {
  throw new Error(`Payment configuration validation error: ${error.message}`);
}

/**
 * Payment Configuration Object
 * Contains all validated payment configuration
 */
export const paymentConfig = {
  // Paystack configuration
  paystack: {
    publicKey: value.PAYSTACK_PUBLIC_KEY,
    secretKey: value.PAYSTACK_SECRET_KEY,
    webhookSecret: value.PAYSTACK_WEBHOOK_SECRET,
    baseUrl: value.PAYSTACK_BASE_URL,
    timeout: value.PAYSTACK_TIMEOUT
  },
  
  // Feature flags
  features: {
    splitPayments: value.ENABLE_SPLIT_PAYMENTS,
    recurringPayments: value.ENABLE_RECURRING_PAYMENTS,
    internationalPayments: value.ENABLE_INTERNATIONAL_PAYMENTS,
    cardPayments: value.ENABLE_CARD_PAYMENTS,
    bankTransfer: value.ENABLE_BANK_TRANSFER,
    mobileMoney: value.ENABLE_MOBILE_MONEY,
    ussdPayments: value.ENABLE_USSD_PAYMENTS,
    advancedAnalytics: value.ENABLE_ADVANCED_ANALYTICS,
    realTimeNotifications: value.ENABLE_REAL_TIME_NOTIFICATIONS,
    batchProcessing: value.ENABLE_BATCH_PROCESSING
  },
  
  // Limits
  limits: {
    minTransactionAmount: value.MIN_TRANSACTION_AMOUNT,
    maxTransactionAmount: value.MAX_TRANSACTION_AMOUNT,
    dailyTransactionLimit: value.DAILY_TRANSACTION_LIMIT,
    monthlyTransactionLimit: value.MONTHLY_TRANSACTION_LIMIT
  },
  
  // Fees
  fees: {
    platformFeePercentage: value.PLATFORM_FEE_PERCENTAGE,
    minimumPlatformFee: value.MINIMUM_PLATFORM_FEE,
    maximumPlatformFee: value.MAXIMUM_PLATFORM_FEE
  },
  
  // Retry configuration
  retry: {
    maxAttempts: value.MAX_RETRY_ATTEMPTS,
    backoffMultiplier: value.RETRY_BACKOFF_MULTIPLIER,
    initialDelay: value.INITIAL_RETRY_DELAY
  },
  
  // Cache configuration
  cache: {
    ttlTransactions: value.CACHE_TTL_TRANSACTIONS,
    ttlVerification: value.CACHE_TTL_VERIFICATION,
    ttlConfig: value.CACHE_TTL_CONFIG
  },
  
  // Webhook configuration
  webhook: {
    timeout: value.WEBHOOK_TIMEOUT,
    retryAttempts: value.WEBHOOK_RETRY_ATTEMPTS,
    retryDelay: value.WEBHOOK_RETRY_DELAY
  },
  
  // Security configuration
  security: {
    encryptionKey: value.ENCRYPTION_KEY,
    jwtSecret: value.JWT_SECRET,
    sessionSecret: value.SESSION_SECRET
  },
  
  // Compliance configuration
  compliance: {
    kycRequired: value.KYC_REQUIRED,
    amlScreeningRequired: value.AML_SCREENING_REQUIRED,
    dataRetentionDays: value.DATA_RETENTION_DAYS,
    auditLoggingEnabled: value.AUDIT_LOGGING_ENABLED
  },
  
  // Notifications configuration
  notifications: {
    emailEnabled: value.EMAIL_NOTIFICATIONS_ENABLED,
    smsEnabled: value.SMS_NOTIFICATIONS_ENABLED,
    pushEnabled: value.PUSH_NOTIFICATIONS_ENABLED
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: value.RATE_LIMIT_WINDOW_MS,
    maxRequests: value.RATE_LIMIT_MAX_REQUESTS
  },
  
  // Database configuration
  database: {
    connectionPoolSize: value.DB_CONNECTION_POOL_SIZE,
    queryTimeout: value.DB_QUERY_TIMEOUT
  },
  
  // Monitoring configuration
  monitoring: {
    metricsEnabled: value.METRICS_ENABLED,
    healthCheckInterval: value.HEALTH_CHECK_INTERVAL,
    alertErrorRateThreshold: value.ALERT_ERROR_RATE_THRESHOLD,
    alertResponseTimeThreshold: value.ALERT_RESPONSE_TIME_THRESHOLD
  }
};

/**
 * Get payment configuration by environment
 * @param {string} env - Environment name (development, staging, production)
 * @returns {Object} Payment configuration for environment
 */
export const getPaymentConfig = (env = process.env.NODE_ENV || 'development') => {
  const isDevelopment = env === 'development';
  const isProduction = env === 'production';
  
  return {
    ...paymentConfig,
    
    // Environment-specific overrides
    paystack: {
      ...paymentConfig.paystack,
      baseUrl: isDevelopment ? 'https://api.paystack.co' : paymentConfig.paystack.baseUrl
    },
    
    // Development-specific settings
    debug: {
      enabled: isDevelopment,
      logLevel: isDevelopment ? 'debug' : 'info',
      mockPayments: isDevelopment ? process.env.MOCK_PAYMENTS === 'true' : false
    },
    
    // Production-specific settings
    production: {
      strictMode: isProduction,
      enhancedSecurity: isProduction,
      detailedLogging: !isProduction
    }
  };
};

/**
 * Validate payment method availability
 * @param {string} paymentMethod - Payment method to check
 * @returns {boolean} True if payment method is available
 */
export const isPaymentMethodAvailable = (paymentMethod) => {
  const methodMap = {
    'card': paymentConfig.features.cardPayments,
    'bank_transfer': paymentConfig.features.bankTransfer,
    'mobile_money': paymentConfig.features.mobileMoney,
    'ussd': paymentConfig.features.ussdPayments
  };
  
  return methodMap[paymentMethod] || false;
};

/**
 * Get available payment methods
 * @returns {string[]} Array of available payment methods
 */
export const getAvailablePaymentMethods = () => {
  const methods = [];
  
  if (paymentConfig.features.cardPayments) methods.push('card');
  if (paymentConfig.features.bankTransfer) methods.push('bank_transfer');
  if (paymentConfig.features.mobileMoney) methods.push('mobile_money');
  if (paymentConfig.features.ussdPayments) methods.push('ussd');
  
  return methods.length > 0 ? methods : ['card', 'bank_transfer']; // Default methods
};

/**
 * Calculate platform fee
 * @param {number} amount - Transaction amount
 * @returns {number} Platform fee amount
 */
export const calculatePlatformFee = (amount) => {
  const percentage = paymentConfig.fees.platformFeePercentage;
  const minimum = paymentConfig.fees.minimumPlatformFee;
  
  const calculatedFee = amount * percentage;
  return Math.max(calculatedFee, minimum);
};

/**
 * Validate transaction amount
 * @param {number} amount - Amount to validate
 * @returns {boolean} True if amount is valid
 */
export const isValidTransactionAmount = (amount) => {
  return amount >= paymentConfig.limits.minTransactionAmount && 
         amount <= paymentConfig.limits.maxTransactionAmount;
};

/**
 * Get retry configuration
 * @returns {Object} Retry configuration
 */
export const getRetryConfig = () => {
  return {
    maxAttempts: paymentConfig.retry.maxAttempts,
    backoffMultiplier: paymentConfig.retry.backoffMultiplier,
    initialDelay: paymentConfig.retry.initialDelay
  };
};

/**
 * Get webhook configuration
 * @returns {Object} Webhook configuration
 */
export const getWebhookConfig = () => {
  return {
    timeout: paymentConfig.webhook.timeout,
    retryAttempts: paymentConfig.webhook.retryAttempts,
    retryDelay: paymentConfig.webhook.retryDelay,
    secret: paymentConfig.paystack.webhookSecret
  };
};

/**
 * Get security configuration
 * @returns {Object} Security configuration
 */
export const getSecurityConfig = () => {
  return {
    encryptionKey: paymentConfig.security.encryptionKey,
    jwtSecret: paymentConfig.security.jwtSecret,
    sessionSecret: paymentConfig.security.sessionSecret
  };
};

/**
 * Get compliance configuration
 * @returns {Object} Compliance configuration
 */
export const getComplianceConfig = () => {
  return {
    kycRequired: paymentConfig.compliance.kycRequired,
    amlScreeningRequired: paymentConfig.compliance.amlScreeningRequired,
    dataRetentionDays: paymentConfig.compliance.dataRetentionDays,
    auditLoggingEnabled: paymentConfig.compliance.auditLoggingEnabled
  };
};

/**
 * Get notification configuration
 * @returns {Object} Notification configuration
 */
export const getNotificationConfig = () => {
  return {
    emailEnabled: paymentConfig.notifications.emailEnabled,
    smsEnabled: paymentConfig.notifications.smsEnabled,
    pushEnabled: paymentConfig.notifications.pushEnabled
  };
};

/**
 * Get rate limit configuration
 * @returns {Object} Rate limit configuration
 */
export const getRateLimitConfig = () => {
  return {
    windowMs: paymentConfig.rateLimit.windowMs,
    maxRequests: paymentConfig.rateLimit.maxRequests
  };
};

export default {
  paymentConfig,
  getPaymentConfig,
  isPaymentMethodAvailable,
  getAvailablePaymentMethods,
  calculatePlatformFee,
  isValidTransactionAmount,
  getRetryConfig,
  getWebhookConfig,
  getSecurityConfig,
  getComplianceConfig,
  getNotificationConfig,
  getRateLimitConfig
};