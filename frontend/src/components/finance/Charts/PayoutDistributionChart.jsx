import React, { useState, useEffect, useRef } from 'react';
import { Download, PieChart, BarChart3, TrendingUp, Filter } from 'lucide-react';

/**
 * PayoutDistributionChart - Payout distribution chart with breakdowns
 * 
 * Displays breakdown of payouts by type and status with interactive tooltips,
 * filtering options, and export functionality.
 */
const PayoutDistributionChart = ({ 
  dateRange,
  className = '',
  height = 300,
  showExport = true,
  showFilters = true,
  onPayoutChange,
  onError
}) => {
  const [payoutData, setPayoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState('distribution'); // 'distribution', 'trends', 'status'
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const svgRef = useRef(null);

  // Fetch payout distribution data from API
  const fetchPayoutData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Mock data for now - in real implementation, this would call the API
      // const response = await api.get('/api/payout-analytics/analytics', { 
      //   dateRange, 
      //   period: selectedPeriod 
      // });
      
      // Mock data based on period
      const mockData = {
        monthly: {
          distribution: {
            labels: ['Solar Bonds', 'Green Energy', 'Infrastructure', 'Micro Loans', 'Commercial'],
            values: [350000, 280000, 220000, 150000, 180000],
            percentages: [32.1, 25.7, 20.2, 13.8, 16.5]
          },
          status: {
            labels: ['Completed', 'Pending', 'Processing', 'Failed', 'Cancelled'],
            values: [850000, 120000, 80000, 25000, 10000],
            percentages: [75.2, 10.6, 7.1, 2.2, 0.9]
          },
          trends: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            completed: [65000, 68000, 72000, 71000, 75000, 78000, 82000, 85000, 88000, 92000, 95000, 98000],
            pending: [8000, 9000, 10000, 9500, 11000, 10500, 12000, 11500, 13000, 12500, 14000, 13500],
            processing: [5000, 5500, 6000, 6500, 7000, 6800, 7500, 7200, 8000, 7800, 8500, 8200],
            failed: [2000, 1800, 2200, 2100, 2500, 2300, 2800, 2600, 3000, 2800, 3200, 3000]
          }
        },
        quarterly: {
          distribution: {
            labels: ['Solar Bonds', 'Green Energy', 'Infrastructure', 'Micro Loans', 'Commercial'],
            values: [1050000, 840000, 660000, 450000, 540000],
            percentages: [32.1, 25.7, 20.2, 13.8, 16.5]
          },
          status: {
            labels: ['Completed', 'Pending', 'Processing', 'Failed', 'Cancelled'],
            values: [2550000, 360000, 240000, 75000, 30000],
            percentages: [75.2, 10.6, 7.1, 2.2, 0.9]
          },
          trends: {
            labels: ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023', 'Q1 2024', 'Q2 2024'],
            completed: [205000, 218000, 235000, 250000, 265000, 285000],
            pending: [27000, 30500, 33500, 36500, 37500, 40000],
            processing: [16500, 20300, 22300, 25300, 25900, 26700],
            failed: [6000, 6400, 7800, 8300, 8800, 9200]
          }
        },
        yearly: {
          distribution: {
            labels: ['Solar Bonds', 'Green Energy', 'Infrastructure', 'Micro Loans', 'Commercial'],
            values: [4200000, 3360000, 2640000, 1800000, 2160000],
            percentages: [32.1, 25.7, 20.2, 13.8, 16.5]
          },
          status: {
            labels: ['Completed', 'Pending', 'Processing', 'Failed', 'Cancelled'],
            values: [10200000, 1440000, 960000, 300000, 120000],
            percentages: [75.2, 10.6, 7.1, 2.2, 0.9]
          },
          trends: {
            labels: ['2020', '2021', '2022', '2023', '2024'],
            completed: [680000, 820000, 950000, 1080000, 1250000],
            pending: [85000, 98000, 115000, 138000, 155000],
            processing: [55000, 68000, 78000, 95000, 108000],
            failed: [20000, 24000, 31000, 35000, 38000]
          }
        }
      };

      const data = mockData[selectedPeriod] || mockData.monthly;
      setPayoutData(data);
      
      if (onPayoutChange) {
        onPayoutChange(data);
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch payout distribution data';
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
    fetchPayoutData();
  }, [dateRange, selectedPeriod]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(1)}%`;
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
      link.download = `payout-distribution-${selectedView}-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // Generate pie chart segments
  const generatePieSegments = () => {
    if (!payoutData || !payoutData.distribution) return [];
    
    const { distribution } = payoutData;
    const total = distribution.values.reduce((sum, value) => sum + value, 0);
    let currentAngle = -90; // Start from top
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    return distribution.labels.map((label, index) => {
      const value = distribution.values[index];
      const percentage = (value / total) * 100;
      const angle = (value / total) * 360;
      
      const segment = {
        label,
        value,
        percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: colors[index % colors.length]
      };
      
      currentAngle += angle;
      return segment;
    });
  };

  // Generate pie chart path
  const generatePiePath = (segment, centerX, centerY, radius) => {
    const startAngle = (segment.startAngle * Math.PI) / 180;
    const endAngle = (segment.endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    const largeArcFlag = segment.endAngle - segment.startAngle > 180 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  // Generate status bars
  const generateStatusBars = () => {
    if (!payoutData || !payoutData.status) return [];
    
    const { status } = payoutData;
    const maxValue = Math.max(...status.values);
    const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#6b7280'];
    
    return status.labels.map((label, index) => ({
      label,
      value: status.values[index],
      percentage: status.percentages[index],
      color: colors[index],
      width: (status.values[index] / maxValue) * 100
    }));
  };

  // Generate trend lines
  const generateTrendPaths = () => {
    if (!payoutData || !payoutData.trends) return {};
    
    const { trends } = payoutData;
    const paths = {};
    
    Object.entries(trends).forEach(([key, values]) => {
      if (key === 'labels') return;
      
      const maxValue = Math.max(...Object.values(trends).flat().filter(v => typeof v === 'number'));
      const xStep = 600 / (trends.labels.length - 1);
      
      paths[key] = values.map((value, index) => {
        const x = 100 + (index * xStep);
        const y = 250 - ((value / maxValue) * 180);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    });
    
    return paths;
  };

  // Loading state
  if (loading && !payoutData) {
    return (
      <div className={`payout-distribution-chart ${className}`}>
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
  if (error && !payoutData) {
    return (
      <div className={`payout-distribution-chart ${className}`}>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">Failed to load payout distribution</div>
            <div className="text-sm text-red-500 mb-4">{error}</div>
            <button
              onClick={fetchPayoutData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pieSegments = generatePieSegments();
  const statusBars = generateStatusBars();
  const trendPaths = generateTrendPaths();

  return (
    <div className={`payout-distribution-chart ${className}`}>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Payout Distribution</h3>
              <p className="text-sm text-gray-500">Breakdown of payouts by type and status</p>
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
                      onClick={() => setSelectedView('distribution')}
                      className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${selectedView === 'distribution' ? 'bg-white shadow' : ''}`}
                    >
                      <PieChart className="w-3 h-3" />
                      Distribution
                    </button>
                    <button
                      onClick={() => setSelectedView('status')}
                      className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${selectedView === 'status' ? 'bg-white shadow' : ''}`}
                    >
                      <BarChart3 className="w-3 h-3" />
                      Status
                    </button>
                    <button
                      onClick={() => setSelectedView('trends')}
                      className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${selectedView === 'trends' ? 'bg-white shadow' : ''}`}
                    >
                      <TrendingUp className="w-3 h-3" />
                      Trends
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
              width="800"
              height={height}
              className="w-full"
              viewBox="0 0 800 300"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Distribution View - Pie Chart */}
              {selectedView === 'distribution' && (
                <g>
                  {pieSegments.map((segment, index) => (
                    <g key={index}>
                      <path
                        d={generatePiePath(segment, 200, 150, 80)}
                        fill={segment.color}
                        className="cursor-pointer hover:opacity-80"
                        onMouseEnter={() => setHoveredSegment(segment)}
                        onMouseLeave={() => setHoveredSegment(null)}
                      />
                    </g>
                  ))}
                  
                  {/* Legend */}
                  {pieSegments.map((segment, index) => (
                    <g key={index}>
                      <rect
                        x={350}
                        y={50 + (index * 25)}
                        width="15"
                        height="15"
                        fill={segment.color}
                      />
                      <text
                        x={375}
                        y={62 + (index * 25)}
                        className="text-sm fill-gray-700"
                      >
                        {segment.label}: {formatPercentage(segment.percentage)}
                      </text>
                    </g>
                  ))}
                </g>
              )}

              {/* Status View - Horizontal Bars */}
              {selectedView === 'status' && (
                <g>
                  {statusBars.map((bar, index) => (
                    <g key={index}>
                      <rect
                        x={150}
                        y={50 + (index * 40)}
                        width={bar.width * 4}
                        height="30"
                        fill={bar.color}
                        className="cursor-pointer hover:opacity-80"
                        onMouseEnter={() => setHoveredSegment(bar)}
                        onMouseLeave={() => setHoveredSegment(null)}
                      />
                      <text
                        x={140}
                        y={70 + (index * 40)}
                        textAnchor="end"
                        className="text-sm fill-gray-700"
                      >
                        {bar.label}
                      </text>
                      <text
                        x={160 + (bar.width * 4)}
                        y={70 + (index * 40)}
                        className="text-sm fill-gray-700"
                      >
                        {formatPercentage(bar.percentage)}
                      </text>
                    </g>
                  ))}
                </g>
              )}

              {/* Trends View - Line Chart */}
              {selectedView === 'trends' && (
                <g>
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map((percent) => (
                    <g key={percent}>
                      <line
                        x1={100}
                        y1={70 + (180 * percent / 100)}
                        x2={700}
                        y2={70 + (180 * percent / 100)}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                    </g>
                  ))}
                  
                  {/* Trend lines */}
                  <polyline
                    points={trendPaths.completed}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                  />
                  <polyline
                    points={trendPaths.pending}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                  <polyline
                    points={trendPaths.processing}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                  <polyline
                    points={trendPaths.failed}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                  />
                  
                  {/* X-axis labels */}
                  {payoutData.trends.labels.map((label, index) => {
                    const x = 100 + (index * (600 / (payoutData.trends.labels.length - 1)));
                    return (
                      <text
                        key={index}
                        x={x}
                        y={270}
                        textAnchor="middle"
                        className="text-xs fill-gray-600"
                      >
                        {label}
                      </text>
                    );
                  })}
                </g>
              )}
            </svg>

            {/* Tooltip */}
            {hoveredSegment && (
              <div className="absolute z-10 bg-gray-900 text-white p-3 rounded shadow-lg text-sm"
                   style={{
                     left: selectedView === 'distribution' ? '50%' : '20%',
                     top: '20px',
                     transform: 'translateX(-50%)'
                   }}>
                <div className="font-medium">{hoveredSegment.label}</div>
                <div>Amount: {formatCurrency(hoveredSegment.value)}</div>
                <div>Percentage: {formatPercentage(hoveredSegment.percentage)}</div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            {selectedView === 'trends' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-gray-600">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span className="text-gray-600">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-gray-600">Processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Failed</span>
                </div>
              </>
            )}
          </div>

          {/* Summary Stats */}
          {payoutData && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    selectedView === 'distribution' 
                      ? payoutData.distribution.values.reduce((a, b) => a + b, 0)
                      : selectedView === 'status'
                      ? payoutData.status.values.reduce((a, b) => a + b, 0)
                      : payoutData.trends.completed[payoutData.trends.completed.length - 1]
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedView === 'distribution' ? 'Total Distribution' : 
                   selectedView === 'status' ? 'Total Payouts' : 'Latest Completed'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatPercentage(
                    selectedView === 'distribution' 
                      ? payoutData.distribution.percentages[0]
                      : selectedView === 'status'
                      ? payoutData.status.percentages[0]
                      : 75.2
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedView === 'distribution' ? 'Largest Segment' : 
                   selectedView === 'status' ? 'Success Rate' : 'Completion Rate'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedView === 'distribution' ? payoutData.distribution.labels.length :
                   selectedView === 'status' ? payoutData.status.labels.length :
                   payoutData.trends.labels.length}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedView === 'distribution' ? 'Categories' : 
                   selectedView === 'status' ? 'Status Types' : 'Periods'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayoutDistributionChart;