import { Router } from 'express';
import {
  initializePayment,
  verifyPayment,
  getTransaction,
  getTransactions,
  processRefund,
  getBalance,
  createTransferRecipient,
} from '../controllers/payment.controller.js';
import {
  webhookRateLimit,
  webhookSecurityHeaders,
  webhookPayloadSizeLimit,
} from '../middleware/payment/webhookSignature.middleware.js';
import logger from '../utils/payment/paymentLogger.util.js';

/**
 * Payment Routes
 * Defines all payment-related API endpoints
 */
const router = Router();

/**
 * @route POST /api/payments/initialize
 * @desc Initialize a new payment transaction
 * @access Private
 */
router.post('/initialize', initializePayment);

/**
 * @route GET /api/payments/verify
 * @desc Verify a payment transaction status
 * @access Private
 */
router.get('/verify', verifyPayment);

/**
 * @route GET /api/payments/:transactionId
 * @desc Get transaction details by ID
 * @access Private
 */
router.get('/:transactionId', getTransaction);

/**
 * @route GET /api/payments
 * @desc Get list of transactions with pagination and filtering
 * @access Private
 */
router.get('/', getTransactions);

/**
 * @route POST /api/payments/refund
 * @desc Process a refund for a transaction
 * @access Admin/Manager only
 */
router.post('/refund', processRefund);

/**
 * @route GET /api/payments/balance
 * @desc Get account balance
 * @access Admin/Manager only
 */
router.get('/balance', getBalance);

/**
 * @route POST /api/payments/recipients
 * @desc Create a new transfer recipient
 * @access Admin/Manager only
 */
router.post('/recipients', createTransferRecipient);

/**
 * Payment analytics endpoints
 */

/**
 * @route GET /api/payments/metrics
 * @desc Get payment metrics and analytics
 * @access Admin/Manager only
 */
router.get('/metrics', async (req, res) => {
  const startTime = Date.now();

  try {
    // Check if user has analytics permissions
    if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to view payment metrics',
        },
      });
    }

    // Get payment metrics (this would typically use PaymentTransaction model)
    // const metrics = await PaymentTransaction.getPaymentStats({
    //   startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
    //   endDate: req.query.endDate ? new Date(req.query.endDate) : undefined
    // });

    // For now, return mock metrics
    const metrics = {
      totalTransactions: 1250,
      successfulTransactions: 1200,
      failedTransactions: 35,
      pendingTransactions: 15,
      totalAmount: 12500000,
      totalFees: 125000,
      netAmount: 12375000,
      averageAmount: 10000,
      successRate: 96,
      paymentMethods: {
        card: { count: 800, amount: 8000000, successRate: 97.5 },
        bank_transfer: { count: 300, amount: 3000000, successRate: 94.0 },
        mobile_money: { count: 100, amount: 1000000, successRate: 98.0 },
        ussd: { count: 50, amount: 500000, successRate: 92.0 },
      },
      dailyStats: [
        { date: '2023-12-01', transactions: 45, amount: 450000 },
        { date: '2023-12-02', transactions: 52, amount: 520000 },
        { date: '2023-12-03', transactions: 38, amount: 380000 },
      ],
      period: {
        startDate: req.query.startDate || '2023-12-01',
        endDate: req.query.endDate || '2023-12-03',
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

    return res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Get payment metrics failed', {
      error: error.message,
      userId: req.auth._id,
      processingTime,
    });

    logger.logApiResponse({
      statusCode: 500,
      url: req.url,
      responseTime: processingTime,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_PAYMENT_METRICS_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * @route GET /api/payments/methods
 * @desc Get available payment methods
 * @access Public
 */
router.get('/methods', (req, res) => {
  const startTime = Date.now();

  try {
    // Get available payment methods based on configuration
    const methods = [
      {
        id: 'card',
        name: 'Card Payment',
        description: 'Pay with debit/credit cards',
        enabled: process.env.ENABLE_CARD_PAYMENTS === 'true',
        fees: {
          processing: 1.5,
          platform: 0.5,
        },
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Direct bank transfer',
        enabled: process.env.ENABLE_BANK_TRANSFER === 'true',
        fees: {
          processing: 0.0,
          platform: 0.0,
        },
      },
      {
        id: 'mobile_money',
        name: 'Mobile Money',
        description: 'Mobile money payment',
        enabled: process.env.ENABLE_MOBILE_MONEY === 'true',
        fees: {
          processing: 1.0,
          platform: 0.5,
        },
      },
      {
        id: 'ussd',
        name: 'USSD',
        description: 'USSD payment',
        enabled: process.env.ENABLE_USSD_PAYMENTS === 'true',
        fees: {
          processing: 0.5,
          platform: 0.5,
        },
      },
    ];

    const processingTime = Date.now() - startTime;

    logger.logApiRequest({
      method: req.method,
      url: req.url,
    });

    logger.logApiResponse({
      statusCode: 200,
      url: req.url,
      responseTime: processingTime,
    });

    return res.json({
      success: true,
      data: {
        methods: methods.filter((method) => method.enabled),
        currency: 'NGN',
        minimumAmount: parseInt(process.env.MIN_TRANSACTION_AMOUNT) || 100,
        maximumAmount: parseInt(process.env.MAX_TRANSACTION_AMOUNT) || 10000000,
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Get payment methods failed', {
      error: error.message,
      processingTime,
    });

    logger.logApiResponse({
      statusCode: 500,
      url: req.url,
      responseTime: processingTime,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_PAYMENT_METHODS_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * @route GET /api/payments/fees
 * @desc Get payment fee structure
 * @access Public
 */
router.get('/fees', (req, res) => {
  const startTime = Date.now();

  try {
    // Get fee structure
    const fees = {
      platform: {
        percentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 0.5,
        minimum: parseFloat(process.env.MINIMUM_PLATFORM_FEE) || 100,
        maximum: parseFloat(process.env.MAXIMUM_PLATFORM_FEE) || 1000,
      },
      processing: {
        card: 1.5,
        bank_transfer: 0.0,
        mobile_money: 1.0,
        ussd: 0.5,
      },
      transaction: {
        percentage: 1.5,
        minimum: 100,
        maximum: 2000,
      },
      currency: 'NGN',
    };

    const processingTime = Date.now() - startTime;

    logger.logApiRequest({
      method: req.method,
      url: req.url,
    });

    logger.logApiResponse({
      statusCode: 200,
      url: req.url,
      responseTime: processingTime,
    });

    return res.json({
      success: true,
      data: fees,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Get payment fees failed', {
      error: error.message,
      processingTime,
    });

    logger.logApiResponse({
      statusCode: 500,
      url: req.url,
      responseTime: processingTime,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_PAYMENT_FEES_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * @route GET /api/payments/limits
 * @desc Get payment limits and restrictions
 * @access Public
 */
router.get('/limits', (req, res) => {
  const startTime = Date.now();

  try {
    // Get payment limits
    const limits = {
      minimum: {
        amount: parseInt(process.env.MIN_TRANSACTION_AMOUNT) || 100,
        description: 'Minimum transaction amount in NGN',
      },
      maximum: {
        amount: parseInt(process.env.MAX_TRANSACTION_AMOUNT) || 10000000,
        description: 'Maximum transaction amount in NGN',
      },
      daily: {
        amount: parseInt(process.env.DAILY_TRANSACTION_LIMIT) || 0,
        description: 'Daily transaction limit in NGN (0 = no limit)',
      },
      monthly: {
        amount: parseInt(process.env.MONTHLY_TRANSACTION_LIMIT) || 0,
        description: 'Monthly transaction limit in NGN (0 = no limit)',
      },
      retry: {
        maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3,
        backoffMultiplier:
          parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER) || 2,
        initialDelay: parseInt(process.env.INITIAL_RETRY_DELAY) || 1000,
      },
      currency: {
        supported: ['NGN'],
        default: 'NGN',
      },
    };

    const processingTime = Date.now() - startTime;

    logger.logApiRequest({
      method: req.method,
      url: req.url,
    });

    logger.logApiResponse({
      statusCode: 200,
      url: req.url,
      responseTime: processingTime,
    });

    return res.json({
      success: true,
      data: limits,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Get payment limits failed', {
      error: error.message,
      processingTime,
    });

    logger.logApiResponse({
      statusCode: 500,
      url: req.url,
      responseTime: processingTime,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_PAYMENT_LIMITS_FAILED',
        message: error.message,
      },
    });
  }
});

// Apply webhook security middleware to all routes
router.use(webhookSecurityHeaders);
router.use(webhookRateLimit(100, 900000)); // 100 requests per 15 minutes
router.use(webhookPayloadSizeLimit(1024 * 1024)); // 1MB max payload

export default router;
