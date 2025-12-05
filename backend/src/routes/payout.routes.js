import { Router } from 'express';
import {
  processPayout,
  getPayout,
  getPayouts,
  calculateROI,
  processBatchPayout,
  getPayoutStats,
} from '../controllers/payout.controller.js';
import { webhookSecurityHeaders } from '../middleware/payment/webhookSignature.middleware.js';
import logger from '../utils/payment/paymentLogger.util.js';

/**
 * Payout Routes
 * Defines all payout and ROI-related API endpoints
 */
const router = Router();

/**
 * @route POST /api/payouts/process
 * @desc Process a single payout/disbursement
 * @access Admin/Manager only
 */
router.post('/process', processPayout);

/**
 * @route GET /api/payouts/:payoutId
 * @desc Get payout details by ID
 * @access Private (owner or admin)
 */
router.get('/:payoutId', getPayout);

/**
 * @route GET /api/payouts
 * @desc Get list of payouts with pagination and filtering
 * @access Private (user's own payouts or admin)
 */
router.get('/', getPayouts);

/**
 * @route POST /api/payouts/calculate-roi/:investmentId
 * @desc Calculate ROI for a specific investment
 * @access Private
 */
router.post('/calculate-roi/:investmentId', calculateROI);

/**
 * @route POST /api/payouts/batch
 * @desc Process batch payouts
 * @access Admin/Manager only
 */
router.post('/batch', processBatchPayout);

/**
 * @route GET /api/payouts/stats
 * @desc Get payout statistics and analytics
 * @access Admin/Manager only
 */
router.get('/stats', getPayoutStats);

/**
 * ROI and Analytics endpoints
 */

/**
 * @route GET /api/payouts/roi-summary
 * @desc Get ROI summary for user or all users
 * @access Admin/Manager only
 */
router.get('/roi-summary', async (req, res) => {
  const startTime = Date.now();

  try {
    // Check if user has analytics permissions
    if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to view ROI summary',
        },
      });
    }

    const { userId, startDate, endDate } = req.query;

    // Get ROI summary (this would typically use Payout and Investment models)
    // const roiSummary = await Payout.getROISummary({
    //   userId: userId ? new ObjectId(userId) : undefined,
    //   startDate: startDate ? new Date(startDate) : undefined,
    //   endDate: endDate ? new Date(endDate) : undefined
    // });

    // For now, return mock ROI summary
    const roiSummary = {
      totalInvestments: 500,
      totalInvestedAmount: 50000000,
      totalReturns: 6250000,
      averageROI: 25.5,
      totalProfit: 12500000,
      activeInvestments: 350,
      maturedInvestments: 150,
      currency: 'NGN',
      period: {
        startDate: startDate || '2023-01-01',
        endDate: endDate || '2023-12-31',
      },
      breakdown: {
        roi_payment: { count: 400, amount: 5000000, averageROI: 26.0 },
        profit_sharing: { count: 80, amount: 1000000, averageROI: 22.5 },
        dividend: { count: 20, amount: 250000, averageROI: 28.0 },
      },
      monthlyTrends: [
        { month: '2023-01', investments: 25, amount: 2500000, returns: 312500 },
        { month: '2023-02', investments: 35, amount: 3500000, returns: 437500 },
        { month: '2023-03', investments: 42, amount: 4200000, returns: 525000 },
      ],
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
      data: roiSummary,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Get ROI summary failed', {
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
        code: 'GET_ROI_SUMMARY_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * @route GET /api/payouts/performance
 * @desc Get investment performance metrics
 * @access Private
 */
router.get('/performance', async (req, res) => {
  const startTime = Date.now();

  try {
    const { userId, period = '12m' } = req.query;

    // Get performance metrics (this would typically use Investment and Payout models)
    // const performance = await Investment.getPerformanceMetrics({
    //   userId: userId ? new ObjectId(userId) : undefined,
    //   period
    // });

    // For now, return mock performance data
    const performance = {
      period,
      currency: 'NGN',
      totalInvestments: 125,
      totalInvestedAmount: 12500000,
      currentValue: 15625000,
      totalReturns: 3125000,
      overallROI: 25.0,
      annualizedROI: 26.8,
      riskMetrics: {
        sharpeRatio: 1.25,
        maxDrawdown: -15.5,
        volatility: 12.3,
        beta: 0.85,
      },
      performanceBreakdown: {
        bestMonth: { month: '2023-03', return: 8.5 },
        worstMonth: { month: '2023-09', return: -2.1 },
        averageMonthlyReturn: 2.1,
        consistencyScore: 75.5,
      },
      benchmarks: {
        vsMarket: 3.2,
        vsSector: 1.8,
        vsSimilarInvestments: 0.5,
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
      data: performance,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Get performance metrics failed', {
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
        code: 'GET_PERFORMANCE_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * @route GET /api/payouts/projections
 * @desc Get future payout projections
 * @access Private
 */
router.get('/projections', async (req, res) => {
  const startTime = Date.now();

  try {
    const { userId, timeframe = '6m' } = req.query;

    // Get payout projections (this would typically use Investment and Payout models)
    // const projections = await Payout.getProjections({
    //   userId: userId ? new ObjectId(userId) : undefined,
    //   timeframe
    // });

    // For now, return mock projection data
    const projections = {
      timeframe,
      currency: 'NGN',
      projectedReturns: 875000,
      projectedPayouts: 25,
      confidence: 85.5,
      assumptions: {
        averageROI: 25.0,
        marketGrowthRate: 5.2,
        reinvestmentRate: 0.8,
        riskAdjustment: -0.5,
      },
      monthlyBreakdown: [
        { month: '2024-01', projected: 70000, confidence: 90.0 },
        { month: '2024-02', projected: 72500, confidence: 88.0 },
        { month: '2024-03', projected: 75000, confidence: 87.0 },
        { month: '2024-04', projected: 77500, confidence: 86.0 },
        { month: '2024-05', projected: 80000, confidence: 85.0 },
        { month: '2024-06', projected: 82500, confidence: 84.0 },
      ],
      scenarios: {
        conservative: { totalReturns: 750000, roi: 20.0 },
        moderate: { totalReturns: 875000, roi: 25.0 },
        optimistic: { totalReturns: 1000000, roi: 30.0 },
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
      data: projections,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Get payout projections failed', {
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
        code: 'GET_PROJECTIONS_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * @route GET /api/payouts/schedule
 * @desc Get scheduled payouts
 * @access Admin/Manager only
 */
router.get('/schedule', async (req, res) => {
  const startTime = Date.now();

  try {
    // Check if user has schedule permissions
    if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to view payout schedule',
        },
      });
    }

    const { status, startDate, endDate } = req.query;

    // Get scheduled payouts (this would typically use Payout model)
    // const scheduled = await Payout.getScheduled({
    //   status,
    //   startDate: startDate ? new Date(startDate) : undefined,
    //   endDate: endDate ? new Date(endDate) : undefined
    // });

    // For now, return mock schedule data
    const scheduled = {
      totalScheduled: 45,
      totalAmount: 2250000,
      currency: 'NGN',
      statusBreakdown: {
        pending: 25,
        processing: 15,
        approved: 5,
      },
      upcoming: [
        {
          payoutId: 'PAY202312001',
          amount: 50000,
          scheduledFor: '2023-12-15T00:00:00Z',
          recipient: 'investor123',
          type: 'roi_payment',
        },
        {
          payoutId: 'PAY202312002',
          amount: 75000,
          scheduledFor: '2023-12-20T00:00:00Z',
          recipient: 'investor456',
          type: 'profit_sharing',
        },
      ],
      period: {
        startDate: startDate || '2023-12-01',
        endDate: endDate || '2023-12-31',
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
      data: scheduled,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Get scheduled payouts failed', {
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
        code: 'GET_SCHEDULE_FAILED',
        message: error.message,
      },
    });
  }
});

// Apply webhook security middleware to all routes
router.use(webhookSecurityHeaders);

export default router;
