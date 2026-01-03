import express from 'express';
import {
  getPayoutAnalytics,
  getPayoutDistributionAnalysis,
  getPayoutEfficiencyAnalysis,
  getPayoutForecasting,
  getPayoutComplianceAnalytics,
  getPayoutOptimizationRecommendations,
  getPayoutDashboard,
  getPayoutInsights,
  getRecipientPayoutAnalytics,
} from '../controllers/payoutAnalytics.controller.js';

const router = express.Router();

/**
 * @route GET /api/payout-analytics/analytics
 * @desc Get comprehensive payout analytics
 * @access Private (Admin only)
 */
router.get('/analytics', getPayoutAnalytics);

/**
 * @route GET /api/payout-analytics/distribution
 * @desc Get payout distribution analysis
 * @access Private (Admin only)
 */
router.get('/distribution', getPayoutDistributionAnalysis);

/**
 * @route GET /api/payout-analytics/efficiency
 * @desc Get payout efficiency analysis
 * @access Private (Admin only)
 */
router.get('/efficiency', getPayoutEfficiencyAnalysis);

/**
 * @route GET /api/payout-analytics/forecasting
 * @desc Get payout forecasting
 * @access Private (Admin only)
 */
router.get('/forecasting', getPayoutForecasting);

/**
 * @route GET /api/payout-analytics/compliance
 * @desc Get payout compliance and audit analytics
 * @access Private (Admin only)
 */
router.get('/compliance', getPayoutComplianceAnalytics);

/**
 * @route GET /api/payout-analytics/optimization
 * @desc Get payout optimization recommendations
 * @access Private (Admin only)
 */
router.get('/optimization', getPayoutOptimizationRecommendations);

/**
 * @route GET /api/payout-analytics/dashboard
 * @desc Get payout analytics dashboard
 * @access Private (Admin only)
 */
router.get('/dashboard', getPayoutDashboard);

/**
 * @route GET /api/payout-analytics/insights
 * @desc Get payout insights and trends
 * @access Private (Admin only)
 */
router.get('/insights', getPayoutInsights);

/**
 * @route GET /api/payout-analytics/recipients/:recipientId
 * @desc Get recipient payout analytics
 * @access Private (Owner or Admin)
 */
router.get('/recipients/:recipientId', getRecipientPayoutAnalytics);

export default router;