import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Table from '../../common/Table';
import api from '../../../api';

/**
 * ROIAnalyticsTable component for displaying ROI analytics with performance metrics
 */
const ROIAnalyticsTable = ({ 
  className = '',
  onRowSelectionChange,
  investorId = null,
  initialFilters = {},
  initialSort = { field: 'roiPercentage', direction: 'desc' }
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState(initialSort);
  const [selectedRows, setSelectedRows] = useState([]);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch ROI analytics data from API
  const fetchROIAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sort.field,
        sortOrder: sort.direction,
        ...filters
      };

      const endpoint = investorId 
        ? `/api/roi-analytics/portfolio/${investorId}`
        : '/api/roi-analytics/portfolio';
      
      const response = await api.get(endpoint, { params });
      
      setData(response.data?.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data?.pagination?.total || 0,
        totalPages: response.data?.pagination?.pages || 0
      }));
    } catch (err) {
      console.error('Error fetching ROI analytics:', err);
      setError(err.message || 'Failed to fetch ROI analytics data');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sort, filters, investorId]);

  // Initial data fetch
  useEffect(() => {
    fetchROIAnalytics();
  }, [fetchROIAnalytics]);

  // Handle retry functionality
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchROIAnalytics();
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  // Handle sort change
  const handleSort = (field, direction) => {
    setSort({ field, direction });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle filter change
  const handleFilter = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle row selection
  const handleSelectionChange = (selectedIds) => {
    setSelectedRows(selectedIds);
    if (onRowSelectionChange) {
      onRowSelectionChange(selectedIds);
    }
  };

  // Handle export
  const handleExport = async (exportData) => {
    try {
      const params = {
        format: exportData.format,
        columns: exportData.columns.map(col => col.key),
        filters: exportData.filters,
        sortFields: exportData.sortFields,
        investorId
      };

      const response = await api.get('/api/roi-analytics/export', { 
        params,
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `roi-analytics.${exportData.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting ROI analytics:', err);
      setError(err.message || 'Failed to export data');
    }
  };

  // Define table columns
  const columns = [
    {
      key: 'investmentId',
      title: 'Investment ID',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      )
    },
    {
      key: 'investorName',
      title: 'Investor',
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value || 'N/A'}</div>
          <div className="text-sm text-gray-500">{row.investorEmail || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'investmentAmount',
      title: 'Investment Amount',
      sortable: true,
      filterable: true,
      filterType: 'number',
      render: (value) => (
        <span className="font-medium text-gray-900">
          ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: 'currentValue',
      title: 'Current Value',
      sortable: true,
      filterable: true,
      filterType: 'number',
      render: (value) => (
        <span className="font-medium text-gray-900">
          ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: 'roiPercentage',
      title: 'ROI %',
      sortable: true,
      filterable: true,
      filterType: 'number',
      render: (value) => {
        const isPositive = value >= 0;
        return (
          <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{Number(value).toFixed(2)}%
          </span>
        );
      }
    },
    {
      key: 'totalReturns',
      title: 'Total Returns',
      sortable: true,
      filterable: true,
      filterType: 'number',
      render: (value) => (
        <span className="font-medium text-green-600">
          ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: 'annualizedReturn',
      title: 'Annualized Return',
      sortable: true,
      filterable: true,
      filterType: 'number',
      render: (value) => {
        const isPositive = value >= 0;
        return (
          <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{Number(value).toFixed(2)}%
          </span>
        );
      }
    },
    {
      key: 'riskScore',
      title: 'Risk Score',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'very_high', label: 'Very High' }
      ],
      render: (value) => {
        const riskConfig = {
          low: { color: 'bg-green-100 text-green-800', label: 'Low' },
          medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
          high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
          very_high: { color: 'bg-red-100 text-red-800', label: 'Very High' }
        };
        
        const config = riskConfig[value] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'sharpeRatio',
      title: 'Sharpe Ratio',
      sortable: true,
      filterable: true,
      filterType: 'number',
      render: (value) => {
        if (value === null || value === undefined) {
          return <span className="text-gray-400">N/A</span>;
        }
        
        let colorClass = 'text-gray-900';
        if (value > 1) {
          colorClass = 'text-green-600';
        } else if (value > 0) {
          colorClass = 'text-yellow-600';
        } else {
          colorClass = 'text-red-600';
        }
        
        return (
          <span className={`font-medium ${colorClass}`}>
            {Number(value).toFixed(2)}
          </span>
        );
      }
    },
    {
      key: 'maxDrawdown',
      title: 'Max Drawdown',
      sortable: true,
      filterable: true,
      filterType: 'number',
      render: (value) => (
        <span className="font-medium text-red-600">
          -{Number(value).toFixed(2)}%
        </span>
      )
    },
    {
      key: 'investmentDate',
      title: 'Investment Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      render: (value) => (
        <div>
          <div className="text-sm text-gray-900">
            {new Date(value).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(value).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      )
    },
    {
      key: 'lastUpdated',
      title: 'Last Updated',
      sortable: true,
      filterable: true,
      filterType: 'date',
      render: (value) => (
        <div>
          <div className="text-sm text-gray-900">
            {new Date(value).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(value).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      )
    }
  ];

  // Error state
  if (error && retryCount === 0) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading ROI analytics data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={handleRetry}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Table
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No ROI analytics data available"
        sortable={true}
        onSort={handleSort}
        defaultSortField={sort.field}
        defaultSortDirection={sort.direction}
        pagination={true}
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
        rowsPerPage={pagination.limit}
        onRowsPerPageChange={handleRowsPerPageChange}
        selectable={true}
        selectedRows={selectedRows}
        onSelectionChange={handleSelectionChange}
        filterable={true}
        onFilter={handleFilter}
        exportable={true}
        onExport={handleExport}
        className="min-w-full"
      />
    </div>
  );
};

ROIAnalyticsTable.propTypes = {
  className: PropTypes.string,
  onRowSelectionChange: PropTypes.func,
  investorId: PropTypes.string,
  initialFilters: PropTypes.object,
  initialSort: PropTypes.shape({
    field: PropTypes.string,
    direction: PropTypes.oneOf(['asc', 'desc'])
  })
};

export default ROIAnalyticsTable;