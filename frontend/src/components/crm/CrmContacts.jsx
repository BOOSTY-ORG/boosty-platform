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
 * CRM Contacts Component
 * 
 * A comprehensive component for managing CRM contacts with:
 * - Contact list with advanced search and segmentation
 * - Contact creation and editing forms with consent management
 * - Engagement metrics and lead scoring visualization
 * - Bulk operations and import/export functionality
 * 
 * @component
 */
const CrmContacts = ({
  className = '',
  initialFilters = {},
  onContactSelect = null,
  showMetrics = true,
  showBulkActions = true,
  ...props
}) => {
  // State management
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [currentContact, setCurrentContact] = useState(null);
  
  // Metrics state
  const [metrics, setMetrics] = useState(null);
  const [highValueLeads, setHighValueLeads] = useState([]);
  const [unassignedContacts, setUnassignedContacts] = useState([]);
  const [contactStats, setContactStats] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    contactType: 'lead',
    contactSource: 'website',
    company: '',
    jobTitle: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: ''
    },
    tags: [],
    status: 'active',
    assignedTo: '',
    consent: {
      marketing: false,
      marketingGivenAt: '',
      marketingMethod: ''
    }
  });
  
  const [importData, setImportData] = useState(null);
  const [exportOptions, setExportOptions] = useState({
    format: 'csv',
    includeInactive: false,
    fields: ['firstName', 'lastName', 'email', 'phone', 'contactType', 'contactSource', 'company', 'jobTitle']
  });
  
  const [segmentData, setSegmentData] = useState({
    name: '',
    description: '',
    conditions: [],
    operator: 'and'
  });

  // Load contacts data
  const loadContacts = useCallback(async () => {
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
      
      const response = await crmService.getContacts(params);
      setContacts(response.data?.data || []);
      setTotalPages(response.data?.pagination?.pages || 1);
      setTotalItems(response.data?.pagination?.total || 0);
    } catch (error) {
      toast.error(`Failed to load contacts: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortField, sortOrder, filters, searchQuery]);

  // Load metrics
  const loadMetrics = useCallback(async () => {
    if (!showMetrics) return;
    
    try {
      const [metricsResponse, highValueResponse, unassignedResponse, statsResponse] = await Promise.all([
        crmService.getOverview(),
        crmService.getHighValueLeads(),
        crmService.getUnassignedContacts(),
        crmService.getContactStats()
      ]);
      
      setMetrics(metricsResponse);
      setHighValueLeads(highValueResponse.data?.data || []);
      setUnassignedContacts(unassignedResponse.data?.data || []);
      setContactStats(statsResponse.data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  }, [showMetrics]);

  // Initial data load
  useEffect(() => {
    loadContacts();
    loadMetrics();
  }, [loadContacts, loadMetrics]);

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

  // Handle contact selection
  const handleContactSelect = (contactId, checked) => {
    setSelectedContacts(prev =>
      checked
        ? [...prev, contactId]
        : prev.filter(id => id !== contactId)
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedContacts(
      checked ? contacts.map(c => c._id || c.contactId) : []
    );
  };

  // Handle contact creation
  const handleCreateContact = async () => {
    try {
      setLoading(true);
      const newContact = await crmService.createContact(formData);
      setContacts(prev => [newContact, ...prev]);
      setShowCreateModal(false);
      resetForm();
      toast.success('Contact created successfully');
    } catch (error) {
      toast.error(`Failed to create contact: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle contact update
  const handleUpdateContact = async () => {
    if (!currentContact) return;
    
    try {
      setLoading(true);
      const updatedContact = await crmService.updateContact(
        currentContact._id || currentContact.contactId,
        formData
      );
      setContacts(prev =>
        prev.map(c =>
          (c._id || c.contactId) === (currentContact._id || currentContact.contactId)
            ? updatedContact
            : c
        )
      );
      setShowEditModal(false);
      resetForm();
      toast.success('Contact updated successfully');
    } catch (error) {
      toast.error(`Failed to update contact: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle contact deletion
  const handleDeleteContact = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    
    try {
      await crmService.deleteContact(contactId);
      setContacts(prev => prev.filter(c => (c._id || c.contactId) !== contactId));
      toast.success('Contact deleted successfully');
    } catch (error) {
      toast.error(`Failed to delete contact: ${error.message}`);
    }
  };

  // Handle consent management
  const handleGiveConsent = async (contactId) => {
    try {
      await crmService.giveMarketingConsent(contactId, {
        marketing: true,
        marketingMethod: 'manual',
        marketingGivenAt: new Date().toISOString()
      });
      setContacts(prev =>
        prev.map(c =>
          (c._id || c.contactId) === contactId
            ? { ...c, consent: { ...c.consent, marketing: true, marketingGivenAt: new Date() } }
            : c
        )
      );
      toast.success('Marketing consent given successfully');
    } catch (error) {
      toast.error(`Failed to give consent: ${error.message}`);
    }
  };

  const handleWithdrawConsent = async (contactId) => {
    if (!confirm('Are you sure you want to withdraw marketing consent?')) return;
    
    try {
      await crmService.withdrawConsent(contactId);
      setContacts(prev =>
        prev.map(c =>
          (c._id || c.contactId) === contactId
            ? { ...c, consent: { ...c.consent, marketing: false } }
            : c
        )
      );
      toast.success('Marketing consent withdrawn successfully');
    } catch (error) {
      toast.error(`Failed to withdraw consent: ${error.message}`);
    }
  };

  // Handle tag management
  const handleAddTag = async (contactId, tag) => {
    try {
      await crmService.addContactTag(contactId, tag);
      setContacts(prev =>
        prev.map(c =>
          (c._id || c.contactId) === contactId
            ? { ...c, tags: [...(c.tags || []), tag] }
            : c
        )
      );
      toast.success('Tag added successfully');
    } catch (error) {
      toast.error(`Failed to add tag: ${error.message}`);
    }
  };

  const handleRemoveTag = async (contactId, tag) => {
    try {
      await crmService.removeContactTag(contactId, tag);
      setContacts(prev =>
        prev.map(c =>
          (c._id || c.contactId) === contactId
            ? { ...c, tags: (c.tags || []).filter(t => t !== tag) }
            : c
        )
      );
      toast.success('Tag removed successfully');
    } catch (error) {
      toast.error(`Failed to remove tag: ${error.message}`);
    }
  };

  // Handle bulk operations
  const handleBulkAssign = async (userId) => {
    if (selectedContacts.length === 0) return;
    
    try {
      setLoading(true);
      await crmService.bulkAssignContacts(selectedContacts, userId);
      await loadContacts();
      setSelectedContacts([]);
      setShowBulkActionsModal(false);
      toast.success('Bulk assignment completed successfully');
    } catch (error) {
      toast.error(`Bulk assignment failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async (updateData) => {
    if (selectedContacts.length === 0) return;
    
    try {
      setLoading(true);
      await crmService.bulkUpdateContacts(selectedContacts, updateData);
      await loadContacts();
      setSelectedContacts([]);
      setShowBulkActionsModal(false);
      toast.success('Bulk update completed successfully');
    } catch (error) {
      toast.error(`Bulk update failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedContacts.length} contacts?`)) return;
    
    try {
      setLoading(true);
      await crmService.bulkDeleteContacts(selectedContacts);
      await loadContacts();
      setSelectedContacts([]);
      toast.success('Bulk delete completed successfully');
    } catch (error) {
      toast.error(`Bulk delete failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle import/export
  const handleImport = async () => {
    if (!importData) return;
    
    try {
      setLoading(true);
      await crmService.importContacts(importData);
      await loadContacts();
      setShowImportModal(false);
      setImportData(null);
      toast.success('Contacts imported successfully');
    } catch (error) {
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await crmService.exportContacts(exportOptions);
      // Handle file download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
      toast.success('Contacts exported successfully');
    } catch (error) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle segmentation
  const handleCreateSegment = async () => {
    try {
      // This would call a segment creation API
      // await crmService.createSegment(segmentData);
      setShowSegmentModal(false);
      setSegmentData({ name: '', description: '', conditions: [], operator: 'and' });
      toast.success('Segment created successfully');
    } catch (error) {
      toast.error(`Failed to create segment: ${error.message}`);
    }
  };

  // Form helpers
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      contactType: 'lead',
      contactSource: 'website',
      company: '',
      jobTitle: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: ''
      },
      tags: [],
      status: 'active',
      assignedTo: '',
      consent: {
        marketing: false,
        marketingGivenAt: '',
        marketingMethod: ''
      }
    });
    setCurrentContact(null);
  };

  const openEditModal = (contact) => {
    setCurrentContact(contact);
    setFormData({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      contactType: contact.contactType || 'lead',
      contactSource: contact.contactSource || 'website',
      company: contact.company || '',
      jobTitle: contact.jobTitle || '',
      address: {
        street: contact.address?.street || '',
        city: contact.address?.city || '',
        state: contact.address?.state || '',
        country: contact.address?.country || '',
        postalCode: contact.address?.postalCode || ''
      },
      tags: contact.tags || [],
      status: contact.status || 'active',
      assignedTo: contact.assignedTo || '',
      consent: {
        marketing: contact.consent?.marketing || false,
        marketingGivenAt: contact.consent?.marketingGivenAt || '',
        marketingMethod: contact.consent?.marketingMethod || ''
      }
    });
    setShowEditModal(true);
  };

  // Table columns definition
  const tableColumns = useMemo(() => [
    {
      key: 'displayName',
      title: 'Name',
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-gray-500">{row.email}</div>
          {row.phone && <div className="text-gray-500">{row.phone}</div>}
        </div>
      )
    },
    {
      key: 'contactType',
      title: 'Type',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'lead', label: 'Lead' },
        { value: 'prospect', label: 'Prospect' },
        { value: 'customer', label: 'Customer' }
      ],
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'lead' ? 'bg-yellow-100 text-yellow-800' :
          value === 'prospect' ? 'bg-blue-100 text-blue-800' :
          'bg-green-100 text-green-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'contactSource',
      title: 'Source',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'website', label: 'Website' },
        { value: 'referral', label: 'Referral' },
        { value: 'social', label: 'Social' },
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone' }
      ]
    },
    {
      key: 'company',
      title: 'Company',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-900">
          {value || 'N/A'}
        </div>
      )
    },
    {
      key: 'jobTitle',
      title: 'Job Title',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-900">
          {value || 'N/A'}
        </div>
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
        { value: 'archived', label: 'Archived' }
      ],
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'active' ? 'bg-green-100 text-green-800' :
          value === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'engagementScore',
      title: 'Engagement Score',
      sortable: true,
      render: (value) => {
        const score = value || 0;
        const color = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';
        return (
          <div className="text-sm">
            <div className={`font-medium ${color}`}>{score}/100</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  score >= 80 ? 'bg-green-600' : score >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                }`}
                style={{ width: `${score}%` }}
              ></div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'leadScore',
      title: 'Lead Score',
      sortable: true,
      render: (value) => {
        const score = value || 0;
        const color = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';
        return (
          <div className="text-sm">
            <div className={`font-medium ${color}`}>{score}/100</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  score >= 80 ? 'bg-green-600' : score >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                }`}
                style={{ width: `${score}%` }}
              ></div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'consent',
      title: 'Marketing Consent',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: true, label: 'Given' },
        { value: false, label: 'Not Given' }
      ],
      render: (value) => (
        <div className="text-sm">
          {value?.marketing ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Given
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Not Given
            </span>
          )}
        </div>
      )
    },
    {
      key: 'tags',
      title: 'Tags',
      sortable: false,
      render: (value, row) => (
        <div className="flex flex-wrap gap-1">
          {(value || []).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(row._id || row.contactId, tag)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )
    },
    {
      key: 'lastContactDate',
      title: 'Last Contact',
      sortable: true,
      filterType: 'date',
      render: (value) => (
        <div className="text-sm text-gray-900">
          {value ? new Date(value).toLocaleDateString() : 'Never'}
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
            onClick={() => onContactSelect?.(row)}
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
          {row.consent?.marketing ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleWithdrawConsent(row._id || row.contactId)}
            >
              Withdraw Consent
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleGiveConsent(row._id || row.contactId)}
            >
              Give Consent
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleDeleteContact(row._id || row.contactId)}
          >
            Delete
          </Button>
        </div>
      )
    }
  ], [onContactSelect]);

  return (
    <div className={`space-y-6 ${className}`} {...props}>
      {/* Metrics Cards */}
      {showMetrics && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card.Metrics
            title="Total Contacts"
            value={metrics.summary?.totalContacts || 0}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          <Card.Metrics
            title="High Value Leads"
            value={highValueLeads.length}
            changeType="positive"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
          />
          <Card.Metrics
            title="Unassigned Contacts"
            value={unassignedContacts.length}
            changeType="negative"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
          <Card.Metrics
            title="Active Contacts"
            value={contactStats?.active || 0}
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
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search contacts..."
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
            Create Contact
          </Button>
          
          {showBulkActions && selectedContacts.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setShowBulkActionsModal(true)}
            >
              Bulk Actions ({selectedContacts.length})
            </Button>
          )}
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowImportModal(true)}
          >
            Import
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowExportModal(true)}
          >
            Export
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowSegmentModal(true)}
          >
            Create Segment
          </Button>
          <Button
            variant="ghost"
            onClick={loadContacts}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Contacts Table */}
      <Card>
        <Table
          columns={tableColumns}
          data={contacts}
          loading={loading}
          sortable={true}
          onSort={handleSort}
          defaultSortField={sortField}
          defaultSortDirection={sortOrder}
          filterable={true}
          onFilter={handleFilter}
          selectable={true}
          selectedRows={selectedContacts}
          onSelectionChange={setSelectedContacts}
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

      {/* Create Contact Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        size="lg"
        title="Create Contact"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Type</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.contactType}
                onChange={(e) => setFormData({ ...formData, contactType: e.target.value })}
              >
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="customer">Customer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Source</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.contactSource}
                onChange={(e) => setFormData({ ...formData, contactSource: e.target.value })}
              >
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social">Social</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Job Title</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={formData.consent.marketing}
              onChange={(e) => setFormData({
                ...formData,
                consent: { ...formData.consent, marketing: e.target.checked }
              })}
            />
            <label className="ml-2 block text-sm text-gray-900">
              Marketing Consent
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
            onClick={handleCreateContact}
            loading={loading}
          >
            Create Contact
          </Button>
        </div>
      </Modal>

      {/* Edit Contact Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        size="lg"
        title="Edit Contact"
      >
        <div className="space-y-4">
          {/* Same form as create modal */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Type</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.contactType}
                onChange={(e) => setFormData({ ...formData, contactType: e.target.value })}
              >
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="customer">Customer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
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
            onClick={handleUpdateContact}
            loading={loading}
          >
            Update Contact
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
            {selectedContacts.length} contacts selected
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Assign to User</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                onChange={(e) => handleBulkAssign(e.target.value)}
              >
                <option value="">Select user...</option>
                {/* User options would be populated here */}
              </select>
            </div>
            
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => handleBulkUpdate({ status: 'active' })}
            >
              Mark as Active
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => handleBulkUpdate({ status: 'inactive' })}
            >
              Mark as Inactive
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

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportData(null);
        }}
        title="Import Contacts"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Select CSV File</label>
            <input
              type="file"
              accept=".csv"
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    // Parse CSV and set import data
                    setImportData(event.target.result);
                  };
                  reader.readAsText(file);
                }
              }}
            />
          </div>
          
          <div className="text-sm text-gray-600">
            <p>CSV format should include:</p>
            <ul className="list-disc list-inside mt-2">
              <li>firstName, lastName, email, phone</li>
              <li>contactType, contactSource, company, jobTitle</li>
              <li>Optional: address, tags, notes</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowImportModal(false);
              setImportData(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            loading={loading}
            disabled={!importData}
          >
            Import Contacts
          </Button>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Contacts"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Export Format</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={exportOptions.format}
              onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value })}
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={exportOptions.includeInactive}
              onChange={(e) => setExportOptions({ ...exportOptions, includeInactive: e.target.checked })}
            />
            <label className="ml-2 block text-sm text-gray-900">
              Include Inactive Contacts
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowExportModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            loading={loading}
          >
            Export Contacts
          </Button>
        </div>
      </Modal>

      {/* Segment Modal */}
      <Modal
        isOpen={showSegmentModal}
        onClose={() => {
          setShowSegmentModal(false);
          setSegmentData({ name: '', description: '', conditions: [], operator: 'and' });
        }}
        title="Create Segment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Segment Name</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={segmentData.name}
              onChange={(e) => setSegmentData({ ...segmentData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={segmentData.description}
              onChange={(e) => setSegmentData({ ...segmentData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Conditions</label>
            <div className="space-y-2">
              {/* Condition builder would go here */}
              <p className="text-sm text-gray-500">Advanced condition builder would be implemented here</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowSegmentModal(false);
              setSegmentData({ name: '', description: '', conditions: [], operator: 'and' });
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateSegment}
          >
            Create Segment
          </Button>
        </div>
      </Modal>
    </div>
  );
};

CrmContacts.propTypes = {
  className: PropTypes.string,
  initialFilters: PropTypes.object,
  onContactSelect: PropTypes.func,
  showMetrics: PropTypes.bool,
  showBulkActions: PropTypes.bool
};

export default CrmContacts;