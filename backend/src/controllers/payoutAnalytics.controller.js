import PayoutAnalyticsService from '../services/payment/payoutAnalytics.service.js';
import {
  formatSuccessResponse,
  formatErrorResponse,
} from '../utils/metrics/responseFormatter.util.js';
import { requireMetricsAuth } from '../middleware/metrics/auth.middleware.js';
import logger from '../utils/payment/paymentLogger.util.js';

/**
 * Payout Analytics Controller
 * Handles comprehensive payout analytics and management endpoints
 */
class PayoutAnalyticsController {
  constructor() {
    this.payoutAnalyticsService = new PayoutAnalyticsService();
  }

  /**
   * Get comprehensive payout analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPayoutAnalytics(req, res) {
    const startTime = Date.now();

    try {
      // Only admins can access comprehensive analytics
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'You do not have permission to access payout analytics',
            },
            req,
            403
          )
        );
      }

      const {
        startDate,
        endDate,
        type,
        status,
        recipientId,
        period = 'monthly',
        includeProjections = false,
      } = req.query;

      // Get payout analytics
      const analyticsResult =
        await this.payoutAnalyticsService.getPayoutAnalytics({
          startDate,
          endDate,
          type,
          status,
          recipientId,
          period,
          includeProjections: includeProjections === 'true',
        });

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Payout analytics retrieved successfully', {
        totalPayouts: analyticsResult.summary.totalPayouts,
        totalAmount: analyticsResult.summary.totalAmount,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(analyticsResult, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Payout analytics retrieval failed', {
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
            code: error.code || 'PAYOUT_ANALYTICS_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get payout distribution analysis
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPayoutDistributionAnalysis(req, res) {
    const startTime = Date.now();

    try {
      // Only admins can access distribution analysis
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'INSUFFICIENT_PERMISSIONS',
              message:
                'You do not have permission to access payout distribution analysis',
            },
            req,
            403
          )
        );
      }

      const {
        startDate,
        endDate,
        groupBy = 'type',
        includePercentiles = true,
        includeOutliers = true,
      } = req.query;

      // Get distribution analysis
      const distributionResult =
        await this.payoutAnalyticsService.getPayoutDistributionAnalysis({
          startDate,
          endDate,
          groupBy,
          includePercentiles: includePercentiles === 'true',
          includeOutliers: includeOutliers === 'true',
        });

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Payout distribution analysis completed', {
        groupBy,
        distributionCount: distributionResult.distributions.length,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(distributionResult, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Payout distribution analysis failed', {
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
            code: error.code || 'PAYOUT_DISTRIBUTION_ANALYSIS_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get payout efficiency analysis
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPayoutEfficiencyAnalysis(req, res) {
    const startTime = Date.now();

    try {
      // Only admins can access efficiency analysis
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'INSUFFICIENT_PERMISSIONS',
              message:
                'You do not have permission to access payout efficiency analysis',
            },
            req,
            403
          )
        );
      }

      const {
        startDate,
        endDate,
        benchmarkPeriod = '30d',
        includeRecommendations = true,
      } = req.query;

      // Get efficiency analysis
      const efficiencyResult =
        await this.payoutAnalyticsService.getPayoutEfficiencyAnalysis({
          startDate,
          endDate,
          benchmarkPeriod,
          includeRecommendations: includeRecommendations === 'true',
        });

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Payout efficiency analysis completed', {
        successRate: efficiencyResult.efficiency.successRate,
        averageProcessingTime:
          efficiencyResult.processing.averageProcessingTime,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(efficiencyResult, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Payout efficiency analysis failed', {
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
            code: error.code || 'PAYOUT_EFFICIENCY_ANALYSIS_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get payout forecasting
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPayoutForecasting(req, res) {
    const startTime = Date.now();

    try {
      // Only admins can access forecasting
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'INSUFFICIENT_PERMISSIONS',
              message:
                'You do not have permission to access payout forecasting',
            },
            req,
            403
          )
        );
      }

      const {
        forecastPeriod = 90,
        historicalPeriod = 365,
        confidenceLevel = 0.95,
        scenario = 'baseline',
      } = req.query;

      // Get forecasting
      const forecastResult =
        await this.payoutAnalyticsService.getPayoutForecasting({
          forecastPeriod: parseInt(forecastPeriod),
          historicalPeriod: parseInt(historicalPeriod),
          confidenceLevel: parseFloat(confidenceLevel),
          scenario,
        });

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Payout forecasting completed', {
        forecastPeriod,
        scenario,
        forecastedAmount: forecastResult.forecasts.totalAmount,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(forecastResult, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Payout forecasting failed', {
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
            code: error.code || 'PAYOUT_FORECASTING_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get payout compliance and audit analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPayoutComplianceAnalytics(req, res) {
    const startTime = Date.now();

    try {
      // Only admins can access compliance analytics
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'INSUFFICIENT_PERMISSIONS',
              message:
                'You do not have permission to access payout compliance analytics',
            },
            req,
            403
          )
        );
      }

      const {
        startDate,
        endDate,
        complianceType = 'all',
        includeDetailedViolations = false,
      } = req.query;

      // Get compliance analytics
      const complianceResult =
        await this.payoutAnalyticsService.getPayoutComplianceAnalytics({
          startDate,
          endDate,
          complianceType,
          includeDetailedViolations: includeDetailedViolations === 'true',
        });

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Payout compliance analytics completed', {
        overallComplianceScore: complianceResult.complianceScores.overall,
        violationsCount: complianceResult.complianceAnalysis.totalViolations,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(complianceResult, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Payout compliance analytics failed', {
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
            code: error.code || 'PAYOUT_COMPLIANCE_ANALYTICS_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get payout optimization recommendations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPayoutOptimizationRecommendations(req, res) {
    const startTime = Date.now();

    try {
      // Only admins can access optimization recommendations
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'INSUFFICIENT_PERMISSIONS',
              message:
                'You do not have permission to access payout optimization recommendations',
            },
            req,
            403
          )
        );
      }

      const {
        analysisPeriod = 90,
        optimizationType = 'all',
        impactThreshold = 0.05,
      } = req.query;

      // Get optimization recommendations
      const optimizationResult =
        await this.payoutAnalyticsService.getPayoutOptimizationRecommendations({
          analysisPeriod: parseInt(analysisPeriod),
          optimizationType,
          impactThreshold: parseFloat(impactThreshold),
        });

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Payout optimization recommendations completed', {
        opportunitiesCount: optimizationResult.opportunities.length,
        potentialSavings:
          optimizationResult.impactAnalysis.totalPotentialSavings,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(optimizationResult, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Payout optimization recommendations failed', {
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
            code: error.code || 'PAYOUT_OPTIMIZATION_RECOMMENDATIONS_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get payout analytics dashboard
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPayoutDashboard(req, res) {
    const startTime = Date.now();

    try {
      // Only admins can access payout dashboard
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'You do not have permission to access payout dashboard',
            },
            req,
            403
          )
        );
      }

      const {
        period = 'monthly',
        includeForecasts = true,
        includeEfficiency = true,
        includeCompliance = false,
      } = req.query;

      // Get base analytics
      const baseAnalytics =
        await this.payoutAnalyticsService.getPayoutAnalytics({
          period,
          includeProjections: includeForecasts === 'true',
        });

      let efficiencyAnalysis = null;
      if (includeEfficiency === 'true') {
        efficiencyAnalysis =
          await this.payoutAnalyticsService.getPayoutEfficiencyAnalysis();
      }

      let complianceAnalytics = null;
      if (includeCompliance === 'true') {
        complianceAnalytics =
          await this.payoutAnalyticsService.getPayoutComplianceAnalytics();
      }

      // Generate dashboard summary
      const dashboardData = {
        summary: baseAnalytics.summary,
        timeSeries: baseAnalytics.timeSeries,
        payoutTypes: baseAnalytics.payoutTypes,
        performance: baseAnalytics.performance,
        projections: baseAnalytics.projections,
        efficiency: efficiencyAnalysis,
        compliance: complianceAnalytics,
        insights: this.generateDashboardInsights(
          baseAnalytics,
          efficiencyAnalysis
        ),
        recommendations: this.generateDashboardRecommendations(
          baseAnalytics,
          efficiencyAnalysis
        ),
        calculatedAt: new Date(),
      };

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Payout dashboard data retrieved successfully', {
        totalPayouts: baseAnalytics.summary.totalPayouts,
        totalAmount: baseAnalytics.summary.totalAmount,
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

      logger.error('Payout dashboard retrieval failed', {
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
            code: error.code || 'PAYOUT_DASHBOARD_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get payout insights and trends
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPayoutInsights(req, res) {
    const startTime = Date.now();

    try {
      // Only admins can access payout insights
      if (!['admin', 'manager', 'superadmin'].includes(req.user?.role)) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'You do not have permission to access payout insights',
            },
            req,
            403
          )
        );
      }

      const {
        insightType = 'all',
        timeframe = '30d',
        includeRecommendations = true,
      } = req.query;

      // Get insights data
      const insights = await this.generatePayoutInsights({
        insightType,
        timeframe,
        includeRecommendations: includeRecommendations === 'true',
      });

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Payout insights generated successfully', {
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

      logger.error('Payout insights generation failed', {
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
            code: error.code || 'PAYOUT_INSIGHTS_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  /**
   * Get recipient payout analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRecipientPayoutAnalytics(req, res) {
    const startTime = Date.now();

    try {
      const { recipientId } = req.params;
      const { startDate, endDate, period = 'monthly' } = req.query;

      // Validate recipient ID
      if (!recipientId) {
        return res.status(400).json(
          formatErrorResponse(
            {
              code: 'MISSING_RECIPIENT_ID',
              message: 'Recipient ID is required',
            },
            req,
            400
          )
        );
      }

      // Check permissions
      const isOwner = recipientId === req.auth._id.toString();
      const isAdmin = ['admin', 'manager', 'superadmin'].includes(
        req.user?.role
      );

      if (!isOwner && !isAdmin) {
        return res.status(403).json(
          formatErrorResponse(
            {
              code: 'ACCESS_DENIED',
              message: 'You can only access your own payout analytics',
            },
            req,
            403
          )
        );
      }

      // Get recipient analytics
      const recipientAnalytics =
        await this.payoutAnalyticsService.getPayoutAnalytics({
          recipientId,
          startDate,
          endDate,
          period,
        });

      const processingTime = Date.now() - startTime;

      logger.logApiRequest({
        method: req.method,
        url: req.url,
        userId: req.auth._id,
      });

      logger.info('Recipient payout analytics retrieved successfully', {
        recipientId,
        totalPayouts: recipientAnalytics.summary.totalPayouts,
        totalAmount: recipientAnalytics.summary.totalAmount,
        userId: req.auth._id,
        processingTime,
      });

      logger.logApiResponse({
        statusCode: 200,
        url: req.url,
        responseTime: processingTime,
      });

      return res.json(formatSuccessResponse(recipientAnalytics, req));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Recipient payout analytics failed', {
        error: error.message,
        recipientId: req.params.recipientId,
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
            code: error.code || 'RECIPIENT_PAYOUT_ANALYTICS_FAILED',
            message: error.message,
          },
          req,
          error.statusCode || 500
        )
      );
    }
  }

  // Helper methods for controller

  /**
   * Generate dashboard insights
   * @param {Object} baseAnalytics - Base analytics data
   * @param {Object} efficiencyAnalysis - Efficiency analysis data
   * @returns {Array} Insights
   */
  generateDashboardInsights(baseAnalytics, efficiencyAnalysis) {
    const insights = [];

    // Volume insights
    if (baseAnalytics.performance.volumeGrowth > 10) {
      insights.push({
        type: 'volume',
        title: 'Strong Volume Growth',
        description: `Payout volume increased by ${baseAnalytics.performance.volumeGrowth.toFixed(1)}%`,
        impact: 'positive',
        confidence: 0.85,
      });
    }

    // Efficiency insights
    if (efficiencyAnalysis && efficiencyAnalysis.efficiency.successRate < 95) {
      insights.push({
        type: 'efficiency',
        title: 'Success Rate Concern',
        description: `Payout success rate is ${efficiencyAnalysis.efficiency.successRate.toFixed(1)}%`,
        impact: 'negative',
        confidence: 0.9,
      });
    }

    // Cost insights
    if (
      efficiencyAnalysis &&
      efficiencyAnalysis.costEfficiency.overallFeeRate > 3
    ) {
      insights.push({
        type: 'cost',
        title: 'High Transaction Costs',
        description: `Overall fee rate is ${efficiencyAnalysis.costEfficiency.overallFeeRate.toFixed(2)}%`,
        impact: 'negative',
        confidence: 0.8,
      });
    }

    return insights;
  }

