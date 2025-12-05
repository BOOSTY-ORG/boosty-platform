import React from 'react';
import { TrendingUp, Users, Briefcase, Target } from 'lucide-react';
import Card from '../common/Card.jsx';

/**
 * InvestmentKPI - Investment-specific KPI card component
 * 
 * Displays investment metrics including:
 * - Total investments amount
 * - Number of active investments
 * - ROI percentage with trend indicator
 */
const InvestmentKPI = memo(({
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
    active: 0,
    roi: 0
  };

  const investmentData = data || defaultData;

  // Calculate ROI display
  const roiPercentage = investmentData.roi || 0;
  const isPositiveROI = roiPercentage > 0;
  const isNegativeROI = roiPercentage < 0;

  // Determine trend based on ROI
  const roiTrend = isPositiveROI ? 'up' : isNegativeROI ? 'down' : 'stable';

  // Loading skeleton
  if (loading) {
    return (
      <Card className={`investment-kpi-card animate-pulse ${className}`}>
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
      className={`investment-kpi-card hover:shadow-md transition-shadow duration-300 ${className}`}
      hover={true}
      role="article"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
          <Briefcase className="w-5 h-5 text-blue-600" />
        </div>
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
          Investments
        </span>
      </div>

      {/* Total Investments */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-gray-900">
          {formatCurrency ? formatCurrency(investmentData.total) : `₦${investmentData.total.toLocaleString()}`}
        </div>
        <div className="text-xs text-gray-500 mt-1">Total Investments</div>
      </div>

      {/* Active Investments */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-3 h-3 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            {investmentData.active.toLocaleString()} active
          </span>
        </div>
        <div className="text-xs text-gray-500">Active Investments</div>
      </div>

      {/* ROI Indicator */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          {getTrendIcon ? getTrendIcon(roiTrend) : (
            roiTrend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : roiTrend === 'down' ? (
              <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
            ) : (
              <Target className="w-4 h-4 text-gray-500" />
            )
          )}
          <span className={`text-sm font-medium ${
            isPositiveROI ? 'text-green-600' : 
            isNegativeROI ? 'text-red-600' : 
            'text-gray-600'
          }`}>
            {roiPercentage.toFixed(1)}%
          </span>
        </div>
        <span className="text-xs text-gray-500">ROI</span>
      </div>

      {/* Hover Details */}
      <div className="mt-3 pt-3 border-t border-gray-100 opacity-0 hover:opacity-100 transition-opacity">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>ROI Status:</span>
            <span className={`font-medium ${
              isPositiveROI ? 'text-green-600' : 
              isNegativeROI ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {isPositiveROI ? 'Profitable' : isNegativeROI ? 'Loss' : 'Breakeven'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Active Rate:</span>
            <span className="font-medium">
              {investmentData.total > 0 ? 
                ((investmentData.active / investmentData.total) * 100).toFixed(1) : 0
              }%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Period:</span>
            <span className="font-medium">Current</span>
          </div>
        </div>
      </div>
    </Card>
  );
});

InvestmentKPI.displayName = 'InvestmentKPI';

export default InvestmentKPI;