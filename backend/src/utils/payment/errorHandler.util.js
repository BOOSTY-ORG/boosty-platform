import { PaymentError, PaymentErrorType } from './paymentErrors.util.js';
import logger from './paymentLogger.util.js';

/**
 * Payment Error Handler Utility
 * Provides centralized error handling for payment operations
 */

/**
 * Handle payment errors consistently
 * @param {Error} error - Error object to handle
 * @param {Object} context - Additional context for error handling
 * @returns {PaymentError} Standardized payment error
 */
export const handlePaymentError = (error, context = {}) => {
  // If it's already a PaymentError, return as-is
  if (error instanceof PaymentError) {
    logger.error('Payment error occurred', {
      error: error.message,
      type: error.type,
      code: error.code,
      details: error.details,
      context,
    });

    return error;
  }

  // Handle different types of errors
  let paymentError;

  if (error.name === 'ValidationError') {
    paymentError = new PaymentError(
      PaymentErrorType.VALIDATION_ERROR,
      'VALIDATION_ERROR',
      error.message,
      {
        validationDetails: error.details,
        context,
      }
    );
  } else if (error.name === 'CastError') {
    paymentError = new PaymentError(
      PaymentErrorType.VALIDATION_ERROR,
      'INVALID_DATA_TYPE',
      'Invalid data type provided',
      {
        expectedType: error.kind,
        providedValue: error.value,
        context,
      }
    );
  } else if (error.name === 'MongoError') {
    paymentError = handleMongoError(error, context);
  } else if (error.name === 'NetworkError' || error.code === 'ECONNREFUSED') {
    paymentError = new PaymentError(
      PaymentErrorType.NETWORK_ERROR,
      'NETWORK_ERROR',
      'Network connection failed',
      {
        networkError: error.code,
        originalError: error.message,
        context,
      }
    );
  } else if (error.code === 'ETIMEDOUT') {
    paymentError = new PaymentError(
      PaymentErrorType.TIMEOUT_ERROR,
      'TIMEOUT_ERROR',
      'Operation timed out',
      {
        timeout: error.message,
        context,
      }
    );
  } else if (error.response) {
    paymentError = handleHTTPError(error, context);
  } else {
    // Generic error handling
    paymentError = new PaymentError(
      PaymentErrorType.SYSTEM_ERROR,
      'SYSTEM_ERROR',
      error.message || 'An unexpected error occurred',
      {
        originalError: error.message,
        stack: error.stack,
        context,
      }
    );
  }

  logger.error('Payment error handled', {
    error: paymentError.message,
    type: paymentError.type,
    code: paymentError.code,
    details: paymentError.details,
    context,
  });

  return paymentError;
};

/**
 * Handle MongoDB errors
 * @param {Error} error - MongoDB error
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 * @private
 */
const handleMongoError = (error, context) => {
  let errorCode = 'DATABASE_ERROR';
  let errorMessage = 'Database operation failed';

  switch (error.code) {
    case 11000: // Duplicate key
      errorCode = 'DUPLICATE_RECORD';
      errorMessage = 'Duplicate record detected';
      break;
    case 11001: // Collection not found
      errorCode = 'RECORD_NOT_FOUND';
      errorMessage = 'Requested record not found';
      break;
    case 264: // Network error
      errorCode = 'DATABASE_CONNECTION_ERROR';
      errorMessage = 'Database connection failed';
      break;
    case 167: // Document validation failed
      errorCode = 'DOCUMENT_VALIDATION_ERROR';
      errorMessage = 'Document validation failed';
      break;
    case 121: // Document validation failed
      errorCode = 'DOCUMENT_VALIDATION_ERROR';
      errorMessage = 'Document validation failed';
      break;
    case 2: // Bad value
      errorCode = 'INVALID_DATA_FORMAT';
      errorMessage = 'Invalid data format';
      break;
  }

  return new PaymentError(
    PaymentErrorType.SYSTEM_ERROR,
    errorCode,
    errorMessage,
    {
      mongoCode: error.code,
      mongoError: error.message,
      context,
    }
  );
};

/**
 * Handle HTTP errors
 * @param {Error} error - HTTP error
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 * @private
 */