  /**
   * Generate dashboard recommendations
   * @param {Object} baseAnalytics - Base analytics data
   * @param {Object} efficiencyAnalysis - Efficiency analysis data
   * @returns {Array} Recommendations
   */
  generateDashboardRecommendations(baseAnalytics, efficiencyAnalysis) {
    const recommendations = [];

    // Efficiency recommendations
    if (efficiencyAnalysis && efficiencyAnalysis.recommendations) {
      recommendations.push(...efficiencyAnalysis.recommendations);
    }

    // Volume recommendations
    if (baseAnalytics.performance.volumeGrowth < 0) {
      recommendations.push({
        type: 'volume',
        priority: 'medium',
        title: 'Address Volume Decline',
        description: 'Payout volume has been decreasing',
        action: 'Investigate causes and implement growth strategies',
      });
    }

    // Processing time recommendations
    if (
      efficiencyAnalysis &&
      efficiencyAnalysis.processing.averageProcessingTime > 20
    ) {
      recommendations.push({
        type: 'processing',
        priority: 'high',
        title: 'Optimize Processing Time',
        description: `Average processing time is ${efficiencyAnalysis.processing.averageProcessingTime} minutes`,
        action: 'Review and optimize payout processing workflow',
      });
    }

    return recommendations;
  }

