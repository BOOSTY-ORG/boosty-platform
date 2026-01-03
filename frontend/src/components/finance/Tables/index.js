/**
 * Finance Tables Module
 *
 * This module exports all table components for the finance dashboard.
 * Each table component extends the common Table component with specific
 * configurations for displaying financial data.
 */

// Import table components
export { default as PayoutTable } from "./PayoutTable";
export { default as TransactionTable } from "./TransactionTable";
export { default as ROIAnalyticsTable } from "./ROIAnalyticsTable";
export { default as InvestorPerformanceTable } from "./InvestorPerformanceTable";

// Export all tables as a default object for convenience
export default {
  PayoutTable,
  TransactionTable,
  ROIAnalyticsTable,
  InvestorPerformanceTable,
};

/**
 * Table Components Overview:
 *
 * PayoutTable:
 * - Displays payout summary data with filtering and pagination
 * - Shows: Payout ID, type, amount, status, recipient, dates
 * - Integrates with: /api/payouts endpoint
 *
 * TransactionTable:
 * - Displays transaction details with advanced features
 * - Shows: Transaction ID, amount, type, status, date, user details
 * - Integrates with: /api/transactions/timeline endpoint
 * - Includes: Search functionality with debounced input
 *
 * ROIAnalyticsTable:
 * - Displays ROI analytics with performance metrics
 * - Shows: Investment ID, ROI percentage, returns, risk metrics
 * - Integrates with: /api/roi-analytics/portfolio/{investorId?} endpoint
 * - Includes: Risk scoring, Sharpe ratio, max drawdown
 *
 * InvestorPerformanceTable:
 * - Displays investor performance with comparisons
 * - Shows: Investor details, portfolio value, ROI, performance score
 * - Integrates with: /api/investors/performance endpoint
 * - Includes: Ranking, risk profile, investment count
 */
