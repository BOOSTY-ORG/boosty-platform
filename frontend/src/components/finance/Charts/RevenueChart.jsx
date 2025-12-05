import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { Download, TrendingUp, Calendar, Filter } from 'lucide-react';
import { dashboardAPI } from '../../../api/dashboard.js';
import { withPerformanceTracking } from '../../../utils/performance.js';
import { withErrorHandling, retryWithBackoff } from '../../../utils/errorHandling.js';
import { ariaLabels, screenReader } from '../../../utils/accessibility.js';
import { reducedMotion } from '../../../utils/accessibility.js';

/**
 * RevenueChart - Revenue trend chart with line and bar visualizations
 * 
 * Displays monthly revenue trends with growth indicators, supporting both
 * line and bar chart visualizations with interactive tooltips and export functionality.
 */
const RevenueChart = memo(({
  dateRange,
  className = '',
  height = 300,
  showExport = true,
  showFilters = true,
  onRevenueChange,
  onError
}) => {
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('line'); // 'line' or 'bar'
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const svgRef = useRef(null);

  // Fetch revenue data from API with error handling and retry
  const fetchRevenueData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Mock data for now - in real implementation, this would call the API
      // const response = await withErrorHandling(
      //   retryWithBackoff(() => dashboardAPI.getRevenueAnalytics({
      //     dateRange,
      //     period: selectedPeriod
      //   }), 3),
      //   { component: 'RevenueChart', action: 'fetchRevenueData' }
      // );
      
      // Mock data based on period
      const mockData = {
        monthly: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          revenue: [45000, 52000, 48000, 61000, 58000, 67000, 72000, 69000, 75000, 82000, 79000, 85000],
          growth: [null, 15.6, -7.7, 27.1, -4.9, 15.5, 7.5, -4.2, 8.7, 9.3, -3.7, 7.6],
          targets: [50000, 50000, 55000, 55000, 60000, 60000, 65000, 65000, 70000, 70000, 75000, 75000]
        },
        quarterly: {
          labels: ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023', 'Q1 2024', 'Q2 2024'],
          revenue: [145000, 186000, 216000, 236000, 267000, 298000],
          growth: [null, 28.3, 16.1, 9.3, 13.1, 11.6],
          targets: [150000, 180000, 210000, 230000, 260000, 290000]
        },
        yearly: {
          labels: ['2020', '2021', '2022', '2023', '2024'],
          revenue: [420000, 580000, 720000, 783000, 945000],
          growth: [null, 38.1, 24.1, 8.8, 20.7],
          targets: [450000, 600000, 750000, 800000, 900000]
        }
      };

      const data = mockData[selectedPeriod] || mockData.monthly;
      setRevenueData(data);
      
      // Announce to screen readers
      const chartDescription = screenReader.createChartDescription({
        labels: data.labels,
        values: data.revenue,
        summary: `Revenue data for ${selectedPeriod} period`
      });
      screenReader.announce(chartDescription);
      
      if (onRevenueChange) {
        onRevenueChange(data);
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch revenue data';
      setError(errorMessage);
      
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, onRevenueChange, onError]);

  // Initial data fetch
  useEffect(() => {
    fetchRevenueData();
  }, [dateRange, selectedPeriod]);

  // Format currency - memoized
  const formatCurrency = useMemo(() => {
    return (amount) => {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };
  }, []);

  // Format percentage - memoized
  const formatPercentage = useMemo(() => {
    return (value) => {
      if (value === null || value === undefined) return '-';
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    };
  }, []);

  // Get growth color - memoized
  const getGrowthColor = useMemo(() => {
    return (value) => {
      if (value === null || value === undefined) return 'text-gray-500';
      return value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600';
    };
  }, []);

  // Export chart as image
  const exportChart = useCallback(() => {
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
      link.download = `revenue-chart-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      // Announce to screen readers
      screenReader.announce('Chart exported successfully');
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  }, [selectedPeriod]);

  // Calculate chart dimensions - memoized
  const chartDimensions = useMemo(() => {
    if (!revenueData) return { width: 800, height, padding: 40 };
    
    const width = 800;
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    return { width, height, padding, chartWidth, chartHeight };
  }, [revenueData, height]);

  // Generate chart path for line chart - memoized
  const linePath = useMemo(() => {
    if (!revenueData) return '';
    
    const { chartWidth, chartHeight, padding } = chartDimensions;
    const maxValue = Math.max(...revenueData.revenue, ...revenueData.targets);
    const xStep = chartWidth / (revenueData.labels.length - 1);
    
    return revenueData.revenue.map((value, index) => {
      const x = padding + (index * xStep);
      const y = padding + chartHeight - ((value / maxValue) * chartHeight);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [revenueData, chartDimensions]);

  // Generate bar positions - memoized
  const bars = useMemo(() => {
    if (!revenueData) return [];
    
    const { chartWidth, chartHeight, padding } = chartDimensions;
    const maxValue = Math.max(...revenueData.revenue, ...revenueData.targets);
    const barWidth = chartWidth / (revenueData.labels.length * 2);
    const xStep = chartWidth / revenueData.labels.length;
    
    return revenueData.revenue.map((value, index) => ({
      x: padding + (index * xStep) + (barWidth / 2),
      y: padding + chartHeight - ((value / maxValue) * chartHeight),
      width: barWidth,
      height: ((value / maxValue) * chartHeight),
      value,
      label: revenueData.labels[index],
      growth: revenueData.growth[index]
    }));
  }, [revenueData, chartDimensions]);

  // Loading state
  if (loading && !revenueData) {
    return (
      <div className={`revenue-chart ${className}`}>
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
  if (error && !revenueData) {
    return (
      <div className={`revenue-chart ${className}`}>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">Failed to load revenue data</div>
            <div className="text-sm text-red-500 mb-4">{error}</div>
            <button
              onClick={fetchRevenueData}
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
  const maxValue = revenueData ? Math.max(...revenueData.revenue, ...revenueData.targets) : 0;

  return (
    <div className={`revenue-chart ${className}`}>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
              <p className="text-sm text-gray-500">Monthly revenue with growth indicators</p>
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
                      onClick={() => setChartType('line')}
                      className={`px-3 py-1 text-sm rounded ${chartType === 'line' ? 'bg-white shadow' : ''}`}
                    >
                      Line
                    </button>
                    <button
                      onClick={() => setChartType('bar')}
                      className={`px-3 py-1 text-sm rounded ${chartType === 'bar' ? 'bg-white shadow' : ''}`}
                    >
                      Bar
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
              width={chartDimensions.width}
              height={chartDimensions.height}
              className="w-full"
              viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={ariaLabels.chart(chartType, 'Revenue Trends', `Revenue data for ${selectedPeriod} period`)}
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
                    {formatCurrency(maxValue * (1 - percent / 100))}
                  </text>
                </g>
              ))}

              {/* Target line */}
              {revenueData && chartType === 'line' && (
                <polyline
                  points={revenueData.targets.map((value, index) => {
                    const x = padding + (index * (chartWidth / (revenueData.labels.length - 1)));
                    const y = padding + chartHeight - ((value / maxValue) * chartHeight);
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#d1d5db"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              )}

              {/* Revenue line */}
              {chartType === 'line' && revenueData && (
                <>
                  <polyline
                    points={linePath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                  />
                  {/* Data points */}
                  {revenueData.revenue.map((value, index) => {
                    const x = padding + (index * (chartWidth / (revenueData.labels.length - 1)));
                    const y = padding + chartHeight - ((value / maxValue) * chartHeight);
                    return (
                      <g key={index}>
                        <circle
                          cx={x}
                          cy={y}
                          r="5"
                          fill="#3b82f6"
                          className="cursor-pointer hover:r-7"
                          onMouseEnter={() => setHoveredPoint({ index, value, label: revenueData.labels[index] })}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      </g>
                    );
                  })}
                </>
              )}

              {/* Bars */}
              {chartType === 'bar' && bars.map((bar, index) => (
                <g key={index}>
                  <rect
                    x={bar.x}
                    y={bar.y}
                    width={bar.width}
                    height={bar.height}
                    fill="#3b82f6"
                    className="cursor-pointer hover:opacity-80"
                    onMouseEnter={() => setHoveredPoint({ index, value: bar.value, label: bar.label, growth: bar.growth })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              ))}

              {/* X-axis labels */}
              {revenueData && revenueData.labels.map((label, index) => {
                const x = padding + (index * (chartWidth / (revenueData.labels.length - 1)));
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
              <div className="absolute z-10 bg-gray-900 text-white p-2 rounded shadow-lg text-sm"
                   style={{
                     left: `${(hoveredPoint.index / (revenueData.labels.length - 1)) * 100}%`,
                     top: '20px',
                     transform: 'translateX(-50%)'
                   }}>
                <div className="font-medium">{hoveredPoint.label}</div>
                <div>{formatCurrency(hoveredPoint.value)}</div>
                {hoveredPoint.growth !== undefined && (
                  <div className={getGrowthColor(hoveredPoint.growth)}>
                    {formatPercentage(hoveredPoint.growth)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600">Revenue</span>
            </div>
            {chartType === 'line' && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-300 rounded" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #d1d5db 2px, #d1d5db 4px)' }}></div>
                <span className="text-gray-600">Target</span>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          {revenueData && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(revenueData.revenue[revenueData.revenue.length - 1])}
                </div>
                <div className="text-sm text-gray-500">Current Period</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getGrowthColor(revenueData.growth[revenueData.growth.length - 1])}`}>
                  {formatPercentage(revenueData.growth[revenueData.growth.length - 1])}
                </div>
                <div className="text-sm text-gray-500">Growth Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(revenueData.revenue.reduce((a, b) => a + b, 0))}
                </div>
                <div className="text-sm text-gray-500">Total Revenue</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default RevenueChart;