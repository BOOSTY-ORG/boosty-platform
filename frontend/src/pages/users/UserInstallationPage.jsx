import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext.jsx';
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters.js';

const UserInstallationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    currentUser, 
    installations, 
    isLoading, 
    error, 
    getUserById,
    getUserInstallations,
    createUserInstallation,
    updateUserInstallation
  } = useUser();
  
  const [activeTab, setActiveTab] = useState('current');
  const [isEditing, setIsEditing] = useState(false);
  const [editingInstallation, setEditingInstallation] = useState(null);
  const [showNewInstallationForm, setShowNewInstallationForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'solar',
    capacity: '',
    address: '',
    scheduledDate: '',
    estimatedDuration: '',
    technician: '',
    notes: '',
    cost: ''
  });

  useEffect(() => {
    if (id) {
      getUserById(id);
      getUserInstallations(id);
    }
  }, [id]);

  const handleStatusUpdate = async (installationId, newStatus) => {
    try {
      await updateUserInstallation(id, installationId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update installation status:', error);
    }
  };

  const handleEditInstallation = (installation) => {
    setEditingInstallation(installation);
    setFormData({
      type: installation.type || 'solar',
      capacity: installation.capacity || '',
      address: installation.address || '',
      scheduledDate: installation.scheduledDate ? new Date(installation.scheduledDate).toISOString().split('T')[0] : '',
      estimatedDuration: installation.estimatedDuration || '',
      technician: installation.technician || '',
      notes: installation.notes || '',
      cost: installation.cost || ''
    });
    setIsEditing(true);
  };

  const handleSaveInstallation = async () => {
    try {
      if (editingInstallation) {
        await updateUserInstallation(id, editingInstallation._id, formData);
      } else {
        await createUserInstallation(id, formData);
      }
      
      setIsEditing(false);
      setEditingInstallation(null);
      setShowNewInstallationForm(false);
      setFormData({
        type: 'solar',
        capacity: '',
        address: '',
        scheduledDate: '',
        estimatedDuration: '',
        technician: '',
        notes: '',
        cost: ''
      });
    } catch (error) {
      console.error('Failed to save installation:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingInstallation(null);
    setShowNewInstallationForm(false);
    setFormData({
      type: 'solar',
      capacity: '',
      address: '',
      scheduledDate: '',
      estimatedDuration: '',
      technician: '',
      notes: '',
      cost: ''
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading user installations</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentInstallations = installations?.filter(installation => 
    ['scheduled', 'in_progress'].includes(installation.status)
  ) || [];
  
  const pastInstallations = installations?.filter(installation => 
    ['completed', 'cancelled'].includes(installation.status)
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center">
            <button
              onClick={() => navigate(`/users/${id}`)}
              className="mr-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
              User Installations
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track solar energy installations for {currentUser?.firstName} {currentUser?.lastName}.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            onClick={() => navigate(`/users/${id}`)}
          >
            Back to User
          </button>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            onClick={() => setShowNewInstallationForm(true)}
          >
            Schedule Installation
          </button>
        </div>
      </div>

      {/* New Installation Form */}
      {(showNewInstallationForm || isEditing) && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {isEditing ? 'Edit Installation' : 'Schedule New Installation'}
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Installation Type
                </label>
                <select
                  id="type"
                  name="type"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  disabled={isEditing}
                >
                  <option value="solar">Solar Installation</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="repair">Repair</option>
                  <option value="upgrade">System Upgrade</option>
                </select>
              </div>

              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                  System Capacity (kW)
                </label>
                <input
                  type="text"
                  id="capacity"
                  name="capacity"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="e.g., 5.5"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Installation Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full installation address"
                />
              </div>

              <div>
                <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  id="scheduledDate"
                  name="scheduledDate"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="estimatedDuration" className="block text-sm font-medium text-gray-700">
                  Estimated Duration
                </label>
                <select
                  id="estimatedDuration"
                  name="estimatedDuration"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.estimatedDuration}
                  onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                >
                  <option value="">Select duration</option>
                  <option value="half_day">Half Day</option>
                  <option value="full_day">Full Day</option>
                  <option value="2_days">2 Days</option>
                  <option value="3_days">3 Days</option>
                  <option value="1_week">1 Week</option>
                </select>
              </div>

              <div>
                <label htmlFor="technician" className="block text-sm font-medium text-gray-700">
                  Assigned Technician
                </label>
                <input
                  type="text"
                  id="technician"
                  name="technician"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.technician}
                  onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                  placeholder="Technician name"
                />
              </div>

              <div>
                <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
                  Estimated Cost ($)
                </label>
                <input
                  type="text"
                  id="cost"
                  name="cost"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="e.g., 15000"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Installation Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special requirements, access information, etc."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={handleSaveInstallation}
              >
                {isEditing ? 'Update Installation' : 'Schedule Installation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('current')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'current'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Current Installations ({currentInstallations.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'past'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Past Installations ({pastInstallations.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'current' && (
            <div className="space-y-4">
              {currentInstallations.length > 0 ? (
                currentInstallations.map((installation) => (
                  <div key={installation._id} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {installation.type === 'solar' ? 'Solar Installation' : 
                           installation.type === 'maintenance' ? 'Maintenance' : 
                           installation.type === 'repair' ? 'Repair' : 'System Upgrade'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Installation ID: {installation.installationId || installation._id.slice(-8)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(installation.status)}`}>
                          {formatStatus(installation.status)}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEditInstallation(installation)}
                            className="text-primary-600 hover:text-primary-900 text-sm"
                          >
                            Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          <select
                            value={installation.status}
                            onChange={(e) => handleStatusUpdate(installation._id, e.target.value)}
                            className="text-sm border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Complete</option>
                            <option value="cancelled">Cancel</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Capacity</p>
                        <p className="text-sm text-gray-900">{installation.capacity ? `${installation.capacity} kW` : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Technician</p>
                        <p className="text-sm text-gray-900">{installation.technician || 'Not assigned'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Duration</p>
                        <p className="text-sm text-gray-900">{formatStatus(installation.estimatedDuration) || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Cost</p>
                        <p className="text-sm text-gray-900">{installation.cost ? formatCurrency(installation.cost) : 'N/A'}</p>
                      </div>
                    </div>

                    {installation.address && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-500">Installation Address</p>
                        <p className="text-sm text-gray-900">{installation.address}</p>
                      </div>
                    )}

                    {installation.scheduledDate && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-500">Scheduled Date</p>
                        <p className="text-sm text-gray-900">{formatDate(installation.scheduledDate)}</p>
                      </div>
                    )}

                    {installation.notes && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-500">Notes</p>
                        <p className="text-sm text-gray-900">{installation.notes}</p>
                      </div>
                    )}

                    <div className="mt-4 flex justify-between text-sm text-gray-500">
                      <span>Created: {formatDate(installation.createdAt)}</span>
                      <span>Last Updated: {formatDate(installation.updatedAt)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No current installations</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This user doesn't have any active installations.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'past' && (
            <div className="space-y-4">
              {pastInstallations.length > 0 ? (
                pastInstallations.map((installation) => (
                  <div key={installation._id} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {installation.type === 'solar' ? 'Solar Installation' : 
                           installation.type === 'maintenance' ? 'Maintenance' : 
                           installation.type === 'repair' ? 'Repair' : 'System Upgrade'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Installation ID: {installation.installationId || installation._id.slice(-8)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(installation.status)}`}>
                          {formatStatus(installation.status)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Capacity</p>
                        <p className="text-sm text-gray-900">{installation.capacity ? `${installation.capacity} kW` : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Technician</p>
                        <p className="text-sm text-gray-900">{installation.technician || 'Not assigned'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Duration</p>
                        <p className="text-sm text-gray-900">{formatStatus(installation.estimatedDuration) || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Cost</p>
                        <p className="text-sm text-gray-900">{installation.cost ? formatCurrency(installation.cost) : 'N/A'}</p>
                      </div>
                    </div>

                    {installation.completionDate && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-500">Completion Date</p>
                        <p className="text-sm text-gray-900">{formatDate(installation.completionDate)}</p>
                      </div>
                    )}

                    <div className="mt-4 flex justify-between text-sm text-gray-500">
                      <span>Created: {formatDate(installation.createdAt)}</span>
                      <span>Last Updated: {formatDate(installation.updatedAt)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No past installations</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This user doesn't have any completed installations.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserInstallationPage;