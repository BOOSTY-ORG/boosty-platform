import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvestor } from '../../context/InvestorContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters.js';
import { investorsAPI } from '../../api/investors.js';
import {
  Table,
  AdvancedFilterPanel,
  FilterPreset,
  DateRangePicker,
  Notification,
  useNotification
} from '../../components/common/index.js';
import {
  BulkActions,
  BulkEditModal,
  BulkKYCModal,
  BulkCommunicationModal,
  BulkOperationManager,
  ExportModal,
  ExportProgress,
  ExportHistory,
  ExportTemplate,
  CreateInvestorModal,
  EditInvestorModal,
  InvestorWizard
} from '../../components/investors/index.js';

const InvestorsPage = () => {
  const navigate = useNavigate();
  const {
    investors,
    isLoading,
    error,
    getInvestors,
    searchInvestors,
    updateInvestor,
    stats
  } = useInvestor();
  const { setPagination, setFilters, pagination, filters } = useApp();
  const { showNotification } = useNotification();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [selectedInvestors, setSelectedInvestors] = useState([]);
  const [sortFields, setSortFields] = useState([{ field: 'createdAt', direction: 'desc' }]);
  const [tableFilters, setTableFilters] = useState({});
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [visibleColumns, setVisibleColumns] = useState([
    'investor', 'contact', 'status', 'kycStatus', 'totalInvestment', 'joinedDate', 'actions'
  ]);
  
  // Bulk operation states
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showBulkKYCModal, setShowBulkKYCModal] = useState(false);
  const [showBulkCommunicationModal, setShowBulkCommunicationModal] = useState(false);
  const [showBulkOperationManager, setShowBulkOperationManager] = useState(false);
  
  // Export states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showExportProgress, setShowExportProgress] = useState(false);
  const [showExportHistory, setShowExportHistory] = useState(false);
  const [showExportTemplate, setShowExportTemplate] = useState(false);
  const [currentExportId, setCurrentExportId] = useState(null);
  
  // Form modal states
  const [showCreateInvestorModal, setShowCreateInvestorModal] = useState(false);
  const [showEditInvestorModal, setShowEditInvestorModal] = useState(false);
  const [showInvestorWizard, setShowInvestorWizard] = useState(false);
  const [selectedInvestorId, setSelectedInvestorId] = useState(null);

  // Available filters for advanced filter panel
  const availableFilters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'pending', label: 'Pending' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'suspended', label: 'Suspended' },
      ],
    },
    {
      key: 'kycStatus',
      label: 'KYC Status',
      type: 'select',
      options: [
        { value: 'verified', label: 'Verified' },
        { value: 'pending', label: 'Pending' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'not_submitted', label: 'Not Submitted' },
      ],
    },
    {
      key: 'investmentRange',
      label: 'Investment Range',
      type: 'number',
    },
    {
      key: 'joinedDate',
      label: 'Joined Date',
      type: 'daterange',
    },
    {
      key: 'hasEmail',
      label: 'Has Email',
      type: 'boolean',
    },
    {
      key: 'hasPhone',
      label: 'Has Phone',
      type: 'boolean',
    },
  ];

  // Table columns configuration
  const tableColumns = [
    {
      key: 'investor',
      title: 'Investor',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
              <span className="text-white font-medium">
                {row.firstName?.charAt(0)}{row.lastName?.charAt(0)}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {row.firstName} {row.lastName}
            </div>
            <div className="text-sm text-gray-500">
              ID: {row.investorId || row._id?.slice(-8)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      title: 'Contact',
      sortable: false,
      render: (value, row) => (
        <>
          <div className="text-sm text-gray-900">{row.email}</div>
          <div className="text-sm text-gray-500">{row.phone}</div>
        </>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'active', label: 'Active' },
        { value: 'pending', label: 'Pending' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'suspended', label: 'Suspended' },
      ],
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(value)}`}>
          {formatStatus(value)}
        </span>
      ),
    },
    {
      key: 'kycStatus',
      title: 'KYC Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'verified', label: 'Verified' },
        { value: 'pending', label: 'Pending' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'not_submitted', label: 'Not Submitted' },
      ],
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'verified' ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          value === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {formatStatus(value || 'not_submitted')}
        </span>
      ),
    },
    {
      key: 'totalInvestment',
      title: 'Total Investment',
      sortable: true,
      filterable: true,
      filterType: 'number',
      render: (value) => formatCurrency(value || 0),
    },
    {
      key: 'joinedDate',
      title: 'Joined Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      render: (value) => formatDate(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => navigate(`/investors/${row._id}`)}
            className="text-primary-600 hover:text-primary-900"
          >
            View
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => {
              setSelectedInvestorId(row._id);
              setShowEditInvestorModal(true);
            }}
            className="text-primary-600 hover:text-primary-900"
          >
            Edit
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => navigate(`/investors/${row._id}/kyc`)}
            className="text-primary-600 hover:text-primary-900"
          >
            KYC
          </button>
          <span className="text-gray-300">|</span>
          <div className="relative">
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                // Handle dropdown menu
              }}
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
        </div>
      ),
    },
  ];

  // Fetch investors on component mount and when filters change
  useEffect(() => {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      sort: sortFields,
      ...tableFilters,
      ...(dateRange.start && dateRange.end && { dateRange }),
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...filters,
    };
    
    if (searchQuery) {
      searchInvestors(searchQuery, params).then(response => {
        // Update pagination with total from response if available
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total
          }));
        }
      });
    } else {
      getInvestors(params).then(response => {
        // Update pagination with total from response if available
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total
          }));
        }
      });
    }
  }, [pagination.page, pagination.limit, statusFilter, filters, searchQuery, sortFields, tableFilters, dateRange]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
  };

  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination({ ...pagination, page: 1 });
  };

  // Handle table sort
  const handleTableSort = (sortData) => {
    if (Array.isArray(sortData)) {
      setSortFields(sortData);
    } else {
      setSortFields([{ field: sortData.field, direction: sortData.direction }]);
    }
    setPagination({ ...pagination, page: 1 });
  };

  // Handle table filter
  const handleTableFilter = (filterData) => {
    setTableFilters(filterData);
    setPagination({ ...pagination, page: 1 });
  };

  // Handle date range change
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setPagination({ ...pagination, page: 1 });
  };

  // Handle export
  const handleExport = () => {
    setShowExportModal(true);
  };

  // Handle export with advanced options
  const handleAdvancedExport = async (exportOptions) => {
    try {
      const response = await investorsAPI.exportInvestorsAdvanced(exportOptions);
      
      // For large exports, the response might contain an export ID instead of file data
      if (response.data?.exportId) {
        setCurrentExportId(response.data.exportId);
        setShowExportProgress(true);
        setShowExportModal(false);
      } else {
        // Direct download for small exports
        const blob = new Blob([response.data], {
          type: getContentType(exportOptions.format)
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `investors_export_${new Date().toISOString().split('T')[0]}.${exportOptions.format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        showNotification({
          type: 'success',
          message: `Export completed successfully`
        });
        setShowExportModal(false);
      }
    } catch (error) {
      console.error('Export failed:', error);
      showNotification({
        type: 'error',
        message: 'Export failed. Please try again.'
      });
    }
  };

  // Handle export completion
  const handleExportComplete = (exportStatus) => {
    setShowExportProgress(false);
    setCurrentExportId(null);
    
    if (exportStatus.status === 'completed') {
      showNotification({
        type: 'success',
        message: 'Export completed successfully'
      });
    }
  };

  // Get content type for export format
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

  // Handle status update
  const handleStatusUpdate = async (investorId, newStatus) => {
    try {
      await updateInvestor(investorId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update investor status:', error);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
  };

  // Handle investor selection
  const handleSelectInvestor = (investorId) => {
    setSelectedInvestors(prev => 
      prev.includes(investorId)
        ? prev.filter(id => id !== investorId)
        : [...prev, investorId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedInvestors.length === investors.length) {
      setSelectedInvestors([]);
    } else {
      setSelectedInvestors(investors.map(inv => inv._id));
    }
  };

  // Bulk operation handlers
  const handleBulkEdit = (investorIds) => {
    setSelectedInvestors(investorIds);
    setShowBulkEditModal(true);
  };

  const handleBulkKYC = (investorIds) => {
    setSelectedInvestors(investorIds);
    setShowBulkKYCModal(true);
  };

  const handleBulkCommunication = (investorIds) => {
    setSelectedInvestors(investorIds);
    setShowBulkCommunicationModal(true);
  };

  const handleBulkExport = async (investorIds) => {
    try {
      const response = await investorsAPI.bulkExportInvestors(investorIds);
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `selected_investors_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showNotification({
        type: 'success',
        message: `Successfully exported ${investorIds.length} investor(s)`
      });
    } catch (error) {
      console.error('Export failed:', error);
      showNotification({
        type: 'error',
        message: 'Failed to export investors'
      });
    }
  };

  const handleBulkStatusUpdate = async (investorIds, status) => {
    try {
      await investorsAPI.bulkUpdateInvestors(investorIds, { status });
      
      showNotification({
        type: 'success',
        message: `Successfully updated status to ${status} for ${investorIds.length} investor(s)`
      });
      
      // Refresh the investors list
      getInvestors({
        page: pagination.page,
        limit: pagination.limit,
        sort: sortFields,
        ...tableFilters,
        ...(dateRange.start && dateRange.end && { dateRange }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...filters,
      });
      
      // Clear selection
      setSelectedInvestors([]);
    } catch (error) {
      console.error('Failed to update status:', error);
      showNotification({
        type: 'error',
        message: 'Failed to update investor status'
      });
    }
  };

  const handleBulkAssign = (investorIds) => {
    // This would open a modal for assigning to team members
    // For now, we'll just show a notification
    showNotification({
      type: 'info',
      message: 'Bulk assignment feature coming soon'
    });
  };

  const handleBulkDelete = async (investorIds) => {
    try {
      await investorsAPI.bulkDeleteInvestors(investorIds);
      
      showNotification({
        type: 'success',
        message: `Successfully deleted ${investorIds.length} investor(s)`
      });
      
      // Refresh the investors list
      getInvestors({
        page: pagination.page,
        limit: pagination.limit,
        sort: sortFields,
        ...tableFilters,
        ...(dateRange.start && dateRange.end && { dateRange }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...filters,
      });
      
      // Clear selection
      setSelectedInvestors([]);
    } catch (error) {
      console.error('Failed to delete investors:', error);
      showNotification({
        type: 'error',
        message: 'Failed to delete investors'
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedInvestors([]);
  };

  // Bulk operation success handlers
  const handleBulkEditSuccess = (result) => {
    showNotification({
      type: 'success',
      message: result.message
    });
    
    // Refresh the investors list
    getInvestors({
      page: pagination.page,
      limit: pagination.limit,
      sort: sortFields,
      ...tableFilters,
      ...(dateRange.start && dateRange.end && { dateRange }),
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...filters,
    });
    
    // Clear selection
    setSelectedInvestors([]);
    setShowBulkEditModal(false);
  };

  const handleBulkEditError = (error) => {
    showNotification({
      type: 'error',
      message: error
    });
  };

  const handleBulkKYCSuccess = (result) => {
    showNotification({
      type: 'success',
      message: result.message
    });
    
    // Refresh the investors list
    getInvestors({
      page: pagination.page,
      limit: pagination.limit,
      sort: sortFields,
      ...tableFilters,
      ...(dateRange.start && dateRange.end && { dateRange }),
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...filters,
    });
    
    // Clear selection
    setSelectedInvestors([]);
    setShowBulkKYCModal(false);
  };

  const handleBulkKYCError = (error) => {
    showNotification({
      type: 'error',
      message: error
    });
  };

  const handleBulkCommunicationSuccess = (result) => {
    showNotification({
      type: 'success',
      message: result.message
    });
    
    setShowBulkCommunicationModal(false);
  };

  const handleBulkCommunicationError = (error) => {
    showNotification({
      type: 'error',
      message: error
    });
  };

  // Get status badge styling
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading && !investors.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            Investors
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage and monitor investor accounts and activities.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <button
            type="button"
            onClick={() => setShowCreateInvestorModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Add Investor
          </button>
          <button
            type="button"
            onClick={() => setShowInvestorWizard(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Investor Wizard
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Investors</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalInvestors || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Investors</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.activeInvestors || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending KYC</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.pendingKYC || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267.653-.235.932.054l1.162.382.096.048.177.08.533.134.867-.046.795-.331 1.519-.211.548-.474.916-.658.798-.499 1.395-.565 1.639-.405.439.406.699.406.699 0 1.002-.406 1.002-.406 0 .193-.031.433-.046.699-.046.345 0 .504-.054.699-.161.445-.251.802-.517 1.102-.934.705-.712 1.158-1.85.102-.267-.35-.577-.534-.933-.702-.526-.39-1.188-.39-1.188 0-.41.025-.802.072-1.188.39a1.75 1.75 0 01-.713.565c-.405.224-.84.285-1.175.285-.46 0-.905-.084-1.33-.235C8.66 7.942 7.854 8.8 6.775c-.089-.897.716-1.783 1.8-2.683.084-.9.168-.657.168-1.657v-5c0-1.11.9-2 2-2h8c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2v-5z"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Investments</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(stats.totalInvestments || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="search" className="sr-only">Search investors</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="search"
                    id="search"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Search by name, email, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <select
                  id="status-filter"
                  name="status-filter"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                
                <DateRangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  label="Date Range"
                  className="flex-shrink-0"
                />
                
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Advanced
                </button>
                
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={() => setShowPresets(!showPresets)}
                >
                  <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Presets
                </button>
                
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={handleExport}
                >
                  <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={() => setShowExportHistory(true)}
                >
                  <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Export History
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={() => setShowExportTemplate(true)}
                >
                  <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Templates
                </button>
                
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="mb-6">
          <AdvancedFilterPanel
            filters={{ ...tableFilters, ...(dateRange.start && dateRange.end && { dateRange }) }}
            onFiltersChange={(filters) => {
              const { dateRange: newDateRange, ...otherFilters } = filters;
              if (newDateRange) {
                setDateRange(newDateRange);
              }
              setTableFilters(otherFilters);
            }}
            availableFilters={availableFilters}
          />
        </div>
      )}

      {/* Filter Presets Panel */}
      {showPresets && (
        <div className="mb-6">
          <FilterPreset
            filters={{ ...tableFilters, ...(dateRange.start && dateRange.end && { dateRange }) }}
            onFiltersChange={(filters) => {
              const { dateRange: newDateRange, ...otherFilters } = filters;
              if (newDateRange) {
                setDateRange(newDateRange);
              }
              setTableFilters(otherFilters);
            }}
            availableFilters={availableFilters}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading investors</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      <BulkActions
        selectedInvestors={selectedInvestors}
        onBulkEdit={handleBulkEdit}
        onBulkKYC={handleBulkKYC}
        onBulkCommunication={handleBulkCommunication}
        onBulkExport={handleBulkExport}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkAssign={handleBulkAssign}
        onBulkDelete={handleBulkDelete}
        onClearSelection={handleClearSelection}
      />

      {/* Investors Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Investors ({investors.length})
            </h3>
            <div className="flex items-center space-x-2">
              {selectedInvestors.length > 0 && (
                <span className="text-sm text-gray-500">
                  {selectedInvestors.length} selected
                </span>
              )}
              <button
                type="button"
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => setShowBulkOperationManager(true)}
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287a1.532 1.532 0 010 2.954c1.008.245 1.487 1.401.947 2.287-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.836-1.372 2.742-1.372 3.578 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 010-2.954c-1.008-.245-1.487-1.401-.947-2.287.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947c-.836 1.372-2.742 1.372-3.578 0a1.532 1.532 0 01-2.287.947c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M15 8a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Operations
              </button>
            </div>
          </div>
        </div>
        
        <Table
          columns={tableColumns}
          data={investors}
          loading={isLoading}
          emptyMessage={searchQuery ? 'No investors found matching your search criteria' : 'No investors found'}
          selectable={true}
          selectedRows={selectedInvestors}
          onSelectionChange={setSelectedInvestors}
          sortable={true}
          onSort={handleTableSort}
          multiColumnSort={true}
          filterable={true}
          onFilter={handleTableFilter}
          columnVisibility={true}
          defaultVisibleColumns={visibleColumns}
          pagination={true}
          currentPage={pagination.page}
          totalPages={Math.ceil((pagination.total || 0) / pagination.limit)}
          onPageChange={handlePageChange}
          rowsPerPage={pagination.limit}
        />
      </div>

      {/* Bulk Operation Modals */}
      <BulkEditModal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        investorIds={selectedInvestors}
        onSuccess={handleBulkEditSuccess}
        onError={handleBulkEditError}
      />

      <BulkKYCModal
        isOpen={showBulkKYCModal}
        onClose={() => setShowBulkKYCModal(false)}
        investorIds={selectedInvestors}
        onSuccess={handleBulkKYCSuccess}
        onError={handleBulkKYCError}
      />

      <BulkCommunicationModal
        isOpen={showBulkCommunicationModal}
        onClose={() => setShowBulkCommunicationModal(false)}
        investorIds={selectedInvestors}
        onSuccess={handleBulkCommunicationSuccess}
        onError={handleBulkCommunicationError}
      />

      <BulkOperationManager
        isOpen={showBulkOperationManager}
        onClose={() => setShowBulkOperationManager(false)}
      />

      {/* Export Modals */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        investorIds={selectedInvestors}
        currentFilters={{
          sort: sortFields,
          ...tableFilters,
          ...(dateRange.start && dateRange.end && { dateRange }),
          ...(statusFilter !== 'all' && { status: statusFilter }),
          ...filters,
        }}
        onExport={handleAdvancedExport}
      />

      <ExportProgress
        isOpen={showExportProgress}
        onClose={() => setShowExportProgress(false)}
        exportId={currentExportId}
        onComplete={handleExportComplete}
      />

      <ExportHistory
        isOpen={showExportHistory}
        onClose={() => setShowExportHistory(false)}
      />

      <ExportTemplate
        isOpen={showExportTemplate}
        onClose={() => setShowExportTemplate(false)}
        onTemplateSelect={(template) => {
          // Apply template to export modal
          setShowExportTemplate(false);
          setShowExportModal(true);
        }}
      />

      {/* Investor Form Modals */}
      <CreateInvestorModal
        isOpen={showCreateInvestorModal}
        onClose={() => setShowCreateInvestorModal(false)}
        onSuccess={(newInvestor) => {
          // Refresh the investors list
          getInvestors({
            page: pagination.page,
            limit: pagination.limit,
            sort: sortFields,
            ...tableFilters,
            ...(dateRange.start && dateRange.end && { dateRange }),
            ...(statusFilter !== 'all' && { status: statusFilter }),
            ...filters,
          });
        }}
      />

      <EditInvestorModal
        isOpen={showEditInvestorModal}
        onClose={() => {
          setShowEditInvestorModal(false);
          setSelectedInvestorId(null);
        }}
        onSuccess={(updatedInvestor) => {
          // Refresh the investors list
          getInvestors({
            page: pagination.page,
            limit: pagination.limit,
            sort: sortFields,
            ...tableFilters,
            ...(dateRange.start && dateRange.end && { dateRange }),
            ...(statusFilter !== 'all' && { status: statusFilter }),
            ...filters,
          });
        }}
        investorId={selectedInvestorId}
      />

      <InvestorWizard
        isOpen={showInvestorWizard}
        onClose={() => setShowInvestorWizard(false)}
        onSuccess={(newInvestor) => {
          // Refresh the investors list
          getInvestors({
            page: pagination.page,
            limit: pagination.limit,
            sort: sortFields,
            ...tableFilters,
            ...(dateRange.start && dateRange.end && { dateRange }),
            ...(statusFilter !== 'all' && { status: statusFilter }),
            ...filters,
          });
        }}
      />
    </div>
  );
};

export default InvestorsPage;