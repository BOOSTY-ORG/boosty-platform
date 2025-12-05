import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Table from '../../common/Table';
import api from '../../api';

/**
 * PayoutTable component for displaying payout summary data with filtering and pagination
 */
const PayoutTable = ({ 
  className = '',
  onRowSelectionChange,
  initialFilters = {},
  initialSort = { field: 'createdAt', direction: 'desc' }
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

  // Fetch payout data from API
  const fetchPayouts = useCallback(async () => {
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

      const response = await api.get('/api/payouts', { params });
      
      setData(response.data?.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data?.pagination?.total || 0,
        totalPages: response.data?.pagination?.pages || 0
      }));
    } catch (err) {
      console.error('Error fetching payouts:', err);
      setError(err.message || 'Failed to fetch payout data');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sort, filters]);

  // Initial data fetch
  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  // Handle retry functionality
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchPayouts();
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

      const response = await api.get('/api/payouts/export', { 
        params,
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payouts.${exportData.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting payouts:', err);
      setError(err.message || 'Failed to export data');
    }
  };

  // Define table columns
  const columns = [
    {
      key: 'payoutId',
      title: 'Payout ID',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      )
    },
    {
      key: 'type',
      title: 'Type',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'investment_return', label: 'Investment Return' },
        { value: 'profit_sharing', label: 'Profit Sharing' },
        { value: 'dividend', label: 'Dividend' },
        { value: 'referral_bonus', label: 'Referral Bonus' }
      ],
      render: (value) => {
        const typeConfig = {
          investment_return: { color: 'bg-blue-100 text-blue-800', label: 'Investment Return' },
          profit_sharing: { color: 'bg-green-100 text-green-800', label: 'Profit Sharing' },
          dividend: { color: 'bg-purple-100 text-purple-800', label: 'Dividend' },
          referral_bonus: { color: 'bg-yellow-100 text-yellow-800', label: 'Referral Bonus' }
        };
        
        const config = typeConfig[value] || { color: 'bg-gray-100 text-gray-800', label: value };
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'amount',
      title: 'Amount',
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
      key: 'status',
      title: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'pending', label: 'Pending' },
        { value: 'processing', label: 'Processing' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
        { value: 'cancelled', label: 'Cancelled' }
      ],
      render: (value) => {
        const statusConfig = {
          pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
          processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
          completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
          failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
          cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' }
        };
        
        const config = statusConfig[value] || { color: 'bg-gray-100 text-gray-800', label: value };
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'recipient',
      title: 'Recipient',
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value?.name || 'N/A'}</div>
          <div className="text-sm text-gray-500">{value?.email || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'createdAt',
      title: 'Created Date',
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
      key: 'processedAt',
      title: 'Processed Date',
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
        <span className="text-sm text-gray-400">Not processed</span>
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
            <h3 className="text-sm font-medium text-red-800">Error loading payout data</h3>
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
        emptyMessage="No payout data available"
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

PayoutTable.propTypes = {
  className: PropTypes.string,
  onRowSelectionChange: PropTypes.func,
  initialFilters: PropTypes.object,
  initialSort: PropTypes.shape({
    field: PropTypes.string,
    direction: PropTypes.oneOf(['asc', 'desc'])
  })
};

export default PayoutTable;