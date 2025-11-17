import React, { useState, useEffect } from 'react';
import { formatCurrency, formatPercentage } from '../../utils/formatters.js';

const PerformanceCharts = ({ investorId, timeRange = '1y' }) => {
  const [performanceData, setPerformanceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('roi');

  useEffect(() => {
    fetchPerformanceData();
  }, [investorId, timeRange]);

  const fetchPerformanceData = async () => {
    try {
      setIsLoading(true);
      // Mock data for now - in real implementation, this would call the API
      // const response = await investorsAPI.getInvestorPerformanceAnalytics(investorId, { period: timeRange });
      
      // Mock data based on time range
      const mockData = {
        '1m': {
          roi: 2.5,
          totalReturns: 1250,
          monthlyReturns: [1.2, 0.8, 1.5, 2.1, 1.8, 2.5],
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
          benchmark: 1.8,
          volatility: 0.8,
          sharpeRatio: 1.2
        },
        '3m': {
          roi: 7.2,
          totalReturns: 3600,
          monthlyReturns: [1.2, 2.1, 1.8, 2.5, 2.8, 3.1, 2.4, 2.9, 3.2, 2.7, 3.0, 2.5],
          labels: ['Jan', 'Jan', 'Feb', 'Feb', 'Mar', 'Mar', 'Apr', 'Apr', 'May', 'May', 'Jun', 'Jun'],
          benchmark: 5.4,
          volatility: 1.2,
          sharpeRatio: 1.5
        },
        '6m': {
          roi: 12.8,
          totalReturns: 6400,
          monthlyReturns: [1.2, 2.1, 1.8, 2.5, 2.8, 3.1, 2.4, 2.9, 3.2, 2.7, 3.0, 2.5, 2.8, 3.2, 3.5, 3.1, 2.9, 3.3],
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          benchmark: 9.6,
          volatility: 1.5,
          sharpeRatio: 1.8
        },
        '1y': {
          roi: 18.5,
          totalReturns: 9250,
          monthlyReturns: [1.2, 2.1, 1.8, 2.5, 2.8, 3.1, 2.4, 2.9, 3.2, 2.7, 3.0, 2.5, 2.8, 3.2, 3.5, 3.1, 2.9, 3.3, 3.6, 3.2, 3.0, 3.4, 3.1, 2.8],
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          benchmark: 14.2,
          volatility: 2.1,
          sharpeRatio: 2.1
        }
      };

      setPerformanceData(mockData[timeRange] || mockData['1y']);
      setError(null);
    } catch (err) {
      setError('Failed to load performance data');
      console.error('Error fetching performance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getChartHeight = (values) => {
    const maxValue = Math.max(...values);
    return maxValue * 30; // Scale factor for visualization
  };

  const getBarColor = (value, index) => {
    if (value > 2.5) return 'bg-green-500';
    if (value > 1.5) return 'bg-blue-500';
    if (value > 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total ROI</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatPercentage(performanceData.roi)}
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
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267.653-.235.932.054l1.162.382.096.048.177.08.533.134.867-.046.795-.331 1.519-.211.548-.474.916-.658.798-.499 1.395-.565 1.639-.405.439.406.699.406.699 0 1.002-.406 1.002-.406 0 .193-.031.433-.046.699-.046.345 0 .504-.054.699-.161.445-.251.802-.517 1.102-.934.705-.712 1.158-1.85.102-.267-.35-.577-.534-.933-.702-.526-.39-1.188-.39-1.188 0-.41.025-.802.072-1.188.39a1.75 1.75 0 01-.713.565c-.405.224-.84.285-1.175.285-.46 0-.905-.084-1.33-.235C8.66 7.942 7.854 8.8 6.775c-.089-.897.716-1.783 1.8-2.683.084-.9.168-.657.168-1.657v-5c0-1.11.9-2 2-2h8c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2v-5z"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Returns</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(performanceData.totalReturns)}
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
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Benchmark</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatPercentage(performanceData.benchmark)}
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
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Sharpe Ratio</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {performanceData.sharpeRatio.toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setSelectedMetric('roi')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedMetric === 'roi'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Returns Over Time
            </button>
            <button
              onClick={() => setSelectedMetric('comparison')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedMetric === 'comparison'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Benchmark Comparison
            </button>
            <button
              onClick={() => setSelectedMetric('risk')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedMetric === 'risk'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Risk Analysis
            </button>
          </nav>
        </div>

        <div className="p-6">
          {selectedMetric === 'roi' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Returns</h3>
              <div className="space-y-4">
                <div className="flex items-end justify-between h-64">
                  {performanceData.monthlyReturns.map((value, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div className="w-full max-w-12 flex flex-col items-center">
                        <span className="text-xs text-gray-600 mb-1">
                          {formatPercentage(value)}
                        </span>
                        <div
                          className={`w-full ${getBarColor(value, index)} rounded-t transition-all duration-300 hover:opacity-80`}
                          style={{ height: `${value * 20}px` }}
                          title={`${performanceData.labels[index]}: ${formatPercentage(value)}`}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-2 truncate w-full text-center">
                        {performanceData.labels[index]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center space-x-8 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                    <span className="text-gray-600">High (>2.5%)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                    <span className="text-gray-600">Good (1.5-2.5%)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
                    <span className="text-gray-600">Moderate (0.5-1.5%)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                    <span className="text-gray-600">Low (<0.5%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedMetric === 'comparison' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Performance vs Benchmark</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Your Performance</span>
                    <span className="text-sm font-medium text-gray-900">{formatPercentage(performanceData.roi)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-8">
                    <div
                      className="bg-green-500 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${Math.min(performanceData.roi * 5, 100)}%` }}
                    >
                      {formatPercentage(performanceData.roi)}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Benchmark</span>
                    <span className="text-sm font-medium text-gray-900">{formatPercentage(performanceData.benchmark)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-8">
                    <div
                      className="bg-blue-500 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${Math.min(performanceData.benchmark * 5, 100)}%` }}
                    >
                      {formatPercentage(performanceData.benchmark)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700">
                      Outperforming benchmark by {formatPercentage(performanceData.roi - performanceData.benchmark)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedMetric === 'risk' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Volatility</h4>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatPercentage(performanceData.volatility)}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {performanceData.volatility < 1 ? 'Low volatility' :
                     performanceData.volatility < 2 ? 'Moderate volatility' : 'High volatility'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Sharpe Ratio</h4>
                  <div className="text-2xl font-bold text-gray-900">
                    {performanceData.sharpeRatio.toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {performanceData.sharpeRatio > 2 ? 'Excellent risk-adjusted returns' :
                     performanceData.sharpeRatio > 1 ? 'Good risk-adjusted returns' : 'Poor risk-adjusted returns'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceCharts;