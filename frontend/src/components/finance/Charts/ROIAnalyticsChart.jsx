import React, { useState, useEffect, useRef } from 'react';
import { Download, TrendingUp, Target, BarChart3, Filter } from 'lucide-react';

/**
 * ROIAnalyticsChart - ROI analytics visualization with performance trends
 * 
 * Displays portfolio ROI performance over time with benchmarks, risk metrics,
 * and comparative analysis with interactive tooltips and export functionality.
 */
const ROIAnalyticsChart = ({ 
  investorId,
  dateRange,
  className = '',
  height = 300,
  showExport = true,
  showFilters = true,
  onROIChange,
  onError
}) => {
  const [roiData, setRoiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState('performance'); // 'performance', 'comparison', 'risk'
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const svgRef = useRef(null);

  // Fetch ROI analytics data from API
  const fetchROIData = async () => {
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
          portfolioROI: [2.1, 2.8, 1.9, 3.2, 2.7, 3.5, 3.1, 2.9, 3.3, 3.8, 3.4, 4.1],
          benchmark: [1.8, 1.9, 2.0, 2.1, 2.0, 2.2, 2.1, 2.0, 2.2, 2.3, 2.2, 2.4],
          riskAdjusted: [1.9, 2.5, 1.7, 2.8, 2.4, 3.0, 2.7, 2.5, 2.9, 3.2, 2.9, 3.5],
          volatility: [0.8, 0.9, 1.1, 0.7, 0.9, 0.6, 0.8, 1.0, 0.7, 0.5, 0.8, 0.6],
          sharpeRatio: [1.2, 1.4, 1.0, 1.8, 1.5, 2.1, 1.7, 1.4, 1.9, 2.3, 1.8, 2.5],
          categories: {
            'Solar Bonds': [1.8, 2.1, 1.5, 2.5, 2.2, 2.8, 2.4, 2.2, 2.6, 3.0, 2.7, 3.2],
            'Green Energy': [2.5, 3.2, 2.3, 3.8, 3.2, 4.1, 3.7, 3.5, 3.9, 4.4, 4.0, 4.8],
            'Infrastructure': [1.5, 1.9, 1.3, 2.1, 1.8, 2.3, 2.0, 1.8, 2.2, 2.5, 2.2, 2.7]
          }
        },
        quarterly: {
          labels: ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023', 'Q1 2024', 'Q2 2024'],
          portfolioROI: [6.8, 8.9, 9.3, 10.2, 11.3, 12.4],
          benchmark: [5.7, 6.0, 6.3, 6.6, 6.9, 7.2],
          riskAdjusted: [6.1, 7.8, 8.1, 8.9, 9.8, 10.7],
          volatility: [0.9, 0.8, 0.7, 0.6, 0.7, 0.6],
          sharpeRatio: [1.2, 1.5, 1.6, 1.8, 1.9, 2.1],
          categories: {
            'Solar Bonds': [5.4, 6.8, 7.0, 7.7, 8.4, 9.2],
            'Green Energy': [8.0, 10.5, 11.2, 12.3, 13.6, 14.9],
            'Infrastructure': [4.7, 5.8, 5.9, 6.4, 7.0, 7.6]
          }
        },
        yearly: {
          labels: ['2020', '2021', '2022', '2023', '2024'],
          portfolioROI: [18.5, 22.3, 24.8, 28.7, 32.1],
          benchmark: [15.2, 16.8, 18.4, 20.1, 21.8],
          riskAdjusted: [16.8, 19.7, 21.9, 25.1, 28.3],
          volatility: [1.2, 1.1, 1.0, 0.9, 0.8],
          sharpeRatio: [1.2, 1.4, 1.5, 1.7, 1.9],
          categories: {
            'Solar Bonds': [14.2, 16.8, 18.5, 21.0, 23.4],
            'Green Energy': [22.8, 27.5, 30.8, 35.6, 40.2],
            'Infrastructure': [12.1, 14.2, 15.7, 17.8, 19.8]
          }
        }
      };

      const data = mockData[selectedPeriod] || mockData.monthly;
      setRoiData(data);
      
      if (onROIChange) {
        onROIChange(data);
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch ROI analytics data';
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
    fetchROIData();
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
      link.download = `roi-analytics-${selectedView}-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // Calculate chart dimensions
  const getChartDimensions = () => {
    if (!roiData) return { width: 800, height, padding: 40 };
    
    const width = 800;
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    return { width, height, padding, chartWidth, chartHeight };
  };

  // Generate chart paths
  const generateChartPaths = () => {
    if (!roiData) return { portfolio: '', benchmark: '', riskAdjusted: '' };
    
    const { chartWidth, chartHeight, padding } = getChartDimensions();
    const xStep = chartWidth / (roiData.labels.length - 1);
    
    const maxValue = Math.max(
      ...roiData.portfolioROI,
      ...roiData.benchmark,
      ...roiData.riskAdjusted
    );
    
    return {
      portfolio: roiData.portfolioROI.map((value, index) => {
        const x = padding + (index * xStep);
        const y = padding + chartHeight - ((value / maxValue) * chartHeight);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' '),
      benchmark: roiData.benchmark.map((value, index) => {
        const x = padding + (index * xStep);
        const y = padding + chartHeight - ((value / maxValue) * chartHeight);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' '),
      riskAdjusted: roiData.riskAdjusted.map((value, index) => {
        const x = padding + (index * xStep);
        const y = padding + chartHeight - ((value / maxValue) * chartHeight);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')
    };
  };

  // Generate category paths for comparison view
  const generateCategoryPaths = () => {
    if (!roiData || !roiData.categories) return {};
    
    const { chartWidth, chartHeight, padding } = getChartDimensions();
    const xStep = chartWidth / (roiData.labels.length - 1);
    
    const allValues = Object.values(roiData.categories).flat();
    const maxValue = Math.max(...allValues);
    
    const paths = {};
    Object.entries(roiData.categories).forEach(([category, values]) => {
      paths[category] = values.map((value, index) => {
        const x = padding + (index * xStep);
        const y = padding + chartHeight - ((value / maxValue) * chartHeight);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    });
    
    return paths;
  };

  // Generate risk metrics bars
  const generateRiskBars = () => {
    if (!roiData) return [];
    
    const { chartWidth, chartHeight, padding } = getChartDimensions();
    const barWidth = chartWidth / (roiData.labels.length * 2);
    const xStep = chartWidth / roiData.labels.length;
    
    const maxVolatility = Math.max(...roiData.volatility);
    const maxSharpe = Math.max(...roiData.sharpeRatio);
    
    return roiData.labels.map((label, index) => ({
      x: padding + (index * xStep) + (barWidth / 2),
      volatilityY: padding + chartHeight - ((roiData.volatility[index] / maxVolatility) * chartHeight),
      volatilityHeight: (roiData.volatility[index] / maxVolatility) * chartHeight,
      sharpeY: padding + chartHeight - ((roiData.sharpeRatio[index] / maxSharpe) * chartHeight),
      sharpeHeight: (roiData.sharpeRatio[index] / maxSharpe) * chartHeight,
      width: barWidth,
      label,
      volatility: roiData.volatility[index],
      sharpeRatio: roiData.sharpeRatio[index]
    }));
  };

  // Loading state
  if (loading && !roiData) {
    return (
      <div className={`roi-analytics-chart ${className}`}>
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
  if (error && !roiData) {
    return (
      <div className={`roi-analytics-chart ${className}`}>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">Failed to load ROI analytics</div>
            <div className="text-sm text-red-500 mb-4">{error}</div>
            <button
              onClick={fetchROIData}
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
  const paths = generateChartPaths();
  const categoryPaths = generateCategoryPaths();
  const riskBars = generateRiskBars();

  return (
    <div className={`roi-analytics-chart ${className}`}>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">ROI Analytics</h3>
              <p className="text-sm text-gray-500">Portfolio performance with benchmarks and risk metrics</p>
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
                      onClick={() => setSelectedView('performance')}
                      className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${selectedView === 'performance' ? 'bg-white shadow' : ''}`}
                    >
                      <TrendingUp className="w-3 h-3" />
                      Performance
                    </button>
                    <button
                      onClick={() => setSelectedView('comparison')}
                      className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${selectedView === 'comparison' ? 'bg-white shadow' : ''}`}
                    >
                      <BarChart3 className="w-3 h-3" />
                      Comparison
                    </button>
                    <button
                      onClick={() => setSelectedView('risk')}
                      className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${selectedView === 'risk' ? 'bg-white shadow' : ''}`}
                    >
                      <Target className="w-3 h-3" />
                      Risk
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
                    {formatPercentage(
                      selectedView === 'risk' 
                        ? (selectedView === 'risk' && percent < 50 ? 3 : 0) + (3 * (1 - percent / 100))
                        : 15 * (1 - percent / 100)
                    )}
                  </text>
                </g>
              ))}

              {/* Performance View */}
              {selectedView === 'performance' && (
                <>
                  {/* Benchmark line */}
                  <polyline
                    points={paths.benchmark}
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                  
                  {/* Risk-adjusted line */}
                  <polyline
                    points={paths.riskAdjusted}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                  
                  {/* Portfolio ROI line */}
                  <polyline
                    points={paths.portfolio}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                  />
                  
                  {/* Data points */}
                  {roiData.portfolioROI.map((value, index) => {
                    const x = padding + (index * (chartWidth / (roiData.labels.length - 1)));
                    const maxValue = Math.max(...roiData.portfolioROI, ...roiData.benchmark, ...roiData.riskAdjusted);
                    const y = padding + chartHeight - ((value / maxValue) * chartHeight);
                    return (
                      <g key={index}>
                        <circle
                          cx={x}
                          cy={y}
                          r="5"
                          fill="#3b82f6"
                          className="cursor-pointer hover:r-7"
                          onMouseEnter={() => setHoveredPoint({ 
                            index, 
                            portfolio: value, 
                            benchmark: roiData.benchmark[index],
                            riskAdjusted: roiData.riskAdjusted[index],
                            label: roiData.labels[index]
                          })}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      </g>
                    );
                  })}
                </>
              )}

              {/* Comparison View */}
              {selectedView === 'comparison' && Object.entries(categoryPaths).map(([category, path], categoryIndex) => {
                const colors = ['#3b82f6', '#10b981', '#f59e0b'];
                return (
                  <polyline
                    key={category}
                    points={path}
                    fill="none"
                    stroke={colors[categoryIndex]}
                    strokeWidth="2"
                  />
                );
              })}

              {/* Risk View */}
              {selectedView === 'risk' && riskBars.map((bar, index) => (
                <g key={index}>
                  {/* Volatility bars */}
                  <rect
                    x={bar.x}
                    y={bar.volatilityY}
                    width={bar.width / 2 - 2}
                    height={bar.volatilityHeight}
                    fill="#ef4444"
                    className="cursor-pointer hover:opacity-80"
                    onMouseEnter={() => setHoveredPoint({ 
                      index, 
                      volatility: bar.volatility,
                      sharpeRatio: bar.sharpeRatio,
                      label: bar.label,
                      type: 'risk'
                    })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  
                  {/* Sharpe Ratio bars */}
                  <rect
                    x={bar.x + bar.width / 2 + 2}
                    y={bar.sharpeY}
                    width={bar.width / 2 - 2}
                    height={bar.sharpeHeight}
                    fill="#10b981"
                    className="cursor-pointer hover:opacity-80"
                    onMouseEnter={() => setHoveredPoint({ 
                      index, 
                      volatility: bar.volatility,
                      sharpeRatio: bar.sharpeRatio,
                      label: bar.label,
                      type: 'risk'
                    })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              ))}

              {/* X-axis labels */}
              {roiData && roiData.labels.map((label, index) => {
                const x = padding + (index * (chartWidth / (roiData.labels.length - 1)));
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
                     left: `${(hoveredPoint.index / (roiData.labels.length - 1)) * 100}%`,
                     top: '20px',
                     transform: 'translateX(-50%)'
                   }}>
                <div className="font-medium">{hoveredPoint.label}</div>
                {hoveredPoint.type === 'risk' ? (
                  <>
                    <div className="text-red-400">Volatility: {hoveredPoint.volatility.toFixed(2)}</div>
                    <div className="text-green-400">Sharpe Ratio: {formatRatio(hoveredPoint.sharpeRatio)}</div>
                  </>
                ) : (
                  <>
                    <div>Portfolio ROI: {formatPercentage(hoveredPoint.portfolio)}</div>
                    <div className="text-gray-400">Benchmark: {formatPercentage(hoveredPoint.benchmark)}</div>
                    <div className="text-green-400">Risk-Adjusted: {formatPercentage(hoveredPoint.riskAdjusted)}</div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            {selectedView === 'performance' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-gray-600">Portfolio ROI</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-gray-600">Risk-Adjusted</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #9ca3af 2px, #9ca3af 4px)' }}></div>
                  <span className="text-gray-600">Benchmark</span>
                </div>
              </>
            )}
            
            {selectedView === 'comparison' && roiData.categories && Object.keys(roiData.categories).map((category, index) => {
              const colors = ['#3b82f6', '#10b981', '#f59e0b'];
              return (
                <div key={category} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: colors[index] }}></div>
                  <span className="text-gray-600">{category}</span>
                </div>
              );
            })}
            
            {selectedView === 'risk' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Volatility</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-gray-600">Sharpe Ratio</span>
                </div>
              </>
            )}
          </div>

          {/* Summary Stats */}
          {roiData && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPercentage(roiData.portfolioROI[roiData.portfolioROI.length - 1])}
                </div>
                <div className="text-sm text-gray-500">Current ROI</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatPercentage(
                    roiData.portfolioROI[roiData.portfolioROI.length - 1] - 
                    roiData.benchmark[roiData.benchmark.length - 1]
                  )}
                </div>
                <div className="text-sm text-gray-500">vs Benchmark</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatRatio(roiData.sharpeRatio[roiData.sharpeRatio.length - 1])}
                </div>
                <div className="text-sm text-gray-500">Sharpe Ratio</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ROIAnalyticsChart;