import PaymentProcessorService from '../services/payment/paymentProcessor.service.js';
import {
  validatePaymentInitialization,
  validatePaymentVerification,
} from '../middleware/payment/validation.middleware.js';
import {
  formatSuccessResponse,
  formatErrorResponse,
} from '../utils/metrics/responseFormatter.util.js';
import { requireMetricsAuth } from '../middleware/metrics/auth.middleware.js';
import logger from '../utils/payment/paymentLogger.util.js';

/**
 * Payment Controller
 * Handles all payment-related API endpoints
 */
class PaymentController {
  constructor() {
    this.paymentProcessor = new PaymentProcessorService();
  }

  /**
   * Initialize payment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async initializePayment(req, res) {
    const startTime = Date.now();

    try {
      // Generate unique reference
      const reference = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Process payment
      const result = await this.paymentProcessor.processPayment({
        transactionId: req.validatedBody.transactionId,
        reference,
        type: req.validatedBody.transactionType,
        amount: req.validatedBody.amount,
        currency: req.validatedBody.currency || 'NGN',
        paymentMethod: req.validatedBody.paymentMethod,
        payer: {
          entity: 'investor',
          id: req.auth._id,
          email: req.validatedBody.email,
        },
        payee: {
          entity: 'system',
          id: null,
          subaccount: req.validatedBody.subaccount,
        },
        callbackUrl: req.validatedBody.callbackUrl,
        metadata: {
          ...req.validatedBody.metadata,
          userId: req.auth._id,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
        },
        splitConfig: req.validatedBody.split,
      });

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Payment initialized successfully', {
        transactionId: result.data.transactionId,
        reference: result.data.reference,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 201,
        url: req.url,
        responseTime: processingTime,
      });

      return res.status(201).json(formatSuccessResponse(result.data, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Payment initialization failed', {
        error: error.message,
        userId: req.auth._id,
        requestBody: req.validatedBody,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: error.statusCode || 500,
        url: req.url,
        responseTime: processingTime,
      });

      return res.status(error.statusCode || 500).json(
        formatErrorResponse(
          {
            code: error.code || 'PAYMENT_INITIALIZATION_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Verify payment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyPayment(req, res) {
    const startTime = Date.now();

    try {
      const { reference } = req.validatedQuery;

      // Verify payment
      const result = await this.paymentProcessor.verifyPayment(reference);

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Payment verified successfully', {
        reference,
        transactionId: result.data.transactionId,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(result.data, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Payment verification failed', {
        error: error.message,
        reference: req.validatedQuery.reference,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: error.statusCode || 500,
        url: req.url,
        responseTime: processingTime,
      });

      return res.status(error.statusCode || 500).json(
        formatErrorResponse(
          {
            code: error.code || 'PAYMENT_VERIFICATION_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get transaction details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTransaction(req, res) {
    const startTime = Date.now();

    try {
      const { transactionId } = req.params;

      // Get transaction details (this would typically use the PaymentTransaction model)
      // const transaction = await PaymentTransaction.findByTransactionId(transactionId);

      // For now, return a mock response
      const transaction = {
        transactionId,
        type: 'investment',
        amount: 10000,
        currency: 'NGN',
        status: 'completed',
        paymentMethod: 'card',
        createdAt: new Date(),
        completedAt: new Date(),
      };

      if (!transaction) {
        return res.status(404).json(
          formatErrorResponse(
            {
              code: 'TRANSACTION_NOT_FOUND',
              message: 'Transaction not found',
            },
            req,
            404
          )
        );
      }

      // Check ownership or admin access
      const isOwner =
        transaction.fromEntityId?.toString() === req.auth._id.toString();
      const isAdmin = ['admin', 'manager', 'superadmin'].includes(
        req.user?.role
      );

      if (!isOwner && !isAdmin) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'ACCESS_DENIED',
              message: 'You can only access your own transactions',
            },
            req,
            403
          )
        );
      }

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(
        formatSuccessResponse(
          {
            transactionId: transaction.transactionId,
            type: transaction.type,
            amount: transaction.amount,
            currency: transaction.currency,
            status: transaction.status,
            paymentMethod: transaction.paymentMethod,
            createdAt: transaction.createdAt,
            completedAt: transaction.completedAt,
            fees: transaction.fees || {},
            metadata: transaction.metadata || {},
          },
          req
        )
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Get transaction failed', {
        error: error.message,
        transactionId: req.params.transactionId,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 500,
        url: req.url,
        responseTime: processingTime,
      });

      return res.status(500).json(
        formatErrorResponse(
          {
            code: 'GET_TRANSACTION_FAILED',
            message: error.message,
          },
          req,
          500
        )
      );
    }
  }

  /**
   * Get transaction list
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTransactions(req, res) {
    const startTime = Date.now();

    try {
      const {
        page = 1,
        limit = 20,
        status,
        type,
        paymentMethod,
        startDate,
        endDate,
      } = req.query;

      // Build filter
      const filter = {};

      // If not admin, only show user's transactions
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        filter.fromEntityId = req.auth._id;
      }

      if (status) filter.status = status;
      if (type) filter.type = type;
      if (paymentMethod) filter.paymentMethod = paymentMethod;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      // Get transactions (this would typically use the PaymentTransaction model)
      // const transactions = await PaymentTransaction.findWithPagination(
      //   filter,
      //   { page: parseInt(page), limit: parseInt(limit) },
      //   { createdAt: -1 }
      // );

      // For now, return mock data
      const transactions = {
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      };

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(transactions, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Get transactions failed', {
        error: error.message,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 500,
        url: req.url,
        responseTime: processingTime,
      });

      return res.status(500).json(
        formatErrorResponse(
          {
            code: 'GET_TRANSACTIONS_FAILED',
            message: error.message,
          },
          req,
          500
        )
      );
    }
  }

  /**
   * Process refund
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async processRefund(req, res) {
    const startTime = Date.now();

    try {
      // Check if user has refund permissions
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'You do not have permission to process refunds',
            },
            req,
            403
          )
        );
      }

      // Process refund
      const result = await this.paymentProcessor.processRefund({
        transactionId: req.validatedBody.transactionId,
        amount: req.validatedBody.amount,
        reason: req.validatedBody.reason,
        customerNote: req.validatedBody.customerNote,
      });

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Refund processed successfully', {
        transactionId: req.validatedBody.transactionId,
        refundId: result.data.refundId,
        amount: req.validatedBody.amount,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(result.data, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Refund processing failed', {
        error: error.message,
        transactionId: req.validatedBody?.transactionId,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: error.statusCode || 500,
        url: req.url,
        responseTime: processingTime,
      });

      return res.status(error.statusCode || 500).json(
        formatErrorResponse(
          {
            code: error.code || 'REFUND_PROCESSING_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get account balance
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBalance(req, res) {
    const startTime = Date.now();

    try {
      // Check if user has balance permissions
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'You do not have permission to view account balance',
            },
            req,
            403
          )
        );
      }

      // Get balance
      const result = await this.paymentProcessor.getBalance();

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(result.data, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Get balance failed', {
        error: error.message,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: error.statusCode || 500,
        url: req.url,
        responseTime: processingTime,
      });

      return res.status(error.statusCode || 500).json(
        formatErrorResponse(
          {
            code: error.code || 'GET_BALANCE_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Create transfer recipient
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createTransferRecipient(req, res) {
    const startTime = Date.now();

    try {
      // Check if user has recipient creation permissions
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'INSUFFICIENT_PERMISSIONS',
              message:
                'You do not have permission to create transfer recipients',
            },
            req,
            403
          )
        );
      }

      // Create recipient
      const result = await this.paymentProcessor.createTransferRecipient(
        req.validatedBody
      );

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Transfer recipient created successfully', {
        recipientCode: result.data.recipientCode,
        name: req.validatedBody.name,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 201,
        url: req.url,
        responseTime: processingTime,
      });

      return res.status(201).json(formatSuccessResponse(result.data, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Create transfer recipient failed', {
        error: error.message,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: error.statusCode || 500,
        url: req.url,
        responseTime: processingTime,
      });

      return res.status(error.statusCode || 500).json(
        formatErrorResponse(
          {
            code: error.code || 'CREATE_RECIPIENT_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }
}

// Apply authentication middleware
const paymentController = new PaymentController();

export const initializePayment = [
  requireMetricsAuth,
  validatePaymentInitialization,
  paymentController.initializePayment.bind(paymentController),
];

export const verifyPayment = [
  requireMetricsAuth,
  validatePaymentVerification,
  paymentController.verifyPayment.bind(paymentController),
];

export const getTransaction = [
  requireMetricsAuth,
  paymentController.getTransaction.bind(paymentController),
];

export const getTransactions = [
  requireMetricsAuth,
  paymentController.getTransactions.bind(paymentController),
];

export const processRefund = [
  requireMetricsAuth,
  paymentController.processRefund.bind(paymentController),
];

export const getBalance = [
  requireMetricsAuth,
  paymentController.getBalance.bind(paymentController),
];

export const createTransferRecipient = [
  requireMetricsAuth,
  paymentController.createTransferRecipient.bind(paymentController),
];

export default paymentController;
