import React, { memo } from 'react';
import { TrendingUp, CreditCard, Clock, CheckCircle } from 'lucide-react';
import Card from '../common/Card.jsx';

/**
 * PayoutKPI - Payout-specific KPI card component
 * 
 * Displays payout metrics including:
 * - Pending payouts count and amount
 * - Processed payouts count and amount
 * - Total payout volume
 */
const PayoutKPI = memo(({
  data,
  formatCurrency,
  getTrendIcon,
  loading = false,
  className = '',
  'aria-label': ariaLabel,
}) => {
  // Default values for loading/error states
  const defaultData = {
    pending: { count: 0, amount: 0 },
    processed: { count: 0, amount: 0 },
    totalVolume: 0
  };

  const payoutData = data || defaultData;

  // Handle different data structures
  const pendingCount = payoutData.pending?.count || payoutData.pending || 0;
  const pendingAmount = payoutData.pending?.amount || 0;
  const processedCount = payoutData.processed?.count || payoutData.processed || 0;
  const processedAmount = payoutData.processed?.amount || 0;
  const totalVolume = payoutData.totalVolume || 0;

  // Calculate processing rate
  const totalTransactions = pendingCount + processedCount;
  const processingRate = totalTransactions > 0 ? (processedCount / totalTransactions) * 100 : 0;

  // Determine trend based on processing rate
  const payoutTrend = processingRate >= 80 ? 'up' : processingRate >= 50 ? 'stable' : 'down';

  // Loading skeleton
  if (loading) {
    return (
      <Card className={`payout-kpi-card animate-pulse ${className}`}>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="h-6 w-6 sm:h-8 sm:w-8 bg-gray-200 rounded-full"></div>
          <div className="h-3 w-12 sm:h-4 sm:w-16 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-2 sm:space-y-3">
          <div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`payout-kpi-card hover:shadow-md transition-shadow duration-300 ${className}`}
      hover={true}
      role="article"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full">
          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
        </div>
        <span className="text-xs sm:text-sm font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
          Payouts
        </span>
      </div>

      {/* Total Payout Volume */}
      <div className="mb-2 sm:mb-3">
        <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
          {formatCurrency ? formatCurrency(totalVolume) : `₦${totalVolume.toLocaleString()}`}
        </div>
        <div className="text-xs text-gray-500 mt-1">Total Volume</div>
      </div>

      {/* Pending Payouts */}
      <div className="mb-2 sm:mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">
              {pendingCount} pending
            </span>
          </div>
          {pendingAmount > 0 && (
            <span className="text-xs text-gray-500">
              {formatCurrency ? formatCurrency(pendingAmount) : `₦${pendingAmount.toLocaleString()}`}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">Awaiting Processing</div>
      </div>

      {/* Processed Payouts */}
      <div className="mb-2 sm:mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700">
              {processedCount} processed
            </span>
          </div>
          {processedAmount > 0 && (
            <span className="text-xs text-gray-500">
              {formatCurrency ? formatCurrency(processedAmount) : `₦${processedAmount.toLocaleString()}`}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">Completed</div>
      </div>

      {/* Processing Rate Indicator */}
      <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          {getTrendIcon ? getTrendIcon(payoutTrend) : (
            payoutTrend === 'up' ? (
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
            ) : payoutTrend === 'down' ? (
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 rotate-180" />
            ) : (
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-300 rounded-full" />
            )
          )}
          <span className={`text-xs sm:text-sm font-medium ${
            processingRate >= 80 ? 'text-green-600' :
            processingRate >= 50 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {processingRate.toFixed(1)}%
          </span>
        </div>
        <span className="text-xs text-gray-500">Processing Rate</span>
      </div>

      {/* Hover Details */}
      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100 opacity-0 hover:opacity-100 transition-opacity">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Processing Status:</span>
            <span className={`font-medium ${
              processingRate >= 80 ? 'text-green-600' :
              processingRate >= 50 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {processingRate >= 80 ? 'Excellent' : processingRate >= 50 ? 'Good' : 'Needs Attention'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Total Transactions:</span>
            <span className="font-medium">{totalTransactions}</span>
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

PayoutKPI.displayName = 'PayoutKPI';

export default PayoutKPI;