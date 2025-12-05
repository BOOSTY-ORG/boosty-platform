import ROIAnalyticsService from '../services/payment/roiAnalytics.service.js';
import {
  formatSuccessResponse,
  formatErrorResponse,
} from '../utils/metrics/responseFormatter.util.js';
import { requireMetricsAuth } from '../middleware/metrics/auth.middleware.js';
import logger from '../utils/payment/paymentLogger.util.js';

/**
 * ROI Analytics Controller
 * Handles comprehensive ROI analytics and management endpoints
 */
class ROIAnalyticsController {
  constructor() {
    this.roiAnalyticsService = new ROIAnalyticsService();
  }

  /**
   * Calculate ROI for a specific investment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async calculateInvestmentROI(req, res) {
    const startTime = Date.now();

    try {
      const { investmentId } = req.params;

      // Validate investment ID
      if (!investmentId) {
        return res.status(400).json(
          formatErrorResponse(
            {
              code: 'MISSING_INVESTMENT_ID',
              message: 'Investment ID is required',
            },
            req,
            400
          )
        );
      }

      // Calculate ROI
      const roiResult =
        await this.roiAnalyticsService.calculateInvestmentROI(investmentId);

      // Check ownership or admin access
      const isOwner =
        roiResult.investorId?.toString() === req.auth._id.toString();
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

      logger.info('Investment ROI calculated successfully', {
        investmentId,
        roiPercentage: roiResult.roiPercentage,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(roiResult, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Investment ROI calculation failed', {
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
            code: error.code || 'INVESTMENT_ROI_CALCULATION_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Calculate portfolio ROI for an investor
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async calculatePortfolioROI(req, res) {
    const startTime = Date.now();

    try {
      const { investorId } = req.params;
      const {
        startDate,
        endDate,
        investmentType,
        status,
        page = 1,
        limit = 20,
      } = req.query;

      // Determine which investor ID to use
      const targetInvestorId = investorId || req.auth._id;

      // Check permissions
      const isOwner = targetInvestorId.toString() === req.auth._id.toString();
      const isAdmin = ['admin', 'manager', 'superadmin'].includes(
        req.user?.role
      );

      if (!isOwner && !isAdmin) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'ACCESS_DENIED',
              message: 'You can only access your own portfolio ROI data',
            },
            req,
            403
          )
        );
      }

      // Calculate portfolio ROI
      const portfolioResult =
        await this.roiAnalyticsService.calculatePortfolioROI(targetInvestorId, {
          startDate,
          endDate,
          investmentType,
          status,
        });

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Portfolio ROI calculated successfully', {
        investorId: targetInvestorId,
        totalInvestments: portfolioResult.totalInvestments,
        portfolioROI: portfolioResult.portfolioROI,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(portfolioResult, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Portfolio ROI calculation failed', {
        error: error.message,
        investorId: req.params.investorId,
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
            code: error.code || 'PORTFOLIO_ROI_CALCULATION_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get ROI performance tracking over time
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getROIPerformanceTracking(req, res) {
    const startTime = Date.now();

    try {
      const { investorId } = req.params;
      const { startDate, endDate, period = 'monthly' } = req.query;

      // Determine which investor ID to use
      const targetInvestorId = investorId || req.auth._id;

      // Check permissions
      const isOwner = targetInvestorId.toString() === req.auth._id.toString();
      const isAdmin = ['admin', 'manager', 'superadmin'].includes(
        req.user?.role
      );

      if (!isOwner && !isAdmin) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'ACCESS_DENIED',
              message: 'You can only access your own ROI performance data',
            },
            req,
            403
          )
        );
      }

      // Get ROI performance tracking
      const performanceResult =
        await this.roiAnalyticsService.getROIPerformanceTracking(
          targetInvestorId,
          {
            startDate,
            endDate,
            period,
          }
        );

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('ROI performance tracking retrieved successfully', {
        investorId: targetInvestorId,
        period,
        dataPoints: performanceResult.performanceData.length,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(performanceResult, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('ROI performance tracking failed', {
        error: error.message,
        investorId: req.params.investorId,
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
            code: error.code || 'ROI_PERFORMANCE_TRACKING_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Generate ROI projections and forecasts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateROIProjections(req, res) {
    const startTime = Date.now();

    try {
      const { investorId } = req.params;
      const { forecastPeriod = 12, scenario = 'moderate' } = req.query;

      // Determine which investor ID to use
      const targetInvestorId = investorId || req.auth._id;

      // Check permissions
      const isOwner = targetInvestorId.toString() === req.auth._id.toString();
      const isAdmin = ['admin', 'manager', 'superadmin'].includes(
        req.user?.role
      );

      if (!isOwner && !isAdmin) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'ACCESS_DENIED',
              message: 'You can only access your own ROI projections',
            },
            req,
            403
          )
        );
      }

      // Generate ROI projections
      const projectionsResult =
        await this.roiAnalyticsService.generateROIProjections(
          targetInvestorId,
          {
            forecastPeriod: parseInt(forecastPeriod),
            scenario,
          }
        );

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('ROI projections generated successfully', {
        investorId: targetInvestorId,
        scenario,
        projectedPortfolioROI: projectionsResult.projectedPortfolioROI,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(projectionsResult, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('ROI projections generation failed', {
        error: error.message,
        investorId: req.params.investorId,
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
            code: error.code || 'ROI_PROJECTIONS_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Perform comparative ROI analysis between investment types
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async performComparativeROIAnalysis(req, res) {
    const startTime = Date.now();

    try {
      // Only admins can access comparative analysis
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'INSUFFICIENT_PERMISSIONS',
              message:
                'You do not have permission to access comparative ROI analysis',
            },
            req,
            403
          )
        );
      }

      const { startDate, endDate, minInvestmentCount = 5 } = req.query;

      // Perform comparative ROI analysis
      const comparativeResult =
        await this.roiAnalyticsService.performComparativeROIAnalysis({
          startDate,
          endDate,
          minInvestmentCount: parseInt(minInvestmentCount),
        });

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Comparative ROI analysis completed successfully', {
        investmentTypes: comparativeResult.investmentTypeAnalysis.length,
        marketROI: comparativeResult.marketMetrics.marketROI,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(comparativeResult, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Comparative ROI analysis failed', {
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
            code: error.code || 'COMPARATIVE_ROI_ANALYSIS_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Calculate risk-adjusted ROI for investments
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async calculateRiskAdjustedROI(req, res) {
    const startTime = Date.now();

    try {
      const { investmentId } = req.params;
      const { investorId } = req.query;
      const { riskModel = 'standard' } = req.query;

      // Determine target
      let targetInvestmentId = null;
      let targetInvestorId = null;

      if (investmentId) {
        targetInvestmentId = investmentId;
      } else if (investorId) {
        targetInvestorId = investorId;
      } else {
        targetInvestorId = req.auth._id;
      }

      // Check permissions
      let isOwner = false;
      let isAdmin = ['admin', 'manager', 'superadmin'].includes(req.user?.role);

      if (targetInvestmentId) {
        // For specific investment, check ownership
        const investment =
          await this.roiAnalyticsService.investmentModel.findOne({
            investmentId: targetInvestmentId,
          });
        isOwner =
          investment?.investorId?.toString() === req.auth._id.toString();
      } else if (targetInvestorId) {
        // For investor, check ownership
        isOwner = targetInvestorId.toString() === req.auth._id.toString();
      }

      if (!isOwner && !isAdmin) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'ACCESS_DENIED',
              message: 'You can only access your own risk-adjusted ROI data',
            },
            req,
            403
          )
        );
      }

      // Calculate risk-adjusted ROI
      const riskAdjustedResult =
        await this.roiAnalyticsService.calculateRiskAdjustedROI(
          targetInvestmentId,
          targetInvestorId,
          {
            riskModel,
          }
        );

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Risk-adjusted ROI calculation completed successfully', {
        investmentId: targetInvestmentId,
        investorId: targetInvestorId,
        riskModel,
        investmentCount: riskAdjustedResult.investments.length,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(riskAdjustedResult, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Risk-adjusted ROI calculation failed', {
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
            code: error.code || 'RISK_ADJUSTED_ROI_CALCULATION_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get ROI analytics dashboard data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getROIDashboard(req, res) {
    const startTime = Date.now();

    try {
      const { investorId } = req.params;
      const {
        period = 'monthly',
        includeProjections = true,
        includeComparisons = false,
      } = req.query;

      // Determine which investor ID to use
      const targetInvestorId = investorId || req.auth._id;

      // Check permissions
      const isOwner = targetInvestorId.toString() === req.auth._id.toString();
      const isAdmin = ['admin', 'manager', 'superadmin'].includes(
        req.user?.role
      );

      if (!isOwner && !isAdmin) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'ACCESS_DENIED',
              message: 'You can only access your own ROI dashboard',
            },
            req,
            403
          )
        );
      }

      // Get dashboard data
      const portfolioROI =
        await this.roiAnalyticsService.calculatePortfolioROI(targetInvestorId);
      const performanceTracking =
        await this.roiAnalyticsService.getROIPerformanceTracking(
          targetInvestorId,
          { period }
        );

      let projections = null;
      if (includeProjections === 'true') {
        projections =
          await this.roiAnalyticsService.generateROIProjections(
            targetInvestorId
          );
      }

      let comparativeAnalysis = null;
      if (includeComparisons === 'true' && isAdmin) {
        comparativeAnalysis =
          await this.roiAnalyticsService.performComparativeROIAnalysis();
      }

      const dashboardData = {
        summary: {
          totalInvestments: portfolioROI.totalInvestments,
          totalPrincipal: portfolioROI.totalPrincipal,
          totalReturns: portfolioROI.totalReturns,
          portfolioROI: portfolioROI.portfolioROI,
          annualizedPortfolioROI: portfolioROI.annualizedPortfolioROI,
        },
        performance: performanceTracking,
        projections,
        comparativeAnalysis,
        investmentBreakdown: portfolioROI.investmentBreakdown,
        topPerformers: this.getTopPerformers(portfolioROI.investments),
        recommendations: this.generateDashboardRecommendations(
          portfolioROI,
          performanceTracking
        ),
      };

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('ROI dashboard data retrieved successfully', {
        investorId: targetInvestorId,
        period,
        includeProjections,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(dashboardData, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('ROI dashboard retrieval failed', {
        error: error.message,
        investorId: req.params.investorId,
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
            code: error.code || 'ROI_DASHBOARD_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get ROI insights and recommendations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getROIInsights(req, res) {
    const startTime = Date.now();

    try {
      const { investorId } = req.params;
      const { insightType = 'all', timeframe = '90d' } = req.query;

      // Determine which investor ID to use
      const targetInvestorId = investorId || req.auth._id;

      // Check permissions
      const isOwner = targetInvestorId.toString() === req.auth._id.toString();
      const isAdmin = ['admin', 'manager', 'superadmin'].includes(
        req.user?.role
      );

      if (!isOwner && !isAdmin) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'ACCESS_DENIED',
              message: 'You can only access your own ROI insights',
            },
            req,
            403
          )
        );
      }

      // Get insights data
      const insights = await this.generateROIInsights(targetInvestorId, {
        insightType,
        timeframe,
      });

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('ROI insights generated successfully', {
        investorId: targetInvestorId,
        insightType,
        insightsCount: insights.length,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(
        formatSuccessResponse(
          {
            investorId: targetInvestorId,
            insightType,
            timeframe,
            insights,
            generatedAt: new Date(),
          },
          req
        )
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('ROI insights generation failed', {
        error: error.message,
        investorId: req.params.investorId,
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
            code: error.code || 'ROI_INSIGHTS_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  // Helper methods for the controller

  /**
   * Get top performing investments
   * @param {Array} investments - Investment ROI results
   * @returns {Array} Top performers
   */
  getTopPerformers(investments) {
    return investments
      .sort((a, b) => b.roiPercentage - a.roiPercentage)
      .slice(0, 5)
      .map((inv) => ({
        investmentId: inv.investmentId,
        roiPercentage: inv.roiPercentage,
        annualizedROI: inv.annualizedROI,
        riskAdjustedROI: inv.riskAdjustedROI,
        investmentType: inv.investmentType,
      }));
  }

  /**
   * Generate dashboard recommendations
   * @param {Object} portfolioROI - Portfolio ROI data
   * @param {Object} performanceTracking - Performance tracking data
   * @returns {Array} Recommendations
   */
  generateDashboardRecommendations(portfolioROI, performanceTracking) {
    const recommendations = [];

    // Portfolio diversification recommendation
    const typeBreakdown = portfolioROI.investmentBreakdown?.byType || [];
    if (typeBreakdown.length < 3) {
      recommendations.push({
        type: 'diversification',
        priority: 'medium',
        title: 'Diversify Your Portfolio',
        description: 'Consider investing in different types to reduce risk',
        action: 'Explore new investment opportunities',
      });
    }

    // Performance trend recommendation
    const trend = performanceTracking.trends;
    if (trend.direction === 'declining') {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Review Underperforming Investments',
        description: 'Your portfolio ROI has been declining recently',
        action: 'Analyze and consider rebalancing your portfolio',
      });
    }

    // ROI optimization recommendation
    if (portfolioROI.portfolioROI < 10) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        title: 'Optimize Your Returns',
        description: 'Your current ROI could be improved',
        action: 'Consider higher-yield investment opportunities',
      });
    }

    return recommendations;
  }

  /**
   * Generate ROI insights
   * @param {string} investorId - Investor ID
   * @param {Object} options - Insight options
   * @returns {Promise<Array>} Insights
   */
  async generateROIInsights(investorId, options) {
    const { insightType, timeframe } = options;
    const insights = [];

    // Get portfolio data
    const portfolioROI =
      await this.roiAnalyticsService.calculatePortfolioROI(investorId);
    const performanceTracking =
      await this.roiAnalyticsService.getROIPerformanceTracking(investorId, {
        period: 'monthly',
      });

    // Performance insights
    if (insightType === 'all' || insightType === 'performance') {
      if (performanceTracking.trends.direction === 'improving') {
        insights.push({
          type: 'performance',
          title: 'Strong Performance Trend',
          description: 'Your portfolio ROI has been consistently improving',
          impact: 'positive',
          confidence: 0.85,
          actionable: false,
        });
      }

      if (portfolioROI.portfolioROI > 15) {
        insights.push({
          type: 'performance',
          title: 'Excellent Returns',
          description: 'Your portfolio is generating exceptional returns',
          impact: 'positive',
          confidence: 0.9,
          actionable: false,
        });
      }
    }

    // Risk insights
    if (insightType === 'all' || insightType === 'risk') {
      const riskAdjustedResult =
        await this.roiAnalyticsService.calculateRiskAdjustedROI(
          null,
          investorId
        );

      if (riskAdjustedResult.aggregatedMetrics?.averageRiskScore > 60) {
        insights.push({
          type: 'risk',
          title: 'High Risk Exposure',
          description: 'Your portfolio has a higher risk profile than average',
          impact: 'negative',
          confidence: 0.75,
          actionable: true,
          action: 'Consider diversifying with lower-risk investments',
        });
      }
    }

    // Opportunity insights
    if (insightType === 'all' || insightType === 'opportunity') {
      const comparativeAnalysis =
        await this.roiAnalyticsService.performComparativeROIAnalysis();
      const topPerformingType = comparativeAnalysis.investmentTypeAnalysis[0];

      if (
        topPerformingType &&
        topPerformingType.roiPercentage > portfolioROI.portfolioROI + 5
      ) {
        insights.push({
          type: 'opportunity',
          title: 'Investment Opportunity',
          description: `${topPerformingType.investmentType} investments are performing significantly better than your portfolio`,
          impact: 'positive',
          confidence: 0.7,
          actionable: true,
          action: `Consider allocating more to ${topPerformingType.investmentType} investments`,
        });
      }
    }

    return insights;
  }
}

