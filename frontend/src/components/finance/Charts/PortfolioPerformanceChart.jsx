import React, { useState, useEffect, useRef } from 'react';
import { Download, TrendingUp, BarChart3, Activity, Filter } from 'lucide-react';

/**
 * PortfolioPerformanceChart - Portfolio performance chart with comparisons
 * 
 * Displays comparison of portfolio performance metrics across different
 * investment types with interactive tooltips and export functionality.
 */
const PortfolioPerformanceChart = ({ 
  investorId,
  dateRange,
  className = '',
  height = 300,
  showExport = true,
  showFilters = true,
  onPerformanceChange,
  onError
}) => {
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('returns'); // 'returns', 'risk', 'efficiency'
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const svgRef = useRef(null);

  // Fetch portfolio performance data from API
  const fetchPerformanceData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Mock data for now - in real implementation, this would call the API
      // const response = await api.get(`/api/roi-analytics/portfolio/${investorId || ''}`, { 
      //   dateRange, 
      //   period: selectedPeriod 
      // });
      
      // Mock data based on period
      const mockData = {
        monthly: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          portfolios: {
            'Your Portfolio': [2.1, 2.8, 1.9, 3.2, 2.7, 3.5, 3.1, 2.9, 3.3, 3.8, 3.4, 4.1],
            'Aggressive Growth': [3.2, 4.1, 2.8, 4.5, 3.9, 4.8, 4.2, 3.9, 4.4, 5.1, 4.6, 5.5],
            'Balanced': [2.5, 3.2, 2.2, 3.8, 3.2, 4.1, 3.6, 3.4, 3.8, 4.3, 3.9, 4.6],
            'Conservative': [1.8, 2.3, 1.6, 2.7, 2.3, 2.9, 2.6, 2.4, 2.7, 3.1, 2.8, 3.3],
            'Market Index': [2.2, 2.9, 2.0, 3.4, 2.9, 3.7, 3.2, 3.0, 3.4, 3.9, 3.5, 4.2]
          },
          riskMetrics: {
            'Your Portfolio': [0.8, 0.9, 1.1, 0.7, 0.9, 0.6, 0.8, 1.0, 0.7, 0.5, 0.8, 0.6],
            'Aggressive Growth': [1.2, 1.4, 1.6, 1.1, 1.3, 1.0, 1.2, 1.5, 1.1, 0.9, 1.2, 1.0],
            'Balanced': [0.9, 1.1, 1.3, 0.9, 1.1, 0.8, 1.0, 1.2, 0.9, 0.7, 1.0, 0.8],
            'Conservative': [0.6, 0.7, 0.9, 0.5, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3, 0.6, 0.4],
            'Market Index': [1.0, 1.2, 1.4, 1.0, 1.2, 0.9, 1.1, 1.3, 1.0, 0.8, 1.1, 0.9]
          },
          efficiency: {
            'Your Portfolio': [1.2, 1.4, 1.0, 1.8, 1.5, 2.1, 1.7, 1.4, 1.9, 2.3, 1.8, 2.5],
            'Aggressive Growth': [0.8, 1.0, 0.7, 1.2, 1.0, 1.4, 1.1, 0.9, 1.3, 1.6, 1.2, 1.8],
            'Balanced': [1.0, 1.2, 0.9, 1.4, 1.2, 1.6, 1.3, 1.1, 1.5, 1.8, 1.4, 1.9],
            'Conservative': [1.3, 1.5, 1.1, 1.9, 1.6, 2.2, 1.8, 1.5, 2.0, 2.4, 1.9, 2.6],
            'Market Index': [0.9, 1.1, 0.8, 1.3, 1.1, 1.5, 1.2, 1.0, 1.4, 1.7, 1.3, 1.9]
          }
        },
        quarterly: {
          labels: ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023', 'Q1 2024', 'Q2 2024'],
          portfolios: {
            'Your Portfolio': [6.8, 8.9, 9.3, 10.2, 11.3, 12.4],
            'Aggressive Growth': [10.1, 13.4, 13.9, 15.2, 16.8, 18.3],
            'Balanced': [7.9, 10.2, 10.8, 11.9, 13.1, 14.2],
            'Conservative': [5.7, 7.3, 7.7, 8.4, 9.2, 10.0],
            'Market Index': [7.1, 9.1, 9.6, 10.5, 11.5, 12.5]
          },
          riskMetrics: {
            'Your Portfolio': [0.9, 0.8, 0.7, 0.6, 0.7, 0.6],
            'Aggressive Growth': [1.4, 1.3, 1.1, 1.0, 1.1, 1.0],
            'Balanced': [1.1, 1.0, 0.9, 0.8, 0.9, 0.8],
            'Conservative': [0.7, 0.6, 0.5, 0.4, 0.5, 0.4],
            'Market Index': [1.2, 1.1, 1.0, 0.9, 1.0, 0.9]
          },
          efficiency: {
            'Your Portfolio': [1.2, 1.5, 1.6, 1.8, 1.9, 2.1],
            'Aggressive Growth': [0.8, 1.0, 1.1, 1.3, 1.4, 1.6],
            'Balanced': [1.0, 1.2, 1.3, 1.5, 1.6, 1.8],
            'Conservative': [1.3, 1.6, 1.7, 2.0, 2.1, 2.3],
            'Market Index': [0.9, 1.1, 1.2, 1.4, 1.5, 1.7]
          }
        },
        yearly: {
          labels: ['2020', '2021', '2022', '2023', '2024'],
          portfolios: {
            'Your Portfolio': [18.5, 22.3, 24.8, 28.7, 32.1],
            'Aggressive Growth': [28.2, 34.1, 37.9, 43.8, 49.0],
            'Balanced': [22.1, 26.8, 29.8, 34.4, 38.4],
            'Conservative': [15.9, 19.2, 21.4, 24.7, 27.5],
            'Market Index': [20.1, 24.3, 27.0, 31.2, 34.8]
          },
          riskMetrics: {
            'Your Portfolio': [1.2, 1.1, 1.0, 0.9, 0.8],
            'Aggressive Growth': [1.8, 1.6, 1.5, 1.3, 1.2],
            'Balanced': [1.4, 1.3, 1.2, 1.0, 0.9],
            'Conservative': [0.9, 0.8, 0.7, 0.6, 0.5],
            'Market Index': [1.5, 1.4, 1.3, 1.1, 1.0]
          },
          efficiency: {
            'Your Portfolio': [1.2, 1.4, 1.5, 1.7, 1.9],
            'Aggressive Growth': [0.8, 1.0, 1.1, 1.3, 1.5],
            'Balanced': [1.0, 1.2, 1.3, 1.5, 1.7],
            'Conservative': [1.3, 1.6, 1.7, 2.0, 2.2],
            'Market Index': [0.9, 1.1, 1.2, 1.4, 1.6]
          }
        }
      };

      const data = mockData[selectedPeriod] || mockData.monthly;
      setPerformanceData(data);
      
      if (onPerformanceChange) {
        onPerformanceChange(data);
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch portfolio performance data';
      setError(errorMessage);
      
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchPerformanceData();
  }, [dateRange, selectedPeriod, investorId]);

  // Format percentage
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(1)}%`;
  };

  // Format ratio
  const formatRatio = (value) => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(2);
  };

  // Export chart as image
  const exportChart = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const link = document.createElement('a');
      link.download = `portfolio-performance-${selectedMetric}-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // Calculate chart dimensions
  const getChartDimensions = () => {
    if (!performanceData) return { width: 800, height, padding: 40 };
    
    const width = 800;
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    return { width, height, padding, chartWidth, chartHeight };
  };

  // Generate portfolio paths
  const generatePortfolioPaths = () => {
    if (!performanceData) return {};
    
    const { chartWidth, chartHeight, padding } = getChartDimensions();
    const xStep = chartWidth / (performanceData.labels.length - 1);
    
    const data = selectedMetric === 'returns' 
      ? performanceData.portfolios
      : selectedMetric === 'risk'
      ? performanceData.riskMetrics
      : performanceData.efficiency;
    
    const allValues = Object.values(data).flat();
    const maxValue = Math.max(...allValues);
    const paths = {};
    
    Object.entries(data).forEach(([portfolio, values]) => {
      paths[portfolio] = values.map((value, index) => {
        const x = padding + (index * xStep);
        const y = padding + chartHeight - ((value / maxValue) * chartHeight);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    });
    
    return paths;
  };

  // Generate comparison bars
  const generateComparisonBars = () => {
    if (!performanceData) return [];
    
    const { chartWidth, chartHeight, padding } = getChartDimensions();
    const barWidth = chartWidth / (performanceData.labels.length * 6);
    const xStep = chartWidth / performanceData.labels.length;
    
    const data = selectedMetric === 'returns' 
      ? performanceData.portfolios
      : selectedMetric === 'risk'
      ? performanceData.riskMetrics
      : performanceData.efficiency;
    
    const allValues = Object.values(data).flat();
    const maxValue = Math.max(...allValues);
    
    return performanceData.labels.map((label, labelIndex) => {
      const bars = [];
      const portfolioNames = Object.keys(data);
      
      portfolioNames.forEach((portfolio, portfolioIndex) => {
        const value = data[portfolio][labelIndex];
        bars.push({
          x: padding + (labelIndex * xStep) + (portfolioIndex * barWidth) + barWidth/2,
          y: padding + chartHeight - ((value / maxValue) * chartHeight),
          width: barWidth * 0.8,
          height: ((value / maxValue) * chartHeight),
          value,
          portfolio,
          color: getPortfolioColor(portfolio)
        });
      });
      
      return { label, bars };
    });
  };

  // Get portfolio color
  const getPortfolioColor = (portfolio) => {
    const colors = {
      'Your Portfolio': '#3b82f6',
      'Aggressive Growth': '#ef4444',
      'Balanced': '#10b981',
      'Conservative': '#f59e0b',
      'Market Index': '#8b5cf6'
    };
    return colors[portfolio] || '#6b7280';
  };

  // Loading state
  if (loading && !performanceData) {
    return (
      <div className={`portfolio-performance-chart ${className}`}>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !performanceData) {
    return (
      <div className={`portfolio-performance-chart ${className}`}>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">Failed to load portfolio performance</div>
            <div className="text-sm text-red-500 mb-4">{error}</div>
            <button
              onClick={fetchPerformanceData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { width, padding, chartWidth, chartHeight } = getChartDimensions();
  const paths = generatePortfolioPaths();
  const comparisonBars = generateComparisonBars();
  const chartType = selectedMetric === 'returns' ? 'line' : 'bar';

  return (
    <div className={`portfolio-performance-chart ${className}`}>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Portfolio Performance</h3>
              <p className="text-sm text-gray-500">Comparison of portfolio performance metrics</p>
            </div>
            
            <div className="flex items-center gap-2">
              {showFilters && (
                <>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setSelectedMetric('returns')}
                      className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${selectedMetric === 'returns' ? 'bg-white shadow' : ''}`}
                    >
                      <TrendingUp className="w-3 h-3" />
                      Returns
                    </button>
                    <button
                      onClick={() => setSelectedMetric('risk')}
                      className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${selectedMetric === 'risk' ? 'bg-white shadow' : ''}`}
                    >
                      <Activity className="w-3 h-3" />
                      Risk
                    </button>
                    <button
                      onClick={() => setSelectedMetric('efficiency')}
                      className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${selectedMetric === 'efficiency' ? 'bg-white shadow' : ''}`}
                    >
                      <BarChart3 className="w-3 h-3" />
                      Efficiency
                    </button>
                  </div>
                </>
              )}
              
              {showExport && (
                <button
                  onClick={exportChart}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Export chart"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="p-6">
          <div className="relative">
            <svg
              ref={svgRef}
              width={width}
              height={height}
              className="w-full"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((percent) => (
                <g key={percent}>
                  <line
                    x1={padding}
                    y1={padding + (chartHeight * percent / 100)}
                    x2={padding + chartWidth}
                    y2={padding + (chartHeight * percent / 100)}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <text
                    x={padding - 10}
                    y={padding + (chartHeight * percent / 100)}
                    textAnchor="end"
                    alignmentBaseline="middle"
                    className="text-xs fill-gray-500"
                  >
                    {selectedMetric === 'returns' || selectedMetric === 'risk'
                      ? formatPercentage(20 * (1 - percent / 100))
                      : formatRatio(3 * (1 - percent / 100))
                    }
                  </text>
                </g>
              ))}

              {/* Line Chart for Returns */}
              {chartType === 'line' && Object.entries(paths).map(([portfolio, path]) => (
                <g key={portfolio}>
                  <polyline
                    points={path}
                    fill="none"
                    stroke={getPortfolioColor(portfolio)}
                    strokeWidth={portfolio === 'Your Portfolio' ? 3 : 2}
                    strokeDasharray={portfolio === 'Market Index' ? '5,5' : ''}
                  />
                  
                  {/* Data points for Your Portfolio */}
                  {portfolio === 'Your Portfolio' && performanceData.portfolios[portfolio].map((value, index) => {
                    const x = padding + (index * (chartWidth / (performanceData.labels.length - 1)));
                    const maxValue = Math.max(...Object.values(performanceData.portfolios).flat());
                    const y = padding + chartHeight - ((value / maxValue) * chartHeight);
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="5"
                        fill={getPortfolioColor(portfolio)}
                        className="cursor-pointer hover:r-7"
                        onMouseEnter={() => setHoveredPoint({ 
                          index, 
                          portfolio,
                          value,
                          label: performanceData.labels[index]
                        })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    );
                  })}
                </g>
              ))}

              {/* Bar Chart for Risk and Efficiency */}
              {chartType === 'bar' && comparisonBars.map((group, groupIndex) => (
                <g key={groupIndex}>
                  {group.bars.map((bar, barIndex) => (
                    <rect
                      key={barIndex}
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      fill={bar.color}
                      className="cursor-pointer hover:opacity-80"
                      onMouseEnter={() => setHoveredPoint({ 
                        index: groupIndex, 
                        portfolio: bar.portfolio,
                        value: bar.value,
                        label: group.label
                      })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  ))}
                </g>
              ))}

              {/* X-axis labels */}
              {performanceData && performanceData.labels.map((label, index) => {
                const x = padding + (index * (chartWidth / (performanceData.labels.length - 1)));
                return (
                  <text
                    key={index}
                    x={x}
                    y={height - padding + 20}
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                  >
                    {label}
                  </text>
                );
              })}
            </svg>

            {/* Tooltip */}
            {hoveredPoint && (
              <div className="absolute z-10 bg-gray-900 text-white p-3 rounded shadow-lg text-sm"
                   style={{
                     left: `${(hoveredPoint.index / (performanceData.labels.length - 1)) * 100}%`,
                     top: '20px',
                     transform: 'translateX(-50%)'
                   }}>
                <div className="font-medium">{hoveredPoint.label}</div>
                <div>{hoveredPoint.portfolio}</div>
                <div>
                  {selectedMetric === 'returns' ? 'Return' : 
                   selectedMetric === 'risk' ? 'Risk' : 'Efficiency'}: {
                    selectedMetric === 'returns' || selectedMetric === 'risk'
                      ? formatPercentage(hoveredPoint.value)
                      : formatRatio(hoveredPoint.value)
                  }
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm flex-wrap">
            {Object.keys(performanceData.portfolios).map((portfolio) => (
              <div key={portfolio} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded" 
                  style={{ 
                    backgroundColor: getPortfolioColor(portfolio),
                    backgroundImage: portfolio === 'Market Index' ? 'repeating-linear-gradient(45deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)' : ''
                  }}
                ></div>
                <span className="text-gray-600">{portfolio}</span>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          {performanceData && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {selectedMetric === 'returns' || selectedMetric === 'risk'
                    ? formatPercentage(
                        performanceData.portfolios['Your Portfolio'][performanceData.portfolios['Your Portfolio'].length - 1]
                      )
                    : formatRatio(
                        performanceData.efficiency['Your Portfolio'][performanceData.efficiency['Your Portfolio'].length - 1]
                      )
                  }
                </div>
                <div className="text-sm text-gray-500">Your Portfolio</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {selectedMetric === 'returns' || selectedMetric === 'risk'
                    ? formatPercentage(
                        performanceData.portfolios['Market Index'][performanceData.portfolios['Market Index'].length - 1]
                      )
                    : formatRatio(
                        performanceData.efficiency['Market Index'][performanceData.efficiency['Market Index'].length - 1]
                      )
                  }
                </div>
                <div className="text-sm text-gray-500">Market Index</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedMetric === 'returns' || selectedMetric === 'risk'
                    ? formatPercentage(
                        performanceData.portfolios['Your Portfolio'][performanceData.portfolios['Your Portfolio'].length - 1] -
                        performanceData.portfolios['Market Index'][performanceData.portfolios['Market Index'].length - 1]
                      )
                    : formatRatio(
                        performanceData.efficiency['Your Portfolio'][performanceData.efficiency['Your Portfolio'].length - 1] -
                        performanceData.efficiency['Market Index'][performanceData.efficiency['Market Index'].length - 1]
                      )
                  }
                </div>
                <div className="text-sm text-gray-500">vs Market</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioPerformanceChart;