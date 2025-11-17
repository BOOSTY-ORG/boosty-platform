import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, useNotification } from '../common/index.js';
import { investorsAPI } from '../../api/investors.js';
import { formatDate } from '../../utils/formatters.js';

const ExportTemplate = ({ isOpen, onClose, onTemplateSelect }) => {
  const { showNotification } = useNotification();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    format: 'xlsx',
    columns: [],
    includeRelatedData: {
      investments: false,
      transactions: false,
      kycDocuments: false,
    },
    csvOptions: {
      delimiter: ',',
      includeHeaders: true,
      encoding: 'utf-8',
    },
    excelOptions: {
      includeCharts: false,
      freezeHeader: true,
      autoFilter: true,
    },
    pdfOptions: {
      orientation: 'portrait',
      pageSize: 'A4',
      includeTableOfContents: false,
      includeSummary: true,
    },
  });

  // Available columns for templates
  const availableColumns = [
    { key: '_id', label: 'ID', category: 'basic' },
    { key: 'investorId', label: 'Investor ID', category: 'basic' },
    { key: 'firstName', label: 'First Name', category: 'basic' },
    { key: 'lastName', label: 'Last Name', category: 'basic' },
    { key: 'email', label: 'Email', category: 'contact' },
    { key: 'phone', label: 'Phone', category: 'contact' },
    { key: 'address', label: 'Address', category: 'contact' },
    { key: 'city', label: 'City', category: 'contact' },
    { key: 'country', label: 'Country', category: 'contact' },
    { key: 'status', label: 'Status', category: 'status' },
    { key: 'kycStatus', label: 'KYC Status', category: 'status' },
    { key: 'totalInvestment', label: 'Total Investment', category: 'financial' },
    { key: 'investmentCount', label: 'Investment Count', category: 'financial' },
    { key: 'lastInvestmentDate', label: 'Last Investment Date', category: 'financial' },
    { key: 'joinedDate', label: 'Joined Date', category: 'dates' },
    { key: 'lastActiveDate', label: 'Last Active Date', category: 'dates' },
    { key: 'createdAt', label: 'Created At', category: 'dates' },
    { key: 'updatedAt', label: 'Updated At', category: 'dates' },
  ];

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await investorsAPI.getExportTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
      showNotification({
        type: 'error',
        message: 'Failed to load export templates'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!formData.name.trim()) {
      showNotification({
        type: 'error',
        message: 'Template name is required'
      });
      return;
    }

    if (formData.columns.length === 0) {
      showNotification({
        type: 'error',
        message: 'Please select at least one column'
      });
      return;
    }

    try {
      await investorsAPI.createExportTemplate(formData);
      showNotification({
        type: 'success',
        message: 'Template created successfully'
      });
      loadTemplates();
      setShowCreateForm(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create template:', error);
      showNotification({
        type: 'error',
        message: 'Failed to create template'
      });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!formData.name.trim()) {
      showNotification({
        type: 'error',
        message: 'Template name is required'
      });
      return;
    }

    if (formData.columns.length === 0) {
      showNotification({
        type: 'error',
        message: 'Please select at least one column'
      });
      return;
    }

    try {
      await investorsAPI.updateExportTemplate(editingTemplate._id, formData);
      showNotification({
        type: 'success',
        message: 'Template updated successfully'
      });
      loadTemplates();
      setShowEditForm(false);
      setEditingTemplate(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update template:', error);
      showNotification({
        type: 'error',
        message: 'Failed to update template'
      });
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await investorsAPI.deleteExportTemplate(templateId);
      showNotification({
        type: 'success',
        message: 'Template deleted successfully'
      });
      loadTemplates();
      setShowDeleteConfirm(false);
      setSelectedTemplates([]);
    } catch (error) {
      console.error('Failed to delete template:', error);
      showNotification({
        type: 'error',
        message: 'Failed to delete template'
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedTemplates.map(id => investorsAPI.deleteExportTemplate(id)));
      showNotification({
        type: 'success',
        message: `${selectedTemplates.length} template(s) deleted successfully`
      });
      loadTemplates();
      setSelectedTemplates([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete templates:', error);
      showNotification({
        type: 'error',
        message: 'Failed to delete templates'
      });
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      format: template.format,
      columns: template.columns || [],
      includeRelatedData: template.includeRelatedData || {
        investments: false,
        transactions: false,
        kycDocuments: false,
      },
      csvOptions: template.csvOptions || {
        delimiter: ',',
        includeHeaders: true,
        encoding: 'utf-8',
      },
      excelOptions: template.excelOptions || {
        includeCharts: false,
        freezeHeader: true,
        autoFilter: true,
      },
      pdfOptions: template.pdfOptions || {
        orientation: 'portrait',
        pageSize: 'A4',
        includeTableOfContents: false,
        includeSummary: true,
      },
    });
    setShowEditForm(true);
  };

  const handleSelectTemplate = (template) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
    onClose();
  };

  const handleSelectTemplateForDeletion = (templateId) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTemplates.length === templates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(templates.map(template => template._id));
    }
  };

  const handleColumnToggle = (columnKey) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.includes(columnKey)
        ? prev.columns.filter(key => key !== columnKey)
        : [...prev.columns, columnKey]
    }));
  };

  const handleSelectAllColumns = () => {
    setFormData(prev => ({
      ...prev,
      columns: availableColumns.map(col => col.key)
    }));
  };

  const handleDeselectAllColumns = () => {
    setFormData(prev => ({
      ...prev,
      columns: []
    }));
  };

  const handleRelatedDataToggle = (dataType) => {
    setFormData(prev => ({
      ...prev,
      includeRelatedData: {
        ...prev.includeRelatedData,
        [dataType]: !prev.includeRelatedData[dataType]
      }
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      format: 'xlsx',
      columns: [],
      includeRelatedData: {
        investments: false,
        transactions: false,
        kycDocuments: false,
      },
      csvOptions: {
        delimiter: ',',
        includeHeaders: true,
        encoding: 'utf-8',
      },
      excelOptions: {
        includeCharts: false,
        freezeHeader: true,
        autoFilter: true,
      },
      pdfOptions: {
        orientation: 'portrait',
        pageSize: 'A4',
        includeTableOfContents: false,
        includeSummary: true,
      },
    });
  };

  const groupColumnsByCategory = () => {
    const grouped = {};
    availableColumns.forEach(column => {
      if (!grouped[column.category]) {
        grouped[column.category] = [];
      }
      grouped[column.category].push(column);
    });
    return grouped;
  };

  const groupedColumns = groupColumnsByCategory();

  const tableColumns = [
    {
      key: 'name',
      title: 'Template Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.description}</div>
        </div>
      ),
    },
    {
      key: 'format',
      title: 'Format',
      sortable: true,
      render: (value) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          {value?.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'columns',
      title: 'Columns',
      sortable: false,
      render: (value) => (
        <span className="text-sm text-gray-900">{value?.length || 0} selected</span>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-900">{formatDate(value)}</span>
      ),
    },
    {
      key: 'updatedAt',
      title: 'Updated',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-900">{formatDate(value)}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleSelectTemplate(row)}
            className="text-primary-600 hover:text-primary-900 text-sm"
          >
            Use
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => handleEditTemplate(row)}
            className="text-blue-600 hover:text-blue-900 text-sm"
          >
            Edit
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => {
              setSelectedTemplates([row._id]);
              setShowDeleteConfirm(true);
            }}
            className="text-red-600 hover:text-red-900 text-sm"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Templates"
      size="full"
    >
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setShowCreateForm(true);
              }}
            >
              Create Template
            </Button>
          </div>
          {selectedTemplates.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {selectedTemplates.length} template(s) selected
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedTemplates([])}
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
          )}
        </div>

        {/* Templates Table */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <Table
            columns={tableColumns}
            data={templates}
            loading={isLoading}
            emptyMessage="No export templates found"
            selectable={true}
            selectedRows={selectedTemplates}
            onSelectionChange={setSelectedTemplates}
            sortable={true}
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

      {/* Create Template Modal */}
      {showCreateForm && (
        <Modal
          isOpen={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          title="Create Export Template"
          size="xl"
        >
          <TemplateForm
            formData={formData}
            setFormData={setFormData}
            availableColumns={availableColumns}
            groupedColumns={groupedColumns}
            handleColumnToggle={handleColumnToggle}
            handleSelectAllColumns={handleSelectAllColumns}
            handleDeselectAllColumns={handleDeselectAllColumns}
            handleRelatedDataToggle={handleRelatedDataToggle}
            onSubmit={handleCreateTemplate}
            onCancel={() => setShowCreateForm(false)}
            submitText="Create Template"
          />
        </Modal>
      )}

      {/* Edit Template Modal */}
      {showEditForm && (
        <Modal
          isOpen={showEditForm}
          onClose={() => setShowEditForm(false)}
          title="Edit Export Template"
          size="xl"
        >
          <TemplateForm
            formData={formData}
            setFormData={setFormData}
            availableColumns={availableColumns}
            groupedColumns={groupedColumns}
            handleColumnToggle={handleColumnToggle}
            handleSelectAllColumns={handleSelectAllColumns}
            handleDeselectAllColumns={handleDeselectAllColumns}
            handleRelatedDataToggle={handleRelatedDataToggle}
            onSubmit={handleUpdateTemplate}
            onCancel={() => {
              setShowEditForm(false);
              setEditingTemplate(null);
              resetForm();
            }}
            submitText="Update Template"
          />
        </Modal>
      )}

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
              Are you sure you want to delete {selectedTemplates.length} template(s)? This action cannot be undone.
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

// Template Form Component
const TemplateForm = ({
  formData,
  setFormData,
  availableColumns,
  groupedColumns,
  handleColumnToggle,
  handleSelectAllColumns,
  handleDeselectAllColumns,
  handleRelatedDataToggle,
  onSubmit,
  onCancel,
  submitText
}) => {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              placeholder="Enter template name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              placeholder="Enter template description (optional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Export Format</label>
            <select
              value={formData.format}
              onChange={(e) => setFormData({...formData, format: e.target.value})}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
              <option value="pdf">PDF (.pdf)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Column Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">Select Columns</h3>
          <div className="space-x-2">
            <button
              type="button"
              className="text-sm text-primary-600 hover:text-primary-800"
              onClick={handleSelectAllColumns}
            >
              Select All
            </button>
            <button
              type="button"
              className="text-sm text-primary-600 hover:text-primary-800"
              onClick={handleDeselectAllColumns}
            >
              Deselect All
            </button>
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto border rounded-lg p-4">
          {Object.entries(groupedColumns).map(([category, columns]) => (
            <div key={category} className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2 capitalize">{category}</h4>
              <div className="grid grid-cols-2 gap-2">
                {columns.map(column => (
                  <label key={column.key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.columns.includes(column.key)}
                      onChange={() => handleColumnToggle(column.key)}
                      className="mr-2"
                    />
                    <span className="text-sm">{column.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Related Data */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Include Related Data</h3>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.includeRelatedData.investments}
              onChange={() => handleRelatedDataToggle('investments')}
              className="mr-2"
            />
            <span>Investment Details</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.includeRelatedData.transactions}
              onChange={() => handleRelatedDataToggle('transactions')}
              className="mr-2"
            />
            <span>Transaction History</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.includeRelatedData.kycDocuments}
              onChange={() => handleRelatedDataToggle('kycDocuments')}
              className="mr-2"
            />
            <span>KYC Document Status</span>
          </label>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onSubmit}
        >
          {submitText}
        </Button>
      </div>
    </div>
  );
};

export default ExportTemplate;