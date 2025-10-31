import express from "express";
import { reportingAccess } from "../../middleware/metrics/auth.middleware.js";
import reportingController from "../../controllers/metrics/reporting.controller.js";

const router = express.Router();

// Apply reporting-specific middleware
router.use(reportingAccess);

// Report generation endpoints
router.get('/financial', reportingController.generateFinancialReport);
router.get('/operational', reportingController.generateOperationalReport);
router.get('/compliance', reportingController.generateComplianceReport);
router.get('/performance', reportingController.generatePerformanceReport);

// Report management endpoints
router.get('/', reportingController.getReportList);
router.post('/schedule', reportingController.scheduleReport);

export default router;