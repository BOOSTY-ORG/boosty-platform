import PaystackService from './paystack.service.js';
import PaymentProcessorService from './paymentProcessor.service.js';
import {
  PaymentError,
  PaymentErrorType,
} from '../../utils/payment/paymentErrors.util.js';
import logger from '../../utils/payment/paymentLogger.util.js';

/**
 * Webhook Handler Service
 * Processes incoming webhooks from payment gateways
 */
class WebhookHandlerService {
  constructor() {
    this.paystackService = new PaystackService();
    this.paymentProcessor = new PaymentProcessorService();
  }

  /**
   * Process incoming webhook
   * @param {Object} request - Webhook request object
   * @param {string} request.signature - Webhook signature
   * @param {string} request.payload - Raw webhook payload
   * @param {Object} request.headers - Request headers
   * @returns {Promise<Object>} Webhook processing result
   */
  async processWebhook(request) {
    const startTime = Date.now();

    try {
      const { signature, payload, headers } = request;

      logger.info('Processing webhook', {
        signature: signature.substring(0, 20) + '...', // Log partial signature
        payloadLength: payload.length,
        userAgent: headers['user-agent'],
      });

      // Verify webhook signature
      if (!this.paystackService.verifyWebhookSignature(payload, signature)) {
        throw new PaymentError(
          PaymentErrorType.WEBHOOK_ERROR,
          'INVALID_WEBHOOK_SIGNATURE',
          'Webhook signature verification failed'
        );
      }

      // Parse webhook event
      const eventData = JSON.parse(payload);
      const parsedEvent = this.paystackService.parseWebhookEvent(eventData);

      // Process the event based on type
      const result = await this.processWebhookEvent(parsedEvent);

      const processingTime = Date.now() - startTime;

      logger.logWebhookProcessing({
        event: parsedEvent.eventType,
        reference: parsedEvent.transactionData?.reference,
        status: 'success',
        processingTime,
      });

      return {
        success: true,
        data: {
          event: parsedEvent.eventType,
          processed: true,
          result,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Webhook processing failed', {
        error: error.message,
        processingTime,
      });

      logger.logWebhookProcessing({
        event: 'unknown',
        reference: null,
        status: 'failed',
        processingTime,
      });

      throw error;
    }
  }

  /**
   * Process specific webhook event
   * @param {Object} parsedEvent - Parsed webhook event
   * @returns {Promise<Object>} Event processing result
   * @private
   */
  async processWebhookEvent(parsedEvent) {
    const { eventType, transactionData } = parsedEvent;

    switch (eventType) {
      case 'charge.success':
        return await this.handleChargeSuccess(transactionData);

      case 'charge.failed':
        return await this.handleChargeFailed(transactionData);

      case 'transfer.success':
        return await this.handleTransferSuccess(transactionData);

      case 'transfer.failed':
        return await this.handleTransferFailed(transactionData);

      case 'transfer.reversed':
        return await this.handleTransferReversed(transactionData);

      case 'refund.processed':
        return await this.handleRefundProcessed(transactionData);

      case 'invoice.create':
        return await this.handleInvoiceCreate(transactionData);

      case 'invoice.update':
        return await this.handleInvoiceUpdate(transactionData);

      case 'customer.create':
        return await this.handleCustomerCreate(transactionData);

      case 'customer.update':
        return await this.handleCustomerUpdate(transactionData);

      case 'subscription.create':
        return await this.handleSubscriptionCreate(transactionData);

      case 'subscription.disable':
        return await this.handleSubscriptionDisable(transactionData);

      case 'subscription.enable':
        return await this.handleSubscriptionEnable(transactionData);

      case 'invoice.payment_failed':
        return await this.handleInvoicePaymentFailed(transactionData);

      default:
        logger.warn('Unhandled webhook event', {
          eventType,
          transactionData,
        });
        return { status: 'ignored', reason: 'Unhandled event type' };
    }
  }

  /**
   * Handle successful charge event
   * @param {Object} transactionData - Transaction data from webhook
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async handleChargeSuccess(transactionData) {
    try {
      logger.info('Processing charge success', {
        reference: transactionData.reference,
        amount: transactionData.amount / 100,
        customer: transactionData.customer?.email,
      });

      // Verify transaction to get complete details
      const verificationResult = await this.paymentProcessor.verifyPayment(
        transactionData.reference
      );

      // Update transaction status in database
      // This would typically update your Transaction model
      // await TransactionModel.updateOne(
      //   { paystackReference: transactionData.reference },
      //   {
      //     status: 'completed',
      //     completedAt: new Date(transactionData.paid_at),
      //     paystackTransactionId: transactionData.id,
      //     fees: {
      //       processingFee: transactionData.fees / 100,
      //       platformFee: this.calculatePlatformFee(transactionData.amount / 100),
      //       transactionFee: transactionData.fees / 100
      //     }
      //   }
      // );

      return {
        status: 'processed',
        action: 'payment_completed',
        reference: transactionData.reference,
        amount: transactionData.amount / 100,
      };
    } catch (error) {
      logger.error('Failed to handle charge success', {
        error: error.message,
        reference: transactionData.reference,
      });

      throw error;
    }
  }

  /**
   * Handle failed charge event
   * @param {Object} transactionData - Transaction data from webhook
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async handleChargeFailed(transactionData) {
    try {
      logger.info('Processing charge failed', {
        reference: transactionData.reference,
        amount: transactionData.amount / 100,
        reason: transactionData.gateway_response,
      });

      // Update transaction status in database
      // await TransactionModel.updateOne(
      //   { paystackReference: transactionData.reference },
      //   {
      //     status: 'failed',
      //     failedAt: new Date(),
      //     failureReason: transactionData.gateway_response
      //   }
      // );

      return {
        status: 'processed',
        action: 'payment_failed',
        reference: transactionData.reference,
        reason: transactionData.gateway_response,
      };
    } catch (error) {
      logger.error('Failed to handle charge failed', {
        error: error.message,
        reference: transactionData.reference,
      });

      throw error;
    }
  }

  /**
   * Handle successful transfer event
   * @param {Object} transactionData - Transfer data from webhook
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async handleTransferSuccess(transactionData) {
    try {
      logger.info('Processing transfer success', {
        reference: transactionData.reference,
        amount: transactionData.amount / 100,
        recipient: transactionData.recipient?.name,
      });

      // Update disbursement status in database
      // await DisbursementModel.updateOne(
      //   { transferReference: transactionData.reference },
      //   {
      //     status: 'completed',
      //     completedAt: new Date(transactionData.transfer_date),
      //     transferId: transactionData.id
      //   }
      // );

      return {
        status: 'processed',
        action: 'transfer_completed',
        reference: transactionData.reference,
        amount: transactionData.amount / 100,
      };
    } catch (error) {
      logger.error('Failed to handle transfer success', {
        error: error.message,
        reference: transactionData.reference,
      });

      throw error;
    }
  }

  /**
   * Handle failed transfer event
   * @param {Object} transactionData - Transfer data from webhook
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async handleTransferFailed(transactionData) {
    try {
      logger.info('Processing transfer failed', {
        reference: transactionData.reference,
        amount: transactionData.amount / 100,
        reason: transactionData.reason,
      });

      // Update disbursement status in database
      // await DisbursementModel.updateOne(
      //   { transferReference: transactionData.reference },
      //   {
      //     status: 'failed',
      //     failedAt: new Date(),
      //     failureReason: transactionData.reason
      //   }
      // );

      return {
        status: 'processed',
        action: 'transfer_failed',
        reference: transactionData.reference,
        reason: transactionData.reason,
      };
    } catch (error) {
      logger.error('Failed to handle transfer failed', {
        error: error.message,
        reference: transactionData.reference,
      });

      throw error;
    }
  }

  /**
   * Handle reversed transfer event
   * @param {Object} transactionData - Transfer data from webhook
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async handleTransferReversed(transactionData) {
    try {
      logger.info('Processing transfer reversed', {
        reference: transactionData.reference,
        amount: transactionData.amount / 100,
        reason: transactionData.reason,
      });

      // Update disbursement status in database
      // await DisbursementModel.updateOne(
      //   { transferReference: transactionData.reference },
      //   {
      //     status: 'reversed',
      //     reversedAt: new Date(),
      //     reversalReason: transactionData.reason
      //   }
      // );

      return {
        status: 'processed',
        action: 'transfer_reversed',
        reference: transactionData.reference,
        amount: transactionData.amount / 100,
      };
    } catch (error) {
      logger.error('Failed to handle transfer reversed', {
        error: error.message,
        reference: transactionData.reference,
      });

      throw error;
    }
  }

  /**
   * Handle refund processed event
   * @param {Object} transactionData - Refund data from webhook
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async handleRefundProcessed(transactionData) {
    try {
      logger.info('Processing refund processed', {
        reference: transactionData.reference,
        amount: transactionData.amount / 100,
        reason: transactionData.reason,
      });

      // Update refund status in database
      // await TransactionModel.updateOne(
      //   { paystackReference: transactionData.reference },
      //   {
      //     refundStatus: 'completed',
      //     refundAmount: transactionData.amount / 100,
      //     refundReason: transactionData.reason,
      //     refundedAt: new Date(transactionData.createdAt)
      //   }
      // );

      return {
        status: 'processed',
        action: 'refund_completed',
        reference: transactionData.reference,
        amount: transactionData.amount / 100,
      };
    } catch (error) {
      logger.error('Failed to handle refund processed', {
        error: error.message,
        reference: transactionData.reference,
      });

      throw error;
    }
  }

  /**
   * Handle invoice create event
   * @param {Object} transactionData - Invoice data from webhook
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async handleInvoiceCreate(transactionData) {
    logger.info('Processing invoice create', {
      invoiceCode: transactionData.invoice_code,
      amount: transactionData.amount / 100,
      customer: transactionData.customer?.email,
    });

    return {
      status: 'processed',
      action: 'invoice_created',
      invoiceCode: transactionData.invoice_code,
    };
  }

  /**
   * Handle invoice update event
   * @param {Object} transactionData - Invoice data from webhook
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async handleInvoiceUpdate(transactionData) {
    logger.info('Processing invoice update', {
      invoiceCode: transactionData.invoice_code,
      status: transactionData.status,
      amount: transactionData.amount / 100,
    });

    return {
      status: 'processed',
      action: 'invoice_updated',
      invoiceCode: transactionData.invoice_code,
      status: transactionData.status,
    };
  }

  /**
   * Handle customer create event
   * @param {Object} transactionData - Customer data from webhook
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async handleCustomerCreate(transactionData) {
    logger.info('Processing customer create', {
      customerCode: transactionData.customer_code,
      email: transactionData.email,
      firstName: transactionData.first_name,
      lastName: transactionData.last_name,
    });

    return {
      status: 'processed',
      action: 'customer_created',
      customerCode: transactionData.customer_code,
    };
  }

  /**
   * Handle customer update event
   * @param {Object} transactionData - Customer data from webhook
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async handleCustomerUpdate(transactionData) {
    logger.info('Processing customer update', {
      customerCode: transactionData.customer_code,
      email: transactionData.email,
    });

    return {
      status: 'processed',
      action: 'customer_updated',
      customerCode: transactionData.customer_code,
    };
  }

  /**
   * Handle subscription create event
   * @param {Object} transactionData - Subscription data from webhook
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async handleSubscriptionCreate(transactionData) {
    logger.info('Processing subscription create', {
      subscriptionCode: transactionData.subscription_code,
      email: transactionData.email,
      amount: transactionData.amount / 100,
    });

    return {
      status: 'processed',
      action: 'subscription_created',
      subscriptionCode: transactionData.subscription_code,
    };
  }

  /**
   * Handle subscription disable event
   * @param {Object} transactionData - Subscription data from webhook
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async handleSubscriptionDisable(transactionData) {
    logger.info('Processing subscription disable', {
      subscriptionCode: transactionData.subscription_code,
      email: transactionData.email,
    });

    return {
      status: 'processed',
      action: 'subscription_disabled',
      subscriptionCode: transactionData.subscription_code,
    };
  }

  /**
   * Handle subscription enable event
   * @param {Object} transactionData - Subscription data from webhook
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async handleSubscriptionEnable(transactionData) {
    logger.info('Processing subscription enable', {
      subscriptionCode: transactionData.subscription_code,
      email: transactionData.email,
    });

    return {
      status: 'processed',
      action: 'subscription_enabled',
      subscriptionCode: transactionData.subscription_code,
    };
  }

  /**
   * Handle invoice payment failed event
   * @param {Object} transactionData - Invoice data from webhook
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async handleInvoicePaymentFailed(transactionData) {
    logger.info('Processing invoice payment failed', {
      invoiceCode: transactionData.invoice_code,
      amount: transactionData.amount / 100,
      reason: transactionData.reason,
    });

    return {
      status: 'processed',
      action: 'invoice_payment_failed',
      invoiceCode: transactionData.invoice_code,
      reason: transactionData.reason,
    };
  }

  /**
   * Calculate platform fee based on transaction amount
   * @param {number} amount - Transaction amount
   * @returns {number} Platform fee amount
   * @private
   */
  calculatePlatformFee(amount) {
    const percentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 0.005;
    const minimum = parseFloat(process.env.MINIMUM_PLATFORM_FEE) || 100;

    const calculatedFee = amount * percentage;
    return Math.max(calculatedFee, minimum);
  }
}

export default WebhookHandlerService;
