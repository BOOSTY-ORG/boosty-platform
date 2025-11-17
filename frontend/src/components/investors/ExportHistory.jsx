import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, useNotification } from '../common/index.js';
import { investorsAPI } from '../../api/investors.js';
import { formatDate, formatFileSize } from '../../utils/formatters.js';

const ExportHistory = ({ isOpen, onClose }) => {
  const { showNotification } = useNotification();
  const [exports, setExports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    status: '',
    format: '',
    dateRange: { start: '', end: '' },
  });
  const [selectedExports, setSelectedExports] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load export history when modal opens
  useEffect(() => {
    if (isOpen) {
      loadExportHistory();
    }
  }, [isOpen, pagination.page, pagination.limit, filters]);

  const loadExportHistory = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };
      
      // Handle date range filter
      if (filters.dateRange.start && filters.dateRange.end) {
        params.dateFrom = filters.dateRange.start;
        params.dateTo = filters.dateRange.end;
        delete params.dateRange;
      }
      
      const response = await investorsAPI.getExportHistory(params);
      setExports(response.data.exports || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.total || 0,
      }));
    } catch (error) {
      console.error('Failed to load export history:', error);
      showNotification({
        type: 'error',
        message: 'Failed to load export history'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (exportItem) => {
    try {
      const response = await investorsAPI.downloadExportFile(exportItem._id);
      
      // Create download link
      const blob = new Blob([response.data], {
        type: getContentType(exportItem.format)
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', exportItem.fileName || `export_${exportItem._id}.${exportItem.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showNotification({
        type: 'success',
        message: 'Download started'
      });
    } catch (error) {
      console.error('Failed to download export:', error);
      showNotification({
        type: 'error',
        message: 'Failed to download export file'
      });
    }
  };

  const handleDelete = async (exportId) => {
    try {
      // Note: This endpoint might need to be implemented in the backend
      // For now, we'll just show a notification
      showNotification({
        type: 'info',
        message: 'Export deletion feature will be available soon'
      });
      setShowDeleteConfirm(false);
      setSelectedExports([]);
    } catch (error) {
      console.error('Failed to delete export:', error);
      showNotification({
        type: 'error',
        message: 'Failed to delete export'
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      // Note: This endpoint might need to be implemented in the backend
      // For now, we'll just show a notification
      showNotification({
        type: 'info',
        message: 'Bulk export deletion feature will be available soon'
      });
      setShowDeleteConfirm(false);
      setSelectedExports([]);
    } catch (error) {
      console.error('Failed to delete exports:', error);
      showNotification({
        type: 'error',
        message: 'Failed to delete exports'
      });
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSelectExport = (exportId) => {
    setSelectedExports(prev => 
      prev.includes(exportId)
        ? prev.filter(id => id !== exportId)
        : [...prev, exportId]
    );
  };

  const handleSelectAll = () => {
    if (selectedExports.length === exports.length) {
      setSelectedExports([]);
    } else {
      setSelectedExports(exports.map(exp => exp._id));
    }
  };

  const getContentType = (format) => {
    switch (format) {
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status] || statusStyles.pending}`}>
        {status?.charAt(0)?.toUpperCase() + status?.slice(1) || 'Unknown'}
      </span>
    );
  };

  const tableColumns = [
    {
      key: 'fileName',
      title: 'File Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{value || `export_${row._id}.${row.format}`}</div>
          <div className="text-sm text-gray-500">{row.format?.toUpperCase()}</div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'processing', label: 'Processing' },
        { value: 'pending', label: 'Pending' },
      ],
      render: (value) => getStatusBadge(value),
    },
    {
      key: 'scope',
      title: 'Scope',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-900 capitalize">{value}</span>
      ),
    },
    {
      key: 'recordCount',
      title: 'Records',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-900">{value?.toLocaleString() || 0}</span>
      ),
    },
    {
      key: 'fileSize',
      title: 'Size',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-900">{formatFileSize(value)}</span>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      sortable: true,
      filterable: true,
      filterType: 'date',
      render: (value) => (
        <span className="text-sm text-gray-900">{formatDate(value)}</span>
      ),
    },
    {
      key: 'completedAt',
      title: 'Completed',
      sortable: true,
      filterable: true,
      filterType: 'date',
      render: (value) => (
        <span className="text-sm text-gray-900">{value ? formatDate(value) : '-'}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          {row.status === 'completed' && (
            <button
              onClick={() => handleDownload(row)}
              className="text-primary-600 hover:text-primary-900 text-sm"
            >
              Download
            </button>
          )}
          {(row.status === 'failed' || row.status === 'cancelled') && (
            <button
              className="text-gray-400 text-sm cursor-not-allowed"
              disabled
            >
              N/A
            </button>
          )}
          {(row.status === 'completed' || row.status === 'failed' || row.status === 'cancelled') && (
            <>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => {
                  setSelectedExports([row._id]);
                  setShowDeleteConfirm(true);
                }}
                className="text-red-600 hover:text-red-900 text-sm"
              >
                Delete
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export History"
      size="full"
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="bg-white p-4 border rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select
                value={filters.format}
                onChange={(e) => handleFilterChange({ ...filters, format: e.target.value })}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">All Formats</option>
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV (.csv)</option>
                <option value="pdf">PDF (.pdf)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => handleFilterChange({ 
                  ...filters, 
                  dateRange: { ...filters.dateRange, start: e.target.value }
                })}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => handleFilterChange({ 
                  ...filters, 
                  dateRange: { ...filters.dateRange, end: e.target.value }
                })}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedExports.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {selectedExports.length} export(s) selected
              </span>
              <div className="space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedExports([])}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Selected
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Exports Table */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <Table
            columns={tableColumns}
            data={exports}
            loading={isLoading}
            emptyMessage="No export history found"
            selectable={true}
            selectedRows={selectedExports}
            onSelectionChange={setSelectedExports}
            sortable={true}
            filterable={true}
            pagination={true}
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.limit)}
            onPageChange={handlePageChange}
            rowsPerPage={pagination.limit}
          />
        </div>
      </div>

      {/* Modal Actions */}
      <div className="mt-6 flex justify-end space-x-3">
        <Button
          variant="secondary"
          onClick={onClose}
        >
          Close
        </Button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Confirm Delete"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete {selectedExports.length} export(s)? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleBulkDelete()}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default ExportHistory;