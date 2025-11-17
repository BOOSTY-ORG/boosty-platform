import React, { useState, useEffect } from 'react';
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters.js';

const FinancialSummary = ({ investorId, timeRange = '1y' }) => {
  const [financialData, setFinancialData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('overview');

  useEffect(() => {
    fetchFinancialData();
  }, [investorId, timeRange]);

  const fetchFinancialData = async () => {
    try {
      setIsLoading(true);
      // Mock data for now - in real implementation, this would call the API
      // const response = await investorsAPI.getFinancialSummary(investorId, { period: timeRange });
      
      // Mock financial data
      const mockData = {
        overview: {
          totalInvested: 50000,
          currentValue: 58500,
          totalReturns: 8500,
          unrealizedGains: 3500,
          realizedGains: 5000,
          totalDeposits: 50000,
          totalWithdrawals: 0,
          netCashFlow: 50000,
          averageReturn: 10.2,
          yieldRate: 8.5,
          incomeYield: 6.8,
          capitalGains: 3.4
        },
        performance: {
          daily: [
            { date: '2023-11-01', value: 58000, change: 0.5, changePercent: 0.86 },
            { date: '2023-11-02', value: 58250, change: 250, changePercent: 0.43 },
            { date: '2023-11-03', value: 57900, change: -350, changePercent: -0.60 },
            { date: '2023-11-04', value: 58100, change: 200, changePercent: 0.35 },
            { date: '2023-11-05', value: 58500, change: 400, changePercent: 0.69 }
          ],
          monthly: [
            { month: 'Jan', value: 51000, change: 1000, changePercent: 2.0 },
            { month: 'Feb', value: 51500, change: 500, changePercent: 0.98 },
            { month: 'Mar', value: 52500, change: 1000, changePercent: 1.94 },
            { month: 'Apr', value: 53500, change: 1000, changePercent: 1.90 },
            { month: 'May', value: 54500, change: 1000, changePercent: 1.87 },
            { month: 'Jun', value: 55500, change: 1000, changePercent: 1.83 },
            { month: 'Jul', value: 56000, change: 500, changePercent: 0.90 },
            { month: 'Aug', value: 56500, change: 500, changePercent: 0.89 },
            { month: 'Sep', value: 57200, change: 700, changePercent: 1.24 },
            { month: 'Oct', value: 57800, change: 600, changePercent: 1.05 },
            { month: 'Nov', value: 58500, change: 700, changePercent: 1.21 }
          ],
          yearly: [
            { year: '2019', value: 10000, change: 0, changePercent: 0 },
            { year: '2020', value: 18000, change: 8000, changePercent: 80.0 },
            { year: '2021', value: 28000, change: 10000, changePercent: 55.6 },
            { year: '2022', value: 42000, change: 14000, changePercent: 50.0 },
            { year: '2023', value: 58500, change: 16500, changePercent: 39.3 }
          ]
        },
        income: {
          monthlyIncome: [
            { month: 'Jan', amount: 425, type: 'dividend', source: 'Solar Farm A' },
            { month: 'Feb', amount: 425, type: 'dividend', source: 'Solar Farm A' },
            { month: 'Mar', amount: 850, type: 'dividend', source: 'Solar Farm A, Rooftop Solar C' },
            { month: 'Apr', amount: 425, type: 'dividend', source: 'Solar Farm A' },
            { month: 'May', amount: 425, type: 'dividend', source: 'Solar Farm A' },
            { month: 'Jun', amount: 850, type: 'dividend', source: 'Solar Farm A, Rooftop Solar C' },
            { month: 'Jul', amount: 425, type: 'dividend', source: 'Solar Farm A' },
            { month: 'Aug', amount: 425, type: 'dividend', source: 'Solar Farm A' },
            { month: 'Sep', amount: 850, type: 'dividend', source: 'Solar Farm A, Rooftop Solar C' },
            { month: 'Oct', amount: 425, type: 'dividend', source: 'Solar Farm A' },
            { month: 'Nov', amount: 850, type: 'dividend', source: 'Solar Farm A, Rooftop Solar C' },
            { month: 'Dec', amount: 425, type: 'dividend', source: 'Solar Farm A' }
          ],
          incomeBySource: [
            { source: 'Solar Farm A', amount: 5100, percentage: 60 },
            { source: 'Rooftop Solar C', amount: 2040, percentage: 24 },
            { source: 'Community Solar D', amount: 1360, percentage: 16 }
          ],
          incomeByType: [
            { type: 'Dividend Income', amount: 6800, percentage: 80 },
            { type: 'Interest Income', amount: 1020, percentage: 12 },
            { type: 'Capital Gains', amount: 680, percentage: 8 }
          ]
        },
        projections: {
          nextMonth: 58800,
          nextQuarter: 60000,
          nextYear: 65000,
          fiveYearProjection: 95000,
          assumptions: {
            expectedReturn: 10.2,
            monthlyContribution: 0,
            inflationRate: 2.5,
            riskAdjustment: 0.8
          }
        }
      };

      setFinancialData(mockData);
      setError(null);
    } catch (err) {
      setError('Failed to load financial data');
      console.error('Error fetching financial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change) => {
    if (change > 0) {
      return (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      );
    } else if (change < 0) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    return null;
  };

  const renderMiniChart = (data) => {
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue;
    
    return (
      <div className="flex items-end h-8 space-x-1">
        {data.slice(-7).map((point, index) => (
          <div
            key={index}
            className="flex-1 bg-blue-500 rounded-t"
            style={{
              height: `${((point.value - minValue) / range) * 100}%`,
              opacity: 0.8
            }}
            title={`${point.date}: ${formatCurrency(point.value)}`}
          ></div>
        ))}
      </div>
    );
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
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Current Value</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(financialData.overview.currentValue)}
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
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Returns</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(financialData.overview.totalReturns)}
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
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267.653-.235.932.054l1.162.382.096.048.177.08.533.134.867-.046.795-.331 1.519-.211.548-.474.916-.658.798-.499 1.395-.565 1.639-.405.439.406.699.406.699 0 1.002-.406 1.002-.406 0 .193-.031.433-.046.699-.046.345 0 .504-.054.699-.161.445-.251.802-.517 1.102-.934.705-.712 1.158-1.85.102-.267-.35-.577-.534-.933-.702-.526-.39-1.188-.39-1.188 0-.41.025-.802.072-1.188.39a1.75 1.75 0 01-.713.565c-.405.224-.84.285-1.175.285-.46 0-.905-.084-1.33-.235C8.66 7.942 7.854 8.8 6.775c-.089-.897.716-1.783 1.8-2.683.084-.9.168-.657.168-1.657v-5c0-1.11.9-2 2-2h8c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2v-5z"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Yield Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatPercentage(financialData.overview.yieldRate)}
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Return</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatPercentage(financialData.overview.averageReturn)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Metrics Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setSelectedMetric('overview')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedMetric === 'overview'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedMetric('performance')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedMetric === 'performance'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Performance
            </button>
            <button
              onClick={() => setSelectedMetric('income')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedMetric === 'income'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Income Analysis
            </button>
            <button
              onClick={() => setSelectedMetric('projections')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedMetric === 'projections'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Projections
            </button>
          </nav>
        </div>

        <div className="p-6">
          {selectedMetric === 'overview' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Investment Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Invested:</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(financialData.overview.totalInvested)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Current Value:</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(financialData.overview.currentValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Returns:</span>
                        <span className="text-sm font-medium text-green-600">{formatCurrency(financialData.overview.totalReturns)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Unrealized Gains:</span>
                        <span className="text-sm font-medium text-blue-600">{formatCurrency(financialData.overview.unrealizedGains)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Realized Gains:</span>
                        <span className="text-sm font-medium text-green-600">{formatCurrency(financialData.overview.realizedGains)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Performance Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Average Return:</span>
                        <span className="text-sm font-medium text-gray-900">{formatPercentage(financialData.overview.averageReturn)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Yield Rate:</span>
                        <span className="text-sm font-medium text-gray-900">{formatPercentage(financialData.overview.yieldRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Income Yield:</span>
                        <span className="text-sm font-medium text-gray-900">{formatPercentage(financialData.overview.incomeYield)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Capital Gains:</span>
                        <span className="text-sm font-medium text-gray-900">{formatPercentage(financialData.overview.capitalGains)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedMetric === 'performance' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trends</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Daily Performance (Last 7 Days)</h4>
                  <div className="space-y-2">
                    {financialData.performance.daily.map((day, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border border-gray-100 rounded">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600 w-20">{formatDate(day.date, 'MMM dd')}</span>
                          <span className="text-sm font-medium text-gray-900 w-24">{formatCurrency(day.value)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getChangeIcon(day.change)}
                          <span className={`text-sm font-medium ${getChangeColor(day.change)}`}>
                            {day.change > 0 ? '+' : ''}{formatCurrency(day.change)} ({day.changePercent > 0 ? '+' : ''}{day.changePercent}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Monthly Performance</h4>
                  <div className="h-32">
                    {renderMiniChart(financialData.performance.monthly)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedMetric === 'income' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Income Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Income by Source</h4>
                  <div className="space-y-2">
                    {financialData.income.incomeBySource.map((source, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border border-gray-100 rounded">
                        <span className="text-sm text-gray-700">{source.source}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(source.amount)}</div>
                          <div className="text-xs text-gray-500">{source.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Income by Type</h4>
                  <div className="space-y-2">
                    {financialData.income.incomeByType.map((type, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border border-gray-100 rounded">
                        <span className="text-sm text-gray-700">{type.type}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(type.amount)}</div>
                          <div className="text-xs text-gray-500">{type.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedMetric === 'projections' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Future Projections</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Value Projections</h4>
                  <div className="space-y-3">
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Next Month</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(financialData.projections.nextMonth)}</span>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Next Quarter</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(financialData.projections.nextQuarter)}</span>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Next Year</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(financialData.projections.nextYear)}</span>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">5 Year Projection</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(financialData.projections.fiveYearProjection)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Projection Assumptions</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Expected Return:</span>
                      <span className="text-sm font-medium text-gray-900">{formatPercentage(financialData.projections.assumptions.expectedReturn)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Monthly Contribution:</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(financialData.projections.assumptions.monthlyContribution)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Inflation Rate:</span>
                      <span className="text-sm font-medium text-gray-900">{formatPercentage(financialData.projections.assumptions.inflationRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Risk Adjustment:</span>
                      <span className="text-sm font-medium text-gray-900">{financialData.projections.assumptions.riskAdjustment}</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> Projections are based on historical performance and current market conditions. Actual results may vary.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;