// Apply authentication middleware
const roiAnalyticsController = new ROIAnalyticsController();

export const calculateInvestmentROI = [
  requireMetricsAuth,
  roiAnalyticsController.calculateInvestmentROI.bind(roiAnalyticsController),
];

export const calculatePortfolioROI = [
  requireMetricsAuth,
  roiAnalyticsController.calculatePortfolioROI.bind(roiAnalyticsController),
];

export const getROIPerformanceTracking = [
  requireMetricsAuth,
  roiAnalyticsController.getROIPerformanceTracking.bind(roiAnalyticsController),
];

export const generateROIProjections = [
  requireMetricsAuth,
  roiAnalyticsController.generateROIProjections.bind(roiAnalyticsController),
];

export const performComparativeROIAnalysis = [
  requireMetricsAuth,
  roiAnalyticsController.performComparativeROIAnalysis.bind(
    roiAnalyticsController
  ),
];

export const calculateRiskAdjustedROI = [
  requireMetricsAuth,
  roiAnalyticsController.calculateRiskAdjustedROI.bind(roiAnalyticsController),
];

export const getROIDashboard = [
  requireMetricsAuth,
  roiAnalyticsController.getROIDashboard.bind(roiAnalyticsController),
];

export const getROIInsights = [
  requireMetricsAuth,
  roiAnalyticsController.getROIInsights.bind(roiAnalyticsController),
];

export default roiAnalyticsController;
