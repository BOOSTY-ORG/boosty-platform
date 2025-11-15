import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext.jsx';
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters.js';

const UserApplicationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    currentUser, 
    applications, 
    isLoading, 
    error, 
    getUserById,
    getUserApplications,
    createUserApplication,
    updateUserApplication
  } = useUser();
  
  const [activeTab, setActiveTab] = useState('current');
  const [isEditing, setIsEditing] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [showNewApplicationForm, setShowNewApplicationForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'solar',
    capacity: '',
    address: '',
    monthlyBill: '',
    roofType: '',
    shading: '',
    notes: ''
  });

  useEffect(() => {
    if (id) {
      getUserById(id);
      getUserApplications(id);
    }
  }, [id]);

  const handleStatusUpdate = async (applicationId, newStatus) => {
    try {
      await updateUserApplication(id, applicationId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update application status:', error);
    }
  };

  const handleEditApplication = (application) => {
    setEditingApplication(application);
    setFormData({
      type: application.type || 'solar',
      capacity: application.capacity || '',
      address: application.address || '',
      monthlyBill: application.monthlyBill || '',
      roofType: application.roofType || '',
      shading: application.shading || '',
      notes: application.notes || ''
    });
    setIsEditing(true);
  };

  const handleSaveApplication = async () => {
    try {
      if (editingApplication) {
        await updateUserApplication(id, editingApplication._id, formData);
      } else {
        await createUserApplication(id, formData);
      }
      
      setIsEditing(false);
      setEditingApplication(null);
      setShowNewApplicationForm(false);
      setFormData({
        type: 'solar',
        capacity: '',
        address: '',
        monthlyBill: '',
        roofType: '',
        shading: '',
        notes: ''
      });
    } catch (error) {
      console.error('Failed to save application:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingApplication(null);
    setShowNewApplicationForm(false);
    setFormData({
      type: 'solar',
      capacity: '',
      address: '',
      monthlyBill: '',
      roofType: '',
      shading: '',
      notes: ''
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
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
            <h3 className="text-sm font-medium text-red-800">Error loading user applications</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentApplications = applications?.filter(app => 
    ['submitted', 'under_review'].includes(app.status)
  ) || [];
  
  const pastApplications = applications?.filter(app => 
    ['approved', 'rejected'].includes(app.status)
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
              User Applications
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage and review solar energy applications for {currentUser?.firstName} {currentUser?.lastName}.
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
            onClick={() => setShowNewApplicationForm(true)}
          >
            New Application
          </button>
        </div>
      </div>

      {/* New Application Form */}
      {(showNewApplicationForm || isEditing) && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {isEditing ? 'Edit Application' : 'New Solar Application'}
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Application Type
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
                <label htmlFor="monthlyBill" className="block text-sm font-medium text-gray-700">
                  Current Monthly Electricity Bill ($)
                </label>
                <input
                  type="text"
                  id="monthlyBill"
                  name="monthlyBill"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.monthlyBill}
                  onChange={(e) => setFormData({ ...formData, monthlyBill: e.target.value })}
                  placeholder="e.g., 150"
                />
              </div>

              <div>
                <label htmlFor="roofType" className="block text-sm font-medium text-gray-700">
                  Roof Type
                </label>
                <select
                  id="roofType"
                  name="roofType"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.roofType}
                  onChange={(e) => setFormData({ ...formData, roofType: e.target.value })}
                >
                  <option value="">Select roof type</option>
                  <option value="metal">Metal</option>
                  <option value="tile">Tile</option>
                  <option value="shingle">Shingle</option>
                  <option value="flat">Flat</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="shading" className="block text-sm font-medium text-gray-700">
                  Shading Level
                </label>
                <select
                  id="shading"
                  name="shading"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.shading}
                  onChange={(e) => setFormData({ ...formData, shading: e.target.value })}
                >
                  <option value="">Select shading level</option>
                  <option value="none">No shading</option>
                  <option value="minimal">Minimal</option>
                  <option value="moderate">Moderate</option>
                  <option value="heavy">Heavy</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional information or requirements"
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
                onClick={handleSaveApplication}
              >
                {isEditing ? 'Update Application' : 'Submit Application'}
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
              Current Applications ({currentApplications.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'past'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Past Applications ({pastApplications.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'current' && (
            <div className="space-y-4">
              {currentApplications.length > 0 ? (
                currentApplications.map((application) => (
                  <div key={application._id} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {application.type === 'solar' ? 'Solar Installation' : 
                           application.type === 'maintenance' ? 'Maintenance' : 'System Upgrade'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Application ID: {application.applicationId || application._id.slice(-8)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(application.status)}`}>
                          {formatStatus(application.status)}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEditApplication(application)}
                            className="text-primary-600 hover:text-primary-900 text-sm"
                          >
                            Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          <select
                            value={application.status}
                            onChange={(e) => handleStatusUpdate(application._id, e.target.value)}
                            className="text-sm border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="submitted">Submitted</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approve</option>
                            <option value="rejected">Reject</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Capacity</p>
                        <p className="text-sm text-gray-900">{application.capacity ? `${application.capacity} kW` : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Monthly Bill</p>
                        <p className="text-sm text-gray-900">{application.monthlyBill ? `$${application.monthlyBill}` : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Roof Type</p>
                        <p className="text-sm text-gray-900">{formatStatus(application.roofType) || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Shading</p>
                        <p className="text-sm text-gray-900">{formatStatus(application.shading) || 'N/A'}</p>
                      </div>
                    </div>

                    {application.address && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-500">Installation Address</p>
                        <p className="text-sm text-gray-900">{application.address}</p>
                      </div>
                    )}

                    {application.notes && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-500">Notes</p>
                        <p className="text-sm text-gray-900">{application.notes}</p>
                      </div>
                    )}

                    <div className="mt-4 flex justify-between text-sm text-gray-500">
                      <span>Submitted: {formatDate(application.createdAt)}</span>
                      <span>Last Updated: {formatDate(application.updatedAt)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No current applications</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This user doesn't have any active applications.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'past' && (
            <div className="space-y-4">
              {pastApplications.length > 0 ? (
                pastApplications.map((application) => (
                  <div key={application._id} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {application.type === 'solar' ? 'Solar Installation' : 
                           application.type === 'maintenance' ? 'Maintenance' : 'System Upgrade'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Application ID: {application.applicationId || application._id.slice(-8)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(application.status)}`}>
                          {formatStatus(application.status)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Capacity</p>
                        <p className="text-sm text-gray-900">{application.capacity ? `${application.capacity} kW` : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Monthly Bill</p>
                        <p className="text-sm text-gray-900">{application.monthlyBill ? `$${application.monthlyBill}` : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Roof Type</p>
                        <p className="text-sm text-gray-900">{formatStatus(application.roofType) || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Shading</p>
                        <p className="text-sm text-gray-900">{formatStatus(application.shading) || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between text-sm text-gray-500">
                      <span>Submitted: {formatDate(application.createdAt)}</span>
                      <span>Last Updated: {formatDate(application.updatedAt)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No past applications</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This user doesn't have any completed applications.
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

export default UserApplicationPage;