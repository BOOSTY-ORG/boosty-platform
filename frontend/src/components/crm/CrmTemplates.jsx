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
 * CRM Templates Component
 * 
 * A comprehensive component for managing CRM templates with:
 * - Template list with categorization and search
 * - Template editor with dynamic variables and preview
 * - Approval workflow and versioning interface
 * - A/B testing configuration and results
 * 
 * @component
 */
const CrmTemplates = ({
  className = '',
  initialFilters = {},
  onTemplateSelect = null,
  showMetrics = true,
  showBulkActions = true,
  ...props
}) => {
  // State management
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showABTestModal, setShowABTestModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  
  // Metrics state
  const [metrics, setMetrics] = useState(null);
  const [topPerformingTemplates, setTopPerformingTemplates] = useState([]);
  const [templateStats, setTemplateStats] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'marketing',
    subcategory: '',
    channel: 'email',
    type: 'marketing',
    subject: '',
    body: '',
    htmlBody: '',
    variables: [],
    settings: {
      trackOpens: true,
      trackClicks: true
    },
    abTesting: {
      enabled: false,
      variants: []
    },
    tags: []
  });
  
  const [versionData, setVersionData] = useState({
    version: '',
    changeLog: ''
  });
  
  const [abTestData, setABTestData] = useState({
    name: '',
    description: '',
    variants: [
      { name: 'Variant A', subject: '', body: '', weight: 50 },
      { name: 'Variant B', subject: '', body: '', weight: 50 }
    ],
    startDate: '',
    endDate: '',
    targetAudience: 'all'
  });

  // Load templates data
  const loadTemplates = useCallback(async () => {
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
      
      const response = await crmService.getTemplates(params);
      setTemplates(response.data?.data || []);
      setTotalPages(response.data?.pagination?.pages || 1);
      setTotalItems(response.data?.pagination?.total || 0);
    } catch (error) {
      toast.error(`Failed to load templates: ${error.message}`);
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
        crmService.getTopPerformingTemplates(),
        crmService.getTemplateStats()
      ]);
      
      setMetrics(metricsResponse);
      setTopPerformingTemplates(topPerformingResponse.data?.data || []);
      setTemplateStats(statsResponse.data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  }, [showMetrics]);

  // Initial data load
  useEffect(() => {
    loadTemplates();
    loadMetrics();
  }, [loadTemplates, loadMetrics]);

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

  // Handle template selection
  const handleTemplateSelect = (templateId, checked) => {
    setSelectedTemplates(prev =>
      checked
        ? [...prev, templateId]
        : prev.filter(id => id !== templateId)
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedTemplates(
      checked ? templates.map(t => t._id || t.templateId) : []
    );
  };

  // Handle template creation
  const handleCreateTemplate = async () => {
    try {
      setLoading(true);
      const newTemplate = await crmService.createTemplate(formData);
      setTemplates(prev => [newTemplate, ...prev]);
      setShowCreateModal(false);
      resetForm();
      toast.success('Template created successfully');
    } catch (error) {
      toast.error(`Failed to create template: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle template update
  const handleUpdateTemplate = async () => {
    if (!currentTemplate) return;
    
    try {
      setLoading(true);
      const updatedTemplate = await crmService.updateTemplate(
        currentTemplate._id || currentTemplate.templateId,
        formData
      );
      setTemplates(prev =>
        prev.map(t =>
          (t._id || t.templateId) === (currentTemplate._id || currentTemplate.templateId)
            ? updatedTemplate
            : t
        )
      );
      setShowEditModal(false);
      resetForm();
      toast.success('Template updated successfully');
    } catch (error) {
      toast.error(`Failed to update template: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle template deletion
  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await crmService.deleteTemplate(templateId);
      setTemplates(prev => prev.filter(t => (t._id || t.templateId) !== templateId));
      toast.success('Template deleted successfully');
    } catch (error) {
      toast.error(`Failed to delete template: ${error.message}`);
    }
  };

  // Handle approval workflow
  const handleApproveTemplate = async (templateId) => {
    try {
      await crmService.approveTemplate(templateId);
      setTemplates(prev =>
        prev.map(t =>
          (t._id || t.templateId) === templateId
            ? { ...t, status: 'approved' }
            : t
        )
      );
      toast.success('Template approved successfully');
    } catch (error) {
      toast.error(`Failed to approve template: ${error.message}`);
    }
  };

  const handleRejectTemplate = async (templateId, reason) => {
    try {
      await crmService.rejectTemplate(templateId, reason);
      setTemplates(prev =>
        prev.map(t =>
          (t._id || t.templateId) === templateId
            ? { ...t, status: 'rejected', rejectionReason: reason }
            : t
        )
      );
      toast.success('Template rejected successfully');
    } catch (error) {
      toast.error(`Failed to reject template: ${error.message}`);
    }
  };

  // Handle versioning
  const handleCreateVersion = async (templateId) => {
    try {
      await crmService.createTemplateVersion(templateId, versionData.version);
      await loadTemplates();
      setShowVersionModal(false);
      setVersionData({ version: '', changeLog: '' });
      toast.success('Template version created successfully');
    } catch (error) {
      toast.error(`Failed to create version: ${error.message}`);
    }
  };

  // Handle preview
  const handlePreview = async (templateId) => {
    try {
      const response = await crmService.getTemplatePreview(templateId);
      setPreviewData(response.data);
      setShowPreviewModal(true);
    } catch (error) {
      toast.error(`Failed to load preview: ${error.message}`);
    }
  };

  // Handle A/B testing
  const handleCreateABTest = async () => {
    try {
      // This would call an A/B test creation API
      // await crmService.createABTest(abTestData);
      setShowABTestModal(false);
      setABTestData({
        name: '',
        description: '',
        variants: [
          { name: 'Variant A', subject: '', body: '', weight: 50 },
          { name: 'Variant B', subject: '', body: '', weight: 50 }
        ],
        startDate: '',
        endDate: '',
        targetAudience: 'all'
      });
      toast.success('A/B test created successfully');
    } catch (error) {
      toast.error(`Failed to create A/B test: ${error.message}`);
    }
  };

  // Handle bulk operations
  const handleBulkApprove = async () => {
    if (selectedTemplates.length === 0) return;
    
    try {
      setLoading(true);
      await Promise.all(selectedTemplates.map(id => crmService.approveTemplate(id)));
      await loadTemplates();
      setSelectedTemplates([]);
      setShowBulkActionsModal(false);
      toast.success('Bulk approval completed successfully');
    } catch (error) {
      toast.error(`Bulk approval failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTemplates.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTemplates.length} templates?`)) return;
    
    try {
      setLoading(true);
      await Promise.all(selectedTemplates.map(id => crmService.deleteTemplate(id)));
      await loadTemplates();
      setSelectedTemplates([]);
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
      category: 'marketing',
      subcategory: '',
      channel: 'email',
      type: 'marketing',
      subject: '',
      body: '',
      htmlBody: '',
      variables: [],
      settings: {
        trackOpens: true,
        trackClicks: true
      },
      abTesting: {
        enabled: false,
        variants: []
      },
      tags: []
    });
    setCurrentTemplate(null);
  };

  const openEditModal = (template) => {
    setCurrentTemplate(template);
    setFormData({
      name: template.name || '',
      description: template.description || '',
      category: template.category || 'marketing',
      subcategory: template.subcategory || '',
      channel: template.channel || 'email',
      type: template.type || 'marketing',
      subject: template.subject || '',
      body: template.body || '',
      htmlBody: template.htmlBody || '',
      variables: template.variables || [],
      settings: {
        trackOpens: template.settings?.trackOpens !== false,
        trackClicks: template.settings?.trackClicks !== false
      },
      abTesting: {
        enabled: template.abTesting?.enabled || false,
        variants: template.abTesting?.variants || []
      },
      tags: template.tags || []
    });
    setShowEditModal(true);
  };

  const addVariable = () => {
    setFormData({
      ...formData,
      variables: [...formData.variables, {
        name: '',
        type: 'text',
        description: '',
        defaultValue: ''
      }]
    });
  };

  const updateVariable = (index, field, value) => {
    const updatedVariables = [...formData.variables];
    updatedVariables[index] = { ...updatedVariables[index], [field]: value };
    setFormData({ ...formData, variables: updatedVariables });
  };

  const removeVariable = (index) => {
    setFormData({
      ...formData,
      variables: formData.variables.filter((_, i) => i !== index)
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
        { value: 'marketing', label: 'Marketing' },
        { value: 'transactional', label: 'Transactional' },
        { value: 'notification', label: 'Notification' },
        { value: 'welcome', label: 'Welcome' }
      ],
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'marketing' ? 'bg-blue-100 text-blue-800' :
          value === 'transactional' ? 'bg-green-100 text-green-800' :
          value === 'notification' ? 'bg-yellow-100 text-yellow-800' :
          'bg-purple-100 text-purple-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'channel',
      title: 'Channel',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'email', label: 'Email' },
        { value: 'sms', label: 'SMS' },
        { value: 'push', label: 'Push' },
        { value: 'whatsapp', label: 'WhatsApp' }
      ]
    },
    {
      key: 'type',
      title: 'Type',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'marketing', label: 'Marketing' },
        { value: 'transactional', label: 'Transactional' }
      ]
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'draft', label: 'Draft' },
        { value: 'review', label: 'Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' }
      ],
      render: (value, row) => (
        <div className="text-sm">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            value === 'approved' ? 'bg-green-100 text-green-800' :
            value === 'review' ? 'bg-yellow-100 text-yellow-800' :
            value === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {value}
          </span>
          {row.rejectionReason && (
            <div className="text-xs text-red-600 mt-1">{row.rejectionReason}</div>
          )}
        </div>
      )
    },
    {
      key: 'version',
      title: 'Version',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-900">
          {value || '1.0.0'}
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
                Sent: {row.metrics.totalSent || 0}
              </div>
              <div className="text-gray-500">
                Open: {row.metrics.averageOpenRate || 0}%
              </div>
              <div className="text-gray-500">
                Click: {row.metrics.averageClickRate || 0}%
              </div>
            </>
          )}
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
            onClick={() => handlePreview(row._id || row.templateId)}
          >
            Preview
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => openEditModal(row)}
          >
            Edit
          </Button>
          {row.status === 'review' && (
            <>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleApproveTemplate(row._id || row.templateId)}
              >
                Approve
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  const reason = prompt('Rejection reason:');
                  if (reason) handleRejectTemplate(row._id || row.templateId, reason);
                }}
              >
                Reject
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setCurrentTemplate(row);
              setShowVersionModal(true);
            }}
          >
            Version
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleDeleteTemplate(row._id || row.templateId)}
          >
            Delete
          </Button>
        </div>
      )
    }
  ], []);

  return (
    <div className={`space-y-6 ${className}`} {...props}>
      {/* Metrics Cards */}
      {showMetrics && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card.Metrics
            title="Total Templates"
            value={metrics.summary?.approvedTemplates || 0}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <Card.Metrics
            title="Active Templates"
            value={templates.filter(t => t.status === 'approved').length}
            changeType="positive"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <Card.Metrics
            title="Pending Review"
            value={templates.filter(t => t.status === 'review').length}
            changeType="negative"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <Card.Metrics
            title="Top Performing"
            value={topPerformingTemplates.length}
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
              placeholder="Search templates..."
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
            Create Template
          </Button>
          
          {showBulkActions && selectedTemplates.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setShowBulkActionsModal(true)}
            >
              Bulk Actions ({selectedTemplates.length})
            </Button>
          )}
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowABTestModal(true)}
          >
            A/B Test
          </Button>
          <Button
            variant="ghost"
            onClick={loadTemplates}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Templates Table */}
      <Card>
        <Table
          columns={tableColumns}
          data={templates}
          loading={loading}
          sortable={true}
          onSort={handleSort}
          defaultSortField={sortField}
          defaultSortDirection={sortOrder}
          filterable={true}
          onFilter={handleFilter}
          selectable={true}
          selectedRows={selectedTemplates}
          onSelectionChange={setSelectedTemplates}
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

      {/* Create Template Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        size="xl"
        title="Create Template"
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
                <option value="marketing">Marketing</option>
                <option value="transactional">Transactional</option>
                <option value="notification">Notification</option>
                <option value="welcome">Welcome</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Channel</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="marketing">Marketing</option>
                <option value="transactional">Transactional</option>
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

          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Body</label>
            <textarea
              rows={6}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Use {{variable_name}} for dynamic content"
            />
          </div>

          {/* Variables Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Variables</label>
              <Button
                variant="secondary"
                size="xs"
                onClick={addVariable}
              >
                Add Variable
              </Button>
            </div>
            {formData.variables.map((variable, index) => (
              <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Variable name"
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={variable.name}
                  onChange={(e) => updateVariable(index, 'name', e.target.value)}
                />
                <select
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={variable.type}
                  onChange={(e) => updateVariable(index, 'type', e.target.value)}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                </select>
                <input
                  type="text"
                  placeholder="Description"
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={variable.description}
                  onChange={(e) => updateVariable(index, 'description', e.target.value)}
                />
                <Button
                  variant="danger"
                  size="xs"
                  onClick={() => removeVariable(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          {/* Settings Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Settings</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={formData.settings.trackOpens}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, trackOpens: e.target.checked }
                  })}
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Track Opens
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={formData.settings.trackClicks}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, trackClicks: e.target.checked }
                  })}
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Track Clicks
                </label>
              </div>
            </div>
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
            onClick={handleCreateTemplate}
            loading={loading}
          >
            Create Template
          </Button>
        </div>
      </Modal>

      {/* Edit Template Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        size="xl"
        title="Edit Template"
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
                <option value="review">Review</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Body</label>
            <textarea
              rows={6}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            />
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
            onClick={handleUpdateTemplate}
            loading={loading}
          >
            Update Template
          </Button>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewData(null);
        }}
        size="lg"
        title="Template Preview"
      >
        {previewData && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{previewData.subject}</h3>
            </div>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div dangerouslySetInnerHTML={{ __html: previewData.htmlBody || previewData.body }} />
            </div>
          </div>
        )}
      </Modal>

      {/* Version Modal */}
      <Modal
        isOpen={showVersionModal}
        onClose={() => {
          setShowVersionModal(false);
          setVersionData({ version: '', changeLog: '' });
        }}
        title="Create New Version"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Version Number</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={versionData.version}
              onChange={(e) => setVersionData({ ...versionData, version: e.target.value })}
              placeholder="e.g., 1.1.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Change Log</label>
            <textarea
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={versionData.changeLog}
              onChange={(e) => setVersionData({ ...versionData, changeLog: e.target.value })}
              placeholder="Describe the changes made in this version..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowVersionModal(false);
              setVersionData({ version: '', changeLog: '' });
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => currentTemplate && handleCreateVersion(currentTemplate._id || currentTemplate.templateId)}
          >
            Create Version
          </Button>
        </div>
      </Modal>

      {/* A/B Test Modal */}
      <Modal
        isOpen={showABTestModal}
        onClose={() => {
          setShowABTestModal(false);
          setABTestData({
            name: '',
            description: '',
            variants: [
              { name: 'Variant A', subject: '', body: '', weight: 50 },
              { name: 'Variant B', subject: '', body: '', weight: 50 }
            ],
            startDate: '',
            endDate: '',
            targetAudience: 'all'
          });
        }}
        size="xl"
        title="Create A/B Test"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Test Name</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={abTestData.name}
              onChange={(e) => setABTestData({ ...abTestData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={abTestData.description}
              onChange={(e) => setABTestData({ ...abTestData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Test Variants</label>
            {abTestData.variants.map((variant, index) => (
              <div key={index} className="border rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Variant Name</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={variant.name}
                      onChange={(e) => {
                        const updatedVariants = [...abTestData.variants];
                        updatedVariants[index] = { ...variant, name: e.target.value };
                        setABTestData({ ...abTestData, variants: updatedVariants });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Weight (%)</label>
                    <input
                      type="number"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={variant.weight}
                      onChange={(e) => {
                        const updatedVariants = [...abTestData.variants];
                        updatedVariants[index] = { ...variant, weight: parseInt(e.target.value) };
                        setABTestData({ ...abTestData, variants: updatedVariants });
                      }}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={variant.subject}
                    onChange={(e) => {
                      const updatedVariants = [...abTestData.variants];
                      updatedVariants[index] = { ...variant, subject: e.target.value };
                      setABTestData({ ...abTestData, variants: updatedVariants });
                    }}
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Body</label>
                  <textarea
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={variant.body}
                    onChange={(e) => {
                      const updatedVariants = [...abTestData.variants];
                      updatedVariants[index] = { ...variant, body: e.target.value };
                      setABTestData({ ...abTestData, variants: updatedVariants });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="datetime-local"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={abTestData.startDate}
                onChange={(e) => setABTestData({ ...abTestData, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="datetime-local"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={abTestData.endDate}
                onChange={(e) => setABTestData({ ...abTestData, endDate: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowABTestModal(false);
              setABTestData({
                name: '',
                description: '',
                variants: [
                  { name: 'Variant A', subject: '', body: '', weight: 50 },
                  { name: 'Variant B', subject: '', body: '', weight: 50 }
                ],
                startDate: '',
                endDate: '',
                targetAudience: 'all'
              });
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateABTest}
          >
            Create A/B Test
          </Button>
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
            {selectedTemplates.length} templates selected
          </p>

          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleBulkApprove}
            >
              Approve Selected
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

CrmTemplates.propTypes = {
  className: PropTypes.string,
  initialFilters: PropTypes.object,
  onTemplateSelect: PropTypes.func,
  showMetrics: PropTypes.bool,
  showBulkActions: PropTypes.bool
};

export default CrmTemplates;