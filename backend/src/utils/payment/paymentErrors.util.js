/**
 * Payment Error Types Enumeration
 * Defines all possible payment error categories
 */
export const PaymentErrorType = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  CARD_DECLINED: 'CARD_DECLINED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  DUPLICATE_TRANSACTION: 'DUPLICATE_TRANSACTION',
  FRAUD_DETECTED: 'FRAUD_DETECTED',
  COMPLIANCE_FAILURE: 'COMPLIANCE_FAILURE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  REFUND_FAILED: 'REFUND_FAILED',
  DISBURSEMENT_FAILED: 'DISBURSEMENT_FAILED',
  WEBHOOK_ERROR: 'WEBHOOK_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

/**
 * Custom Payment Error Class
 * Extends Error to provide structured payment error information
 */
export class PaymentError extends Error {
  /**
   * Create a new PaymentError
   * @param {string} type - Error type from PaymentErrorType
   * @param {string} code - Machine-readable error code
   * @param {string} message - Human-readable error message
   * @param {Object} [details=null] - Additional error details
   * @param {number} [statusCode=500] - HTTP status code
   */
  constructor(type, code, message, details = null, statusCode = 500) {
    super(message);
    this.name = 'PaymentError';
    this.type = type;
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    this.retryable = this.isRetryableError(type);
    this.userFriendly = this.isUserFriendlyError(type);
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PaymentError);
    }
  }

  /**
   * Determine if error is retryable
   * @param {string} type - Error type
   * @returns {boolean} True if error is retryable
   */
  isRetryableError(type) {
    const retryableTypes = [
      PaymentErrorType.NETWORK_ERROR,
      PaymentErrorType.TIMEOUT_ERROR,
      PaymentErrorType.RATE_LIMIT_EXCEEDED,
      PaymentErrorType.SERVICE_UNAVAILABLE,
      PaymentErrorType.SYSTEM_ERROR
    ];
    
    return retryableTypes.includes(type);
  }

  /**
   * Determine if error is user-friendly
   * @param {string} type - Error type
   * @returns {boolean} True if error is user-friendly
   */
  isUserFriendlyError(type) {
    const userFriendlyTypes = [
      PaymentErrorType.VALIDATION_ERROR,
      PaymentErrorType.INSUFFICIENT_FUNDS,
      PaymentErrorType.CARD_DECLINED,
      PaymentErrorType.INVALID_AMOUNT,
      PaymentErrorType.DUPLICATE_TRANSACTION,
      PaymentErrorType.COMPLIANCE_FAILURE,
      PaymentErrorType.PAYMENT_FAILED,
      PaymentErrorType.REFUND_FAILED,
      PaymentErrorType.DISBURSEMENT_FAILED
    ];
    
    return userFriendlyTypes.includes(type);
  }

  /**
   * Convert error to JSON format
   * @returns {Object} JSON representation of error
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      retryable: this.retryable,
      userFriendly: this.userFriendly
    };
  }
}

// Error factory functions for common error scenarios

/**
 * Create validation error
 * @param {string} message - Error message
 * @param {Object} [details=null] - Additional error details
 * @returns {PaymentError} Validation error instance
 */
export const createValidationError = (message, details = null) => {
  return new PaymentError(
    PaymentErrorType.VALIDATION_ERROR,
    'VALIDATION_ERROR',
    message,
    details,
    400
  );
};

/**
 * Create authentication error
 * @param {string} [message='Authentication failed'] - Error message
 * @returns {PaymentError} Authentication error instance
 */
export const createAuthenticationError = (message = 'Authentication failed') => {
  return new PaymentError(
    PaymentErrorType.AUTHENTICATION_ERROR,
    'AUTHENTICATION_ERROR',
    message,
    null,
    401
  );
};

/**
 * Create authorization error
 * @param {string} [message='Insufficient permissions'] - Error message
 * @returns {PaymentError} Authorization error instance
 */
export const createAuthorizationError = (message = 'Insufficient permissions') => {
  return new PaymentError(
    PaymentErrorType.AUTHORIZATION_ERROR,
    'AUTHORIZATION_ERROR',
    message,
    null,
    403
  );
};

/**
 * Create not found error
 * @param {string} resource - Resource type
 * @param {string} id - Resource ID
 * @returns {PaymentError} Not found error instance
 */
export const createNotFoundError = (resource, id) => {
  return new PaymentError(
    PaymentErrorType.NOT_FOUND,
    'NOT_FOUND',
    `${resource} with id ${id} not found`,
    { resource, id },
    404
  );
};

/**
 * Create rate limit error
 * @param {number} [retryAfter=60] - Seconds to wait before retry
 * @returns {PaymentError} Rate limit error instance
 */
export const createRateLimitError = (retryAfter = 60) => {
  return new PaymentError(
    PaymentErrorType.RATE_LIMIT_EXCEEDED,
    'RATE_LIMIT_EXCEEDED',
    'Rate limit exceeded. Please try again later.',
    { retryAfter },
    429
  );
};

/**
 * Create payment failed error
 * @param {string} gatewayResponse - Gateway response message
 * @returns {PaymentError} Payment failed error instance
 */
export const createPaymentFailedError = (gatewayResponse) => {
  return new PaymentError(
    PaymentErrorType.PAYMENT_FAILED,
    'PAYMENT_FAILED',
    'Payment processing failed',
    { gatewayResponse },
    400
  );
};

/**
 * Create system error
 * @param {string} message - Error message
 * @param {Object} [details=null] - Additional error details
 * @returns {PaymentError} System error instance
 */
export const createSystemError = (message, details = null) => {
  return new PaymentError(
    PaymentErrorType.SYSTEM_ERROR,
    'SYSTEM_ERROR',
    message,
    details,
    500
  );
};

/**
 * Create insufficient funds error
 * @param {number} requestedAmount - Amount requested
 * @param {number} availableAmount - Amount available
 * @returns {PaymentError} Insufficient funds error instance
 */
export const createInsufficientFundsError = (requestedAmount, availableAmount) => {
  return new PaymentError(
    PaymentErrorType.INSUFFICIENT_FUNDS,
    'INSUFFICIENT_FUNDS',
    'Insufficient funds for this transaction',
    { requestedAmount, availableAmount },
    400
  );
};

/**
 * Create duplicate transaction error
 * @param {string} reference - Transaction reference
 * @returns {PaymentError} Duplicate transaction error instance
 */
export const createDuplicateTransactionError = (reference) => {
  return new PaymentError(
    PaymentErrorType.DUPLICATE_TRANSACTION,
    'DUPLICATE_TRANSACTION',
    'A transaction with this reference already exists',
    { reference },
    409
  );
};

/**
 * Create compliance failure error
 * @param {string} reason - Compliance failure reason
 * @param {Object} [details=null] - Additional error details
 * @returns {PaymentError} Compliance failure error instance
 */
export const createComplianceFailureError = (reason, details = null) => {
  return new PaymentError(
    PaymentErrorType.COMPLIANCE_FAILURE,
    'COMPLIANCE_FAILURE',
    `Compliance check failed: ${reason}`,
    { reason, ...details },
    403
  );
};

/**
 * Create fraud detected error
 * @param {string} reason - Fraud detection reason
 * @param {Object} [details=null] - Additional error details
 * @returns {PaymentError} Fraud detected error instance
 */
export const createFraudDetectedError = (reason, details = null) => {
  return new PaymentError(
    PaymentErrorType.FRAUD_DETECTED,
    'FRAUD_DETECTED',
    `Transaction flagged for potential fraud: ${reason}`,
    { reason, ...details },
    403
  );
};

/**
 * Create invalid amount error
 * @param {number} amount - Invalid amount
 * @param {string} reason - Reason amount is invalid
 * @returns {PaymentError} Invalid amount error instance
 */
export const createInvalidAmountError = (amount, reason) => {
  return new PaymentError(
    PaymentErrorType.INVALID_AMOUNT,
    'INVALID_AMOUNT',
    `Invalid amount: ${reason}`,
    { amount, reason },
    400
  );
};

export default {
  PaymentError,
  PaymentErrorType,
  createValidationError,
  createAuthenticationError,
  createAuthorizationError,
  createNotFoundError,
  createRateLimitError,
  createPaymentFailedError,
  createSystemError,
  createInsufficientFundsError,
  createDuplicateTransactionError,
  createComplianceFailureError,
  createFraudDetectedError,
  createInvalidAmountError
};