  /**
   * Generate payout insights
   * @param {Object} options - Insight options
   * @returns {Promise<Array>} Insights
   */
  async generatePayoutInsights(options) {
    const { insightType, timeframe, includeRecommendations } = options;
    const insights = [];

    try {
      // Get base analytics for the timeframe
      const analytics = await this.payoutAnalyticsService.getPayoutAnalytics({
        startDate: new Date(Date.now() - this.getTimeframeInMs(timeframe)),
        endDate: new Date(),
      });

      // Performance insights
      if (insightType === 'all' || insightType === 'performance') {
        if (analytics.summary.successRate > 98) {
          insights.push({
            type: 'performance',
            title: 'Excellent Success Rate',
            description: `Payout success rate is ${analytics.summary.successRate.toFixed(1)}%`,
            impact: 'positive',
            confidence: 0.9,
            actionable: false,
          });
        }

        if (analytics.performance.volumeGrowth > 15) {
          insights.push({
            type: 'performance',
            title: 'Rapid Volume Growth',
            description: `Payout volume grew by ${analytics.performance.volumeGrowth.toFixed(1)}%`,
            impact: 'positive',
            confidence: 0.85,
            actionable: false,
          });
        }
      }

      // Cost insights
      if (insightType === 'all' || insightType === 'cost') {
        if (analytics.summary.feeRate > 3) {
          insights.push({
            type: 'cost',
            title: 'High Fee Rate',
            description: `Transaction fee rate is ${analytics.summary.feeRate.toFixed(2)}%`,
            impact: 'negative',
            confidence: 0.8,
            actionable: true,
            action: 'Consider negotiating better rates with payment providers',
          });
        }
      }

      // Processing insights
      if (insightType === 'all' || insightType === 'processing') {
        if (analytics.performance.averageProcessingTime > 15) {
          insights.push({
            type: 'processing',
            title: 'Slow Processing Times',
            description: `Average processing time is ${analytics.performance.averageProcessingTime} minutes`,
            impact: 'negative',
            confidence: 0.75,
            actionable: true,
            action: 'Optimize payout processing workflow',
          });
        }
      }

      // Add recommendations if requested
      if (includeRecommendations) {
        const optimization =
          await this.payoutAnalyticsService.getPayoutOptimizationRecommendations(
            {
              analysisPeriod: this.getTimeframeInDays(timeframe),
            }
          );

        optimization.opportunities.slice(0, 3).forEach((opp) => {
          insights.push({
            type: 'recommendation',
            title: opp.title,
            description: opp.description,
            impact: 'positive',
            confidence: 0.7,
            actionable: true,
            action:
              opp.type === 'efficiency'
                ? 'Optimize processing'
                : 'Reduce costs',
            potentialImpact: opp.potentialImpact,
          });
        });
      }

      return insights;
    } catch (error) {
      logger.error('Failed to generate payout insights', {
        error: error.message,
        options,
      });
      return [];
    }
  }

  /**
   * Convert timeframe string to milliseconds
   * @param {string} timeframe - Timeframe string (e.g., '30d', '7d')
   * @returns {number} Milliseconds
   */
  getTimeframeInMs(timeframe) {
    const value = parseInt(timeframe);
    const unit = timeframe.replace(/[0-9]/g, '');

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'w':
        return value * 7 * 24 * 60 * 60 * 1000;
      case 'm':
        return value * 30 * 24 * 60 * 60 * 1000;
      default:
        return 30 * 24 * 60 * 60 * 1000; // Default to 30 days
    }
  }

  /**
   * Convert timeframe string to days
   * @param {string} timeframe - Timeframe string (e.g., '30d', '7d')
   * @returns {number} Days
   */
  getTimeframeInDays(timeframe) {
    const value = parseInt(timeframe);
    const unit = timeframe.replace(/[0-9]/g, '');

    switch (unit) {
      case 'd':
        return value;
      case 'w':
        return value * 7;
      case 'm':
        return value * 30;
      default:
        return 30; // Default to 30 days
    }
  }
}

// Apply authentication middleware
const payoutAnalyticsController = new PayoutAnalyticsController();

export const getPayoutAnalytics = [
  requireMetricsAuth,
  payoutAnalyticsController.getPayoutAnalytics.bind(payoutAnalyticsController),
];

