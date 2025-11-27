import express from "express";
import { requireMetricsAuth } from "../middleware/metrics/auth.middleware.js";
import { validateDateRange, validatePagination, validateSorting } from "../middleware/metrics/validation.middleware.js";
import { standardRateLimit } from "../middleware/metrics/rateLimit.middleware.js";
import { smartCache } from "../middleware/metrics/caching.middleware.js";
import { applyQueryBuilder } from "../middleware/metrics/queryBuilder.middleware.js";

// Import route modules
import dashboardRoutes from "./metrics/dashboard.routes.js";
import investorRoutes from "./metrics/investor.routes.js";
import userRoutes from "./metrics/user.routes.js";
import transactionRoutes from "./metrics/transaction.routes.js";
import kycRoutes from "./metrics/kyc.routes.js";
import reportingRoutes from "./metrics/reporting.routes.js";
import ticketRoutes from "./metrics/ticket.routes.js";
import crmRoutes from "./metrics/crm.routes.js";

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
      reporting: '/metrics/reports',
      crm: {
        overview: '/metrics/crm',
        communications: '/metrics/crm/communications',
        contacts: '/metrics/crm/contacts',
        templates: '/metrics/crm/templates',
        automations: '/metrics/crm/automations',
        tickets: '/metrics/crm/tickets',
        messages: '/metrics/crm/threads',
        assignments: '/metrics/crm/assignments'
      }
    },
    authentication: 'Bearer token required',
    rateLimit: '100 requests per minute per user',
    caching: '5 minutes for most endpoints'
  });
});

// Mount sub-routes with error handling
try {
  router.use('/dashboard', dashboardRoutes);
  router.use('/investors', investorRoutes);
  router.use('/users', userRoutes);
  router.use('/transactions', transactionRoutes);
  router.use('/kyc', kycRoutes);
  router.use('/reports', reportingRoutes);
  router.use('/crm', crmRoutes);
  // Note: Ticket routes are now handled within the CRM routes module
  // to avoid conflicts and maintain proper route hierarchy
} catch (error) {
  console.error('Error mounting metrics routes:', error);
  // Add error handling middleware for route registration failures
  router.use((err, req, res, next) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Route registration error',
        message: 'There was an error registering the metrics routes',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    next();
  });
}

export default router;