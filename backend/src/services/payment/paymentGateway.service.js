import axios from 'axios';
import { PaymentError, PaymentErrorType } from '../../utils/payment/paymentErrors.util.js';
import logger from '../../utils/payment/paymentLogger.util.js';

/**
 * Abstract Payment Gateway Interface
 * Defines the contract for all payment gateway implementations
 */
class PaymentGateway {
  constructor() {
    if (this.constructor === PaymentGateway) {
      throw new Error('PaymentGateway is an abstract class and cannot be instantiated directly');
    }
  }

  /**
   * Initialize a payment transaction
   * @param {Object} request - Payment initialization request
   * @param {number} request.amount - Payment amount in smallest currency unit
   * @param {string} request.email - Customer email address
   * @param {string} request.reference - Unique transaction reference
   * @param {string} [request.callbackUrl] - URL to redirect after payment
   * @param {Object} [request.metadata] - Additional metadata
   * @param {string[]} [request.channels] - Payment channels to enable
   * @param {string} [request.splitCode] - Split payment configuration code
   * @param {string} [request.subaccount] - Subaccount to receive payment
   * @param {string} [request.currency] - Currency code (default: NGN)
   * @returns {Promise<Object>} Payment initialization response
   */
  async initializePayment(request) {
    throw new Error('initializePayment method must be implemented by subclass');
  }

  /**
   * Verify a transaction status
   * @param {string} reference - Transaction reference to verify
   * @returns {Promise<Object>} Transaction verification response
   */
  async verifyTransaction(reference) {
    throw new Error('verifyTransaction method must be implemented by subclass');
  }

  /**
   * Process a refund
   * @param {Object} request - Refund request
   * @param {string} request.transactionId - Original transaction ID
   * @param {number} request.amount - Refund amount in smallest currency unit
   * @param {string} [request.reason] - Reason for refund
   * @param {string} [request.customerNote] - Note to customer
   * @param {string} [request.currency] - Currency code (default: NGN)
   * @returns {Promise<Object>} Refund processing response
   */
  async processRefund(request) {
    throw new Error('processRefund method must be implemented by subclass');
  }

  /**
   * Create a transfer/disbursement
   * @param {Object} request - Transfer request
   * @param {number} request.amount - Transfer amount in smallest currency unit
   * @param {string} request.reference - Unique transfer reference
   * @param {string} request.recipientCode - Recipient code
   * @param {string} [request.reason] - Reason for transfer
   * @param {string} [request.currency] - Currency code (default: NGN)
   * @returns {Promise<Object>} Transfer creation response
   */
  async createTransfer(request) {
    throw new Error('createTransfer method must be implemented by subclass');
  }

  /**
   * Create a transfer recipient
   * @param {Object} request - Recipient creation request
   * @param {string} request.type - Recipient type (nuban, mobile_money, card)
   * @param {string} request.name - Recipient name
   * @param {string} request.accountNumber - Bank account number
   * @param {string} request.bankCode - Bank code
   * @param {string} [request.currency] - Currency code (default: NGN)
   * @param {string} [request.email] - Recipient email
   * @param {string} [request.description] - Recipient description
   * @returns {Promise<Object>} Recipient creation response
   */
  async createTransferRecipient(request) {
    throw new Error('createTransferRecipient method must be implemented by subclass');
  }

  /**
   * Create split payment configuration
   * @param {Object} request - Split payment configuration request
   * @param {string} request.name - Split configuration name
   * @param {string} request.type - Split type (percentage or flat)
   * @param {Object[]} request.subaccounts - Array of subaccount configurations
   * @param {string} [request.currency] - Currency code (default: NGN)
   * @param {string} [request.bearerType] - Who bears the fees
   * @param {string} [request.bearerSubaccount] - Subaccount that bears fees
   * @returns {Promise<Object>} Split configuration response
   */
  async createSplitPayment(request) {
    throw new Error('createSplitPayment method must be implemented by subclass');
  }

