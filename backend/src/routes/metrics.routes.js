const express = require("express");
const { requireMetricsAuth } = require("../middleware/metrics/auth.middleware.js");
const { validateDateRange, validatePagination, validateSorting } = require("../middleware/metrics/validation.middleware.js");
const { standardRateLimit } = require("../middleware/metrics/rateLimit.middleware.js");
const { smartCache } = require("../middleware/metrics/caching.middleware.js");
const { applyQueryBuilder } = require("../middleware/metrics/queryBuilder.middleware.js");

// Import route modules
const dashboardRoutes = require("./metrics/dashboard.routes.js");
const investorRoutes = require("./metrics/investor.routes.js");
const userRoutes = require("./metrics/user.routes.js");
const transactionRoutes = require("./metrics/transaction.routes.js");
const kycRoutes = require("./metrics/kyc.routes.js");
const reportingRoutes = require("./metrics/reporting.routes.js");

const router = express.Router();

// Apply common middleware to all metrics routes
router.use(requireMetricsAuth);
router.use(validateDateRange);
router.use(validatePagination);
router.use(validateSorting);
router.use(standardRateLimit);
router.use(smartCache);
router.use(applyQueryBuilder);

// Health check endpoint for metrics service
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'metrics-api',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    title: 'Boosty Metrics API',
    version: '1.0.0',
    description: 'Comprehensive metrics and analytics API for the Boosty solar investment platform',
    endpoints: {
      dashboard: '/metrics/dashboard',
      investors: '/metrics/investors',
      users: '/metrics/users',
      transactions: '/metrics/transactions',
      kyc: '/metrics/kyc',
      reporting: '/metrics/reports'
    },
    authentication: 'Bearer token required',
    rateLimit: '100 requests per minute per user',
    caching: '5 minutes for most endpoints'
  });
});

// Mount sub-routes
router.use('/dashboard', dashboardRoutes);
router.use('/investors', investorRoutes);
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/kyc', kycRoutes);
router.use('/reports', reportingRoutes);

module.exports = router;