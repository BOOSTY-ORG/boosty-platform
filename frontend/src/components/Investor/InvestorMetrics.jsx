import React, { useState, useEffect } from 'react';
import { metricsApi } from '../../services/metricsApi';
import './InvestorMetrics.css';

/**
 * InvestorMetrics Component
 * Displays comprehensive investor metrics and performance data
 */
const InvestorMetrics = ({ dateRange = 'last_30_days' }) => {
  const [overviewData, setOverviewData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(dateRange);
  const [selectedInvestorType, setSelectedInvestorType] = useState('all');
  const [selectedRiskProfile, setSelectedRiskProfile] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch investor metrics data
  const fetchInvestorData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [overviewResponse, performanceResponse] = await Promise.all([
        metricsApi.getInvestorMetrics({
          dateRange: selectedTimeRange,
          investorType: selectedInvestorType !== 'all' ? [selectedInvestorType] : undefined,
          riskProfile: selectedRiskProfile !== 'all' ? [selectedRiskProfile] : undefined,
          region: selectedRegion !== 'all' ? selectedRegion : undefined,
          page: currentPage,
          limit: 20
        }),
        metricsApi.getInvestorPerformance({
          dateRange: selectedTimeRange,
          groupBy: 'month',
          sortBy: 'roi',
          sortOrder: 'desc'
        })
      ]);
      
      setOverviewData(overviewResponse.data);
      setPerformanceData(performanceResponse.data);
      
      if (overviewResponse.meta?.pagination) {
        setTotalPages(overviewResponse.meta.pagination.totalPages);
      }
    } catch (err) {
      setError(err.message || 'Failed to load investor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestorData();
  }, [selectedTimeRange, selectedInvestorType, selectedRiskProfile, selectedRegion, currentPage]);

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
      case 'investorType':
        setSelectedInvestorType(value);
        break;
      case 'riskProfile':
        setSelectedRiskProfile(value);
        break;
      case 'region':
        setSelectedRegion(value);
        break;
      default:
        break;
    }
    setCurrentPage(1); // Reset to first page when filters change
  };

  if (loading && !overviewData) {
    return (
      <div className="investor-metrics loading">
        <div className="loading-spinner"></div>
        <p>Loading investor metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="investor-metrics error">
        <div className="error-message">
          <h3>Error Loading Investor Data</h3>
          <p>{error}</p>
          <button onClick={fetchInvestorData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!overviewData) {
    return (
      <div className="investor-metrics empty">
        <p>No investor data available</p>
      </div>
    );
  }

  return (
    <div className="investor-metrics">
      {/* Filters */}
      <div className="investor-filters">
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
          <label htmlFor="investorType">Investor Type:</label>
          <select
            id="investorType"
            value={selectedInvestorType}
            onChange={(e) => handleFilterChange('investorType', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="individual">Individual</option>
            <option value="institutional">Institutional</option>
            <option value="corporate">Corporate</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="riskProfile">Risk Profile:</label>
          <select
            id="riskProfile"
            value={selectedRiskProfile}
            onChange={(e) => handleFilterChange('riskProfile', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Profiles</option>
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
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
      </div>

      {/* Summary Cards */}
      <div className="investor-summary">
        <h2>Investor Overview</h2>
        <div className="summary-grid">
          <div className="summary-card">
            <h3>Total Investors</h3>
            <p className="summary-value">{formatNumber(overviewData.summary.totalInvestors)}</p>
            <div className="summary-subtitle">
              {formatNumber(overviewData.summary.activeInvestors)} active
            </div>
          </div>

          <div className="summary-card">
            <h3>New Investors</h3>
            <p className="summary-value">{formatNumber(overviewData.summary.newInvestors)}</p>
            <div className="summary-subtitle">
              This period
            </div>
          </div>

          <div className="summary-card">
            <h3>Total Invested</h3>
            <p className="summary-value">{formatCurrency(overviewData.summary.totalInvestmentVolume)}</p>
            <div className="summary-subtitle">
              Avg: {formatCurrency(overviewData.summary.averageInvestmentPerInvestor)}
            </div>
          </div>

          <div className="summary-card">
            <h3>Total Returns</h3>
            <p className="summary-value">{formatCurrency(overviewData.summary.totalReturns)}</p>
            <div className="summary-subtitle">
              Avg ROI: {formatPercentage(overviewData.performance.averageROI)}
            </div>
          </div>
        </div>
      </div>

      {/* Investor Distribution */}
      <div className="investor-distribution">
        <h2>Investor Distribution</h2>
        <div className="distribution-grid">
          <div className="distribution-card">
            <h3>By Type</h3>
            <div className="distribution-chart">
              {Object.entries(overviewData.breakdowns.investorType).map(([type, count]) => (
                <div key={type} className="distribution-item">
                  <span className="distribution-label">{type}</span>
                  <div className="distribution-bar">
                    <div 
                      className="distribution-fill" 
                      style={{ 
                        width: `${(count / overviewData.summary.totalInvestors) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="distribution-value">{formatNumber(count)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="distribution-card">
            <h3>By Risk Profile</h3>
            <div className="distribution-chart">
              {Object.entries(overviewData.breakdowns.riskProfile).map(([profile, count]) => (
                <div key={profile} className="distribution-item">
                  <span className="distribution-label">{profile}</span>
                  <div className="distribution-bar">
                    <div 
                      className="distribution-fill risk-profile" 
                      style={{ 
                        width: `${(count / overviewData.summary.totalInvestors) * 100}%` 
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
              {Object.entries(overviewData.breakdowns.verificationStatus).map(([status, count]) => (
                <div key={status} className="distribution-item">
                  <span className="distribution-label">{status}</span>
                  <div className="distribution-bar">
                    <div 
                      className="distribution-fill verification-status" 
                      style={{ 
                        width: `${(count / overviewData.summary.totalInvestors) * 100}%` 
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

      {/* Performance Metrics */}
      <div className="investor-performance">
        <h2>Performance Metrics</h2>
        <div className="performance-grid">
          <div className="performance-card">
            <h3>Investment Performance</h3>
            <div className="performance-metrics">
              <div className="performance-item">
                <span className="performance-label">Average ROI</span>
                <span className="performance-value">
                  {formatPercentage(overviewData.performance.averageROI)}
                </span>
              </div>
              <div className="performance-item">
                <span className="performance-label">Completion Rate</span>
                <span className="performance-value">
                  {formatPercentage(overviewData.performance.completionRate)}
                </span>
              </div>
              <div className="performance-item">
                <span className="performance-label">Default Rate</span>
                <span className="performance-value">
                  {formatPercentage(overviewData.performance.defaultRate)}
                </span>
              </div>
            </div>
          </div>

          <div className="performance-card">
            <h3>ROI Distribution</h3>
            {performanceData?.roiDistribution && (
              <div className="roi-distribution">
                {performanceData.roiDistribution.map((range, index) => (
                  <div key={index} className="roi-item">
                    <span className="roi-range">{range.range}</span>
                    <div className="roi-bar">
                      <div 
                        className="roi-fill" 
                        style={{ width: `${range.percentage}%` }}
                      ></div>
                    </div>
                    <span className="roi-count">{formatNumber(range.count)}</span>
                    <span className="roi-percentage">{formatPercentage(range.percentage)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Investors */}
      <div className="top-investors">
        <h2>Top Performing Investors</h2>
        <div className="investors-table">
          <div className="table-header">
            <div>Investor</div>
            <div>Type</div>
            <div>Total Invested</div>
            <div>Returns</div>
            <div>ROI</div>
            <div>Active Investments</div>
          </div>
          <div className="table-body">
            {overviewData.topInvestors?.map((investor, index) => (
              <div key={investor.id} className="table-row">
                <div className="investor-info">
                  <span className="investor-rank">#{index + 1}</span>
                  <div>
                    <div className="investor-name">{investor.name}</div>
                    <div className="investor-email">{investor.email}</div>
                  </div>
                </div>
                <div className="investor-type">{investor.investorType}</div>
                <div className="investor-invested">
                  {formatCurrency(investor.totalInvested)}
                </div>
                <div className="investor-returns">
                  {formatCurrency(investor.actualReturns)}
                </div>
                <div className="investor-roi">
                  {formatPercentage(investor.roi)}
                </div>
                <div className="investor-active">
                  {formatNumber(investor.activeInvestments)}
                </div>
              </div>
            ))}
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

export default InvestorMetrics;