  /**
   * Fetch split payment configuration
   * @param {string} splitCode - Split configuration code
   * @returns {Promise<Object>} Split configuration details
   */
  async fetchSplitPayment(splitCode) {
    throw new Error('fetchSplitPayment method must be implemented by subclass');
  }

  /**
   * Create sub-account
   * @param {Object} request - Sub-account creation request
   * @param {string} request.businessName - Business name
   * @param {string} request.settlementBank - Settlement bank code
   * @param {string} request.accountNumber - Bank account number
   * @param {number} request.percentageCharge - Percentage charge
   * @param {string} [request.description] - Account description
   * @param {string} [request.primaryContactEmail] - Primary contact email
   * @param {string} [request.primaryContactName] - Primary contact name
   * @param {string} [request.settlementSchedule] - Settlement schedule
   * @returns {Promise<Object>} Sub-account creation response
   */
  async createSubAccount(request) {
    throw new Error('createSubAccount method must be implemented by subclass');
  }

  /**
   * Fetch transaction history
   * @param {Object} [options] - Query options
   * @param {number} [options.perPage=50] - Number of transactions per page
   * @param {number} [options.page=1] - Page number
   * @param {string} [options.from] - Start date filter
   * @param {string} [options.to] - End date filter
   * @param {string} [options.customer] - Customer filter
   * @param {string} [options.status] - Status filter
   * @param {number} [options.amount] - Amount filter
   * @returns {Promise<Object>} Transaction history response
   */
  async fetchTransactions(options = {}) {
    throw new Error('fetchTransactions method must be implemented by subclass');
  }

  /**
   * Fetch account balance
   * @returns {Promise<Object>} Account balance response
   */
  async fetchBalance() {
    throw new Error('fetchBalance method must be implemented by subclass');
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(payload, signature) {
    throw new Error('verifyWebhookSignature method must be implemented by subclass');
  }

  /**
   * Convert gateway-specific errors to standard PaymentError
   * @param {Object} errorResponse - Gateway error response
   * @returns {PaymentError} Standardized payment error
   */
  convertGatewayError(errorResponse) {
    throw new Error('convertGatewayError method must be implemented by subclass');
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   * @param {Object} headers - Request headers
   * @returns {Object} Sanitized headers
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    if (sanitized.Authorization) {
      sanitized.Authorization = sanitized.Authorization.replace(/Bearer\s+.+/, 'Bearer ***');
    }
    return sanitized;
  }

  /**
   * Sanitize response data for logging (remove sensitive fields)
   * @param {Object} data - Response data
   * @returns {Object} Sanitized data
   */
  sanitizeResponseData(data) {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove sensitive fields
    if (sanitized.data?.access_code) {
      sanitized.data.access_code = '***';
    }
    
    if (sanitized.data?.authorization?.authorization_code) {
      sanitized.data.authorization.authorization_code = '***';
    }
    
    if (sanitized.data?.customer?.authorization_code) {
      sanitized.data.customer.authorization_code = '***';
    }
    
    return sanitized;
  }

  /**
   * Create HTTP client with common configuration
   * @param {string} baseURL - Base URL for API
   * @param {string} secretKey - Secret key for authentication
   * @param {number} timeout - Request timeout in milliseconds
   * @returns {Object} Configured axios instance
   */
  createHttpClient(baseURL, secretKey, timeout = 30000) {
    const client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Setup request interceptor for logging
    client.interceptors.request.use(
      (config) => {
        logger.debug('Payment gateway API request', {
          method: config.method,
          url: config.url,
          headers: this.sanitizeHeaders(config.headers)
        });
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Setup response interceptor for logging and error handling
    client.interceptors.response.use(
      (response) => {
        logger.debug('Payment gateway API response', {
          status: response.status,
          url: response.config.url,
          data: this.sanitizeResponseData(response.data)
        });
        return response;
      },
      (error) => {
        logger.error('Payment gateway API error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data
        });
        
        // Convert gateway errors to our error format
        if (error.response) {
          throw this.convertGatewayError(error.response);
        }
        
        throw error;
      }
    );
    
    return client;
  }
}

export default PaymentGateway;