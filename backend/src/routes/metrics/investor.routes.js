import express from "express";
import { investorMetricsAccess, requireOwnershipOrAdmin } from "../../middleware/metrics/auth.middleware.js";
import investorController from "../../controllers/metrics/investor.controller.js";

const router = express.Router();

// Apply investor-specific middleware
router.use(investorMetricsAccess);

// Investor metrics endpoints
router.get('/', investorController.getInvestorMetrics);
router.get('/list', investorController.getInvestorList);
router.get('/performance', investorController.getInvestorPerformanceMetrics);

// Individual investor endpoints
router.get('/:investorId', investorController.getInvestorDetails);

// Apply ownership check for individual investor data
router.use('/:investorId', requireOwnershipOrAdmin('investorId'));

export default router;