import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Modal from '../common/Modal';
import { usersAPI } from '../../api/users';

/**
 * BulkOperationManager component for managing bulk operations
 * Handles progress tracking, error handling, and operation history
 */
const BulkOperationManager = ({ isOpen, onClose }) => {
  const [activeOperations, setActiveOperations] = useState([]);
  const [operationHistory, setOperationHistory] = useState([]);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [queueStatus, setQueueStatus] = useState({});
  const intervalRef = useRef(null);

  // Fetch operation data when component opens
  useEffect(() => {
    if (isOpen) {
      fetchOperationData();
      
      // Set up polling for active operations
      intervalRef.current = setInterval(() => {
        fetchActiveOperations();
        fetchQueueStatus();
      }, 3000); // Poll every 3 seconds
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen]);

  const fetchOperationData = async () => {
    try {
      setLoading(true);
      const [historyRes, activeRes, queueRes] = await Promise.all([
        usersAPI.getBulkOperationHistory(),
        usersAPI.getOperationQueueStatus(),
        usersAPI.getOperationQueueStatus()
      ]);
      
      setOperationHistory(historyRes.data || []);
      setActiveOperations(activeRes.data?.active || []);
      setQueueStatus(queueRes.data || {});
    } catch (error) {
      console.error('Failed to fetch operation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOperations = async () => {
    try {
      const response = await usersAPI.getOperationQueueStatus();
      setActiveOperations(response.data?.active || []);
    } catch (error) {
      console.error('Failed to fetch active operations:', error);
    }
  };

  const fetchQueueStatus = async () => {
    try {
      const response = await usersAPI.getOperationQueueStatus();
      setQueueStatus(response.data || {});
    } catch (error) {
      console.error('Failed to fetch queue status:', error);
    }
  };

  const handleCancelOperation = async (operationId) => {
    try {
      await usersAPI.cancelBulkOperation(operationId);
      fetchActiveOperations();
    } catch (error) {
      console.error('Failed to cancel operation:', error);
    }
  };

  const handleRetryOperation = async (operationId) => {
    try {
      await usersAPI.retryBulkOperation(operationId);
      fetchOperationData();
    } catch (error) {
      console.error('Failed to retry operation:', error);
    }
  };

  const handleViewDetails = (operation) => {
    setSelectedOperation(operation);
    setShowDetails(true);
  };

  const getOperationStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressPercentage = (operation) => {
    if (!operation.total || !operation.processed) return 0;
    return Math.round((operation.processed / operation.total) * 100);
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'N/A';
    return new Date(dateTime).toLocaleString();
  };

  const getOperationTypeIcon = (type) => {
    switch (type) {
      case 'bulk-edit':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        );
      case 'bulk-communication':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        );
      case 'bulk-kyc':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'bulk-export':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      case 'bulk-delete':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Operations Manager"
      size="xl"
    >
      <div className="space-y-6">
        {/* Queue Status */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Queue Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{queueStatus.pending || 0}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{queueStatus.running || 0}</div>
              <div className="text-sm text-gray-600">Running</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{queueStatus.completed || 0}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{queueStatus.failed || 0}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>
        </div>

        {/* Active Operations */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Active Operations</h3>
          {activeOperations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active operations
            </div>
          ) : (
            <div className="space-y-3">
              {activeOperations.map((operation) => (
                <div key={operation.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      {getOperationTypeIcon(operation.type)}
                      <div className="ml-3">
                        <h4 className="font-medium text-gray-900">{operation.type}</h4>
                        <p className="text-sm text-gray-600">
                          Started: {formatDateTime(operation.startedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOperationStatusColor(operation.status)}`}>
                        {operation.status}
                      </span>
                      {operation.status === 'running' && (
                        <button
                          onClick={() => handleCancelOperation(operation.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{operation.processed || 0} / {operation.total || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage(operation)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getProgressPercentage(operation)}% complete
                    </div>
                  </div>
                  
                  {operation.errors && operation.errors.length > 0 && (
                    <div className="text-sm text-red-600">
                      {operation.errors.length} error{operation.errors.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operation History */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Operation History</h3>
          {operationHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No operation history
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {operationHistory.map((operation) => (
                    <tr key={operation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          {getOperationTypeIcon(operation.type)}
                          <span className="ml-2">{operation.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOperationStatusColor(operation.status)}`}>
                          {operation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {operation.processed || 0} / {operation.total || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(operation.completedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(operation)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View Details
                        </button>
                        {operation.status === 'failed' && (
                          <button
                            onClick={() => handleRetryOperation(operation.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Operation Details Modal */}
      {showDetails && selectedOperation && (
        <Modal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title={`Operation Details - ${selectedOperation.type}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Operation ID</h4>
                <p className="text-sm text-gray-900">{selectedOperation.id}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Status</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOperationStatusColor(selectedOperation.status)}`}>
                  {selectedOperation.status}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Started At</h4>
                <p className="text-sm text-gray-900">{formatDateTime(selectedOperation.startedAt)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Completed At</h4>
                <p className="text-sm text-gray-900">{formatDateTime(selectedOperation.completedAt)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Total Items</h4>
                <p className="text-sm text-gray-900">{selectedOperation.total || 0}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Processed</h4>
                <p className="text-sm text-gray-900">{selectedOperation.processed || 0}</p>
              </div>
            </div>
            
            {selectedOperation.errors && selectedOperation.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Errors</h4>
                <div className="bg-red-50 p-3 rounded-md max-h-40 overflow-y-auto">
                  {selectedOperation.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-800 mb-1">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedOperation.details && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Details</h4>
                <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(selectedOperation.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </Modal>
  );
};

BulkOperationManager.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default BulkOperationManager;