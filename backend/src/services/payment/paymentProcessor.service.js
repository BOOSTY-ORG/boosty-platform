import PaystackService from './paystack.service.js';
import {
  PaymentError,
  PaymentErrorType,
} from '../../utils/payment/paymentErrors.util.js';
import logger from '../../utils/payment/paymentLogger.util.js';

/**
 * Payment Processor Service
 * Orchestrates payment processing workflow and handles business logic
 */
class PaymentProcessorService {
  constructor() {
    this.paystackService = new PaystackService();
  }

  /**
   * Process a payment request through the complete payment flow
   * @param {Object} request - Payment request object
   * @param {string} request.transactionId - Unique transaction ID
   * @param {string} request.reference - Payment reference
   * @param {string} request.type - Transaction type
   * @param {number} request.amount - Payment amount
   * @param {string} request.currency - Currency code
   * @param {string} request.paymentMethod - Payment method
   * @param {Object} request.payer - Payer information
   * @param {Object} request.payee - Payee information
   * @param {string} [request.callbackUrl] - Callback URL
   * @param {Object} [request.metadata] - Additional metadata
   * @param {Object} [request.splitConfig] - Split payment configuration
   * @returns {Promise<Object>} Payment processing result
   */
  async processPayment(request) {
    const startTime = Date.now();

    try {
      logger.info('Starting payment processing', {
        transactionId: request.transactionId,
        reference: request.reference,
        amount: request.amount,
        type: request.type,
      });

      // Validate payment request
      await this.validatePaymentRequest(request);

      // Initialize payment with Paystack
      const paymentResponse = await this.paystackService.initializePayment({
        amount: request.amount,
        email: request.payer.email,
        reference: request.reference,
        callbackUrl: request.callbackUrl,
        metadata: {
          transactionId: request.transactionId,
          type: request.type,
          ...request.metadata,
        },
        channels: this.getPaymentChannels(request.paymentMethod),
        splitCode: request.splitConfig?.code,
        subaccount: request.payee.subaccount,
        currency: request.currency,
      });

      const processingTime = Date.now() - startTime;

      logger.logPaymentInitialization({
        transactionId: request.transactionId,
        reference: request.reference,
        amount: request.amount,
        paymentMethod: request.paymentMethod,
        userId: request.payer.id,
        processingTime,
      });

      return {
        success: true,
        data: {
          transactionId: request.transactionId,
          reference: paymentResponse.data.reference,
          accessCode: paymentResponse.data.access_code,
          authorizationUrl: paymentResponse.data.authorization_url,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        },
      };
    } catch (error) {
      logger.logPaymentFailure({
        reference: request.reference,
        error: error.message,
        amount: request.amount,
        transactionId: request.transactionId,
        errorDetails: error.details,
      });

      throw error;
    }
  }

  /**
   * Verify a payment transaction
   * @param {string} reference - Transaction reference to verify
   * @returns {Promise<Object>} Verification result
   */
  async verifyPayment(reference) {
    const startTime = Date.now();

    try {
      logger.info('Starting payment verification', { reference });

      // Verify with Paystack
      const verificationResponse =
        await this.paystackService.verifyTransaction(reference);

      const processingTime = Date.now() - startTime;

      if (verificationResponse.data.status === 'success') {
        logger.logPaymentVerification({
          reference,
          status: 'completed',
          amount: verificationResponse.data.amount / 100, // Convert from kobo
          transactionId: verificationResponse.data.metadata?.transactionId,
          processingTime,
        });

        return {
          success: true,
          data: {
            transactionId: verificationResponse.data.metadata?.transactionId,
            status: 'completed',
            amount: verificationResponse.data.amount / 100,
            currency: verificationResponse.data.currency,
            paidAt: verificationResponse.data.paid_at,
            paymentMethod: verificationResponse.data.channel,
            fees: {
              processingFee: verificationResponse.data.fees / 100,
              platformFee: this.calculatePlatformFee(
                verificationResponse.data.amount / 100
              ),
              transactionFee: verificationResponse.data.fees / 100,
            },
          },
        };
      } else {
        logger.logPaymentFailure({
          reference,
          error: verificationResponse.data.gateway_response,
          amount: verificationResponse.data.amount / 100,
        });

        throw new PaymentError(
          PaymentErrorType.PAYMENT_FAILED,
          'PAYMENT_VERIFICATION_FAILED',
          'Payment verification failed',
          {
            reference,
            gatewayResponse: verificationResponse.data.gateway_response,
          }
        );
      }
    } catch (error) {
      logger.error('Payment verification failed', {
        error: error.message,
        reference,
        processingTime: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Process a refund
   * @param {Object} request - Refund request
   * @param {string} request.transactionId - Original transaction ID
   * @param {number} request.amount - Refund amount
   * @param {string} request.reason - Refund reason
   * @param {string} [request.customerNote] - Note to customer
   * @returns {Promise<Object>} Refund processing result
   */
  async processRefund(request) {
    const startTime = Date.now();

    try {
      logger.info('Starting refund processing', {
        transactionId: request.transactionId,
        amount: request.amount,
        reason: request.reason,
      });

      // Validate refund request
      await this.validateRefundRequest(request);

      // Process refund with Paystack
      const refundResponse = await this.paystackService.processRefund({
        transactionId: request.transactionId,
        amount: request.amount,
        reason: request.reason,
        customerNote: request.customerNote,
      });

      const processingTime = Date.now() - startTime;

      logger.logRefundProcessing({
        transactionId: request.transactionId,
        refundId: refundResponse.data.id,
        amount: request.amount,
        reason: request.reason,
        status: refundResponse.data.status,
      });

      return {
        success: true,
        data: {
          refundId: refundResponse.data.id,
          transactionId: request.transactionId,
          amount: request.amount,
          status: refundResponse.data.status,
          refundDate: refundResponse.data.createdAt,
          reason: request.reason,
        },
      };
    } catch (error) {
      logger.error('Refund processing failed', {
        error: error.message,
        transactionId: request.transactionId,
        amount: request.amount,
        processingTime: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Process a disbursement/transfer
   * @param {Object} request - Disbursement request
   * @param {string} request.transactionId - Transaction ID
   * @param {string} request.recipientCode - Recipient code
   * @param {number} request.amount - Transfer amount
   * @param {string} request.reason - Transfer reason
   * @param {string} [request.currency] - Currency code
   * @param {Object} [request.metadata] - Additional metadata
   * @returns {Promise<Object>} Disbursement processing result
   */
  async processDisbursement(request) {
    const startTime = Date.now();

    try {
      logger.info('Starting disbursement processing', {
        transactionId: request.transactionId,
        recipientCode: request.recipientCode,
        amount: request.amount,
        reason: request.reason,
      });

      // Validate disbursement request
      await this.validateDisbursementRequest(request);

      // Generate unique reference
      const reference = `DIS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Process transfer with Paystack
      const transferResponse = await this.paystackService.createTransfer({
        amount: request.amount,
        reference,
        recipientCode: request.recipientCode,
        reason: request.reason,
        currency: request.currency || 'NGN',
      });

      const processingTime = Date.now() - startTime;

      logger.logDisbursementProcessing({
        transactionId: request.transactionId,
        recipientId: request.recipientCode,
        amount: request.amount,
        reason: request.reason,
        status: transferResponse.data.status,
      });

      return {
        success: true,
        data: {
          transferId: transferResponse.data.id,
          transactionId: request.transactionId,
          reference,
          amount: request.amount,
          status: transferResponse.data.status,
          transferDate: transferResponse.data.createdAt,
          reason: request.reason,
        },
      };
    } catch (error) {
      logger.error('Disbursement processing failed', {
        error: error.message,
        transactionId: request.transactionId,
        amount: request.amount,
        processingTime: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Create a transfer recipient
   * @param {Object} request - Recipient creation request
   * @returns {Promise<Object>} Recipient creation result
   */
  async createTransferRecipient(request) {
    try {
      logger.info('Creating transfer recipient', {
        type: request.type,
        name: request.name,
        accountNumber: request.accountNumber?.substring(0, 4) + '****', // Mask for logging
      });

      const recipientResponse =
        await this.paystackService.createTransferRecipient(request);

      return {
        success: true,
        data: {
          recipientCode: recipientResponse.data.recipient_code,
          name: recipientResponse.data.name,
          type: recipientResponse.data.type,
          createdAt: recipientResponse.data.createdAt,
        },
      };
    } catch (error) {
      logger.error('Transfer recipient creation failed', {
        error: error.message,
        type: request.type,
        name: request.name,
      });

      throw error;
    }
  }

  /**
   * Get account balance
   * @returns {Promise<Object>} Account balance information
   */
  async getBalance() {
    try {
      const balanceResponse = await this.paystackService.fetchBalance();

      return {
        success: true,
        data: {
          currency: balanceResponse.data[0].currency,
          balance: balanceResponse.data[0].balance / 100, // Convert from kobo
          ledger_balance: balanceResponse.data[0].ledger_balance / 100,
        },
      };
    } catch (error) {
      logger.error('Balance fetch failed', {
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Validate payment request
   * @param {Object} request - Payment request to validate
   * @private
   */
  async validatePaymentRequest(request) {
    // Required fields validation
    const requiredFields = [
      'transactionId',
      'reference',
      'type',
      'amount',
      'currency',
      'paymentMethod',
      'payer',
      'payee',
    ];
    for (const field of requiredFields) {
      if (!request[field]) {
        throw new PaymentError(
          PaymentErrorType.VALIDATION_ERROR,
          'MISSING_REQUIRED_FIELD',
          `Missing required field: ${field}`,
          { field }
        );
      }
    }

    // Amount validation
    if (request.amount <= 0) {
      throw new PaymentError(
        PaymentErrorType.INVALID_AMOUNT,
        'INVALID_AMOUNT',
        'Amount must be greater than 0',
        { amount: request.amount }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.payer.email)) {
      throw new PaymentError(
        PaymentErrorType.VALIDATION_ERROR,
        'INVALID_EMAIL',
        'Invalid email address',
        { email: request.payer.email }
      );
    }

    // Transaction type validation
    const validTypes = ['investment', 'repayment', 'fee', 'refund', 'penalty'];
    if (!validTypes.includes(request.type)) {
      throw new PaymentError(
        PaymentErrorType.VALIDATION_ERROR,
        'INVALID_TRANSACTION_TYPE',
        'Invalid transaction type',
        { type: request.type }
      );
    }

    // Payment method validation
    const validMethods = [
      'card',
      'bank_transfer',
      'mobile_money',
      'ussd',
      'all',
    ];
    if (!validMethods.includes(request.paymentMethod)) {
      throw new PaymentError(
        PaymentErrorType.VALIDATION_ERROR,
        'INVALID_PAYMENT_METHOD',
        'Invalid payment method',
        { paymentMethod: request.paymentMethod }
      );
    }
  }

  /**
   * Validate refund request
   * @param {Object} request - Refund request to validate
   * @private
   */
  async validateRefundRequest(request) {
    // Required fields validation
    const requiredFields = ['transactionId', 'amount', 'reason'];
    for (const field of requiredFields) {
      if (!request[field]) {
        throw new PaymentError(
          PaymentErrorType.VALIDATION_ERROR,
          'MISSING_REQUIRED_FIELD',
          `Missing required field: ${field}`,
          { field }
        );
      }
    }

    // Amount validation
    if (request.amount <= 0) {
      throw new PaymentError(
        PaymentErrorType.INVALID_AMOUNT,
        'INVALID_AMOUNT',
        'Refund amount must be greater than 0',
        { amount: request.amount }
      );
    }
  }

  /**
   * Validate disbursement request
   * @param {Object} request - Disbursement request to validate
   * @private
   */
  async validateDisbursementRequest(request) {
    // Required fields validation
    const requiredFields = [
      'transactionId',
      'recipientCode',
      'amount',
      'reason',
    ];
    for (const field of requiredFields) {
      if (!request[field]) {
        throw new PaymentError(
          PaymentErrorType.VALIDATION_ERROR,
          'MISSING_REQUIRED_FIELD',
          `Missing required field: ${field}`,
          { field }
        );
      }
    }

    // Amount validation
    if (request.amount <= 0) {
      throw new PaymentError(
        PaymentErrorType.INVALID_AMOUNT,
        'INVALID_AMOUNT',
        'Disbursement amount must be greater than 0',
        { amount: request.amount }
      );
    }
  }

  /**
   * Get payment channels based on payment method
   * @param {string} paymentMethod - Payment method
   * @returns {string[]} Array of payment channels
   * @private
   */
  getPaymentChannels(paymentMethod) {
    const channelMap = {
      card: ['card'],
      bank_transfer: ['bank_transfer'],
      mobile_money: ['mobile_money'],
      ussd: ['ussd'],
      all: ['card', 'bank_transfer', 'mobile_money', 'ussd'],
    };

    return channelMap[paymentMethod] || channelMap['all'];
  }

  /**
   * Calculate platform fee based on transaction amount
   * @param {number} amount - Transaction amount
   * @returns {number} Platform fee amount
   * @private
   */
  calculatePlatformFee(amount) {
    // Example: 0.5% platform fee with minimum of 100 NGN
    const percentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 0.005;
    const minimum = parseFloat(process.env.MINIMUM_PLATFORM_FEE) || 100;

    const calculatedFee = amount * percentage;
    return Math.max(calculatedFee, minimum);
  }
}

export default PaymentProcessorService;
