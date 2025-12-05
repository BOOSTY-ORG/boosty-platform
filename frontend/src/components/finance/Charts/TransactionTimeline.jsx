import React, { useState, useEffect, useRef } from 'react';
import { Download, Clock, TrendingUp, Calendar, Filter } from 'lucide-react';
import { paymentsAPI } from '../../../api/payments.js';

/**
 * TransactionTimeline - Transaction timeline chart with time-series data
 * 
 * Displays time-series visualization of transaction volumes and amounts with
 * interactive tooltips, filtering, and export functionality.
 */
const TransactionTimeline = ({ 
  dateRange,
  className = '',
  height = 300,
  showExport = true,
  showFilters = true,
  onTransactionChange,
  onError
}) => {
  const [transactionData, setTransactionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('volume'); // 'volume' or 'amount'
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const svgRef = useRef(null);

  // Fetch transaction timeline data from API
  const fetchTransactionData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Mock data for now - in real implementation, this would call the API
      // const response = await paymentsAPI.getTransactionTimeline({ 
      //   dateRange, 
      //   period: selectedPeriod 
      // });
      
      // Mock data based on period
      const mockData = {
        daily: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          volume: [45, 52, 38, 65, 72, 48, 35],
          amount: [125000, 145000, 98000, 195000, 225000, 142000, 95000],
          successful: [42, 49, 35, 61, 68, 45, 33],
          failed: [3, 3, 3, 4, 4, 3, 2]
        },
        weekly: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
          volume: [285, 320, 295, 340],
          amount: [890000, 1020000, 945000, 1150000],
          successful: [270, 305, 280, 322],
          failed: [15, 15, 15, 18]
        },
        monthly: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          volume: [1250, 1380, 1420, 1550, 1680, 1720, 1850, 1920, 2050, 2180, 2250, 2380],
          amount: [3800000, 4200000, 4350000, 4750000, 5150000, 5280000, 5680000, 5900000, 6280000, 6680000, 6900000, 7320000],
          successful: [1188, 1311, 1349, 1473, 1596, 1634, 1758, 1824, 1948, 2071, 2138, 2261],
          failed: [62, 69, 71, 77, 84, 86, 92, 96, 102, 109, 112, 119]
        }
      };

      const data = mockData[selectedPeriod] || mockData.daily;
      setTransactionData(data);
      
      if (onTransactionChange) {
        onTransactionChange(data);
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch transaction timeline data';
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
    fetchTransactionData();
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

  // Format number with commas
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-NG').format(num);
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
      link.download = `transaction-timeline-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // Calculate chart dimensions
  const getChartDimensions = () => {
    if (!transactionData) return { width: 800, height, padding: 40 };
    
    const width = 800;
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    return { width, height, padding, chartWidth, chartHeight };
  };

  // Generate chart paths
  const generateChartPaths = () => {
    if (!transactionData) return { volume: '', amount: '', successful: '', failed: '' };
    
    const { chartWidth, chartHeight, padding } = getChartDimensions();
    const xStep = chartWidth / (transactionData.labels.length - 1);
    
    const maxVolume = Math.max(...transactionData.volume);
    const maxAmount = Math.max(...transactionData.amount);
    const maxSuccessful = Math.max(...transactionData.successful);
    const maxFailed = Math.max(...transactionData.failed);
    
    return {
      volume: transactionData.volume.map((value, index) => {
        const x = padding + (index * xStep);
        const y = padding + chartHeight - ((value / maxVolume) * chartHeight);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' '),
      amount: transactionData.amount.map((value, index) => {
        const x = padding + (index * xStep);
        const y = padding + chartHeight - ((value / maxAmount) * chartHeight);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' '),
      successful: transactionData.successful.map((value, index) => {
        const x = padding + (index * xStep);
        const y = padding + chartHeight - ((value / maxSuccessful) * chartHeight);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' '),
      failed: transactionData.failed.map((value, index) => {
        const x = padding + (index * xStep);
        const y = padding + chartHeight - ((value / maxFailed) * chartHeight);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')
    };
  };

  // Generate bar positions
  const generateBars = () => {
    if (!transactionData) return [];
    
    const { chartWidth, chartHeight, padding } = getChartDimensions();
    const maxValue = selectedMetric === 'volume' 
      ? Math.max(...transactionData.volume)
      : Math.max(...transactionData.amount);
    const barWidth = chartWidth / (transactionData.labels.length * 1.5);
    const xStep = chartWidth / transactionData.labels.length;
    
    return transactionData[selectedMetric].map((value, index) => ({
      x: padding + (index * xStep) + (barWidth / 4),
      y: padding + chartHeight - ((value / maxValue) * chartHeight),
      width: barWidth,
      height: ((value / maxValue) * chartHeight),
      value,
      label: transactionData.labels[index],
      successful: transactionData.successful[index],
      failed: transactionData.failed[index]
    }));
  };

  // Loading state
  if (loading && !transactionData) {
    return (
      <div className={`transaction-timeline ${className}`}>
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
  if (error && !transactionData) {
    return (
      <div className={`transaction-timeline ${className}`}>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">Failed to load transaction timeline</div>
            <div className="text-sm text-red-500 mb-4">{error}</div>
            <button
              onClick={fetchTransactionData}
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
  const maxValue = transactionData ? Math.max(
    ...transactionData[selectedMetric === 'volume' ? 'volume' : 'amount']
  ) : 0;

  return (
    <div className={`transaction-timeline ${className}`}>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Transaction Timeline</h3>
              <p className="text-sm text-gray-500">Time-series visualization of transaction volumes and amounts</p>
            </div>
            
            <div className="flex items-center gap-2">
              {showFilters && (
                <>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setSelectedMetric('volume')}
                      className={`px-3 py-1 text-sm rounded ${selectedMetric === 'volume' ? 'bg-white shadow' : ''}`}
                    >
                      Volume
                    </button>
                    <button
                      onClick={() => setSelectedMetric('amount')}
                      className={`px-3 py-1 text-sm rounded ${selectedMetric === 'amount' ? 'bg-white shadow' : ''}`}
                    >
                      Amount
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
                    {selectedMetric === 'volume' 
                      ? formatNumber(maxValue * (1 - percent / 100))
                      : formatCurrency(maxValue * (1 - percent / 100))
                    }
                  </text>
                </g>
              ))}

              {/* Chart lines */}
              {selectedMetric === 'volume' && (
                <>
                  <polyline
                    points={paths.successful}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                  <polyline
                    points={paths.failed}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                  />
                </>
              )}

              {/* Main metric line */}
              <polyline
                points={selectedMetric === 'volume' ? paths.volume : paths.amount}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
              />

              {/* Data points */}
              {transactionData[selectedMetric].map((value, index) => {
                const x = padding + (index * (chartWidth / (transactionData.labels.length - 1)));
                const maxValue = selectedMetric === 'volume' 
                  ? Math.max(...transactionData.volume)
                  : Math.max(...transactionData.amount);
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
                        value, 
                        label: transactionData.labels[index],
                        successful: transactionData.successful[index],
                        failed: transactionData.failed[index]
                      })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                );
              })}

              {/* X-axis labels */}
              {transactionData && transactionData.labels.map((label, index) => {
                const x = padding + (index * (chartWidth / (transactionData.labels.length - 1)));
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
                     left: `${(hoveredPoint.index / (transactionData.labels.length - 1)) * 100}%`,
                     top: '20px',
                     transform: 'translateX(-50%)'
                   }}>
                <div className="font-medium">{hoveredPoint.label}</div>
                <div>{selectedMetric === 'volume' ? 'Volume' : 'Amount'}: {
                  selectedMetric === 'volume' 
                    ? formatNumber(hoveredPoint.value)
                    : formatCurrency(hoveredPoint.value)
                }</div>
                {selectedMetric === 'volume' && (
                  <>
                    <div className="text-green-400">Successful: {formatNumber(hoveredPoint.successful)}</div>
                    <div className="text-red-400">Failed: {formatNumber(hoveredPoint.failed)}</div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600">
                {selectedMetric === 'volume' ? 'Total Volume' : 'Total Amount'}
              </span>
            </div>
            {selectedMetric === 'volume' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-gray-600">Successful</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Failed</span>
                </div>
              </>
            )}
          </div>

          {/* Summary Stats */}
          {transactionData && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {selectedMetric === 'volume' 
                    ? formatNumber(transactionData[selectedMetric][transactionData[selectedMetric].length - 1])
                    : formatCurrency(transactionData[selectedMetric][transactionData[selectedMetric].length - 1])
                  }
                </div>
                <div className="text-sm text-gray-500">Current Period</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(transactionData.successful.reduce((a, b) => a + b, 0))}
                </div>
                <div className="text-sm text-gray-500">Total Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {formatNumber(transactionData.failed.reduce((a, b) => a + b, 0))}
                </div>
                <div className="text-sm text-gray-500">Total Failed</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionTimeline;