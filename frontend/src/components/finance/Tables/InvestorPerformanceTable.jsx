import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Table from '../../common/Table';
import api from '../../../api';

/**
 * InvestorPerformanceTable component for displaying investor performance with comparisons
 */
const InvestorPerformanceTable = ({ 
  className = '',
  onRowSelectionChange,
  initialFilters = {},
  initialSort = { field: 'performanceScore', direction: 'desc' }
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

  // Fetch investor performance data from API
  const fetchInvestorPerformance = useCallback(async () => {
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

      const response = await api.get('/api/investors/performance', { params });
      
      setData(response.data?.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data?.pagination?.total || 0,
        totalPages: response.data?.pagination?.pages || 0
      }));
    } catch (err) {
      console.error('Error fetching investor performance:', err);
      setError(err.message || 'Failed to fetch investor performance data');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sort, filters]);

  // Initial data fetch
  useEffect(() => {
    fetchInvestorPerformance();
  }, [fetchInvestorPerformance]);

  // Handle retry functionality
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchInvestorPerformance();
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
        sortFields: exportData.sortFields
      };

      const response = await api.get('/api/investors/performance/export', { 
        params,
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `investor-performance.${exportData.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting investor performance:', err);
      setError(err.message || 'Failed to export data');
    }
  };

  // Define table columns
  const columns = [
    {
      key: 'investorId',
      title: 'Investor ID',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      )
    },
    {
      key: 'name',
      title: 'Investor Details',
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value || 'N/A'}</div>
          <div className="text-sm text-gray-500">{row.email || 'N/A'}</div>
          <div className="text-xs text-gray-400">{row.phone || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'portfolioValue',
      title: 'Portfolio Value',
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
      key: 'totalInvested',
      title: 'Total Invested',
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
      key: 'roi',
      title: 'ROI',
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
      key: 'performanceScore',
      title: 'Performance Score',
      sortable: true,
      filterable: true,
      filterType: 'number',
      render: (value) => {
        let colorClass = 'text-gray-900';
        let label = 'Average';
        
        if (value >= 90) {
          colorClass = 'text-green-600';
          label = 'Excellent';
        } else if (value >= 75) {
          colorClass = 'text-blue-600';
          label = 'Good';
        } else if (value >= 60) {
          colorClass = 'text-yellow-600';
          label = 'Above Average';
        } else if (value >= 40) {
          colorClass = 'text-orange-600';
          label = 'Below Average';
        } else {
          colorClass = 'text-red-600';
          label = 'Poor';
        }
        
        return (
          <div>
            <div className={`font-medium ${colorClass}`}>
              {Number(value).toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        );
      }
    },
    {
      key: 'riskProfile',
      title: 'Risk Profile',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'conservative', label: 'Conservative' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'aggressive', label: 'Aggressive' },
        { value: 'very_aggressive', label: 'Very Aggressive' }
      ],
      render: (value) => {
        const riskConfig = {
          conservative: { color: 'bg-green-100 text-green-800', label: 'Conservative' },
          moderate: { color: 'bg-blue-100 text-blue-800', label: 'Moderate' },
          aggressive: { color: 'bg-orange-100 text-orange-800', label: 'Aggressive' },
          very_aggressive: { color: 'bg-red-100 text-red-800', label: 'Very Aggressive' }
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
      key: 'investmentCount',
      title: 'Investments',
      sortable: true,
      filterable: true,
      filterType: 'number',
      render: (value) => (
        <span className="font-medium text-gray-900">
          {Number(value).toLocaleString()}
        </span>
      )
    },
    {
      key: 'lastInvestmentDate',
      title: 'Last Investment',
      sortable: true,
      filterable: true,
      filterType: 'date',
      render: (value) => value ? (
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
      ) : (
        <span className="text-sm text-gray-400">No investments</span>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'pending', label: 'Pending' }
      ],
      render: (value) => {
        const statusConfig = {
          active: { color: 'bg-green-100 text-green-800', label: 'Active' },
          inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactive' },
          suspended: { color: 'bg-red-100 text-red-800', label: 'Suspended' },
          pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' }
        };
        
        const config = statusConfig[value] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'rank',
      title: 'Rank',
      sortable: true,
      filterable: true,
      filterType: 'number',
      render: (value) => {
        let badgeColor = 'bg-gray-100 text-gray-800';
        if (value === 1) {
          badgeColor = 'bg-yellow-100 text-yellow-800';
        } else if (value === 2) {
          badgeColor = 'bg-gray-100 text-gray-800';
        } else if (value === 3) {
          badgeColor = 'bg-orange-100 text-orange-800';
        } else if (value <= 10) {
          badgeColor = 'bg-blue-100 text-blue-800';
        }
        
        return (
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${badgeColor}`}>
            {value}
          </span>
        );
      }
    },
    {
      key: 'joinDate',
      title: 'Join Date',
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
            <h3 className="text-sm font-medium text-red-800">Error loading investor performance data</h3>
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
        emptyMessage="No investor performance data available"
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

InvestorPerformanceTable.propTypes = {
  className: PropTypes.string,
  onRowSelectionChange: PropTypes.func,
  initialFilters: PropTypes.object,
  initialSort: PropTypes.shape({
    field: PropTypes.string,
    direction: PropTypes.oneOf(['asc', 'desc'])
  })
};

export default InvestorPerformanceTable;