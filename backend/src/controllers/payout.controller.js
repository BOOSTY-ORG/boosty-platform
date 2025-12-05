import PaymentProcessorService from '../services/payment/paymentProcessor.service.js';
import ROIAnalyticsService from '../services/payment/roiAnalytics.service.js';
import PayoutAnalyticsService from '../services/payment/payoutAnalytics.service.js';
import { validateDisbursementRequest } from '../middleware/payment/validation.middleware.js';
import {
  formatSuccessResponse,
  formatErrorResponse,
} from '../utils/metrics/responseFormatter.util.js';
import { requireMetricsAuth } from '../middleware/metrics/auth.middleware.js';
import logger from '../utils/payment/paymentLogger.util.js';

/**
 * Payout Controller
 * Handles ROI and payout distribution to investors
 */
class PayoutController {
  constructor() {
    this.paymentProcessor = new PaymentProcessorService();
    this.roiAnalyticsService = new ROIAnalyticsService();
    this.payoutAnalyticsService = new PayoutAnalyticsService();
  }

  /**
   * Process payout/disbursement
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async processPayout(req, res) {
    const startTime = Date.now();

    try {
      // Check if user has payout permissions
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'You do not have permission to process payouts',
            },
            req,
            403
          )
        );
      }

      // Process disbursement
      const result = await this.paymentProcessor.processDisbursement({
        transactionId: req.validatedBody.transactionId,
        recipientCode: req.validatedBody.recipientCode,
        amount: req.validatedBody.amount,
        reason: req.validatedBody.reason,
        currency: req.validatedBody.currency || 'NGN',
        metadata: {
          ...req.validatedBody.metadata,
          processedBy: req.auth._id,
          processedAt: new Date(),
        },
      });

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Payout processed successfully', {
        transactionId: req.validatedBody.transactionId,
        transferId: result.data.transferId,
        amount: req.validatedBody.amount,
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

      logger.error('Payout processing failed', {
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
            code: error.code || 'PAYOUT_PROCESSING_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get payout details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPayout(req, res) {
    const startTime = Date.now();

    try {
      const { payoutId } = req.params;

      // Get payout details (this would typically use Payout model)
      // const payout = await Payout.findByPayoutId(payoutId);

      // For now, return mock data
      const payout = {
        payoutId,
        type: 'roi_payment',
        amount: 5000,
        currency: 'NGN',
        status: 'completed',
        recipientId: 'user123',
        recipientType: 'investor',
        recipientEmail: 'investor@example.com',
        processedAt: new Date(),
        completedAt: new Date(),
      };

      if (!payout) {
        return res.status(404).json(
          formatErrorResponse(
            {
              code: 'PAYOUT_NOT_FOUND',
              message: 'Payout not found',
            },
            req,
            404
          )
        );
      }

      // Check ownership or admin access
      const isOwner =
        payout.recipientId?.toString() === req.auth._id.toString();
      const isAdmin = ['admin', 'manager', 'superadmin'].includes(
        req.user?.role
      );

      if (!isOwner && !isAdmin) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'ACCESS_DENIED',
              message: 'You can only access your own payouts',
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
            payoutId: payout.payoutId,
            type: payout.type,
            amount: payout.amount,
            currency: payout.currency,
            status: payout.status,
            recipientId: payout.recipientId,
            recipientType: payout.recipientType,
            recipientEmail: payout.recipientEmail,
            processedAt: payout.processedAt,
            completedAt: payout.completedAt,
            calculationBasis: payout.calculationBasis || {},
            fees: payout.fees || {},
          },
          req
        )
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Get payout failed', {
        error: error.message,
        payoutId: req.params.payoutId,
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
            code: 'GET_PAYOUT_FAILED',
            message: error.message,
          },
          req,
          500
        )
      );
    }
  }

  /**
   * Get payout list
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPayouts(req, res) {
    const startTime = Date.now();

    try {
      const {
        page = 1,
        limit = 20,
        status,
        type,
        recipientId,
        startDate,
        endDate,
      } = req.query;

      // Build filter
      const filter = {};

      // If not admin, only show user's payouts
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        filter.recipientId = req.auth._id;
      }

      if (status) filter.status = status;
      if (type) filter.type = type;
      if (recipientId) filter.recipientId = recipientId;
      if (startDate || endDate) {
        filter.completedAt = {};
        if (startDate) filter.completedAt.$gte = new Date(startDate);
        if (endDate) filter.completedAt.$lte = new Date(endDate);
      }

      // Get payouts (this would typically use Payout model)
      // const payouts = await Payout.findByRecipient(req.auth._id, {
      //   page: parseInt(page), limit: parseInt(limit), status, type
      // });

      // For now, return mock data
      const payouts = {
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

      return res.json(formatSuccessResponse(payouts, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Get payouts failed', {
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
            code: 'GET_PAYOUTS_FAILED',
            message: error.message,
          },
          req,
          500
        )
      );
    }
  }

  /**
   * Calculate ROI for investment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async calculateROI(req, res) {
    const startTime = Date.now();

    try {
      const { investmentId } = req.params;

      // Use ROI Analytics Service to calculate ROI
      const roiCalculation =
        await this.roiAnalyticsService.calculateInvestmentROI(investmentId);

      // Check ownership or admin access
      const isOwner =
        roiCalculation.investorId?.toString() === req.auth._id.toString();
      const isAdmin = ['admin', 'manager', 'superadmin'].includes(
        req.user?.role
      );

      if (!isOwner && !isAdmin) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'ACCESS_DENIED',
              message: 'You can only access your own investment ROI data',
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

      logger.info('ROI calculation completed', {
        investmentId,
        roiPercentage: roiCalculation.roiPercentage,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(roiCalculation, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('ROI calculation failed', {
        error: error.message,
        investmentId: req.params.investmentId,
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
            code: error.code || 'ROI_CALCULATION_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Process batch payout
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async processBatchPayout(req, res) {
    const startTime = Date.now();

    try {
      // Check if user has batch payout permissions
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'You do not have permission to process batch payouts',
            },
            req,
            403
          )
        );
      }

      const { payoutIds, batchId } = req.validatedBody;

      if (!payoutIds || !Array.isArray(payoutIds) || payoutIds.length === 0) {
        return res.status(400).json(
          formatErrorResponse(
            {
              code: 'INVALID_BATCH_REQUEST',
              message: 'Payout IDs array is required',
            },
            req,
            400
          )
        );
      }

      // Process batch payout (this would typically use Payout model)
      // const result = await Payout.createBatch(payoutIds, batchId);

      // For now, return mock response
      const result = {
        batchId: batchId || `BATCH_${Date.now()}`,
        payoutCount: payoutIds.length,
        totalAmount: payoutIds.length * 5000, // Mock calculation
        status: 'processing',
        processedAt: new Date(),
      };

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Batch payout processed', {
        batchId: result.batchId,
        payoutCount: result.payoutCount,
        totalAmount: result.totalAmount,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 201,
        url: req.url,
        responseTime: processingTime,
      });

      return res.status(201).json(formatSuccessResponse(result, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Batch payout processing failed', {
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
            code: 'BATCH_PAYOUT_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get payout statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPayoutStats(req, res) {
    const startTime = Date.now();

    try {
      const { startDate, endDate, type, recipientId } = req.query;

      // Build filter
      const filter = {};

      if (startDate || endDate) {
        filter.completedAt = {};
        if (startDate) filter.completedAt.$gte = new Date(startDate);
        if (endDate) filter.completedAt.$lte = new Date(endDate);
      }

      if (type) filter.type = type;
      if (recipientId) filter.recipientId = recipientId;

      // Use Payout Analytics Service to get statistics
      const analyticsResult =
        await this.payoutAnalyticsService.getPayoutAnalytics({
          startDate,
          endDate,
          type,
          recipientId,
          period: 'monthly',
        });

      // Extract summary statistics from analytics result
      const stats = {
        totalPayouts: analyticsResult.summary.totalPayouts,
        totalAmount: analyticsResult.summary.totalAmount,
        totalFees: analyticsResult.summary.totalFees,
        netAmount: analyticsResult.summary.netAmount,
        completedPayouts: analyticsResult.summary.completedPayouts,
        failedPayouts: analyticsResult.summary.failedPayouts,
        pendingPayouts: analyticsResult.summary.pendingPayouts,
        averageAmount: analyticsResult.summary.averageAmount,
        payoutBreakdown: analyticsResult.payoutTypes.reduce((acc, type) => {
          acc[type.type] = { count: type.count, amount: type.totalAmount };
          return acc;
        }, {}),
        period: {
          startDate: startDate || analyticsResult.period.startDate,
          endDate: endDate || analyticsResult.period.endDate,
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

      return res.json(formatSuccessResponse(stats, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Get payout stats failed', {
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
            code: error.code || 'GET_PAYOUT_STATS_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }
}

// Apply authentication and validation middleware
const payoutController = new PayoutController();

export const processPayout = [
  requireMetricsAuth,
  validateDisbursementRequest,
  payoutController.processPayout.bind(payoutController),
];

export const getPayout = [
  requireMetricsAuth,
  payoutController.getPayout.bind(payoutController),
];

export const getPayouts = [
  requireMetricsAuth,
  payoutController.getPayouts.bind(payoutController),
];

export const calculateROI = [
  requireMetricsAuth,
  payoutController.calculateROI.bind(payoutController),
];

export const processBatchPayout = [
  requireMetricsAuth,
  payoutController.processBatchPayout.bind(payoutController),
];

export const getPayoutStats = [
  requireMetricsAuth,
  payoutController.getPayoutStats.bind(payoutController),
];

export default payoutController;
