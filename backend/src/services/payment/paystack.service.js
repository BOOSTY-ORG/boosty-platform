import crypto from 'crypto';
import PaymentGateway from './paymentGateway.service.js';
import {
  PaymentError,
  PaymentErrorType,
} from '../../utils/payment/paymentErrors.util.js';
import logger from '../../utils/payment/paymentLogger.util.js';

/**
 * Paystack Payment Service Implementation
 * Implements PaymentGateway interface for Paystack payment processing
 */
class PaystackService extends PaymentGateway {
  constructor() {
    super();
    this.baseURL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY;
    this.webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
    this.timeout = parseInt(process.env.PAYSTACK_TIMEOUT) || 30000;

    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY environment variable is required');
    }

    this.client = this.createHttpClient(
      this.baseURL,
      this.secretKey,
      this.timeout
    );
  }

  /**
   * Initialize payment transaction
   * @param {Object} request - Payment initialization request
   * @returns {Promise<Object>} Payment initialization response
   */
  async initializePayment(request) {
    const response = await this.client.post('/transaction/initialize', {
      amount: request.amount * 100, // Convert to kobo
      email: request.email,
      reference: request.reference,
      callback_url: request.callbackUrl,
      metadata: request.metadata,
      channels: request.channels,
      split_code: request.splitCode,
      subaccount: request.subaccount,
      currency: request.currency || 'NGN',
    });

    return response.data;
  }

  /**
   * Verify transaction status
   * @param {string} reference - Transaction reference to verify
   * @returns {Promise<Object>} Transaction verification response
   */
  async verifyTransaction(reference) {
    const response = await this.client.get(`/transaction/verify/${reference}`);
    return response.data;
  }

  /**
   * Process refund
   * @param {Object} request - Refund request
   * @returns {Promise<Object>} Refund processing response
   */
  async processRefund(request) {
    const response = await this.client.post('/refund', {
      transaction: request.transactionId,
      amount: request.amount * 100, // Convert to kobo
      currency: request.currency || 'NGN',
      reason: request.reason,
      customer_note: request.customerNote,
    });

    return response.data;
  }

  /**
   * Create transfer/disbursement
   * @param {Object} request - Transfer request
   * @returns {Promise<Object>} Transfer creation response
   */
  async createTransfer(request) {
    const response = await this.client.post('/transfer', {
      source: 'balance',
      amount: request.amount * 100, // Convert to kobo
      reference: request.reference,
      recipient: request.recipientCode,
      reason: request.reason,
      currency: request.currency || 'NGN',
    });

    return response.data;
  }

  /**
   * Create transfer recipient
   * @param {Object} request - Recipient creation request
   * @returns {Promise<Object>} Recipient creation response
   */
  async createTransferRecipient(request) {
    const response = await this.client.post('/transferrecipient', {
      type: request.type, // nuban, mobile_money, card
      name: request.name,
      account_number: request.accountNumber,
      bank_code: request.bankCode,
      currency: request.currency || 'NGN',
      email: request.email,
      description: request.description,
    });

    return response.data;
  }

  /**
   * Create split payment configuration
   * @param {Object} request - Split payment configuration request
   * @returns {Promise<Object>} Split configuration response
   */
  async createSplitPayment(request) {
    const response = await this.client.post('/split', {
      name: request.name,
      type: request.type, // percentage or flat
      currency: request.currency || 'NGN',
      subaccounts: request.subaccounts,
      bearer_type: request.bearerType, // account, subaccount, all
      bearer_subaccount: request.bearerSubaccount,
    });

    return response.data;
  }

  /**
   * Fetch split payment configuration
   * @param {string} splitCode - Split configuration code
   * @returns {Promise<Object>} Split configuration details
   */
  async fetchSplitPayment(splitCode) {
    const response = await this.client.get(`/split/${splitCode}`);
    return response.data;
  }

  /**
   * Create sub-account
   * @param {Object} request - Sub-account creation request
   * @returns {Promise<Object>} Sub-account creation response
   */
  async createSubAccount(request) {
    const response = await this.client.post('/subaccount', {
      business_name: request.businessName,
      settlement_bank: request.settlementBank,
      account_number: request.accountNumber,
      percentage_charge: request.percentageCharge,
      description: request.description,
      primary_contact_email: request.primaryContactEmail,
      primary_contact_name: request.primaryContactName,
      settlement_schedule: request.settlementSchedule, // auto, weekly, monthly, manual
    });

    return response.data;
  }

  /**
   * Fetch transaction history
   * @param {Object} [options={}] - Query options
   * @returns {Promise<Object>} Transaction history response
   */
  async fetchTransactions(options = {}) {
    const params = {
      perPage: options.perPage || 50,
      page: options.page || 1,
      from: options.from,
      to: options.to,
      customer: options.customer,
      status: options.status,
      amount: options.amount,
    };

    const response = await this.client.get('/transaction', { params });
    return response.data;
  }

  /**
   * Fetch account balance
   * @returns {Promise<Object>} Account balance response
   */
  async fetchBalance() {
    const response = await this.client.get('/balance');
    return response.data;
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha512', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Convert Paystack API errors to our error format
   * @param {Object} errorResponse - Paystack error response
   * @returns {PaymentError} Standardized payment error
   */
  convertGatewayError(errorResponse) {
    const { status, data } = errorResponse;

    const errorMap = {
      400: PaymentErrorType.VALIDATION_ERROR,
      401: PaymentErrorType.AUTHENTICATION_ERROR,
      403: PaymentErrorType.AUTHORIZATION_ERROR,
      404: PaymentErrorType.NOT_FOUND,
      409: PaymentErrorType.DUPLICATE_TRANSACTION,
      422: PaymentErrorType.VALIDATION_ERROR,
      429: PaymentErrorType.RATE_LIMIT_EXCEEDED,
      500: PaymentErrorType.SYSTEM_ERROR,
      502: PaymentErrorType.NETWORK_ERROR,
      503: PaymentErrorType.SERVICE_UNAVAILABLE,
      504: PaymentErrorType.TIMEOUT_ERROR,
    };

    let errorType = errorMap[status] || PaymentErrorType.SYSTEM_ERROR;

    // Extract specific error details from Paystack response
    let message = data?.message || 'Payment processing error';
    let details = null;

    if (data?.errors) {
      details = { errors: data.errors };
    }

    // Handle specific Paystack error scenarios
    if (data?.message) {
      if (data.message.includes('Insufficient')) {
        errorType = PaymentErrorType.INSUFFICIENT_FUNDS;
        message = 'Insufficient funds for this transaction';
      } else if (data.message.includes('duplicate')) {
        errorType = PaymentErrorType.DUPLICATE_TRANSACTION;
        message = 'Duplicate transaction detected';
      } else if (data.message.includes('fraud')) {
        errorType = PaymentErrorType.FRAUD_DETECTED;
        message = 'Transaction flagged for fraud review';
      }
    }

    return new PaymentError(
      errorType,
      data?.code || 'PAYSTACK_ERROR',
      message,
      {
        status,
        paystackCode: data?.code,
        paystackMessage: data?.message,
        details,
      },
      status
    );
  }

  /**
   * Get available banks for transfers
   * @returns {Promise<Object>} List of available banks
   */
  async getBanks() {
    const response = await this.client.get('/bank');
    return response.data;
  }

  /**
   * Resolve bank account
   * @param {string} accountNumber - Bank account number
   * @param {string} bankCode - Bank code
   * @returns {Promise<Object>} Account resolution response
   */
  async resolveAccount(accountNumber, bankCode) {
    const response = await this.client.post('/bank/resolve', {
      account_number: accountNumber,
      bank_code: bankCode,
    });

    return response.data;
  }

  /**
   * Create customer
   * @param {Object} request - Customer creation request
   * @returns {Promise<Object>} Customer creation response
   */
  async createCustomer(request) {
    const response = await this.client.post('/customer', {
      email: request.email,
      first_name: request.firstName,
      last_name: request.lastName,
      phone: request.phone,
      metadata: request.metadata,
    });

    return response.data;
  }

  /**
   * Initialize transaction with authorization
   * @param {Object} request - Authorization request
   * @returns {Promise<Object>} Authorization response
   */
  async chargeAuthorization(request) {
    const response = await this.client.post(
      '/transaction/charge_authorization',
      {
        authorization_code: request.authorizationCode,
        email: request.email,
        amount: request.amount * 100, // Convert to kobo
        reference: request.reference,
        metadata: request.metadata,
      }
    );

    return response.data;
  }

  /**
   * Validate webhook event type
   * @param {string} event - Webhook event type
   * @returns {boolean} True if event is valid
   */
  isValidWebhookEvent(event) {
    const validEvents = [
      'charge.success',
      'charge.failed',
      'transfer.success',
      'transfer.failed',
      'transfer.reversed',
      'refund.processed',
      'invoice.create',
      'invoice.update',
      'customer.create',
      'customer.update',
      'subscription.create',
      'subscription.disable',
      'subscription.enable',
      'invoice.payment_failed',
    ];

    return validEvents.includes(event);
  }

  /**
   * Parse webhook event data
   * @param {Object} eventData - Raw webhook event data
   * @returns {Object} Parsed webhook event
   */
  parseWebhookEvent(eventData) {
    const { event, data } = eventData;

    if (!this.isValidWebhookEvent(event)) {
      throw new PaymentError(
        PaymentErrorType.WEBHOOK_ERROR,
        'INVALID_WEBHOOK_EVENT',
        `Invalid webhook event: ${event}`,
        { event }
      );
    }

    return {
      eventType: event,
      transactionData: data,
      timestamp: new Date().toISOString(),
    };
  }
}

export default PaystackService;
