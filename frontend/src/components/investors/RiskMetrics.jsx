import React, { useState, useEffect } from 'react';
import { formatCurrency, formatPercentage } from '../../utils/formatters.js';

const RiskMetrics = ({ investorId, timeRange = '1y' }) => {
  const [riskData, setRiskData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('overview');

  useEffect(() => {
    fetchRiskData();
  }, [investorId, timeRange]);

  const fetchRiskData = async () => {
    try {
      setIsLoading(true);
      // Mock data for now - in real implementation, this would call the API
      // const response = await investorsAPI.getRiskAssessment(investorId, { period: timeRange });
      
      // Mock risk data
      const mockData = {
        overview: {
          riskScore: 65,
          riskLevel: 'moderate',
          volatility: 12.5,
          sharpeRatio: 1.8,
          maxDrawdown: -8.3,
          var95: 5.2,
          beta: 0.85,
          alpha: 2.1,
          rSquared: 0.72,
          informationRatio: 0.9,
          sortinoRatio: 2.4,
          calmarRatio: 1.6,
          trackingError: 4.8
        },
        riskFactors: [
          { name: 'Market Risk', value: 35, percentage: 35, impact: 'high', trend: 'stable' },
          { name: 'Credit Risk', value: 25, percentage: 25, impact: 'medium', trend: 'decreasing' },
          { name: 'Liquidity Risk', value: 20, percentage: 20, impact: 'low', trend: 'stable' },
          { name: 'Operational Risk', value: 12, percentage: 12, impact: 'medium', trend: 'increasing' },
          { name: 'Regulatory Risk', value: 8, percentage: 8, impact: 'low', trend: 'stable' }
        ],
        scenarioAnalysis: [
          { scenario: 'Best Case', probability: 10, return: 25.5, description: 'Optimal market conditions' },
          { scenario: 'Good Case', probability: 25, return: 18.2, description: 'Favorable market conditions' },
          { scenario: 'Base Case', probability: 40, return: 12.8, description: 'Expected market conditions' },
          { scenario: 'Poor Case', probability: 20, return: 5.3, description: 'Unfavorable market conditions' },
          { scenario: 'Worst Case', probability: 5, return: -8.7, description: 'Severe market downturn' }
        ],
        riskAdjustedReturns: [
          { period: '1M', return: 2.1, risk: 3.2, riskAdjustedReturn: 0.66 },
          { period: '3M', return: 6.8, risk: 5.1, riskAdjustedReturn: 1.33 },
          { period: '6M', return: 12.5, risk: 8.7, riskAdjustedReturn: 1.44 },
          { period: '1Y', return: 18.5, risk: 12.5, riskAdjustedReturn: 1.48 },
          { period: '2Y', return: 32.4, risk: 18.2, riskAdjustedReturn: 1.78 }
        ],
        recommendations: [
          { 
            priority: 'high', 
            title: 'Diversify Portfolio', 
            description: 'Consider adding investments in different sectors to reduce concentration risk',
            impact: 'Reduce overall risk by 15%'
          },
          { 
            priority: 'medium', 
            title: 'Monitor Market Volatility', 
            description: 'Current market conditions show increased volatility, consider defensive positions',
            impact: 'Protect against downside risk'
          },
          { 
            priority: 'low', 
            title: 'Rebalance Quarterly', 
            description: 'Regular portfolio rebalancing can help maintain optimal risk-return profile',
            impact: 'Improve risk-adjusted returns by 5%'
          }
        ]
      };

      setRiskData(mockData);
      setError(null);
    } catch (err) {
      setError('Failed to load risk data');
      console.error('Error fetching risk data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score < 30) return 'text-green-600 bg-green-100';
    if (score < 50) return 'text-yellow-600 bg-yellow-100';
    if (score < 70) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'decreasing':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderRiskGauge = (score) => {
    const rotation = (score / 100) * 180 - 90;
    const riskColor = score < 30 ? '#10B981' : score < 50 ? '#F59E0B' : score < 70 ? '#F97316' : '#EF4444';
    
    return (
      <div className="relative w-48 h-24 mx-auto">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <path
            d="M 20 80 A 60 60 0 0 1 180 80"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 20 80 A 60 60 0 0 1 180 80"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 188.5} 188.5`}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>
          <line
            x1="100"
            y1="80"
            x2={100 + 50 * Math.cos((rotation * Math.PI) / 180)}
            y2={80 + 50 * Math.sin((rotation * Math.PI) / 180)}
            stroke={riskColor}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="100" cy="80" r="6" fill={riskColor} />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <div className="text-2xl font-bold text-gray-900">{score}</div>
          <div className="text-xs text-gray-500">Risk Score</div>
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
      {/* Risk Score Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Assessment Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            {renderRiskGauge(riskData.overview.riskScore)}
            <div className="mt-4 text-center">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRiskColor(riskData.overview.riskScore)}`}>
                {riskData.overview.riskLevel.charAt(0).toUpperCase() + riskData.overview.riskLevel.slice(1)} Risk
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Volatility</div>
              <div className="text-lg font-semibold text-gray-900">{formatPercentage(riskData.overview.volatility)}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Sharpe Ratio</div>
              <div className="text-lg font-semibold text-gray-900">{riskData.overview.sharpeRatio.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Max Drawdown</div>
              <div className="text-lg font-semibold text-gray-900">{formatPercentage(riskData.overview.maxDrawdown)}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">VaR (95%)</div>
              <div className="text-lg font-semibold text-gray-900">{formatPercentage(riskData.overview.var95)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Metrics Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setSelectedMetric('factors')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedMetric === 'factors'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Risk Factors
            </button>
            <button
              onClick={() => setSelectedMetric('scenarios')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedMetric === 'scenarios'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Scenario Analysis
            </button>
            <button
              onClick={() => setSelectedMetric('adjusted')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedMetric === 'adjusted'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Risk-Adjusted Returns
            </button>
            <button
              onClick={() => setSelectedMetric('recommendations')}
              className={`py-2 px-4 text-sm font-medium ${
                selectedMetric === 'recommendations'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Recommendations
            </button>
          </nav>
        </div>

        <div className="p-6">
          {selectedMetric === 'factors' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Factors Analysis</h3>
              <div className="space-y-4">
                {riskData.riskFactors.map((factor, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-gray-900">{factor.name}</h4>
                        <div className="ml-2">{getTrendIcon(factor.trend)}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">{formatPercentage(factor.percentage)}</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          factor.impact === 'high' ? 'bg-red-100 text-red-800' :
                          factor.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {factor.impact} impact
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          factor.value > 30 ? 'bg-red-500' :
                          factor.value > 20 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${factor.value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedMetric === 'scenarios' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Scenario Analysis</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scenario</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Probability</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Return</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {riskData.scenarioAnalysis.map((scenario, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {scenario.scenario}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {scenario.probability}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`font-medium ${
                            scenario.return > 15 ? 'text-green-600' :
                            scenario.return > 5 ? 'text-blue-600' :
                            scenario.return > 0 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {formatPercentage(scenario.return)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {scenario.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Expected Portfolio Return</h4>
                <div className="text-lg font-semibold text-blue-900">
                  {formatPercentage(
                    riskData.scenarioAnalysis.reduce((sum, s) => sum + (s.probability / 100) * s.return, 0)
                  )}
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Weighted average based on scenario probabilities
                </p>
              </div>
            </div>
          )}

          {selectedMetric === 'adjusted' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Risk-Adjusted Returns</h3>
              <div className="space-y-4">
                {riskData.riskAdjustedReturns.map((period, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-900">{period.period} Performance</h4>
                      <div className="text-sm font-medium text-gray-900">
                        Risk-Adjusted: {period.riskAdjustedReturn.toFixed(2)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Return:</span>
                        <span className="ml-2 text-gray-900">{formatPercentage(period.return)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Risk:</span>
                        <span className="ml-2 text-gray-900">{formatPercentage(period.risk)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Ratio:</span>
                        <span className={`ml-2 font-medium ${
                          period.riskAdjustedReturn > 1.5 ? 'text-green-600' :
                          period.riskAdjustedReturn > 1.0 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {period.riskAdjustedReturn.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          period.riskAdjustedReturn > 1.5 ? 'bg-green-500' :
                          period.riskAdjustedReturn > 1.0 ? 'bg-blue-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(period.riskAdjustedReturn * 40, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedMetric === 'recommendations' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Management Recommendations</h3>
              <div className="space-y-4">
                {riskData.recommendations.map((rec, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${getPriorityColor(rec.priority)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">{rec.title}</h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        rec.priority === 'high' ? 'bg-red-200 text-red-800' :
                        rec.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-green-200 text-green-800'
                      }`}>
                        {rec.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{rec.description}</p>
                    <div className="flex items-center text-sm">
                      <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-600">Expected impact: {rec.impact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskMetrics;