import express from "express";
import { kycMetricsAccess } from "../../middleware/metrics/auth.middleware.js";
import kycController from "../../controllers/metrics/kyc.controller.js";

const router = express.Router();

// Apply KYC-specific middleware
router.use(kycMetricsAccess);

// KYC metrics endpoints
router.get('/', kycController.getKYCMetrics);
router.get('/list', kycController.getKYCList);
router.get('/performance', kycController.getKYCPerformanceReport);
router.get('/analytics', kycController.getKYCAnalytics);

// Individual KYC document endpoints
router.get('/:documentId', kycController.getKYCDetails);

export default router;