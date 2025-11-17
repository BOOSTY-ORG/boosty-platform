import React, { useState, useEffect } from 'react';
import { formatCurrency, formatPercentage } from '../../utils/formatters.js';

const PortfolioAnalysis = ({ investorId, timeRange = '1y' }) => {
  const [portfolioData, setPortfolioData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState('distribution');

  useEffect(() => {
    fetchPortfolioData();
  }, [investorId, timeRange]);

  const fetchPortfolioData = async () => {
    try {
      setIsLoading(true);
      // Mock data for now - in real implementation, this would call the API
      // const response = await investorsAPI.getPortfolioAnalysis(investorId, { period: timeRange });
      
      // Mock portfolio data
      const mockData = {
        distribution: [
          { name: 'Solar Farm A', value: 15000, percentage: 30, risk: 'low', returns: 8.5, status: 'active' },
          { name: 'Solar Farm B', value: 12000, percentage: 24, risk: 'medium', returns: 12.3, status: 'active' },
          { name: 'Rooftop Solar C', value: 8000, percentage: 16, risk: 'low', returns: 7.2, status: 'active' },
          { name: 'Community Solar D', value: 7000, percentage: 14, risk: 'medium', returns: 10.1, status: 'active' },
          { name: 'Commercial Solar E', value: 5000, percentage: 10, risk: 'high', returns: 15.7, status: 'pending' },
          { name: 'Residential Solar F', value: 3000, percentage: 6, risk: 'low', returns: 6.8, status: 'active' }
        ],
        sectors: [
          { name: 'Utility Scale', value: 27000, percentage: 54, projects: 2 },
          { name: 'Commercial', value: 12000, percentage: 24, projects: 2 },
          { name: 'Residential', value: 8000, percentage: 16, projects: 1 },
          { name: 'Community', value: 3000, percentage: 6, projects: 1 }
        ],
        riskProfile: {
          low: { value: 26000, percentage: 52, projects: 3 },
          medium: { value: 19000, percentage: 38, projects: 2 },
          high: { value: 5000, percentage: 10, projects: 1 }
        },
        geographic: [
          { name: 'California', value: 20000, percentage: 40, projects: 3 },
          { name: 'Texas', value: 15000, percentage: 30, projects: 2 },
          { name: 'Florida', value: 10000, percentage: 20, projects: 1 },
          { name: 'Arizona', value: 5000, percentage: 10, projects: 1 }
        ],
        performance: {
          totalInvested: 50000,
          currentValue: 58500,
          totalReturns: 8500,
          averageReturn: 10.2,
          bestPerformer: { name: 'Commercial Solar E', return: 15.7 },
          worstPerformer: { name: 'Residential Solar F', return: 6.8 }
        }
      };

      setPortfolioData(mockData);
      setError(null);
    } catch (err) {
      setError('Failed to load portfolio data');
      console.error('Error fetching portfolio data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderDonutChart = (data, colors) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;
    
    return (
      <div className="relative w-48 h-48 mx-auto">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const endAngle = currentAngle + angle;
            
            const x1 = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
            const y1 = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);
            const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
            const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M 50 50`,
              `L ${x1} ${y1}`,
              `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');
            
            currentAngle = endAngle;
            
            return (
              <path
                key={index}
                d={pathData}
                fill={colors[index % colors.length]}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                title={`${item.name}: ${formatPercentage(percentage)}`}
              />
            );
          })}
          <circle cx="50" cy="50" r="20" fill="white" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center transform rotate-90">
            <div className="text-lg font-bold text-gray-900">{formatCurrency(total)}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>
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
      {/* Portfolio Summary Cards */}
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Invested</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(portfolioData.performance.totalInvested)}
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Current Value</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(portfolioData.performance.currentValue)}
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Returns</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(portfolioData.performance.totalReturns)}
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
                    {formatPercentage(portfolioData.performance.averageReturn)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setSelectedView('distribution')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedView === 'distribution'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Investment Distribution
            </button>
            <button
              onClick={() => setSelectedView('sectors')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedView === 'sectors'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Sector Analysis
            </button>
            <button
              onClick={() => setSelectedView('risk')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedView === 'risk'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Risk Profile
            </button>
            <button
              onClick={() => setSelectedView('geographic')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedView === 'geographic'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Geographic Distribution
            </button>
          </nav>
        </div>

        <div className="p-6">
          {selectedView === 'distribution' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Investment Distribution</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  {renderDonutChart(portfolioData.distribution, ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'])}
                  <div className="mt-4 space-y-2">
                    {portfolioData.distribution.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'][index] }}
                          ></div>
                          <span className="text-sm text-gray-700">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.value)} ({formatPercentage(item.percentage)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Investment Details</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Returns</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {portfolioData.distribution.map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-900">{item.name}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(item.value)}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{formatPercentage(item.returns)}</td>
                            <td className="px-3 py-2 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(item.risk)}`}>
                                {item.risk}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedView === 'sectors' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sector Analysis</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  {renderDonutChart(portfolioData.sectors, ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'])}
                  <div className="mt-4 space-y-2">
                    {portfolioData.sectors.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][index] }}
                          ></div>
                          <span className="text-sm text-gray-700">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.value)} ({formatPercentage(item.percentage)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Sector Details</h4>
                  <div className="space-y-3">
                    {portfolioData.sectors.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="text-sm font-medium text-gray-900">{item.name}</h5>
                          <span className="text-sm font-medium text-gray-900">{formatPercentage(item.percentage)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Total Investment:</span>
                            <span className="ml-2 text-gray-900">{formatCurrency(item.value)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Projects:</span>
                            <span className="ml-2 text-gray-900">{item.projects}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedView === 'risk' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Profile</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  {renderDonutChart(
                    Object.values(portfolioData.riskProfile), 
                    ['#10B981', '#F59E0B', '#EF4444']
                  )}
                  <div className="mt-4 space-y-2">
                    {Object.entries(portfolioData.riskProfile).map(([key, value], index) => (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: ['#10B981', '#F59E0B', '#EF4444'][index] }}
                          ></div>
                          <span className="text-sm text-gray-700 capitalize">{key} Risk</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(value.value)} ({formatPercentage(value.percentage)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Risk Assessment</h4>
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-green-800 mb-2">Low Risk Investments</h5>
                      <div className="text-sm text-green-700">
                        <p>Amount: {formatCurrency(portfolioData.riskProfile.low.value)}</p>
                        <p>Percentage: {formatPercentage(portfolioData.riskProfile.low.percentage)}</p>
                        <p>Projects: {portfolioData.riskProfile.low.projects}</p>
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-yellow-800 mb-2">Medium Risk Investments</h5>
                      <div className="text-sm text-yellow-700">
                        <p>Amount: {formatCurrency(portfolioData.riskProfile.medium.value)}</p>
                        <p>Percentage: {formatPercentage(portfolioData.riskProfile.medium.percentage)}</p>
                        <p>Projects: {portfolioData.riskProfile.medium.projects}</p>
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-red-800 mb-2">High Risk Investments</h5>
                      <div className="text-sm text-red-700">
                        <p>Amount: {formatCurrency(portfolioData.riskProfile.high.value)}</p>
                        <p>Percentage: {formatPercentage(portfolioData.riskProfile.high.percentage)}</p>
                        <p>Projects: {portfolioData.riskProfile.high.projects}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedView === 'geographic' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Geographic Distribution</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  {renderDonutChart(portfolioData.geographic, ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'])}
                  <div className="mt-4 space-y-2">
                    {portfolioData.geographic.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][index] }}
                          ></div>
                          <span className="text-sm text-gray-700">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.value)} ({formatPercentage(item.percentage)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Regional Details</h4>
                  <div className="space-y-3">
                    {portfolioData.geographic.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="text-sm font-medium text-gray-900">{item.name}</h5>
                          <span className="text-sm font-medium text-gray-900">{formatPercentage(item.percentage)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Total Investment:</span>
                            <span className="ml-2 text-gray-900">{formatCurrency(item.value)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Projects:</span>
                            <span className="ml-2 text-gray-900">{item.projects}</span>
                          </div>
                        </div>
                      </div>
                    ))}
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

export default PortfolioAnalysis;