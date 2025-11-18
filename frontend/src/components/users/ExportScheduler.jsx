import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, useNotification } from '../common/index.js';
import { usersAPI } from '../../api/users.js';
import { formatDate } from '../../utils/formatters.js';

const ExportScheduler = ({ isOpen, onClose }) => {
  const { showNotification } = useNotification();
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    exportOptions: {
      format: 'xlsx',
      scope: 'all',
      columns: [],
      includeRelatedData: {
        applications: false,
        installations: false,
        communications: false,
        documents: false,
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
    },
    schedule: {
      frequency: 'daily',
      dayOfWeek: 1, // Monday
      dayOfMonth: 1,
      time: '09:00',
      timezone: 'UTC',
      enabled: true,
    },
    notifications: {
      emailRecipients: [],
      onSuccess: true,
      onFailure: true,
    },
  });

  // Available columns for scheduling
  const availableColumns = [
    { key: '_id', label: 'ID', category: 'basic' },
    { key: 'userId', label: 'User ID', category: 'basic' },
    { key: 'firstName', label: 'First Name', category: 'basic' },
    { key: 'lastName', label: 'Last Name', category: 'basic' },
    { key: 'email', label: 'Email', category: 'contact' },
    { key: 'phone', label: 'Phone', category: 'contact' },
    { key: 'address', label: 'Address', category: 'contact' },
    { key: 'city', label: 'City', category: 'contact' },
    { key: 'country', label: 'Country', category: 'contact' },
    { key: 'status', label: 'Status', category: 'status' },
    { key: 'applicationStatus', label: 'Application Status', category: 'status' },
    { key: 'installationStatus', label: 'Installation Status', category: 'status' },
    { key: 'kycStatus', label: 'KYC Status', category: 'status' },
    { key: 'riskLevel', label: 'Risk Level', category: 'status' },
    { key: 'joinedDate', label: 'Joined Date', category: 'dates' },
    { key: 'lastActiveDate', label: 'Last Active Date', category: 'dates' },
    { key: 'createdAt', label: 'Created At', category: 'dates' },
    { key: 'updatedAt', label: 'Updated At', category: 'dates' },
  ];

  // Load schedules when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSchedules();
    }
  }, [isOpen]);

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const response = await usersAPI.getScheduledExports();
      setSchedules(response.data || []);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      showNotification({
        type: 'error',
        message: 'Failed to load export schedules'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!formData.name.trim()) {
      showNotification({
        type: 'error',
        message: 'Schedule name is required'
      });
      return;
    }

    if (formData.exportOptions.columns.length === 0) {
      showNotification({
        type: 'error',
        message: 'Please select at least one column to export'
      });
      return;
    }

    try {
      await usersAPI.scheduleExport(formData);
      showNotification({
        type: 'success',
        message: 'Export schedule created successfully'
      });
      loadSchedules();
      setShowCreateForm(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create schedule:', error);
      showNotification({
        type: 'error',
        message: 'Failed to create export schedule'
      });
    }
  };

  const handleUpdateSchedule = async () => {
    if (!formData.name.trim()) {
      showNotification({
        type: 'error',
        message: 'Schedule name is required'
      });
      return;
    }

    if (formData.exportOptions.columns.length === 0) {
      showNotification({
        type: 'error',
        message: 'Please select at least one column to export'
      });
      return;
    }

    try {
      await usersAPI.updateScheduledExport(editingSchedule._id, formData);
      showNotification({
        type: 'success',
        message: 'Export schedule updated successfully'
      });
      loadSchedules();
      setShowEditForm(false);
      setEditingSchedule(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update schedule:', error);
      showNotification({
        type: 'error',
        message: 'Failed to update export schedule'
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await usersAPI.deleteScheduledExport(scheduleId);
      showNotification({
        type: 'success',
        message: 'Export schedule deleted successfully'
      });
      loadSchedules();
      setShowDeleteConfirm(false);
      setSelectedSchedules([]);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      showNotification({
        type: 'error',
        message: 'Failed to delete export schedule'
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedSchedules.map(id => usersAPI.deleteScheduledExport(id)));
      showNotification({
        type: 'success',
        message: `${selectedSchedules.length} schedule(s) deleted successfully`
      });
      loadSchedules();
      setSelectedSchedules([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete schedules:', error);
      showNotification({
        type: 'error',
        message: 'Failed to delete export schedules'
      });
    }
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      description: schedule.description || '',
      exportOptions: schedule.exportOptions || formData.exportOptions,
      schedule: schedule.schedule || formData.schedule,
      notifications: schedule.notifications || formData.notifications,
    });
    setShowEditForm(true);
  };

  const handleToggleSchedule = async (scheduleId, enabled) => {
    try {
      await usersAPI.updateScheduledExport(scheduleId, { ...editingSchedule, schedule: { ...editingSchedule.schedule, enabled } });
      showNotification({
        type: 'success',
        message: `Export schedule ${enabled ? 'enabled' : 'disabled'} successfully`
      });
      loadSchedules();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
      showNotification({
        type: 'error',
        message: 'Failed to update export schedule'
      });
    }
  };

  const handleSelectScheduleForDeletion = (scheduleId) => {
    setSelectedSchedules(prev => 
      prev.includes(scheduleId)
        ? prev.filter(id => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSchedules.length === schedules.length) {
      setSelectedSchedules([]);
    } else {
      setSelectedSchedules(schedules.map(schedule => schedule._id));
    }
  };

  const handleColumnToggle = (columnKey) => {
    setFormData(prev => ({
      ...prev,
      exportOptions: {
        ...prev.exportOptions,
        columns: prev.exportOptions.columns.includes(columnKey)
          ? prev.exportOptions.columns.filter(key => key !== columnKey)
          : [...prev.exportOptions.columns, columnKey]
      }
    }));
  };

  const handleSelectAllColumns = () => {
    setFormData(prev => ({
      ...prev,
      exportOptions: {
        ...prev.exportOptions,
        columns: availableColumns.map(col => col.key)
      }
    }));
  };

  const handleDeselectAllColumns = () => {
    setFormData(prev => ({
      ...prev,
      exportOptions: {
        ...prev.exportOptions,
        columns: []
      }
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      exportOptions: {
        format: 'xlsx',
        scope: 'all',
        columns: [],
        includeRelatedData: {
          applications: false,
          installations: false,
          communications: false,
          documents: false,
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
      },
      schedule: {
        frequency: 'daily',
        dayOfWeek: 1,
        dayOfMonth: 1,
        time: '09:00',
        timezone: 'UTC',
        enabled: true,
      },
      notifications: {
        emailRecipients: [],
        onSuccess: true,
        onFailure: true,
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
      title: 'Schedule Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.description}</div>
        </div>
      ),
    },
    {
      key: 'schedule.frequency',
      title: 'Frequency',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-900 capitalize">{value}</span>
      ),
    },
    {
      key: 'schedule.enabled',
      title: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'nextRun',
      title: 'Next Run',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-900">{value ? formatDate(value) : '-'}</span>
      ),
    },
    {
      key: 'lastRun',
      title: 'Last Run',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-900">{value ? formatDate(value) : '-'}</span>
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
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleToggleSchedule(row._id, !row.schedule.enabled)}
            className={`text-sm ${row.schedule.enabled ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
          >
            {row.schedule.enabled ? 'Disable' : 'Enable'}
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => handleEditSchedule(row)}
            className="text-blue-600 hover:text-blue-900 text-sm"
          >
            Edit
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => {
              setSelectedSchedules([row._id]);
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
      title="Export Scheduler"
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
              Create Schedule
            </Button>
          </div>
          {selectedSchedules.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {selectedSchedules.length} schedule(s) selected
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSchedules([])}
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

        {/* Schedules Table */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <Table
            columns={tableColumns}
            data={schedules}
            loading={isLoading}
            emptyMessage="No export schedules found"
            selectable={true}
            selectedRows={selectedSchedules}
            onSelectionChange={setSelectedSchedules}
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

      {/* Create Schedule Modal */}
      {showCreateForm && (
        <Modal
          isOpen={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          title="Create Export Schedule"
          size="xl"
        >
          <ScheduleForm
            formData={formData}
            setFormData={setFormData}
            availableColumns={availableColumns}
            groupedColumns={groupedColumns}
            handleColumnToggle={handleColumnToggle}
            handleSelectAllColumns={handleSelectAllColumns}
            handleDeselectAllColumns={handleDeselectAllColumns}
            onSubmit={handleCreateSchedule}
            onCancel={() => setShowCreateForm(false)}
            submitText="Create Schedule"
          />
        </Modal>
      )}

      {/* Edit Schedule Modal */}
      {showEditForm && (
        <Modal
          isOpen={showEditForm}
          onClose={() => setShowEditForm(false)}
          title="Edit Export Schedule"
          size="xl"
        >
          <ScheduleForm
            formData={formData}
            setFormData={setFormData}
            availableColumns={availableColumns}
            groupedColumns={groupedColumns}
            handleColumnToggle={handleColumnToggle}
            handleSelectAllColumns={handleSelectAllColumns}
            handleDeselectAllColumns={handleDeselectAllColumns}
            onSubmit={handleUpdateSchedule}
            onCancel={() => {
              setShowEditForm(false);
              setEditingSchedule(null);
              resetForm();
            }}
            submitText="Update Schedule"
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
              Are you sure you want to delete {selectedSchedules.length} schedule(s)? This action cannot be undone.
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

// Schedule Form Component
const ScheduleForm = ({
  formData,
  setFormData,
  availableColumns,
  groupedColumns,
  handleColumnToggle,
  handleSelectAllColumns,
  handleDeselectAllColumns,
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              placeholder="Enter schedule name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              placeholder="Enter schedule description (optional)"
            />
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Export Options</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Export Format</label>
            <select
              value={formData.exportOptions.format}
              onChange={(e) => setFormData({...formData, exportOptions: {...formData.exportOptions, format: e.target.value}})}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
              <option value="pdf">PDF (.pdf)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Export Scope</label>
            <select
              value={formData.exportOptions.scope}
              onChange={(e) => setFormData({...formData, exportOptions: {...formData.exportOptions, scope: e.target.value}})}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="all">All Users</option>
              <option value="filtered">Filtered Results</option>
              <option value="selected">Selected Users</option>
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
                      checked={formData.exportOptions.columns.includes(column.key)}
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

      {/* Schedule Configuration */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Schedule Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <select
              value={formData.schedule.frequency}
              onChange={(e) => setFormData({...formData, schedule: {...formData.schedule, frequency: e.target.value}})}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <input
              type="time"
              value={formData.schedule.time}
              onChange={(e) => setFormData({...formData, schedule: {...formData.schedule, time: e.target.value}})}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select
              value={formData.schedule.timezone}
              onChange={(e) => setFormData({...formData, schedule: {...formData.schedule, timezone: e.target.value}})}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
            </select>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.schedule.enabled}
                onChange={(e) => setFormData({...formData, schedule: {...formData.schedule, enabled: e.target.checked}})}
                className="mr-2"
              />
              <span>Enable Schedule</span>
            </label>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Notification Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Recipients</label>
            <input
              type="text"
              value={formData.notifications.emailRecipients.join(', ')}
              onChange={(e) => setFormData({...formData, notifications: {...formData.notifications, emailRecipients: e.target.value.split(',').map(email => email.trim())}})}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              placeholder="email@example.com, email2@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.notifications.onSuccess}
                onChange={(e) => setFormData({...formData, notifications: {...formData.notifications, onSuccess: e.target.checked}})}
                className="mr-2"
              />
              <span>Notify on success</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.notifications.onFailure}
                onChange={(e) => setFormData({...formData, notifications: {...formData.notifications, onFailure: e.target.checked}})}
                className="mr-2"
              />
              <span>Notify on failure</span>
            </label>
          </div>
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

export default ExportScheduler;