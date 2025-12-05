import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useFinance } from '../../context/FinanceContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { FinanceErrorBoundary } from '../../components/common/ErrorBoundary.jsx';
import { withPerformanceTracking } from '../../utils/performance.js';
import { useDebouncedFilters } from '../../utils/debounce.js';
import { ariaLabels } from '../../utils/accessibility.js';
import { sanitizeInput } from '../../utils/security.js';
import FinancialKPICards from './FinancialKPICards.jsx';
import { RevenueChart } from './Charts/index.js';
import { TransactionTimeline } from './Charts/index.js';
import { ROIAnalyticsChart } from './Charts/index.js';
import { PayoutDistributionChart } from './Charts/index.js';
import { PortfolioPerformanceChart } from './Charts/index.js';
import { PayoutTable } from './Tables/index.js';
import { TransactionTable } from './Tables/index.js';
import { ROIAnalyticsTable } from './Tables/index.js';
import { InvestorPerformanceTable } from './Tables/index.js';
import FinanceFilterPanel from './Filters/FinanceFilterPanel.jsx';
import DateRangeFilter from './Filters/DateRangeFilter.jsx';
import ExportButton from './Export/ExportButton.jsx';
import ExportModal from './Export/ExportModal.jsx';

const FinancialDashboard = withPerformanceTracking(() => {
  const {
    kpiData,
    transactionTimeline,
    payoutData,
    roiAnalytics,
    payoutAnalytics,
    revenueData,
    investmentData,
    portfolioPerformance,
    investorPerformance,
    financialSummary,
    isLoading,
    error,
    lastUpdated,
    getKPIData,
    getTransactionTimeline,
    getPayoutData,
    getROIAnalytics,
    getPayoutAnalytics,
    getRevenueData,
    getInvestmentData,
    getPortfolioPerformance,
    getInvestorPerformance,
    getFinancialSummary,
    refreshAllData,
    updateDateRange,
    updateFilters,
    exportFinancialData,
  } = useFinance();

  const { dateRange: appDateRange } = useApp();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Debounced filters for performance
  const { appliedFilters, updateFilter, hasActiveFilters } = useDebouncedFilters({}, 500);

  // Load initial data - memoized for performance
  const loadInitialData = useCallback(async () => {
    try {
      await Promise.all([
        getKPIData(),
        getTransactionTimeline(),
        getPayoutData(),
        getROIAnalytics(),
        getPayoutAnalytics(),
        getRevenueData(),
        getInvestmentData(),
        getPortfolioPerformance(),
        getInvestorPerformance(),
        getFinancialSummary(),
      ]);
    } catch (error) {
      console.error('Failed to load initial financial data:', error);
    }
  }, [getKPIData, getTransactionTimeline, getPayoutData, getROIAnalytics, getPayoutAnalytics, getRevenueData, getInvestmentData, getPortfolioPerformance, getInvestorPerformance, getFinancialSummary]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle date range change - memoized
  const handleDateRangeChange = useCallback((newDateRange) => {
    updateDateRange(newDateRange);
    // Refresh data with new date range
    refreshAllData();
  }, [updateDateRange, refreshAllData]);

  // Handle filter change - memoized
  const handleFilterChange = useCallback((filters) => {
    updateFilters(filters);
    // Refresh data with new filters
    refreshAllData();
  }, [updateFilters, refreshAllData]);

  // Handle export - memoized
  const handleExport = useCallback((format, options) => {
    exportFinancialData(format, options);
    setShowExportModal(false);
  }, [exportFinancialData]);

  // Handle tab change - memoized
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // Render loading state
  if (isLoading && !kpiData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Render error state
  if (error && !kpiData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading financial data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FinanceErrorBoundary componentName="FinancialDashboard">
      <div className="space-y-6" role="main" aria-label="Financial dashboard">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor and analyze your financial performance
              {lastUpdated && (
                <span className="ml-2">
                  (Last updated: {new Date(lastUpdated).toLocaleString()})
                </span>
              )}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>
            <button
              onClick={refreshAllData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <ExportButton onClick={() => setShowExportModal(true)} />
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="mt-4">
          <DateRangeFilter
            dateRange={appDateRange}
            onChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white shadow rounded-lg p-6" role="dialog" aria-modal="true" aria-labelledby="filter-panel-title">
          <FinanceFilterPanel
            filters={appliedFilters}
            onFilterChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* KPI Cards */}
      <div className="bg-white shadow rounded-lg p-6">
        <FinancialKPICards data={kpiData} isLoading={isLoading} />
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" role="tablist" aria-label="Financial dashboard sections">
            {['overview', 'transactions', 'payouts', 'roi', 'performance'].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`py-2 px-4 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`${tab}-panel`}
                id={`${tab}-tab`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6" role="tabpanel" id="overview-panel">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trends</h3>
                  <RevenueChart data={revenueData} isLoading={isLoading} />
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Timeline</h3>
                  <TransactionTimeline data={transactionTimeline} isLoading={isLoading} />
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">ROI Analytics</h3>
                  <ROIAnalyticsChart data={roiAnalytics} isLoading={isLoading} />
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Payout Distribution</h3>
                  <PayoutDistributionChart data={payoutAnalytics} isLoading={isLoading} />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Portfolio Performance</h3>
                <PortfolioPerformanceChart data={portfolioPerformance} isLoading={isLoading} />
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6" role="tabpanel" id="transactions-panel">
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction History</h3>
                <TransactionTable data={transactionTimeline} isLoading={isLoading} />
              </div>
            </div>
          )}

          {activeTab === 'payouts' && (
            <div className="space-y-6" role="tabpanel" id="payouts-panel">
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payout Records</h3>
                <PayoutTable data={payoutData} isLoading={isLoading} />
              </div>
            </div>
          )}

          {activeTab === 'roi' && (
            <div className="space-y-6" role="tabpanel" id="roi-panel">
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">ROI Analytics</h3>
                <ROIAnalyticsTable data={roiAnalytics} isLoading={isLoading} />
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6" role="tabpanel" id="performance-panel">
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Investor Performance</h3>
                <InvestorPerformanceTable data={investorPerformance} isLoading={isLoading} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
        />
      )}
    </div>
    </FinanceErrorBoundary>
  );
});

FinancialDashboard.displayName = 'FinancialDashboard';

export default FinancialDashboard;