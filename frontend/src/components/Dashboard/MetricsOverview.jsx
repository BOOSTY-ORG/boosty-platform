import React, { useState, useEffect } from 'react';
import { metricsApi } from '../../services/metricsApi';
import './MetricsOverview.css';

/**
 * MetricsOverview Component
 * Displays comprehensive dashboard metrics with real-time updates
 */
const MetricsOverview = ({ dateRange = 'last_30_days', region = 'all' }) => {
  const [data, setData] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(dateRange);
  const [selectedRegion, setSelectedRegion] = useState(region);

  // Fetch dashboard overview data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [overviewResponse, realtimeResponse] = await Promise.all([
        metricsApi.getDashboardOverview({
          dateRange: selectedTimeRange,
          region: selectedRegion
        }),
        metricsApi.getRealtimeMetrics()
      ]);
      
      setData(overviewResponse.data);
      setRealtimeData(realtimeResponse.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh realtime data every 30 seconds
  useEffect(() => {
    fetchDashboardData();
    
    const interval = setInterval(() => {
      metricsApi.getRealtimeMetrics()
        .then(response => setRealtimeData(response.data))
        .catch(err => console.error('Failed to refresh realtime data:', err));
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedTimeRange, selectedRegion]);

  // Format numbers with commas
  const formatNumber = (num) => {
    return num ? num.toLocaleString() : '0';
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₦${formatNumber(amount)}`;
  };

  // Get trend icon
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  };

  // Get trend class
  const getTrendClass = (trend) => {
    switch (trend) {
      case 'up': return 'trend-up';
      case 'down': return 'trend-down';
      default: return 'trend-stable';
    }
  };

  if (loading && !data) {
    return (
      <div className="metrics-overview loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="metrics-overview error">
        <div className="error-message">
          <h3>Error Loading Dashboard</h3>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="metrics-overview empty">
        <p>No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="metrics-overview">
      {/* Filters */}
      <div className="metrics-filters">
        <div className="filter-group">
          <label htmlFor="timeRange">Time Range:</label>
          <select
            id="timeRange"
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="filter-select"
          >
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="last_90_days">Last 90 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="region">Region:</label>
          <select
            id="region"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Regions</option>
            <option value="Lagos">Lagos</option>
            <option value="Abuja">Abuja</option>
            <option value="Port Harcourt">Port Harcourt</option>
            <option value="Others">Others</option>
          </select>
        </div>
      </div>

      {/* Real-time Status */}
      {realtimeData && (
        <div className="realtime-status">
          <h3>System Status</h3>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Active Users</span>
              <span className="status-value">{formatNumber(realtimeData.activeUsers)}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Online Investors</span>
              <span className="status-value">{formatNumber(realtimeData.onlineInvestors)}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Pending Transactions</span>
              <span className="status-value">{formatNumber(realtimeData.pendingTransactions)}</span>
            </div>
            <div className="status-item">
              <span className="status-label">System Status</span>
              <span className={`status-value system-status ${realtimeData.systemStatus}`}>
                {realtimeData.systemStatus}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="summary-metrics">
        <h2>Overview Summary</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <h3>Total Users</h3>
            <p className="metric-value">{formatNumber(data.summary.totalUsers)}</p>
            <div className="metric-growth">
              <span className={`trend ${getTrendClass(data.growth.userGrowth.trend)}`}>
                {getTrendIcon(data.growth.userGrowth.trend)}
              </span>
              <span>{data.growth.userGrowth.percentage}%</span>
            </div>
          </div>

          <div className="metric-card">
            <h3>Active Investors</h3>
            <p className="metric-value">{formatNumber(data.summary.activeInvestors)}</p>
            <div className="metric-subtitle">
              of {formatNumber(data.summary.totalInvestors)} total
            </div>
          </div>

          <div className="metric-card">
            <h3>Total Investments</h3>
            <p className="metric-value">{formatCurrency(data.summary.totalInvestments)}</p>
            <div className="metric-growth">
              <span className={`trend ${getTrendClass(data.growth.investmentGrowth.trend)}`}>
                {getTrendIcon(data.growth.investmentGrowth.trend)}
              </span>
              <span>{data.growth.investmentGrowth.percentage}%</span>
            </div>
          </div>

          <div className="metric-card">
            <h3>Total Revenue</h3>
            <p className="metric-value">{formatCurrency(data.summary.totalRevenue)}</p>
            <div className="metric-growth">
              <span className={`trend ${getTrendClass(data.growth.revenueGrowth.trend)}`}>
                {getTrendIcon(data.growth.revenueGrowth.trend)}
              </span>
              <span>{data.growth.revenueGrowth.percentage}%</span>
            </div>
          </div>

          <div className="metric-card">
            <h3>Applications</h3>
            <p className="metric-value">{formatNumber(data.summary.totalApplications)}</p>
            <div className="metric-subtitle">
              {formatNumber(data.summary.pendingApplications)} pending
            </div>
          </div>

          <div className="metric-card">
            <h3>Installed Systems</h3>
            <p className="metric-value">{formatNumber(data.summary.installedSystems)}</p>
            <div className="metric-subtitle">
              {data.performance.installationCompletionRate}% completion rate
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="performance-metrics">
        <h2>Performance Indicators</h2>
        <div className="performance-grid">
          <div className="performance-item">
            <span className="performance-label">KYC Approval Rate</span>
            <div className="performance-bar">
              <div 
                className="performance-fill" 
                style={{ width: `${data.performance.kycApprovalRate}%` }}
              ></div>
            </div>
            <span className="performance-value">{data.performance.kycApprovalRate}%</span>
          </div>

          <div className="performance-item">
            <span className="performance-label">Application Approval Rate</span>
            <div className="performance-bar">
              <div 
                className="performance-fill" 
                style={{ width: `${data.performance.applicationApprovalRate}%` }}
              ></div>
            </div>
            <span className="performance-value">{data.performance.applicationApprovalRate}%</span>
          </div>

          <div className="performance-item">
            <span className="performance-label">Installation Completion Rate</span>
            <div className="performance-bar">
              <div 
                className="performance-fill" 
                style={{ width: `${data.performance.installationCompletionRate}%` }}
              ></div>
            </div>
            <span className="performance-value">{data.performance.installationCompletionRate}%</span>
          </div>

          <div className="performance-item">
            <span className="performance-label">Repayment Rate</span>
            <div className="performance-bar">
              <div 
                className="performance-fill" 
                style={{ width: `${data.performance.repaymentRate}%` }}
              ></div>
            </div>
            <span className="performance-value">{data.performance.repaymentRate}%</span>
          </div>

          <div className="performance-item">
            <span className="performance-label">Customer Satisfaction</span>
            <div className="performance-bar">
              <div 
                className="performance-fill" 
                style={{ width: `${(data.performance.customerSatisfactionScore / 5) * 100}%` }}
              ></div>
            </div>
            <span className="performance-value">{data.performance.customerSatisfactionScore}/5.0</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h2>Today's Activity</h2>
        <div className="activity-grid">
          <div className="activity-item">
            <span className="activity-label">New Users</span>
            <span className="activity-value">{formatNumber(data.recentActivity.newUsersToday)}</span>
          </div>
          <div className="activity-item">
            <span className="activity-label">New Applications</span>
            <span className="activity-value">{formatNumber(data.recentActivity.newApplicationsToday)}</span>
          </div>
          <div className="activity-item">
            <span className="activity-label">New Investments</span>
            <span className="activity-value">{formatNumber(data.recentActivity.newInvestmentsToday)}</span>
          </div>
          <div className="activity-item">
            <span className="activity-label">Completed Installations</span>
            <span className="activity-value">{formatNumber(data.recentActivity.completedInstallationsToday)}</span>
          </div>
          <div className="activity-item">
            <span className="activity-label">Repayments Processed</span>
            <span className="activity-value">{formatNumber(data.recentActivity.repaymentsProcessedToday)}</span>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="last-updated">
        <small>
          Last updated: {new Date().toLocaleString()}
          {loading && <span className="updating-indicator"> (updating...)</span>}
        </small>
      </div>
    </div>
  );
};

export default MetricsOverview;