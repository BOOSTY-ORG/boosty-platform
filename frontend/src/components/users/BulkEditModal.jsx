import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../common/Modal';
import { usersAPI } from '../../api/users';

/**
 * BulkEditModal component for editing multiple users at once
 */
const BulkEditModal = ({ 
  isOpen, 
  onClose, 
  userIds, 
  onSuccess, 
  onError 
}) => {
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState({
    status: '',
    userType: '',
    assignedTo: '',
    tags: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFields({
        status: '',
        userType: '',
        assignedTo: '',
        tags: '',
        notes: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleFieldChange = (field, value) => {
    setFields(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Check if at least one field is filled
    const hasChanges = Object.values(fields).some(value => value !== '');
    if (!hasChanges) {
      newErrors.general = 'Please select at least one field to update';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Filter out empty fields
      const updateData = Object.entries(fields).reduce((acc, [key, value]) => {
        if (value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      await usersAPI.bulkUpdateUsers(userIds, updateData);
      
      onSuccess && onSuccess({
        message: `Successfully updated ${userIds.length} user(s)`,
        updatedCount: userIds.length
      });
      
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update users';
      setErrors({ general: errorMessage });
      onError && onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={`Edit ${userIds.length} User${userIds.length > 1 ? 's' : ''}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{errors.general}</div>
          </div>
        )}
        
        <div className="text-sm text-gray-600 mb-4">
          Select the fields you want to update. Empty fields will be ignored.
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Field */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={fields.status}
              onChange={(e) => handleFieldChange('status', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">No change</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          
          {/* User Type Field */}
          <div>
            <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-1">
              User Type
            </label>
            <select
              id="userType"
              value={fields.userType}
              onChange={(e) => handleFieldChange('userType', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">No change</option>
              <option value="individual">Individual</option>
              <option value="business">Business</option>
              <option value="partner">Partner</option>
              <option value="agent">Agent</option>
            </select>
          </div>
          
          {/* Assigned To Field */}
          <div>
            <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
              Assigned To
            </label>
            <select
              id="assignedTo"
              value={fields.assignedTo}
              onChange={(e) => handleFieldChange('assignedTo', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">No change</option>
              <option value="team-lead">Team Lead</option>
              <option value="senior-advisor">Senior Advisor</option>
              <option value="junior-advisor">Junior Advisor</option>
              <option value="support">Support Team</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
          
          {/* Tags Field */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              value={fields.tags}
              onChange={(e) => handleFieldChange('tags', e.target.value)}
              placeholder="Enter tags separated by commas"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Separate multiple tags with commas
            </p>
          </div>
        </div>
        
        {/* Notes Field */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={fields.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Add notes for this bulk update..."
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Updating...' : `Update ${userIds.length} User${userIds.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

BulkEditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  userIds: PropTypes.array.isRequired,
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
};

export default BulkEditModal;