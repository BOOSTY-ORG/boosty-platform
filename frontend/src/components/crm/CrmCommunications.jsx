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
 * CRM Communications Component
 * 
 * A comprehensive component for managing CRM communications with:
 * - Communication list with filtering, sorting, and pagination
 * - Communication creation and editing forms
 * - Follow-up management and overdue tracking
 * - Agent workload metrics and assignment features
 * 
 * @component
 */
const CrmCommunications = ({
  className = '',
  initialFilters = {},
  onCommunicationSelect = null,
  showMetrics = true,
  showBulkActions = true,
  ...props
}) => {
  // State management
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedCommunications, setSelectedCommunications] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [currentCommunication, setCurrentCommunication] = useState(null);
  
  // Metrics state
  const [metrics, setMetrics] = useState(null);
  const [overdueCommunications, setOverdueCommunications] = useState(null);
  const [agentWorkload, setAgentWorkload] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    entityType: 'contact',
    entityId: '',
    interactionType: 'email',
    channel: 'email',
    direction: 'outbound',
    subject: '',
    content: '',
    agentId: '',
    templateId: '',
    scheduledFor: '',
    responseExpectedBy: '',
    followUpRequired: false,
    followUpDate: '',
    followUpNotes: '',
    tags: []
  });
  
  const [followUpData, setFollowUpData] = useState({
    followUpDate: '',
    notes: ''
  });

  // Load communications data
  const loadCommunications = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy: sortField,
        sortOrder: sortOrder,
        ...filters
      };
      
      const response = await crmService.getCommunications(params);
      setCommunications(response.data?.data || []);
      setTotalPages(response.data?.pagination?.pages || 1);
      setTotalItems(response.data?.pagination?.total || 0);
    } catch (error) {
      toast.error(`Failed to load communications: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortField, sortOrder, filters]);

  // Load metrics
  const loadMetrics = useCallback(async () => {
    if (!showMetrics) return;
    
    try {
      const [metricsResponse, overdueResponse, workloadResponse] = await Promise.all([
        crmService.getOverview(),
        crmService.getOverdueCommunications(),
        // Get current user's workload - would need user context
        // crmService.getAgentWorkload(currentUser.id)
      ]);
      
      setMetrics(metricsResponse);
      setOverdueCommunications(overdueResponse);
      // setAgentWorkload(workloadResponse);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  }, [showMetrics]);

  // Initial data load
  useEffect(() => {
    loadCommunications();
    loadMetrics();
  }, [loadCommunications, loadMetrics]);

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

  // Handle communication selection
  const handleCommunicationSelect = (communicationId, checked) => {
    setSelectedCommunications(prev =>
      checked
        ? [...prev, communicationId]
        : prev.filter(id => id !== communicationId)
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedCommunications(
      checked ? communications.map(c => c._id || c.communicationId) : []
    );
  };

  // Handle communication creation
  const handleCreateCommunication = async () => {
    try {
      setLoading(true);
      const newCommunication = await crmService.createCommunication(formData);
      setCommunications(prev => [newCommunication, ...prev]);
      setShowCreateModal(false);
      resetForm();
      toast.success('Communication created successfully');
    } catch (error) {
      toast.error(`Failed to create communication: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle communication update
  const handleUpdateCommunication = async () => {
    if (!currentCommunication) return;
    
    try {
      setLoading(true);
      const updatedCommunication = await crmService.updateCommunication(
        currentCommunication._id || currentCommunication.communicationId,
        formData
      );
      setCommunications(prev =>
        prev.map(c =>
          (c._id || c.communicationId) === (currentCommunication._id || currentCommunication.communicationId)
            ? updatedCommunication
            : c
        )
      );
      setShowEditModal(false);
      resetForm();
      toast.success('Communication updated successfully');
    } catch (error) {
      toast.error(`Failed to update communication: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle communication deletion
  const handleDeleteCommunication = async (communicationId) => {
    if (!confirm('Are you sure you want to delete this communication?')) return;
    
    try {
      await crmService.deleteCommunication(communicationId);
      setCommunications(prev => prev.filter(c => (c._id || c.communicationId) !== communicationId));
      toast.success('Communication deleted successfully');
    } catch (error) {
      toast.error(`Failed to delete communication: ${error.message}`);
    }
  };

  // Handle follow-up
  const handleAddFollowUp = async (communicationId) => {
    try {
      await crmService.addFollowUp(communicationId, followUpData);
      setCommunications(prev =>
        prev.map(c =>
          (c._id || c.communicationId) === communicationId
            ? { ...c, followUpRequired: true, followUpDate: followUpData.followUpDate, followUpNotes: followUpData.notes }
            : c
        )
      );
      setShowFollowUpModal(false);
      setFollowUpData({ followUpDate: '', notes: '' });
      toast.success('Follow-up added successfully');
    } catch (error) {
      toast.error(`Failed to add follow-up: ${error.message}`);
    }
  };

  const handleCompleteFollowUp = async (communicationId) => {
    try {
      await crmService.completeFollowUp(communicationId);
      setCommunications(prev =>
        prev.map(c =>
          (c._id || c.communicationId) === communicationId
            ? { ...c, followUpCompleted: true }
            : c
        )
      );
      toast.success('Follow-up completed successfully');
    } catch (error) {
      toast.error(`Failed to complete follow-up: ${error.message}`);
    }
  };

  // Handle bulk actions
  const handleBulkUpdate = async (updateData) => {
    if (selectedCommunications.length === 0) return;
    
    try {
      setLoading(true);
      await crmService.bulkUpdateCommunications(selectedCommunications, updateData);
      await loadCommunications();
      setSelectedCommunications([]);
      setShowBulkActionsModal(false);
      toast.success('Bulk update completed successfully');
    } catch (error) {
      toast.error(`Bulk update failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCommunications.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedCommunications.length} communications?`)) return;
    
    try {
      setLoading(true);
      await crmService.bulkDeleteCommunications(selectedCommunications);
      await loadCommunications();
      setSelectedCommunications([]);
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
      entityType: 'contact',
      entityId: '',
      interactionType: 'email',
      channel: 'email',
      direction: 'outbound',
      subject: '',
      content: '',
      agentId: '',
      templateId: '',
      scheduledFor: '',
      responseExpectedBy: '',
      followUpRequired: false,
      followUpDate: '',
      followUpNotes: '',
      tags: []
    });
    setCurrentCommunication(null);
  };

  const openEditModal = (communication) => {
    setCurrentCommunication(communication);
    setFormData({
      entityType: communication.entityType,
      entityId: communication.entityId,
      interactionType: communication.interactionType,
      channel: communication.channel,
      direction: communication.direction,
      subject: communication.subject || '',
      content: communication.content,
      agentId: communication.agentId || '',
      templateId: communication.templateId || '',
      scheduledFor: communication.scheduledFor ? new Date(communication.scheduledFor).toISOString().slice(0, 16) : '',
      responseExpectedBy: communication.responseExpectedBy ? new Date(communication.responseExpectedBy).toISOString().slice(0, 16) : '',
      followUpRequired: communication.followUpRequired || false,
      followUpDate: communication.followUpDate ? new Date(communication.followUpDate).toISOString().slice(0, 16) : '',
      followUpNotes: communication.followUpNotes || '',
      tags: communication.tags || []
    });
    setShowEditModal(true);
  };

  // Table columns definition
  const tableColumns = useMemo(() => [
    {
      key: 'entityInfo',
      title: 'Entity',
      sortable: false,
      render: (value, row) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{row.entityType}</div>
          <div className="text-gray-500">{row.entityId}</div>
        </div>
      )
    },
    {
      key: 'interactionType',
      title: 'Type',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'email', label: 'Email' },
        { value: 'call', label: 'Call' },
        { value: 'meeting', label: 'Meeting' },
        { value: 'sms', label: 'SMS' },
        { value: 'chat', label: 'Chat' }
      ],
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'email' ? 'bg-blue-100 text-blue-800' :
          value === 'call' ? 'bg-green-100 text-green-800' :
          value === 'meeting' ? 'bg-purple-100 text-purple-800' :
          value === 'sms' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
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
        { value: 'phone', label: 'Phone' },
        { value: 'sms', label: 'SMS' },
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'chat', label: 'Chat' }
      ]
    },
    {
      key: 'direction',
      title: 'Direction',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'inbound', label: 'Inbound' },
        { value: 'outbound', label: 'Outbound' }
      ],
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'inbound' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
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
        { value: 'pending', label: 'Pending' },
        { value: 'sent', label: 'Sent' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'failed', label: 'Failed' }
      ],
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          value === 'sent' ? 'bg-blue-100 text-blue-800' :
          value === 'delivered' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'subject',
      title: 'Subject',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-900 truncate max-w-xs" title={value}>
          {value || 'No subject'}
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
      key: 'followUpRequired',
      title: 'Follow-up',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: true, label: 'Required' },
        { value: false, label: 'Not Required' }
      ],
      render: (value, row) => (
        <div className="text-sm">
          {value && (
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Required
              </span>
              {row.followUpDate && (
                <div className="text-xs text-gray-500 mt-1">
                  Due: {new Date(row.followUpDate).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
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
            onClick={() => onCommunicationSelect?.(row)}
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
          {row.followUpRequired && !row.followUpCompleted && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleCompleteFollowUp(row._id || row.communicationId)}
            >
              Complete
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleDeleteCommunication(row._id || row.communicationId)}
          >
            Delete
          </Button>
        </div>
      )
    }
  ], [onCommunicationSelect]);

  return (
    <div className={`space-y-6 ${className}`} {...props}>
      {/* Metrics Cards */}
      {showMetrics && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card.Metrics
            title="Total Communications"
            value={metrics.summary?.totalCommunications || 0}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
              </svg>
            }
          />
          <Card.Metrics
            title="Pending Responses"
            value={overdueCommunications?.responses?.length || 0}
            changeType="negative"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <Card.Metrics
            title="Overdue Follow-ups"
            value={overdueCommunications?.followUps?.length || 0}
            changeType="negative"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <Card.Metrics
            title="Active Communications"
            value={communications.filter(c => c.status === 'sent' || c.status === 'delivered').length}
            changeType="positive"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="flex space-x-3">
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            Create Communication
          </Button>
          {showBulkActions && selectedCommunications.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setShowBulkActionsModal(true)}
            >
              Bulk Actions ({selectedCommunications.length})
            </Button>
          )}
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="ghost"
            onClick={loadCommunications}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Communications Table */}
      <Card>
        <Table
          columns={tableColumns}
          data={communications}
          loading={loading}
          sortable={true}
          onSort={handleSort}
          defaultSortField={sortField}
          defaultSortDirection={sortOrder}
          filterable={true}
          onFilter={handleFilter}
          selectable={true}
          selectedRows={selectedCommunications}
          onSelectionChange={setSelectedCommunications}
          pagination={true}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          rowsPerPage={itemsPerPage}
          onRowsPerPageChange={handleItemsPerPageChange}
          totalItems={totalItems}
          exportable={true}
          onExport={(exportData) => {
            // Handle export
            console.log('Export data:', exportData);
          }}
        />
      </Card>

      {/* Create Communication Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        size="lg"
        title="Create Communication"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Entity Type</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.entityType}
                onChange={(e) => setFormData({ ...formData, entityType: e.target.value })}
              >
                <option value="contact">Contact</option>
                <option value="investor">Investor</option>
                <option value="user">User</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Entity ID</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.entityId}
                onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Interaction Type</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.interactionType}
                onChange={(e) => setFormData({ ...formData, interactionType: e.target.value })}
              >
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="sms">SMS</option>
                <option value="chat">Chat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Channel</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="chat">Chat</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Direction</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
              >
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Agent ID</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.agentId}
                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
              />
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
            <label className="block text-sm font-medium text-gray-700">Content</label>
            <textarea
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Scheduled For</label>
              <input
                type="datetime-local"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.scheduledFor}
                onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Response Expected By</label>
              <input
                type="datetime-local"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.responseExpectedBy}
                onChange={(e) => setFormData({ ...formData, responseExpectedBy: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={formData.followUpRequired}
              onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
            />
            <label className="ml-2 block text-sm text-gray-900">
              Follow-up Required
            </label>
          </div>

          {formData.followUpRequired && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Follow-up Date</label>
                <input
                  type="datetime-local"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Follow-up Notes</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formData.followUpNotes}
                  onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })}
                />
              </div>
            </div>
          )}
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
            onClick={handleCreateCommunication}
            loading={loading}
          >
            Create Communication
          </Button>
        </div>
      </Modal>

      {/* Edit Communication Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        size="lg"
        title="Edit Communication"
      >
        <div className="space-y-4">
          {/* Same form as create modal */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Entity Type</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.entityType}
                onChange={(e) => setFormData({ ...formData, entityType: e.target.value })}
              >
                <option value="contact">Contact</option>
                <option value="investor">Investor</option>
                <option value="user">User</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Entity ID</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.entityId}
                onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Interaction Type</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.interactionType}
                onChange={(e) => setFormData({ ...formData, interactionType: e.target.value })}
              >
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="sms">SMS</option>
                <option value="chat">Chat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Channel</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="chat">Chat</option>
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
            <label className="block text-sm font-medium text-gray-700">Content</label>
            <textarea
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
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
            onClick={handleUpdateCommunication}
            loading={loading}
          >
            Update Communication
          </Button>
        </div>
      </Modal>

      {/* Follow-up Modal */}
      <Modal
        isOpen={showFollowUpModal}
        onClose={() => {
          setShowFollowUpModal(false);
          setFollowUpData({ followUpDate: '', notes: '' });
        }}
        title="Add Follow-up"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Follow-up Date</label>
            <input
              type="datetime-local"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={followUpData.followUpDate}
              onChange={(e) => setFollowUpData({ ...followUpData, followUpDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={followUpData.notes}
              onChange={(e) => setFollowUpData({ ...followUpData, notes: e.target.value })}
              placeholder="Enter follow-up notes..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowFollowUpModal(false);
              setFollowUpData({ followUpDate: '', notes: '' });
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => currentCommunication && handleAddFollowUp(currentCommunication._id || currentCommunication.communicationId)}
          >
            Add Follow-up
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
            {selectedCommunications.length} communications selected
          </p>

          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => handleBulkUpdate({ status: 'sent' })}
            >
              Mark as Sent
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => handleBulkUpdate({ status: 'delivered' })}
            >
              Mark as Delivered
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

CrmCommunications.propTypes = {
  className: PropTypes.string,
  initialFilters: PropTypes.object,
  onCommunicationSelect: PropTypes.func,
  showMetrics: PropTypes.bool,
  showBulkActions: PropTypes.bool
};

export default CrmCommunications;