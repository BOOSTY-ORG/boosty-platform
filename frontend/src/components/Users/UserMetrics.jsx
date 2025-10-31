import React, { useState, useEffect } from 'react';
import { metricsApi } from '../../services/metricsApi';
import './UserMetrics.css';

/**
 * UserMetrics Component
 * Displays comprehensive user metrics and journey analytics
 */
const UserMetrics = ({ dateRange = 'last_30_days' }) => {
  const [overviewData, setOverviewData] = useState(null);
  const [journeyData, setJourneyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(dateRange);
  const [selectedUserType, setSelectedUserType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedPropertyType, setSelectedPropertyType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch user metrics data
  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [overviewResponse, journeyResponse] = await Promise.all([
        metricsApi.getUserMetrics({
          dateRange: selectedTimeRange,
          userType: selectedUserType !== 'all' ? [selectedUserType] : undefined,
          status: selectedStatus !== 'all' ? [selectedStatus] : undefined,
          region: selectedRegion !== 'all' ? selectedRegion : undefined,
          propertyType: selectedPropertyType !== 'all' ? [selectedPropertyType] : undefined,
          page: currentPage,
          limit: 20
        }),
        metricsApi.getUserJourneyMetrics({
          dateRange: selectedTimeRange
        })
      ]);
      
      setOverviewData(overviewResponse.data);
      setJourneyData(journeyResponse.data);
      
      if (overviewResponse.meta?.pagination) {
        setTotalPages(overviewResponse.meta.pagination.totalPages);
      }
    } catch (err) {
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [selectedTimeRange, selectedUserType, selectedStatus, selectedRegion, selectedPropertyType, currentPage]);

  // Format numbers with commas
  const formatNumber = (num) => {
    return num ? num.toLocaleString() : '0';
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₦${formatNumber(amount)}`;
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${value}%`;
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case 'timeRange':
        setSelectedTimeRange(value);
        break;
      case 'userType':
        setSelectedUserType(value);
        break;
      case 'status':
        setSelectedStatus(value);
        break;
      case 'region':
        setSelectedRegion(value);
        break;
      case 'propertyType':
        setSelectedPropertyType(value);
        break;
      default:
        break;
    }
    setCurrentPage(1); // Reset to first page when filters change
  };

  if (loading && !overviewData) {
    return (
      <div className="user-metrics loading">
        <div className="loading-spinner"></div>
        <p>Loading user metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-metrics error">
        <div className="error-message">
          <h3>Error Loading User Data</h3>
          <p>{error}</p>
          <button onClick={fetchUserData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!overviewData) {
    return (
      <div className="user-metrics empty">
        <p>No user data available</p>
      </div>
    );
  }

  return (
    <div className="user-metrics">
      {/* Filters */}
      <div className="user-filters">
        <div className="filter-group">
          <label htmlFor="timeRange">Time Range:</label>
          <select
            id="timeRange"
            value={selectedTimeRange}
            onChange={(e) => handleFilterChange('timeRange', e.target.value)}
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
          <label htmlFor="userType">User Type:</label>
          <select
            id="userType"
            value={selectedUserType}
            onChange={(e) => handleFilterChange('userType', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="applicant">Applicant</option>
            <option value="customer">Customer</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="status">Status:</label>
          <select
            id="status"
            value={selectedStatus}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="region">Region:</label>
          <select
            id="region"
            value={selectedRegion}
            onChange={(e) => handleFilterChange('region', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Regions</option>
            <option value="Lagos">Lagos</option>
            <option value="Abuja">Abuja</option>
            <option value="Port Harcourt">Port Harcourt</option>
            <option value="Others">Others</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="propertyType">Property Type:</label>
          <select
            id="propertyType"
            value={selectedPropertyType}
            onChange={(e) => handleFilterChange('propertyType', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="industrial">Industrial</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="user-summary">
        <h2>User Overview</h2>
        <div className="summary-grid">
          <div className="summary-card">
            <h3>Total Users</h3>
            <p className="summary-value">{formatNumber(overviewData.summary.totalUsers)}</p>
            <div className="summary-subtitle">
              {formatNumber(overviewData.summary.activeUsers)} active
            </div>
          </div>

          <div className="summary-card">
            <h3>New Users</h3>
            <p className="summary-value">{formatNumber(overviewData.summary.newUsers)}</p>
            <div className="summary-subtitle">
              Growth: {formatPercentage(overviewData.summary.userGrowth.percentage)}
            </div>
          </div>

          <div className="summary-card">
            <h3>Total Applications</h3>
            <p className="summary-value">{formatNumber(overviewData.applications.totalApplications)}</p>
            <div className="summary-subtitle">
              {formatNumber(overviewData.applications.approvedApplications)} approved
            </div>
          </div>

          <div className="summary-card">
            <h3>Avg Transaction Value</h3>
            <p className="summary-value">{formatCurrency(overviewData.summary.averageTransactionValue)}</p>
            <div className="summary-subtitle">
              Per transaction
            </div>
          </div>
        </div>
      </div>

      {/* User Distribution */}
      <div className="user-distribution">
        <h2>User Distribution</h2>
        <div className="distribution-grid">
          <div className="distribution-card">
            <h3>By Type</h3>
            <div className="distribution-chart">
              {Object.entries(overviewData.summary.userDistribution.byType).map(([type, count]) => (
                <div key={type} className="distribution-item">
                  <span className="distribution-label">{type}</span>
                  <div className="distribution-bar">
                    <div 
                      className="distribution-fill" 
                      style={{ 
                        width: `${(count / overviewData.summary.totalUsers) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="distribution-value">{formatNumber(count)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="distribution-card">
            <h3>By Status</h3>
            <div className="distribution-chart">
              {Object.entries(overviewData.summary.userDistribution.byStatus).map(([status, count]) => (
                <div key={status} className="distribution-item">
                  <span className="distribution-label">{status}</span>
                  <div className="distribution-bar">
                    <div 
                      className="distribution-fill user-status" 
                      style={{ 
                        width: `${(count / overviewData.summary.totalUsers) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="distribution-value">{formatNumber(count)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="distribution-card">
            <h3>By Region</h3>
            <div className="distribution-chart">
              {Object.entries(overviewData.summary.regionalDistribution).map(([region, count]) => (
                <div key={region} className="distribution-item">
                  <span className="distribution-label">{region}</span>
                  <div className="distribution-bar">
                    <div 
                      className="distribution-fill regional" 
                      style={{ 
                        width: `${(count / overviewData.summary.totalUsers) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="distribution-value">{formatNumber(count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="engagement-metrics">
        <h2>Engagement Metrics</h2>
        <div className="engagement-grid">
          <div className="engagement-card">
            <h3>Activity Levels</h3>
            <div className="engagement-stats">
              <div className="engagement-item">
                <span className="engagement-label">Daily Active</span>
                <span className="engagement-value">
                  {formatNumber(overviewData.activity.dailyActive)}
                </span>
              </div>
              <div className="engagement-item">
                <span className="engagement-label">Weekly Active</span>
                <span className="engagement-value">
                  {formatNumber(overviewData.activity.weeklyActive)}
                </span>
              </div>
              <div className="engagement-item">
                <span className="engagement-label">Monthly Active</span>
                <span className="engagement-value">
                  {formatNumber(overviewData.activity.monthlyActive)}
                </span>
              </div>
            </div>
          </div>

          <div className="engagement-card">
            <h3>Behavior Metrics</h3>
            <div className="engagement-stats">
              <div className="engagement-item">
                <span className="engagement-label">Avg Session Duration</span>
                <span className="engagement-value">
                  {overviewData.engagementMetrics.averageSessionDuration}
                </span>
              </div>
              <div className="engagement-item">
                <span className="engagement-label">Pages per Session</span>
                <span className="engagement-value">
                  {overviewData.engagementMetrics.pagesPerSession}
                </span>
              </div>
              <div className="engagement-item">
                <span className="engagement-label">Bounce Rate</span>
                <span className="engagement-value">
                  {formatPercentage(overviewData.engagementMetrics.bounceRate)}
                </span>
              </div>
              <div className="engagement-item">
                <span className="engagement-label">Return User Rate</span>
                <span className="engagement-value">
                  {formatPercentage(overviewData.engagementMetrics.returnUserRate)}
                </span>
              </div>
            </div>
          </div>

          <div className="engagement-card">
            <h3>Feature Adoption</h3>
            <div className="feature-adoption">
              {Object.entries(overviewData.engagementMetrics.featureAdoption).map(([feature, rate]) => (
                <div key={feature} className="feature-item">
                  <span className="feature-label">{feature.replace(/_/g, ' ')}</span>
                  <div className="feature-bar">
                    <div 
                      className="feature-fill" 
                      style={{ width: `${rate}%` }}
                    ></div>
                  </div>
                  <span className="feature-value">{formatPercentage(rate)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* User Journey */}
      {journeyData && (
        <div className="user-journey">
          <h2>User Journey Analytics</h2>
          <div className="journey-grid">
            <div className="journey-card">
              <h3>Conversion Funnel</h3>
              <div className="funnel-chart">
                {Object.entries(journeyData.journeyFunnel).map(([stage, count]) => (
                  <div key={stage} className="funnel-item">
                    <span className="funnel-stage">{stage.replace(/_/g, ' ')}</span>
                    <div className="funnel-bar">
                      <div 
                        className="funnel-fill" 
                        style={{ 
                          width: `${(count / journeyData.journeyFunnel.visitors) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="funnel-count">{formatNumber(count)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="journey-card">
              <h3>Conversion Rates</h3>
              <div className="conversion-rates">
                {Object.entries(journeyData.journeyFunnel.conversionRates).map(([conversion, rate]) => (
                  <div key={conversion} className="conversion-item">
                    <span className="conversion-label">{conversion.replace(/To/g, ' → ')}</span>
                    <div className="conversion-bar">
                      <div 
                        className="conversion-fill" 
                        style={{ width: `${rate}%` }}
                      ></div>
                    </div>
                    <span className="conversion-value">{formatPercentage(rate)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="journey-card">
              <h3>Time Metrics</h3>
              <div className="time-metrics">
                {Object.entries(journeyData.timeMetrics).map(([metric, time]) => (
                  <div key={metric} className="time-item">
                    <span className="time-label">{metric.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="time-value">{time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KYC Status */}
      <div className="kyc-status">
        <h2>KYC Processing Status</h2>
        <div className="kyc-grid">
          <div className="kyc-card">
            <h3>Document Status</h3>
            <div className="kyc-stats">
              <div className="kyc-item">
                <span className="kyc-label">Total Documents</span>
                <span className="kyc-value">
                  {formatNumber(overviewData.kycStatus.totalDocuments)}
                </span>
              </div>
              <div className="kyc-item">
                <span className="kyc-label">Verified</span>
                <span className="kyc-value">
                  {formatNumber(overviewData.kycStatus.verifiedDocuments)}
                </span>
              </div>
              <div className="kyc-item">
                <span className="kyc-label">Pending</span>
                <span className="kyc-value">
                  {formatNumber(overviewData.kycStatus.pendingDocuments)}
                </span>
              </div>
              <div className="kyc-item">
                <span className="kyc-label">Rejected</span>
                <span className="kyc-value">
                  {formatNumber(overviewData.kycStatus.rejectedDocuments)}
                </span>
              </div>
            </div>
          </div>

          <div className="kyc-card">
            <h3>Completion Rate</h3>
            <div className="kyc-completion">
              <div className="completion-circle">
                <div 
                  className="completion-fill" 
                  style={{ 
                    background: `conic-gradient(#007bff 0deg ${overviewData.kycStatus.completionRate * 3.6}deg, #e9ecef ${overviewData.kycStatus.completionRate * 3.6}deg)`
                  }}
                >
                  <div className="completion-center">
                    <span className="completion-text">
                      {formatPercentage(overviewData.kycStatus.completionRate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            Previous
          </button>
          
          <div className="pagination-info">
            Page {currentPage} of {totalPages}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}

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

export default UserMetrics;