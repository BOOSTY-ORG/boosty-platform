import React, { useState, useEffect } from 'react';
import { metricsApi } from '../../services/metricsApi';
import './TransactionMetrics.css';

/**
 * TransactionMetrics Component
 * Displays comprehensive transaction metrics and financial analytics
 */
const TransactionMetrics = ({ dateRange = 'last_30_days' }) => {
  const [overviewData, setOverviewData] = useState(null);
  const [repaymentData, setRepaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(dateRange);
  const [selectedTransactionType, setSelectedTransactionType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch transaction metrics data
  const fetchTransactionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [overviewResponse, repaymentResponse] = await Promise.all([
        metricsApi.getTransactionMetrics({
          dateRange: selectedTimeRange,
          transactionType: selectedTransactionType !== 'all' ? [selectedTransactionType] : undefined,
          status: selectedStatus !== 'all' ? [selectedStatus] : undefined,
          currency: selectedCurrency,
          minAmount: minAmount || undefined,
          maxAmount: maxAmount || undefined,
          page: currentPage,
          limit: 20
        }),
        metricsApi.getRepaymentMetrics({
          dateRange: selectedTimeRange
        })
      ]);
      
      setOverviewData(overviewResponse.data);
      setRepaymentData(repaymentResponse.data);
      
      if (overviewResponse.meta?.pagination) {
        setTotalPages(overviewResponse.meta.pagination.totalPages);
      }
    } catch (err) {
      setError(err.message || 'Failed to load transaction data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionData();
  }, [selectedTimeRange, selectedTransactionType, selectedStatus, selectedCurrency, minAmount, maxAmount, currentPage]);

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
      case 'transactionType':
        setSelectedTransactionType(value);
        break;
      case 'status':
        setSelectedStatus(value);
        break;
      case 'currency':
        setSelectedCurrency(value);
        break;
      case 'minAmount':
        setMinAmount(value);
        break;
      case 'maxAmount':
        setMaxAmount(value);
        break;
      default:
        break;
    }
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle filter submit
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchTransactionData();
  };

  if (loading && !overviewData) {
    return (
      <div className="transaction-metrics loading">
        <div className="loading-spinner"></div>
        <p>Loading transaction metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transaction-metrics error">
        <div className="error-message">
          <h3>Error Loading Transaction Data</h3>
          <p>{error}</p>
          <button onClick={fetchTransactionData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!overviewData) {
    return (
      <div className="transaction-metrics empty">
        <p>No transaction data available</p>
      </div>
    );
  }

  return (
    <div className="transaction-metrics">
      {/* Filters */}
      <form className="transaction-filters" onSubmit={handleFilterSubmit}>
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
          <label htmlFor="transactionType">Transaction Type:</label>
          <select
            id="transactionType"
            value={selectedTransactionType}
            onChange={(e) => handleFilterChange('transactionType', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="investment">Investment</option>
            <option value="repayment">Repayment</option>
            <option value="fee">Fee</option>
            <option value="refund">Refund</option>
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
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="currency">Currency:</label>
          <select
            id="currency"
            value={selectedCurrency}
            onChange={(e) => handleFilterChange('currency', e.target.value)}
            className="filter-select"
          >
            <option value="NGN">NGN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="minAmount">Min Amount:</label>
          <input
            id="minAmount"
            type="number"
            value={minAmount}
            onChange={(e) => handleFilterChange('minAmount', e.target.value)}
            className="filter-input"
            placeholder="0"
          />
        </div>
        
        <div className="filter-group">
          <label htmlFor="maxAmount">Max Amount:</label>
          <input
            id="maxAmount"
            type="number"
            value={maxAmount}
            onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
            className="filter-input"
            placeholder="1000000"
          />
        </div>
        
        <button type="submit" className="filter-submit-button">
          Apply Filters
        </button>
      </form>

      {/* Summary Cards */}
      <div className="transaction-summary">
        <h2>Transaction Overview</h2>
        <div className="summary-grid">
          <div className="summary-card">
            <h3>Total Transactions</h3>
            <p className="summary-value">{formatNumber(overviewData.summary.totalTransactions)}</p>
            <div className="summary-subtitle">
              {formatNumber(overviewData.summary.completedTransactions)} completed
            </div>
          </div>

          <div className="summary-card">
            <h3>Total Volume</h3>
            <p className="summary-value">{formatCurrency(overviewData.summary.totalVolume)}</p>
            <div className="summary-subtitle">
              Avg: {formatCurrency(overviewData.summary.averageTransactionValue)}
            </div>
          </div>

          <div className="summary-card">
            <h3>Total Revenue</h3>
            <p className="summary-value">{formatCurrency(overviewData.summary.totalRevenue)}</p>
            <div className="summary-subtitle">
              MRR: {formatCurrency(overviewData.financialMetrics.monthlyRecurringRevenue)}
            </div>
          </div>

          <div className="summary-card">
            <h3>Completion Rate</h3>
            <p className="summary-value">{formatPercentage(overviewData.summary.completionRate)}</p>
            <div className="summary-subtitle">
              {formatNumber(overviewData.summary.failedTransactions)} failed
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Breakdown */}
      <div className="transaction-breakdown">
        <h2>Transaction Breakdown</h2>
        <div className="breakdown-grid">
          <div className="breakdown-card">
            <h3>By Type</h3>
            <div className="breakdown-chart">
              {Object.entries(overviewData.breakdowns.transactionType).map(([type, data]) => (
                <div key={type} className="breakdown-item">
                  <span className="breakdown-label">{type}</span>
                  <div className="breakdown-stats">
                    <div className="breakdown-bar">
                      <div 
                        className="breakdown-fill" 
                        style={{ 
                          width: `${(data.count / overviewData.summary.totalTransactions) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <div className="breakdown-values">
                      <span className="breakdown-count">{formatNumber(data.count)}</span>
                      <span className="breakdown-volume">{formatCurrency(data.volume)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="breakdown-card">
            <h3>By Status</h3>
            <div className="breakdown-chart">
              {Object.entries(overviewData.breakdowns.byStatus).map(([status, count]) => (
                <div key={status} className="breakdown-item">
                  <span className="breakdown-label">{status}</span>
                  <div className="breakdown-stats">
                    <div className="breakdown-bar">
                      <div 
                        className="breakdown-fill status-fill" 
                        style={{ 
                          width: `${(count / overviewData.summary.totalTransactions) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="breakdown-count">{formatNumber(count)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="breakdown-card">
            <h3>By Payment Method</h3>
            <div className="breakdown-chart">
              {Object.entries(overviewData.breakdowns.paymentMethod).map(([method, data]) => (
                <div key={method} className="breakdown-item">
                  <span className="breakdown-label">{method.replace(/_/g, ' ')}</span>
                  <div className="breakdown-stats">
                    <div className="breakdown-bar">
                      <div 
                        className="breakdown-fill payment-fill" 
                        style={{ 
                          width: `${(data.count / overviewData.summary.totalTransactions) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <div className="breakdown-values">
                      <span className="breakdown-count">{formatNumber(data.count)}</span>
                      <span className="breakdown-volume">{formatCurrency(data.volume)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="growth-metrics">
        <h2>Growth Trends</h2>
        <div className="growth-grid">
          <div className="growth-card">
            <h3>Transaction Growth</h3>
            <div className="growth-item">
              <div className="growth-current">
                <span className="growth-label">Current Period</span>
                <span className="growth-value">{formatNumber(overviewData.growth.transactionGrowth.current)}</span>
              </div>
              <div className="growth-previous">
                <span className="growth-label">Previous Period</span>
                <span className="growth-value">{formatNumber(overviewData.growth.transactionGrowth.previous)}</span>
              </div>
              <div className="growth-percentage">
                <span className={`growth-trend ${overviewData.growth.transactionGrowth.trend}`}>
                  {overviewData.growth.transactionGrowth.trend === 'up' ? '↑' : 
                   overviewData.growth.transactionGrowth.trend === 'down' ? '↓' : '→'}
                </span>
                <span className="growth-value">{formatPercentage(overviewData.growth.transactionGrowth.percentage)}</span>
              </div>
            </div>
          </div>

          <div className="growth-card">
            <h3>Volume Growth</h3>
            <div className="growth-item">
              <div className="growth-current">
                <span className="growth-label">Current Period</span>
                <span className="growth-value">{formatCurrency(overviewData.growth.volumeGrowth.current)}</span>
              </div>
              <div className="growth-previous">
                <span className="growth-label">Previous Period</span>
                <span className="growth-value">{formatCurrency(overviewData.growth.volumeGrowth.previous)}</span>
              </div>
              <div className="growth-percentage">
                <span className={`growth-trend ${overviewData.growth.volumeGrowth.trend}`}>
                  {overviewData.growth.volumeGrowth.trend === 'up' ? '↑' : 
                   overviewData.growth.volumeGrowth.trend === 'down' ? '↓' : '→'}
                </span>
                <span className="growth-value">{formatPercentage(overviewData.growth.volumeGrowth.percentage)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Repayment Metrics */}
      {repaymentData && (
        <div className="repayment-metrics">
          <h2>Repayment Analytics</h2>
          <div className="repayment-grid">
            <div className="repayment-card">
              <h3>Repayment Summary</h3>
              <div className="repayment-stats">
                <div className="repayment-item">
                  <span className="repayment-label">Total Repayments</span>
                  <span className="repayment-value">{formatNumber(repaymentData.repaymentSummary.totalRepayments)}</span>
                </div>
                <div className="repayment-item">
                  <span className="repayment-label">Total Amount Repaid</span>
                  <span className="repayment-value">{formatCurrency(repaymentData.repaymentSummary.totalAmountRepaid)}</span>
                </div>
                <div className="repayment-item">
                  <span className="repayment-label">On-Time Payment Rate</span>
                  <span className="repayment-value">{formatPercentage(repaymentData.repaymentSummary.onTimePaymentRate)}</span>
                </div>
                <div className="repayment-item">
                  <span className="repayment-label">Collection Rate</span>
                  <span className="repayment-value">{formatPercentage(repaymentData.repaymentPerformance.collectionRate)}</span>
                </div>
              </div>
            </div>

            <div className="repayment-card">
              <h3>Repayment Performance</h3>
              <div className="performance-chart">
                <div className="performance-item">
                  <span className="performance-label">Default Rate</span>
                  <div className="performance-bar">
                    <div 
                      className="performance-fill default-rate" 
                      style={{ width: `${repaymentData.repaymentPerformance.defaultRate}%` }}
                    ></div>
                  </div>
                  <span className="performance-value">{formatPercentage(repaymentData.repaymentPerformance.defaultRate)}</span>
                </div>
                <div className="performance-item">
                  <span className="performance-label">Recovery Rate</span>
                  <div className="performance-bar">
                    <div 
                      className="performance-fill recovery-rate" 
                      style={{ width: `${repaymentData.repaymentPerformance.recoveryRate}%` }}
                    ></div>
                  </div>
                  <span className="performance-value">{formatPercentage(repaymentData.repaymentPerformance.recoveryRate)}</span>
                </div>
                <div className="performance-item">
                  <span className="performance-label">Average Days Late</span>
                  <span className="performance-value">{repaymentData.repaymentPerformance.averageDaysLate} days</span>
                </div>
              </div>
            </div>

            <div className="repayment-card">
              <h3>Risk Distribution</h3>
              <div className="risk-chart">
                {Object.entries(repaymentData.riskMetrics.riskDistribution).map(([risk, percentage]) => (
                  <div key={risk} className="risk-item">
                    <span className="risk-label">{risk}</span>
                    <div className="risk-bar">
                      <div 
                        className={`risk-fill ${risk.toLowerCase()}`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="risk-value">{formatPercentage(percentage)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

export default TransactionMetrics;