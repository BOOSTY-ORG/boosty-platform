import React, { memo } from 'react';
import { TrendingUp, Target, Percent, BarChart3 } from 'lucide-react';
import Card from '../common/Card.jsx';

/**
 * ROIKPI - ROI-specific KPI card component
 * 
 * Displays Return on Investment metrics including:
 * - ROI percentage
 * - Performance trend
 * - Investment efficiency score
 */
const ROIKPI = memo(({
  data,
  formatCurrency,
  getTrendIcon,
  loading = false,
  className = '',
  'aria-label': ariaLabel,
}) => {
  // Default values for loading/error states
  const defaultData = {
    percentage: 0,
    trend: 'stable',
    performance: 0
  };

  const roiData = data || defaultData;

  // Calculate ROI display
  const roiPercentage = roiData.percentage || 0;
  const roiTrend = roiData.trend || 'stable';
  const performance = roiData.performance || 0;
  
  const isPositiveROI = roiPercentage > 0;
  const isNegativeROI = roiPercentage < 0;
  const isHighPerformance = performance >= 80;
  const isMediumPerformance = performance >= 50;

  // Calculate ROI status
  const getROIStatus = () => {
    if (roiPercentage >= 20) return { label: 'Excellent', color: 'text-green-600' };
    if (roiPercentage >= 10) return { label: 'Good', color: 'text-blue-600' };
    if (roiPercentage >= 5) return { label: 'Moderate', color: 'text-yellow-600' };
    if (roiPercentage > 0) return { label: 'Low', color: 'text-orange-600' };
    return { label: 'Negative', color: 'text-red-600' };
  };

  const roiStatus = getROIStatus();

  // Loading skeleton
  if (loading) {
    return (
      <Card className={`roi-kpi-card animate-pulse ${className}`}>
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
      className={`roi-kpi-card hover:shadow-md transition-shadow duration-300 ${className}`}
      hover={true}
      role="article"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full">
          <Target className="w-5 h-5 text-orange-600" />
        </div>
        <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
          ROI
        </span>
      </div>

      {/* ROI Percentage */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <div className={`text-2xl font-bold ${
            isPositiveROI ? 'text-green-600' : 
            isNegativeROI ? 'text-red-600' : 
            'text-gray-900'
          }`}>
            {roiPercentage.toFixed(1)}%
          </div>
          <Percent className="w-4 h-4 text-gray-400" />
        </div>
        <div className="text-xs text-gray-500 mt-1">Return on Investment</div>
      </div>

      {/* ROI Status */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3 h-3 text-gray-400" />
          <span className={`text-sm font-medium ${roiStatus.color}`}>
            {roiStatus.label}
          </span>
        </div>
        <div className="text-xs text-gray-500">Performance Status</div>
      </div>

      {/* Trend Indicator */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          {getTrendIcon ? getTrendIcon(roiTrend) : (
            roiTrend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : roiTrend === 'down' ? (
              <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
            ) : (
              <div className="w-4 h-4 bg-gray-300 rounded-full" />
            )
          )}
          <span className={`text-sm font-medium ${
            roiTrend === 'up' ? 'text-green-600' : 
            roiTrend === 'down' ? 'text-red-600' : 
            'text-gray-600'
          }`}>
            {roiTrend.charAt(0).toUpperCase() + roiTrend.slice(1)}
          </span>
        </div>
        <span className="text-xs text-gray-500">Trend</span>
      </div>

      {/* Performance Score */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">Performance Score</span>
          <span className={`text-xs font-medium ${
            isHighPerformance ? 'text-green-600' : 
            isMediumPerformance ? 'text-yellow-600' : 
            'text-red-600'
          }`}>
            {performance.toFixed(0)}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isHighPerformance ? 'bg-green-500' : 
              isMediumPerformance ? 'bg-yellow-500' : 
              'bg-red-500'
            }`}
            style={{ width: `${Math.min(performance, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Hover Details */}
      <div className="mt-3 pt-3 border-t border-gray-100 opacity-0 hover:opacity-100 transition-opacity">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>ROI Category:</span>
            <span className={`font-medium ${roiStatus.color}`}>
              {roiStatus.label}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Performance:</span>
            <span className={`font-medium ${
              isHighPerformance ? 'text-green-600' : 
              isMediumPerformance ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {isHighPerformance ? 'High' : isMediumPerformance ? 'Medium' : 'Low'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Period:</span>
            <span className="font-medium">YTD</span>
          </div>
        </div>
      </div>
    </Card>
  );
});

export default ROIKPI;