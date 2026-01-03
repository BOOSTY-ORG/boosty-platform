/**
 * Payment Logger Utility
 * Provides structured logging for payment operations
 */

// Import Winston if available, otherwise use console
let logger;

try {
  // Try to import winston (if installed)
  const winston = await import('winston');
  logger = winston.createLogger({
    level: process.env.PAYMENT_LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'payment-service' },
    transports: [
      new winston.transports.File({ filename: 'logs/payment-error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/payment-combined.log' })
    ]
  });

  // Add console transport for non-production environments
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }
} catch (error) {
  // Fallback to console logging if winston is not available
  logger = {
    error: (message, meta = {}) => {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta);
    },
    warn: (message, meta = {}) => {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
    },
    info: (message, meta = {}) => {
      console.info(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
    },
    debug: (message, meta = {}) => {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta);
    }
  };
}

/**
 * Log payment initialization
 * @param {Object} data - Payment initialization data
 * @param {string} data.transactionId - Transaction ID
 * @param {string} data.reference - Payment reference
 * @param {number} data.amount - Payment amount
 * @param {string} data.paymentMethod - Payment method
 * @param {string} [data.userId] - User ID
 * @param {number} [data.processingTime] - Processing time in ms
 */
export const logPaymentInitialization = (data) => {
  logger.info('Payment initialization completed', {
    type: 'payment_initialization',
    transactionId: data.transactionId,
    reference: data.reference,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    userId: data.userId,
    processingTime: data.processingTime
  });
};

/**
 * Log payment verification
 * @param {Object} data - Payment verification data
 * @param {string} data.reference - Payment reference
 * @param {string} data.status - Payment status
 * @param {number} data.amount - Payment amount
 * @param {string} [data.transactionId] - Transaction ID
 * @param {number} [data.processingTime] - Processing time in ms
 */
export const logPaymentVerification = (data) => {
  logger.info('Payment verification completed', {
    type: 'payment_verification',
    reference: data.reference,
    status: data.status,
    amount: data.amount,
    transactionId: data.transactionId,
    processingTime: data.processingTime
  });
};

/**
 * Log payment completion
 * @param {Object} data - Payment completion data
 * @param {string} data.transactionId - Transaction ID
 * @param {string} data.reference - Payment reference
 * @param {number} data.amount - Payment amount
 * @param {string} [data.paymentMethod] - Payment method
 * @param {Object} [data.fees] - Payment fees
 */
export const logPaymentCompletion = (data) => {
  logger.info('Payment completed successfully', {
    type: 'payment_completion',
    transactionId: data.transactionId,
    reference: data.reference,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    fees: data.fees
  });
};

/**
 * Log payment failure
 * @param {Object} data - Payment failure data
 * @param {string} data.reference - Payment reference
 * @param {string} data.error - Error message
 * @param {number} [data.amount] - Payment amount
 * @param {string} [data.transactionId] - Transaction ID
 * @param {Object} [data.errorDetails] - Additional error details
 */
export const logPaymentFailure = (data) => {
  logger.error('Payment failed', {
    type: 'payment_failure',
    reference: data.reference,
    error: data.error,
    amount: data.amount,
    transactionId: data.transactionId,
    errorDetails: data.errorDetails
  });
};

/**
 * Log refund processing
 * @param {Object} data - Refund processing data
 * @param {string} data.transactionId - Original transaction ID
 * @param {string} data.refundId - Refund transaction ID
 * @param {number} data.amount - Refund amount
 * @param {string} data.reason - Refund reason
 * @param {string} data.status - Refund status
 */
export const logRefundProcessing = (data) => {
  logger.info('Refund processed', {
    type: 'refund_processing',
    transactionId: data.transactionId,
    refundId: data.refundId,
    amount: data.amount,
    reason: data.reason,
    status: data.status
  });
};

/**
 * Log disbursement processing
 * @param {Object} data - Disbursement data
 * @param {string} data.transactionId - Transaction ID
 * @param {string} data.recipientId - Recipient ID
 * @param {number} data.amount - Disbursement amount
 * @param {string} data.reason - Disbursement reason
 * @param {string} data.status - Disbursement status
 */
export const logDisbursementProcessing = (data) => {
  logger.info('Disbursement processed', {
    type: 'disbursement_processing',
    transactionId: data.transactionId,
    recipientId: data.recipientId,
    amount: data.amount,
    reason: data.reason,
    status: data.status
  });
};

/**
 * Log webhook processing
 * @param {Object} data - Webhook data
 * @param {string} data.event - Webhook event type
 * @param {string} data.reference - Transaction reference
 * @param {string} data.status - Processing status
 * @param {number} [data.processingTime] - Processing time in ms
 */
export const logWebhookProcessing = (data) => {
  logger.info('Webhook processed', {
    type: 'webhook_processing',
    event: data.event,
    reference: data.reference,
    status: data.status,
    processingTime: data.processingTime
  });
};

/**
 * Log split payment processing
 * @param {Object} data - Split payment data
 * @param {string} data.transactionId - Transaction ID
 * @param {string} data.splitCode - Split configuration code
 * @param {Object[]} data.splits - Split details
 * @param {string} data.status - Processing status
 */
export const logSplitPaymentProcessing = (data) => {
  logger.info('Split payment processed', {
    type: 'split_payment_processing',
    transactionId: data.transactionId,
    splitCode: data.splitCode,
    splits: data.splits,
    status: data.status
  });
};

/**
 * Log compliance check
 * @param {Object} data - Compliance data
 * @param {string} data.transactionId - Transaction ID
 * @param {string} data.checkType - Type of compliance check
 * @param {string} data.status - Check status (passed/failed)
 * @param {string} [data.reason] - Failure reason
 */
export const logComplianceCheck = (data) => {
  logger.info('Compliance check completed', {
    type: 'compliance_check',
    transactionId: data.transactionId,
    checkType: data.checkType,
    status: data.status,
    reason: data.reason
  });
};

/**
 * Log fraud detection
 * @param {Object} data - Fraud detection data
 * @param {string} data.transactionId - Transaction ID
 * @param {number} data.riskScore - Risk score (0-100)
 * @param {string[]} data.riskFactors - Risk factors detected
 * @param {string} data.action - Action taken (block/review/approve)
 */
export const logFraudDetection = (data) => {
  logger.warn('Fraud detection triggered', {
    type: 'fraud_detection',
    transactionId: data.transactionId,
    riskScore: data.riskScore,
    riskFactors: data.riskFactors,
    action: data.action
  });
};

/**
 * Log API request
 * @param {Object} data - API request data
 * @param {string} data.method - HTTP method
 * @param {string} data.url - Request URL
 * @param {Object} [data.headers] - Request headers (sanitized)
 * @param {string} [data.userId] - User ID
 */
export const logApiRequest = (data) => {
  logger.debug('API request received', {
    type: 'api_request',
    method: data.method,
    url: data.url,
    headers: data.headers,
    userId: data.userId
  });
};

/**
 * Log API response
 * @param {Object} data - API response data
 * @param {number} data.statusCode - HTTP status code
 * @param {string} data.url - Request URL
 * @param {number} [data.responseTime] - Response time in ms
 */
export const logApiResponse = (data) => {
  logger.debug('API response sent', {
    type: 'api_response',
    statusCode: data.statusCode,
    url: data.url,
    responseTime: data.responseTime
  });
};

/**
 * Log system metrics
 * @param {Object} data - Metrics data
 * @param {number} data.transactionCount - Number of transactions
 * @param {number} data.successRate - Success rate percentage
 * @param {number} data.averageResponseTime - Average response time
 * @param {number} [data.errorRate] - Error rate percentage
 */
export const logSystemMetrics = (data) => {
  logger.info('System metrics', {
    type: 'system_metrics',
    transactionCount: data.transactionCount,
    successRate: data.successRate,
    averageResponseTime: data.averageResponseTime,
    errorRate: data.errorRate
  });
};

// Export the main logger for direct usage
export default {
  error: logger.error.bind(logger),
  warn: logger.warn.bind(logger),
  info: logger.info.bind(logger),
  debug: logger.debug.bind(logger),
  // Structured logging functions
  logPaymentInitialization,
  logPaymentVerification,
  logPaymentCompletion,
  logPaymentFailure,
  logRefundProcessing,
  logDisbursementProcessing,
  logWebhookProcessing,
  logSplitPaymentProcessing,
  logComplianceCheck,
  logFraudDetection,
  logApiRequest,
  logApiResponse,
  logSystemMetrics
};