export const getPayoutDistributionAnalysis = [
  requireMetricsAuth,
  payoutAnalyticsController.getPayoutDistributionAnalysis.bind(
    payoutAnalyticsController
  ),
];

export const getPayoutEfficiencyAnalysis = [
  requireMetricsAuth,
  payoutAnalyticsController.getPayoutEfficiencyAnalysis.bind(
    payoutAnalyticsController
  ),
];

export const getPayoutForecasting = [
  requireMetricsAuth,
  payoutAnalyticsController.getPayoutForecasting.bind(
    payoutAnalyticsController
  ),
];

export const getPayoutComplianceAnalytics = [
  requireMetricsAuth,
  payoutAnalyticsController.getPayoutComplianceAnalytics.bind(
    payoutAnalyticsController
  ),
];

export const getPayoutOptimizationRecommendations = [
  requireMetricsAuth,
  payoutAnalyticsController.getPayoutOptimizationRecommendations.bind(
    payoutAnalyticsController
  ),
];

export const getPayoutDashboard = [
  requireMetricsAuth,
  payoutAnalyticsController.getPayoutDashboard.bind(payoutAnalyticsController),
];

export const getPayoutInsights = [
  requireMetricsAuth,
  payoutAnalyticsController.getPayoutInsights.bind(payoutAnalyticsController),
];

export const getRecipientPayoutAnalytics = [
  requireMetricsAuth,
  payoutAnalyticsController.getRecipientPayoutAnalytics.bind(
    payoutAnalyticsController
  ),
];

export default payoutAnalyticsController;
