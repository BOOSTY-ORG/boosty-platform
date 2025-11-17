import React, { useState, useEffect } from 'react';
import { formatDate, formatStatus } from '../../utils/formatters.js';

const KYCDashboard = ({ 
  kycMetrics, 
  isLoading = false,
  onRefresh,
  dateRange,
  onDateRangeChange 
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (dateRange) {
      // Calculate appropriate time range based on dateRange
      const daysDiff = Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 7) setSelectedTimeRange('7d');
      else if (daysDiff <= 30) setSelectedTimeRange('30d');
      else if (daysDiff <= 90) setSelectedTimeRange('90d');
      else setSelectedTimeRange('1y');
    }
  }, [dateRange]);

  const handleTimeRangeChange = (range) => {
    setSelectedTimeRange(range);
    
    const now = new Date();
    let start;
    
    switch (range) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    if (onDateRangeChange) {
      onDateRangeChange({ start, end: now });
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return (
          <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'down':
        return (
          <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Documents</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {kycMetrics?.summary?.totalDocuments || 0}
                    </div>
                    {kycMetrics?.growth?.documentGrowth && (
                      <div className="ml-2 flex items-baseline text-sm font-semibold">
                        {getTrendIcon(kycMetrics.growth.documentGrowth.trend)}
                        <span className={
                          kycMetrics.growth.documentGrowth.trend === 'up' ? 'text-green-600' :
                          kycMetrics.growth.documentGrowth.trend === 'down' ? 'text-red-600' :
                          'text-gray-600'
                        }>
                          {Math.abs(kycMetrics.growth.documentGrowth.percentage)}%
                        </span>
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Verified Documents</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {kycMetrics?.summary?.verifiedDocuments || 0}
                    </div>
                    {kycMetrics?.growth?.verificationGrowth && (
                      <div className="ml-2 flex items-baseline text-sm font-semibold">
                        {getTrendIcon(kycMetrics.growth.verificationGrowth.trend)}
                        <span className={
                          kycMetrics.growth.verificationGrowth.trend === 'up' ? 'text-green-600' :
                          kycMetrics.growth.verificationGrowth.trend === 'down' ? 'text-red-600' :
                          'text-gray-600'
                        }>
                          {Math.abs(kycMetrics.growth.verificationGrowth.percentage)}%
                        </span>
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Documents</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {kycMetrics?.summary?.pendingDocuments || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Rejected Documents</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {kycMetrics?.summary?.rejectedDocuments || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Verification Performance</h3>
            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Verification Rate</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {kycMetrics?.summary?.verificationRate?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${kycMetrics?.summary?.verificationRate || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Rejection Rate</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {kycMetrics?.summary?.rejectionRate?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ width: `${kycMetrics?.summary?.rejectionRate || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Avg Processing Time</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {kycMetrics?.summary?.averageProcessingTime?.toFixed(1) || 0} days
                  </span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Avg AI Score</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {kycMetrics?.summary?.averageVerificationScore?.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Document Types</h3>
            <div className="mt-5 space-y-3">
              {kycMetrics?.breakdowns?.documentType && 
                Object.entries(kycMetrics.breakdowns.documentType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{formatStatus(type)}</span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExpiryTab = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Document Expiry Status</h3>
          <div className="mt-5">
            {kycMetrics?.expiryAnalysis ? (
              <div className="space-y-4">
                {kycMetrics.expiryAnalysis.map((item) => (
                  <div key={item.range} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.range}</p>
                    </div>
                    <div className="flex items-center">
                      <span className="text-2xl font-semibold text-gray-900">{item.count}</span>
                      <span className="ml-2 text-sm text-gray-500">documents</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No expiry data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">AI Analysis Insights</h3>
          <div className="mt-5">
            {kycMetrics?.aiInsights && kycMetrics.aiInsights.length > 0 ? (
              <div className="space-y-4">
                {kycMetrics.aiInsights.map((insight) => (
                  <div key={insight.flags} className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          <span className="font-medium">Flag:</span> {insight.flags}
                        </p>
                        <p className="text-sm text-yellow-700">
                          <span className="font-medium">Count:</span> {insight.count}
                        </p>
                        <p className="text-sm text-yellow-700">
                          <span className="font-medium">Avg Authenticity:</span> {insight.avgAuthenticityScore}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No AI insights available</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Quality Trends</h3>
          <div className="mt-5">
            {kycMetrics?.qualityTrends && kycMetrics.qualityTrends.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Documents
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        High Confidence Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {kycMetrics.qualityTrends.map((trend) => (
                      <tr key={trend.month}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trend.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trend.avgScore}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trend.count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trend.highConfidenceRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No quality trends available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            KYC Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Monitor KYC verification status and performance metrics.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('expiry')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'expiry'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Expiry Tracking
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'analytics'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              AI Analytics
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'expiry' && renderExpiryTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
        </div>
      </div>
    </div>
  );
};

export default KYCDashboard;