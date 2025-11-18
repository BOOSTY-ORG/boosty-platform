import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters.js';
import Table from '../../components/common/Table.jsx';
import AdvancedFilterPanel from '../../components/common/AdvancedFilterPanel.jsx';
import FilterPreset from '../../components/common/FilterPreset.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import BulkActions from '../../components/users/BulkActions.jsx';
import BulkEditModal from '../../components/users/BulkEditModal.jsx';
import BulkCommunicationModal from '../../components/users/BulkCommunicationModal.jsx';
import BulkKYCModal from '../../components/users/BulkKYCModal.jsx';
import BulkOperationManager from '../../components/users/BulkOperationManager.jsx';
import ExportModal from '../../components/users/ExportModal.jsx';
import ExportHistory from '../../components/users/ExportHistory.jsx';
import ExportTemplate from '../../components/users/ExportTemplate.jsx';
import ExportScheduler from '../../components/users/ExportScheduler.jsx';

const UsersPage = () => {
  const navigate = useNavigate();
  const {
    users,
    isLoading,
    error,
    getUsers,
    searchUsers,
    updateUser,
    userStats,
    saveFilterPreset,
    loadFilterPreset,
    getColumnConfiguration,
    saveColumnConfiguration,
    filterPresets,
    columnConfigurations,
    // KYC filtering and sorting functions
    kycFilters,
    kycSort,
    setKYCFilters,
    updateKYCFilter,
    clearKYCFilters,
    setKYCSort,
    resetKYCSort,
    getUsersWithKYCFilters,
    getKYCStats,
    // Bulk operations
    selectedUsers,
    setSelectedUsers,
    clearSelectedUsers,
    showBulkEditModal,
    hideBulkEditModal,
    showBulkCommunicationModal,
    hideBulkCommunicationModal,
    showBulkKYCModal,
    hideBulkKYCModal,
    showBulkOperationManager,
    hideBulkOperationManager,
    bulkUpdateUsers,
    bulkSendCommunication,
    bulkVerifyKYC,
    bulkRejectKYC,
    bulkRequestDocuments,
    bulkFlagForReview,
    bulkSetRiskLevel,
    bulkUpdateStatus,
    bulkExportUsers,
    bulkDeleteUsers,
    bulkAssignToTeam,
    getBulkOperationHistory,
    getOperationQueueStatus,
    // Export functionality
    createExport,
    getExportStatus,
    downloadExport,
    cancelExport,
    getExportHistory,
    deleteExport,
    getExportAnalytics,
    // Export templates
    getExportTemplates,
    getExportTemplate,
    createExportTemplate,
    updateExportTemplate,
    deleteExportTemplate,
    duplicateExportTemplate,
    setDefaultTemplate,
    getDefaultTemplate,
    getPublicTemplates,
    getTemplateStats,
    // Scheduled exports
    getScheduledExports,
    getScheduledExport,
    createScheduledExport,
    updateScheduledExport,
    deleteScheduledExport,
    toggleScheduledExport,
    runScheduledExport,
    getScheduledExportHistory,
    getScheduledExportStats
  } = useUser();
  const { setPagination, setFilters, pagination, filters } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showBulkOperationManagerState, setShowBulkOperationManagerState] = useState(false);
  const [sortConfig, setSortConfig] = useState({ field: 'createdAt', direction: 'desc' });
  const [activeFilters, setActiveFilters] = useState({});
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // KYC filtering state
  const [kycStatusFilter, setKycStatusFilter] = useState('all');
  const [kycSubmissionDateRange, setKycSubmissionDateRange] = useState({ start: '', end: '' });
  const [kycVerificationDateRange, setKycVerificationDateRange] = useState({ start: '', end: '' });
  const [kycLastUpdatedRange, setKycLastUpdatedRange] = useState({ start: '', end: '' });
  const [kycSortField, setKycSortField] = useState('createdAt');
  const [kycSortDirection, setKycSortDirection] = useState('desc');
  
  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showExportHistory, setShowExportHistory] = useState(false);
  const [showExportTemplate, setShowExportTemplate] = useState(false);
  const [showExportScheduler, setShowExportScheduler] = useState(false);
  const [currentExportData, setCurrentExportData] = useState(null);
  
  // Debounce search query
  const debouncedQuery = useDebounce(searchQuery, 500);
  useEffect(() => {
    setDebouncedSearchQuery(debouncedQuery);
  }, [debouncedQuery]);

  // Define available filters for advanced filtering
  const availableFilters = useMemo(() => [
    {
      key: 'status',
      label: 'User Status',
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
        { value: 'not_started', label: 'Not Started' },
      ],
    },
    {
      key: 'applicationStatus',
      label: 'Application Status',
      type: 'select',
      options: [
        { value: 'submitted', label: 'Submitted' },
        { value: 'under_review', label: 'Under Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ],
    },
    {
      key: 'installationStatus',
      label: 'Installation Status',
      type: 'select',
      options: [
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    {
      key: 'dateRange',
      label: 'Registration Date',
      type: 'daterange',
    },
    {
      key: 'kycSubmissionDateRange',
      label: 'KYC Submission Date',
      type: 'daterange',
    },
    {
      key: 'kycVerificationDateRange',
      label: 'KYC Verification Date',
      type: 'daterange',
    },
    {
      key: 'kycLastUpdatedRange',
      label: 'KYC Last Updated',
      type: 'daterange',
    },
    {
      key: 'hasApplication',
      label: 'Has Application',
      type: 'boolean',
    },
    {
      key: 'hasInstallation',
      label: 'Has Installation',
      type: 'boolean',
    },
  ], []);

  // Define table columns
  const tableColumns = useMemo(() => [
    {
      key: 'user',
      title: 'User',
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
              ID: {row.userId || row._id?.slice(-8)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      title: 'Email',
      sortable: true,
      filterable: true,
      filterType: 'text',
    },
    {
      key: 'phone',
      title: 'Phone',
      sortable: false,
      filterable: true,
      filterType: 'text',
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
      key: 'applicationStatus',
      title: 'Application',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'submitted', label: 'Submitted' },
        { value: 'under_review', label: 'Under Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ],
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'approved' ? 'bg-green-100 text-green-800' :
          value === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
          value === 'submitted' ? 'bg-blue-100 text-blue-800' :
          value === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {formatStatus(value || 'not_submitted')}
        </span>
      ),
    },
    {
      key: 'installationStatus',
      title: 'Installation',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'completed' ? 'bg-green-100 text-green-800' :
          value === 'in_progress' ? 'bg-blue-100 text-blue-800' :
          value === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
          value === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {formatStatus(value || 'not_started')}
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
        { value: 'not_started', label: 'Not Started' },
      ],
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'verified' ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          value === 'rejected' ? 'bg-red-100 text-red-800' :
          value === 'not_started' ? 'bg-gray-100 text-gray-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value === 'verified' ? 'Verified' :
           value === 'pending' ? 'Pending' :
           value === 'rejected' ? 'Rejected' :
           value === 'not_started' ? 'Not Started' :
           'Unknown'}
        </span>
      ),
    },
    {
      key: 'kycLastUpdated',
      title: 'KYC Last Updated',
      sortable: true,
      filterable: true,
      filterType: 'date',
      render: (value) => value ? formatDate(value) : 'N/A',
    },
    {
      key: 'createdAt',
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
            onClick={() => navigate(`/users/${row._id}`)}
            className="text-primary-600 hover:text-primary-900"
          >
            View
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => navigate(`/users/${row._id}/application`)}
            className="text-primary-600 hover:text-primary-900"
          >
            Application
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => navigate(`/users/${row._id}/installation`)}
            className="text-primary-600 hover:text-primary-900"
          >
            Installation
          </button>
        </div>
      ),
    },
  ], []);

  // Fetch users on component mount and when filters, search, or sort change
  useEffect(() => {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      sort: sortConfig.field,
      sortDirection: sortConfig.direction,
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...activeFilters,
    };
    
    // Add KYC filters and sort if they're set
    if (kycFilters && Object.keys(kycFilters).length > 0) {
      params.kycFilters = kycFilters;
    }
    
    if (kycSort && kycSort.field) {
      params.kycSort = kycSort;
    }
    
    if (debouncedSearchQuery) {
      searchUsers(debouncedSearchQuery, params);
    } else {
      getUsers(params);
    }
  }, [pagination.page, pagination.limit, statusFilter, activeFilters, debouncedSearchQuery, sortConfig, kycFilters, kycSort]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
  };

  // Handle filter change
  const handleFilterChange = useCallback((newFilters) => {
    // Handle KYC date range filters separately
    const updatedKycSubmissionDateRange = {
      start: newFilters.kycSubmissionDateRange?.start || '',
      end: newFilters.kycSubmissionDateRange?.end || ''
    };
    const updatedKycVerificationDateRange = {
      start: newFilters.kycVerificationDateRange?.start || '',
      end: newFilters.kycVerificationDateRange?.end || ''
    };
    const updatedKycLastUpdatedRange = {
      start: newFilters.kycLastUpdatedRange?.start || '',
      end: newFilters.kycLastUpdatedRange?.end || ''
    };
    
    setKycSubmissionDateRange(updatedKycSubmissionDateRange);
    setKycVerificationDateRange(updatedKycVerificationDateRange);
    setKycLastUpdatedRange(updatedKycLastUpdatedRange);
    
    // Update KYC status filter if present
    if (newFilters.kycStatus) {
      setKycStatusFilter(newFilters.kycStatus);
    }
    
    setActiveFilters(newFilters);
    handleKYCFilterChange();
    setPagination({ ...pagination, page: 1 });
  }, [pagination, handleKYCFilterChange]);

  // Handle KYC filter changes
  const handleKYCFilterChange = useCallback(() => {
    const kycFilters = {
      ...(kycStatusFilter !== 'all' && { kycStatus: kycStatusFilter }),
      ...(kycSubmissionDateRange.start && { kycSubmissionDateFrom: kycSubmissionDateRange.start }),
      ...(kycSubmissionDateRange.end && { kycSubmissionDateTo: kycSubmissionDateRange.end }),
      ...(kycVerificationDateRange.start && { kycVerificationDateFrom: kycVerificationDateRange.start }),
      ...(kycVerificationDateRange.end && { kycVerificationDateTo: kycVerificationDateRange.end }),
      ...(kycLastUpdatedRange.start && { kycLastUpdatedFrom: kycLastUpdatedRange.start }),
      ...(kycLastUpdatedRange.end && { kycLastUpdatedTo: kycLastUpdatedRange.end }),
    };
    
    setKYCFilters(kycFilters);
    setPagination({ ...pagination, page: 1 });
  }, [kycStatusFilter, kycSubmissionDateRange, kycVerificationDateRange, kycLastUpdatedRange, setKYCFilters, pagination]);

  // Handle KYC sort change
  const handleKYCSortChange = useCallback((field) => {
    const newDirection = kycSortField === field && kycSortDirection === 'asc' ? 'desc' : 'asc';
    setKycSortField(field);
    setKycSortDirection(newDirection);
    setKYCSort({ field, direction: newDirection });
    setPagination({ ...pagination, page: 1 });
  }, [kycSortField, kycSortDirection, setKYCSort, pagination]);

  // Handle sort change
  const handleSort = useCallback((field, direction) => {
    setSortConfig({ field, direction });
    setPagination({ ...pagination, page: 1 });
  }, [pagination]);

  // Handle filter preset operations
  const handleSavePreset = useCallback(async (presetName) => {
    await saveFilterPreset(presetName, activeFilters);
  }, [activeFilters, saveFilterPreset]);

  const handleLoadPreset = useCallback((preset) => {
    loadFilterPreset(preset);
    setActiveFilters(preset.filters);
    setPagination({ ...pagination, page: 1 });
  }, [loadFilterPreset, pagination]);

  // Handle filter preset operations
  const handleUpdateFilterPreset = useCallback(async (presetId, filters) => {
    await updateFilterPreset(presetId, filters);
  }, [updateFilterPreset]);

  const handleDeleteFilterPreset = useCallback(async (presetId) => {
    await deleteFilterPreset(presetId);
  }, [deleteFilterPreset]);

  // Handle column configuration
  const handleColumnConfigurationChange = useCallback(async (columnConfig) => {
    await saveColumnConfiguration('users', columnConfig);
  }, [saveColumnConfiguration]);

  // Export functionality
  const handleExport = useCallback(async (exportData) => {
    try {
      const params = {
        ...exportData,
        filters: {
          ...activeFilters,
          ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
          sort: sortConfig.field,
          sortDirection: sortConfig.direction,
        },
        selectedUsers: selectedUsers.length > 0 ? selectedUsers : undefined,
      };
      
      const response = await createExport(params);
      
      if (response.success) {
        // Show success message or redirect to export history
        console.log('Export started:', response.data.exportId);
        setShowExportModal(false);
        // Optionally show progress tracking
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [activeFilters, debouncedSearchQuery, sortConfig, selectedUsers, createExport]);

  // Handle advanced export
  const handleAdvancedExport = useCallback(() => {
    setCurrentExportData({
      filters: activeFilters,
      search: debouncedSearchQuery,
      sort: sortConfig,
      selectedUsers: selectedUsers.length > 0 ? selectedUsers : undefined,
    });
    setShowExportModal(true);
  }, [activeFilters, debouncedSearchQuery, sortConfig, selectedUsers]);

  // Handle export history
  const handleExportHistory = useCallback(() => {
    setShowExportHistory(true);
  }, []);

  // Handle export templates
  const handleExportTemplates = useCallback(() => {
    setShowExportTemplate(true);
  }, []);

  // Handle export scheduler
  const handleExportScheduler = useCallback(() => {
    setShowExportScheduler(true);
  }, []);

  // Handle status update
  const handleStatusUpdate = async (userId, newStatus) => {
    try {
      await updateUser(userId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
  };

  // Handle user selection
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      clearSelectedUsers();
    } else {
      setSelectedUsers(users.map(user => user._id));
    }
  };

  // Bulk operation handlers
  const handleBulkEdit = () => {
    showBulkEditModal();
  };

  const handleBulkKYC = () => {
    showBulkKYCModal();
  };

  const handleBulkCommunication = () => {
    showBulkCommunicationModal();
  };

  const handleBulkExport = () => {
    setCurrentExportData({
      selectedUsers,
      filters: activeFilters,
      search: debouncedSearchQuery,
      sort: sortConfig,
    });
    setShowExportModal(true);
  };

  const handleBulkStatusUpdate = async (userIds, status) => {
    await bulkUpdateStatus(userIds, status);
    clearSelectedUsers();
  };

  const handleBulkAssign = () => {
    // This would typically open a modal for team assignment
    // For now, we'll just show a simple prompt
    const team = prompt('Enter team name to assign users to:');
    if (team) {
      bulkAssignToTeam(selectedUsers, { team });
      clearSelectedUsers();
    }
  };

  const handleBulkDelete = async (userIds) => {
    await bulkDeleteUsers(userIds);
  };

  const handleClearSelection = () => {
    clearSelectedUsers();
  };

  const handleShowOperationManager = () => {
    setShowBulkOperationManagerState(true);
    getBulkOperationHistory();
    getOperationQueueStatus();
  };

  const handleHideOperationManager = () => {
    setShowBulkOperationManagerState(false);
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

  if (isLoading && !users.length) {
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
            Users
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage and monitor user accounts, applications, and installations.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Add User
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {userStats && (
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{userStats.totalUsers || 0}</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{userStats.activeUsers || 0}</dd>
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
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Applications</dt>
                    <dd className="text-lg font-medium text-gray-900">{userStats.pendingApplications || 0}</dd>
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
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed Installations</dt>
                    <dd className="text-lg font-medium text-gray-900">{userStats.completedInstallations || 0}</dd>
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
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <label htmlFor="search" className="sr-only">Search users</label>
                <input
                  type="text"
                  name="search"
                  id="search"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <div className="flex gap-2">
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
                
                <select
                  id="kyc-status-filter"
                  name="kyc-status-filter"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  value={kycStatusFilter}
                  onChange={(e) => {
                    setKycStatusFilter(e.target.value);
                    handleKYCFilterChange();
                  }}
                >
                  <option value="all">All KYC Status</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="not_started">Not Started</option>
                </select>
                
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters
                </button>
                
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Search
                </button>
              </div>
            </div>
            
            {showFilters && (
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label htmlFor="date-from" className="block text-sm font-medium text-gray-700">
                      Date From
                    </label>
                    <input
                      type="date"
                      id="date-from"
                      name="date-from"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="date-to" className="block text-sm font-medium text-gray-700">
                      Date To
                    </label>
                    <input
                      type="date"
                      id="date-to"
                      name="date-to"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="application-status" className="block text-sm font-medium text-gray-700">
                      Application Status
                    </label>
                    <select
                      id="application-status"
                      name="application-status"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">Any</option>
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="installation-status" className="block text-sm font-medium text-gray-700">
                      Installation Status
                    </label>
                    <select
                      id="installation-status"
                      name="installation-status"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">Any</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

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
              <h3 className="text-sm font-medium text-red-800">Error loading users</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filter Panel */}
      {showFilters && (
        <AdvancedFilterPanel
          filters={activeFilters}
          onFiltersChange={handleFilterChange}
          availableFilters={availableFilters}
          className="mb-6"
        />
      )}

      {/* Filter Presets */}
      {showPresets && (
        <FilterPreset
          filters={activeFilters}
          onFiltersChange={handleFilterChange}
          availableFilters={availableFilters}
          className="mb-6"
          presets={filterPresets}
          onSavePreset={handleSavePreset}
          onUpdatePreset={handleUpdateFilterPreset}
          onDeletePreset={handleDeleteFilterPreset}
          onLoadPreset={handleLoadPreset}
        />
      )}

      {/* Bulk Actions */}
      <BulkActions
        selectedUsers={selectedUsers}
        onBulkEdit={handleBulkEdit}
        onBulkKYC={handleBulkKYC}
        onBulkCommunication={handleBulkCommunication}
        onBulkExport={handleBulkExport}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkAssign={handleBulkAssign}
        onBulkDelete={handleBulkDelete}
        onClearSelection={handleClearSelection}
      />

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Users ({users.length})
            </h3>
            <div className="flex items-center space-x-2">
              {/* Export Button */}
              <div className="relative">
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={() => setShowColumnSettings(!showColumnSettings)}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
                {showColumnSettings && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1">
                      <button
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={() => handleExport({ format: 'csv' })}
                      >
                        Quick Export as CSV
                      </button>
                      <button
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={() => handleExport({ format: 'excel' })}
                      >
                        Quick Export as Excel
                      </button>
                      <button
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={() => handleExport({ format: 'pdf' })}
                      >
                        Quick Export as PDF
                      </button>
                      <div className="border-t border-gray-100"></div>
                      <button
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={handleAdvancedExport}
                      >
                        Advanced Export...
                      </button>
                      <button
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={handleExportHistory}
                      >
                        Export History
                      </button>
                      <button
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={handleExportTemplates}
                      >
                        Export Templates
                      </button>
                      <button
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={handleExportScheduler}
                      >
                        Scheduled Exports
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Filter Presets Button */}
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={() => setShowPresets(!showPresets)}
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Presets
              </button>

              {/* Bulk Operations Manager Button */}
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={handleShowOperationManager}
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2zM9 4a1 1 0 000 2v6a1 1 0 002 2h2a1 1 0 002-2V6a1 1 0 00-2-2H9z" />
                </svg>
                Bulk Operations
              </button>

              {selectedUsers.length > 0 && (
                <>
                  <span className="text-sm text-gray-500">
                    {selectedUsers.length} selected
                  </span>
                  <button
                    type="button"
                    className="text-sm text-red-600 hover:text-red-900"
                    onClick={() => setSelectedUsers([])}
                  >
                    Clear selection
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <Table
          columns={tableColumns}
          data={users}
          loading={isLoading}
          emptyMessage={searchQuery || Object.keys(activeFilters).length > 0
            ? 'No users found matching your criteria'
            : 'No users found. Get started by adding a new user.'
          }
          selectable={true}
          selectedRows={selectedUsers}
          onSelectionChange={setSelectedUsers}
          sortable={true}
          onSort={(field, direction) => {
            // Handle KYC columns separately
            if (field === 'kycStatus' || field === 'kycLastUpdated') {
              handleKYCSortChange(field);
            } else {
              handleSort(field, direction);
            }
          }}
          defaultSortField={sortConfig.field}
          defaultSortDirection={sortConfig.direction}
          filterable={true}
          onFilter={handleFilterChange}
          columnVisibility={true}
          pagination={true}
          currentPage={pagination.page}
          totalPages={Math.ceil((pagination.total || users.length) / pagination.limit)}
          onPageChange={handlePageChange}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={(newLimit) => setPagination({ ...pagination, limit: newLimit, page: 1 })}
          savedColumnConfigurations={columnConfigurations.users ? [columnConfigurations.users] : []}
          onSaveColumnConfiguration={handleColumnConfigurationChange}
          onLoadColumnConfiguration={handleLoadPreset}
          exportable={true}
          onExport={handleExport}
        />
      </div>

      {/* Bulk Operation Modals */}
      <BulkEditModal
        isOpen={showBulkEditModal}
        onClose={hideBulkEditModal}
        userIds={selectedUsers}
        onSuccess={() => {
          hideBulkEditModal();
          getUsers(); // Refresh users list
        }}
        onError={(error) => {
          console.error('Bulk edit failed:', error);
        }}
      />

      <BulkCommunicationModal
        isOpen={showBulkCommunicationModal}
        onClose={hideBulkCommunicationModal}
        userIds={selectedUsers}
        onSuccess={() => {
          hideBulkCommunicationModal();
        }}
        onError={(error) => {
          console.error('Bulk communication failed:', error);
        }}
      />

      <BulkKYCModal
        isOpen={showBulkKYCModal}
        onClose={hideBulkKYCModal}
        userIds={selectedUsers}
        onSuccess={() => {
          hideBulkKYCModal();
          getUsers(); // Refresh users list
        }}
        onError={(error) => {
          console.error('Bulk KYC operation failed:', error);
        }}
      />

      <BulkOperationManager
        isOpen={showBulkOperationManagerState}
        onClose={handleHideOperationManager}
      />

      {/* Export Modals */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        initialData={currentExportData}
        users={users}
        selectedUsers={selectedUsers}
        filters={activeFilters}
        searchQuery={debouncedSearchQuery}
        sortConfig={sortConfig}
      />

      <ExportHistory
        isOpen={showExportHistory}
        onClose={() => setShowExportHistory(false)}
      />

      <ExportTemplate
        isOpen={showExportTemplate}
        onClose={() => setShowExportTemplate(false)}
      />

      <ExportScheduler
        isOpen={showExportScheduler}
        onClose={() => setShowExportScheduler(false)}
      />
    </div>
  );
};

export default UsersPage;