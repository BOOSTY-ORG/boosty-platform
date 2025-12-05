import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import Table from '../../common/Table';
import VirtualTable from '../../common/VirtualTable';
import api from '../../api';
import { withPerformanceTracking } from '../../../utils/performance.js';
import { withErrorHandling, retryWithBackoff } from '../../../utils/errorHandling.js';
import { useDebouncedSearch, useDebouncedFilters } from '../../../utils/debounce.js';
import { ariaLabels, keyboardNavigation } from '../../../utils/accessibility.js';
import { withCache, generateCacheKey } from '../../../utils/cache.js';
import { sanitizeInput } from '../../../utils/security.js';

/**
 * TransactionTable component for displaying transaction details with advanced features
 */
const TransactionTable = ({ 
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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  // Fetch transaction data from API with error handling, retry, and caching
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sort.field,
        sortOrder: sort.direction,
        search: debouncedSearchQuery,
        ...filters
      };

      const cacheKey = generateCacheKey('/api/transactions/timeline', params);
      
      const response = await withCache(
        withErrorHandling(
          retryWithBackoff(() => api.get('/api/transactions/timeline', { params }), 3),
          { component: 'TransactionTable', action: 'fetchTransactions' }
        ),
        { key: cacheKey, ttl: 5 * 60 * 1000 } // 5 minutes cache
      );
      
      setData(response.data?.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data?.pagination?.total || 0,
        totalPages: response.data?.pagination?.pages || 0
      }));
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message || 'Failed to fetch transaction data');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sort, debouncedSearchQuery, filters]);

  // Initial data fetch
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Handle retry functionality
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchTransactions();
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

  // Handle export with error handling
  const handleExport = useCallback(async (exportData) => {
    try {
      const params = {
        format: exportData.format,
        columns: exportData.columns.map(col => col.key),
        filters: exportData.filters,
        sortFields: exportData.sortFields,
        search: debouncedSearchQuery
      };

      const response = await withErrorHandling(
        retryWithBackoff(() => api.get('/api/transactions/export', {
          params,
          responseType: 'blob'
        }), 2),
        { component: 'TransactionTable', action: 'handleExport' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions.${exportData.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting transactions:', err);
      setError(err.message || 'Failed to export data');
    }
  }, [debouncedSearchQuery]);

  // Define table columns - memoized for performance
  const columns = useMemo(() => [
    {
      key: 'transactionId',
      title: 'Transaction ID',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      )
    },
    {
      key: 'amount',
      title: 'Amount',
      sortable: true,
      filterable: true,
      filterType: 'number',
      render: (value, row) => {
        const isCredit = row.type === 'credit' || row.type === 'deposit';
        return (
          <span className={`font-medium ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
            {isCredit ? '+' : '-'}${Number(Math.abs(value)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      }
    },
    {
      key: 'type',
      title: 'Type',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'credit', label: 'Credit' },
        { value: 'debit', label: 'Debit' },
        { value: 'deposit', label: 'Deposit' },
        { value: 'withdrawal', label: 'Withdrawal' },
        { value: 'transfer', label: 'Transfer' },
        { value: 'fee', label: 'Fee' }
      ],
      render: (value) => {
        const typeConfig = {
          credit: { color: 'bg-green-100 text-green-800', label: 'Credit' },
          debit: { color: 'bg-red-100 text-red-800', label: 'Debit' },
          deposit: { color: 'bg-blue-100 text-blue-800', label: 'Deposit' },
          withdrawal: { color: 'bg-orange-100 text-orange-800', label: 'Withdrawal' },
          transfer: { color: 'bg-purple-100 text-purple-800', label: 'Transfer' },
          fee: { color: 'bg-gray-100 text-gray-800', label: 'Fee' }
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
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'reversed', label: 'Reversed' }
      ],
      render: (value) => {
        const statusConfig = {
          pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
          processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
          completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
          failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
          cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
          reversed: { color: 'bg-purple-100 text-purple-800', label: 'Reversed' }
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
      key: 'createdAt',
      title: 'Date',
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
      key: 'user',
      title: 'User Details',
      sortable: true,
      filterable: true,
      render: (value) => (
        <div>
          <div className="font-medium text-gray-900">{value?.name || 'N/A'}</div>
          <div className="text-sm text-gray-500">{value?.email || 'N/A'}</div>
          <div className="text-xs text-gray-400">ID: {value?.id || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'description',
      title: 'Description',
      sortable: false,
      filterable: true,
      render: (value) => (
        <div className="max-w-xs truncate" title={value}>
          {value || 'No description'}
        </div>
      )
    },
    {
      key: 'reference',
      title: 'Reference',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className="text-sm text-gray-600 font-mono">
          {value || 'N/A'}
        </span>
      )
    },
    {
      key: 'balance',
      title: 'Balance',
      sortable: true,
      filterable: false,
      render: (value) => (
        <span className="font-medium text-gray-900">
          ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
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
            <h3 className="text-sm font-medium text-red-800">Error loading transaction data</h3>
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
      {/* Search bar */}
      <div className="mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No transaction data available"
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
});

TransactionTable.propTypes = {
  className: PropTypes.string,
  onRowSelectionChange: PropTypes.func,
  initialFilters: PropTypes.object,
  initialSort: PropTypes.shape({
    field: PropTypes.string,
    direction: PropTypes.oneOf(['asc', 'desc'])
  })
};

export default TransactionTable;