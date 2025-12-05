import express from 'express';
import {
  calculateInvestmentROI,
  calculatePortfolioROI,
  getROIPerformanceTracking,
  generateROIProjections,
  performComparativeROIAnalysis,
  calculateRiskAdjustedROI,
  getROIDashboard,
  getROIInsights,
} from '../controllers/roiAnalytics.controller.js';

const router = express.Router();

/**
 * @route GET /api/roi-analytics/investments/:investmentId
 * @desc Calculate ROI for a specific investment
 * @access Private (Owner or Admin)
 */
router.get('/investments/:investmentId', calculateInvestmentROI);

/**
 * @route GET /api/roi-analytics/portfolio/:investorId?
 * @desc Calculate portfolio ROI for an investor
 * @access Private (Owner or Admin)
 */
router.get('/portfolio/:investorId?', calculatePortfolioROI);

/**
 * @route GET /api/roi-analytics/performance/:investorId?
 * @desc Get ROI performance tracking over time
 * @access Private (Owner or Admin)
 */
router.get('/performance/:investorId?', getROIPerformanceTracking);

/**
 * @route GET /api/roi-analytics/projections/:investorId?
 * @desc Generate ROI projections and forecasts
 * @access Private (Owner or Admin)
 */
router.get('/projections/:investorId?', generateROIProjections);

/**
 * @route GET /api/roi-analytics/comparative
 * @desc Perform comparative ROI analysis between investment types
 * @access Private (Admin only)
 */
router.get('/comparative', performComparativeROIAnalysis);

/**
 * @route GET /api/roi-analytics/risk-adjusted/:investmentId?
 * @desc Calculate risk-adjusted ROI for investments
 * @access Private (Owner or Admin)
 */
router.get('/risk-adjusted/:investmentId?', calculateRiskAdjustedROI);

/**
 * @route GET /api/roi-analytics/dashboard/:investorId?
 * @desc Get ROI analytics dashboard data
 * @access Private (Owner or Admin)
 */
router.get('/dashboard/:investorId?', getROIDashboard);

/**
 * @route GET /api/roi-analytics/insights/:investorId?
 * @desc Get ROI insights and recommendations
 * @access Private (Owner or Admin)
 */
router.get('/insights/:investorId?', getROIInsights);

export default router;
