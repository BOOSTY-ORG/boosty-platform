import { Router } from 'express';
import WebhookHandlerService from '../services/payment/webhookHandler.service.js';
import {
  verifyWebhookSignature,
  webhookRateLimit,
} from '../middleware/payment/webhookSignature.middleware.js';
import logger from '../utils/payment/paymentLogger.util.js';

// Create webhook handler instance
const webhookHandler = new WebhookHandlerService();

/**
 * Webhook Routes
 * Handles all webhook endpoints from payment gateways
 */
const router = Router();

/**
 * @route POST /api/webhooks/paystack
 * @desc Handle Paystack webhooks
 * @access External (Paystack only)
 */
router.post(
  '/paystack',
  webhookRateLimit(100, 900000), // 100 requests per 15 minutes
  verifyWebhookSignature,
  async (req, res) => {
    const startTime = Date.now();

    try {
      // Get raw request body as string
      const payload = JSON.stringify(req.body);
      const signature = req.headers['x-paystack-signature'];

      // Process webhook
      const result = await webhookHandler.processWebhook({
        signature,
        payload,
        headers: req.headers,
      });

      const processingTime = Date.now() - startTime;

      logger.info('Webhook processed successfully', {
        event: result.data.event,
        processingTime,
      });

      // Return appropriate response based on event type
      if (result.data.event?.includes('charge.success')) {
        return res.status(200).json({
          success: true,
          message: 'Payment webhook processed successfully',
        });
      } else if (result.data.event?.includes('transfer.success')) {
        return res.status(200).json({
          success: true,
          message: 'Transfer webhook processed successfully',
        });
      } else {
        return res.status(200).json({
          success: true,
          message: 'Webhook processed successfully',
        });
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Webhook processing failed', {
        error: error.message,
        event: req.body?.event,
        processingTime,
      });

      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'WEBHOOK_PROCESSING_FAILED',
          message: error.message,
        },
      });
    }
  }
);

/**
 * @route GET /api/webhooks/status
 * @desc Get webhook processing status
 * @access Admin only
 */
router.get('/status', async (req, res) => {
  const startTime = Date.now();

  try {
    // Check if user has admin permissions
    if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to view webhook status',
        },
      });
    }

    // Get webhook processing statistics (this would typically use webhook logs)
    // const stats = await WebhookLog.getProcessingStats({
    //   startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
    //   endDate: req.query.endDate ? new Date(req.query.endDate) : undefined
    // });

    // For now, return mock webhook status
    const stats = {
      totalWebhooks: 1250,
      successfulWebhooks: 1200,
      failedWebhooks: 35,
      pendingWebhooks: 15,
      averageProcessingTime: 250, // milliseconds
      lastProcessed: new Date(),
      uptime: 99.8, // percentage
      recentEvents: [
        {
          event: 'charge.success',
          count: 450,
          lastOccurrence: new Date(Date.now() - 5 * 60 * 1000),
        },
        {
          event: 'transfer.success',
          count: 320,
          lastOccurrence: new Date(Date.now() - 15 * 60 * 1000),
        },
        {
          event: 'refund.processed',
          count: 180,
          lastOccurrence: new Date(Date.now() - 30 * 60 * 1000),
        },
      ],
      configuration: {
        endpointUrl: `${process.env.BASE_URL}/api/webhooks/paystack`,
        signatureVerification: true,
        rateLimiting: true,
        retryAttempts: 5,
        retryDelay: 5000, // milliseconds
        timeout: 30000, // milliseconds
      },
      period: {
        startDate:
          req.query.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: req.query.endDate || new Date(),
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
      data: stats,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Get webhook status failed', {
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
        code: 'GET_WEBHOOK_STATUS_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * @route POST /api/webhooks/test
 * @desc Test webhook endpoint for development
 * @access Admin only
 */
router.post('/test', async (req, res) => {
  const startTime = Date.now();

  try {
    // Check if user has admin permissions
    if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to test webhooks',
        },
      });
    }

    // Check if in development environment
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ENDPOINT_NOT_AVAILABLE',
          message: 'Webhook test endpoint is not available in production',
        },
      });
    }

    const { testEvent, testPayload } = req.body;

    // Validate test request
    if (!testEvent || !testPayload) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TEST_REQUEST',
          message: 'Test event and payload are required',
        },
      });
    }

    // Simulate webhook processing
    const mockResult = {
      success: true,
      data: {
        event: testEvent,
        processed: true,
        timestamp: new Date().toISOString(),
        testMode: true,
      },
    };

    const processingTime = Date.now() - startTime;

    logger.info('Webhook test processed', {
      event: testEvent,
      processingTime,
    });

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

    return res.json(mockResult);
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Webhook test failed', {
      error: error.message,
      testEvent: req.body?.testEvent,
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
        code: 'WEBHOOK_TEST_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * @route GET /api/webhooks/logs
 * @desc Get webhook processing logs
 * @access Admin only
 */
router.get('/logs', async (req, res) => {
  const startTime = Date.now();

  try {
    // Check if user has admin permissions
    if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to view webhook logs',
        },
      });
    }

    const {
      page = 1,
      limit = 50,
      level,
      event,
      startDate,
      endDate,
    } = req.query;

    // Get webhook logs (this would typically use WebhookLog model)
    // const logs = await WebhookLog.findWithFilters({
    //   page: parseInt(page),
    //   limit: parseInt(limit),
    //   level,
    //   event,
    //   startDate: startDate ? new Date(startDate) : undefined,
    //   endDate: endDate ? new Date(endDate) : undefined
    // });

    // For now, return mock logs
    const logs = {
      data: [
        {
          id: 'log_001',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          event: 'charge.success',
          level: 'info',
          message: 'Payment webhook processed successfully',
          processingTime: 245,
          ipAddress: '52.31.139.75',
        },
        {
          id: 'log_002',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          event: 'transfer.success',
          level: 'info',
          message: 'Transfer webhook processed successfully',
          processingTime: 189,
          ipAddress: '52.31.139.75',
        },
        {
          id: 'log_003',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          event: 'charge.failed',
          level: 'error',
          message: 'Payment webhook failed - invalid signature',
          processingTime: 12,
          ipAddress: '192.168.1.100',
        },
      ],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 1250,
        pages: Math.ceil(1250 / parseInt(limit)),
      },
      filters: {
        level,
        event,
        startDate,
        endDate,
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
      data: logs,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Get webhook logs failed', {
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
        code: 'GET_WEBHOOK_LOGS_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * @route POST /api/webhooks/retry
 * @desc Retry failed webhook processing
 * @access Admin only
 */
router.post('/retry', async (req, res) => {
  const startTime = Date.now();

  try {
    // Check if user has admin permissions
    if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to retry webhooks',
        },
      });
    }

    const { webhookId, retryCount = 1 } = req.body;

    if (!webhookId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_WEBHOOK_ID',
          message: 'Webhook ID is required',
        },
      });
    }

    // Retry webhook processing (this would typically use WebhookLog model)
    // const result = await WebhookLog.retryProcessing(webhookId, retryCount);

    // For now, return mock response
    const result = {
      success: true,
      data: {
        webhookId,
        retryCount,
        status: 'retry_scheduled',
        scheduledAt: new Date(Date.now() + 5 * 60 * 1000),
        message: 'Webhook retry scheduled successfully',
      },
    };

    const processingTime = Date.now() - startTime;

    logger.info('Webhook retry scheduled', {
      webhookId,
      retryCount,
      processingTime,
    });

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

    return res.json(result);
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Webhook retry failed', {
      error: error.message,
      webhookId: req.body?.webhookId,
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
        code: 'WEBHOOK_RETRY_FAILED',
        message: error.message,
      },
    });
  }
});

export default router;
