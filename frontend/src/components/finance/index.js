/**
 * Finance Components Index
 *
 * Exports all finance-related components for easy importing
 */

// Main container component
export { default as FinancialKPICards } from "./FinancialKPICards.jsx";
export { default as FinancialDashboard } from "./FinancialDashboard.jsx";

// Individual KPI card components
export { default as RevenueKPI } from "./RevenueKPI.jsx";
export { default as InvestmentKPI } from "./InvestmentKPI.jsx";
export { default as PayoutKPI } from "./PayoutKPI.jsx";
export { default as ROIKPI } from "./ROIKPI.jsx";

// Chart components
export { default as RevenueChart } from "./Charts/RevenueChart.jsx";
export { default as TransactionTimeline } from "./Charts/TransactionTimeline.jsx";
export { default as ROIAnalyticsChart } from "./Charts/ROIAnalyticsChart.jsx";
export { default as PayoutDistributionChart } from "./Charts/PayoutDistributionChart.jsx";
export { default as PortfolioPerformanceChart } from "./Charts/PortfolioPerformanceChart.jsx";

// Table components
export { default as PayoutTable } from "./Tables/PayoutTable.jsx";
export { default as TransactionTable } from "./Tables/TransactionTable.jsx";
export { default as ROIAnalyticsTable } from "./Tables/ROIAnalyticsTable.jsx";
export { default as InvestorPerformanceTable } from "./Tables/InvestorPerformanceTable.jsx";

// Filter components
export { default as FinanceFilterPanel } from "./Filters/FinanceFilterPanel.jsx";
export { default as DateRangeFilter } from "./Filters/DateRangeFilter.jsx";

// Export components
export { default as ExportButton } from "./Export/ExportButton.jsx";
export { default as ExportModal } from "./Export/ExportModal.jsx";

// Export all KPI components as a grouped object for convenience
export const FinanceKPIs = {
  FinancialKPICards,
  RevenueKPI,
  InvestmentKPI,
  PayoutKPI,
  ROIKPI,
};

// Export all chart components as a grouped object for convenience
export const FinanceCharts = {
  RevenueChart,
  TransactionTimeline,
  ROIAnalyticsChart,
  PayoutDistributionChart,
  PortfolioPerformanceChart,
};

// Export all table components as a grouped object for convenience
export const FinanceTables = {
  PayoutTable,
  TransactionTable,
  ROIAnalyticsTable,
  InvestorPerformanceTable,
};

// Export all filter components as a grouped object for convenience
export const FinanceFilters = {
  FinanceFilterPanel,
  DateRangeFilter,
};

// Export all export components as a grouped object for convenience
export const FinanceExports = {
  ExportButton,
  ExportModal,
};

// Default export for backward compatibility
export default {
  FinancialKPICards,
  FinancialDashboard,
  RevenueKPI,
  InvestmentKPI,
  PayoutKPI,
  ROIKPI,
  RevenueChart,
  TransactionTimeline,
  ROIAnalyticsChart,
  PayoutDistributionChart,
  PortfolioPerformanceChart,
  PayoutTable,
  TransactionTable,
  ROIAnalyticsTable,
  InvestorPerformanceTable,
  FinanceFilterPanel,
  DateRangeFilter,
  ExportButton,
  ExportModal,
};
