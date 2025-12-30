import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Card from '../common/Card.jsx';
import RevenueKPI from './RevenueKPI.jsx';
import InvestmentKPI from './InvestmentKPI.jsx';
import PayoutKPI from './PayoutKPI.jsx';
import ROIKPI from './ROIKPI.jsx';
import { dashboardAPI } from '../../api/dashboard.js';
import { withPerformanceTracking } from '../../utils/performance.jsx';
import { withErrorHandling, retryWithBackoff } from '../../utils/errorHandling.js';
import { ariaLabels } from '../../utils/accessibility.js';

/**
 * FinancialKPICards - Main container for financial KPI cards
 * 
 * Displays key financial metrics in a responsive grid layout:
 * - Revenue metrics (total, MRR, growth)
 * - Investment metrics (total, active, ROI)
 * - Payout metrics (pending, processed, volume)
 * - ROI metrics (percentage, trend, performance)
 */
const FinancialKPICards = ({ 
  dateRange,
  className = '',
  showRefresh = true,
  autoRefresh = false,
  refreshInterval = 60000, // 1 minute
  onRefresh,
  onError
}) => {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch KPI data from API with error handling and retry
  const fetchKPIData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await withErrorHandling(
        retryWithBackoff(() => dashboardAPI.getOverview({ dateRange }), 3),
        { component: 'FinancialKPICards', action: 'fetchKPIData' }
      );
      
      // Transform API response to KPI format
      const transformedData = {
        revenue: {
          total: response.data?.summary?.totalRevenue || 0,
          monthlyRecurring: response.data?.summary?.monthlyRecurringRevenue || 0,
          growth: response.data?.growth?.revenueGrowth || { percentage: 0, trend: 'stable' }
        },
        investment: {
          total: response.data?.summary?.totalInvestments || 0,
          active: response.data?.summary?.activeInvestors || 0,
          roi: response.data?.performance?.repaymentRate || 0
        },
        payout: {
          pending: 0, // Would need separate API call
          processed: 0, // Would need separate API call
          totalVolume: response.data?.summary?.totalRevenue || 0
        },
        roi: {
          percentage: response.data?.performance?.repaymentRate || 0,
          trend: response.data?.growth?.revenueGrowth?.trend || 'stable',
          performance: response.data?.performance?.repaymentRate || 0
        }
      };
      
      setKpiData(transformedData);
      setLastRefreshed(new Date());
      
      if (onRefresh) {
        onRefresh(transformedData);
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch KPI data';
      setError(errorMessage);
      
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [dateRange, onRefresh, onError]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchKPIData();
  }, [fetchKPIData]);

  // Initial data fetch
  useEffect(() => {
    fetchKPIData();
  }, [dateRange]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchKPIData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, dateRange]);

  // Format currency - memoized for performance
  const formatCurrency = useMemo(() => {
    return (amount) => {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };
  }, []);

  // Get trend icon - memoized for performance
  const getTrendIcon = useMemo(() => {
    return (trend) => {
      switch (trend) {
        case 'up':
          return <TrendingUp className="w-4 h-4 text-green-500" aria-label="Trending up" />;
        case 'down':
          return <TrendingDown className="w-4 h-4 text-red-500" aria-label="Trending down" />;
        default:
          return <Minus className="w-4 h-4 text-gray-500" aria-label="No trend" />;
      }
    };
  }, []);

  // Loading state - memoized skeleton
  const loadingSkeleton = useMemo(() => {
    if (!loading || kpiData) return null;
    
    return (
      <div className={`financial-kpi-cards ${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="status" aria-label="Loading financial data">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 animate-pulse" aria-hidden="true">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [loading, kpiData, className]);
  
  if (loadingSkeleton) return loadingSkeleton;

  // Error state - memoized
  const errorState = useMemo(() => {
    if (!error || kpiData) return null;
    
    return (
      <div className={`financial-kpi-cards ${className}`} role="alert" aria-live="polite">
        <Card className="bg-red-50 border-red-200">
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">Failed to load financial KPIs</div>
            <div className="text-sm text-red-500 mb-4">{error}</div>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Retry loading financial data"
            >
              Try Again
            </button>
          </div>
        </Card>
      </div>
    );
  }, [error, kpiData, className, handleRefresh]);
  
  if (errorState) return errorState;

  return (
    <div className={`financial-kpi-cards ${className}`}>
      {/* Header with refresh controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Financial Overview</h2>
          {lastRefreshed && (
            <p className="text-sm text-gray-500">
              Last updated: {lastRefreshed.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        {showRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Financial key performance indicators">
        {/* Revenue KPI */}
        <RevenueKPI
          data={kpiData?.revenue}
          formatCurrency={formatCurrency}
          getTrendIcon={getTrendIcon}
          loading={loading}
          aria-label={ariaLabels.kpiCard('Revenue', kpiData?.revenue?.total, 'growth', kpiData?.revenue?.growth?.trend)}
        />

        {/* Investment KPI */}
        <InvestmentKPI
          data={kpiData?.investment}
          formatCurrency={formatCurrency}
          getTrendIcon={getTrendIcon}
          loading={loading}
          aria-label={ariaLabels.kpiCard('Investment', kpiData?.investment?.total, 'growth', 'stable')}
        />

        {/* Payout KPI */}
        <PayoutKPI
          data={kpiData?.payout}
          formatCurrency={formatCurrency}
          getTrendIcon={getTrendIcon}
          loading={loading}
          aria-label={ariaLabels.kpiCard('Payout', kpiData?.payout?.totalVolume, 'volume', 'stable')}
        />

        {/* ROI KPI */}
        <ROIKPI
          data={kpiData?.roi}
          formatCurrency={formatCurrency}
          getTrendIcon={getTrendIcon}
          loading={loading}
          aria-label={ariaLabels.kpiCard('Return on Investment', kpiData?.roi?.percentage, 'performance', kpiData?.roi?.trend)}
        />
      </div>

      {/* Error banner (non-blocking) */}
      {error && kpiData && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="text-yellow-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-sm text-yellow-700">
              Some data may be outdated. {error}
            </div>
            <button
              onClick={handleRefresh}
              className="ml-auto text-sm text-yellow-600 hover:text-yellow-700 underline"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialKPICards;