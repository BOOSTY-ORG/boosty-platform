import Investment from '../../models/metrics/investment.model.js';
import Payout from '../payout.model.js';
import PaymentIntent from '../paymentIntent.model.js';
import logger from '../../utils/payment/paymentLogger.util.js';
import {
  PaymentError,
  PaymentErrorType,
} from '../../utils/payment/paymentErrors.util.js';
import _ from 'lodash';

/**
 * ROI Analytics Service
 * Provides comprehensive ROI calculation and analysis for investments
 */
class ROIAnalyticsService {
  constructor() {
    this.investmentModel = Investment;
    this.payoutModel = Payout;
    this.paymentIntentModel = PaymentIntent;
  }

  /**
   * Calculate ROI for a specific investment
   * @param {string} investmentId - Investment ID
   * @returns {Promise<Object>} ROI calculation result
   */
  async calculateInvestmentROI(investmentId) {
    try {
      logger.info('Calculating investment ROI', { investmentId });

      const investment = await this.investmentModel
        .findOne({ investmentId })
        .populate('investorId')
        .populate('applicationId');

      if (!investment) {
        throw new PaymentError(
          PaymentErrorType.NOT_FOUND,
          'INVESTMENT_NOT_FOUND',
          'Investment not found',
          { investmentId }
        );
      }

      // Get all related payouts for this investment
      const payouts = await this.payoutModel.find({
        relatedInvestment: investment._id,
        status: 'completed',
      });

      // Calculate total returns from payouts
      const totalReturns = payouts.reduce(
        (sum, payout) => sum + payout.netAmount,
        0
      );

      // Calculate investment period in years
      const startDate = new Date(investment.startDate);
      const endDate =
        investment.status === 'completed'
          ? new Date(investment.endDate)
          : new Date();
      const investmentPeriodYears =
        (endDate - startDate) / (365.25 * 24 * 60 * 60 * 1000);

      // Calculate ROI metrics
      const principalAmount = investment.amount;
      const netProfit = totalReturns - principalAmount;
      const roiPercentage =
        principalAmount > 0 ? (netProfit / principalAmount) * 100 : 0;
      const annualizedROI =
        investmentPeriodYears > 0 ? roiPercentage / investmentPeriodYears : 0;

      // Calculate risk-adjusted ROI based on risk assessment
      const riskMultiplier = this.getRiskMultiplier(
        investment.riskAssessment?.riskLevel
      );
      const riskAdjustedROI = roiPercentage * riskMultiplier;

      // Calculate projected returns if investment is still active
      let projectedReturns = null;
      let projectedROI = null;
      if (investment.status === 'active') {
        projectedReturns = investment.expectedReturn;
        projectedROI =
          principalAmount > 0
            ? ((projectedReturns - principalAmount) / principalAmount) * 100
            : 0;
      }

      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(
        investment,
        payouts
      );

      const result = {
        investmentId,
        investorId: investment.investorId._id,
        investmentType: investment.applicationId?.projectType || 'solar',
        principalAmount,
        totalReturns,
        netProfit,
        roiPercentage: parseFloat(roiPercentage.toFixed(2)),
        annualizedROI: parseFloat(annualizedROI.toFixed(2)),
        riskAdjustedROI: parseFloat(riskAdjustedROI.toFixed(2)),
        projectedReturns,
        projectedROI: projectedROI ? parseFloat(projectedROI.toFixed(2)) : null,
        investmentPeriod: {
          startDate: investment.startDate,
          endDate:
            investment.status === 'completed' ? investment.endDate : null,
          years: parseFloat(investmentPeriodYears.toFixed(2)),
          days: Math.floor((endDate - startDate) / (24 * 60 * 60 * 1000)),
        },
        riskAssessment: investment.riskAssessment,
        performanceMetrics,
        payoutSummary: {
          totalPayouts: payouts.length,
          totalAmount: totalReturns,
          averageAmount: payouts.length > 0 ? totalReturns / payouts.length : 0,
          lastPayoutDate:
            payouts.length > 0
              ? Math.max(...payouts.map((p) => new Date(p.completedAt)))
              : null,
        },
        calculatedAt: new Date(),
      };

      logger.info('Investment ROI calculated successfully', {
        investmentId,
        roiPercentage: result.roiPercentage,
        annualizedROI: result.annualizedROI,
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate investment ROI', {
        investmentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Calculate ROI for multiple investments for an investor
   * @param {string} investorId - Investor ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Portfolio ROI analysis
   */
  async calculatePortfolioROI(investorId, options = {}) {
    try {
      logger.info('Calculating portfolio ROI', { investorId });

      const { startDate, endDate, investmentType, status } = options;

      // Build filter
      const filter = { investorId };
      if (startDate || endDate) {
        filter.startDate = {};
        if (startDate) filter.startDate.$gte = new Date(startDate);
        if (endDate) filter.startDate.$lte = new Date(endDate);
      }
      if (investmentType) filter['applicationId.projectType'] = investmentType;
      if (status) filter.status = status;

      const investments = await this.investmentModel
        .find(filter)
        .populate('applicationId')
        .sort({ startDate: -1 });

      if (investments.length === 0) {
        return {
          investorId,
          totalInvestments: 0,
          totalPrincipal: 0,
          totalReturns: 0,
          portfolioROI: 0,
          annualizedPortfolioROI: 0,
          investments: [],
          calculatedAt: new Date(),
        };
      }

      // Calculate ROI for each investment
      const investmentROIResults = await Promise.all(
        investments.map((investment) =>
          this.calculateInvestmentROI(investment.investmentId)
        )
      );

      // Aggregate portfolio metrics
      const totalPrincipal = investments.reduce(
        (sum, inv) => sum + inv.amount,
        0
      );
      const totalReturns = investmentROIResults.reduce(
        (sum, roi) => sum + roi.totalReturns,
        0
      );
      const totalNetProfit = totalReturns - totalPrincipal;
      const portfolioROI =
        totalPrincipal > 0 ? (totalNetProfit / totalPrincipal) * 100 : 0;

      // Calculate weighted annualized ROI
      let weightedAnnualizedROI = 0;
      let totalWeight = 0;
      investmentROIResults.forEach((roi) => {
        const weight = roi.principalAmount / totalPrincipal;
        weightedAnnualizedROI += roi.annualizedROI * weight;
        totalWeight += weight;
      });

      // Group by investment type
      const roiByType = _.groupBy(investmentROIResults, 'investmentType');
      const typeBreakdown = Object.keys(roiByType).map((type) => {
        const typeInvestments = roiByType[type];
        const typePrincipal = typeInvestments.reduce(
          (sum, inv) => sum + inv.principalAmount,
          0
        );
        const typeReturns = typeInvestments.reduce(
          (sum, inv) => sum + inv.totalReturns,
          0
        );
        const typeROI =
          typePrincipal > 0
            ? ((typeReturns - typePrincipal) / typePrincipal) * 100
            : 0;

        return {
          investmentType: type,
          count: typeInvestments.length,
          principalAmount: typePrincipal,
          totalReturns: typeReturns,
          roiPercentage: parseFloat(typeROI.toFixed(2)),
          averageROI: parseFloat(
            (
              typeInvestments.reduce((sum, inv) => sum + inv.roiPercentage, 0) /
              typeInvestments.length
            ).toFixed(2)
          ),
        };
      });

      // Calculate performance trends
      const performanceTrends =
        this.calculatePerformanceTrends(investmentROIResults);

      const result = {
        investorId,
        totalInvestments: investments.length,
        totalPrincipal,
        totalReturns,
        totalNetProfit,
        portfolioROI: parseFloat(portfolioROI.toFixed(2)),
        annualizedPortfolioROI: parseFloat(weightedAnnualizedROI.toFixed(2)),
        investmentBreakdown: {
          byType: typeBreakdown,
          byStatus: this.getInvestmentStatusBreakdown(investments),
        },
        performanceTrends,
        investments: investmentROIResults,
        calculatedAt: new Date(),
      };

      logger.info('Portfolio ROI calculated successfully', {
        investorId,
        totalInvestments: result.totalInvestments,
        portfolioROI: result.portfolioROI,
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate portfolio ROI', {
        investorId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get ROI performance tracking over time
   * @param {string} investorId - Investor ID (optional)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} ROI performance tracking data
   */
  async getROIPerformanceTracking(investorId = null, options = {}) {
    try {
      logger.info('Getting ROI performance tracking', { investorId });

      const { startDate, endDate, period = 'monthly' } = options;
      const filter = {};

      if (investorId) {
        filter.investorId = investorId;
      }

      if (startDate || endDate) {
        filter.startDate = {};
        if (startDate) filter.startDate.$gte = new Date(startDate);
        if (endDate) filter.startDate.$lte = new Date(endDate);
      }

      const investments = await this.investmentModel
        .find(filter)
        .populate('investorId')
        .populate('applicationId');

      // Group investments by time period
      const groupedInvestments = this.groupInvestmentsByPeriod(
        investments,
        period
      );

      // Calculate ROI metrics for each period
      const performanceData = await Promise.all(
        Object.entries(groupedInvestments).map(
          async ([periodKey, periodInvestments]) => {
            const roiResults = await Promise.all(
              periodInvestments.map((inv) =>
                this.calculateInvestmentROI(inv.investmentId)
              )
            );

            const totalPrincipal = periodInvestments.reduce(
              (sum, inv) => sum + inv.amount,
              0
            );
            const totalReturns = roiResults.reduce(
              (sum, roi) => sum + roi.totalReturns,
              0
            );
            const periodROI =
              totalPrincipal > 0
                ? ((totalReturns - totalPrincipal) / totalPrincipal) * 100
                : 0;

            return {
              period: periodKey,
              investmentCount: periodInvestments.length,
              totalPrincipal,
              totalReturns,
              roiPercentage: parseFloat(periodROI.toFixed(2)),
              averageROI:
                roiResults.length > 0
                  ? parseFloat(
                      (
                        roiResults.reduce(
                          (sum, roi) => sum + roi.roiPercentage,
                          0
                        ) / roiResults.length
                      ).toFixed(2)
                    )
                  : 0,
              riskAdjustedROI:
                roiResults.length > 0
                  ? parseFloat(
                      (
                        roiResults.reduce(
                          (sum, roi) => sum + roi.riskAdjustedROI,
                          0
                        ) / roiResults.length
                      ).toFixed(2)
                    )
                  : 0,
            };
          }
        )
      );

      // Sort by period
      performanceData.sort((a, b) => a.period.localeCompare(b.period));

      // Calculate trends
      const trends = this.calculateROITrends(performanceData);

      const result = {
        investorId,
        period,
        startDate:
          startDate ||
          (investments.length > 0
            ? Math.min(...investments.map((inv) => inv.startDate))
            : null),
        endDate:
          endDate ||
          (investments.length > 0
            ? Math.max(...investments.map((inv) => inv.startDate))
            : null),
        performanceData,
        trends,
        calculatedAt: new Date(),
      };

      logger.info('ROI performance tracking retrieved successfully', {
        investorId,
        period,
        dataPoints: performanceData.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get ROI performance tracking', {
        investorId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate ROI projections and forecasts
   * @param {string} investorId - Investor ID (optional)
   * @param {Object} options - Forecast options
   * @returns {Promise<Object>} ROI projections and forecasts
   */
  async generateROIProjections(investorId = null, options = {}) {
    try {
      logger.info('Generating ROI projections', { investorId });

      const { forecastPeriod = 12, scenario = 'moderate' } = options;

      // Get historical performance data
      const historicalData = await this.getROIPerformanceTracking(investorId, {
        period: 'monthly',
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last 12 months
        endDate: new Date(),
      });

      // Get active investments
      const activeInvestmentsFilter = { status: 'active' };
      if (investorId) {
        activeInvestmentsFilter.investorId = investorId;
      }

      const activeInvestments = await this.investmentModel
        .find(activeInvestmentsFilter)
        .populate('investorId')
        .populate('applicationId');

      // Calculate projections for active investments
      const activeInvestmentProjections = await Promise.all(
        activeInvestments.map(async (investment) => {
          const currentROI = await this.calculateInvestmentROI(
            investment.investmentId
          );
          const remainingPeriod = this.calculateRemainingPeriod(investment);

          // Apply scenario-based adjustments
          const scenarioMultiplier = this.getScenarioMultiplier(scenario);
          const projectedAnnualROI =
            currentROI.annualizedROI * scenarioMultiplier;

          const projectedReturns =
            investment.expectedReturn ||
            investment.amount *
              (1 + (projectedAnnualROI / 100) * (remainingPeriod.years || 1));

          return {
            investmentId: investment.investmentId,
            currentROI: currentROI.roiPercentage,
            projectedAnnualROI: parseFloat(projectedAnnualROI.toFixed(2)),
            remainingPeriod,
            projectedReturns: parseFloat(projectedReturns.toFixed(2)),
            projectedProfit: parseFloat(
              (projectedReturns - investment.amount).toFixed(2)
            ),
          };
        })
      );

      // Calculate portfolio-level projections
      const totalCurrentPrincipal = activeInvestments.reduce(
        (sum, inv) => sum + inv.amount,
        0
      );
      const totalProjectedReturns = activeInvestmentProjections.reduce(
        (sum, proj) => sum + proj.projectedReturns,
        0
      );
      const totalProjectedProfit =
        totalProjectedReturns - totalCurrentPrincipal;
      const projectedPortfolioROI =
        totalCurrentPrincipal > 0
          ? (totalProjectedProfit / totalCurrentPrincipal) * 100
          : 0;

      // Generate forecast based on historical trends
      const forecast = this.generateForecast(
        historicalData.performanceData,
        forecastPeriod,
        scenario
      );

      const result = {
        investorId,
        scenario,
        forecastPeriod,
        currentActiveInvestments: activeInvestments.length,
        totalCurrentPrincipal,
        totalProjectedReturns,
        totalProjectedProfit,
        projectedPortfolioROI: parseFloat(projectedPortfolioROI.toFixed(2)),
        investmentProjections: activeInvestmentProjections,
        forecast,
        assumptions: {
          scenarioMultiplier: this.getScenarioMultiplier(scenario),
          historicalDataPoints: historicalData.performanceData.length,
          calculationMethod: 'linear_regression_with_scenario_adjustment',
        },
        calculatedAt: new Date(),
      };

      logger.info('ROI projections generated successfully', {
        investorId,
        scenario,
        projectedPortfolioROI: result.projectedPortfolioROI,
      });

      return result;
    } catch (error) {
      logger.error('Failed to generate ROI projections', {
        investorId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Perform comparative ROI analysis between investment types
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Comparative ROI analysis
   */
  async performComparativeROIAnalysis(options = {}) {
    try {
      logger.info('Performing comparative ROI analysis');

      const { startDate, endDate, minInvestmentCount = 5 } = options;

      // Get all investments with filters
      const filter = {};
      if (startDate || endDate) {
        filter.startDate = {};
        if (startDate) filter.startDate.$gte = new Date(startDate);
        if (endDate) filter.startDate.$lte = new Date(endDate);
      }

      const investments = await this.investmentModel
        .find(filter)
        .populate('applicationId')
        .populate('investorId');

      // Group by investment type
      const investmentsByType = _.groupBy(
        investments,
        (inv) => inv.applicationId?.projectType || 'unknown'
      );

      // Calculate ROI metrics for each type
      const typeAnalysis = await Promise.all(
        Object.entries(investmentsByType).map(
          async ([type, typeInvestments]) => {
            // Skip types with insufficient data
            if (typeInvestments.length < minInvestmentCount) {
              return null;
            }

            const roiResults = await Promise.all(
              typeInvestments.map((inv) =>
                this.calculateInvestmentROI(inv.investmentId)
              )
            );

            const totalPrincipal = typeInvestments.reduce(
              (sum, inv) => sum + inv.amount,
              0
            );
            const totalReturns = roiResults.reduce(
              (sum, roi) => sum + roi.totalReturns,
              0
            );
            const typeROI =
              totalPrincipal > 0
                ? ((totalReturns - totalPrincipal) / totalPrincipal) * 100
                : 0;

            // Calculate risk metrics
            const riskLevels = typeInvestments.map(
              (inv) => inv.riskAssessment?.riskLevel || 'medium'
            );
            const riskDistribution = _.countBy(riskLevels);

            // Calculate performance percentiles
            const roiValues = roiResults
              .map((roi) => roi.roiPercentage)
              .sort((a, b) => a - b);
            const percentiles = this.calculatePercentiles(roiValues);

            return {
              investmentType: type,
              investmentCount: typeInvestments.length,
              totalPrincipal,
              totalReturns,
              roiPercentage: parseFloat(typeROI.toFixed(2)),
              averageROI: parseFloat(
                (
                  roiResults.reduce((sum, roi) => sum + roi.roiPercentage, 0) /
                  roiResults.length
                ).toFixed(2)
              ),
              medianROI: percentiles.p50,
              roiPercentiles: percentiles,
              riskDistribution,
              riskAdjustedROI: parseFloat(
                (
                  roiResults.reduce(
                    (sum, roi) => sum + roi.riskAdjustedROI,
                    0
                  ) / roiResults.length
                ).toFixed(2)
              ),
              annualizedROI: parseFloat(
                (
                  roiResults.reduce((sum, roi) => sum + roi.annualizedROI, 0) /
                  roiResults.length
                ).toFixed(2)
              ),
              performanceMetrics: {
                bestPerforming: roiResults.reduce((best, current) =>
                  current.roiPercentage > best.roiPercentage ? current : best
                ),
                worstPerforming: roiResults.reduce((worst, current) =>
                  current.roiPercentage < worst.roiPercentage ? current : worst
                ),
                consistency: this.calculateROIConsistency(roiValues),
              },
            };
          }
        )
      );

      // Filter out null results and sort by ROI
      const validTypeAnalysis = typeAnalysis
        .filter(Boolean)
        .sort((a, b) => b.roiPercentage - a.roiPercentage);

      // Calculate overall market metrics
      const allROIResults = await Promise.all(
        investments.map((inv) => this.calculateInvestmentROI(inv.investmentId))
      );

      const marketMetrics = {
        totalInvestments: investments.length,
        totalPrincipal: investments.reduce((sum, inv) => sum + inv.amount, 0),
        totalReturns: allROIResults.reduce(
          (sum, roi) => sum + roi.totalReturns,
          0
        ),
        marketROI: parseFloat(
          (
            allROIResults.reduce((sum, roi) => sum + roi.roiPercentage, 0) /
            allROIResults.length
          ).toFixed(2)
        ),
        marketRiskAdjustedROI: parseFloat(
          (
            allROIResults.reduce((sum, roi) => sum + roi.riskAdjustedROI, 0) /
            allROIResults.length
          ).toFixed(2)
        ),
        marketAnnualizedROI: parseFloat(
          (
            allROIResults.reduce((sum, roi) => sum + roi.annualizedROI, 0) /
            allROIResults.length
          ).toFixed(2)
        ),
      };

      // Generate recommendations
      const recommendations = this.generateInvestmentRecommendations(
        validTypeAnalysis,
        marketMetrics
      );

      const result = {
        analysisPeriod: {
          startDate:
            startDate ||
            (investments.length > 0
              ? Math.min(...investments.map((inv) => inv.startDate))
              : null),
          endDate:
            endDate ||
            (investments.length > 0
              ? Math.max(...investments.map((inv) => inv.startDate))
              : null),
        },
        marketMetrics,
        investmentTypeAnalysis: validTypeAnalysis,
        recommendations,
        methodology: {
          minInvestmentCount,
          riskAdjustmentMethod: 'risk_level_multiplier',
          percentileCalculation: 'linear_interpolation',
        },
        calculatedAt: new Date(),
      };

      logger.info('Comparative ROI analysis completed successfully', {
        investmentTypes: validTypeAnalysis.length,
        marketROI: marketMetrics.marketROI,
      });

      return result;
    } catch (error) {
      logger.error('Failed to perform comparative ROI analysis', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Calculate risk-adjusted ROI for investments
   * @param {string} investmentId - Investment ID (optional)
   * @param {string} investorId - Investor ID (optional)
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Risk-adjusted ROI calculations
   */
  async calculateRiskAdjustedROI(
    investmentId = null,
    investorId = null,
    options = {}
  ) {
    try {
      logger.info('Calculating risk-adjusted ROI', {
        investmentId,
        investorId,
      });

      const { riskModel = 'standard' } = options;

      let investments = [];

      if (investmentId) {
        const investment = await this.investmentModel.findOne({ investmentId });
        if (investment) investments = [investment];
      } else if (investorId) {
        investments = await this.investmentModel.find({ investorId });
      } else {
        investments = await this.investmentModel.find({});
      }

      if (investments.length === 0) {
        return { investments: [], calculatedAt: new Date() };
      }

      // Calculate risk-adjusted ROI for each investment
      const riskAdjustedResults = await Promise.all(
        investments.map(async (investment) => {
          const basicROI = await this.calculateInvestmentROI(
            investment.investmentId
          );

          // Get risk factors
          const riskFactors = this.extractRiskFactors(investment);

          // Calculate risk score
          const riskScore = this.calculateRiskScore(riskFactors, riskModel);

          // Apply risk adjustment
          const riskMultiplier = this.calculateRiskMultiplier(
            riskScore,
            riskModel
          );
          const riskAdjustedROI = basicROI.roiPercentage * riskMultiplier;

          // Calculate Sharpe ratio (risk-adjusted return)
          const riskFreeRate = 0.05; // 5% risk-free rate (can be made configurable)
          const excessReturn = riskAdjustedROI / 100 - riskFreeRate;
          const volatility = this.calculateVolatility(investment);
          const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0;

          return {
            investmentId: investment.investmentId,
            basicROI: basicROI.roiPercentage,
            riskScore,
            riskMultiplier,
            riskAdjustedROI: parseFloat(riskAdjustedROI.toFixed(2)),
            riskFactors,
            sharpeRatio: parseFloat(sharpeRatio.toFixed(4)),
            volatility: parseFloat(volatility.toFixed(4)),
            riskGrade: this.getRiskGrade(riskScore),
            maxDrawdown: this.calculateMaxDrawdown(investment),
            var95: this.calculateVaR(investment, 0.95), // 95% Value at Risk
          };
        })
      );

      // Aggregate results if multiple investments
      let aggregatedMetrics = null;
      if (riskAdjustedResults.length > 1) {
        const basicROIs = riskAdjustedResults.map((r) => r.basicROI);
        const riskAdjustedROIs = riskAdjustedResults.map(
          (r) => r.riskAdjustedROI
        );
        const riskScores = riskAdjustedResults.map((r) => r.riskScore);
        const sharpeRatios = riskAdjustedResults.map((r) => r.sharpeRatio);

        aggregatedMetrics = {
          averageBasicROI: parseFloat(
            (
              basicROIs.reduce((sum, roi) => sum + roi, 0) / basicROIs.length
            ).toFixed(2)
          ),
          averageRiskAdjustedROI: parseFloat(
            (
              riskAdjustedROIs.reduce((sum, roi) => sum + roi, 0) /
              riskAdjustedROIs.length
            ).toFixed(2)
          ),
          averageRiskScore: parseFloat(
            (
              riskScores.reduce((sum, score) => sum + score, 0) /
              riskScores.length
            ).toFixed(2)
          ),
          averageSharpeRatio: parseFloat(
            (
              sharpeRatios.reduce((sum, ratio) => sum + ratio, 0) /
              sharpeRatios.length
            ).toFixed(4)
          ),
          portfolioVolatility:
            this.calculatePortfolioVolatility(riskAdjustedResults),
          diversificationBenefit:
            this.calculateDiversificationBenefit(riskAdjustedResults),
        };
      }

      const result = {
        investmentId,
        investorId,
        riskModel,
        investments: riskAdjustedResults,
        aggregatedMetrics,
        riskModelDescription: this.getRiskModelDescription(riskModel),
        calculatedAt: new Date(),
      };

      logger.info('Risk-adjusted ROI calculation completed', {
        investmentCount: riskAdjustedResults.length,
        averageRiskAdjustedROI: aggregatedMetrics?.averageRiskAdjustedROI,
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate risk-adjusted ROI', {
        investmentId,
        investorId,
        error: error.message,
      });
      throw error;
    }
  }

  // Helper methods for ROI calculations

  /**
   * Get risk multiplier based on risk level
   * @param {string} riskLevel - Risk level (low, medium, high)
   * @returns {number} Risk multiplier
   */
  getRiskMultiplier(riskLevel) {
    const multipliers = {
      low: 1.2,
      medium: 1.0,
      high: 0.8,
    };
    return multipliers[riskLevel] || 1.0;
  }

  /**
   * Calculate performance metrics for investment
   * @param {Object} investment - Investment document
   * @param {Array} payouts - Related payouts
   * @returns {Object} Performance metrics
   */
  calculatePerformanceMetrics(investment, payouts) {
    const onTimePayments = investment.performance.onTimePayments || 0;
    const latePayments = investment.performance.latePayments || 0;
    const totalPayments = onTimePayments + latePayments;

    return {
      onTimePaymentRate:
        totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 0,
      latePaymentRate:
        totalPayments > 0 ? (latePayments / totalPayments) * 100 : 0,
      totalPayments,
      paymentConsistency: this.calculatePaymentConsistency(
        investment.repaymentSchedule
      ),
      daysActive: investment.performance.daysActive || 0,
      status: investment.status,
    };
  }

  /**
   * Calculate payment consistency score
   * @param {Array} repaymentSchedule - Repayment schedule
   * @returns {number} Consistency score (0-100)
   */
  calculatePaymentConsistency(repaymentSchedule) {
    if (!repaymentSchedule || repaymentSchedule.length === 0) return 100;

    const paidPayments = repaymentSchedule.filter((p) => p.status === 'paid');
    if (paidPayments.length === 0) return 100;

    let consistencyScore = 100;
    paidPayments.forEach((payment) => {
      const dueDate = new Date(payment.dueDate);
      const paidDate = new Date(payment.paidDate);
      const daysLate = Math.floor((paidDate - dueDate) / (24 * 60 * 60 * 1000));

      if (daysLate > 0) {
        consistencyScore -= Math.min(daysLate * 2, 50); // Deduct up to 50 points for late payments
      }
    });

    return Math.max(0, consistencyScore);
  }

  /**
   * Get investment status breakdown
   * @param {Array} investments - Investment documents
   * @returns {Object} Status breakdown
   */
  getInvestmentStatusBreakdown(investments) {
    const statusCounts = _.countBy(investments, 'status');
    const totalInvestments = investments.length;

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: parseFloat(((count / totalInvestments) * 100).toFixed(2)),
    }));
  }

  /**
   * Calculate performance trends from ROI data
   * @param {Array} roiData - ROI data points
   * @returns {Object} Performance trends
   */
  calculatePerformanceTrends(roiData) {
    if (roiData.length < 2) {
      return { trend: 'insufficient_data', direction: 'neutral', change: 0 };
    }

    const recentROI = roiData.slice(-3).map((d) => d.roiPercentage);
    const olderROI = roiData.slice(0, 3).map((d) => d.roiPercentage);

    const recentAvg =
      recentROI.reduce((sum, roi) => sum + roi, 0) / recentROI.length;
    const olderAvg =
      olderROI.reduce((sum, roi) => sum + roi, 0) / olderROI.length;

    const change = recentAvg - olderAvg;
    const direction =
      change > 1 ? 'improving' : change < -1 ? 'declining' : 'stable';

    return {
      trend: direction,
      direction,
      change: parseFloat(change.toFixed(2)),
      recentAverage: parseFloat(recentAvg.toFixed(2)),
      olderAverage: parseFloat(olderAvg.toFixed(2)),
    };
  }

  /**
   * Group investments by time period
   * @param {Array} investments - Investment documents
   * @param {string} period - Period type (daily, weekly, monthly, quarterly, yearly)
   * @returns {Object} Grouped investments
   */
  groupInvestmentsByPeriod(investments, period) {
    return _.groupBy(investments, (investment) => {
      const date = new Date(investment.startDate);

      switch (period) {
        case 'daily':
          return date.toISOString().split('T')[0];
        case 'weekly': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          return weekStart.toISOString().split('T')[0];
        }
        case 'monthly':
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        case 'quarterly': {
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          return `${date.getFullYear()}-Q${quarter}`;
        }
        case 'yearly':
          return date.getFullYear().toString();
        default:
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
    });
  }

  /**
   * Calculate ROI trends from performance data
   * @param {Array} performanceData - Performance data points
   * @returns {Object} ROI trends
   */
  calculateROITrends(performanceData) {
    if (performanceData.length < 2) {
      return { trend: 'insufficient_data' };
    }

    const roiValues = performanceData.map((d) => d.roiPercentage);
    const periods = performanceData.map((d) => d.period);

    // Simple linear regression for trend
    const n = roiValues.length;
    const xSum = periods.reduce((sum, p, i) => sum + i, 0);
    const ySum = roiValues.reduce((sum, roi) => sum + roi, 0);
    const xySum = periods.reduce((sum, p, i) => sum + i * roiValues[i], 0);
    const x2Sum = periods.reduce((sum, p, i) => sum + i * i, 0);

    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;

    // Calculate trend direction
    const trendDirection =
      slope > 0.5 ? 'increasing' : slope < -0.5 ? 'decreasing' : 'stable';

    return {
      direction: trendDirection,
      slope: parseFloat(slope.toFixed(4)),
      intercept: parseFloat(intercept.toFixed(2)),
      rSquared: this.calculateRSquared(roiValues, slope, intercept),
    };
  }

  /**
   * Calculate R-squared for trend analysis
   * @param {Array} values - Actual values
   * @param {number} slope - Regression slope
   * @param {number} intercept - Regression intercept
   * @returns {number} R-squared value
   */
  calculateRSquared(values, slope, intercept) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    let ssTotal = 0;
    let ssResidual = 0;

    values.forEach((val, i) => {
      const predicted = slope * i + intercept;
      ssTotal += Math.pow(val - mean, 2);
      ssResidual += Math.pow(val - predicted, 2);
    });

    return ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
  }

  /**
   * Calculate remaining period for investment
   * @param {Object} investment - Investment document
   * @returns {Object} Remaining period
   */
  calculateRemainingPeriod(investment) {
    const now = new Date();
    const endDate = new Date(investment.endDate);
    const remainingMs = endDate - now;

    if (remainingMs <= 0) {
      return { years: 0, months: 0, days: 0 };
    }

    const years = Math.floor(remainingMs / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor(
      (remainingMs % (365.25 * 24 * 60 * 60 * 1000)) /
        (30.44 * 24 * 60 * 60 * 1000)
    );
    const days = Math.floor(
      (remainingMs % (30.44 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)
    );

    return { years, months, days };
  }

  /**
   * Get scenario multiplier for ROI projections
   * @param {string} scenario - Scenario type
   * @returns {number} Scenario multiplier
   */
  getScenarioMultiplier(scenario) {
    const multipliers = {
      conservative: 0.8,
      moderate: 1.0,
      optimistic: 1.2,
    };
    return multipliers[scenario] || 1.0;
  }

  /**
   * Generate forecast based on historical data
   * @param {Array} historicalData - Historical performance data
   * @param {number} periods - Number of periods to forecast
   * @param {string} scenario - Forecast scenario
   * @returns {Array} Forecast data
   */
  generateForecast(historicalData, periods, scenario) {
    if (historicalData.length < 2) {
      return [];
    }

    const scenarioMultiplier = this.getScenarioMultiplier(scenario);
    const roiValues = historicalData.map((d) => d.roiPercentage);

    // Simple trend extrapolation
    const trend = this.calculateROITrends(historicalData);
    const lastROI = roiValues[roiValues.length - 1];

    const forecast = [];
    for (let i = 1; i <= periods; i++) {
      const projectedROI = lastROI + trend.slope * i * scenarioMultiplier;
      forecast.push({
        period: `forecast_${i}`,
        projectedROI: parseFloat(projectedROI.toFixed(2)),
        confidence: Math.max(0.1, 1 - i * 0.08), // Decreasing confidence over time
      });
    }

    return forecast;
  }

  /**
   * Calculate percentiles from array of values
   * @param {Array} values - Sorted array of values
   * @returns {Object} Percentile values
   */
  calculatePercentiles(values) {
    if (values.length === 0) return {};

    const getPercentile = (p) => {
      const index = (p / 100) * (values.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index % 1;

      return values[lower] * (1 - weight) + values[upper] * weight;
    };

    return {
      p10: getPercentile(10),
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90),
      min: values[0],
      max: values[values.length - 1],
    };
  }

  /**
   * Calculate ROI consistency score
   * @param {Array} roiValues - Array of ROI values
   * @returns {number} Consistency score (0-100)
   */
  calculateROIConsistency(roiValues) {
    if (roiValues.length < 2) return 100;

    const mean =
      roiValues.reduce((sum, val) => sum + val, 0) / roiValues.length;
    const variance =
      roiValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      roiValues.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    const consistencyScore = Math.max(0, 100 - standardDeviation * 2);
    return parseFloat(consistencyScore.toFixed(2));
  }

  /**
   * Generate investment recommendations
   * @param {Array} typeAnalysis - Investment type analysis
   * @param {Object} marketMetrics - Market metrics
   * @returns {Array} Investment recommendations
   */
  generateInvestmentRecommendations(typeAnalysis, marketMetrics) {
    const recommendations = [];

    // Find best performing types
    const sortedByROI = [...typeAnalysis].sort(
      (a, b) => b.riskAdjustedROI - a.riskAdjustedROI
    );
    const topPerformers = sortedByROI.slice(0, 2);

    recommendations.push({
      type: 'allocation',
      priority: 'high',
      title: 'Optimize Portfolio Allocation',
      description: `Consider increasing allocation to ${topPerformers.map((t) => t.investmentType).join(' and ')} which show the highest risk-adjusted returns`,
      expectedImpact: '+2-5% portfolio ROI',
      actionItems: [
        `Increase ${topPerformers[0].investmentType} allocation by 10-15%`,
        `Consider reducing underperforming asset classes`,
      ],
    });

    // Risk-based recommendations
    const highRiskTypes = typeAnalysis.filter(
      (t) => t.riskDistribution.high > t.investmentCount * 0.3
    );

    if (highRiskTypes.length > 0) {
      recommendations.push({
        type: 'risk_management',
        priority: 'medium',
        title: 'Balance Risk Exposure',
        description: `High-risk investments represent significant portions of ${highRiskTypes.map((t) => t.investmentType).join(', ')}`,
        expectedImpact: 'Reduced portfolio volatility',
        actionItems: [
          'Consider diversifying with lower-risk investments',
          'Review risk tolerance and investment timeline',
        ],
      });
    }

    return recommendations;
  }

  /**
   * Extract risk factors from investment
   * @param {Object} investment - Investment document
   * @returns {Object} Risk factors
   */
  extractRiskFactors(investment) {
    return {
      riskLevel: investment.riskAssessment?.riskLevel || 'medium',
      creditScore: investment.riskAssessment?.creditScore || 500,
      investmentAmount: investment.amount,
      term: investment.term,
      interestRate: investment.interestRate,
      paymentHistory: {
        onTimePayments: investment.performance.onTimePayments || 0,
        latePayments: investment.performance.latePayments || 0,
        consistency: this.calculatePaymentConsistency(
          investment.repaymentSchedule
        ),
      },
    };
  }

  /**
   * Calculate risk score from risk factors
   * @param {Object} riskFactors - Risk factors
   * @param {string} riskModel - Risk model to use
   * @returns {number} Risk score (0-100)
   */
  calculateRiskScore(riskFactors, riskModel = 'standard') {
    let score = 50; // Base score

    // Credit score impact
    if (riskFactors.creditScore >= 750) score -= 20;
    else if (riskFactors.creditScore >= 700) score -= 10;
    else if (riskFactors.creditScore >= 650) score -= 5;
    else if (riskFactors.creditScore < 600) score += 15;

    // Risk level impact
    if (riskFactors.riskLevel === 'low') score -= 15;
    else if (riskFactors.riskLevel === 'high') score += 20;

    // Payment history impact
    if (riskFactors.paymentHistory.consistency > 90) score -= 10;
    else if (riskFactors.paymentHistory.consistency < 70) score += 15;

    // Interest rate impact (higher rates = higher risk)
    if (riskFactors.interestRate > 15) score += 10;
    else if (riskFactors.interestRate < 8) score -= 5;

    // Term impact (longer terms = higher risk)
    if (riskFactors.term > 24) score += 10;
    else if (riskFactors.term < 12) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate risk multiplier from risk score
   * @param {number} riskScore - Risk score (0-100)
   * @param {string} riskModel - Risk model to use
   * @returns {number} Risk multiplier
   */
  calculateRiskMultiplier(riskScore, riskModel = 'standard') {
    // Convert risk score to multiplier (higher risk = lower multiplier)
    if (riskScore <= 20) return 1.3; // Very low risk
    if (riskScore <= 40) return 1.1; // Low risk
    if (riskScore <= 60) return 1.0; // Medium risk
    if (riskScore <= 80) return 0.8; // High risk
    return 0.6; // Very high risk
  }

  /**
   * Get risk grade from risk score
   * @param {number} riskScore - Risk score (0-100)
   * @returns {string} Risk grade
   */
  getRiskGrade(riskScore) {
    if (riskScore <= 20) return 'A+';
    if (riskScore <= 30) return 'A';
    if (riskScore <= 40) return 'B+';
    if (riskScore <= 50) return 'B';
    if (riskScore <= 60) return 'C+';
    if (riskScore <= 70) return 'C';
    if (riskScore <= 80) return 'D';
    return 'F';
  }

  /**
   * Calculate volatility for investment
   * @param {Object} investment - Investment document
   * @returns {number} Volatility
   */
  calculateVolatility(investment) {
    // For this implementation, we'll use a simplified volatility calculation
    // based on the risk level and payment consistency
    const riskLevelMultipliers = {
      low: 0.05,
      medium: 0.1,
      high: 0.2,
    };

    const baseVolatility =
      riskLevelMultipliers[investment.riskAssessment?.riskLevel] || 0.1;
    const consistencyAdjustment =
      (100 - this.calculatePaymentConsistency(investment.repaymentSchedule)) /
      1000;

    return baseVolatility + consistencyAdjustment;
  }

  /**
   * Calculate maximum drawdown for investment
   * @param {Object} investment - Investment document
   * @returns {number} Maximum drawdown percentage
   */
  calculateMaxDrawdown(investment) {
    // Simplified max drawdown calculation based on payment history
    const consistency = this.calculatePaymentConsistency(
      investment.repaymentSchedule
    );
    return Math.max(0, (100 - consistency) / 2);
  }

  /**
   * Calculate Value at Risk (VaR) for investment
   * @param {Object} investment - Investment document
   * @param {number} confidenceLevel - Confidence level (0-1)
   * @returns {number} VaR percentage
   */
  calculateVaR(investment, confidenceLevel) {
    const volatility = this.calculateVolatility(investment);
    const zScore = this.getZScore(confidenceLevel);
    return volatility * zScore * Math.sqrt(252); // Annualized VaR
  }

  /**
   * Get Z-score for confidence level
   * @param {number} confidenceLevel - Confidence level (0-1)
   * @returns {number} Z-score
   */
  getZScore(confidenceLevel) {
    // Simplified Z-score table
    const zScores = {
      0.9: 1.28,
      0.95: 1.65,
      0.99: 2.33,
    };
    return zScores[confidenceLevel] || 1.65;
  }

  /**
   * Calculate portfolio volatility
   * @param {Array} riskAdjustedResults - Risk-adjusted ROI results
   * @returns {number} Portfolio volatility
   */
  calculatePortfolioVolatility(riskAdjustedResults) {
    if (riskAdjustedResults.length === 0) return 0;

    const volatilities = riskAdjustedResults.map((r) => r.volatility);
    return (
      volatilities.reduce((sum, vol) => sum + vol, 0) / volatilities.length
    );
  }

  /**
   * Calculate diversification benefit
   * @param {Array} riskAdjustedResults - Risk-adjusted ROI results
   * @returns {number} Diversification benefit percentage
   */
  calculateDiversificationBenefit(riskAdjustedResults) {
    if (riskAdjustedResults.length < 2) return 0;

    const individualVolatilities = riskAdjustedResults.map((r) => r.volatility);
    const avgIndividualVolatility =
      individualVolatilities.reduce((sum, vol) => sum + vol, 0) /
      individualVolatilities.length;
    const portfolioVolatility =
      this.calculatePortfolioVolatility(riskAdjustedResults);

    const benefit =
      ((avgIndividualVolatility - portfolioVolatility) /
        avgIndividualVolatility) *
      100;
    return Math.max(0, parseFloat(benefit.toFixed(2)));
  }

  /**
   * Get risk model description
   * @param {string} riskModel - Risk model name
   * @returns {string} Risk model description
   */
  getRiskModelDescription(riskModel) {
    const descriptions = {
      standard:
        'Standard risk model using credit score, payment history, and investment terms',
      conservative:
        'Conservative risk model with higher penalty for risk factors',
      aggressive: 'Aggressive risk model with lower penalty for risk factors',
    };
    return descriptions[riskModel] || descriptions.standard;
  }
}

export default ROIAnalyticsService;
