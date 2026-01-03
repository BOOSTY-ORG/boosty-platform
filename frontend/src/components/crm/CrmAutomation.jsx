import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

// Components
import Button from '../common/Button';
import Card from '../common/Card';
import Table from '../common/Table';
import Modal from '../common/Modal';
import Loading from '../common/Loading';
import Pagination from '../common/Pagination';

// Services
import { crmService } from '../../services/crm.service';

/**
 * CRM Automation Component
 * 
 * A comprehensive component for managing CRM automation with:
 * - Automation rules list with status and performance metrics
 * - Automation rule builder with triggers and actions
 * - Testing interface and execution history
 * - Bulk enable/disable and scheduling features
 * 
 * @component
 */
const CrmAutomation = ({
  className = '',
  initialFilters = {},
  onAutomationSelect = null,
  showMetrics = true,
  showBulkActions = true,
  ...props
}) => {
  // State management
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedAutomations, setSelectedAutomations] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [currentAutomation, setCurrentAutomation] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [executionHistory, setExecutionHistory] = useState([]);
  
  // Metrics state
  const [metrics, setMetrics] = useState(null);
  const [topPerformingAutomations, setTopPerformingAutomations] = useState([]);
  const [automationStats, setAutomationStats] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'communication',
    enabled: false,
    status: 'draft',
    trigger: {
      type: 'contact_created',
      conditions: []
    },
    actions: [],
    target: {
      segments: [],
      filters: {}
    },
    limits: {
      maxExecutions: 100,
      maxContacts: 1000
    },
    tags: []
  });
  
  const [testData, setTestData] = useState({
    sampleData: {},
    dryRun: true
  });

  // Load automations data
  const loadAutomations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy: sortField,
        sortOrder: sortOrder,
        ...filters
      };
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const response = await crmService.getAutomations(params);
      setAutomations(response.data?.data || []);
      setTotalPages(response.data?.pagination?.pages || 1);
      setTotalItems(response.data?.pagination?.total || 0);
    } catch (error) {
      toast.error(`Failed to load automations: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortField, sortOrder, filters, searchQuery]);

  // Load metrics
  const loadMetrics = useCallback(async () => {
    if (!showMetrics) return;
    
    try {
      const [metricsResponse, topPerformingResponse, statsResponse] = await Promise.all([
        crmService.getOverview(),
        crmService.getTopPerformingAutomations(),
        crmService.getAutomationStats()
      ]);
      
      setMetrics(metricsResponse);
      setTopPerformingAutomations(topPerformingResponse.data?.data || []);
      setAutomationStats(statsResponse.data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  }, [showMetrics]);

  // Initial data load
  useEffect(() => {
    loadAutomations();
    loadMetrics();
  }, [loadAutomations, loadMetrics]);

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Handle sorting
  const handleSort = (field, direction) => {
    setSortField(field);
    setSortOrder(direction);
    setCurrentPage(1);
  };

  // Handle filtering
  const handleFilter = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  // Handle automation selection
  const handleAutomationSelect = (automationId, checked) => {
    setSelectedAutomations(prev =>
      checked
        ? [...prev, automationId]
        : prev.filter(id => id !== automationId)
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedAutomations(
      checked ? automations.map(a => a._id || a.automationId) : []
    );
  };

  // Handle automation creation
  const handleCreateAutomation = async () => {
    try {
      setLoading(true);
      const newAutomation = await crmService.createAutomation(formData);
      setAutomations(prev => [newAutomation, ...prev]);
      setShowCreateModal(false);
      resetForm();
      toast.success('Automation created successfully');
    } catch (error) {
      toast.error(`Failed to create automation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle automation update
  const handleUpdateAutomation = async () => {
    if (!currentAutomation) return;
    
    try {
      setLoading(true);
      const updatedAutomation = await crmService.updateAutomation(
        currentAutomation._id || currentAutomation.automationId,
        formData
      );
      setAutomations(prev =>
        prev.map(a =>
          (a._id || a.automationId) === (currentAutomation._id || currentAutomation.automationId)
            ? updatedAutomation
            : a
        )
      );
      setShowEditModal(false);
      resetForm();
      toast.success('Automation updated successfully');
    } catch (error) {
      toast.error(`Failed to update automation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle automation deletion
  const handleDeleteAutomation = async (automationId) => {
    if (!confirm('Are you sure you want to delete this automation?')) return;
    
    try {
      await crmService.deleteAutomation(automationId);
      setAutomations(prev => prev.filter(a => (a._id || a.automationId) !== automationId));
      toast.success('Automation deleted successfully');
    } catch (error) {
      toast.error(`Failed to delete automation: ${error.message}`);
    }
  };

  // Handle automation enable/disable
  const handleEnableAutomation = async (automationId) => {
    try {
      await crmService.enableAutomation(automationId);
      setAutomations(prev =>
        prev.map(a =>
          (a._id || a.automationId) === automationId
            ? { ...a, enabled: true, status: 'active' }
            : a
        )
      );
      toast.success('Automation enabled successfully');
    } catch (error) {
      toast.error(`Failed to enable automation: ${error.message}`);
    }
  };

  const handleDisableAutomation = async (automationId) => {
    try {
      await crmService.disableAutomation(automationId);
      setAutomations(prev =>
        prev.map(a =>
          (a._id || a.automationId) === automationId
            ? { ...a, enabled: false, status: 'paused' }
            : a
        )
      );
      toast.success('Automation disabled successfully');
    } catch (error) {
      toast.error(`Failed to disable automation: ${error.message}`);
    }
  };

  // Handle testing
  const handleTestAutomation = async (automationId) => {
    try {
      const response = await crmService.testAutomation(automationId, testData);
      setTestResults(response.data);
      setShowTestModal(true);
      toast.success('Automation test completed');
    } catch (error) {
      toast.error(`Failed to test automation: ${error.message}`);
    }
  };

  // Handle manual execution
  const handleExecuteAutomation = async (automationId) => {
    if (!confirm('Are you sure you want to execute this automation manually?')) return;
    
    try {
      await crmService.executeAutomation(automationId, {});
      toast.success('Automation executed successfully');
      await loadAutomations();
    } catch (error) {
      toast.error(`Failed to execute automation: ${error.message}`);
    }
  };

  // Handle execution history
  const handleLoadHistory = async (automationId) => {
    try {
      const response = await crmService.getAutomationHistory(automationId);
      setExecutionHistory(response.data?.data || []);
      setShowHistoryModal(true);
    } catch (error) {
      toast.error(`Failed to load execution history: ${error.message}`);
    }
  };

  // Handle bulk operations
  const handleBulkEnable = async () => {
    if (selectedAutomations.length === 0) return;
    
    try {
      setLoading(true);
      await crmService.bulkEnableAutomations(selectedAutomations);
      await loadAutomations();
      setSelectedAutomations([]);
      setShowBulkActionsModal(false);
      toast.success('Bulk enable completed successfully');
    } catch (error) {
      toast.error(`Bulk enable failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDisable = async () => {
    if (selectedAutomations.length === 0) return;
    
    try {
      setLoading(true);
      await crmService.bulkDisableAutomations(selectedAutomations);
      await loadAutomations();
      setSelectedAutomations([]);
      setShowBulkActionsModal(false);
      toast.success('Bulk disable completed successfully');
    } catch (error) {
      toast.error(`Bulk disable failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAutomations.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedAutomations.length} automations?`)) return;
    
    try {
      setLoading(true);
      await crmService.bulkDeleteAutomations(selectedAutomations);
      await loadAutomations();
      setSelectedAutomations([]);
      toast.success('Bulk delete completed successfully');
    } catch (error) {
      toast.error(`Bulk delete failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Form helpers
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'communication',
      enabled: false,
      status: 'draft',
      trigger: {
        type: 'contact_created',
        conditions: []
      },
      actions: [],
      target: {
        segments: [],
        filters: {}
      },
      limits: {
        maxExecutions: 100,
        maxContacts: 1000
      },
      tags: []
    });
    setCurrentAutomation(null);
  };

  const openEditModal = (automation) => {
    setCurrentAutomation(automation);
    setFormData({
      name: automation.name || '',
      description: automation.description || '',
      category: automation.category || 'communication',
      enabled: automation.enabled || false,
      status: automation.status || 'draft',
      trigger: automation.trigger || {
        type: 'contact_created',
        conditions: []
      },
      actions: automation.actions || [],
      target: automation.target || {
        segments: [],
        filters: {}
      },
      limits: automation.limits || {
        maxExecutions: 100,
        maxContacts: 1000
      },
      tags: automation.tags || []
    });
    setShowEditModal(true);
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [...formData.actions, {
        type: 'send_email',
        config: {},
        delay: 0
      }]
    });
  };

  const updateAction = (index, field, value) => {
    const updatedActions = [...formData.actions];
    updatedActions[index] = { ...updatedActions[index], [field]: value };
    setFormData({ ...formData, actions: updatedActions });
  };

  const removeAction = (index) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index)
    });
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      trigger: {
        ...formData.trigger,
        conditions: [...formData.trigger.conditions, {
          field: '',
          operator: 'equals',
          value: ''
        }]
      }
    });
  };

  const updateCondition = (index, field, value) => {
    const updatedConditions = [...formData.trigger.conditions];
    updatedConditions[index] = { ...updatedConditions[index], [field]: value };
    setFormData({
      ...formData,
      trigger: {
        ...formData.trigger,
        conditions: updatedConditions
      }
    });
  };

  const removeCondition = (index) => {
    setFormData({
      ...formData,
      trigger: {
        ...formData.trigger,
        conditions: formData.trigger.conditions.filter((_, i) => i !== index)
      }
    });
  };

  // Table columns definition
  const tableColumns = useMemo(() => [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{value}</div>
          {row.description && (
            <div className="text-gray-500 text-xs">{row.description}</div>
          )}
        </div>
      )
    },
    {
      key: 'category',
      title: 'Category',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'communication', label: 'Communication' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'sales', label: 'Sales' },
        { value: 'support', label: 'Support' }
      ],
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'communication' ? 'bg-blue-100 text-blue-800' :
          value === 'marketing' ? 'bg-green-100 text-green-800' :
          value === 'sales' ? 'bg-purple-100 text-purple-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {value}
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
        { value: 'draft', label: 'Draft' },
        { value: 'active', label: 'Active' },
        { value: 'paused', label: 'Paused' },
        { value: 'error', label: 'Error' }
      ],
      render: (value, row) => (
        <div className="text-sm">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            value === 'active' ? 'bg-green-100 text-green-800' :
            value === 'paused' ? 'bg-yellow-100 text-yellow-800' :
            value === 'error' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {value}
          </span>
          <div className="flex items-center mt-1">
            <span className="text-xs text-gray-500">Enabled:</span>
            <span className={`ml-1 text-xs font-medium ${
              row.enabled ? 'text-green-600' : 'text-red-600'
            }`}>
              {row.enabled ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'trigger',
      title: 'Trigger',
      sortable: false,
      render: (value) => (
        <div className="text-sm text-gray-900">
          {value?.type || 'N/A'}
        </div>
      )
    },
    {
      key: 'metrics',
      title: 'Performance',
      sortable: false,
      render: (value, row) => (
        <div className="text-sm">
          {row.metrics && (
            <>
              <div className="text-gray-900">
                Executions: {row.metrics.executionCount || 0}
              </div>
              <div className="text-gray-500">
                Success: {row.metrics.successCount || 0} ({row.metrics.successRate || 0}%)
              </div>
              <div className="text-gray-500">
                Contacts: {row.metrics.totalContactsProcessed || 0}
              </div>
            </>
          )}
        </div>
      )
    },
    {
      key: 'metrics.nextExecution',
      title: 'Next Execution',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-900">
          {value ? new Date(value).toLocaleString() : 'Not scheduled'}
        </div>
      )
    },
    {
      key: 'metrics.lastExecution',
      title: 'Last Execution',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-900">
          {value ? new Date(value).toLocaleString() : 'Never'}
        </div>
      )
    },
    {
      key: 'tags',
      title: 'Tags',
      sortable: false,
      render: (value) => (
        <div className="flex flex-wrap gap-1">
          {(value || []).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {tag}
            </span>
          ))}
        </div>
      )
    },
    {
      key: 'createdAt',
      title: 'Created',
      sortable: true,
      filterType: 'date',
      render: (value) => (
        <div className="text-sm text-gray-900">
          {new Date(value).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onAutomationSelect?.(row)}
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => openEditModal(row)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleTestAutomation(row._id || row.automationId)}
          >
            Test
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleLoadHistory(row._id || row.automationId)}
          >
            History
          </Button>
          {row.enabled ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleDisableAutomation(row._id || row.automationId)}
            >
              Disable
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleEnableAutomation(row._id || row.automationId)}
            >
              Enable
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleExecuteAutomation(row._id || row.automationId)}
          >
            Execute
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleDeleteAutomation(row._id || row.automationId)}
          >
            Delete
          </Button>
        </div>
      )
    }
  ], [onAutomationSelect]);

  return (
    <div className={`space-y-6 ${className}`} {...props}>
      {/* Metrics Cards */}
      {showMetrics && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card.Metrics
            title="Active Automations"
            value={metrics.summary?.activeAutomations || 0}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <Card.Metrics
            title="Total Executions"
            value={automationStats?.totalExecutions || 0}
            changeType="positive"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <Card.Metrics
            title="Success Rate"
            value={`${automationStats?.averageSuccessRate || 0}%`}
            changeType="positive"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <Card.Metrics
            title="Top Performing"
            value={topPerformingAutomations.length}
            changeType="positive"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search automations..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            Create Automation
          </Button>
          
          {showBulkActions && selectedAutomations.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setShowBulkActionsModal(true)}
            >
              Bulk Actions ({selectedAutomations.length})
            </Button>
          )}
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="ghost"
            onClick={loadAutomations}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Automations Table */}
      <Card>
        <Table
          columns={tableColumns}
          data={automations}
          loading={loading}
          sortable={true}
          onSort={handleSort}
          defaultSortField={sortField}
          defaultSortDirection={sortOrder}
          filterable={true}
          onFilter={handleFilter}
          selectable={true}
          selectedRows={selectedAutomations}
          onSelectionChange={setSelectedAutomations}
          pagination={true}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          rowsPerPage={itemsPerPage}
          onRowsPerPageChange={handleItemsPerPageChange}
          totalItems={totalItems}
          exportable={true}
          onExport={(exportData) => {
            console.log('Export data:', exportData);
          }}
        />
      </Card>

      {/* Create Automation Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        size="xl"
        title="Create Automation"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="communication">Communication</option>
                <option value="marketing">Marketing</option>
                <option value="sales">Sales</option>
                <option value="support">Support</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Trigger Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Trigger</label>
            <div className="space-y-2">
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.trigger.type}
                onChange={(e) => setFormData({
                  ...formData,
                  trigger: { ...formData.trigger, type: e.target.value }
                })}
              >
                <option value="contact_created">Contact Created</option>
                <option value="contact_updated">Contact Updated</option>
                <option value="communication_sent">Communication Sent</option>
                <option value="communication_received">Communication Received</option>
                <option value="scheduled">Scheduled</option>
                <option value="manual">Manual</option>
              </select>
              
              {/* Trigger Conditions */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Conditions</label>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={addCondition}
                  >
                    Add Condition
                  </Button>
                </div>
                {formData.trigger.conditions.map((condition, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Field"
                      className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={condition.field}
                      onChange={(e) => updateCondition(index, 'field', e.target.value)}
                    />
                    <select
                      className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                    >
                      <option value="equals">Equals</option>
                      <option value="not_equals">Not Equals</option>
                      <option value="contains">Contains</option>
                      <option value="greater_than">Greater Than</option>
                      <option value="less_than">Less Than</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Value"
                      className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, 'value', e.target.value)}
                    />
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => removeCondition(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Actions</label>
              <Button
                variant="secondary"
                size="xs"
                onClick={addAction}
              >
                Add Action
              </Button>
            </div>
            {formData.actions.map((action, index) => (
              <div key={index} className="border rounded-lg p-4 mb-4">
                <div className="grid grid-cols-3 gap-2">
                  <select
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={action.type}
                    onChange={(e) => updateAction(index, 'type', e.target.value)}
                  >
                    <option value="send_email">Send Email</option>
                    <option value="send_sms">Send SMS</option>
                    <option value="update_contact">Update Contact</option>
                    <option value="create_task">Create Task</option>
                    <option value="notify_user">Notify User</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Delay (minutes)"
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={action.delay}
                    onChange={(e) => updateAction(index, 'delay', parseInt(e.target.value))}
                  />
                  <Button
                    variant="danger"
                    size="xs"
                    onClick={() => removeAction(index)}
                  >
                    Remove
                  </Button>
                </div>
                <div className="mt-2">
                  <textarea
                    rows={2}
                    placeholder="Action configuration (JSON)"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={JSON.stringify(action.config || {})}
                    onChange={(e) => {
                      try {
                        const config = JSON.parse(e.target.value);
                        updateAction(index, 'config', config);
                      } catch (error) {
                        // Invalid JSON, ignore
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Limits Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Execution Limits</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600">Max Executions per Day</label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formData.limits.maxExecutions}
                  onChange={(e) => setFormData({
                    ...formData,
                    limits: { ...formData.limits, maxExecutions: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Max Contacts per Execution</label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formData.limits.maxContacts}
                  onChange={(e) => setFormData({
                    ...formData,
                    limits: { ...formData.limits, maxContacts: parseInt(e.target.value) }
                  })}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            />
            <label className="ml-2 block text-sm text-gray-900">
              Enable Automation
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreateModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateAutomation}
            loading={loading}
          >
            Create Automation
          </Button>
        </div>
      </Modal>

      {/* Edit Automation Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        size="xl"
        title="Edit Automation"
      >
        {/* Same form as create modal */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            />
            <label className="ml-2 block text-sm text-gray-900">
              Enable Automation
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowEditModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdateAutomation}
            loading={loading}
          >
            Update Automation
          </Button>
        </div>
      </Modal>

      {/* Test Results Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => {
          setShowTestModal(false);
          setTestResults(null);
        }}
        size="lg"
        title="Test Results"
      >
        {testResults && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Test Status</label>
                <div className={`mt-1 text-sm font-medium ${
                  testResults.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {testResults.success ? 'Success' : 'Failed'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Execution Time</label>
                <div className="mt-1 text-sm text-gray-900">
                  {testResults.executionTime}ms
                </div>
              </div>
            </div>

            {testResults.results && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Results</label>
                <pre className="mt-1 p-3 bg-gray-100 rounded-md text-xs overflow-auto">
                  {JSON.stringify(testResults.results, null, 2)}
                </pre>
              </div>
            )}

            {testResults.error && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Error</label>
                <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                  {testResults.error}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Execution History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setExecutionHistory([]);
        }}
        size="lg"
        title="Execution History"
      >
        <div className="space-y-4">
          {executionHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Executed At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacts Processed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Execution Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {executionHistory.map((execution, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(execution.executedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          execution.status === 'success' ? 'bg-green-100 text-green-800' :
                          execution.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {execution.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {execution.contactsProcessed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {execution.executionTime}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No execution history available
            </div>
          )}
        </div>
      </Modal>

      {/* Bulk Actions Modal */}
      <Modal
        isOpen={showBulkActionsModal}
        onClose={() => setShowBulkActionsModal(false)}
        title="Bulk Actions"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {selectedAutomations.length} automations selected
          </p>

          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleBulkEnable}
            >
              Enable Selected
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleBulkDisable}
            >
              Disable Selected
            </Button>
            <Button
              variant="danger"
              className="w-full"
              onClick={handleBulkDelete}
            >
              Delete Selected
            </Button>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowBulkActionsModal(false)}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
};

CrmAutomation.propTypes = {
  className: PropTypes.string,
  initialFilters: PropTypes.object,
  onAutomationSelect: PropTypes.func,
  showMetrics: PropTypes.bool,
  showBulkActions: PropTypes.bool
};

export default CrmAutomation;