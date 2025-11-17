import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Modal from '../common/Modal';
import { investorsAPI } from '../../api/investors';

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
        investorsAPI.getBulkOperationHistory(),
        investorsAPI.getOperationQueueStatus(),
        investorsAPI.getOperationQueueStatus()
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
      const response = await investorsAPI.getOperationQueueStatus();
      setActiveOperations(response.data?.active || []);
    } catch (error) {
      console.error('Failed to fetch active operations:', error);
    }
  };

  const fetchQueueStatus = async () => {
    try {
      const response = await investorsAPI.getOperationQueueStatus();
      setQueueStatus(response.data || {});
    } catch (error) {
      console.error('Failed to fetch queue status:', error);
    }
  };

  const handleCancelOperation = async (operationId) => {
    try {
      await investorsAPI.cancelBulkOperation(operationId);
      fetchActiveOperations();
    } catch (error) {
      console.error('Failed to cancel operation:', error);
    }
  };

  const handleRetryOperation = async (operationId) => {
    try {
      await investorsAPI.retryBulkOperation(operationId);
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
                    <div>
                      <h4 className="font-medium text-gray-900">{operation.type}</h4>
                      <p className="text-sm text-gray-600">
                        Started: {formatDateTime(operation.startedAt)}
                      </p>
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
                        {operation.type}
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