const handleHTTPError = (error, context) => {
  const { status, data } = error.response || {};

  let errorType = PaymentErrorType.SYSTEM_ERROR;
  let errorCode = 'HTTP_ERROR';
  let errorMessage = 'HTTP request failed';

  // Map HTTP status codes to payment error types
  switch (status) {
    case 400:
      errorType = PaymentErrorType.VALIDATION_ERROR;
      errorCode = 'BAD_REQUEST';
      errorMessage = data?.message || 'Invalid request';
      break;
    case 401:
      errorType = PaymentErrorType.AUTHENTICATION_ERROR;
      errorCode = 'UNAUTHORIZED';
      errorMessage = 'Authentication failed';
      break;
    case 403:
      errorType = PaymentErrorType.AUTHORIZATION_ERROR;
      errorCode = 'FORBIDDEN';
      errorMessage = 'Access forbidden';
      break;
    case 404:
      errorType = PaymentErrorType.NOT_FOUND;
      errorCode = 'RESOURCE_NOT_FOUND';
      errorMessage = 'Resource not found';
      break;
    case 409:
      errorType = PaymentErrorType.DUPLICATE_TRANSACTION;
      errorCode = 'CONFLICT';
      errorMessage = data?.message || 'Resource conflict';
      break;
    case 422:
      errorType = PaymentErrorType.VALIDATION_ERROR;
      errorCode = 'UNPROCESSABLE_ENTITY';
      errorMessage = data?.message || 'Invalid data';
      break;
    case 429:
      errorType = PaymentErrorType.RATE_LIMIT_EXCEEDED;
      errorCode = 'RATE_LIMIT_EXCEEDED';
      errorMessage = 'Rate limit exceeded';
      break;
    case 500:
      errorType = PaymentErrorType.SYSTEM_ERROR;
      errorCode = 'INTERNAL_SERVER_ERROR';
      errorMessage = 'Internal server error';
      break;
    case 502:
      errorType = PaymentErrorType.NETWORK_ERROR;
      errorCode = 'BAD_GATEWAY';
      errorMessage = 'Payment gateway error';
      break;
    case 503:
      errorType = PaymentErrorType.SERVICE_UNAVAILABLE;
      errorCode = 'SERVICE_UNAVAILABLE';
      errorMessage = 'Service temporarily unavailable';
      break;
    case 504:
      errorType = PaymentErrorType.TIMEOUT_ERROR;
      errorCode = 'GATEWAY_TIMEOUT';
      errorMessage = 'Gateway timeout';
      break;
  }

  return new PaymentError(errorType, errorCode, errorMessage, {
    httpStatus: status,
    httpCode: error.code,
    responseData: data,
    context,
  });
};

/**
 * Handle async operation errors
 * @param {Error} error - Error from async operation
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 */
export const handleAsyncError = (error, context = {}) => {
  if (error.name === 'AggregateError') {
    return new PaymentError(
      PaymentErrorType.SYSTEM_ERROR,
      'AGGREGATION_ERROR',
      'Data aggregation failed',
      {
        originalError: error.message,
        context,
      }
    );
  }

  return handlePaymentError(error, context);
};

/**
 * Create error response object
 * @param {PaymentError} error - Payment error
 * @param {Object} req - Express request object
 * @returns {Object} Formatted error response
 */
export const createErrorResponse = (error, req) => {
  const response = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      type: error.type,
      timestamp: error.timestamp,
      retryable: error.retryable,
      userFriendly: error.userFriendly,
    },
  };

  // Add details if available
  if (error.details) {
    response.error.details = error.details;
  }

  // Add context information if available
  if (req) {
    response.error.context = {
      url: req.url,
      method: req.method,
      userId: req.auth?._id,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }

  return response;
};

/**
 * Handle promise rejection
 * @param {Error} error - Error from rejected promise
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 */
export const handlePromiseRejection = (error, context = {}) => {
  if (error.name === 'PromiseRejectionError') {
    return new PaymentError(
      PaymentErrorType.SYSTEM_ERROR,
      'PROMISE_REJECTION',
      'Async operation was rejected',
      {
        originalError: error.message,
        reason: error.reason,
        context,
      }
    );
  }

  return handlePaymentError(error, context);
};

/**
 * Handle validation errors
 * @param {Array} errors - Array of validation errors
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 */
export const handleValidationErrors = (errors, context = {}) => {
  const errorDetails = errors.map((error) => ({
    field: error.path,
    message: error.message,
    value: error.value,
    constraint: error.type,
  }));

  return new PaymentError(
    PaymentErrorType.VALIDATION_ERROR,
    'VALIDATION_ERROR',
    'Multiple validation errors occurred',
    {
      validationErrors: errorDetails,
      context,
    }
  );
};

/**
 * Handle timeout errors
 * @param {string} operation - Operation that timed out
 * @param {number} timeout - Timeout duration in milliseconds
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 */
export const handleTimeoutError = (operation, timeout, context = {}) => {
  return new PaymentError(
    PaymentErrorType.TIMEOUT_ERROR,
    'OPERATION_TIMEOUT',
    `${operation} timed out after ${timeout}ms`,
    {
      operation,
      timeout,
      context,
    }
  );
};

/**
 * Handle rate limit errors
 * @param {string} operation - Operation being rate limited
 * @param {number} limit - Rate limit threshold
 * @param {number} resetTime - Time when limit resets
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 */
export const handleRateLimitError = (
  operation,
  limit,
  resetTime,
  context = {}
) => {
  return new PaymentError(
    PaymentErrorType.RATE_LIMIT_EXCEEDED,
    'RATE_LIMIT_EXCEEDED',
    `Rate limit exceeded for ${operation}. Maximum ${limit} requests allowed.`,
    {
      operation,
      limit,
      resetTime: new Date(resetTime).toISOString(),
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000), // seconds
      context,
    }
  );
};

/**
 * Handle authentication errors
 * @param {string} reason - Authentication failure reason
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 */
export const handleAuthenticationError = (
  reason = 'Authentication failed',
  context = {}
) => {
  return new PaymentError(
    PaymentErrorType.AUTHENTICATION_ERROR,
    'AUTHENTICATION_ERROR',
    reason,
    {
      context,
    }
  );
};

/**
 * Handle authorization errors
 * @param {string} reason - Authorization failure reason
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 */
export const handleAuthorizationError = (
  reason = 'Insufficient permissions',
  context = {}
) => {
  return new PaymentError(
    PaymentErrorType.AUTHORIZATION_ERROR,
    'AUTHORIZATION_ERROR',
    reason,
    {
      context,
    }
  );
};

/**
 * Handle not found errors
 * @param {string} resource - Resource type
 * @param {string} id - Resource identifier
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 */
export const handleNotFoundError = (resource, id, context = {}) => {
  return new PaymentError(
    PaymentErrorType.NOT_FOUND,
    'NOT_FOUND',
    `${resource} with id ${id} not found`,
    {
      resource,
      id,
      context,
    }
  );
};

/**
 * Handle insufficient funds errors
 * @param {number} requested - Requested amount
 * @param {number} available - Available amount
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 */
export const handleInsufficientFundsError = (
  requested,
  available,
  context = {}
) => {
  return new PaymentError(
    PaymentErrorType.INSUFFICIENT_FUNDS,
    'INSUFFICIENT_FUNDS',
    `Insufficient funds. Requested: ${requested}, Available: ${available}`,
    {
      requestedAmount: requested,
      availableAmount: available,
      shortfall: requested - available,
      context,
    }
  );
};

/**
 * Handle duplicate transaction errors
 * @param {string} reference - Transaction reference
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 */
export const handleDuplicateTransactionError = (reference, context = {}) => {
  return new PaymentError(
    PaymentErrorType.DUPLICATE_TRANSACTION,
    'DUPLICATE_TRANSACTION',
    `Transaction with reference ${reference} already exists`,
    {
      reference,
      context,
    }
  );
};

/**
 * Handle payment failed errors
 * @param {string} gatewayResponse - Gateway error response
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 */
export const handlePaymentFailedError = (gatewayResponse, context = {}) => {
  return new PaymentError(
    PaymentErrorType.PAYMENT_FAILED,
    'PAYMENT_FAILED',
    'Payment processing failed',
    {
      gatewayResponse,
      context,
    }
  );
};

/**
 * Handle compliance errors
 * @param {string} reason - Compliance failure reason
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 */
export const handleComplianceError = (reason, context = {}) => {
  return new PaymentError(
    PaymentErrorType.COMPLIANCE_FAILURE,
    'COMPLIANCE_FAILURE',
    `Compliance check failed: ${reason}`,
    {
      reason,
      context,
    }
  );
};

/**
 * Handle fraud detection errors
 * @param {string} reason - Fraud detection reason
 * @param {Object} context - Additional context
 * @returns {PaymentError} Standardized payment error
 */
export const handleFraudDetectedError = (reason, context = {}) => {
  return new PaymentError(
    PaymentErrorType.FRAUD_DETECTED,
    'FRAUD_DETECTED',
    `Transaction flagged for potential fraud: ${reason}`,
    {
      reason,
      context,
    }
  );
};

export default {
  handlePaymentError,
  handleAsyncError,
  createErrorResponse,
  handlePromiseRejection,
  handleValidationErrors,
  handleTimeoutError,
  handleRateLimitError,
  handleAuthenticationError,
  handleAuthorizationError,
  handleNotFoundError,
  handleInsufficientFundsError,
  handleDuplicateTransactionError,
  handlePaymentFailedError,
  handleComplianceError,
  handleFraudDetectedError,
};
