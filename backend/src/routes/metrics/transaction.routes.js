import express from "express";
import { transactionMetricsAccess } from "../../middleware/metrics/auth.middleware.js";
import transactionController from "../../controllers/metrics/transaction.controller.js";

const router = express.Router();

// Apply transaction-specific middleware
router.use(transactionMetricsAccess);

// Transaction metrics endpoints
router.get('/', transactionController.getTransactionMetrics);
router.get('/list', transactionController.getTransactionList);
router.get('/performance', transactionController.getTransactionPerformanceReport);
router.get('/analytics', transactionController.getTransactionAnalytics);

// Individual transaction endpoints
router.get('/:transactionId', transactionController.getTransactionDetails);

export default router;