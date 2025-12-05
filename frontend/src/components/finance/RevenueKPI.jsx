import React, { memo } from 'react';
import { TrendingUp, DollarSign, Calendar } from 'lucide-react';
import Card from '../common/Card.jsx';

/**
 * RevenueKPI - Revenue-specific KPI card component
 * 
 * Displays revenue metrics including:
 * - Total revenue
 * - Monthly recurring revenue (MRR)
 * - Growth rate with trend indicator
 */
const RevenueKPI = memo(({
  data,
  formatCurrency,
  getTrendIcon,
  loading = false,
  className = '',
  'aria-label': ariaLabel,
}) => {
  // Default values for loading/error states
  const defaultData = {
    total: 0,
    monthlyRecurring: 0,
    growth: { percentage: 0, trend: 'stable' }
  };

  const revenueData = data || defaultData;

  // Calculate growth display
  const growthPercentage = revenueData.growth?.percentage || 0;
  const growthTrend = revenueData.growth?.trend || 'stable';
  const isPositiveGrowth = growthTrend === 'up';
  const isNegativeGrowth = growthTrend === 'down';

  // Loading skeleton
  if (loading) {
    return (
      <Card className={`revenue-kpi-card animate-pulse ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
          <div className="h-4 w-16 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-3">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`revenue-kpi-card hover:shadow-md transition-shadow duration-300 ${className}`}
      hover={true}
      role="article"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
          <DollarSign className="w-5 h-5 text-green-600" />
        </div>
        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
          Revenue
        </span>
      </div>

      {/* Total Revenue */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-gray-900">
          {formatCurrency ? formatCurrency(revenueData.total) : `₦${revenueData.total.toLocaleString()}`}
        </div>
        <div className="text-xs text-gray-500 mt-1">Total Revenue</div>
      </div>

      {/* Monthly Recurring Revenue */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            {formatCurrency ? formatCurrency(revenueData.monthlyRecurring) : `₦${revenueData.monthlyRecurring.toLocaleString()}`}
          </span>
        </div>
        <div className="text-xs text-gray-500">Monthly Recurring</div>
      </div>

      {/* Growth Indicator */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          {getTrendIcon ? getTrendIcon(growthTrend) : (
            growthTrend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : growthTrend === 'down' ? (
              <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
            ) : (
              <div className="w-4 h-4 bg-gray-300 rounded-full" />
            )
          )}
          <span className={`text-sm font-medium ${
            isPositiveGrowth ? 'text-green-600' : 
            isNegativeGrowth ? 'text-red-600' : 
            'text-gray-600'
          }`}>
            {growthPercentage > 0 ? '+' : ''}{growthPercentage.toFixed(1)}%
          </span>
        </div>
        <span className="text-xs text-gray-500">vs last period</span>
      </div>

      {/* Hover Details */}
      <div className="mt-3 pt-3 border-t border-gray-100 opacity-0 hover:opacity-100 transition-opacity">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Growth Trend:</span>
            <span className={`font-medium ${
              isPositiveGrowth ? 'text-green-600' : 
              isNegativeGrowth ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {growthTrend.charAt(0).toUpperCase() + growthTrend.slice(1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Period:</span>
            <span className="font-medium">Last 30 days</span>
          </div>
        </div>
      </div>
    </Card>
  );
});

RevenueKPI.displayName = 'RevenueKPI';

export default RevenueKPI;