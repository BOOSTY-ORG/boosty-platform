import React, { useState } from 'react';
import Button from '../common/Button.jsx';

const CommunicationFilters = ({ filters, onFilterChange, onClose }) => {
  const [localFilters, setLocalFilters] = useState({
    type: '',
    status: '',
    priority: '',
    category: '',
    dateRange: { start: '', end: '' },
    ...filters
  });

  const handleChange = (field, value) => {
    const newFilters = { ...localFilters, [field]: value };
    setLocalFilters(newFilters);
  };

  const handleDateRangeChange = (field, value) => {
    const newFilters = {
      ...localFilters,
      dateRange: {
        ...localFilters.dateRange,
        [field]: value
      }
    };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    // Remove empty values
    const cleanedFilters = Object.keys(localFilters).reduce((acc, key) => {
      const value = localFilters[key];
      if (key === 'dateRange') {
        if (value.start || value.end) {
          acc[key] = value;
        }
      } else if (value !== '' && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});
    
    onFilterChange(cleanedFilters);
    onClose();
  };

  const clearFilters = () => {
    const emptyFilters = {
      type: '',
      status: '',
      priority: '',
      category: '',
      dateRange: { start: '', end: '' }
    };
    setLocalFilters(emptyFilters);
    onFilterChange({});
    onClose();
  };

  const communicationTypes = [
    { value: 'email', label: 'Email' },
    { value: 'sms', label: 'SMS' },
    { value: 'in_app', label: 'In-App' },
    { value: 'push_notification', label: 'Push Notification' }
  ];

  const communicationStatuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'sent', label: 'Sent' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'read', label: 'Read' },
    { value: 'failed', label: 'Failed' }
  ];

  const communicationPriorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ];

  const communicationCategories = [
    { value: 'welcome', label: 'Welcome' },
    { value: 'application', label: 'Application' },
    { value: 'kyc', label: 'KYC' },
    { value: 'payment', label: 'Payment' },
    { value: 'support', label: 'Support' },
    { value: 'marketing', label: 'Marketing' }
  ];

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Filter Communications</h3>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Communication Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Communication Type
            </label>
            <select
              id="type"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              value={localFilters.type}
              onChange={(e) => handleChange('type', e.target.value)}
            >
              <option value="">All Types</option>
              {communicationTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              value={localFilters.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              {communicationStatuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              id="priority"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              value={localFilters.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
            >
              <option value="">All Priorities</option>
              {communicationPriorities.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              value={localFilters.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              {communicationCategories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              value={localFilters.dateRange.start}
              onChange={(e) => handleDateRangeChange('start', e.target.value)}
            />
          </div>

          {/* Date Range End */}
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              value={localFilters.dateRange.end}
              onChange={(e) => handleDateRangeChange('end', e.target.value)}
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {Object.keys(filters).length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
            <div className="flex flex-wrap gap-2">
              {filters.type && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                  Type: {communicationTypes.find(t => t.value === filters.type)?.label || filters.type}
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                  Status: {communicationStatuses.find(s => s.value === filters.status)?.label || filters.status}
                </span>
              )}
              {filters.priority && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                  Priority: {communicationPriorities.find(p => p.value === filters.priority)?.label || filters.priority}
                </span>
              )}
              {filters.category && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                  Category: {communicationCategories.find(c => c.value === filters.category)?.label || filters.category}
                </span>
              )}
              {filters.dateRange && (filters.dateRange.start || filters.dateRange.end) && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                  Date: {filters.dateRange.start || 'Start'} - {filters.dateRange.end || 'End'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <Button
            onClick={clearFilters}
            variant="secondary"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Clear Filters
          </Button>
          <Button
            onClick={applyFilters}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommunicationFilters;