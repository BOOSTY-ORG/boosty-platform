import express from 'express';
import { transactionMetricsAccess } from '../../middleware/metrics/auth.middleware.js';
import {
  validateDateRange,
  validatePagination,
  validateSorting,
  validateTransactionFilters,
} from '../../middleware/metrics/validation.middleware.js';
import transactionController from '../../controllers/metrics/transaction.controller.js';

const router = express.Router();

// Apply transaction-specific middleware
router.use(transactionMetricsAccess);

// Transaction metrics endpoints
router.get('/', transactionController.getTransactionMetrics);
router.get('/list', transactionController.getTransactionList);
router.get(
  '/performance',
  transactionController.getTransactionPerformanceReport
);
router.get('/analytics', transactionController.getTransactionAnalytics);

// New transaction history endpoints
router.get(
  '/history',
  validateDateRange,
  validatePagination,
  validateSorting,
  validateTransactionFilters,
  transactionController.getTransactionHistory
);

router.get(
  '/history/user/:userId',
  validateDateRange,
  validatePagination,
  validateSorting,
  validateTransactionFilters,
  transactionController.getUserTransactionHistory
);

router.get(
  '/history/investor/:investorId',
  validateDateRange,
  validatePagination,
  validateSorting,
  validateTransactionFilters,
  transactionController.getInvestorTransactionHistory
);

router.get(
  '/history/timeline',
  validateDateRange,
  validateSorting,
  validateTransactionFilters,
  transactionController.getTransactionTimeline
);

router.get(
  '/history/summary',
  validateDateRange,
  validateTransactionFilters,
  transactionController.getTransactionSummary
);

router.get(
  '/history/export',
  validateDateRange,
  validatePagination,
  validateSorting,
  validateTransactionFilters,
  transactionController.exportTransactionHistory
);

// Individual transaction endpoints
router.get('/:transactionId', transactionController.getTransactionDetails);

export default router;
